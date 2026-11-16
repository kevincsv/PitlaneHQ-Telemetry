package main

import (
	"sort"
	"sync"
	"time"
)

// Which overlays the drivers use (the admin page's Analytics, "Overlays"): once a minute, while the driver is in the
// car in a real session, each native overlay open counts one minute; every ten minutes the minutes go to the server
// with the usage counter (POST /community/usage, device pc, keys "ov:<overlay>", usage.js). Never in demo data, never
// for an admin (as the page's own counter), never when signed out (the minutes are dropped).

var ovUse = struct {
	sync.Mutex
	m map[string]int
}{}

// ovUseAdd counts one minute for each overlay open now; names that are not overlays are left out.
func ovUseAdd(m map[string]int, open []string) map[string]int {
	for _, n := range open {
		if !widgetRe.MatchString(n) || n == "*" {
			continue
		}
		if m == nil {
			m = map[string]int{}
		}
		m[n]++
	}
	return m
}

// ovUseBody is the usage batch for the minutes counted; nil when there is nothing to send.
func ovUseBody(m map[string]int) map[string]any {
	if len(m) == 0 {
		return nil
	}
	names := make([]string, 0, len(m))
	for n := range m {
		names = append(names, n)
	}
	sort.Strings(names)
	counts := map[string]int{}
	for _, n := range names {
		if len(counts) >= 30 {
			break
		}
		counts["ov:"+n] = m[n]
	}
	return map[string]any{"device": "pc", "v": appVersion, "counts": counts, "ms": 0}
}

func ovUsageWatcher() {
	tick := 0
	for range time.Tick(time.Minute) {
		tick++
		st := currentStatus()
		if inCar, _ := telBool("IsOnTrack"); st.connected() && inCar && !st.Demo && !tel.isDemo() {
			if open := listOverlays(); len(open) > 0 {
				ovUse.Lock()
				ovUse.m = ovUseAdd(ovUse.m, open)
				ovUse.Unlock()
			}
		}
		if tick%10 == 0 {
			ovUseFlush()
		}
		if tick%10 == 2 {
			agentUseFlush() // two minutes after starting, then every ten: the day counts once (agentuse.go)
		}
	}
}

// ovUseFlush sends the minutes counted so far (and forgets them, sent or not).
func ovUseFlush() {
	ovUse.Lock()
	m := ovUse.m
	ovUse.m = nil
	ovUse.Unlock()
	body := ovUseBody(m)
	if body == nil || !accountSignedIn() || realAdminSigned() {
		return
	}
	commCall("POST", "/usage", body, true)
}
