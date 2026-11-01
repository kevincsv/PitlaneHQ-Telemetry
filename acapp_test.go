package main

import (
	"bytes"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestACIniActivate(t *testing.T) {
	for _, c := range []struct {
		in, want string
		on       bool
	}{
		{"", "[PITLANEHQ]\r\nACTIVE=1\r\n", false},
		{"[HELICORSA]\nACTIVE=1\n", "[HELICORSA]\nACTIVE=1\n\n[PITLANEHQ]\nACTIVE=1\n", false},
		{"[PITLANEHQ]\r\nACTIVE=0\r\n[OTHER]\r\nACTIVE=1\r\n", "[PITLANEHQ]\r\nACTIVE=1\r\n[OTHER]\r\nACTIVE=1\r\n", false},
		{"[pitlanehq]\nACTIVE = 1\n", "[pitlanehq]\nACTIVE = 1\n", true},
		{"[PITLANEHQ]\n[OTHER]\nACTIVE=0\n", "[PITLANEHQ]\nACTIVE=1\n[OTHER]\nACTIVE=0\n", false},
	} {
		got, on := acIniActivate(c.in)
		if got != c.want || on != c.on {
			t.Errorf("acIniActivate(%q) = %q %v, want %q %v", c.in, got, on, c.want, c.on)
		}
	}
}

func TestACAppInstall(t *testing.T) {
	root, docs := t.TempDir(), t.TempDir()
	ini := filepath.Join(docs, "cfg", "python.ini")
	os.MkdirAll(filepath.Dir(ini), 0o755)
	changed, err := acAppInstall(root, []string{filepath.Join(docs, "nope", "python.ini"), ini})
	if err != nil || !changed {
		t.Fatalf("first install: %v %v", changed, err)
	}
	if b, _ := os.ReadFile(filepath.Join(root, "apps", "python", "PitlaneHQ", "PitlaneHQ.py")); !bytes.Equal(b, acAppPy) || !bytes.Contains(b, []byte("def acUpdate")) {
		t.Error("the app is not in the game's folder")
	}
	if b, _ := os.ReadFile(ini); !strings.Contains(string(b), "[PITLANEHQ]") {
		t.Errorf("python.ini %q", b)
	}
	if changed, _ = acAppInstall(root, []string{ini}); changed {
		t.Error("installed again with nothing to change")
	}
	if _, err := acAppInstall("", nil); err == nil {
		t.Error("no folder, no error")
	}
}

const acTestField = "PHQ1\t42\n0\tDriver One\tks_porsche_911_gt3_r_2016\t2\t3\t0.50000\t108400\t107900\t0\t0.00\t0.00\n" +
	"1\tAna Lopez\tks_ferrari_488_gt3\t1\t3\t0.52000\t107500\t107100\t0\t3.00\t0.00\n" +
	"3\tCy Berg\tbmw_m3_e30\t4\t2\t0.90000\t0\t0\t1\t0.00\t-800.00\n"

func TestParseACField(t *testing.T) {
	now := time.Now()
	f, cars, ok := parseACField([]byte(acTestField), now)
	if !ok || len(cars) != 3 || !f.fromAC || cars[1].x != 3 || cars[2].z != -800 {
		t.Fatalf("cars %v ok %v", cars, ok)
	}
	if c := f.cars[1]; c.pos != 1 || c.laps != 3 || c.best != 107100 || math.Abs(c.spline-0.52) > 1e-9 {
		t.Errorf("car 1 = %+v", c)
	}
	if c := f.cars[3]; c.loc != 2 || c.best != -1 || c.last != -1 {
		t.Errorf("car 3 = %+v", c)
	}
	if n, cls := f.entries[1].modelClass(); n != "Ks Ferrari 488 Gt3" || cls != "Assetto Corsa" || f.entries[1].driver().first != "Ana Lopez" {
		t.Errorf("entry 1 = %+v %s %s", f.entries[1], n, cls)
	}
	if _, _, ok := parseACField([]byte("hello\n1\t2"), now); ok {
		t.Error("not a field file")
	}
	f2, _, _ := parseACField([]byte(acTestField), now)
	if f2.ver != f.ver {
		t.Error("the same drivers give another version")
	}
}

// Assetto Corsa with Pitlane HQ's app: the other cars in the relative, standings and radar
func TestACConversionWithField(t *testing.T) {
	p, g, st := fakeACC()
	i32 := func(b []byte, o, v int) { b[o], b[o+1], b[o+2], b[o+3] = byte(v), byte(v>>8), byte(v>>16), byte(v>>24) }
	i32(g, acg_acc_session_type, 2) // race
	d := t.TempDir()
	path := filepath.Join(d, "field.txt")
	os.WriteFile(path, []byte(acTestField), 0o644)
	s := &acSource{img: newIRImage(acVarDefs()), lastLaps: -1, af: &acFieldFile{path: path}}
	for k := 0; k < acPathBins; k++ {
		s.path[k], s.pathOK[k] = [2]float64{0, -float64(k-500) * 5.793}, true
	}
	s.prev, s.fwd = [2]float64{0, 1}, [2]float64{0, -1}
	if !s.convert(p, g, st) {
		t.Fatal("no session")
	}
	h, _ := readHeader(s.img.mem)
	vars, _ := readVarHeaders(s.img.mem, h)
	idx := map[string]int{}
	for k, v := range vars {
		idx[v.Name] = k
	}
	_, buf, _ := latestBuffer(s.img.mem, nil)
	arr := func(n string) []any { a, _ := decodeValues(vars, buf, []int{idx[n]})[0].([]any); return a }
	if a := arr("CarIdxPosition"); toF(a[0]) != 2 || toF(a[1]) != 1 {
		t.Errorf("positions %v", a[:4])
	}
	if a := arr("CarIdxLapDistPct"); math.Abs(toF(a[1])-0.52) > 0.001 {
		t.Errorf("car 1 on the lap %v", a[1])
	}
	cl := toF(decodeValues(vars, buf, []int{idx["CarLeftRight"]})[0])
	if cl != 2 && cl != 3 {
		t.Errorf("CarLeftRight = %v, want the car 3 m to the side", cl)
	}
	y := readSessionInfo(s.img.mem, h)
	for _, want := range []string{"UserName: Ana Lopez", "CarScreenName: Ks Ferrari 488 Gt3", "Game: Assetto Corsa", "SessionType: Race", "UserName: Cy Berg"} {
		if !strings.Contains(y, want) {
			t.Errorf("session lacks %q", want)
		}
	}
	if s.afSt != "on" {
		t.Errorf("status %q", s.afSt)
	}
}
