package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"math"
	"os"
	"path/filepath"
	"sort"
	"testing"
	"time"
)

// The lap recorder's golden test: realistic drives (a speed profile with braking zones, trail braking, gears, steering
// and the game's position on a loop) go through the recorder as the game sends them, at 60 or 30 frames a second, and
// what every lap becomes (valid or not, its time, sectors, health, tags, incidents and a hash of its trace and path)
// must match testdata/laprec/golden.json. A change meant to change a lap rewrites the file with
//
//	go test -mod=vendor -run TestLapRecorderGolden -update-golden .
//
// and says in its commit which laps changed and why. The clean drive's laps also go to testdata/laprec/laps.json, where
// the coach's own golden test (cloud/test/recorded.test.mjs) reads them: the same recorded laps through the analysis.
var updateGolden = flag.Bool("update-golden", false, "rewrite testdata/laprec golden files")

// goldenTrack: a loop of len metres whose corners each have an apex (fraction of the lap) and a slowest speed (m/s)
type goldenTrack struct {
	len    float64
	vmax   float64
	apexes []float64
	vmins  []float64
}

var goldenRoad = goldenTrack{len: 4200, vmax: 78, apexes: []float64{0.08, 0.22, 0.31, 0.47, 0.6, 0.74, 0.88}, vmins: []float64{22, 35, 48, 18, 30, 41, 26}}

// the Nürburgring's combined layout is 25.4 km: longer than the recorder's points once reached
var goldenLong = goldenTrack{len: 25378, vmax: 75, apexes: []float64{0.03, 0.11, 0.2, 0.29, 0.37, 0.45, 0.52, 0.61, 0.7, 0.79, 0.86, 0.94}, vmins: []float64{25, 38, 30, 44, 21, 36, 50, 28, 33, 40, 24, 35}}

// driverStyle: how one lap is driven: metres the braking comes later (+) or earlier, and a factor on the slowest speeds
type driverStyle struct {
	brake float64
	vmin  float64
}

// speed at d (m along the lap) for a style: the lowest of every corner's braking and acceleration curves
func (g goldenTrack) speed(d float64, s driverStyle) float64 {
	v := g.vmax
	for k, a := range g.apexes {
		ad := a * g.len
		vm := g.vmins[k] * s.vmin
		for _, off := range []float64{-g.len, 0, g.len} { // the corners of the laps before and after (near the line)
			x := d - (ad + off)
			var c float64
			if x < 0 {
				dec := 13.0
				// a later braking point: the same apex reached with a harder stop
				lead := (g.vmax*g.vmax - vm*vm) / (2 * dec)
				if lead > s.brake+10 {
					dec = (g.vmax*g.vmax - vm*vm) / (2 * (lead - s.brake))
				}
				c = math.Sqrt(vm*vm + 2*dec*(-x))
			} else {
				c = math.Sqrt(vm*vm + 2*4.5*x)
			}
			v = math.Min(v, c)
		}
	}
	return v
}

// goldenSim: one drive through the recorder
type goldenSim struct {
	tr      goldenTrack
	hz      float64
	env     *lapTestEnv
	ls      *lapStream
	st      float64
	lap     int
	d       float64
	lineAt  float64
	last    float64
	times   map[int]float64 // each lap's time as the game would give it
	inc     float64
	surface float64 // 3 on track, 0 off
	mat     float64
	style   func(lap int) driverStyle
	send    bool
}

func newGoldenSim(tr goldenTrack, hz float64) *goldenSim {
	env := &lapTestEnv{t: time.Unix(1000, 0), vars: map[string]bool{"PlayerTrackSurface": true, "PlayerTrackSurfaceMaterial": true, "Lat": true, "Lon": true,
		"LapCountFlag": true, "TrackWetness": true}}
	return &goldenSim{tr: tr, hz: hz, env: env, ls: newLapStream(env), st: 100, lap: 1, d: tr.len - 300, lineAt: 100 - 10, times: map[int]float64{},
		surface: 3, mat: 1, send: true, style: func(int) driverStyle { return driverStyle{0, 1} }}
}

// frame: one frame of the game at the car's current place
func (s *goldenSim) frame() {
	if !s.send {
		return
	}
	g := s.tr
	st := s.style(s.lap)
	v := make([]float64, len(lapVars))
	sp := g.speed(s.d, st)
	ahead := g.speed(math.Mod(s.d+sp/s.hz*6, g.len), st)
	thr, brk := 1.0, 0.0
	if ahead < sp-0.4 { // slowing down: on the brake, released towards the apex (trail braking)
		thr, brk = 0, math.Min(1, 0.35+(sp-ahead)/6)
	} else if ahead > sp+0.05 && sp < g.vmax-0.5 {
		thr = math.Min(1, 0.45+(ahead-sp)/4)
	}
	gear := math.Min(6, math.Max(1, math.Floor(sp/14)+1))
	th := 2 * math.Pi * s.d / g.len
	steer := 0.0
	for k, a := range g.apexes {
		if dx := math.Abs(s.d - a*g.len); dx < 120 {
			steer = (1 - dx/120) * 0.25 * float64(1-2*(k%2))
		}
	}
	R := g.len / (2 * math.Pi)
	x, y := R*math.Cos(th), R*math.Sin(th)
	v[0], v[1], v[2], v[3] = float64(s.lap), s.d, s.d/g.len, sp
	v[4], v[5], v[6], v[7] = thr, brk, gear, steer
	v[8], v[9], v[11], v[12], v[13], v[14] = s.last, 50-s.st/200, s.inc, 1, 0, s.st
	v[15], v[16], v[17], v[18] = 21, 30, s.st-s.lineAt, s.surface
	v[23], v[24], v[27], v[28], v[29] = 45+y/110540, 7+x/(111320*math.Cos(45*math.Pi/180)), 2, s.mat, 1
	s.env.t = time.Unix(1000, 0).Add(time.Duration(s.st * float64(time.Second)))
	s.ls.step(v)
}

// drive goes on for dist metres
func (s *goldenSim) drive(dist float64) {
	for done := 0.0; done < dist; {
		sp := s.tr.speed(s.d, s.style(s.lap))
		step := sp / s.hz
		s.st += 1 / s.hz
		s.d += step
		done += step
		if s.d >= s.tr.len {
			s.d -= s.tr.len
			cross := s.st - s.d/sp
			s.last = cross - s.lineAt
			s.times[s.lap] = s.last
			s.lap++
			s.lineAt = cross
		}
		s.frame()
	}
}

// to drives on to distance d of the lap (the next time the car gets there)
func (s *goldenSim) to(d float64) {
	if d > s.d {
		s.drive(d - s.d)
	} else {
		s.drive(s.tr.len - s.d + d)
	}
}

type goldenLap struct {
	N       int       `json:"n"`
	Valid   bool      `json:"valid"`
	Time    float64   `json:"time"`
	Points  int       `json:"points"`
	Sectors []float64 `json:"sectors,omitempty"`
	Health  lapHealth `json:"health"`
	Flags   []string  `json:"flags,omitempty"`
	Inc     []float64 `json:"inc,omitempty"`
	IncK    []string  `json:"incK,omitempty"`
	Path    bool      `json:"path"`
	Hash    string    `json:"hash"`
}

func goldenHash(v any) string {
	b, _ := json.Marshal(v)
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:6])
}

// laps: every lap the drive ended, built as it goes to the account
func (s *goldenSim) laps() ([]goldenLap, []cloudLap) {
	var out []goldenLap
	var built []cloudLap
	for _, r := range s.env.ended {
		lt, ok := s.times[r.n]
		if !ok {
			continue
		}
		l, ok := buildLap(r, cloudSession{ID: "g"}, 50, lt)
		if !ok {
			out = append(out, goldenLap{N: r.n, Hash: "no lap"})
			continue
		}
		out = append(out, goldenLap{N: l.N, Valid: l.Valid, Time: l.Time, Points: len(l.Trace.D), Sectors: l.Sectors, Health: *l.Trace.H, Flags: l.Trace.F,
			Inc: l.Trace.Inc, IncK: l.Trace.IncK, Path: l.Trace.X != nil, Hash: goldenHash([]any{l.Trace.D, l.Trace.X, l.Trace.Y, l.Trace.G})})
		built = append(built, l)
	}
	return out, built
}

// the drives: each a name and what happens on its second full lap (lap 2; lap 1 starts 300 m before the line, lap 3 and
// 4 are clean)
var goldenDrives = []struct {
	name string
	tr   goldenTrack
	hz   float64
	run  func(s *goldenSim)
}{
	{"clean at 60 Hz", goldenRoad, 60, func(s *goldenSim) {}},
	{"clean at 30 Hz", goldenRoad, 30, func(s *goldenSim) {}},
	{"1x Off Track", goldenRoad, 60, func(s *goldenSim) { s.to(1500); s.inc++ }},
	{"2x Loss of Control on the track", goldenRoad, 60, func(s *goldenSim) { s.to(1500); s.inc += 2 }},
	{"4x contact", goldenRoad, 60, func(s *goldenSim) { s.to(1500); s.inc += 4 }},
	{"a quarter second on the grass at 60 Hz", goldenRoad, 60, func(s *goldenSim) { offFor(s, 0.25, 15) }},
	{"a quarter second on the grass at 30 Hz", goldenRoad, 30, func(s *goldenSim) { offFor(s, 0.25, 15) }},
	{"half a second on the grass at 60 Hz", goldenRoad, 60, func(s *goldenSim) { offFor(s, 0.5, 15) }},
	{"half a second on a kerb", goldenRoad, 60, func(s *goldenSim) { offFor(s, 0.5, 2) }},
	{"reset to a box behind", goldenRoad, 60, func(s *goldenSim) {
		s.to(2600)
		s.d = 900
		s.frame()
	}},
	{"telemetry lost for a second and a half", goldenRoad, 60, func(s *goldenSim) {
		s.to(2000)
		s.send = false
		s.drive(100)
		s.send = true
	}},
	{"the Nürburgring combined", goldenLong, 60, func(s *goldenSim) {}},
}

// offFor: on lap 2 at 1500 m, sec seconds on a surface of the material (15 grass, 2 a kerb)
func offFor(s *goldenSim, sec, mat float64) {
	s.to(1500)
	s.surface, s.mat = 0, mat
	s.drive(s.tr.speed(s.d, s.style(s.lap)) * sec)
	s.surface, s.mat = 3, 1
}

func TestLapRecorderGolden(t *testing.T) {
	got := map[string][]goldenLap{}
	var shared []cloudLap
	for _, dr := range goldenDrives {
		s := newGoldenSim(dr.tr, dr.hz)
		// every lap driven a little differently: the coach has something to say between them
		s.style = func(lap int) driverStyle {
			return driverStyle{brake: float64((lap*7)%5-2) * 6, vmin: 0.97 + float64((lap*3)%4)*0.012}
		}
		s.to(0)  // lap 1 from 300 m before the line: lap 2 is the first full one
		s.to(10) // a little into lap 2
		dr.run(s)
		for s.lap < 5 {
			s.to(0)
			s.to(5)
		}
		laps, built := s.laps()
		got[dr.name] = laps
		if dr.name == "clean at 60 Hz" {
			shared = built
		}
	}
	dir := filepath.Join("testdata", "laprec")
	gp, lp := filepath.Join(dir, "golden.json"), filepath.Join(dir, "laps.json")
	if *updateGolden {
		_ = os.MkdirAll(dir, 0o755)
		b, _ := json.MarshalIndent(got, "", " ")
		if err := os.WriteFile(gp, append(b, '\n'), 0o644); err != nil {
			t.Fatal(err)
		}
		lb, _ := json.Marshal(shared)
		if err := os.WriteFile(lp, append(lb, '\n'), 0o644); err != nil {
			t.Fatal(err)
		}
		t.Logf("wrote %s and %s", gp, lp)
		return
	}
	b, err := os.ReadFile(gp)
	if err != nil {
		t.Fatalf("%v (make it with -update-golden)", err)
	}
	var want map[string][]goldenLap
	if err := json.Unmarshal(b, &want); err != nil {
		t.Fatal(err)
	}
	names := make([]string, 0, len(want))
	for k := range want {
		names = append(names, k)
	}
	sort.Strings(names)
	for _, k := range names {
		w, g := want[k], got[k]
		wj, _ := json.Marshal(w)
		gj, _ := json.Marshal(g)
		if string(wj) != string(gj) {
			t.Errorf("%s: the laps changed\n got  %s\n want %s", k, gj, wj)
		}
	}
	for k := range got {
		if _, ok := want[k]; !ok {
			t.Errorf("%s: a drive the golden file does not have (rewrite it with -update-golden)", k)
		}
	}
	// the laps the coach's golden test reads are the clean drive's, as recorded now
	lb, _ := json.Marshal(shared)
	if old, err := os.ReadFile(lp); err != nil || string(old) != string(lb)+"\n" {
		t.Errorf("%s is not the clean drive's laps as recorded now (rewrite it with -update-golden)", lp)
	}
}
