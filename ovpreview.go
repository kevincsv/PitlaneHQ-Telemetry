package main

// ovpreview: the Overlays tab's picture of an overlay, drawn by the same code as its window (ovDraw), so the preview
// is the overlay the driver gets (docs/spec/overlays.md, "The preview's data"). GET /api/overlay/preview.png?w=
// draws it with the settings as they are now, on the game's data while it sends it, else on the driver's own sample,
// else on another driver's (previewsample.go); the X-Preview-Src header says which (live, mine, community, or empty
// when there is none and the overlay waits for the game). Each overlay keeps its state between pictures (the radar's
// filter, the gauges' trails), as its window does.

import (
	"bytes"
	"encoding/json"
	"image"
	"image/png"
	"net/http"
	"strconv"
	"sync"
	"time"
)

type ovPreviewSt struct {
	st     *ovState
	fields []string
	used   time.Time
	src    string
	ses    string
}

var (
	ovPvMu  sync.Mutex
	ovPvSts = map[string]*ovPreviewSt{}
)

// ovPreviewFeed hands the overlay's state its data for this picture; it says where the data came from
func ovPreviewFeed(name string, p *ovPreviewSt, now time.Time) string {
	feed := func(fields []string, frame []byte, session, src string) string {
		if session != p.ses || src != p.src {
			b, _ := json.Marshal(session)
			p.st.event("session", string(b), &p.fields)
			p.ses = session
		}
		p.fields = fields
		p.st.event("t", string(frame), &p.fields)
		return src
	}
	// the game's own data
	tel.mu.RLock()
	if tel.connected && !tel.demo && len(tel.buf) > 0 {
		var fields []string
		var want []int
		for _, n := range ovWithOnTrack(ovVars(name, p.st)) {
			if i, ok := tel.index[n]; ok {
				fields, want = append(fields, n), append(want, i)
			}
		}
		frame, _ := streamFrame(nil, tel.vars, tel.buf, want, tel.tick)
		ses, src := tel.session, tel.source
		tel.mu.RUnlock()
		p.st.mu.Lock()
		p.st.game = src
		p.st.mu.Unlock()
		return feed(fields, frame, ses, "live")
	}
	tel.mu.RUnlock()
	// a sample: yours, else another driver's
	var s struct {
		Game    string            `json:"game"`
		Hz      int               `json:"hz"`
		Names   []string          `json:"names"`
		Session string            `json:"session"`
		Frames  []json.RawMessage `json:"frames"`
	}
	src := ""
	for _, g := range previewGames("") {
		if b := readPreview(g); b != nil && json.Unmarshal(b, &s) == nil && len(s.Frames) > 1 {
			src = "mine"
			break
		}
	}
	if src == "" {
		for _, g := range previewGames("") {
			if b := communityPreview(g); b != nil && json.Unmarshal(b, &s) == nil && len(s.Frames) > 1 {
				src = "community"
				break
			}
		}
	}
	if src == "" {
		return ""
	}
	hz := max(1, s.Hz)
	i := int(now.UnixMilli()*int64(hz)/1000) % len(s.Frames)
	p.st.mu.Lock()
	p.st.game = s.Game
	p.st.mu.Unlock()
	return feed(s.Names, s.Frames[i], s.Session, src)
}

// previewGames: the game named, else the one chosen in Settings, else the one read last, else iRacing then LMU
func previewGames(g string) []string {
	if _, ok := gameNames[g]; ok {
		return []string{g}
	}
	out := []string{}
	if p := gamePref(); p != "auto" {
		out = append(out, p)
	}
	return append(out, currentGame(), "iracing", "lmu")
}

// ovPreviewPNG draws the overlay as its window would at its normal size (its text size and the columns chosen
// included), cut to the height it needs
func ovPreviewPNG(name string, now time.Time) ([]byte, string) {
	ovPvMu.Lock()
	defer ovPvMu.Unlock()
	for k, p := range ovPvSts { // the overlays not looked at for a while forget their state
		if now.Sub(p.used) > 2*time.Minute {
			delete(ovPvSts, k)
		}
	}
	p := ovPvSts[name]
	if p == nil {
		p = &ovPreviewSt{st: newOvState(uiLangChoice())}
		ovPvSts[name] = p
	}
	p.used = now
	c0, _ := settingsSnapshot()
	ui := map[string]any{}
	for k, v := range c0.UI {
		ui[k] = v
	}
	if m, ok := ui[name].(map[string]any); ok { // the preview never hides itself
		cp := map[string]any{}
		for k, v := range m {
			if k != "hide" {
				cp[k] = v
			}
		}
		ui[name] = cp
	}
	p.st.mu.Lock()
	p.st.ui, p.st.lang, p.st.units, p.st.edit, p.st.alpha = ui, uiLangChoice(), uiUnits(), false, 255
	p.st.cfgSeq++
	p.st.mu.Unlock()
	src := ovPreviewFeed(name, p, now)
	w := int(ovDesign[name])
	if name == "relative" || name == "standings" {
		p.st.mu.Lock()
		w = int(tableDesignW(name, p.st) + 0.5)
		p.st.mu.Unlock()
	}
	h := 260
	if sz, ok := overlaySizes[name]; ok {
		if w <= 0 {
			w = sz[0]
		}
		h = sz[1]
	}
	if w <= 0 {
		w = 460
	}
	c := newCanvas(w, h)
	need := ovDraw(name, c, p.st, now)
	if need > h && need < 4000 {
		h = need
		c = newCanvas(w, h)
		ovDraw(name, c, p.st, now)
	} else if need > 0 && need < h {
		h = need
	}
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			v := c.px[y*w+x]
			o := img.PixOffset(x, y)
			img.Pix[o], img.Pix[o+1], img.Pix[o+2], img.Pix[o+3] = uint8(v>>16), uint8(v>>8), uint8(v), uint8(v>>24)
		}
	}
	var b bytes.Buffer
	(&png.Encoder{CompressionLevel: png.BestSpeed}).Encode(&b, img)
	return b.Bytes(), src
}

func registerOverlayPreview(mux *http.ServeMux) {
	mux.HandleFunc("/api/overlay/preview.png", func(w http.ResponseWriter, r *http.Request) {
		name := r.URL.Query().Get("w")
		if !nativeOverlay(name) {
			http.Error(w, "unknown overlay", 404)
			return
		}
		b, src := ovPreviewPNG(name, time.Now())
		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Preview-Src", src)
		w.Header().Set("Content-Length", strconv.Itoa(len(b)))
		w.Write(b)
	})
}
