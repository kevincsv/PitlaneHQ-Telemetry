package main

// "Watch in replay" (in development: testers and admins in admin mode, wipOpen): the coach, the lap screen and the phones
// ask iRacing to seek its replay to a moment of a lap (iRacing's broadcast message ReplaySearchSessionTime) and play it.
// A lap carries the session time it started at (st), so a point of the lap is st plus the lap time at that point. It
// works while the session is open in iRacing or its saved replay is loaded; the page asks /api/replay first to show the
// button only when iRacing runs.

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"regexp"
	"strconv"
)

var replaySesRe = regexp.MustCompile(`-(\d+)$`)

// replaySessionNum: the session number at the end of a session id ("ir-123-2" is 2), -1 when it has none
func replaySessionNum(id string) int {
	m := replaySesRe.FindStringSubmatch(id)
	if m == nil {
		return -1
	}
	n, err := strconv.Atoi(m[1])
	if err != nil {
		return -1
	}
	return n
}

// replayJump: seeks iRacing's replay to t seconds of session num (3 s earlier, to see the moment coming) and plays it
func replayJump(num int, t float64) error {
	if !wipOpen() {
		return errors.New("not available")
	}
	if num < 0 || t < 0 || t > 3600*48 {
		return errors.New("bad moment")
	}
	ms := int((t - 3) * 1000)
	if ms < 0 {
		ms = 0
	}
	return irReplaySeek(num, ms)
}

func registerReplayRoute(mux *http.ServeMux) {
	mux.HandleFunc("/api/replay", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, map[string]bool{"on": wipOpen() && irReplayReady()})
			return
		}
		var in struct {
			Session string  `json:"session"`
			T       float64 `json:"t"`
		}
		if json.NewDecoder(io.LimitReader(r.Body, 1<<10)).Decode(&in) != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		if err := replayJump(replaySessionNum(in.Session), in.T); err != nil {
			writeJSON(w, map[string]any{"ok": false, "error": err.Error()})
			return
		}
		writeJSON(w, map[string]bool{"ok": true})
	})
}
