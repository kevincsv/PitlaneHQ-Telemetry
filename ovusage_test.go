package main

import (
	"reflect"
	"testing"
)

func TestOverlayUsageMinutes(t *testing.T) {
	if ovUseBody(nil) != nil {
		t.Fatal("nothing counted sends nothing")
	}
	var m map[string]int
	m = ovUseAdd(m, []string{"relative", "radar"})
	m = ovUseAdd(m, []string{"relative", "*", "Bad Name", ""})
	if !reflect.DeepEqual(m, map[string]int{"relative": 2, "radar": 1}) {
		t.Fatalf("minutes: %v", m)
	}
	b := ovUseBody(m)
	if b["device"] != "pc" || b["ms"] != 0 {
		t.Fatalf("batch: %v", b)
	}
	if c := b["counts"].(map[string]int); !reflect.DeepEqual(c, map[string]int{"ov:relative": 2, "ov:radar": 1}) {
		t.Fatalf("counts: %v", c)
	}
}

func TestAgentUsageOnceADay(t *testing.T) {
	if agentUseBody("2026-11-15", "2026-11-15", true) != nil || agentUseBody("", "", true) != nil {
		t.Fatal("a day that went already sends nothing")
	}
	b := agentUseBody("2026-11-16", "2026-11-15", true)
	if c := b["counts"].(map[string]int); !reflect.DeepEqual(c, map[string]int{"run:agent": 1, "set:autostart.on": 1}) || b["device"] != "pc" {
		t.Fatalf("counts: %v", b)
	}
	if c := agentUseBody("2026-11-16", "", false)["counts"].(map[string]int); c["set:autostart.off"] != 1 || c["set:autostart.on"] != 0 {
		t.Fatalf("off: %v", c)
	}
}
