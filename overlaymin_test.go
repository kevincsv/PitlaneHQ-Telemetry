package main

import (
	"math"
	"testing"
)

func TestOverlayMinSize(t *testing.T) {
	for _, n := range overlayOrder {
		w, h := overlayMinSize(n)
		d := overlaySizes[n]
		if w < d[0]/2 || w > d[0] || h < 40 || h > d[1] {
			t.Fatalf("%s: min %dx%d for default %v", n, w, h, d)
		}
	}
	// half the default width: the text size slider's 50 %
	if w, _ := overlayMinSize("dash"); w != 280 {
		t.Fatalf("dash min width %d", w)
	}
	if _, h := overlayMinSize("radar"); h != 150 {
		t.Fatalf("radar min height %d", h)
	}
}

// TestOverlaySizeSlider: the text size slider makes the window that share of its normal width, the height following,
// and never below the smallest or wider than the desktop
func TestOverlaySizeSlider(t *testing.T) {
	r := ovSizeRect("dash", [4]int{100, 200, 560, 230}, 0.75, 560, 2560)
	if r != [4]int{100, 200, 420, 173} {
		t.Fatalf("75%%: %v", r)
	}
	if r := ovSizeRect("dash", [4]int{0, 0, 560, 230}, 0.2, 560, 2560); r[2] != 280 {
		t.Fatalf("below 50%% is 50%%: %v", r)
	}
	if r := ovSizeRect("trackbar", [4]int{0, 0, 700, 70}, 1.5, 700, 900); r[2] != 900 {
		t.Fatalf("never wider than the desktop: %v", r)
	}
	if r := ovSizeRect("relative", [4]int{0, 0, 600, 40}, 0.5, 600, 2560); r[3] != 40 {
		t.Fatalf("height never below its smallest: %v", r)
	}
	// its size now: its width against its normal one, with the old Small/Large in it
	c := Config{Scale: 1, Positions: map[string][4]int{"dash": {0, 0, 420, 170}}, UI: map[string]any{}}
	if s := ovSizeOf("dash", c, "", 1440); s != 0.75 {
		t.Fatalf("size %v", s)
	}
	c.UI["dash"] = map[string]any{"textScale": 1.2}
	if s := ovSizeOf("dash", c, "", 1440); math.Abs(s-0.9) > 1e-9 {
		t.Fatalf("size with Large %v", s)
	}
	// never placed: the default for the main screen
	if s := ovSizeOf("fuel", Config{Scale: 1, UI: map[string]any{}}, "", 1080); s != 0.75 {
		t.Fatalf("1080p default %v", s)
	}
	if k := ovScreenK(2160); k != 1 {
		t.Fatalf("4K %v", k)
	}
	if k := ovScreenK(600); k != 0.5 {
		t.Fatalf("small screen %v", k)
	}
}
