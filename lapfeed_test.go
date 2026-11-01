package main

import "testing"

// the lap recorder late for two seconds (the PC busy): the frames the reader pushed meanwhile wait in the queue and the
// lap has no hole; it stays valid and its health says so (no gap, every point seen, the samples a second)
func TestLapFeedRecorderLate(t *testing.T) {
	s := newLapSim(t, 1, 0)
	var q [][]float64
	// the reader's side: every frame queued instead of stepped at once
	push := func(v []float64) { q = append(q, append([]float64(nil), v...)) }
	s.sample(60, false, true)
	for i := 0; i < int(7000/60*lapSimHz); i++ {
		s.st += 1 / lapSimHz
		s.d += 60 / lapSimHz
		if s.d >= lapSimL {
			s.d -= lapSimL
			cross := s.st - s.d/60
			s.last = cross - s.lineAt
			s.lap++
			s.lineAt = cross
		}
		v := make([]float64, len(lapVars))
		v[0], v[1], v[2], v[3] = float64(s.lap), s.d, s.d/lapSimL, 60
		v[8], v[9], v[14], v[17], v[18], v[27], v[12] = s.last, 50, s.st, s.st-s.lineAt, 3, 2, 1
		push(v)
		// the recorder looks every frame, except for two seconds in the middle of lap 2 when it is away
		away := s.lap == 2 && s.d > 1000 && s.d < 1000+2*60
		if !away {
			for _, f := range q {
				s.ls.step(f)
			}
			q = q[:0]
		}
	}
	laps := s.ended()
	l := lapCheck(t, "the lap the recorder was late in", laps[2], true)
	if l.Trace.H == nil || l.Trace.H.Gap > lapBin || l.Trace.H.Seen < 0.99 {
		t.Fatalf("health %+v", l.Trace.H)
	}
	if h := l.Trace.H.Hz; h < 29 || h > 31 {
		t.Errorf("samples a second %.1f", h)
	}
}

// the queue itself: frames in order, the oldest dropped past its size, nothing left after a reset
func TestLapFeedQueue(t *testing.T) {
	var f lapFeed
	tel.mu.Lock()
	for i := 0; i < lapFeedMax+10; i++ {
		f.pushLocked()
	}
	tel.mu.Unlock()
	if f.lost != 10 {
		t.Errorf("lost %d", f.lost)
	}
	if n := f.drain(func([]float64) {}); n != lapFeedMax {
		t.Errorf("drained %d", n)
	}
	tel.mu.Lock()
	f.pushLocked()
	tel.mu.Unlock()
	f.reset()
	if n := f.drain(func([]float64) {}); n != 0 {
		t.Errorf("after a reset %d", n)
	}
}

// a lap with a hole: its health says how long
func TestLapHealthGap(t *testing.T) {
	s := newLapSim(t, 1, 0)
	s.sample(60, false, true)
	s.move(3000, 60, false, true)
	s.move(1000, 60, false, true)
	s.move(200, 60, false, false) // 200 m with no telemetry
	s.move(1900, 60, false, true)
	l := lapCheck(t, "the lap with a hole", s.ended()[2], false)
	if l.Trace.H == nil || l.Trace.H.Gap < 150 {
		t.Fatalf("health %+v", l.Trace.H)
	}
}

// a lap the account has as not valid (a hole in the live recording) goes up again from the file, marked as a repair
func TestIBTRepairable(t *testing.T) {
	zero, one := 0, 1
	l := cloudLap{N: 1, Time: 90.5, Valid: true}
	if !repairable([]acctLap{{N: 1, Time: 90.5, Valid: &zero}}, l) {
		t.Fatal("not valid on the account: repair")
	}
	if repairable([]acctLap{{N: 1, Time: 90.5, Valid: &one}}, l) || repairable([]acctLap{{N: 1, Time: 90.5}}, l) {
		t.Fatal("valid or unknown: no repair")
	}
}
