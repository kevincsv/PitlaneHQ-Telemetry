package main

import "sync"

// lapFeed: every telemetry frame the game wrote, as the lap recorder's values (lapVars), in the order they came. The
// reader pushes each new frame as it copies it (at the game's own rate, 60 a second in iRacing) and the lap recorder
// drains them all, so a moment when the recorder is late (the PC busy, the garbage collector, a slow disk, the live
// link to a phone) never leaves a hole in a lap: the frames wait here, up to lapFeedMax of them.
type lapFeed struct {
	mu   sync.Mutex
	q    [][]float64
	free [][]float64
	lost int // frames dropped because the recorder was away longer than the queue holds
}

const lapFeedMax = 300 // five seconds of frames at 60 a second

var lapQ lapFeed

// pushLocked: the frame in tel.buf, read with the telemetry's lock held (the reader holds it as it copies the frame)
func (f *lapFeed) pushLocked() {
	f.mu.Lock()
	defer f.mu.Unlock()
	var v []float64
	if n := len(f.free); n > 0 {
		v, f.free = f.free[n-1], f.free[:n-1]
	}
	v = telNumsLockedInto(v, lapVars)
	if len(f.q) >= lapFeedMax {
		f.free = append(f.free, f.q[0])
		f.q = f.q[1:]
		f.lost++
	}
	f.q = append(f.q, v)
}

// drain hands every waiting frame to fn, oldest first, and keeps their storage for the next frames
func (f *lapFeed) drain(fn func(v []float64)) int {
	f.mu.Lock()
	q := f.q
	f.q = nil
	f.mu.Unlock()
	for _, v := range q {
		fn(v)
	}
	f.mu.Lock()
	f.free = append(f.free, q...)
	if len(f.free) > lapFeedMax {
		f.free = f.free[:lapFeedMax]
	}
	f.mu.Unlock()
	return len(q)
}

// reset: the game is gone; the frames of before never reach a lap of the next session
func (f *lapFeed) reset() {
	f.mu.Lock()
	f.free = append(f.free, f.q...)
	f.q = nil
	f.mu.Unlock()
}

// telNumsLockedInto is telNumsInto for a caller that already holds tel.mu
func telNumsLockedInto(dst []float64, names []string) []float64 {
	if cap(dst) < len(names) {
		dst = make([]float64, len(names))
	}
	out := dst[:len(names)]
	clear(out)
	if len(tel.buf) == 0 {
		return out
	}
	for k, n := range names {
		i, ok := tel.index[n]
		if !ok {
			continue
		}
		v := tel.vars[i]
		if v.typ == TypeChar || v.Count != 1 || v.offset+typeSize[v.typ]*v.Count > len(tel.buf) {
			continue
		}
		out[k] = decodeNum(v.typ, tel.buf, v.offset)
	}
	return out
}
