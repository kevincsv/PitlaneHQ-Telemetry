package main

// previewsample: the overlay preview plays real data, never an invented race (docs/spec/overlays.md, "The preview's
// data"). While you drive (on the track, off the pit road, moving, not a replay) the agent keeps the last 20 s of the
// values the overlays read, 10 a second (previewLoop); once it has a whole 20 s it saves them with the session to
// <data>/preview/<game>.json.gz, at most every 10 minutes, and sends the server a copy with every driver's name taken
// out (previewAnon), which the server hands to the drivers who have none of their own. GET /api/preview/sample answers
// with yours, else the community's; the overlay page with preview=1 plays it (previewSampleTick in index.html) until the
// game sends live data.

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	pvHz     = 10
	pvFrames = 20 * pvHz        // 20 seconds
	pvEvery  = 10 * time.Minute // a new sample at most this often
)

var (
	pvNamesOnce sync.Once
	pvNamesList []string
	pvLiveVars  = regexp.MustCompile(`const LIVE_VARS="([^"]+)"`)
)

// previewVarNames: the values the overlay windows ask the stream for (LIVE_VARS and the tyres' in index.html)
func previewVarNames() []string {
	pvNamesOnce.Do(func() {
		b, err := webFS.ReadFile("web/dist/index.html")
		if err != nil {
			return
		}
		pvNamesList = previewNamesFrom(string(b))
	})
	return pvNamesList
}

func previewNamesFrom(html string) []string {
	m := pvLiveVars.FindStringSubmatch(html)
	if m == nil {
		return nil
	}
	seen := map[string]bool{}
	var out []string
	add := func(n string) {
		if n = strings.TrimSpace(n); n != "" && !seen[n] {
			seen[n] = true
			out = append(out, n)
		}
	}
	for _, n := range strings.Split(m[1], ",") {
		add(n)
	}
	// TYRE_VARS in index.html: every corner's temperatures, wear and pressures, and the compounds
	for _, c := range []string{"LF", "RF", "LR", "RR"} {
		for _, z := range []string{"tempCL", "tempCM", "tempCR", "wearL", "wearM", "wearR", "coldPressure", "pressure", "brakeLinePress", "tempL", "tempM", "tempR"} {
			add(c + z)
		}
	}
	for _, n := range []string{"PlayerTireCompound", "PitSvTireCompound", "TireSetsUsed", "TireSetsAvailable", "PitSvFuel", "IsReplayPlaying"} {
		add(n)
	}
	return out
}

// the recorder: a ring of frames ({"k":tick,"v":[…]} as the stream writes them), its storage reused
type pvRing struct {
	frames    [][]byte
	head, n   int
	schemaVer int
	want      []int
	names     []string
	savedAt   time.Time
	gate      []float64
}

var pvRec = &pvRing{schemaVer: -1, frames: make([][]byte, pvFrames)}

var pvGateNames = []string{"IsOnTrack", "OnPitRoad", "Speed", "IsReplayPlaying"}

// add records one frame when you are driving; it says whether the ring holds a whole sample
func (r *pvRing) add() bool {
	tel.mu.RLock()
	defer tel.mu.RUnlock()
	if !tel.connected || tel.demo || len(tel.buf) == 0 {
		r.n = 0
		return false
	}
	r.gate = telNumsLockedInto(r.gate, pvGateNames)
	if r.gate[0] == 0 || r.gate[1] != 0 || r.gate[2] < 3 || r.gate[3] != 0 {
		r.n = 0 // a sample is 20 s of driving in one go
		return false
	}
	if r.schemaVer != tel.schemaVer {
		r.schemaVer, r.n, r.want, r.names = tel.schemaVer, 0, r.want[:0], r.names[:0]
		for _, n := range previewVarNames() {
			if i, ok := tel.index[n]; ok {
				r.want = append(r.want, i)
				r.names = append(r.names, n)
			}
		}
	}
	if len(r.want) == 0 {
		return false
	}
	r.frames[r.head], _ = streamFrame(r.frames[r.head][:0], tel.vars, tel.buf, r.want, tel.tick)
	r.head = (r.head + 1) % pvFrames
	if r.n < pvFrames {
		r.n++
	}
	return r.n == pvFrames
}

// sample: the frames in order, oldest first
func (r *pvRing) sample() []json.RawMessage {
	out := make([]json.RawMessage, 0, r.n)
	for i := 0; i < r.n; i++ {
		f := r.frames[(r.head-r.n+i+pvFrames)%pvFrames]
		out = append(out, append(json.RawMessage(nil), f...))
	}
	return out
}

type pvSample struct {
	V       int               `json:"v"`
	Game    string            `json:"game"`
	At      int64             `json:"at"`
	Hz      int               `json:"hz"`
	Names   []string          `json:"names"`
	Session string            `json:"session"`
	Frames  []json.RawMessage `json:"frames"`
}

func previewLoop() {
	tk := time.NewTicker(time.Second / pvHz)
	defer tk.Stop()
	for range tk.C {
		if !pvRec.add() || time.Since(pvRec.savedAt) < pvEvery {
			continue
		}
		pvRec.savedAt = time.Now()
		tel.mu.RLock()
		s := pvSample{V: 1, Game: currentGame(), At: time.Now().UnixMilli(), Hz: pvHz, Names: append([]string(nil), pvRec.names...), Session: tel.session}
		tel.mu.RUnlock()
		s.Frames = pvRec.sample()
		go savePreviewSample(s)
	}
}

func previewPath(game string) string { return filepath.Join(dataDir(), "preview", game+".json.gz") }

func savePreviewSample(s pvSample) {
	b, err := json.Marshal(s)
	if err != nil {
		return
	}
	var z bytes.Buffer
	zw := gzip.NewWriter(&z)
	zw.Write(b)
	zw.Close()
	p := previewPath(s.Game)
	os.MkdirAll(filepath.Dir(p), 0o755)
	tmp := p + ".tmp"
	if os.WriteFile(tmp, z.Bytes(), 0o644) == nil {
		os.Rename(tmp, p)
	}
	// the community's copy, with nobody's name in it: for the drivers who have no sample of their own
	if commToken() == "" {
		return
	}
	s.Session = previewAnon(s.Session)
	commCall("POST", "/preview/sample", s, true) // best effort: the next one goes in ten minutes
}

var pvAnonKeys = regexp.MustCompile(`^(\s*)(UserName|AbbrevName|Initials|TeamName|UserID|TeamID|ClubName|ClubID|DivisionName|DivisionID|FlairName|FlairID|CarDesignStr|HelmetDesignStr|SuitDesignStr|CarNumberDesignStr|SubSessionID|SessionID|DriverUserID|CustID|PlayerName|CarNumber|CarNumberRaw):.*$`)
var pvCarIdx = regexp.MustCompile(`^\s*-\s*CarIdx:\s*(\d+)`)

// previewAnon: the session with every driver's name and id taken out ("Driver 4"), the track, cars, classes, iRating
// and licences kept, so the overlays show what they normally show
func previewAnon(y string) string {
	lines := strings.Split(y, "\n")
	car := 0
	for i, l := range lines {
		if m := pvCarIdx.FindStringSubmatch(l); m != nil {
			car, _ = strconv.Atoi(m[1])
		}
		m := pvAnonKeys.FindStringSubmatch(l)
		if m == nil {
			continue
		}
		n := strconv.Itoa(car + 1)
		v := ""
		switch m[2] {
		case "UserName", "PlayerName":
			v = "Driver " + n
		case "AbbrevName":
			v = "D" + n
		case "Initials":
			v = "D" + n
		case "TeamName":
			v = "Team " + n
		case "CarNumber":
			v = `"` + n + `"`
		case "CarNumberRaw":
			v = n
		case "UserID", "TeamID", "ClubID", "DivisionID", "FlairID", "SubSessionID", "SessionID", "DriverUserID", "CustID":
			v = "0"
		}
		lines[i] = m[1] + m[2] + ": " + v
	}
	return strings.Join(lines, "\n")
}

var (
	pvCommMu sync.Mutex
	pvComm   = map[string]pvCached{}
)

type pvCached struct {
	at   time.Time
	body []byte
}

// readPreview: this PC's sample of the game (gunzipped), or nil
func readPreview(game string) []byte {
	b, err := os.ReadFile(previewPath(game))
	if err != nil {
		return nil
	}
	zr, err := gzip.NewReader(bytes.NewReader(b))
	if err != nil {
		return nil
	}
	defer zr.Close()
	var out bytes.Buffer
	if _, err := out.ReadFrom(zr); err != nil || !json.Valid(out.Bytes()) {
		return nil
	}
	return out.Bytes()
}

// communityPreview: another driver's sample from the server, kept here for half an hour
func communityPreview(game string) []byte {
	pvCommMu.Lock()
	c, ok := pvComm[game]
	pvCommMu.Unlock()
	if ok && time.Since(c.at) < 30*time.Minute {
		return c.body
	}
	b, err := commCall("GET", "/preview/sample?game="+url.QueryEscape(game), nil, false)
	var probe struct {
		Frames []json.RawMessage `json:"frames"`
	}
	if err != nil || json.Unmarshal(b, &probe) != nil || len(probe.Frames) == 0 {
		b = nil
	}
	pvCommMu.Lock()
	pvComm[game] = pvCached{time.Now(), b}
	pvCommMu.Unlock()
	return b
}

// GET /api/preview/sample?game=: {"src":"mine"|"community"|"","sample":…}. With no game named: the one chosen in
// Settings, else the one last read, else iRacing then Le Mans Ultimate.
func registerPreviewRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/preview/sample", func(w http.ResponseWriter, r *http.Request) {
		games := []string{}
		if g := r.URL.Query().Get("game"); g != "" {
			if _, ok := gameNames[g]; ok {
				games = append(games, g)
			}
		}
		if len(games) == 0 {
			if g := gamePref(); g != "auto" {
				games = append(games, g)
			}
			games = append(games, currentGame(), "iracing", "lmu")
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		for _, g := range games {
			if b := readPreview(g); b != nil {
				w.Write([]byte(`{"src":"mine","sample":`))
				w.Write(b)
				w.Write([]byte(`}`))
				return
			}
		}
		for _, g := range games {
			if b := communityPreview(g); b != nil {
				w.Write([]byte(`{"src":"community","sample":`))
				w.Write(b)
				w.Write([]byte(`}`))
				return
			}
		}
		w.Write([]byte(`{"src":""}`))
	})
}
