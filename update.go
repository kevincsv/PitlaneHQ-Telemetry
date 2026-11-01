package main

// Updates: pitlanehq.app/dl/ has a version.json next to PitlaneHQ-windows.zip.
// Pitlane HQ compares it with its own build, and on request downloads the zip,
// replaces its files (the running .exe is renamed, Windows allows that) and
// starts the new version.

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// set when CI builds the .exe: -X main.buildID=<commit>
var buildID = "dev"

type updateInfo struct {
	Version string `json:"version"`
	Build   string `json:"build"`
	Date    string `json:"date,omitempty"`
	Min     string `json:"min,omitempty"` // older versions than this must update (they no longer work with the server)
	// what the version brings, as whats-new.json says it (en, es, pt): the update window shows its first lines
	Notes map[string][]string `json:"notes,omitempty"`
	// "beta" in the test builds' version.json (pitlanehq.app/dl/beta/), which only testers and admins read
	Channel string `json:"channel,omitempty"`
}

// versionLess: "0.6.1" < "0.6.10" (numbers, not text)
func versionLess(a, b string) bool {
	pa, pb := strings.Split(strings.TrimPrefix(a, "v"), "."), strings.Split(strings.TrimPrefix(b, "v"), ".")
	for i := 0; i < len(pa) || i < len(pb); i++ {
		var x, y int
		if i < len(pa) {
			x, _ = strconv.Atoi(strings.SplitN(pa[i], "-", 2)[0])
		}
		if i < len(pb) {
			y, _ = strconv.Atoi(strings.SplitN(pb[i], "-", 2)[0])
		}
		if x != y {
			return x < y
		}
	}
	return false
}

// what the updates remember between runs: the version already announced, and whether they install by themselves
type updPrefs struct {
	Told   string `json:"told,omitempty"`
	Manual bool   `json:"manual,omitempty"` // install only when you press Update now (by default they install by themselves)
	// Test builds (Settings → About, testers and admins only): this PC takes the builds testers try before everyone
	Beta bool `json:"beta,omitempty"`
	// the version this PC had when it left the test builds: until the normal builds reach it, they are not offered
	// (a test build is usually newer, and leaving never installs an older version)
	LeftBeta string `json:"leftBeta,omitempty"`
}

// betaAllowed: the signed-in account may take test builds (a tester or an admin of the server)
func betaAllowed() bool {
	loadPL()
	plMu.Lock()
	defer plMu.Unlock()
	return (plAcc.Tester || plAcc.Admin) && plAcc.Token != ""
}

// updChannel: the folder this PC takes its builds from, "beta/" for the test builds or "" for everyone's. A PC whose
// account is no longer a tester leaves the test builds by itself (keeping the version it has, LeftBeta).
func updChannel() string {
	p := loadUpdPrefs()
	if !p.Beta {
		return ""
	}
	if betaAllowed() {
		return "beta/"
	}
	p.Beta, p.LeftBeta = false, appVersion
	saveUpdPrefs(p)
	return ""
}

// heldBack: a PC that left the test builds is not offered a normal build older than the version it has; once the
// normal builds reach that version, the hold ends
func heldBack(p updPrefs, latest *updateInfo) bool {
	return p.LeftBeta != "" && latest != nil && latest.Channel != "beta" && versionLess(latest.Version, appVersion)
}

func updPrefsPath() string { return filepath.Join(dataDir(), "update.json") }

func loadUpdPrefs() updPrefs {
	var p updPrefs
	if b, err := os.ReadFile(updPrefsPath()); err == nil {
		json.Unmarshal(b, &p)
	}
	return p
}

func saveUpdPrefs(p updPrefs) {
	b, _ := json.Marshal(p)
	os.MkdirAll(dataDir(), 0o700)
	os.WriteFile(updPrefsPath(), b, 0o600)
}

var (
	updMu      sync.Mutex
	updLatest  *updateInfo
	updChecked time.Time
	updErr     string
	updBusy    bool
	updHTTP    = &http.Client{Transport: tlsTransport(), Timeout: 5 * time.Minute}
)

// updateBase: where the builds live (an R2 bucket behind the server, see cloud/src/downloads.js)
func updateBase() string {
	return "https://pitlanehq.app/dl/"
}

func checkUpdate() error {
	if localServer() != "" {
		return errors.New("local mode: no updates, nothing leaves this PC")
	}
	dir := updChannel()
	resp, err := (&http.Client{Transport: tlsTransport(), Timeout: 20 * time.Second}).Get(updateBase() + dir + "version.json")
	if err != nil {
		return fmt.Errorf("could not check for updates: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("could not check for updates (HTTP %d)", resp.StatusCode)
	}
	var u updateInfo
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<14)).Decode(&u); err != nil || u.Build == "" {
		return errors.New("the downloads page has no version information yet")
	}
	if dir != "" {
		u.Channel = "beta"
	}
	if p := loadUpdPrefs(); p.LeftBeta != "" && !heldBack(p, &u) && u.Channel != "beta" {
		p.LeftBeta = "" // the normal builds have caught up
		saveUpdPrefs(p)
	}
	updMu.Lock()
	updLatest, updChecked, updErr = &u, time.Now(), ""
	updMu.Unlock()
	return nil
}

func updateStatus() map[string]any {
	updMu.Lock()
	defer updMu.Unlock()
	prefs := loadUpdPrefs()
	avail := updLatest != nil && buildID != "dev" && updLatest.Build != buildID && !heldBack(prefs, updLatest)
	// required: this version is older than the newest one's minimum, so it no longer works properly
	required := avail && updLatest.Min != "" && versionLess(appVersion, updLatest.Min)
	on := updateSupported && buildID != "dev" && localServer() == "" && !underSteam() && !storeApp() // local mode: no updates (the local server has none); under Steam, Steam updates; from the Microsoft Store, the Store
	m := map[string]any{"version": appVersion, "build": buildID, "available": avail, "required": required, "busy": updBusy, "error": updErr, "supported": on,
		"auto": !prefs.Manual, "beta": prefs.Beta, "betaOk": betaAllowed(), "autoWorks": on && (!engineMode || desktopNext() != ""), "store": storeApp()}
	if updLatest != nil {
		m["latest"] = updLatest
	}
	if !updChecked.IsZero() {
		m["checked"] = updChecked.UnixMilli()
	}
	return m
}

// updateNudge: the server says which build is the newest (the X-Pitlane-Build header of its answers, every sync):
// a PC on another build checks at once instead of at its next look, so a fix reaches every PC within a minute of
// the moment it is not driving. true when a check was started (at most one every two minutes).
var (
	updNudgeMu sync.Mutex
	updNudgeAt time.Time
	updCheck   = checkUpdate // tests replace it
)

func updateNudge(build string) bool {
	// the server names everyone's newest build: a PC on the test builds checks its own folder on its own schedule
	return nudgeBuild(build, updateSupported && localServer() == "" && !underSteam() && !storeApp() && !loadUpdPrefs().Beta)
}

// nudgeBuild: updateNudge's decision, with "updates work here" given (tests)
func nudgeBuild(build string, on bool) bool {
	build = strings.TrimSpace(build)
	if build == "" || buildID == "dev" || build == buildID || !on {
		return false
	}
	updMu.Lock()
	known := updLatest != nil && updLatest.Build == build
	updMu.Unlock()
	if known {
		return false
	}
	updNudgeMu.Lock()
	defer updNudgeMu.Unlock()
	if time.Since(updNudgeAt) < 2*time.Minute {
		return false
	}
	updNudgeAt = time.Now()
	go func() {
		if err := updCheck(); err != nil {
			updMu.Lock()
			updErr = err.Error()
			updMu.Unlock()
		}
	}()
	return true
}

// updateWatcher checks 20 seconds after start and then every 10 minutes (and at once when the server names a
// newer build, updateNudge). A new version shows a Windows notification (once per build) and the banner in the
// app, and installs by itself as soon as no sim is running (unless you switched that off): Pitlane HQ restarts
// on the new version with its windows.
func updateWatcher() {
	cleanOldFiles()
	if localServer() != "" || underSteam() || storeApp() { // local mode: nothing to check, no internet; under Steam or from the Microsoft Store, they keep the files
		return
	}
	if os.Getenv("PITLANE_UPDATED") != "" && buildID != "dev" {
		go func() {
			time.Sleep(8 * time.Second)
			notify("Pitlane HQ "+appVersion+" is installed", "Updated by itself. Your settings and laps are kept; see what's new in Settings → About.")
		}()
	}
	started := time.Now()
	time.Sleep(20 * time.Second)
	var last time.Time
	for {
		if buildID != "dev" {
			if time.Since(last) >= 10*time.Minute {
				last = time.Now()
				if err := checkUpdate(); err != nil {
					updMu.Lock()
					updErr = err.Error()
					updMu.Unlock()
				}
			}
			if st := updateStatus(); st["available"] == true {
				updMu.Lock()
				l := *updLatest
				busy := updBusy
				updMu.Unlock()
				p := loadUpdPrefs()
				v := l.Version
				if v == "" {
					v = "new"
				}
				if p.Told != l.Build {
					p.Told = l.Build
					saveUpdPrefs(p)
					if p.Manual || (engineMode && desktopNext() == "") {
						notify("Pitlane HQ "+v+" is available", "Open Pitlane HQ and press Update now. Your settings and laps are kept.")
					} else {
						notify("Pitlane HQ "+v+" is available", "It installs by itself as soon as you are not driving. Your settings and laps are kept.")
					}
				}
				// by itself: not while a sim is running, not in the first minutes after starting. A required
				// update (this version is older than the newest one's minimum: it no longer works properly) goes
				// in as soon as the car is not on the track (the menus, the garage), whatever the "Update now
				// only" choice; never while driving
				required := st["required"] == true
				idle := !currentStatus().Connected || (required && telNums([]string{"IsOnTrack"})[0] <= 0)
				if (!p.Manual || required) && (!engineMode || desktopNext() != "") && updateSupported && !busy && idle && time.Since(started) > 2*time.Minute {
					updMu.Lock()
					updBusy = true
					updMu.Unlock()
					err := applyUpdate()
					updMu.Lock()
					updBusy = false
					if err != nil {
						updErr = err.Error()
					}
					updMu.Unlock()
					if err == nil {
						return // restarting on the new version
					}
					log.Println("Update:", err)
					last = time.Now() // try again at the next check
				}
			}
		}
		time.Sleep(time.Minute)
	}
}

// cleanOldFiles removes the .old files left by the previous update.
func cleanOldFiles() {
	exe, err := os.Executable()
	if err != nil {
		return
	}
	// the program's folder and its sub-folders (the native window's files)
	filepath.WalkDir(filepath.Dir(exe), func(p string, d os.DirEntry, err error) error {
		if err == nil && !d.IsDir() && strings.HasSuffix(p, ".old") {
			os.Remove(p)
		}
		return nil
	})
}

// applyUpdate downloads the new version, puts its files next to the running
// .exe and starts it. The current files are kept as .old until the next start.
func applyUpdate() error {
	if storeApp() {
		return errors.New("the Microsoft Store keeps Pitlane HQ up to date")
	}
	if !updateSupported || buildID == "dev" || localServer() != "" || underSteam() {
		return errors.New("updates work in the Windows app downloaded from the downloads page")
	}
	if err := checkUpdate(); err != nil {
		return err
	}
	updMu.Lock()
	latest := *updLatest
	updMu.Unlock()
	if latest.Build == buildID {
		return errors.New("you already have the latest version")
	}
	from := ""
	updMu.Lock()
	if updLatest != nil && updLatest.Channel == "beta" {
		from = "beta/" // the files of the version the PC was told about
	}
	updMu.Unlock()
	resp, err := updHTTP.Get(updateBase() + from + "PitlaneHQ-windows.zip")
	if err != nil {
		return fmt.Errorf("could not download the update: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("could not download the update (HTTP %d)", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 200<<20))
	if err != nil {
		return fmt.Errorf("the download was interrupted: %w", err)
	}
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return errors.New("the downloaded file is damaged; try again")
	}
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	dir := filepath.Dir(exe)
	hasExe := false
	for _, f := range zr.File {
		if isProgramName(filepath.Base(f.Name)) {
			hasExe = true
		}
	}
	if !hasExe {
		return errors.New("the download does not contain PitlaneHQ.exe")
	}
	// installs made while the app was called TrackIQ keep their TrackIQ.exe name (shortcuts point
	// to it): the new program replaces that file instead of appearing beside it under another name
	exeName := "PitlaneHQ.exe"
	if strings.EqualFold(filepath.Base(exe), "TrackIQ.exe") {
		exeName = "TrackIQ.exe"
	}
	var newExe string
	for _, f := range zr.File {
		rel := strings.Trim(strings.ReplaceAll(f.Name, `\`, "/"), "/")
		name := filepath.Base(rel)
		if f.FileInfo().IsDir() || name == "" || name == "." || name == ".." || strings.Contains(rel, "..") || strings.Contains(rel, ":") {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		b, err := io.ReadAll(io.LimitReader(rc, 200<<20))
		rc.Close()
		if err != nil {
			return err
		}
		dst := filepath.Join(dir, filepath.FromSlash(rel))
		if !strings.HasPrefix(filepath.Clean(dst), filepath.Clean(dir)+string(filepath.Separator)) {
			continue
		}
		os.MkdirAll(filepath.Dir(dst), 0o755)
		if isProgramName(name) && !strings.Contains(rel, "/") {
			// write the new .exe beside the old one, then swap names
			dst = filepath.Join(dir, exeName)
			if strings.EqualFold(filepath.Base(exe), exeName) || filepath.Clean(exe) == filepath.Clean(dst) {
				os.Remove(exe + ".old")
				if err := os.Rename(exe, exe+".old"); err != nil {
					return fmt.Errorf("could not replace the program: %w", err)
				}
			}
			newExe = dst
		} else if _, err := os.Stat(dst); err == nil {
			os.Remove(dst + ".old")
			os.Rename(dst, dst+".old")
		}
		if err := os.WriteFile(dst, b, 0o755); err != nil {
			if newExe == dst {
				os.Rename(exe+".old", exe) // put the old one back
			}
			return fmt.Errorf("could not write %s: %w", name, err)
		}
	}
	log.Println("Updated to", latest.Version, latest.Build)
	go func() {
		time.Sleep(800 * time.Millisecond)
		// the window's engine: the window starts again on the new version (and starts its new engine)
		if d := desktopNext(); engineMode && d != "" {
			fmt.Println("PITLANEHQ_RESTART=" + d)
			time.Sleep(3 * time.Second)
			quitApp()
			return
		}
		restartInto(newExe)
	}()
	return nil
}

// isProgramName: the program inside an update zip, under its name or the one it had while the
// app was called TrackIQ (0.5–0.6.1).
func isProgramName(n string) bool {
	return strings.EqualFold(n, "PitlaneHQ.exe") || strings.EqualFold(n, "TrackIQ.exe")
}

func registerUpdateRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/update", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			var err error
			switch r.URL.Query().Get("action") {
			case "check":
				err = checkUpdate()
			case "auto": // install by themselves (on) or only with Update now (off)
				p := loadUpdPrefs()
				p.Manual = r.URL.Query().Get("on") != "1"
				saveUpdPrefs(p)
			case "beta": // Test builds on or off (testers and admins)
				on := r.URL.Query().Get("on") == "1"
				if on && !betaAllowed() {
					err = errors.New("test builds are for testers")
					break
				}
				p := loadUpdPrefs()
				if p.Beta != on {
					p.Beta = on
					if on {
						p.LeftBeta = ""
					} else {
						p.LeftBeta = appVersion
					}
					saveUpdPrefs(p)
				}
				updMu.Lock()
				updLatest = nil // the other folder's version is not this one's
				updMu.Unlock()
				err = checkUpdate()
			case "apply":
				updMu.Lock()
				busy := updBusy
				updBusy = true
				updMu.Unlock()
				if busy {
					err = errors.New("already updating")
					break
				}
				err = applyUpdate()
				updMu.Lock()
				updBusy = false
				updMu.Unlock()
				if err == nil {
					writeJSON(w, map[string]any{"restarting": true})
					return
				}
			}
			if err != nil {
				updMu.Lock()
				updErr = err.Error()
				updMu.Unlock()
				w.WriteHeader(400)
				writeJSON(w, map[string]string{"error": err.Error()})
				return
			}
		}
		// the banner asks every few minutes: an answer older than a quarter of an hour is checked again
		updMu.Lock()
		stale := time.Since(updChecked) > 15*time.Minute && !updBusy
		updMu.Unlock()
		if r.Method == http.MethodGet && stale && buildID != "dev" {
			checkUpdate()
		}
		writeJSON(w, updateStatus())
	})
}
