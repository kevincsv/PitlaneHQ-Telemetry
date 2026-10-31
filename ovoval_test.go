package main

import (
	"math"
	"strings"
	"testing"
)

// the kind of oval a session runs on, from iRacing's category, the track's type, its name and layout, the car and its length
func TestOvalKind(t *testing.T) {
	for _, c := range []struct {
		cat, typ, track, cfg, car string
		L                         float64
		want                      string
	}{
		{"Road", "road course", "Daytona International Speedway", "Road Course", "Porsche 911 GT3 R", 5700, ""},
		{"Oval", "", "Charlotte Motor Speedway", "Roval", "NASCAR Cup Series Next Gen", 3700, ""},
		{"Oval", "", "Daytona International Speedway", "Oval", "NASCAR Cup Series Next Gen", 4023, "superspeedway"},
		{"Oval", "super speedway", "Talladega Superspeedway", "", "NASCAR Xfinity", 4281, "superspeedway"},
		{"Oval", "", "Martinsville Speedway", "", "Late Model Stock", 846, "short"},
		{"Oval", "", "Phoenix Raceway", "Oval", "NASCAR Cup Series Next Gen", 1609, "mile"},
		{"Oval", "", "Charlotte Motor Speedway", "Oval", "NASCAR Cup Series Next Gen", 2414, "intermediate"},
		{"DirtOval", "", "Eldora Speedway", "", "Dirt Late Model", 805, "dirt"},
		{"", "", "Knoxville Raceway", "", "Dirt Sprint Car - 410", 805, "dirt"},
		{"SportsCar", "", "Spa", "", "BMW M4 GT3", 7004, ""},
	} {
		if got := ovalKind(c.cat, c.typ, c.track, c.cfg, c.car, c.L); got != c.want {
			t.Errorf("%s %s: %q, want %q", c.track, c.cfg, got, c.want)
		}
	}
}

// a 1.5-mile oval lap every 5 m: flat out at 80 m/s but for the corners, each a lift (thr, the lowest throttle) that
// slows the car by dv over len metres from at, braking (brake) at its start when given
type ovalCorner struct{ at, len, dv, thr, brake float64 }

func ovalTestLap(corners ...ovalCorner) *ovLap {
	l := &ovLap{}
	tm := 0.0
	for i := 0; i < 483; i++ {
		d := float64(i) * 5
		v, thr, br := 80.0, 1.0, 0.0
		for _, c := range corners {
			if x := d - c.at; x >= 0 && x < c.len {
				p := x / c.len
				v = 80 - c.dv*math.Sin(math.Pi*p)
				thr = c.thr
				if p >= .6 {
					thr = c.thr + (1-c.thr)*(p-.6)/.4
				}
				if c.brake > 0 && p < .2 {
					br = c.brake
				}
			}
		}
		if i > 0 {
			tm += 5 / v
		}
		l.bins = append(l.bins, &lapPt{v, tm, thr, br, 4, 0})
	}
	l.maxBin, l.time = len(l.bins)-1, tm+5.0/80
	return l
}

// on an oval the coach finds the corners taken with a lift and speaks of the lift; the corner where you lift and the
// reference stays flat out is one of them
func TestOvalCoachTips(t *testing.T) {
	st := ovTestState(t, nil)
	st.lang = "en"
	st.ses.Cat, st.ses.Track, st.ses.TrackConfig, st.ses.TrackLen = "Oval", "Charlotte Motor Speedway", "Oval", 2414
	st.ext.turns = nil
	R := ovalTestLap(ovalCorner{600, 300, 6, .6, 0}, ovalCorner{1800, 300, 6, .6, 0})
	A := ovalTestLap(ovalCorner{560, 340, 9, .3, 0}, ovalCorner{1800, 300, 6, .6, 0}, ovalCorner{1300, 200, 4, .7, 0})
	tips := st.compareLaps(A, R, 5)
	var all []string
	for _, x := range tips {
		all = append(all, x.en+" | "+x.cueEn)
	}
	got := strings.Join(all, "\n")
	if !strings.Contains(got, "You lift 40 m before the reference. Lift later | LIFT LATER") || !strings.Contains(got, "The reference stays flat out here and you lift for") || strings.Contains(got, "rake") {
		t.Fatalf("oval tips:\n%s", got)
	}
	// the same laps on a road course: no lifts are corners there (no official turns), so no tip speaks of them
	st.ses.Cat, st.ses.Track, st.ses.TrackConfig = "Road", "Road America", "Full Course"
	if road := st.compareLaps(A, R, 5); len(road) != 0 {
		t.Fatalf("road course: %+v", road)
	}
}
