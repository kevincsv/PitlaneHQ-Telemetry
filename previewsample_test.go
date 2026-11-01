package main

import (
	"strings"
	"testing"
)

func TestPreviewNamesFromIndex(t *testing.T) {
	n := previewVarNames()
	if len(n) < 20 {
		t.Fatalf("LIVE_VARS not found in index.html (%d names)", len(n))
	}
	has := map[string]bool{}
	for _, x := range n {
		if has[x] {
			t.Fatalf("%s twice", x)
		}
		has[x] = true
	}
	for _, x := range []string{"Speed", "CarIdxLapDistPct", "LFtempCM", "PlayerTireCompound", "IsReplayPlaying"} {
		if !has[x] {
			t.Errorf("%s missing", x)
		}
	}
}

func TestPreviewAnon(t *testing.T) {
	y := `WeekendInfo:
 TrackName: spa
 SubSessionID: 81234567
 SessionID: 2345
DriverInfo:
 DriverCarIdx: 1
 DriverUserID: 4242
 Drivers:
 - CarIdx: 0
   UserName: Jane Real
   AbbrevName: Real, J
   Initials: JR
   UserID: 111
   TeamName: Jane Real
   CarNumber: "44"
   CarNumberRaw: 44
   IRating: 2412
   LicString: A 3.41
   CarDesignStr: 1,ff0000,000000
   ClubName: Iberia
   FlairName: Spain
 - CarIdx: 1
   UserName: John Doe
   UserID: 222
`
	a := previewAnon(y)
	for _, bad := range []string{"Jane", "Real", "John", "Doe", "111", "222", "4242", "81234567", "Iberia", "Spain", "ff0000", "\"44\""} {
		if strings.Contains(a, bad) {
			t.Errorf("%q still in the sample:\n%s", bad, a)
		}
	}
	for _, keep := range []string{"TrackName: spa", "UserName: Driver 1", "UserName: Driver 2", "IRating: 2412", "LicString: A 3.41", "DriverCarIdx: 1"} {
		if !strings.Contains(a, keep) {
			t.Errorf("%q lost:\n%s", keep, a)
		}
	}
}
