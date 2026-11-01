package main

import (
	"testing"
	"time"
)

// the tyres' carcass temperatures: averaged over the lap, left out when the game gave none for most of it
func TestLapTyres(t *testing.T) {
	r := &lapRec{}
	for i := 0; i < 100; i++ {
		r.samples++
		v := make([]float64, 12)
		for k := range v {
			v[k] = 80 + float64(k) + float64(i%2)*2 // 80/82, 81/83…
		}
		r.addTyres(v)
	}
	tt := r.tyres()
	if len(tt) != 12 || tt[0] != 81 || tt[11] != 92 {
		t.Fatalf("tyres %v", tt)
	}
	z := &lapRec{samples: 100}
	for i := 0; i < 100; i++ {
		z.addTyres(make([]float64, 12)) // a game that gives none reads 0
	}
	if z.tyres() != nil {
		t.Fatal("no temperatures, no tyre chart")
	}
}

// the tank of the session: DriverCarFuelMaxLtr times DriverCarMaxFuelPct
func TestSessionTank(t *testing.T) {
	y := "WeekendInfo:\n TrackDisplayName: Spa\nDriverInfo:\n DriverCarIdx: 0\n DriverCarFuelMaxLtr: 120.000\n DriverCarMaxFuelPct: 0.500\n"
	if s := sessionMetaGame(y, 0, time.Unix(0, 0), "iracing"); s.Tank != 60 {
		t.Fatalf("tank %v", s.Tank)
	}
}
