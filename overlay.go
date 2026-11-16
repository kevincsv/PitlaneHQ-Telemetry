package main

import (
	"fmt"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
)

type overlayReq struct {
	Widget        string
	Width, Height int
	X, Y          int
	HasPos        bool
	HomePos       bool // X and Y are its first place on the screen (ovHomeAt), not a saved one
	Alpha         int
	Top, Lock     bool
}

var widgetRe = regexp.MustCompile(`^([a-z]{2,12}|\*)$`)

// Default window sizes for each widget.
var overlaySizes = map[string][2]int{"flag": {520, 90}, "dash": {560, 230}, "timing": {440, 190}, "map": {440, 480}, "relative": {600, 380}, "fuel": {420, 220},
	"engine": {320, 260}, "tyres": {420, 260}, "inputs": {560, 210}, "standings": {720, 640}, "radar": {260, 300}, "boost": {360, 170}, "telemetry": {420, 300}, "compare": {680, 320}, "gg": {280, 300}, "deltabar": {520, 90}, "stats": {420, 220},
	"pit": {440, 260}, "sectors": {560, 150}, "gaps": {560, 260}, "incidents": {380, 300}, "coach": {520, 200}, "brakes": {480, 170},
	"weather": {360, 250}, "trackbar": {700, 70}, "system": {320, 230}, "spotter": {520, 64}}

// ovHome: where an overlay opens the first time (never placed), on a 2560×1440 screen and scaled to the main one:
// the timing and standings down the left, the delta bar and flags at the top in the middle, the map top right, the
// relative bottom right, the radar in the middle, the dash and fuel along the bottom (the Overlays tab's screen shows
// the same, OV_HOME in pitwall-overlays.js)
var ovHome = map[string][2]int{"relative": {1880, 900}, "radar": {1150, 700}, "deltabar": {1020, 40}, "timing": {40, 40}, "standings": {40, 300},
	"map": {2080, 40}, "flag": {1020, 150}, "dash": {1000, 1180}, "fuel": {40, 1180}}

// ovHomeAt: the first place of an overlay w×h on a primary screen pw×ph, inside it
func ovHomeAt(name string, pw, ph, w, h int) (int, int, bool) {
	p, ok := ovHome[name]
	if !ok || pw <= 0 || ph <= 0 {
		return 0, 0, false
	}
	x, y := p[0]*pw/2560, p[1]*ph/1440
	x, y = max(0, min(pw-w, x)), max(0, min(ph-h, y))
	return x, y, true
}

// the smallest an overlay may be made: half its default width, the smallest of its Size slider (ovSizeMin), so its
// text stays readable (its height follows its content); the map, the radar and the g-force keep the window's height,
// so half theirs too
func overlayMinSize(name string) (int, int) {
	d, ok := overlaySizes[name]
	if !ok {
		return 200, 60
	}
	w, h := int(float64(d[0])*ovSizeMin+0.5), 40
	if ovSquare(name) {
		h = int(float64(d[1])*ovSizeMin + 0.5)
	}
	return w, h
}

// ovSquare: the overlays whose drawing fills the window's height too (the rest fit their height to what they show)
func ovSquare(name string) bool { return name == "map" || name == "radar" || name == "gg" }

// An overlay's size (its settings' Size slider, the Overlays tab): its window's width against the width it is drawn
// for (ovDesign; the relative's and the standings' for the columns chosen), which scales its whole drawing, text and
// box together. 50 % to 150 %.
const ovSizeMin, ovSizeMax = 0.5, 1.5

// ovScreenK: the default sizes are for a 2560×1440 screen (as ovHome): a smaller main screen opens them smaller by as
// much, never below the smallest size and never larger than the default
func ovScreenK(ph int) float64 {
	if ph <= 0 {
		return 1
	}
	return math.Max(ovSizeMin, math.Min(1, float64(ph)/1440))
}

// ovNormalW: the width an overlay is drawn for at 100 %, with the settings ui and the game it is in
func ovNormalW(name string, ui map[string]any, game string) float64 {
	if name == "relative" || name == "standings" {
		st := newOvState("en")
		st.ui, st.game = ui, game
		return tableDesignW(name, st)
	}
	if d, ok := ovDesign[name]; ok {
		return d
	}
	if d, ok := overlaySizes[name]; ok {
		return float64(d[0])
	}
	return 460
}

// ovSizeOf: an overlay's size now (its saved width, or the one it opens at), with its old text size in (textScale)
func ovSizeOf(name string, c Config, game string, ph int) float64 {
	nw := ovNormalW(name, c.UI, game)
	w := 0.0
	if p, ok := c.Positions[name]; ok && p[2] > 0 {
		w = float64(p[2])
	} else if d, ok := overlaySizes[name]; ok {
		w = float64(d[0]) * c.Scale * ovScreenK(ph)
	}
	if w <= 0 || nw <= 0 {
		return 1
	}
	s := w / nw
	if m, ok := c.UI[name].(map[string]any); ok {
		if v, ok := m["textScale"].(float64); ok && v >= 0.8 && v <= 1.3 {
			s *= v
		}
	}
	return math.Round(math.Max(ovSizeMin, math.Min(ovSizeMax, s))*100) / 100
}

// ovSizeRect: the place and size of an overlay made s of its normal size: it keeps its top-left corner, its height
// follows its width, and it stays inside a desktop dw wide
func ovSizeRect(name string, old [4]int, s, normalW float64, dw int) [4]int {
	s = math.Max(ovSizeMin, math.Min(ovSizeMax, s))
	w := int(normalW*s + 0.5)
	if mw, _ := overlayMinSize(name); w < mw {
		w = mw
	}
	if dw > 0 && w > dw {
		w = dw
	}
	h := old[3]
	if old[2] > 0 && h > 0 {
		h = int(float64(h)*float64(w)/float64(old[2]) + 0.5)
	}
	if _, mh := overlayMinSize(name); h < mh {
		h = mh
	}
	return [4]int{old[0], old[1], w, h}
}

func itoa(i int) string { return strconv.Itoa(i) }

// Each overlay gets its own loopback address (127.0.0.2, 127.0.0.3, ...). Browsers
// allow only 6 open connections per host, and every overlay keeps one open for
// the live stream, so sharing one address would freeze overlays beyond the sixth.
var overlayOrder = []string{"flag", "dash", "timing", "map", "relative", "compare", "radar", "boost", "inputs", "fuel", "engine", "tyres", "standings", "telemetry", "gg", "deltabar", "stats", "pit", "sectors", "gaps", "incidents", "coach", "brakes", "weather", "trackbar", "system", "spotter"}

func overlayHost(name string) string {
	for i, n := range overlayOrder {
		if n == name {
			return fmt.Sprintf("127.0.0.%d", 2+i)
		}
	}
	return "127.0.0.250"
}

func overlayURL(name string) string {
	// in the app's language: an overlay window has its own browser storage
	return withTicket(fmt.Sprintf("http://%s:%d/?overlay=%s&win=1&lang=%s&units=%s", overlayHost(name), listenPort, url.QueryEscape(name), uiLangChoice(), uiUnits()))
}

// openNamedOverlay opens a widget at its saved position, or a default one.
func openNamedOverlay(name string) error {
	if tryLocked() { // the sessions without an account are used up (tryout.go)
		return errTryOver
	}
	c, _ := settingsSnapshot()
	sz, ok := overlaySizes[name]
	if !ok {
		sz = [2]int{460, 260}
	}
	o := overlayReq{Widget: name, Width: int(float64(sz[0]) * c.Scale), Height: int(float64(sz[1]) * c.Scale), Alpha: c.Alpha, Top: true, Lock: !c.Edit} // clicks reach an overlay only while the overlays are being placed
	if p, ok := c.Positions[name]; ok {
		o.X, o.Y, o.Width, o.Height, o.HasPos = p[0], p[1], p[2], p[3], true
	} else if pr, ok := screenInfo()["primary"].([4]int); ok {
		// never placed: its size and its home both for the main screen (ovScreenK, ovHomeAt)
		k := ovScreenK(pr[3])
		o.Width, o.Height = int(float64(o.Width)*k+0.5), int(float64(o.Height)*k+0.5)
		o.X, o.Y, o.HomePos = ovHomeAt(name, pr[2], pr[3], o.Width, o.Height)
	}
	return openOverlay(o, overlayURL(name), "webview") // always the frameless window (the Edge one was dropped)
}

func registerOverlayRoutes(mux *http.ServeMux) {
	post := func(f func(w http.ResponseWriter, r *http.Request)) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				http.Error(w, "POST only", 405)
				return
			}
			f(w, r)
		}
	}
	name := func(r *http.Request) (string, bool) {
		n := r.URL.Query().Get("w")
		return n, widgetRe.MatchString(n)
	}
	mux.HandleFunc("/api/overlay/open", post(func(w http.ResponseWriter, r *http.Request) {
		n, ok := name(r)
		if !ok || n == "*" {
			http.Error(w, "bad widget", 400)
			return
		}
		if err := openNamedOverlay(n); err != nil {
			w.WriteHeader(400)
			writeJSON(w, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, map[string]any{"opened": n})
	}))
	mux.HandleFunc("/api/overlay/close", post(func(w http.ResponseWriter, r *http.Request) {
		n, ok := name(r)
		if !ok {
			http.Error(w, "bad widget", 400)
			return
		}
		writeJSON(w, map[string]any{"closed": closeOverlays(n)})
	}))
	mux.HandleFunc("/api/overlay/reset", post(func(w http.ResponseWriter, r *http.Request) {
		cfgMu.Lock()
		cfg.Positions = map[string][4]int{}
		saveSettingsLocked()
		cfgMu.Unlock()
		writeJSON(w, map[string]any{"reset": true})
	}))
	mux.HandleFunc("/api/overlay/visible", post(func(w http.ResponseWriter, r *http.Request) {
		n, ok := name(r)
		if !ok || n == "*" {
			http.Error(w, "bad widget", 400)
			return
		}
		setOverlayVisible(n, r.URL.Query().Get("on") == "1")
		writeJSON(w, map[string]any{"ok": true})
	}))
	// Move or resize an overlay from the app (also from a phone).
	mux.HandleFunc("/api/overlay/move", post(func(w http.ResponseWriter, r *http.Request) {
		n, ok := name(r)
		q := r.URL.Query()
		x, e1 := strconv.Atoi(q.Get("x"))
		y, e2 := strconv.Atoi(q.Get("y"))
		ww, e3 := strconv.Atoi(q.Get("width"))
		hh, e4 := strconv.Atoi(q.Get("height"))
		if !ok || n == "*" || e1 != nil || e2 != nil || e3 != nil || e4 != nil || ww < 80 || hh < 40 {
			http.Error(w, "bad request", 400)
			return
		}
		if mw, mh := overlayMinSize(n); ww < mw || hh < mh { // never smaller than it can be read
			ww, hh = max(ww, mw), max(hh, mh)
		}
		moveOverlay(n, x, y, ww, hh)
		cfgMu.Lock()
		cfg.Positions[n] = [4]int{x, y, ww, hh}
		saveSettingsLocked()
		cfgMu.Unlock()
		writeJSON(w, map[string]any{"moved": n})
	}))
	// An overlay's size (the Size slider): GET says it (s, 0.5–1.5), POST ?s= makes its window that size, text and box
	// together, and keeps it (an overlay not open opens at it). The page takes the old text size (textScale) out.
	mux.HandleFunc("/api/overlay/size", func(w http.ResponseWriter, r *http.Request) {
		n, ok := name(r)
		if !ok || n == "*" {
			http.Error(w, "bad widget", 400)
			return
		}
		game := currentStatus().Source
		ph := 0
		if pr, ok := screenInfo()["primary"].([4]int); ok {
			ph = pr[3]
		}
		if r.Method != http.MethodPost {
			c, _ := settingsSnapshot()
			writeJSON(w, map[string]any{"s": ovSizeOf(n, c, game, ph)})
			return
		}
		s, err := strconv.ParseFloat(r.URL.Query().Get("s"), 64)
		if err != nil || math.IsNaN(s) {
			http.Error(w, "bad size", 400)
			return
		}
		cfgMu.Lock()
		old, has := cfg.Positions[n]
		if rc, ok := overlayRects()[n]; ok && rc[2] > 0 { // open: where its window really is
			old, has = rc, true
		}
		if !has {
			sz, ok := overlaySizes[n]
			if !ok {
				sz = [2]int{460, 260}
			}
			k := cfg.Scale * ovScreenK(ph)
			old = [4]int{0, 0, int(float64(sz[0])*k + 0.5), int(float64(sz[1])*k + 0.5)}
			if pr, ok := screenInfo()["primary"].([4]int); ok {
				old[0], old[1], _ = ovHomeAt(n, pr[2], pr[3], old[2], old[3])
			}
		}
		dw := 0
		if v, ok := screenInfo()["virtual"].([4]int); ok {
			dw = v[2]
		}
		rc := ovSizeRect(n, old, s, ovNormalW(n, cfg.UI, game), dw)
		if cfg.Positions == nil {
			cfg.Positions = map[string][4]int{}
		}
		cfg.Positions[n] = rc
		saveSettingsLocked()
		cfgMu.Unlock()
		moveOverlay(n, rc[0], rc[1], rc[2], rc[3])
		writeJSON(w, map[string]any{"s": math.Max(ovSizeMin, math.Min(ovSizeMax, s)), "rect": rc})
	})
	mux.HandleFunc("/api/overlay/screen", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, screenInfo())
	})
	mux.HandleFunc("/api/overlay/list", func(w http.ResponseWriter, r *http.Request) {
		// where the open overlay windows really are (they may have been dragged on the screen)
		rects := overlayRects()
		cfgMu.Lock()
		changed := false
		for n, rc := range rects {
			if !widgetRe.MatchString(n) || rc[2] < 80 || rc[3] < 40 {
				continue
			}
			if old, ok := cfg.Positions[n]; !ok || old != rc {
				if cfg.Positions == nil {
					cfg.Positions = map[string][4]int{}
				}
				cfg.Positions[n] = rc
				changed = true
			}
		}
		if changed {
			saveSettingsLocked()
		}
		cfgMu.Unlock()
		writeJSON(w, map[string]any{"supported": overlaysSupported, "open": listOverlays(), "rects": rects})
	})
}
