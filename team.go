package main

// Team mode (docs/spec/team.md, in development): a small group of accounts for endurance races. A team's secret,
// made here or on another device of the team, gives its live room, its join proof and its key; the server keeps it
// only sealed with each member's own data key. Whoever of the team is in the car streams to the team's room
// (liveTeamRelay), sends the "team" event every second while somebody watches, and keeps its stints in the team log.

import (
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ---------- the secret and what comes from it ----------

const teamSecretLen = 20

func teamNewSecret() string {
	b := make([]byte, teamSecretLen)
	rand.Read(b)
	for i := range b {
		b[i] = shareAlphabet[int(b[i])%len(shareAlphabet)] // 256 is a multiple of 32: every character as likely
	}
	return string(b)
}

func teamRoom(secret string) string {
	h := sha256.Sum256([]byte("pitlanehq-team-room|" + secret))
	return hex.EncodeToString(h[:16])
}

func teamJoin(secret string) string {
	h := sha256.Sum256([]byte("pitlanehq-team-join|" + secret))
	return hex.EncodeToString(h[:])
}

func teamKey(secret string) []byte {
	k, _ := pbkdf2.Key(sha256.New, secret, []byte("pitlanehq-team-key-v1"), 100000, 32)
	return k
}

var (
	teamIDRe     = regexp.MustCompile(`^[0-9a-f]{12}$`)
	teamSecretRe = regexp.MustCompile(`^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{20}$`)
)

// teamParseInvite takes the invite link (…#team=<id>.<secret>) or the bare invite (<id>.<secret>)
func teamParseInvite(s string) (id, secret string, err error) {
	s = strings.TrimSpace(s)
	if u, e := url.QueryUnescape(s); e == nil {
		s = u
	}
	if i := strings.LastIndex(s, "team="); i >= 0 {
		s = s[i+len("team="):]
	}
	s = strings.TrimSpace(strings.TrimRight(s, "/ \t\r\n"))
	if i := strings.IndexAny(s, "&# "); i >= 0 {
		s = s[:i]
	}
	id, secret, ok := strings.Cut(s, ".")
	id, secret = strings.ToLower(strings.TrimSpace(id)), strings.ToUpper(strings.TrimSpace(secret))
	if !ok || !teamIDRe.MatchString(id) || !teamSecretRe.MatchString(secret) {
		return "", "", errors.New("this invite link is not right")
	}
	return id, secret, nil
}

// ---------- the teams of this account (kept in memory for the relay) ----------

type teamInfo struct {
	ID, Name, Secret, Room string
	key                    []byte
}

func (t *teamInfo) teamKey() []byte {
	if t.key == nil {
		t.key = teamKey(t.Secret)
	}
	return t.key
}

var teamCache struct {
	sync.Mutex
	acct       string // the account they are of
	at         time.Time
	teams      []*teamInfo
	refreshing bool
}

const teamCacheAge = 5 * time.Minute

func teamAccount() (tok, id string) {
	loadPL()
	plMu.Lock()
	defer plMu.Unlock()
	return plAcc.Token, plAcc.ID
}

func teamCall(method, path string, body any) ([]byte, error) {
	tok, _ := teamAccount()
	if tok == "" {
		return nil, errors.New("sign in with your Pitlane HQ account")
	}
	b, err := commRequest(method, path, body, tok)
	plSessionEnded(tok, err)
	return b, err
}

// teamFetch reads the account's teams from the server, opens their secrets and keeps them for the relay.
// raw: the server's teams as they came, each with its invite and room added.
func teamFetch() (raw []map[string]any, err error) {
	key, err := dataKey()
	if err != nil {
		return nil, err
	}
	b, err := teamCall("GET", "/team", nil)
	if err != nil {
		return nil, err
	}
	var res struct {
		Teams []map[string]any `json:"teams"`
	}
	if err := json.Unmarshal(b, &res); err != nil {
		return nil, errors.New("the server's answer was not right")
	}
	infos := []*teamInfo{}
	old := map[string]*teamInfo{}
	teamCache.Lock()
	for _, t := range teamCache.teams {
		old[t.ID] = t
	}
	teamCache.Unlock()
	for _, t := range res.Teams {
		id, _ := t["id"].(string)
		name, _ := t["name"].(string)
		sealed, _ := t["sealed"].(string)
		delete(t, "sealed")
		ti := &teamInfo{ID: id, Name: name}
		if p, e := openAES(key, sealed); e == nil && teamSecretRe.Match(p) {
			ti.Secret = string(p)
			ti.Room = teamRoom(ti.Secret)
			if o := old[id]; o != nil && o.Secret == ti.Secret {
				ti.key = o.key // the key again would cost a PBKDF2
			}
			t["invite"], t["room"] = id+"."+ti.Secret, ti.Room
		}
		infos = append(infos, ti)
	}
	if res.Teams == nil {
		res.Teams = []map[string]any{}
	}
	_, acct := teamAccount()
	teamCache.Lock()
	teamCache.acct, teamCache.at, teamCache.teams = acct, time.Now(), infos
	teamCache.Unlock()
	return res.Teams, nil
}

// teamActiveID: the team this PC streams to (the one chosen, or the first)
func teamActiveIDOf(teams []*teamInfo) string {
	commMu.Lock()
	a := commCfg.Team
	commMu.Unlock()
	for _, t := range teams {
		if t.ID == a {
			return a
		}
	}
	if len(teams) > 0 {
		return teams[0].ID
	}
	return ""
}

// teamCached: the account's teams as last read (nil, false when they were never read for this account or are old)
func teamCached() ([]*teamInfo, bool) {
	_, acct := teamAccount()
	teamCache.Lock()
	defer teamCache.Unlock()
	if teamCache.acct != acct || teamCache.at.IsZero() {
		return nil, false
	}
	return teamCache.teams, time.Since(teamCache.at) < teamCacheAge
}

// teamActive: the active team, read from the server when the copy here is old; nil without one
func teamActive() *teamInfo {
	teams, fresh := teamCached()
	if !fresh {
		if _, err := teamFetch(); err != nil && teams == nil {
			return nil
		}
		teams, _ = teamCached()
	}
	id := teamActiveIDOf(teams)
	for _, t := range teams {
		if t.ID == id && t.Secret != "" {
			return t
		}
	}
	return nil
}

// teamActiveNow: the active team from the copy here only (never waits for the server); an old copy is read again in
// the background
func teamActiveNow() *teamInfo {
	teams, fresh := teamCached()
	if !fresh {
		teamCache.Lock()
		if !teamCache.refreshing {
			teamCache.refreshing = true
			go func() {
				teamFetch()
				teamCache.Lock()
				teamCache.refreshing = false
				teamCache.Unlock()
			}()
		}
		teamCache.Unlock()
	}
	id := teamActiveIDOf(teams)
	for _, t := range teams {
		if t.ID == id && t.Secret != "" {
			return t
		}
	}
	return nil
}

func teamByID(id string) *teamInfo {
	teams, fresh := teamCached()
	if !fresh || !teamHas(teams, id) {
		teamFetch()
		teams, _ = teamCached()
	}
	for _, t := range teams {
		if t.ID == id {
			return t
		}
	}
	return nil
}

func teamHas(teams []*teamInfo, id string) bool {
	for _, t := range teams {
		if t.ID == id {
			return true
		}
	}
	return false
}

func setTeamActive(id string) {
	commMu.Lock()
	if commCfg.Team != id {
		commCfg.Team = id
		saveCommLocked()
	}
	commMu.Unlock()
}

// ---------- the page's actions: {action:"team", op, …} on /api/sync ----------

func teamAction(raw []byte) (any, error) {
	if !wipOpen() {
		return nil, errors.New("team mode is not available yet")
	}
	var in struct {
		Op, Name, Invite, ID, Member string
		Since                        int64
	}
	if json.Unmarshal(raw, &in) != nil {
		return nil, errors.New("unknown action")
	}
	if tok, _ := teamAccount(); tok == "" {
		return nil, errors.New("sign in with your Pitlane HQ account")
	}
	in.ID = strings.TrimSpace(in.ID)
	needID := func() error {
		if !teamIDRe.MatchString(in.ID) {
			return errors.New("choose a team")
		}
		return nil
	}
	pass := func(path string, body any) (any, error) {
		b, err := teamCall("POST", path, body)
		if err != nil {
			return nil, err
		}
		var out map[string]any
		json.Unmarshal(b, &out)
		if out == nil {
			out = map[string]any{"ok": true}
		}
		return out, nil
	}
	switch in.Op {
	case "list":
		teams, err := teamFetch()
		if err != nil {
			return nil, err
		}
		cached, _ := teamCached()
		return map[string]any{"teams": teams, "active": teamActiveIDOf(cached)}, nil
	case "create":
		name := strings.Join(strings.Fields(in.Name), " ")
		if n := len([]rune(name)); n < 2 || n > 40 {
			return nil, errors.New("give the team a name of 2 to 40 characters")
		}
		key, err := dataKey()
		if err != nil {
			return nil, err
		}
		secret := teamNewSecret()
		sealed, err := sealAES(key, []byte(secret))
		if err != nil {
			return nil, err
		}
		b, err := teamCall("POST", "/team/create", map[string]any{"name": name, "room": teamRoom(secret), "join": teamJoin(secret), "sealed": sealed})
		if err != nil {
			return nil, err
		}
		var res struct {
			ID string `json:"id"`
		}
		json.Unmarshal(b, &res)
		if res.ID == "" {
			return nil, errors.New("the server's answer was not right")
		}
		setTeamActive(res.ID) // a team just made is the one this PC streams to
		teamFetch()
		return map[string]any{"id": res.ID, "name": name, "invite": res.ID + "." + secret}, nil
	case "join":
		id, secret, err := teamParseInvite(in.Invite)
		if err != nil {
			return nil, err
		}
		key, err := dataKey()
		if err != nil {
			return nil, err
		}
		sealed, err := sealAES(key, []byte(secret))
		if err != nil {
			return nil, err
		}
		out, err := pass("/team/join", map[string]any{"id": id, "join": teamJoin(secret), "sealed": sealed})
		if err != nil {
			return nil, err
		}
		setTeamActive(id)
		teamFetch()
		return out, nil
	case "leave":
		if err := needID(); err != nil {
			return nil, err
		}
		out, err := pass("/team/leave", map[string]any{"id": in.ID})
		if err != nil {
			return nil, err
		}
		commMu.Lock()
		if commCfg.Team == in.ID {
			commCfg.Team = ""
			saveCommLocked()
		}
		commMu.Unlock()
		teamFetch()
		return out, nil
	case "remove":
		if err := needID(); err != nil {
			return nil, err
		}
		out, err := pass("/team/remove", map[string]any{"id": in.ID, "member": in.Member})
		if err == nil {
			teamFetch()
		}
		return out, err
	case "rename":
		if err := needID(); err != nil {
			return nil, err
		}
		name := strings.Join(strings.Fields(in.Name), " ")
		if n := len([]rune(name)); n < 2 || n > 40 {
			return nil, errors.New("give the team a name of 2 to 40 characters")
		}
		out, err := pass("/team/rename", map[string]any{"id": in.ID, "name": name})
		if err == nil {
			teamFetch()
		}
		return out, err
	case "log":
		if err := needID(); err != nil {
			return nil, err
		}
		t := teamByID(in.ID)
		if t == nil || t.Secret == "" {
			return nil, errors.New("you are not in this team")
		}
		q := "/team/log?id=" + in.ID
		if in.Since > 0 {
			q += fmt.Sprintf("&since=%d", in.Since)
		}
		b, err := teamCall("GET", q, nil)
		if err != nil {
			return nil, err
		}
		return teamOpenLog(b, t.teamKey())
	case "active":
		if in.ID != "" {
			if err := needID(); err != nil {
				return nil, err
			}
			if teams, _ := teamCached(); !teamHas(teams, in.ID) && teamByID(in.ID) == nil {
				return nil, errors.New("you are not in this team")
			}
		}
		setTeamActive(in.ID)
		teams, _ := teamCached()
		return map[string]any{"active": teamActiveIDOf(teams)}, nil
	}
	return nil, errors.New("unknown action")
}

// teamOpenLog opens the server's log entries with the team key; an entry that does not open is left out
func teamOpenLog(b []byte, key []byte) (any, error) {
	var res struct {
		Log []struct {
			Account string `json:"account"`
			Name    string `json:"name"`
			Key     string `json:"key"`
			At      int64  `json:"at"`
			Sealed  string `json:"sealed"`
		} `json:"log"`
	}
	if err := json.Unmarshal(b, &res); err != nil {
		return nil, errors.New("the server's answer was not right")
	}
	out := []map[string]any{}
	for _, e := range res.Log {
		p, err := openAES(key, e.Sealed)
		if err != nil || !json.Valid(p) {
			continue
		}
		out = append(out, map[string]any{"account": e.Account, "name": e.Name, "key": e.Key, "at": e.At, "entry": json.RawMessage(p)})
	}
	return map[string]any{"log": out}, nil
}

// ---------- stints: continuous time in the car within one session ----------

// teamStintGap: out of the car this long (a tow, a reset, a long stop) and the next time in starts a new stint
const teamStintGap = 90 * time.Second

const teamMaxLaps = 400

type teamLap struct {
	N     int     `json:"n"`
	T     float64 `json:"t"`
	Valid bool    `json:"valid"`
	fuel  float64 // litres used in the lap (≤ 0: refuelled or unknown)
}

type teamStint struct {
	Sid     string
	Sess    cloudSession
	Start   int64 // ms
	LastIn  int64 // ms: last seen in the car
	End     int64 // ms: the end of its last lap
	LapFrom int
	LapTo   int
	Laps    []teamLap
}

type stintTracker struct {
	cur *teamStint
}

// note: a look at the car (once a second). A stint starts when the driver is in the car in another session, or
// after more than teamStintGap out of it.
func (t *stintTracker) note(now int64, s cloudSession, inCar bool, lap int) {
	if !inCar || s.ID == "" {
		return
	}
	c := t.cur
	if c == nil || c.Sid != s.ID || now-c.LastIn > teamStintGap.Milliseconds() {
		t.cur = &teamStint{Sid: s.ID, Sess: s, Start: now, LapFrom: lap, LapTo: lap}
		c = t.cur
	}
	c.LastIn = now
	if len(c.Laps) == 0 && lap > c.LapTo {
		c.LapTo = lap
	}
}

// lap: a lap ended in the car; the stint as it is now (a copy)
func (t *stintTracker) lap(now int64, s cloudSession, l teamLap) teamStint {
	c := t.cur
	if c == nil || c.Sid != s.ID || now-c.LastIn > teamStintGap.Milliseconds()+int64(l.T*1000) {
		start := now - int64(l.T*1000)
		t.cur = &teamStint{Sid: s.ID, Sess: s, Start: start, LapFrom: l.N}
		c = t.cur
	}
	if len(c.Laps) == 0 {
		c.LapFrom = l.N
	}
	if len(c.Laps) < teamMaxLaps {
		c.Laps = append(c.Laps, l)
	}
	c.LapTo, c.End, c.LastIn = l.N, now, now
	cp := *c
	cp.Laps = append([]teamLap(nil), c.Laps...)
	return cp
}

func (t *stintTracker) snapshot() (teamStint, bool) {
	if t.cur == nil {
		return teamStint{}, false
	}
	cp := *t.cur
	cp.Laps = append([]teamLap(nil), t.cur.Laps...)
	return cp, true
}

// fuelPerLap: the litres a lap takes, from the stint's last five laps that used fuel; 0 when none
func (s teamStint) fuelPerLap() float64 {
	sum, n := 0.0, 0
	for i := len(s.Laps) - 1; i >= 0 && n < 5; i-- {
		if f := s.Laps[i].fuel; f > 0 {
			sum += f
			n++
		}
	}
	if n == 0 {
		return 0
	}
	return sum / float64(n)
}

func (s teamStint) best() float64 {
	b := 0.0
	for _, l := range s.Laps {
		if l.Valid && l.T > 0 && (b == 0 || l.T < b) {
			b = l.T
		}
	}
	return b
}

var teamStints = struct {
	sync.Mutex
	t    stintTracker
	sess cloudSession // the session the lap recorder is in
}{}

// teamNoteSession: the lap recorder entered a session (liveLapEnv.meta)
func teamNoteSession(s cloudSession) {
	teamStints.Lock()
	teamStints.sess = s
	teamStints.Unlock()
}

// teamInCar: this PC's driver is in the car, on track in the driver's seat (IsOnTrack: iRacing's "player in car",
// made by the Le Mans Ultimate and ACC readers too); a teammate driving the same car in iRacing reads false here
func teamInCar() bool {
	st := currentStatus()
	if !st.connected() || st.Demo {
		return false
	}
	in, _ := telBool("IsOnTrack")
	return in
}

// teamStintWatcher looks at the car once a second, so a stint knows when the driver got in
func teamStintWatcher() {
	for range time.Tick(time.Second) {
		in := teamInCar()
		lap := 0
		if in {
			lap = int(telNums([]string{"Lap"})[0])
		}
		teamStints.Lock()
		teamStints.t.note(time.Now().UnixMilli(), teamStints.sess, in, lap)
		teamStints.Unlock()
	}
}

// ---------- the team log ----------

type teamLogStint struct {
	From    int64 `json:"from"`
	To      int64 `json:"to"`
	LapFrom int   `json:"lapFrom"`
	LapTo   int   `json:"lapTo"`
}

type teamLogEntry struct {
	V          int          `json:"v"`
	Driver     string       `json:"driver"`
	Sid        string       `json:"sid"`
	Game       string       `json:"game"`
	Track      string       `json:"track"`
	Config     string       `json:"config"`
	Car        string       `json:"car"`
	Kind       string       `json:"kind"`
	Started    int64        `json:"started"`
	Stint      teamLogStint `json:"stint"`
	Laps       []teamLap    `json:"laps"`
	Best       float64      `json:"best"`
	FuelPerLap float64      `json:"fuelPerLap"`
}

func teamLogKey(s teamStint) string { return fmt.Sprintf("%s:%d", s.Sid, s.Start) }

func buildTeamLog(driver string, s teamStint) teamLogEntry {
	laps := s.Laps
	if laps == nil {
		laps = []teamLap{}
	}
	game := s.Sess.Game
	if game == "" {
		game = "iracing"
	}
	return teamLogEntry{V: 1, Driver: driver, Sid: s.Sid, Game: game, Track: s.Sess.Track, Config: s.Sess.TrackConfig, Car: s.Sess.Car,
		Kind: s.Sess.Kind, Started: s.Sess.Started, Stint: teamLogStint{From: s.Start, To: s.End, LapFrom: s.LapFrom, LapTo: s.LapTo},
		Laps: laps, Best: round(s.best(), 3), FuelPerLap: round(s.fuelPerLap(), 3)}
}

type teamLogItem struct {
	key   string
	entry teamLogEntry
}

var (
	teamLogQ    = make(chan teamLogItem, 16)
	teamLogOnce sync.Once
)

// teamLapEnded: a lap ended in the car (the lap recorder, after its time and verdict are known). With a team active,
// the stint goes up to the team log in the background; the recorder never waits for it.
func teamLapEnded(s cloudSession, n int, lt float64, valid bool, fuelUsed float64) {
	if lt <= 0 || s.ID == "" || !wipOpen() {
		return
	}
	teamStints.Lock()
	st := teamStints.t.lap(time.Now().UnixMilli(), s, teamLap{N: n, T: round(lt, 3), Valid: valid, fuel: fuelUsed})
	teamStints.Unlock()
	if teamActiveNow() == nil {
		return
	}
	teamLogOnce.Do(func() { go keepAlive("teamLogUploader", teamLogUploader) })
	select {
	case teamLogQ <- teamLogItem{teamLogKey(st), buildTeamLog(teamDriverName(), st)}:
	default: // the next lap sends the whole stint again
	}
}

func teamDriverName() string {
	if d := fridayDriver(); d != "" {
		return d
	}
	return ownName()
}

func teamLogUploader() {
	for it := range teamLogQ {
		t := teamActive()
		if t == nil {
			continue
		}
		b, err := json.Marshal(it.entry)
		if err != nil {
			continue
		}
		sealed, err := sealAES(t.teamKey(), b)
		if err != nil {
			continue
		}
		for try := 0; try < 3; try++ {
			if _, err = teamCall("POST", "/team/log", map[string]any{"id": t.ID, "key": it.key, "sealed": sealed}); err == nil {
				break
			}
			var he httpErr
			if errors.As(err, &he) && he.code < 500 {
				break // refused: trying again changes nothing
			}
			time.Sleep(5 * time.Second)
		}
	}
}

// ---------- the "team" live event ----------

type teamEvent struct {
	Driver      string  `json:"driver"`
	InCar       bool    `json:"inCar"`
	Sid         string  `json:"sid"`
	Game        string  `json:"game"`
	Track       string  `json:"track"`
	Config      string  `json:"config"`
	Car         string  `json:"car"`
	Kind        string  `json:"kind"`
	Lap         int     `json:"lap"`
	StintStart  int64   `json:"stintStart"`
	StintLaps   int     `json:"stintLaps"`
	Fuel        float64 `json:"fuel"`
	FuelPerLap  float64 `json:"fuelPerLap"`
	LapsLeft    float64 `json:"lapsLeft"`
	PitLap      int     `json:"pitLap"`
	SessionLeft float64 `json:"sessionLeft"`
	LastLap     float64 `json:"lastLap"`
	Best        float64 `json:"best"`
}

// teamNow: what the event is built from
type teamNow struct {
	driver      string
	inCar       bool
	sess        cloudSession
	stint       teamStint
	hasStint    bool
	lap         int
	fuel        float64 // litres
	useLPerH    float64 // litres an hour now (the game's FuelUsePerHour), 0 unknown
	sessionLeft float64 // seconds; negative or a week and more: unknown
	lastLap     float64
	best        float64
}

// buildTeamEvent: fuelPerLap from the stint's laps, else from the use an hour over a lap; lapsLeft = fuel / fuelPerLap,
// pitLap = lap + floor(lapsLeft); fuelPerLap 0 and lapsLeft, pitLap -1 when unknown
func buildTeamEvent(n teamNow) teamEvent {
	ev := teamEvent{Driver: n.driver, InCar: n.inCar, Sid: n.sess.ID, Game: n.sess.Game, Track: n.sess.Track, Config: n.sess.TrackConfig,
		Car: n.sess.Car, Kind: n.sess.Kind, Lap: n.lap, Fuel: round(n.fuel, 2), LapsLeft: -1, PitLap: -1, SessionLeft: -1,
		LastLap: round(math.Max(n.lastLap, 0), 3), Best: round(math.Max(n.best, 0), 3)}
	if ev.Game == "" && ev.Sid != "" {
		ev.Game = "iracing"
	}
	if n.hasStint && n.stint.Sid == n.sess.ID {
		ev.StintStart, ev.StintLaps = n.stint.Start, len(n.stint.Laps)
	}
	fpl := 0.0
	if n.hasStint && n.stint.Sid == n.sess.ID {
		fpl = n.stint.fuelPerLap()
	}
	if fpl <= 0 && n.useLPerH > 0 {
		lt := n.lastLap
		if lt <= 0 {
			lt = n.best
		}
		if lt > 0 {
			fpl = n.useLPerH * lt / 3600
		}
	}
	if fpl > 0 {
		ev.FuelPerLap = round(fpl, 3)
		left := n.fuel / fpl
		ev.LapsLeft = round(left, 1)
		ev.PitLap = n.lap + int(math.Floor(left))
	}
	if n.sessionLeft >= 0 && n.sessionLeft < 604000 {
		ev.SessionLeft = math.Round(n.sessionLeft)
	}
	return ev
}

var teamEvVars = []string{"Lap", "FuelLevel", "FuelUsePerHour", "SessionTimeRemain", "LapLastLapTime", "LapBestLapTime"}

// teamEventNow reads the game for the event
func teamEventNow() teamEvent {
	n := teamNow{driver: teamDriverName(), inCar: teamInCar(), sessionLeft: -1}
	teamStints.Lock()
	n.sess = teamStints.sess
	n.stint, n.hasStint = teamStints.t.snapshot()
	teamStints.Unlock()
	if st := currentStatus(); !st.connected() || st.Demo {
		n.sess = cloudSession{}
		return buildTeamEvent(n)
	}
	v := telNums(teamEvVars)
	n.lap, n.fuel, n.lastLap, n.best = int(v[0]), v[1], v[4], v[5]
	if telHas("SessionTimeRemain") {
		n.sessionLeft = v[3]
	}
	if v[2] > 0 { // kg an hour: litres by the car's fuel density (iRacing's YAML; 0.75 kg a litre when it says none)
		dens := atof(yamlField(sessionYAML(), "DriverCarFuelKgPerLtr"))
		if dens <= 0 {
			dens = 0.75
		}
		n.useLPerH = v[2] / dens
	}
	return buildTeamEvent(n)
}

// ---------- the relay to the active team's room ----------

func liveTeamRelay() {
	wait := 5 * time.Second
	for {
		token, _, base, ok := liveWanted()
		if !ok || !wipOpen() {
			time.Sleep(5 * time.Second)
			continue
		}
		t := teamActive()
		if t == nil {
			time.Sleep(15 * time.Second)
			continue
		}
		c, err := wsDial(strings.TrimRight(base, "/")+"/live?role=pc&team="+t.Room, token)
		if err != nil {
			time.Sleep(wait)
			if wait < 2*time.Minute {
				wait *= 2
			}
			continue
		}
		wait = 5 * time.Second
		room := t.Room
		liveState.Lock()
		liveState.teamOn, liveState.teamN = true, 0
		liveState.Unlock()
		var lastEv time.Time
		liveRunOpts(c, t.teamKey(), liveOpts{
			room: "team",
			keep: func() bool {
				if !wipOpen() {
					return false
				}
				a := teamActiveNow()
				return a != nil && a.Room == room
			},
			inCar: teamInCar,
			every: func(rs bool, out func(string, any) bool) bool {
				if !rs && time.Since(lastEv) < time.Second {
					return true
				}
				lastEv = time.Now()
				return out("team", teamEventNow())
			},
		})
		c.close()
		liveState.Lock()
		liveState.teamOn, liveState.teamN = false, 0
		liveState.Unlock()
		time.Sleep(time.Second)
	}
}
