package main

import "testing"

func TestOvHomeAt(t *testing.T) {
	if x, y, ok := ovHomeAt("relative", 2560, 1440, 600, 380); !ok || x != 1880 || y != 900 {
		t.Fatalf("relative on 2560×1440: %d,%d %v", x, y, ok)
	}
	if x, y, ok := ovHomeAt("relative", 1920, 1080, 600, 380); !ok || x != 1320 || y != 675 {
		t.Fatalf("relative on 1920×1080: %d,%d %v", x, y, ok)
	}
	if x, y, _ := ovHomeAt("dash", 1280, 720, 560, 230); x+560 > 1280 || y+230 > 720 {
		t.Fatalf("dash off a small screen: %d,%d", x, y)
	}
	if _, _, ok := ovHomeAt("coach", 2560, 1440, 520, 200); ok {
		t.Fatal("coach has no first place")
	}
}
