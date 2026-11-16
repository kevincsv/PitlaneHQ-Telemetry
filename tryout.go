package main

import (
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// Trying Pitlane HQ without an account (the owner's choice, Nov 15 2026): a PC nobody is signed in on records, shows
// and opens its overlays for tryLimit sessions; after that the app asks for a free account (signWall in index.html)
// and the overlays stay closed until someone signs in. A session counts once the driver finishes a lap in it (an
// imported .ibt never counts). The PC keeps its count in the data folder and the server keeps it too, by pcID() (a
// hash of Windows' own machine id), so reinstalling Pitlane HQ does not start it again (cloud/src/tryout.js).
const tryLimit = 3

var errTryOver = errors.New("create a free account to keep using Pitlane HQ")

// the last session goes on while laps keep coming: the lock waits until it is over (no lap for this long), or until a
// lap of another session comes
const tryGrace = 20 * time.Minute

type tryFile struct {
	Sessions []string  `json:"sessions"`         // the sessions counted on this PC
	Server   int       `json:"server,omitempty"` // what the server counts for this PC (from an install before this one)
	LastLap  time.Time `json:"lastLap"`          // the last lap of a counted session
	Over     bool      `json:"over,omitempty"`   // a lap of a session past the limit came
}

var (
	tryMu     sync.Mutex
	trySt     tryFile
	tryLoaded bool
	tryNow    = time.Now
	trySync   = tryServerNote // tests swap it
)

func tryPath() string { return filepath.Join(dataDir(), "tryout.json") }

func tryLoadLocked() {
	if tryLoaded {
		return
	}
	tryLoaded = true
	if b, err := os.ReadFile(tryPath()); err == nil {
		json.Unmarshal(b, &trySt)
	}
}

func trySaveLocked() {
	b, _ := json.Marshal(trySt)
	os.MkdirAll(dataDir(), 0o755)
	os.WriteFile(tryPath(), b, 0o600)
}

// someone is signed in on this PC (an account waiting for its email counts: it is made)
func trySignedIn() bool {
	loadPL()
	plMu.Lock()
	defer plMu.Unlock()
	return plAcc.Token != ""
}

func tryUsedLocked() int {
	n := len(trySt.Sessions)
	if trySt.Server > n {
		n = trySt.Server
	}
	return n
}

// tryNote: a lap of this session was finished on this PC
func tryNote(session string) {
	if session == "" || trySignedIn() {
		return
	}
	tryMu.Lock()
	tryLoadLocked()
	for _, s := range trySt.Sessions {
		if s == session {
			trySt.LastLap = tryNow()
			trySt.Over = false
			trySaveLocked()
			tryMu.Unlock()
			return
		}
	}
	was := tryLockedLocked()
	if tryUsedLocked() >= tryLimit {
		trySt.Over = true
	} else {
		trySt.Sessions = append(trySt.Sessions, session)
		trySt.LastLap = tryNow()
		trySt.Over = false
	}
	trySaveLocked()
	now := tryLockedLocked()
	used := tryUsedLocked()
	over := trySt.Over
	tryMu.Unlock()
	if !over {
		go trySync(session)
	}
	pushNotice("tryout", map[string]any{"used": used, "locked": now})
	if now && !was {
		closeOverlays("*")
	}
}

func tryLockedLocked() bool {
	if tryUsedLocked() < tryLimit {
		return false
	}
	return trySt.Over || tryNow().Sub(trySt.LastLap) > tryGrace
}

// tryLocked: the sessions without an account are used up, so the app asks for one and the overlays stay closed
func tryLocked() bool {
	if trySignedIn() {
		return false
	}
	tryMu.Lock()
	defer tryMu.Unlock()
	tryLoadLocked()
	return tryLockedLocked()
}

// what the page reads with the account (plStatus, which holds plMu and says whether someone is signed in): the
// sessions used, the limit and whether the app asks for an account now
func tryStatusSigned(signed bool) (used, limit int, locked bool) {
	tryMu.Lock()
	defer tryMu.Unlock()
	tryLoadLocked()
	return tryUsedLocked(), tryLimit, !signed && tryLockedLocked()
}

// tryReset: an admin signed in on this PC; once signed out it tries Pitlane HQ again as a new driver would (the
// server forgets this PC's count too, /account/me)
func tryReset() {
	tryMu.Lock()
	defer tryMu.Unlock()
	tryLoadLocked()
	if len(trySt.Sessions) == 0 && trySt.Server == 0 && !trySt.Over {
		return
	}
	trySt = tryFile{}
	trySaveLocked()
}

// tryServerNote tells the server this PC used a session; its answer is the PC's count there
func tryServerNote(session string) {
	b, err := commRequest("POST", "/community/tryout", map[string]string{"pc": pcID(), "session": session}, "")
	if err == nil {
		tryTake(b)
	}
}

// tryServerRead: once when the agent starts with nobody signed in, the server's count for this PC (an install
// before this one)
func tryServerRead() {
	for i := 0; i < 10; i++ { // the network may come a moment after Windows starts
		if trySignedIn() {
			return
		}
		if b, err := commRequest("GET", "/community/tryout?pc="+url.QueryEscape(pcID()), nil, ""); err == nil {
			tryTake(b)
			return
		}
		time.Sleep(time.Minute)
	}
}

func tryTake(b []byte) {
	var r struct{ Used int }
	if json.Unmarshal(b, &r) != nil {
		return
	}
	tryMu.Lock()
	tryLoadLocked()
	changed := r.Used != trySt.Server
	trySt.Server = r.Used
	if changed {
		trySaveLocked()
	}
	used := tryUsedLocked()
	locked := tryLockedLocked()
	tryMu.Unlock()
	if changed {
		pushNotice("tryout", map[string]any{"used": used, "locked": locked})
	}
}
