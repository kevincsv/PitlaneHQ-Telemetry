package main

import "testing"

func TestReplaySessionNum(t *testing.T) {
	for id, want := range map[string]int{"ir-123456-2": 2, "ir-9-0": 0, "lmu-x": -1, "": -1} {
		if got := replaySessionNum(id); got != want {
			t.Fatalf("%q: %d", id, got)
		}
	}
	if replayJump(1, 10) == nil {
		t.Fatal("the jump needs a tester or admin mode")
	}
}
