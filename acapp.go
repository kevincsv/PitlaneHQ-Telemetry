package main

// Assetto Corsa (the first one) shares only your own car in its shared memory. Pitlane HQ's own in-game app
// (acapp/PitlaneHQ/PitlaneHQ.py, a Python app of the game that draws nothing) writes every car ten times a second to
// apps\python\PitlaneHQ\field.txt in the game's folder: the agent installs it there and switches it on in
// Documents\Assetto Corsa\cfg\python.ini when Assetto Corsa runs. The game loads its apps when it starts, so the
// first time the app tells the driver to restart the game (status "bcast" = "restart", as for ACC).

import (
	"bufio"
	"bytes"
	_ "embed"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

//go:embed acapp/PitlaneHQ/PitlaneHQ.py
var acAppPy []byte

// acRoot: the folder of the running Assetto Corsa (acs.exe is in it), else Steam's usual one
func acRoot() string {
	for _, n := range []string{"acs.exe", "acs_x86.exe"} {
		for _, p := range procPaths(n) {
			if p != "" {
				return filepath.Dir(p)
			}
		}
	}
	for _, p := range []string{`%ProgramFiles(x86)%\Steam\steamapps\common\assettocorsa`, `%ProgramFiles%\Steam\steamapps\common\assettocorsa`} {
		d := os.ExpandEnv(strings.NewReplacer("%ProgramFiles(x86)%", "${ProgramFiles(x86)}", "%ProgramFiles%", "${ProgramFiles}").Replace(p))
		if st, err := os.Stat(d); err == nil && st.IsDir() {
			return d
		}
	}
	return ""
}

func acPythonIni() []string {
	var out []string
	for _, home := range []string{os.Getenv("USERPROFILE"), os.Getenv("OneDrive")} {
		if home == "" {
			continue
		}
		for _, docs := range []string{filepath.Join(home, "Documents"), filepath.Join(home, "OneDrive", "Documents")} {
			out = append(out, filepath.Join(docs, "Assetto Corsa", "cfg", "python.ini"))
		}
	}
	return out
}

// acAppInstall writes the app into the game's folder and switches it on. changed: the game has to start again to
// load it.
func acAppInstall(root string, inis []string) (changed bool, err error) {
	if root == "" {
		return false, errors.New("Assetto Corsa's folder not found")
	}
	dir := filepath.Join(root, "apps", "python", "PitlaneHQ")
	f := filepath.Join(dir, "PitlaneHQ.py")
	if old, e := os.ReadFile(f); e != nil || !bytes.Equal(old, acAppPy) {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return false, err
		}
		if err := os.WriteFile(f, acAppPy, 0o644); err != nil {
			return false, err
		}
		changed = true
	}
	for _, ini := range inis {
		if _, e := os.Stat(filepath.Dir(ini)); e != nil {
			continue
		}
		raw, _ := os.ReadFile(ini)
		out, on := acIniActivate(string(raw))
		if !on {
			if err := os.WriteFile(ini, []byte(out), 0o644); err != nil {
				return changed, err
			}
			changed = true
		}
		break
	}
	return changed, nil
}

// acIniActivate: python.ini with [PITLANEHQ] ACTIVE=1 (on: it already was)
func acIniActivate(src string) (out string, on bool) {
	nl := "\r\n"
	if src != "" && !strings.Contains(src, "\r\n") {
		nl = "\n"
	}
	lines := strings.Split(strings.ReplaceAll(src, "\r\n", "\n"), "\n")
	in, found := false, false
	for i, l := range lines {
		t := strings.TrimSpace(l)
		if strings.HasPrefix(t, "[") {
			if in && !found { // the section had no ACTIVE line
				lines = append(lines[:i], append([]string{"ACTIVE=1"}, lines[i:]...)...)
				return strings.Join(lines, nl), false
			}
			in = strings.EqualFold(t, "[PITLANEHQ]")
			continue
		}
		if in && strings.HasPrefix(strings.ToUpper(t), "ACTIVE") {
			found = true
			if v := strings.TrimSpace(t[strings.Index(t, "=")+1:]); strings.Contains(t, "=") && v == "1" {
				return src, true
			}
			lines[i] = "ACTIVE=1"
			return strings.Join(lines, nl), false
		}
	}
	if in && !found {
		return strings.TrimRight(strings.Join(lines, nl), "\r\n") + nl + "ACTIVE=1" + nl, false
	}
	s := strings.TrimRight(src, "\r\n")
	if s != "" {
		s += nl + nl
	}
	return s + "[PITLANEHQ]" + nl + "ACTIVE=1" + nl, false
}

// parseACField reads field.txt into the same field ACC's broadcasting API fills (cars by the game's car id, the
// entries with the driver and the car's name). ver says which drivers and cars are in it.
func parseACField(b []byte, now time.Time) (accField, []acFieldCar, bool) {
	sc := bufio.NewScanner(bytes.NewReader(b))
	if !sc.Scan() || !strings.HasPrefix(sc.Text(), "PHQ1") {
		return accField{}, nil, false
	}
	f := accField{cars: map[int]accCar{}, entries: map[int]accEntry{}, at: now, fromAC: true}
	var list []acFieldCar
	var who strings.Builder
	for sc.Scan() {
		p := strings.Split(sc.Text(), "\t")
		if len(p) < 11 {
			continue
		}
		n := func(i int) int { v, _ := strconv.Atoi(strings.TrimSpace(p[i])); return v }
		fl := func(i int) float64 { v, _ := strconv.ParseFloat(strings.TrimSpace(p[i]), 64); return v }
		ms := func(i int) int {
			if v := n(i); v > 0 {
				return v
			}
			return -1
		}
		id := n(0)
		loc := 1
		if p[8] == "1" {
			loc = 2
		}
		f.cars[id] = accCar{idx: id, pos: n(3), laps: n(4), spline: fl(5), last: ms(6), best: ms(7), loc: loc, at: now}
		f.entries[id] = accEntry{num: id + 1, carName: p[2], drivers: []accDriver{{first: p[1]}}}
		list = append(list, acFieldCar{id: id, x: fl(9), z: fl(10)})
		who.WriteString(p[0] + p[1] + p[2] + ";")
	}
	f.ver = int(lmuHash(who.String(), 0, 1<<30))
	return f, list, len(list) > 0
}

type acFieldCar struct {
	id   int
	x, z float64
}

// acFieldFile reads field.txt at most ten times a second; a file not written for 3 s is no field (the game closed
// or the app is off)
type acFieldFile struct {
	path       string
	readAt     time.Time
	mod        time.Time
	fld        accField
	cars       []acFieldCar
	ok         bool
	restart    bool
	installErr error
}

func (a *acFieldFile) get(now time.Time) (accField, []acFieldCar, bool) {
	if a == nil || a.path == "" {
		return accField{}, nil, false
	}
	if now.Sub(a.readAt) < 100*time.Millisecond {
		return a.fld, a.cars, a.ok
	}
	a.readAt = now
	st, err := os.Stat(a.path)
	if err != nil || now.Sub(st.ModTime()) > 3*time.Second {
		a.ok = false
		return accField{}, nil, false
	}
	if !st.ModTime().Equal(a.mod) {
		a.mod = st.ModTime()
		if b, err := os.ReadFile(a.path); err == nil {
			if f, cars, ok := parseACField(b, now); ok {
				a.fld, a.cars, a.ok = f, cars, true
				a.restart = false
			}
		}
	}
	a.fld.at = now
	return a.fld, a.cars, a.ok
}

func (a *acFieldFile) status(now time.Time) string {
	if a == nil {
		return ""
	}
	if a.ok && now.Sub(a.mod) < 3*time.Second {
		return "on"
	}
	if a.restart {
		return "restart"
	}
	return ""
}
