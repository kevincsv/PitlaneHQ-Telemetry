package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const testSVM = "VehicleClassSetting=\"Ford_Mustang_LMGT3 GT3 WEC2025\"\r\nUpgradeSetting=(133186,0,0,0)\r\n\r\n[GENERAL]\r\nNotes=\"\"\r\n"

func TestSvmCarAndVdf(t *testing.T) {
	if c := svmCar([]byte(testSVM)); c != "ford_mustang_lmgt3" {
		t.Fatalf("car %q", c)
	}
	if c := svmCar([]byte("[GENERAL]\nNotes=\"\"")); c != "" {
		t.Fatalf("no car: %q", c)
	}
	v := []byte("\"libraryfolders\"\n{\n \"0\"\n {\n  \"path\"\t\t\"C:\\\\Program Files (x86)\\\\Steam\"\n }\n \"1\"\n {\n  \"path\"\t\t\"D:\\\\SteamLibrary\"\n }\n}")
	if p := vdfPaths(v); len(p) != 2 || p[1] != `D:\SteamLibrary` {
		t.Fatalf("vdf %q", p)
	}
}

func TestLMUSetupsInstallAndList(t *testing.T) {
	root := t.TempDir()
	os.MkdirAll(filepath.Join(root, "Spa"), 0o755)
	os.MkdirAll(filepath.Join(root, "Circuit Of The Americas"), 0o755)
	if f := lmuTrackFolder(root, "Circuit de Spa-Francorchamps"); f != "Spa" {
		t.Fatalf("track folder %q", f)
	}
	if f := lmuTrackFolder(root, "Circuit of the Americas"); f != "Circuit Of The Americas" {
		t.Fatalf("track folder %q", f)
	}
	if f := lmuTrackFolder(root, "Fuji Speedway"); f != "" {
		t.Fatalf("no folder yet: %q", f)
	}
	// into the folder that is there (another case), named after its author
	p, err := installLMUSetup(root, "SPA", "OSW_RACE_Spa_Fast", "OSW Sim Sports", []byte(testSVM))
	if err != nil || filepath.Base(filepath.Dir(p)) != "Spa" || filepath.Base(p) != "OSW_RACE_Spa_Fast (OSW Sim Sports).svm" {
		t.Fatalf("install %q %v", p, err)
	}
	// the same file again: kept once; another one with the same name: a second file
	if p2, _ := installLMUSetup(root, "Spa", "OSW_RACE_Spa_Fast", "OSW Sim Sports", []byte(testSVM)); p2 != p {
		t.Fatalf("installed twice: %q", p2)
	}
	if p3, _ := installLMUSetup(root, "Spa", "OSW_RACE_Spa_Fast", "OSW Sim Sports", []byte(testSVM+"x")); !strings.HasSuffix(p3, " 2.svm") {
		t.Fatalf("second file %q", p3)
	}
	// a new track folder is made
	if p, err := installLMUSetup(root, "Portimao", "race", "", []byte(testSVM)); err != nil || filepath.Base(filepath.Dir(p)) != "Portimao" {
		t.Fatalf("new folder %q %v", p, err)
	}
	for _, bad := range []string{"..", "../x", `a\b`, ""} {
		if _, err := installLMUSetup(root, bad, "x", "", []byte(testSVM)); err == nil {
			t.Fatalf("%q allowed", bad)
		}
	}
	if _, err := installLMUSetup(root, "Spa", "x", "", []byte("not a setup")); err == nil {
		t.Fatal("a file that is not a setup was written")
	}
	setupsMu.Lock()
	setupsMeta = map[string]*setupMeta{"lmu:Spa/OSW_RACE_Spa_Fast (OSW Sim Sports).svm": {Shared: true}}
	setupsMu.Unlock()
	list := listLMUSetups(root)
	n, shared := 0, 0
	for _, g := range list {
		for _, f := range g.Files {
			n++
			if f.Vehicle != "ford_mustang_lmgt3" || f.Track != g.Car {
				t.Fatalf("file %+v", f)
			}
			if f.Shared {
				shared++
			}
		}
	}
	if n != 3 || shared != 1 {
		t.Fatalf("listed %d, shared %d", n, shared)
	}
}
