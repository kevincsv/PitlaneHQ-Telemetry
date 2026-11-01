package main

import (
	"bytes"
	"encoding/json"
	"image/png"
	"os"
	"testing"
	"time"
)

// The Overlays tab's picture of an overlay is drawn by the overlay's own code, on the driver's sample when the game
// sends nothing, and follows the settings (columns added make the relative wider, its text the same size)
func TestOverlayPreviewFromSample(t *testing.T) {
	t.Setenv("PITLANEHQ_DATA", t.TempDir())
	st := ovTestState(t, nil)
	names, vals := []string{}, []json.RawMessage{}
	for n, v := range st.frame {
		names, vals = append(names, n), append(vals, v)
	}
	fr, _ := json.Marshal(map[string]any{"k": 1, "v": vals})
	frames := []json.RawMessage{fr, fr, fr}
	savePreviewSample(pvSample{V: 1, Game: "iracing", At: time.Now().UnixMilli(), Hz: 10, Names: names, Session: ovTestYAML, Frames: frames})
	if _, err := os.Stat(previewPath("iracing")); err != nil {
		t.Fatal("sample not saved", err)
	}
	cfgMu.Lock()
	old := cfg
	cfg.UI = map[string]any{}
	cfgMu.Unlock()
	defer func() { cfgMu.Lock(); cfg = old; cfgMu.Unlock() }()
	b, src := ovPreviewPNG("relative", time.Now())
	if src != "mine" {
		t.Fatalf("src %q", src)
	}
	img, err := png.Decode(bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	w0, h0 := img.Bounds().Dx(), img.Bounds().Dy()
	if w0 != 600 || h0 < 80 {
		t.Fatalf("relative %dx%d", w0, h0)
	}
	cfgMu.Lock()
	cfg.UI = map[string]any{"rel": map[string]any{"cols": []any{"pos", "num", "name", "lic", "ir", "irc", "last", "best", "gap", "pace", "inc"}}}
	cfgMu.Unlock()
	b, _ = ovPreviewPNG("relative", time.Now())
	img, _ = png.Decode(bytes.NewReader(b))
	if w1 := img.Bounds().Dx(); w1 <= w0+100 {
		t.Fatalf("three columns more: %d wide, was %d", w1, w0)
	}
}

func TestTableDesignWidth(t *testing.T) {
	st := newOvState("en")
	if w := tableDesignW("relative", st); w != 600 {
		t.Fatalf("relative as it comes: %v", w)
	}
	if w := tableDesignW("standings", st); w != 720 {
		t.Fatalf("standings as they come: %v", w)
	}
	st.ui = map[string]any{"std": map[string]any{"cols": []any{"pos", "name"}}}
	if w := tableDesignW("standings", st); w != 360 {
		t.Fatalf("two columns: %v (never under half)", w)
	}
}
