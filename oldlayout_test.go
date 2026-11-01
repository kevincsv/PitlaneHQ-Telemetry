package main

import (
	"encoding/binary"
	"os"
	"path/filepath"
	"sort"
	"testing"
)

// fakePE: the smallest PE32+ debug/pe reads, with or without a CLR header (a .NET assembly or a native DLL)
func fakePE(managed bool) []byte {
	b := make([]byte, 0x40+4+20+240)
	binary.LittleEndian.PutUint16(b[0:], 0x5a4d) // MZ
	binary.LittleEndian.PutUint32(b[0x3c:], 0x40)
	copy(b[0x40:], "PE\x00\x00")
	fh := b[0x44:]
	binary.LittleEndian.PutUint16(fh[0:], 0x8664) // AMD64
	binary.LittleEndian.PutUint16(fh[16:], 240)   // SizeOfOptionalHeader
	oh := b[0x44+20:]
	binary.LittleEndian.PutUint16(oh[0:], 0x20b) // PE32+
	binary.LittleEndian.PutUint32(oh[108:], 16)  // NumberOfRvaAndSizes
	if managed {
		binary.LittleEndian.PutUint32(oh[112+14*8:], 0x2000)
		binary.LittleEndian.PutUint32(oh[112+14*8+4:], 0x48)
	}
	return b
}

// fakeHost: a window program, a single-file bundle (the marker with an offset) or the old small host (offset 0)
func fakeHost(bundle bool) []byte {
	b := make([]byte, 4096)
	off := 1000
	if bundle {
		binary.LittleEndian.PutUint64(b[off-8:], 123456)
	}
	copy(b[off:], bundleMarker)
	return b
}

func writeFiles(t *testing.T, dir string, files map[string][]byte) {
	for n, b := range files {
		p := filepath.Join(dir, filepath.FromSlash(n))
		os.MkdirAll(filepath.Dir(p), 0o755)
		if err := os.WriteFile(p, b, 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

func listDir(t *testing.T, dir string) []string {
	var out []string
	filepath.WalkDir(dir, func(p string, d os.DirEntry, err error) error {
		if err == nil && !d.IsDir() {
			r, _ := filepath.Rel(dir, p)
			out = append(out, filepath.ToSlash(r))
		}
		return nil
	})
	sort.Strings(out)
	return out
}

func TestCleanOldLayoutAfterUpdate(t *testing.T) {
	dir := t.TempDir()
	native, managed := fakePE(false), fakePE(true)
	writeFiles(t, dir, map[string][]byte{
		// the new single-file window and the native files it keeps beside it
		"PitlaneHQ.Desktop.exe": fakeHost(true), "wpfgfx_cor3.dll": native, "D3DCompiler_47_cor3.dll": native,
		"PenImc_cor3.dll": native, "PresentationNative_cor3.dll": native, "vcruntime140_cor3.dll": native,
		"WebView2Loader.dll": native,
		// the agent, the installer's files
		"PitlaneHQ.exe": native, "EULA.txt": []byte("x"), "PRIVACY.md": []byte("x"), "THIRD_PARTY_NOTICES.md": []byte("x"),
		"unins000.exe": native, "unins000.dat": []byte("x"),
		// the old loose layout
		"hostfxr.dll": native, "hostpolicy.dll": native, "coreclr.dll": native, "clrjit.dll": native,
		"mscordaccore_amd64_amd64_8.0.3126.4.dll": native, "mscordaccore.dll": native, "msquic.dll": native,
		"Microsoft.CSharp.dll": managed, "PresentationCore.dll": managed, "PitlaneHQ.Desktop.dll": managed,
		"PitlaneHQ.Desktop.deps.json": []byte("{}"), "PitlaneHQ.Desktop.runtimeconfig.json": []byte("{}"),
		"createdump.exe": native, "Microsoft.Web.WebView2.Core.xml": []byte("x"),
		"runtimes/win-x64/native/WebView2Loader.dll": native,
	})
	if n := cleanOldLayout(dir); n == 0 {
		t.Fatal("nothing removed")
	}
	want := []string{"D3DCompiler_47_cor3.dll", "EULA.txt", "PRIVACY.md", "PenImc_cor3.dll", "PitlaneHQ.Desktop.exe",
		"PitlaneHQ.exe", "PresentationNative_cor3.dll", "THIRD_PARTY_NOTICES.md", "WebView2Loader.dll", "unins000.dat",
		"unins000.exe", "vcruntime140_cor3.dll", "wpfgfx_cor3.dll"}
	sort.Strings(want)
	got := listDir(t, dir)
	if len(got) != len(want) {
		t.Fatalf("left %v, want %v", got, want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("left %v, want %v", got, want)
		}
	}
	// a second start finds nothing to do
	if n := cleanOldLayout(dir); n != 0 {
		t.Fatalf("second pass removed %d", n)
	}
}

// the old window (loose files, a small host) keeps every file: they are what it runs on
func TestCleanOldLayoutKeepsLooseWindow(t *testing.T) {
	dir := t.TempDir()
	writeFiles(t, dir, map[string][]byte{
		"PitlaneHQ.Desktop.exe": fakeHost(false), "hostfxr.dll": fakePE(false), "coreclr.dll": fakePE(false),
		"PresentationCore.dll": fakePE(true), "PitlaneHQ.Desktop.dll": fakePE(true),
	})
	if n := cleanOldLayout(dir); n != 0 {
		t.Fatalf("removed %d files of a working loose install", n)
	}
	if len(listDir(t, dir)) != 5 {
		t.Fatal("files gone")
	}
}

func TestIsManagedDLL(t *testing.T) {
	dir := t.TempDir()
	writeFiles(t, dir, map[string][]byte{"a.dll": fakePE(true), "b.dll": fakePE(false), "c.dll": []byte("not a PE")})
	if !isManagedDLL(filepath.Join(dir, "a.dll")) || isManagedDLL(filepath.Join(dir, "b.dll")) || isManagedDLL(filepath.Join(dir, "c.dll")) {
		t.Fatal("wrong")
	}
}
