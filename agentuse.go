package main

import (
	"os"
	"path/filepath"
	"strings"
	"time"
)

// The days the agent runs and whether it starts with Windows (the admin page's Analytics): once a day the agent says
// "run:agent" and "set:autostart.on" or "set:autostart.off" with the usage counter (POST /community/usage, device pc,
// usagelib.js). The day sent is remembered in the data folder, so starting the agent again the same day counts once.
// Like the overlays' minutes: never for an admin, never when signed out (tried again at the next flush).

func agentUsePath() string { return filepath.Join(dataDir(), "usage-day.txt") }

// agentUseBody is the batch of a day; nil when that day went already.
func agentUseBody(day, sent string, autostart bool) map[string]any {
	if day == "" || day == sent {
		return nil
	}
	set := "set:autostart.off"
	if autostart {
		set = "set:autostart.on"
	}
	return map[string]any{"device": "pc", "v": appVersion, "counts": map[string]int{"run:agent": 1, set: 1}, "ms": 0}
}

func agentUseFlush() {
	if !accountSignedIn() || realAdminSigned() {
		return
	}
	day := time.Now().UTC().Format("2006-01-02")
	b, _ := os.ReadFile(agentUsePath())
	cfgMu.Lock()
	auto := cfg.StartWithWindows
	cfgMu.Unlock()
	body := agentUseBody(day, strings.TrimSpace(string(b)), auto)
	if body == nil {
		return
	}
	if _, err := commCall("POST", "/usage", body, true); err == nil {
		os.WriteFile(agentUsePath(), []byte(day), 0o600)
	}
}
