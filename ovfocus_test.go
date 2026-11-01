package main

import (
	"encoding/json"
	"testing"
)

// practising one corner: the overlay times the corner on every lap and draws its times
func TestCoachFocus(t *testing.T) {
	st := ovTestState(t, map[string]any{"coach": map[string]any{"focus": true, "turns": []any{"T2"}}})
	st.ses.TrackID = 266
	st.ext.turnsKey = "t" + itoa(st.ses.TrackID)
	st.ext.turns = []float64{.1, .5, .8}
	cfg := st.uiMap("coach")
	if st.coachFocus(cfg) != 2 {
		t.Fatalf("focus %d", st.coachFocus(cfg))
	}
	set := func(k string, v any) { b, _ := json.Marshal(v); st.frame[k] = b }
	set("IsOnTrack", 1)
	set("OnPitRoad", 0)
	pass := func(lap int, t0, dt float64) {
		set("LapCompleted", lap)
		set("LapDist", 1810.0)
		set("LapCurrentLapTime", t0)
		st.focusTick(cfg, nil)
		set("LapDist", 2130.0)
		set("LapCurrentLapTime", t0+dt)
		st.focusTick(cfg, nil)
	}
	for i, dt := range []float64{6.4, 6.3, 6.35, 6.2, 6.25, 6.1} {
		pass(i+1, 40, dt)
	}
	F := st.ext.coach.focus
	if len(F.times) != 6 {
		t.Fatalf("times %v", F.times)
	}
	last, best, avg5, first5 := focusStats(F.times)
	if last > 6.1001 || best > 6.1001 || avg5 >= first5 {
		t.Fatalf("stats %v %v %v %v", last, best, avg5, first5)
	}
	c := newCanvas(520, 300)
	if h := drawCoachFocus(c, st, 1, 2); h < 80 {
		t.Fatalf("height %d", h)
	}
	// another corner chosen without focus: the normal coach
	st2 := ovTestState(t, map[string]any{"coach": map[string]any{"turns": []any{"T2"}}})
	if st2.coachFocus(st2.uiMap("coach")) != 0 {
		t.Fatal("focus without the switch")
	}
}
