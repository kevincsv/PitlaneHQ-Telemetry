package main

// Ask the coach (docs/spec/coach-and-model.md, "Ask the coach"): the AI coach with the driver's own API key. On the PC
// app the agent keeps the key and makes the request, so the key never sits in the page: the page builds the request body
// with web/dist/pitwall-aicoach.js and posts it to /api/aicoach/send, and the agent adds the key and sends it to the
// provider (only Anthropic, OpenAI and Google Gemini, at their fixed addresses). The key is kept in ai-coach.json in the
// data folder, sealed with the Windows user's key (protect, DPAPI), this PC only: never synced, never sent to the
// Pitlane HQ server, never handed back to the page (only its last four characters). Only this PC's own page reaches
// these routes (loopback, JSON, no other site's Origin).

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type aiKeyFile struct {
	P     string            `json:"p"`
	Model string            `json:"model"`
	Keys  map[string]string `json:"keys"` // provider → base64 of the sealed key (plain on systems without DPAPI)
}

var (
	aiMu   sync.Mutex
	aiHTTP = &http.Client{Transport: tlsTransport(), Timeout: 3 * time.Minute}
)

var aiProviders = map[string]bool{"anthropic": true, "openai": true, "gemini": true}

// the first model of each provider in pitwall-aicoach.js (PROVIDERS), for Gemini's address when none is chosen
var aiDefaultModel = map[string]string{"anthropic": "claude-haiku-5-5", "openai": "gpt-5-mini", "gemini": "gemini-2.5-flash"}

func aiPath() string { return filepath.Join(dataDir(), "ai-coach.json") }

func aiLoad() aiKeyFile {
	var f aiKeyFile
	if b, err := os.ReadFile(aiPath()); err == nil {
		json.Unmarshal(b, &f)
	}
	if !aiProviders[f.P] {
		f.P = "anthropic"
	}
	if f.Keys == nil {
		f.Keys = map[string]string{}
	}
	return f
}

func aiSaveFile(f aiKeyFile) error {
	os.MkdirAll(filepath.Dir(aiPath()), 0o755)
	b, _ := json.Marshal(f)
	return os.WriteFile(aiPath(), b, 0o600)
}

func aiSeal(key string) string {
	if enc, err := protect([]byte(key)); err == nil && enc != nil {
		return "d:" + base64.StdEncoding.EncodeToString(enc)
	}
	return "p:" + base64.StdEncoding.EncodeToString([]byte(key))
}

func aiOpen(s string) string {
	if len(s) < 2 {
		return ""
	}
	raw, err := base64.StdEncoding.DecodeString(s[2:])
	if err != nil {
		return ""
	}
	if s[:2] == "d:" {
		out, err := unprotect(raw)
		if err != nil {
			return ""
		}
		return string(out)
	}
	return string(raw)
}

// aiPageOnly: the request comes from this PC's own page (loopback, JSON body, and no other site's Origin), so a web page
// open in a browser cannot spend the driver's key
func aiPageOnly(r *http.Request) bool {
	if !isLoopback(r) {
		return false
	}
	if o := r.Header.Get("Origin"); o != "" {
		u, err := url.Parse(o)
		if err != nil || u.Host != r.Host {
			return false
		}
	}
	if r.Method == http.MethodPost && !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		return false
	}
	return true
}

// aiTarget: the provider's address and headers for a chat or the list of models, the key added
func aiTarget(p, op, model, key string) (string, string, map[string]string) {
	h := map[string]string{}
	switch p {
	case "anthropic":
		h["x-api-key"] = key
		h["anthropic-version"] = "2023-06-01"
		if op == "models" {
			return "GET", "https://api.anthropic.com/v1/models?limit=100", h
		}
		h["content-type"] = "application/json"
		return "POST", "https://api.anthropic.com/v1/messages", h
	case "openai":
		h["authorization"] = "Bearer " + key
		if op == "models" {
			return "GET", "https://api.openai.com/v1/models", h
		}
		h["content-type"] = "application/json"
		return "POST", "https://api.openai.com/v1/chat/completions", h
	case "gemini":
		h["x-goog-api-key"] = key
		if op == "models" {
			return "GET", "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", h
		}
		h["content-type"] = "application/json"
		return "POST", "https://generativelanguage.googleapis.com/v1beta/models/" + url.PathEscape(model) + ":generateContent", h
	}
	return "", "", nil
}

func registerAICoachRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/aicoach/config", func(w http.ResponseWriter, r *http.Request) {
		if !aiPageOnly(r) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		aiMu.Lock()
		defer aiMu.Unlock()
		f := aiLoad()
		if r.Method == http.MethodPost {
			var in struct {
				P     string  `json:"p"`
				Model string  `json:"model"`
				Key   *string `json:"key"`
			}
			if json.NewDecoder(io.LimitReader(r.Body, 8<<10)).Decode(&in) != nil || !aiProviders[in.P] {
				w.WriteHeader(http.StatusBadRequest)
				writeJSON(w, map[string]string{"error": "bad request"})
				return
			}
			f.P, f.Model = in.P, strings.TrimSpace(in.Model)
			if in.Key != nil {
				if k := strings.TrimSpace(*in.Key); k != "" {
					f.Keys[in.P] = aiSeal(k)
				} else {
					delete(f.Keys, in.P)
				}
			}
			if err := aiSaveFile(f); err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				writeJSON(w, map[string]string{"error": err.Error()})
				return
			}
		}
		k := aiOpen(f.Keys[f.P])
		last4 := ""
		if len(k) >= 4 {
			last4 = k[len(k)-4:]
		}
		writeJSON(w, map[string]any{"p": f.P, "model": f.Model, "has": k != "", "last4": last4})
	})
	mux.HandleFunc("/api/aicoach/send", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || !aiPageOnly(r) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		var in struct {
			Op    string `json:"op"`
			P     string `json:"p"`
			Model string `json:"model"`
			Body  string `json:"body"`
		}
		if json.NewDecoder(io.LimitReader(r.Body, 2<<20)).Decode(&in) != nil || !aiProviders[in.P] {
			w.WriteHeader(http.StatusBadRequest)
			writeJSON(w, map[string]string{"error": "bad request"})
			return
		}
		aiMu.Lock()
		f := aiLoad()
		key := aiOpen(f.Keys[in.P])
		aiMu.Unlock()
		if key == "" {
			writeJSON(w, map[string]any{"status": 401, "text": `{"error":{"message":"no key"}}`})
			return
		}
		model := in.Model
		if model == "" {
			model = f.Model
		}
		if model == "" {
			model = aiDefaultModel[in.P]
		}
		method, u, h := aiTarget(in.P, in.Op, model, key)
		var body io.Reader
		if method == http.MethodPost {
			body = bytes.NewReader([]byte(in.Body))
		}
		req, err := http.NewRequestWithContext(r.Context(), method, u, body)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			writeJSON(w, map[string]string{"error": err.Error()})
			return
		}
		for k, v := range h {
			req.Header.Set(k, v)
		}
		resp, err := aiHTTP.Do(req)
		if err != nil {
			eb, _ := json.Marshal(map[string]any{"error": map[string]string{"message": err.Error()}})
			writeJSON(w, map[string]any{"status": 502, "text": string(eb)})
			return
		}
		defer resp.Body.Close()
		out, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
		writeJSON(w, map[string]any{"status": resp.StatusCode, "text": string(out)})
	})
}
