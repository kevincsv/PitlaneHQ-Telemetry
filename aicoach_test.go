package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Ask the coach on the PC: the key is kept sealed in the data folder, never handed back to the page (only its last four
// characters), and only this PC's own page can use it.
func TestAICoachKey(t *testing.T) {
	t.Setenv("PITLANEHQ_DATA", t.TempDir())
	mux := http.NewServeMux()
	registerAICoachRoutes(mux)
	do := func(method, path, body string, h map[string]string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.RemoteAddr = "127.0.0.1:5555"
		req.Host = "127.0.0.1:7777"
		if method == http.MethodPost {
			req.Header.Set("Content-Type", "application/json")
		}
		for k, v := range h {
			req.Header.Set(k, v)
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
		return w
	}
	w := do("POST", "/api/aicoach/config", `{"p":"openai","model":"gpt-5-mini","key":"sk-test-ABCD"}`, nil)
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"has":true`) || !strings.Contains(w.Body.String(), `"last4":"ABCD"`) {
		t.Fatalf("save: %d %s", w.Code, w.Body.String())
	}
	if strings.Contains(w.Body.String(), "sk-test") {
		t.Fatal("the key went back to the page")
	}
	b, _ := os.ReadFile(filepath.Join(os.Getenv("PITLANEHQ_DATA"), "ai-coach.json"))
	if strings.Contains(string(b), "sk-test-ABCD") {
		t.Fatal("the key is stored as it is")
	}
	if f := aiLoad(); aiOpen(f.Keys["openai"]) != "sk-test-ABCD" || f.P != "openai" || f.Model != "gpt-5-mini" {
		t.Fatalf("load: %+v", f)
	}
	// the model and provider change without the key
	w = do("POST", "/api/aicoach/config", `{"p":"openai","model":"gpt-5"}`, nil)
	if !strings.Contains(w.Body.String(), `"has":true`) {
		t.Fatalf("keep the key: %s", w.Body.String())
	}
	// another site open in the browser, or another device, is refused
	if w := do("POST", "/api/aicoach/send", `{"op":"models","p":"openai"}`, map[string]string{"Origin": "https://evil.example"}); w.Code != 403 {
		t.Fatalf("other origin: %d", w.Code)
	}
	req := httptest.NewRequest("GET", "/api/aicoach/config", nil)
	req.RemoteAddr = "192.168.1.20:5555"
	rw := httptest.NewRecorder()
	mux.ServeHTTP(rw, req)
	if rw.Code != 403 {
		t.Fatalf("network: %d", rw.Code)
	}
	req = httptest.NewRequest("POST", "/api/aicoach/send", strings.NewReader(`{}`))
	req.RemoteAddr = "127.0.0.1:5555"
	req.Header.Set("Content-Type", "text/plain")
	rw = httptest.NewRecorder()
	mux.ServeHTTP(rw, req)
	if rw.Code != 403 {
		t.Fatalf("plain text: %d", rw.Code)
	}
	// removing the key
	w = do("POST", "/api/aicoach/config", `{"p":"openai","model":"gpt-5","key":""}`, nil)
	if !strings.Contains(w.Body.String(), `"has":false`) {
		t.Fatalf("remove: %s", w.Body.String())
	}
	if w := do("POST", "/api/aicoach/send", `{"op":"chat","p":"openai","body":"{}"}`, nil); !strings.Contains(w.Body.String(), `"status":401`) {
		t.Fatalf("no key: %s", w.Body.String())
	}
	// the addresses: only the three providers, Gemini's model in its address
	if m, u, h := aiTarget("gemini", "chat", "gemini-2.5-flash", "k"); m != "POST" || u != "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" || h["x-goog-api-key"] != "k" {
		t.Fatalf("gemini: %s %s %v", m, u, h)
	}
	if m, _, _ := aiTarget("other", "chat", "", "k"); m != "" {
		t.Fatal("an unknown provider has an address")
	}
}
