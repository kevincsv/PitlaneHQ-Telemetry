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
