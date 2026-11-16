package main

// Setup library: lists your iRacing setups (Documents\iRacing\setups), keeps
// notes and tags for each one, and remembers your best lap at each track
// with each setup (recorded by the lap recorder).

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type setupMeta struct {
	Notes     string             `json:"notes,omitempty"`
	Tags      []string           `json:"tags,omitempty"`
	Bests     map[string]float64 `json:"bests,omitempty"`     // track → best valid lap (s)
	Shared    bool               `json:"shared,omitempty"`    // shared with the other drivers from this PC
	Dismissed bool               `json:"dismissed,omitempty"` // "Not now" on the offer to share it
}

// metaKey: iRacing's keys stay as they were ("car folder/file.sto"); the other games' have the game first.
func metaKey(game, key string) string {
	if game == "" || game == "iracing" {
		return key
	}
	return game + ":" + key
}

func setupMetaInto(f *setupFile, m *setupMeta) {
	if m != nil {
		f.Notes, f.Tags, f.Bests, f.Shared, f.Dismissed = m.Notes, m.Tags, m.Bests, m.Shared, m.Dismissed
	}
}

var (
	setupsMu   sync.Mutex
	setupsMeta = map[string]*setupMeta{} // key: "car folder/file.sto"
)

func setupsPath() string { return filepath.Join(activeDir(), "setups.json") }

func loadSetups() {
	m := map[string]*setupMeta{}
	if b, err := os.ReadFile(setupsPath()); err == nil {
		json.Unmarshal(b, &m)
	}
	setupsMu.Lock()
	setupsMeta = m
	setupsMu.Unlock()
}

func saveSetupsLocked() {
	b, _ := json.MarshalIndent(setupsMeta, "", "  ")
	os.MkdirAll(activeDir(), 0o700)
	os.WriteFile(setupsPath(), b, 0o600)
}

// setupsRoot finds Documents\iRacing\setups (also when Documents is in OneDrive).
func setupsRoot() string {
	var cands []string
	if d := documentsDir(); d != "" {
		cands = append(cands, filepath.Join(d, "iRacing", "setups"))
	}
	if h, err := os.UserHomeDir(); err == nil {
		cands = append(cands, filepath.Join(h, "Documents", "iRacing", "setups"), filepath.Join(h, "OneDrive", "Documents", "iRacing", "setups"),
			filepath.Join(h, "OneDrive", "Documentos", "iRacing", "setups"))
	}
	for _, c := range cands {
		if st, err := os.Stat(c); err == nil && st.IsDir() {
			return c
		}
	}
	return ""
}

type setupFile struct {
	Key       string             `json:"key"`
	Name      string             `json:"name"`
	Folder    string             `json:"folder,omitempty"` // sub-folder inside the car folder
	Changed   time.Time          `json:"changed"`
	Size      int64              `json:"size"`
	Notes     string             `json:"notes,omitempty"`
	Tags      []string           `json:"tags,omitempty"`
	Bests     map[string]float64 `json:"bests,omitempty"`
	Track     string             `json:"track,omitempty"`   // LMU: the track folder it is in
	Vehicle   string             `json:"vehicle,omitempty"` // LMU: the car written in the file
	Shared    bool               `json:"shared,omitempty"`
	Dismissed bool               `json:"dismissed,omitempty"`
}

type setupCar struct {
	Car   string      `json:"car"`
	Files []setupFile `json:"files"`
}

func listSetups(root string) []setupCar {
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
		car := setupCar{Car: e.Name(), Files: []setupFile{}}
		base := filepath.Join(root, e.Name())
		filepath.WalkDir(base, func(p string, d os.DirEntry, err error) error {
			if err != nil || d.IsDir() || !strings.EqualFold(filepath.Ext(p), ".sto") || len(car.Files) > 500 {
				return nil
			}
			rel, _ := filepath.Rel(base, p)
			rel = filepath.ToSlash(rel)
			fi, _ := d.Info()
			f := setupFile{Key: e.Name() + "/" + rel, Name: strings.TrimSuffix(filepath.Base(p), filepath.Ext(p))}
			if dir := filepath.ToSlash(filepath.Dir(rel)); dir != "." {
				f.Folder = dir
			}
			if fi != nil {
				f.Changed, f.Size = fi.ModTime(), fi.Size()
			}
			setupMetaInto(&f, setupsMeta[f.Key])
			car.Files = append(car.Files, f)
			return nil
		})
		sort.Slice(car.Files, func(i, j int) bool { return car.Files[i].Changed.After(car.Files[j].Changed) })
		if len(car.Files) > 0 {
			out = append(out, car)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Files[0].Changed.After(out[j].Files[0].Changed) })
	return out
}

// currentCarSetup reads the car folder, setup file and track of the session.
func currentCarSetup() (carPath, carName, setup, track string) {
	tel.mu.RLock()
	y := tel.session
	tel.mu.RUnlock()
	if y == "" {
		return
	}
	if d := driverBlock(y, yamlField(y, "DriverCarIdx")); d != "" {
		carPath, carName = yamlField(d, "CarPath"), yamlField(d, "CarScreenName")
	}
	setup = yamlField(y, "DriverSetupName")
	track = yamlField(y, "TrackDisplayName")
	if c := yamlField(y, "TrackConfigName"); c != "" {
		track += " · " + c
	}
	return
}

// recordSetupLap keeps the best valid lap per setup and track.
func recordSetupLap(lapTime float64) {
	carPath, _, setup, track := currentCarSetup()
	if carPath == "" || setup == "" || track == "" || lapTime <= 0 {
		return
	}
	key := strings.ReplaceAll(carPath, " ", "") + "/" + filepath.ToSlash(setup)
	// the folder name on disk does not always match CarPath exactly: find the file
	if root := setupsRoot(); root != "" {
		for _, c := range listSetupsCars(root) {
			if strings.EqualFold(strings.ReplaceAll(c, " ", ""), strings.ReplaceAll(carPath, " ", "")) {
				key = c + "/" + filepath.ToSlash(setup)
			}
		}
	}
	setupsMu.Lock()
	defer setupsMu.Unlock()
	m := setupsMeta[key]
	if m == nil {
		m = &setupMeta{}
		setupsMeta[key] = m
	}
	if m.Bests == nil {
		m.Bests = map[string]float64{}
	}
	if b, ok := m.Bests[track]; !ok || lapTime < b {
		m.Bests[track] = round(lapTime, 3)
		saveSetupsLocked()
	}
}

func listSetupsCars(root string) []string {
	ents, _ := os.ReadDir(root)
	var out []string
	for _, e := range ents {
		if e.IsDir() {
			out = append(out, e.Name())
		}
	}
	return out
}

func safeSetupPath(root, key string) (string, bool) {
	if root == "" || key == "" || strings.Contains(key, "..") || strings.HasPrefix(key, "/") || strings.Contains(key, ":") {
		return "", false
	}
	p := filepath.Join(root, filepath.FromSlash(key))
	if rel, err := filepath.Rel(root, p); err != nil || strings.HasPrefix(rel, "..") {
		return "", false
	}
	return p, true
}

// setupsRootFor: where the game keeps its setups ("" when the game is not on this PC).
func setupsRootFor(game string) string {
	if game == "lmu" {
		return lmuSetupsRoot()
	}
	return setupsRoot()
}

func setupsExt(game string) string {
	if game == "lmu" {
		return ".svm"
	}
	return ".sto"
}

// setupsGame: the game a request is about (iRacing unless it says Le Mans Ultimate).
func setupsGame(g string) string {
	if g == "lmu" {
		return "lmu"
	}
	return "iracing"
}

// markSetup keeps a flag of a setup file (shared, dismissed).
func markSetup(game, key string, f func(m *setupMeta)) {
	setupsMu.Lock()
	defer setupsMu.Unlock()
	k := metaKey(game, key)
	m := setupsMeta[k]
	if m == nil {
		m = &setupMeta{}
		setupsMeta[k] = m
	}
	f(m)
	saveSetupsLocked()
}

// currentSetupsCar: the car and track the game has loaded now, for the game asked about.
func currentSetupsCar(game, root string) map[string]string {
	carPath, carName, setup, track := currentCarSetup()
	if currentGame() != game {
		return map[string]string{}
	}
	cur := map[string]string{"carPath": carPath, "car": carName, "setup": setup, "track": track}
	if game == "lmu" {
		cur["setup"] = ""
		cur["trackFolder"] = lmuTrackFolder(root, track)
	}
	return cur
}

func registerSetupRoutes(mux *http.ServeMux) {
	// the free setups library on the server (tools/setups-library.mjs), for the PC app's page
	mux.HandleFunc("/api/setups-library", func(w http.ResponseWriter, r *http.Request) {
		b, err := commRequest("GET", "/setups-library/index.json", nil, "")
		if err != nil || !json.Valid(b) {
			w.WriteHeader(502)
			writeJSON(w, map[string]string{"error": "could not reach the Pitlane HQ server"})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(b)
	})
	mux.HandleFunc("/api/setups", func(w http.ResponseWriter, r *http.Request) {
		game := setupsGame(r.URL.Query().Get("game"))
		if r.Method == http.MethodPost {
			var in struct {
				Action, Key, Notes, Game string
				Tags                     []string
			}
			json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&in)
			game = setupsGame(in.Game)
			root := setupsRootFor(game)
			var err error
			switch in.Action {
			case "note":
				if _, ok := safeSetupPath(root, in.Key); !ok {
					err = errors.New("unknown setup")
					break
				}
				if len(in.Notes) > 4000 {
					in.Notes = in.Notes[:4000]
				}
				markSetup(game, in.Key, func(m *setupMeta) {
					m.Notes = in.Notes
					m.Tags = nil
					for _, t := range in.Tags {
						if t = strings.TrimSpace(t); t != "" && len(t) <= 30 && len(m.Tags) < 12 {
							m.Tags = append(m.Tags, t)
						}
					}
				})
			case "dismiss": // "Not now" on the offer to share a new setup
				if _, ok := safeSetupPath(root, in.Key); !ok {
					err = errors.New("unknown setup")
					break
				}
				markSetup(game, in.Key, func(m *setupMeta) { m.Dismissed = true })
			case "show": // open the folder in Explorer with the file selected
				p, ok := safeSetupPath(root, in.Key)
				if !ok {
					err = errors.New("unknown setup")
					break
				}
				err = shellOpen(filepath.Dir(p), "", false)
			case "folder":
				if root == "" {
					err = errors.New("setups folder not found")
				} else {
					err = shellOpen(root, "", false)
				}
			default:
				err = errors.New("unknown action")
			}
			if err != nil {
				w.WriteHeader(400)
				writeJSON(w, map[string]string{"error": err.Error()})
				return
			}
		}
		root := setupsRootFor(game)
		var list []setupCar
		if game == "lmu" {
			list = listLMUSetups(root)
		} else {
			list = listSetups(root)
		}
		writeJSON(w, map[string]any{"game": game, "root": root, "cars": list, "current": currentSetupsCar(game, root)})
	})
}
