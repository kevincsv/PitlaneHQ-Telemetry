package main

import (
	"encoding/binary"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func (w *accW) u16(v int) { binary.Write(&w.Buffer, binary.LittleEndian, uint16(v)) }
func (w *accW) f32(v float64) {
	binary.Write(&w.Buffer, binary.LittleEndian, math.Float32frombits(math.Float32bits(float32(v))))
}
func (w *accW) lap(ms int) {
	w.i32(ms)
	w.u16(0)
	w.u16(0)
	w.u8(3) // three splits
	w.i32(30000)
	w.i32(40000)
	w.i32(math.MaxInt32)
	w.u8(0)
	w.u8(1)
	w.u8(0)
	w.u8(0)
}

func accTestCar(id, pos, laps int, spline float64, loc, best, last int) []byte {
	var w accW
	w.u8(accMsgCar)
	w.u16(id)
	w.u16(0)
	w.u8(1)
	w.u8(6) // 4th gear
	w.f32(10)
	w.f32(20)
	w.f32(0)
	w.u8(loc)
	w.u16(210)
	w.u16(pos)
	w.u16(pos)
	w.u16(pos)
	w.f32(spline)
	w.u16(laps)
	w.i32(-150)
	w.lap(best)
	w.lap(last)
	w.lap(41250)
	return w.Bytes()
}

func accTestEntry(id, model, num int, first, last, short, team string) []byte {
	var w accW
	w.u8(accMsgEntryCar)
	w.u16(id)
	w.u8(model)
	w.str(team)
	w.i32(num)
	w.u8(0)
	w.u8(0)
	w.u16(0)
	w.u8(1)
	w.str(first)
	w.str(last)
	w.str(short)
	w.u8(0)
	w.u16(0)
	return w.Bytes()
}

// the messages the game sends after Pitlane HQ registers, read into the field
func accTestField(t *testing.T, now time.Time) *accBcast {
	b := &accBcast{}
	var reg accW
	reg.u8(accMsgRegistration)
	reg.i32(7)
	reg.u8(1)
	reg.u8(0)
	reg.str("")
	ok, ask, err := b.handle(reg.Bytes(), now)
	if err != nil || !ok || ask != "entries" || b.connID != 7 {
		t.Fatalf("registration: ok %v ask %q err %v id %d", ok, ask, err, b.connID)
	}
	var el accW
	el.u8(accMsgEntryList)
	el.i32(7)
	el.u16(3)
	for _, id := range []int{12, 33, 7} {
		el.u16(id)
	}
	var rt accW
	rt.u8(accMsgRealtime)
	rt.u16(0)
	rt.u16(2)
	rt.u8(10) // race
	rt.u8(5)
	for _, m := range [][]byte{el.Bytes(), accTestEntry(12, 23, 912, "Driver", "", "DRI", "Team A"),
		accTestEntry(33, 50, 33, "Ana", "Lopez", "LOP", "Alpine Team"), accTestEntry(7, 30, 7, "Bo", "Berg", "BER", ""),
		accTestCar(12, 3, 3, 0.5, 1, 107900, 108400), accTestCar(33, 4, 3, 0.499, 1, 115100, 115900), accTestCar(7, 1, 4, 0.12, 2, 107100, 107500),
		rt.Bytes()} {
		if _, _, err := b.handle(m, now); err != nil {
			t.Fatal(err)
		}
	}
	return b
}

func TestACCBroadcastMessages(t *testing.T) {
	now := time.Now()
	b := accTestField(t, now)
	f, ok := b.snapshot(now)
	if !ok || len(f.cars) != 3 || len(f.entries) != 3 || f.sessType != 10 {
		t.Fatalf("field: ok %v cars %d entries %d type %d", ok, len(f.cars), len(f.entries), f.sessType)
	}
	c := f.cars[7]
	if c.pos != 1 || c.laps != 4 || c.best != 107100 || c.last != 107500 || c.loc != 2 || c.gear != 4 || math.Abs(c.spline-0.12) > 1e-6 {
		t.Errorf("car 7 = %+v", c)
	}
	if d := f.entries[33].driver(); d.first != "Ana" || d.last != "Lopez" || f.entries[33].num != 33 {
		t.Errorf("entry 33 = %+v", f.entries[33])
	}
	if _, ok := b.snapshot(now.Add(5 * time.Second)); ok {
		t.Error("a field the game stopped sending still counts")
	}
	// a short message never panics nor counts
	for _, m := range [][]byte{{accMsgCar, 1}, {accMsgEntryCar, 1, 0, 3}, {accMsgRegistration}} {
		b.handle(m, now)
	}
	// a car the entry list does not have asks for it again
	_, ask, _ := b.handle(accTestCar(99, 5, 1, 0.3, 1, -1, -1), now.Add(2*time.Second))
	if ask != "entries" {
		t.Errorf("a new car asks %q", ask)
	}
	var w accW
	w.u8(accMsgRegistration)
	w.i32(-1)
	w.u8(0)
	w.u8(0)
	w.str("wrong password")
	if _, _, err := b.handle(w.Bytes(), now); err == nil || !strings.Contains(err.Error(), "wrong password") {
		t.Errorf("a refused registration: %v", err)
	}
	if reg := accRegisterMsg("Pitlane HQ", "asd", 100, ""); reg[0] != 1 || reg[1] != accBcastProto || len(reg) != 2+2+10+2+3+4+2 {
		t.Errorf("register message % x", reg)
	}
}

// the other drivers of ACC: names, cars, classes, positions and laps in the image
func TestACCConversionWithBroadcast(t *testing.T) {
	p, g, st := fakeACC()
	s := &acSource{acc: true, img: newIRImage(acVarDefs()), lastLaps: -1}
	for k := 0; k < acPathBins; k++ {
		s.path[k], s.pathOK[k] = [2]float64{0, -float64(k-500) * 5.793}, true
	}
	s.prev, s.fwd = [2]float64{0, 1}, [2]float64{0, -1}
	s.bc = accTestField(t, time.Now())
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
	// cars in the shared memory's order: 12 (you), 33, 7
	for n, want := range map[string][]float64{"CarIdxPosition": {3, 4, 1}, "CarIdxClassPosition": {2, 1, 1}, "CarIdxLapCompleted": {3, 3, 4},
		"CarIdxBestLapTime": {107.9, 115.1, 107.1}, "CarIdxOnPitRoad": {0, 0, 1}, "CarIdxLapDistPct": {0.5, 0.499, 0.12}} {
		a := arr(n)
		for i, w := range want {
			if i >= len(a) || math.Abs(toF(a[i])-w) > 0.002 {
				t.Errorf("%s[%d] = %v, want %v", n, i, a, w)
				break
			}
		}
	}
	// the leader is 0.62 laps ahead of you: about 0.62 of your best lap
	if f2 := toF(arr("CarIdxF2Time")[0]); math.Abs(f2-0.62*107.9) > 0.5 {
		t.Errorf("gap to the leader %v", f2)
	}
	y := readSessionInfo(s.img.mem, h)
	for _, want := range []string{"UserName: Ana Lopez", "CarScreenName: Alpine A110 GT4", "CarClassShortName: GT4", "UserName: Bo Berg",
		"CarScreenName: BMW M4 GT3", "CarNumber: \"33\"", "TeamName: Alpine Team", "NumCarClasses: 2", "SessionType: Race",
		"CarScreenName: Porsche 991ii Gt3 R"} {
		if !strings.Contains(y, want) {
			t.Errorf("session lacks %q", want)
		}
	}
}

func TestACCSessionType(t *testing.T) {
	for _, c := range []struct {
		b    int
		from bool
		shm  int
		want string
	}{{10, true, 0, "Race"}, {4, true, 2, "Qualify"}, {0, true, 2, "Practice"}, {0, false, 2, "Race"}, {0, false, 1, "Qualify"}, {0, false, 3, "Practice"}} {
		if got := accSessionType(c.b, c.from, c.shm); got != c.want {
			t.Errorf("accSessionType(%d,%v,%d) = %s, want %s", c.b, c.from, c.shm, got, c.want)
		}
	}
}

// broadcasting.json: a file with no port gets 9000, in the game's own UTF-16, and the rest kept
func TestACCBroadcastSetup(t *testing.T) {
	d := t.TempDir()
	p := filepath.Join(d, "broadcasting.json")
	os.WriteFile(p, accEncodeText(`{"updListenerPort": 0, "connectionPassword": "", "commandPassword": "x"}`, true), 0o644)
	cfg, wrote, err := accBcastSetup([]string{filepath.Join(d, "none.json"), p})
	if err != nil || !wrote || cfg.Port != 9000 || cfg.Password != "asd" || cfg.Command != "x" {
		t.Fatalf("setup: %+v wrote %v err %v", cfg, wrote, err)
	}
	raw, _ := os.ReadFile(p)
	txt, wide := accDecodeText(raw)
	if !wide || !strings.Contains(txt, `"updListenerPort": 9000`) || !strings.Contains(txt, `"commandPassword": "x"`) {
		t.Errorf("written: wide %v %s", wide, txt)
	}
	cfg, wrote, _ = accBcastSetup([]string{p})
	if wrote || cfg.Port != 9000 {
		t.Errorf("a set port is written again: %+v %v", cfg, wrote)
	}
	os.WriteFile(p, []byte(`{"updListenerPort": 9232, "connectionPassword": "pw", "commandPassword": ""}`), 0o644)
	if cfg, wrote, _ = accBcastSetup([]string{p}); wrote || cfg.Port != 9232 || cfg.Password != "pw" {
		t.Errorf("the driver's own port: %+v %v", cfg, wrote)
	}
	if cfg, wrote, _ = accBcastSetup([]string{filepath.Join(d, "none.json")}); wrote || cfg.Port != 9000 || cfg.Password != "asd" {
		t.Errorf("no file: %+v %v", cfg, wrote)
	}
}
