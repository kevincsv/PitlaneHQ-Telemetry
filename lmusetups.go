package main

// Le Mans Ultimate's setups: .svm text files in <game>\UserData\player\Settings\<track folder>, one folder per
// track (the game makes it the first time a setup is saved there). The car is written inside the file
// (VehicleClassSetting="Ford_Mustang_LMGT3 GT3 WEC2025").

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// lmuInstallDirs: where Steam may keep Le Mans Ultimate (its own folder, the libraries libraryfolders.vdf
// names, the usual SteamLibrary on each drive).
func lmuInstallDirs() []string {
	var libs []string
	for _, env := range []string{"ProgramFiles(x86)", "ProgramFiles"} {
		if p := os.Getenv(env); p != "" {
			steam := filepath.Join(p, "Steam")
			libs = append(libs, steam)
			if b, err := os.ReadFile(filepath.Join(steam, "steamapps", "libraryfolders.vdf")); err == nil {
				libs = append(libs, vdfPaths(b)...)
			}
		}
	}
	for d := 'C'; d <= 'H'; d++ {
		libs = append(libs, string(d)+`:\SteamLibrary`, string(d)+`:\Steam`, string(d)+`:\Games\SteamLibrary`)
	}
	seen, out := map[string]bool{}, []string{}
	for _, l := range libs {
		p := filepath.Join(l, "steamapps", "common", "Le Mans Ultimate")
		if k := strings.ToLower(p); !seen[k] {
			seen[k] = true
			out = append(out, p)
		}
	}
	return out
}

var vdfPathRe = regexp.MustCompile(`"path"\s+"([^"]+)"`)

// vdfPaths reads the libraries' folders out of Steam's libraryfolders.vdf ("path" "D:\\SteamLibrary").
func vdfPaths(b []byte) []string {
	var out []string
	for _, m := range vdfPathRe.FindAllSubmatch(b, -1) {
		out = append(out, strings.ReplaceAll(string(m[1]), `\\`, `\`))
	}
	return out
}

// lmuSetupsRoot: the game's Settings folder (made when the game is there and it is missing).
func lmuSetupsRoot() string {
	for _, d := range lmuInstallDirs() {
		player := filepath.Join(d, "UserData", "player")
		if st, err := os.Stat(player); err == nil && st.IsDir() {
			p := filepath.Join(player, "Settings")
			os.MkdirAll(p, 0o755)
			return p
		}
	}
	return ""
}

var svmCarRe = regexp.MustCompile(`(?m)^VehicleClassSetting="([^"\s]+)`)

// svmCar: the car a .svm is for, in lower case (ford_mustang_lmgt3), from the top of the file.
func svmCar(data []byte) string {
	if len(data) > 4096 {
		data = data[:4096]
	}
	if m := svmCarRe.FindSubmatch(data); m != nil {
		return strings.ToLower(string(m[1]))
	}
	return ""
}

// svmCarFile reads only the top of a setup file for its car.
func svmCarFile(p string) string {
	f, err := os.Open(p)
	if err != nil {
		return ""
	}
	defer f.Close()
	b := make([]byte, 4096)
	n, _ := bufio.NewReader(f).Read(b)
	return svmCar(b[:n])
}

// listLMUSetups: the .svm setups by track folder, newest first.
func listLMUSetups(root string) []setupCar {
	ents, err := os.ReadDir(root)
	if err != nil {
		return nil
	}
	setupsMu.Lock()
	defer setupsMu.Unlock()
	var out []setupCar
	for _, e := range ents {
		if !e.IsDir() {
			continue
		}
		g := setupCar{Car: e.Name(), Files: []setupFile{}}
		files, _ := os.ReadDir(filepath.Join(root, e.Name()))
		for _, f := range files {
			if f.IsDir() || !strings.EqualFold(filepath.Ext(f.Name()), ".svm") || len(g.Files) >= 500 {
				continue
			}
			key := e.Name() + "/" + f.Name()
			sf := setupFile{Key: key, Name: strings.TrimSuffix(f.Name(), filepath.Ext(f.Name())), Track: e.Name(),
				Vehicle: svmCarFile(filepath.Join(root, e.Name(), f.Name()))}
			if fi, err := f.Info(); err == nil {
				sf.Changed, sf.Size = fi.ModTime(), fi.Size()
			}
			setupMetaInto(&sf, setupsMeta[metaKey("lmu", key)])
			g.Files = append(g.Files, sf)
		}
		sort.Slice(g.Files, func(i, j int) bool { return g.Files[i].Changed.After(g.Files[j].Changed) })
		if len(g.Files) > 0 {
			out = append(out, g)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Files[0].Changed.After(out[j].Files[0].Changed) })
	return out
}

// normWord: letters and digits only, lower case ("Circuit de Spa-Francorchamps" → circuitdespafrancorchamps)
func normWord(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// lmuTrackFolder: the Settings folder of the track the game has loaded (the folder whose name is in the track's
// name or the other way round: "Spa" for "Circuit de Spa-Francorchamps"), "" when there is none yet.
func lmuTrackFolder(root, track string) string {
	t := normWord(track)
	if root == "" || t == "" {
		return ""
	}
	ents, _ := os.ReadDir(root)
	best := ""
	for _, e := range ents {
		n := normWord(e.Name())
		if !e.IsDir() || len(n) < 3 {
			continue
		}
		if n == t {
			return e.Name()
		}
		if (strings.Contains(t, n) || strings.Contains(n, t)) && len(e.Name()) > len(best) {
			best = e.Name()
		}
	}
	return best
}

// installLMUSetup writes a setup into Settings\<track folder> (an existing folder with the same name in another
// case or spelling is used). Only .svm files inside the Settings folder are ever written; nothing is run.
func installLMUSetup(root, track, name, author string, data []byte) (string, error) {
	if root == "" {
		return "", errors.New("Le Mans Ultimate's setups folder was not found")
	}
	if !setupCarRe.MatchString(track) || strings.Contains(track, "..") {
		return "", errors.New("unknown track folder")
	}
	if len(data) == 0 || len(data) > maxSetupSize || svmCar(data) == "" {
		return "", errors.New("not a Le Mans Ultimate setup")
	}
	folder := track
	if ents, err := os.ReadDir(root); err == nil {
		for _, e := range ents {
			if e.IsDir() && normWord(e.Name()) == normWord(track) {
				folder = e.Name()
			}
		}
	}
	dir := filepath.Join(root, folder)
	if rel, err := filepath.Rel(root, dir); err != nil || strings.HasPrefix(rel, "..") || strings.ContainsAny(rel, `\/`) {
		return "", errors.New("bad folder")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	base := strings.TrimSuffix(cleanSetupName(name), ".svm")
	if a := cleanSetupName(author); author != "" && a != "setup" {
		base += " (" + a + ")"
	}
	p := filepath.Join(dir, base+".svm")
	for i := 2; ; i++ {
		if old, err := os.ReadFile(p); err != nil {
			break
		} else if bytes.Equal(old, data) {
			return p, nil // already installed
		}
		p = filepath.Join(dir, fmt.Sprintf("%s %d.svm", base, i))
	}
	return p, os.WriteFile(p, data, 0o644)
}
