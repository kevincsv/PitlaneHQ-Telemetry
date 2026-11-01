package main

import "testing"

// leaving the test builds never installs an older version: the normal builds are held back until they reach the
// version the PC has; a test build's own version.json is never held back
func TestHeldBack(t *testing.T) {
	older, newer := "0.0.1", "99.0.0"
	left := updPrefs{LeftBeta: appVersion}
	if !heldBack(left, &updateInfo{Version: older}) {
		t.Fatal("an older normal build was offered after leaving the test builds")
	}
	if heldBack(left, &updateInfo{Version: appVersion}) || heldBack(left, &updateInfo{Version: newer}) {
		t.Fatal("a normal build of the same or a newer version was held back")
	}
	if heldBack(left, &updateInfo{Version: older, Channel: "beta"}) {
		t.Fatal("a test build was held back")
	}
	if heldBack(updPrefs{}, &updateInfo{Version: older}) || heldBack(left, nil) {
		t.Fatal("held back without having left the test builds")
	}
}
