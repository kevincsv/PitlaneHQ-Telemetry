package main

import (
	"encoding/hex"
	"encoding/json"
	"strings"
	"testing"
)

// the fixed vectors the web (cpTeam…) and the phones must give for the same secret
const (
	teamVecSecret = "ABCDEFGHJKLMNPQRSTUV"
	teamVecRoom   = "6e3c21de9d32a2f66116abcc82417d7a"
	teamVecJoin   = "8a87be35f9438e93a229e1f22b147612def58f351a50234ea4bbd106c7fd0043"
	teamVecKey    = "b84845539af259471f423a9f9fe25b0447a1056c34787907a9522e7cd398922e"
)

func TestTeamDerivations(t *testing.T) {
	room, join, key := teamRoom(teamVecSecret), teamJoin(teamVecSecret), hex.EncodeToString(teamKey(teamVecSecret))
	t.Logf("secret %s\nroom %s\njoin %s\nkey  %s", teamVecSecret, room, join, key)
	if len(room) != 32 || len(join) != 64 || len(key) != 64 {
		t.Fatalf("lengths: %d %d %d", len(room), len(join), len(key))
	}
	if room != teamVecRoom || join != teamVecJoin || key != teamVecKey {
		t.Fatalf("vectors changed:\nroom %s\njoin %s\nkey  %s", room, join, key)
	}
}

func TestTeamNewSecret(t *testing.T) {
	for i := 0; i < 50; i++ {
		s := teamNewSecret()
		if !teamSecretRe.MatchString(s) {
			t.Fatalf("bad secret %q", s)
		}
	}
}

func TestTeamParseInvite(t *testing.T) {
	ok := []string{
		"0123456789ab.ABCDEFGHJKLMNPQRSTUV",
		"  0123456789ab.ABCDEFGHJKLMNPQRSTUV\n",
		"https://pitlanehq.app/app#team=0123456789ab.ABCDEFGHJKLMNPQRSTUV",
		"https://pitlanehq.app/app#team=0123456789AB.abcdefghjklmnpqrstuv",
		"pitlanehq.app/app?x=1#team=0123456789ab.ABCDEFGHJKLMNPQRSTUV&y=2",
		"https://pitlanehq.app/app#team%3D0123456789ab.ABCDEFGHJKLMNPQRSTUV",
	}
	for _, s := range ok {
		id, sec, err := teamParseInvite(s)
		if err != nil || id != "0123456789ab" || sec != teamVecSecret {
			t.Errorf("%q: %q %q %v", s, id, sec, err)
		}
	}
	bad := []string{"", "0123456789ab", "0123456789ab.ABC", "xyz.ABCDEFGHJKLMNPQRSTUV", "0123456789ab.ABCDEFGHJKLMNPQRSTU0",
		"https://pitlanehq.app/app#share=0123456789ab"}
	for _, s := range bad {
		if _, _, err := teamParseInvite(s); err == nil {
			t.Errorf("%q should fail", s)
		}
	}
}

func TestTeamStints(t *testing.T) {
	s1 := cloudSession{ID: "ir-1-2", Game: "iracing", Track: "Spa", Car: "GT3", Kind: "race", Started: 1000}
	s2 := cloudSession{ID: "ir-1-3"}
	var tr stintTracker
	tr.note(10_000, s1, false, 0) // not in the car: nothing
	if _, ok := tr.snapshot(); ok {
		t.Fatal("a stint before the car")
	}
	tr.note(20_000, s1, true, 5)
	st := tr.lap(120_000, s1, teamLap{N: 5, T: 100, Valid: true, fuel: 2.5})
	if st.Start != 20_000 || st.LapFrom != 5 || st.LapTo != 5 || len(st.Laps) != 1 {
		t.Fatalf("first lap: %+v", st)
	}
	for ms := int64(121_000); ms <= 219_000; ms += 1000 {
		tr.note(ms, s1, true, 6)
	}
	st = tr.lap(220_000, s1, teamLap{N: 6, T: 99.5, Valid: false, fuel: 2.7})
	if st.Start != 20_000 || st.LapTo != 6 || len(st.Laps) != 2 || st.best() != 100 {
		t.Fatalf("second lap: %+v best %v", st, st.best())
	}
	// a short stop (out of the car for less than the gap): the same stint
	tr.note(260_000, s1, true, 7)
	if c, _ := tr.snapshot(); c.Start != 20_000 {
		t.Fatal("a short stop split the stint")
	}
	// out of the car longer than the gap: a new stint
	tr.note(260_000+teamStintGap.Milliseconds()+1000, s1, true, 20)
	if c, _ := tr.snapshot(); c.Start == 20_000 || c.LapFrom != 20 || len(c.Laps) != 0 {
		t.Fatalf("no new stint after the gap: %+v", c)
	}
	// another session: a new stint at once
	tr.note(400_000, s2, true, 1)
	if c, _ := tr.snapshot(); c.Sid != "ir-1-3" || c.Start != 400_000 {
		t.Fatalf("no new stint in another session: %+v", c)
	}
	// a lap that ends with no look at the car before (the watcher not running): its stint starts at the lap's start
	var tr2 stintTracker
	st = tr2.lap(500_000, s1, teamLap{N: 3, T: 90, Valid: true})
	if st.Start != 410_000 || st.LapFrom != 3 {
		t.Fatalf("lap without a look: %+v", st)
	}
	if teamLogKey(st) != "ir-1-2:410000" {
		t.Fatalf("key %s", teamLogKey(st))
	}
}

func TestTeamFuelPerLap(t *testing.T) {
	st := teamStint{Laps: []teamLap{{fuel: 9}, {fuel: -40}, {fuel: 3}, {fuel: 3}, {fuel: 3}, {fuel: 3}, {fuel: 3}}}
	if f := st.fuelPerLap(); f != 3 {
		t.Fatalf("fuel per lap %v (the last five that used fuel)", f)
	}
	if f := (teamStint{Laps: []teamLap{{fuel: -2}}}).fuelPerLap(); f != 0 {
		t.Fatalf("refuel only: %v", f)
	}
}

func TestTeamLogEntry(t *testing.T) {
	s := cloudSession{ID: "ir-9-1", Started: 1700000000000, Game: "iracing", Track: "Spa", TrackConfig: "GP", Car: "Porsche 963", Kind: "race"}
	st := teamStint{Sid: s.ID, Sess: s, Start: 1700000100000, End: 1700000400000, LapFrom: 4, LapTo: 6,
		Laps: []teamLap{{N: 4, T: 137.1234, Valid: true, fuel: 3.1}, {N: 5, T: 136.5, Valid: false, fuel: 3.2}, {N: 6, T: 136.9, Valid: true, fuel: 3.0}}}
	for i := range st.Laps {
		st.Laps[i].T = round(st.Laps[i].T, 3)
	}
	b, _ := json.Marshal(buildTeamLog("Ana", st))
	want := `{"v":1,"driver":"Ana","sid":"ir-9-1","game":"iracing","track":"Spa","config":"GP","car":"Porsche 963","kind":"race","started":1700000000000,` +
		`"stint":{"from":1700000100000,"to":1700000400000,"lapFrom":4,"lapTo":6},"laps":[{"n":4,"t":137.123,"valid":true},{"n":5,"t":136.5,"valid":false},{"n":6,"t":136.9,"valid":true}],` +
		`"best":136.9,"fuelPerLap":3.1}`
	if string(b) != want {
		t.Fatalf("log entry\n got %s\nwant %s", b, want)
	}
	// sealed with the team key, opened the same way
	key := teamKey(teamVecSecret)
	sealed, _ := sealAES(key, b)
	srv, _ := json.Marshal(map[string]any{"log": []map[string]any{
		{"id": "x", "account": "a1", "name": "Ana", "key": teamLogKey(st), "at": 5, "sealed": sealed},
		{"id": "y", "account": "a2", "name": "Bo", "key": "k", "at": 4, "sealed": "bm90IGl0"},
	}})
	res, err := teamOpenLog(srv, key)
	if err != nil {
		t.Fatal(err)
	}
	out, _ := json.Marshal(res)
	if !strings.Contains(string(out), `"entry":`+want) || strings.Contains(string(out), `"Bo"`) {
		t.Fatalf("opened log %s", out)
	}
	t.Logf("log answer %s", out)
}

func TestTeamEvent(t *testing.T) {
	s := cloudSession{ID: "ir-9-1", Game: "iracing", Track: "Spa", TrackConfig: "GP", Car: "Porsche 963", Kind: "race"}
	st := teamStint{Sid: s.ID, Start: 1700000100000, Laps: []teamLap{{N: 4, T: 137, fuel: 3}, {N: 5, T: 136, fuel: 3}}}
	ev := buildTeamEvent(teamNow{driver: "Ana", inCar: true, sess: s, stint: st, hasStint: true, lap: 6, fuel: 31.5,
		sessionLeft: 3600.4, lastLap: 136, best: 135.9})
	b, _ := json.Marshal(ev)
	want := `{"driver":"Ana","inCar":true,"sid":"ir-9-1","game":"iracing","track":"Spa","config":"GP","car":"Porsche 963","kind":"race","lap":6,` +
		`"stintStart":1700000100000,"stintLaps":2,"fuel":31.5,"fuelPerLap":3,"lapsLeft":10.5,"pitLap":16,"sessionLeft":3600,"lastLap":136,"best":135.9}`
	if string(b) != want {
		t.Fatalf("event\n got %s\nwant %s", b, want)
	}
	// no laps in the stint: from the use an hour over the last lap (36 l/h, 100 s laps: 1 l a lap)
	ev = buildTeamEvent(teamNow{inCar: true, sess: s, lap: 2, fuel: 10, useLPerH: 36, lastLap: 100, sessionLeft: 604800})
	if ev.FuelPerLap != 1 || ev.LapsLeft != 10 || ev.PitLap != 12 || ev.SessionLeft != -1 || ev.StintLaps != 0 {
		t.Fatalf("from the use an hour: %+v", ev)
	}
	// nothing known
	ev = buildTeamEvent(teamNow{sessionLeft: -1})
	if ev.InCar || ev.FuelPerLap != 0 || ev.LapsLeft != -1 || ev.PitLap != -1 || ev.SessionLeft != -1 || ev.Game != "" {
		t.Fatalf("unknown: %+v", ev)
	}
	// another session's stint is not this one's
	ev = buildTeamEvent(teamNow{sess: cloudSession{ID: "other"}, stint: st, hasStint: true, sessionLeft: -1})
	if ev.StintStart != 0 || ev.StintLaps != 0 {
		t.Fatalf("stale stint: %+v", ev)
	}
}
