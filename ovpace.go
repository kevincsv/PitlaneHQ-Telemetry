package main

// When an overlay window draws and hands its picture to Windows. Every UpdateLayeredWindow makes Windows compose
// the overlay over the game again, and a window of the full size pushed 30 or 60 times a second by each overlay,
// even when nothing on it changed, is work taken from the game (and stutter over a full-screen one). So: a frame
// with the same values as the last one, the same settings and a picture that did not move needs no new draw (it is
// still drawn now and then, for what an overlay shows by the clock: a flag's few seconds, the data going stale), a
// picture the same as the one on the screen is not pushed again, and with the car out of the track (garage, menus,
// no game) an overlay draws a few times a second; back on the track it is at once at its full rate again. What is
// drawn is the same picture as before for the same values: only the frames that would be the same are skipped.

import (
	"bytes"
	"time"
	"unsafe"
)

const (
	ovStillGap   = 100 * time.Millisecond // a still picture is drawn again this often on the track
	ovOffGap     = 250 * time.Millisecond // and off it (garage, menus, no game): four times a second
	ovDefaultFPS = 30                     // the overlays' frame rate (Overlays → Frame rate), the radar's is twice it
)

// ovPace remembers what the window drew last
type ovPace struct {
	drawn          bool
	dataSeq        uint64
	cfgSeq         uint64
	at             time.Time
	still          bool // the last draw gave the same picture as the one before it
	w, h           int
	offTrackBefore bool
}

// due: whether the window draws at this tick of its timer; st.mu is not held
func (p *ovPace) due(st *ovState, w, h int, now time.Time) bool {
	st.mu.Lock()
	ds, cs, edit := st.dataSeq, st.cfgSeq, st.edit
	on, known := st.num("IsOnTrack")
	fresh := now.Sub(st.at) < 2*time.Second
	st.mu.Unlock()
	off := !fresh || (known && on == 0)
	switch {
	case !p.drawn || edit || w != p.w || h != p.h || cs != p.cfgSeq:
		return true // the first picture, the overlays being moved, another size, other settings or session
	case off && !p.offTrackBefore:
		return true // the car has just left the track: one picture of that at once
	case off:
		return now.Sub(p.at) >= ovOffGap
	case p.offTrackBefore:
		return true // back on the track: the full rate at once
	case ds != p.dataSeq || !p.still:
		return true // new values, or a picture still moving
	}
	return now.Sub(p.at) >= ovStillGap
}

// done notes a draw: the inputs it had and whether its picture is the one before
func (p *ovPace) done(st *ovState, w, h int, now time.Time, same bool) {
	st.mu.Lock()
	p.dataSeq, p.cfgSeq = st.dataSeq, st.cfgSeq
	on, known := st.num("IsOnTrack")
	fresh := now.Sub(st.at) < 2*time.Second
	st.mu.Unlock()
	p.drawn, p.at, p.still, p.w, p.h = true, now, same, w, h
	p.offTrackBefore = !fresh || (known && on == 0)
}

// ovFPS: an overlay's own frame rate (its settings → Look, ui.<overlay>.fps, 10 to 60), else the old one for all of
// them (ui.ovfps, from before each overlay had its own); 0 is the default. own says it is the overlay's own.
func ovFPS(name string, ui map[string]any) (fps int, own bool) {
	if m, ok := ui[name].(map[string]any); ok {
		if v, ok := m["fps"].(float64); ok && v >= 10 && v <= 60 {
			return int(v), true
		}
	}
	if v, ok := ui["ovfps"].(float64); ok && v >= 10 && v <= 60 {
		return int(v), false
	}
	return 0, false
}

// ovTimerMs: the window's timer for its frame rate: the default 30 a second (the radar every sample the game gives,
// 60; the standings 10); an overlay's own rate up to 60 as chosen; the old rate for all of them never above the
// default (the radar at twice it, the standings never faster than 10 a second, as it always was)
func ovTimerMs(name string, ui map[string]any) uintptr {
	fps, own := ovFPS(name, ui)
	if own {
		if name == "radar" && fps >= ovDefaultFPS {
			return 16
		}
		return uintptr(max(16, 1000/fps))
	}
	if fps == 0 || fps > ovDefaultFPS {
		fps = ovDefaultFPS
	}
	switch name {
	case "radar":
		if fps >= ovDefaultFPS {
			return 16
		}
		return uintptr(1000 / (2 * fps))
	case "standings":
		return uintptr(max(100, 1000/fps))
	}
	if fps >= ovDefaultFPS {
		return 33
	}
	return uintptr(1000 / fps)
}

// ovStreamHz: the samples a second an overlay asks the stream for: 60 for the radar and an overlay set above 30
func ovStreamHz(name string, ui map[string]any) int {
	if fps, own := ovFPS(name, ui); name == "radar" || (own && fps > ovDefaultFPS) {
		return 60
	}
	return 30
}

// ovWithOnTrack: an overlay's values plus IsOnTrack, which paces it
func ovWithOnTrack(v []string) []string {
	for _, n := range v {
		if n == "IsOnTrack" {
			return v
		}
	}
	return append(v, "IsOnTrack")
}

// samePixels: two pictures alike, compared as bytes (memequal)
func samePixels(a, b []uint32) bool {
	if len(a) != len(b) {
		return false
	}
	if len(a) == 0 {
		return true
	}
	return bytes.Equal(unsafe.Slice((*byte)(unsafe.Pointer(&a[0])), len(a)*4), unsafe.Slice((*byte)(unsafe.Pointer(&b[0])), len(b)*4))
}
