package main

import (
	"testing"
	"time"
)

// trying Pitlane HQ without an account: three sessions with a finished lap, the third lasts while its laps come, then
// the overlays stay closed until someone signs in; the server's count from an install before counts too
func TestTryoutSessions(t *testing.T) {
	t.Setenv("PITLANEHQ_DATA", t.TempDir())
	loadPL()
	plMu.Lock()
	wasTok, wasAdmin := plAcc.Token, plAcc.Admin
	plAcc.Token, plAcc.Admin = "", false
	plMu.Unlock()
	now := time.Date(2026, 11, 15, 20, 0, 0, 0, time.UTC)
	sent := []string{}
	oldNow, oldSync := tryNow, trySync
	tryNow = func() time.Time { return now }
	trySync = func(s string) { sent = append(sent, s) }
	tryMu.Lock()
	trySt, tryLoaded = tryFile{}, true
	tryMu.Unlock()
	defer func() {
		tryNow, trySync = oldNow, oldSync
		tryMu.Lock()
		trySt, tryLoaded = tryFile{}, false
		tryMu.Unlock()
		plMu.Lock()
		plAcc.Token, plAcc.Admin = wasTok, wasAdmin
		plMu.Unlock()
	}()

	for _, s := range []string{"a", "a", "b", "b", "c"} {
		tryNote(s)
		if tryLocked() {
			t.Fatalf("locked during session %s", s)
		}
	}
	if u, l, _ := tryStatusSigned(false); u != 3 || l != 3 {
		t.Fatalf("used %d of %d", u, l)
	}
	time.Sleep(10 * time.Millisecond) // the server notes run in goroutines
	if len(sent) != 3 {
		t.Fatalf("told the server %v", sent)
	}
	// the third session goes on while its laps come
	now = now.Add(15 * time.Minute)
	tryNote("c")
	now = now.Add(15 * time.Minute)
	if tryLocked() {
		t.Fatal("locked 15 minutes after the third session's last lap")
	}
	// once it is over, the app asks for an account and no overlay opens
	now = now.Add(10 * time.Minute)
	if !tryLocked() || openNamedOverlay("radar") != errTryOver {
		t.Fatal("not locked after the third session")
	}
	// a fourth session right after the third locks at its first lap, and is not counted
	now = now.Add(-30 * time.Minute)
	tryNote("d")
	if !tryLocked() {
		t.Fatal("a fourth session was let in")
	}
	if u, _, _ := tryStatusSigned(false); u != 3 {
		t.Fatalf("the fourth was counted: %d", u)
	}
	// signed in: nothing is locked and nothing counts
	plMu.Lock()
	plAcc.Token = "tok"
	plMu.Unlock()
	if tryLocked() {
		t.Fatal("locked while signed in")
	}
	tryNote("e")
	if _, _, l := tryStatusSigned(true); l {
		t.Fatal("status locked while signed in")
	}
	plMu.Lock()
	plAcc.Token = ""
	plMu.Unlock()

	// a reinstall: nothing on this PC, the server says 3
	tryMu.Lock()
	trySt = tryFile{}
	tryMu.Unlock()
	tryTake([]byte(`{"used":3,"limit":3}`))
	if !tryLocked() {
		t.Fatal("a reinstall started the count again")
	}
	// an admin signed in here: the PC tries it again as new
	tryReset()
	if tryLocked() {
		t.Fatal("still locked after the admin's reset")
	}
}
