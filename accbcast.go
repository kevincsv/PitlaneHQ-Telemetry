package main

// Assetto Corsa Competizione's broadcasting API: a UDP connection to the game (127.0.0.1, the port and password of
// Documents\Assetto Corsa Competizione\Config\broadcasting.json) that says, for every car, who drives it, its car,
// race number, position, laps, last and best lap and whether it is in the pit lane. The shared memory (ac.go) has none
// of that for the other cars. ACC reads broadcasting.json when it starts: when the file has no port (0), Pitlane HQ
// writes 9000 and the game picks it up the next time it starts. Protocol: Kunos' broadcasting SDK, version 4.

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
	"log"
	"math"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
	"unicode/utf16"
)

const accBcastProto = 4

// what the game sends
const (
	accMsgRegistration = 1
	accMsgRealtime     = 2
	accMsgCar          = 3
	accMsgEntryList    = 4
	accMsgTrack        = 5
	accMsgEntryCar     = 6
	accMsgEvent        = 7
)

type accDriver struct{ first, last, short string }

type accEntry struct {
	model, num, cup, cur int
	team                 string
	drivers              []accDriver
	carName              string // Assetto Corsa's own car id (its in-game app, acapp.go); ACC says the model
}

// the car's name and class: ACC's model table, or Assetto Corsa's car id (one class, the game's)
func (e accEntry) modelClass() (string, string) {
	if e.carName != "" {
		return acPretty(e.carName), "Assetto Corsa"
	}
	return accModel(e.model)
}

func (e accEntry) driver() accDriver {
	if len(e.drivers) == 0 {
		return accDriver{}
	}
	if e.cur >= 0 && e.cur < len(e.drivers) {
		return e.drivers[e.cur]
	}
	return e.drivers[0]
}

type accCar struct {
	idx, drv, gear, loc, kmh int
	pos, cupPos, trackPos    int
	spline                   float64
	laps                     int
	best, last, cur          int // ms, -1 when none
	lastInvalid, curInvalid  bool
	at                       time.Time
}

// accField is what the broadcasting API said last: the cars by the game's car index (the same index as the shared
// memory's carID), the session type and phase
type accField struct {
	cars     map[int]accCar
	entries  map[int]accEntry
	sessType int
	phase    int
	ver      int // grows when the entry list changes (names, cars)
	at       time.Time
	fromAC   bool // from Assetto Corsa's in-game app: the session type is the shared memory's
}

type accBcast struct {
	mu      sync.Mutex
	f       accField
	connID  int32
	state   string // "" not connected, "on", "restart" (the port was just written: restart the game)
	lastReq time.Time
	stop    chan struct{}
	conn    *net.UDPConn
	told    string
}

// accBcastNow is what the app is told (status "bcast"): "on", "restart" or ""
var accBcastNow atomic.Value

// tell: the status the app shows changed (the game started talking, went quiet, needs a restart)
func (b *accBcast) tell() {
	st := b.status()
	if st == b.told {
		return
	}
	b.told = st
	setFieldState(st)
}

// setFieldState: what the app is told about the other cars' source (ACC's API, Assetto Corsa's app)
func setFieldState(st string) {
	accBcastNow.Store(st)
	tel.mu.Lock()
	tel.schemaVer++
	tel.mu.Unlock()
}

func accBcastState() string {
	s, _ := accBcastNow.Load().(string)
	return s
}

// ---- encoding

type accW struct{ bytes.Buffer }

func (w *accW) u8(v int)  { w.WriteByte(byte(v)) }
func (w *accW) i32(v int) { binary.Write(&w.Buffer, binary.LittleEndian, int32(v)) }
func (w *accW) str(s string) {
	binary.Write(&w.Buffer, binary.LittleEndian, uint16(len(s)))
	w.WriteString(s)
}

func accRegisterMsg(name, password string, everyMs int, cmdPassword string) []byte {
	var w accW
	w.u8(1) // REGISTER_COMMAND_APPLICATION
	w.u8(accBcastProto)
	w.str(name)
	w.str(password)
	w.i32(everyMs)
	w.str(cmdPassword)
	return w.Bytes()
}

func accConnMsg(kind int, connID int32) []byte {
	var w accW
	w.u8(kind) // 9 unregister, 10 entry list, 11 track data
	w.i32(int(connID))
	return w.Bytes()
}

// ---- decoding (every read past the end leaves ok false)

type accR struct {
	b  []byte
	o  int
	ok bool
}

func (r *accR) need(n int) bool {
	if !r.ok || r.o+n > len(r.b) {
		r.ok = false
		return false
	}
	return true
}
func (r *accR) u8() int {
	if !r.need(1) {
		return 0
	}
	r.o++
	return int(r.b[r.o-1])
}
func (r *accR) u16() int {
	if !r.need(2) {
		return 0
	}
	r.o += 2
	return int(binary.LittleEndian.Uint16(r.b[r.o-2:]))
}
func (r *accR) i32() int {
	if !r.need(4) {
		return 0
	}
	r.o += 4
	return int(int32(binary.LittleEndian.Uint32(r.b[r.o-4:])))
}
func (r *accR) f32() float64 {
	if !r.need(4) {
		return 0
	}
	r.o += 4
	return float64(math.Float32frombits(binary.LittleEndian.Uint32(r.b[r.o-4:])))
}
func (r *accR) str() string {
	n := r.u16()
	if !r.need(n) {
		return ""
	}
	r.o += n
	return string(r.b[r.o-n : r.o])
}

type accLap struct {
	ms      int // -1 when none
	invalid bool
}

func (r *accR) lap() accLap {
	ms := r.i32()
	r.u16() // car index
	r.u16() // driver index
	for n := r.u8(); n > 0 && r.ok; n-- {
		r.i32() // splits
	}
	inv := r.u8() != 0
	r.u8() // valid for best
	r.u8() // out lap
	r.u8() // in lap
	if ms <= 0 || ms == math.MaxInt32 {
		ms = -1
	}
	return accLap{ms, inv}
}

// handle reads one message of the game into the field. It says what to ask for next: "entries" when a car the
// entry list does not have yet shows up.
func (b *accBcast) handle(msg []byte, now time.Time) (registered bool, ask string, err error) {
	r := &accR{b: msg, ok: true}
	switch r.u8() {
	case accMsgRegistration:
		id := r.i32()
		success := r.u8() != 0
		r.u8() // read only
		e := r.str()
		if !r.ok {
			return false, "", errors.New("short registration")
		}
		if !success {
			return false, "", errors.New("ACC refused the connection: " + e)
		}
		b.mu.Lock()
		b.connID = int32(id)
		b.mu.Unlock()
		return true, "entries", nil
	case accMsgRealtime:
		r.u16() // event index
		r.u16() // session index
		st, ph := r.u8(), r.u8()
		if !r.ok {
			return false, "", nil
		}
		b.mu.Lock()
		b.f.sessType, b.f.phase, b.f.at = st, ph, now
		b.mu.Unlock()
	case accMsgCar:
		var c accCar
		c.idx, c.drv = r.u16(), r.u16()
		r.u8() // driver count
		c.gear = r.u8() - 2
		r.f32() // world x
		r.f32() // world y
		r.f32() // yaw
		c.loc = r.u8()
		c.kmh = r.u16()
		c.pos, c.cupPos, c.trackPos = r.u16(), r.u16(), r.u16()
		c.spline = r.f32()
		c.laps = r.u16()
		r.i32() // delta
		best, last, cur := r.lap(), r.lap(), r.lap()
		if !r.ok {
			return false, "", nil
		}
		c.best, c.last, c.cur, c.lastInvalid, c.curInvalid = best.ms, last.ms, cur.ms, last.invalid, cur.invalid
		c.at = now
		b.mu.Lock()
		if b.f.cars == nil {
			b.f.cars = map[int]accCar{}
		}
		b.f.cars[c.idx] = c
		b.f.at = now
		_, known := b.f.entries[c.idx]
		if !known && now.Sub(b.lastReq) > time.Second {
			b.lastReq = now
			ask = "entries"
		}
		b.mu.Unlock()
	case accMsgEntryList:
		r.i32() // connection id
		n := r.u16()
		ids := make([]int, 0, n)
		for i := 0; i < n && r.ok; i++ {
			ids = append(ids, r.u16())
		}
		if !r.ok {
			return false, "", nil
		}
		b.mu.Lock()
		keep := map[int]accEntry{}
		for _, id := range ids {
			if e, ok := b.f.entries[id]; ok {
				keep[id] = e
			}
		}
		for id := range b.f.cars {
			if _, ok := keep[id]; !ok && !accHas(ids, id) {
				delete(b.f.cars, id)
			}
		}
		b.f.entries = keep
		b.f.ver++
		b.mu.Unlock()
	case accMsgEntryCar:
		id := r.u16()
		var e accEntry
		e.model = r.u8()
		e.team = r.str()
		e.num = r.i32()
		e.cup = r.u8()
		e.cur = r.u8()
		r.u16() // nationality
		for n := r.u8(); n > 0 && r.ok; n-- {
			d := accDriver{first: r.str(), last: r.str(), short: r.str()}
			r.u8()  // category
			r.u16() // nationality
			e.drivers = append(e.drivers, d)
		}
		if !r.ok {
			return false, "", nil
		}
		b.mu.Lock()
		if b.f.entries == nil {
			b.f.entries = map[int]accEntry{}
		}
		b.f.entries[id] = e
		b.f.ver++
		b.mu.Unlock()
	}
	return false, ask, nil
}

func accHas(l []int, v int) bool {
	for _, x := range l {
		if x == v {
			return true
		}
	}
	return false
}

// snapshot: a copy of the field when the game spoke in the last 3 s (else ok is false)
func (b *accBcast) snapshot(now time.Time) (accField, bool) {
	if b == nil {
		return accField{}, false
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.f.at.IsZero() || now.Sub(b.f.at) > 3*time.Second {
		return accField{}, false
	}
	f := accField{cars: make(map[int]accCar, len(b.f.cars)), entries: make(map[int]accEntry, len(b.f.entries)), sessType: b.f.sessType, phase: b.f.phase, ver: b.f.ver, at: b.f.at}
	for k, v := range b.f.cars {
		f.cars[k] = v
	}
	for k, v := range b.f.entries {
		f.entries[k] = v
	}
	return f, true
}

func (b *accBcast) status() string {
	if b == nil {
		return ""
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if !b.f.at.IsZero() && time.Since(b.f.at) < 3*time.Second {
		return "on"
	}
	return b.state
}

// ---- broadcasting.json

type accBcastCfg struct {
	Port     int    `json:"updListenerPort"`
	Password string `json:"connectionPassword"`
	Command  string `json:"commandPassword"`
}

func accBcastPaths() []string {
	var out []string
	for _, home := range []string{os.Getenv("USERPROFILE"), os.Getenv("OneDrive")} {
		if home == "" {
			continue
		}
		for _, docs := range []string{filepath.Join(home, "Documents"), filepath.Join(home, "OneDrive", "Documents"), home} {
			out = append(out, filepath.Join(docs, "Assetto Corsa Competizione", "Config", "broadcasting.json"))
		}
	}
	return out
}

// the game writes the file in UTF-16 (with its byte order mark); older files and hand edits can be UTF-8
func accDecodeText(b []byte) (string, bool) {
	if len(b) >= 2 && b[0] == 0xff && b[1] == 0xfe {
		u := make([]uint16, 0, len(b)/2)
		for i := 2; i+1 < len(b); i += 2 {
			u = append(u, binary.LittleEndian.Uint16(b[i:]))
		}
		return string(utf16.Decode(u)), true
	}
	return string(bytes.TrimPrefix(b, []byte{0xef, 0xbb, 0xbf})), false
}

func accEncodeText(s string, wide bool) []byte {
	if !wide {
		return []byte(s)
	}
	out := []byte{0xff, 0xfe}
	for _, c := range utf16.Encode([]rune(s)) {
		out = binary.LittleEndian.AppendUint16(out, c)
	}
	return out
}

// accBcastSetup reads broadcasting.json; with no port in it, it writes 9000 (and the default password when there is
// none) and says the game has to start again to use it.
func accBcastSetup(paths []string) (cfg accBcastCfg, wrote bool, err error) {
	for _, p := range paths {
		raw, e := os.ReadFile(p)
		if e != nil {
			continue
		}
		txt, wide := accDecodeText(raw)
		var m map[string]any
		if e := json.Unmarshal([]byte(txt), &m); e != nil {
			return cfg, false, e
		}
		json.Unmarshal([]byte(txt), &cfg)
		if cfg.Port > 0 && cfg.Password != "" {
			return cfg, false, nil
		}
		if cfg.Port <= 0 {
			cfg.Port = 9000
		}
		if cfg.Password == "" {
			cfg.Password = "asd"
		}
		m["updListenerPort"], m["connectionPassword"] = cfg.Port, cfg.Password
		if _, ok := m["commandPassword"]; !ok {
			m["commandPassword"] = ""
		}
		out, _ := json.MarshalIndent(m, "", "    ")
		if e := os.WriteFile(p, accEncodeText(string(out), wide), 0o644); e != nil {
			return cfg, false, e
		}
		return cfg, true, nil
	}
	// no file (the game writes one the first time it starts): its defaults
	return accBcastCfg{Port: 9000, Password: "asd"}, false, nil
}

// ---- the connection

func startACCBcast() *accBcast {
	b := &accBcast{stop: make(chan struct{})}
	cfg, wrote, err := accBcastSetup(accBcastPaths())
	if err != nil {
		log.Printf("ACC broadcasting.json: %v", err)
	}
	if wrote {
		b.state = "restart"
		b.tell()
		log.Printf("ACC: broadcasting port %d written to broadcasting.json; the game uses it from its next start", cfg.Port)
	}
	go b.run(cfg)
	return b
}

func (b *accBcast) run(cfg accBcastCfg) {
	addr := &net.UDPAddr{IP: net.IPv4(127, 0, 0, 1), Port: cfg.Port}
	reg := accRegisterMsg("Pitlane HQ", cfg.Password, 100, cfg.Command)
	buf := make([]byte, 64*1024)
	for {
		select {
		case <-b.stop:
			return
		default:
		}
		conn, err := net.DialUDP("udp", nil, addr)
		if err != nil {
			if !accSleep(b.stop, 3*time.Second) {
				return
			}
			continue
		}
		b.mu.Lock()
		b.conn = conn
		b.mu.Unlock()
		registered := false
		lastSend, lastHeard := time.Time{}, time.Now()
		for {
			select {
			case <-b.stop:
				if registered {
					b.mu.Lock()
					conn.Write(accConnMsg(9, b.connID))
					b.mu.Unlock()
				}
				conn.Close()
				return
			default:
			}
			b.tell()
			now := time.Now()
			if !registered && now.Sub(lastSend) > 2*time.Second {
				conn.Write(reg)
				lastSend = now
			}
			if registered && now.Sub(lastHeard) > 5*time.Second { // the game went quiet (a new session, it closed)
				break
			}
			conn.SetReadDeadline(now.Add(500 * time.Millisecond))
			n, err := conn.Read(buf)
			if err != nil {
				continue // timeouts, and "connection refused" while the game is not listening yet
			}
			lastHeard = time.Now()
			ok, ask, err := b.handle(buf[:n], lastHeard)
			if err != nil {
				log.Printf("ACC broadcasting: %v", err)
				if !accSleep(b.stop, 10*time.Second) {
					conn.Close()
					return
				}
				lastSend = time.Time{}
				continue
			}
			if ok {
				registered = true
				b.mu.Lock()
				b.state = ""
				b.mu.Unlock()
			}
			if ask == "entries" {
				b.mu.Lock()
				id := b.connID
				b.mu.Unlock()
				conn.Write(accConnMsg(10, id))
			}
		}
		conn.Close()
	}
}

func accSleep(stop chan struct{}, d time.Duration) bool {
	select {
	case <-stop:
		return false
	case <-time.After(d):
		return true
	}
}

func (b *accBcast) Close() {
	if b == nil || b.stop == nil {
		return
	}
	close(b.stop)
	b.stop = nil
	accBcastNow.Store("")
}

// ---- cars and classes

// ACC's car models (the broadcasting API's carModelType): name and class
var accModels = map[int][2]string{
	0: {"Porsche 991 GT3 R", "GT3"}, 1: {"Mercedes-AMG GT3", "GT3"}, 2: {"Ferrari 488 GT3", "GT3"}, 3: {"Audi R8 LMS", "GT3"},
	4: {"Lamborghini Huracán GT3", "GT3"}, 5: {"McLaren 650S GT3", "GT3"}, 6: {"Nissan GT-R Nismo GT3 2018", "GT3"},
	7: {"BMW M6 GT3", "GT3"}, 8: {"Bentley Continental GT3 2018", "GT3"}, 9: {"Porsche 991 II GT3 Cup", "CUP"},
	10: {"Nissan GT-R Nismo GT3 2017", "GT3"}, 11: {"Bentley Continental GT3 2016", "GT3"}, 12: {"Aston Martin V12 Vantage GT3", "GT3"},
	13: {"Lamborghini Gallardo R-EX", "GT3"}, 14: {"Emil Frey Jaguar G3", "GT3"}, 15: {"Lexus RC F GT3", "GT3"},
	16: {"Lamborghini Huracán GT3 Evo", "GT3"}, 17: {"Honda NSX GT3", "GT3"}, 18: {"Lamborghini Huracán Super Trofeo", "ST"},
	19: {"Audi R8 LMS Evo", "GT3"}, 20: {"Aston Martin V8 Vantage GT3", "GT3"}, 21: {"Honda NSX GT3 Evo", "GT3"},
	22: {"McLaren 720S GT3", "GT3"}, 23: {"Porsche 991 II GT3 R", "GT3"}, 24: {"Ferrari 488 GT3 Evo", "GT3"},
	25: {"Mercedes-AMG GT3 2020", "GT3"}, 26: {"Ferrari 488 Challenge Evo", "CHL"}, 27: {"BMW M2 CS Racing", "TCX"},
	28: {"Porsche 992 GT3 Cup", "CUP"}, 29: {"Lamborghini Huracán Super Trofeo EVO2", "ST"}, 30: {"BMW M4 GT3", "GT3"},
	31: {"Audi R8 LMS GT3 Evo II", "GT3"}, 32: {"Ferrari 296 GT3", "GT3"}, 33: {"Lamborghini Huracán GT3 Evo2", "GT3"},
	34: {"Porsche 992 GT3 R", "GT3"}, 35: {"McLaren 720S GT3 Evo", "GT3"}, 36: {"Ford Mustang GT3", "GT3"},
	50: {"Alpine A110 GT4", "GT4"}, 51: {"Aston Martin V8 Vantage GT4", "GT4"}, 52: {"Audi R8 LMS GT4", "GT4"},
	53: {"BMW M4 GT4", "GT4"}, 55: {"Chevrolet Camaro GT4.R", "GT4"}, 56: {"Ginetta G55 GT4", "GT4"},
	57: {"KTM X-Bow GT4", "GT4"}, 58: {"Maserati MC GT4", "GT4"}, 59: {"McLaren 570S GT4", "GT4"},
	60: {"Mercedes-AMG GT4", "GT4"}, 61: {"Porsche 718 Cayman GT4 Clubsport", "GT4"},
	80: {"Audi R8 LMS GT2", "GT2"}, 82: {"KTM X-Bow GT2", "GT2"}, 83: {"Maserati MC20 GT2", "GT2"},
	84: {"Mercedes-AMG GT2", "GT2"}, 85: {"Porsche 911 GT2 RS CS Evo", "GT2"}, 86: {"Porsche 935", "GT2"},
}

func accModel(id int) (name, class string) {
	if m, ok := accModels[id]; ok {
		return m[0], m[1]
	}
	return "Car " + strconv.Itoa(id), "GT3"
}

func accClassColor(class string) string {
	switch class {
	case "GT3":
		return "0x2fb24a"
	case "GT4":
		return "0x1e6bd8"
	case "GT2":
		return "0xd81e1e"
	case "CUP":
		return "0xf2a20c"
	case "ST":
		return "0x8f3fd8"
	case "CHL":
		return "0xe0457b"
	case "TCX":
		return "0x18b3b3"
	}
	return "0xffda59"
}

// the session types the broadcasting API and the shared memory use, as iRacing names them
func accSessionType(bcast int, fromBcast bool, shm int) string {
	if fromBcast {
		switch bcast {
		case 10:
			return "Race"
		case 4, 9, 13:
			return "Qualify"
		}
		return "Practice"
	}
	switch shm { // AC_SESSION_TYPE: 0 practice, 1 qualify, 2 race, 3 hotlap, 4 time attack, 7 hotstint, 8 superpole
	case 2:
		return "Race"
	case 1, 8:
		return "Qualify"
	}
	return "Practice"
}
