package main

// The rivals of practice and qualifying: the other real drivers' best laps of a session that is not a race go to the
// community as a race's do (fieldTopLaps, shareFieldTop): every few minutes while the session runs, and when it ends
// (another session, or the PC leaves the game) while the field watcher still holds that session's laps, so the
// leaderboard and the model learn from every session the PC saw, not only its races. Each driver goes again only when
// their best got faster since it last went. Test drives never go; races keep their own report (saveRace).

import (
	"strings"
	"sync"
	"time"
)

// practiceEvery: how often a running practice or qualifying shares the rivals that got faster
const practiceEvery = 3 * time.Minute

var (
	pracMu   sync.Mutex
	pracSent = map[string]float64{} // session|driver key → the best already sent
	pracNext time.Time
)

// practiceKind: a session whose rivals go up from here (practice, qualifying, warmup); never a race (saveRace shares
// those), a test drive, nor a session the text does not name
func practiceKind(kind string) bool {
	k := strings.ToLower(strings.TrimSpace(kind))
	return k != "" && !strings.Contains(k, "race") && !isTestDrive(k)
}

// practiceReport: the session sn of the text y as a report for fieldTopLaps: the track, your class's results with
// their sectors where the field watcher saw them, and your best (the leaderboard shows only the rivals faster than you)
func practiceReport(y string, sn int) *raceReport {
	kind := sessionKind(y, sn)
	if !practiceKind(kind) {
		return nil
	}
	m := currentCarTrack(y)
	if m.TrackID == 0 {
		return nil
	}
	r := &raceReport{Game: gameTag(currentGame()), kind: kind, Track: m.Track, TrackID: m.TrackID, Car: m.Car, CarID: m.CarID,
		Subsession: m.Subsession, Official: m.Official, Cat: m.Cat, AI: hasAI(y)}
	for _, x := range sessionResults(y, sn) {
		if x.ClassID != m.CarClassID && m.CarClassID != 0 {
			continue
		}
		if x.Me {
			r.Best = x.Best
		} else {
			x.Sectors = fieldSectors(x.carIdx, x.Best)
		}
		r.Results = append(r.Results, x)
	}
	return r
}

// practiceNew: the laps of the report not sent yet in this session (or faster than the one sent), marked as sent
func practiceNew(session string, laps []map[string]any) []map[string]any {
	pracMu.Lock()
	defer pracMu.Unlock()
	var out []map[string]any
	for _, b := range laps {
		k, _ := b["other"].(string)
		t, _ := b["time"].(float64)
		key := session + "|" + k
		if s, ok := pracSent[key]; ok && s <= t {
			continue
		}
		pracSent[key] = t
		out = append(out, b)
	}
	if len(pracSent) > 5000 { // a PC that runs for weeks: forget the old sessions (a lap sent again is kept by the server)
		pracSent = map[string]float64{}
	}
	return out
}

// sharePractice: the rivals of session sn of the text y that are new or faster go up; always reads the field
// watcher's laps before they are dropped (the caller runs it before fieldSession forgets the session), and sends them
// in the background
func sharePractice(y string, sn int) {
	if y == "" || sn < 0 {
		return
	}
	commMu.Lock()
	on := commCfg.ShareTimes
	commMu.Unlock()
	r := practiceReport(y, sn)
	if r == nil || !on || tel.isDemo() || !fieldShareGame(r.Game) {
		return
	}
	laps := practiceNew(yamlField(y, "SubSessionID")+"-"+yamlField(y, "TrackID")+"-"+itoa(sn), fieldTopLaps(r))
	if len(laps) == 0 {
		return
	}
	go func() {
		if !accountSignedIn() {
			return
		}
		for _, body := range laps {
			_, err := commCall("POST", "/laps", body, true)
			commNote(err)
		}
	}()
}

// practiceTick: every few minutes while a session runs, its rivals that got faster go up
func practiceTick(y string, sn int, now time.Time) {
	pracMu.Lock()
	due := now.After(pracNext)
	if due {
		pracNext = now.Add(practiceEvery)
	}
	pracMu.Unlock()
	if due {
		sharePractice(y, sn)
	}
}
