package main

import "testing"

// two corners 300 m apart taken with a part throttle (50 %) between them are two braking zones, as in
// pitwall-analysis.js: the second braking point was swallowed by the first zone before
func TestBrakeZonesCloseCorners(t *testing.T) {
	var s []*lapPt
	add := func(n int, v0, v1, thr, brk float64) {
		for k := 0; k < n; k++ {
			v := v0 + (v1-v0)*float64(k)/float64(n)
			p := lapPt{v, 0, thr, brk, 3, 0, 0}
			s = append(s, &p)
		}
	}
	add(40, 70, 70, 1, 0)  // flat out
	add(20, 70, 30, 0, .9) // the first corner's braking
	add(30, 30, 45, .5, 0) // a part throttle to the next one
	add(15, 45, 25, 0, .8) // the second corner's braking
	add(40, 25, 70, 1, 0)  // out of it
	z := brakeZones(s)
	if len(z) != 2 {
		t.Fatalf("%d braking zones, want 2: %+v", len(z), z)
	}
	if z[0].i != 40 || z[1].i != 90 {
		t.Errorf("zones start at %d and %d, want 40 and 90", z[0].i, z[1].i)
	}
}
