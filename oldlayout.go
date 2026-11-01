package main

// The window used to ship as ~250 loose files (the .NET runtime, WPF, Windows Forms, WebView2) in the app's folder.
// It is one PitlaneHQ.Desktop.exe now (single-file publish) with only the native files WPF and WebView2 load beside it.
// The updater of the version before only adds and replaces files, so a PC that updated by itself keeps the old loose
// files: the new agent removes them once (the installer does the same with its [InstallDelete]).

import (
	"bytes"
	"debug/pe"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// bundleMarker: the .NET host's mark for a single-file bundle, followed in the file by the bundle's offset (0 when the
// program is not a bundle)
var bundleMarker = []byte{
	0x8b, 0x12, 0x02, 0xb9, 0x6a, 0x61, 0x20, 0x38, 0x72, 0x7b, 0x93, 0x02, 0x14, 0xd7, 0xa0, 0x32,
	0x13, 0xf5, 0xb9, 0xe6, 0xef, 0xae, 0x33, 0x18, 0xee, 0x3b, 0x2d, 0xce, 0x24, 0xb3, 0x6a, 0xae,
}

// isSingleFileBundle: the program is a .NET single-file bundle (the mark with a non-zero offset in front of it)
func isSingleFileBundle(path string) bool {
	f, err := os.Open(path)
	if err != nil {
		return false
	}
	defer f.Close()
	// the mark sits in the host, the first few MB of the file
	b, err := io.ReadAll(io.LimitReader(f, 48<<20))
	if err != nil {
		return false
	}
	i := bytes.Index(b, bundleMarker)
	if i < 8 {
		return false
	}
	var off uint64
	for k := 0; k < 8; k++ {
		off |= uint64(b[i-8+k]) << (8 * k)
	}
	return off != 0
}

// oldLayoutNative: the runtime's own native files of the old layout (the new one has none of them beside the window)
var oldLayoutNative = map[string]bool{
	"clretwrc.dll": true, "clrgc.dll": true, "clrjit.dll": true, "coreclr.dll": true, "hostfxr.dll": true,
	"hostpolicy.dll": true, "mscordaccore.dll": true, "mscordbi.dll": true, "mscorrc.dll": true, "msquic.dll": true,
	"microsoft.diasymreader.native.amd64.dll": true, "system.io.compression.native.dll": true,
	"createdump.exe": true, "pitlanehq.desktop.deps.json": true, "pitlanehq.desktop.runtimeconfig.json": true,
	"pitlanehq.desktop.pdb": true, "pitlanehq.desktop.dll": true,
}

// isManagedDLL: a .NET assembly (a PE with a CLR header); a single-file window keeps none of them beside it
func isManagedDLL(path string) bool {
	f, err := pe.Open(path)
	if err != nil {
		return false
	}
	defer f.Close()
	const clrHeader = 14 // IMAGE_DIRECTORY_ENTRY_COM_DESCRIPTOR
	switch h := f.OptionalHeader.(type) {
	case *pe.OptionalHeader64:
		return h.NumberOfRvaAndSizes > clrHeader && h.DataDirectory[clrHeader].Size != 0
	case *pe.OptionalHeader32:
		return h.NumberOfRvaAndSizes > clrHeader && h.DataDirectory[clrHeader].Size != 0
	}
	return false
}

// oldLayoutFile: a file of the old loose layout that the single-file window no longer uses
func oldLayoutFile(dir, name string) bool {
	n := strings.ToLower(name)
	switch {
	case oldLayoutNative[n]:
		return true
	case strings.HasPrefix(n, "mscordaccore_") && strings.HasSuffix(n, ".dll"): // one per .NET version, they piled up
		return true
	case strings.HasPrefix(n, "microsoft.web.webview2.") && strings.HasSuffix(n, ".xml"):
		return true
	case strings.HasSuffix(n, ".dll"):
		return isManagedDLL(filepath.Join(dir, name))
	}
	return false
}

// removeOrRetire deletes a file, or renames it to .old when it is in use (cleanOldFiles removes it at the next start)
func removeOrRetire(p string) {
	if os.Remove(p) == nil {
		return
	}
	os.Remove(p + ".old")
	os.Rename(p, p+".old")
}

// cleanOldLayout removes the old loose files from dir once the window there is a single-file bundle. It only looks
// when hostfxr.dll is there (every old layout has it, the new one never), so a normal start costs one Stat.
func cleanOldLayout(dir string) int {
	if _, err := os.Stat(filepath.Join(dir, "hostfxr.dll")); err != nil {
		return 0
	}
	if !isSingleFileBundle(filepath.Join(dir, desktopExeName)) {
		return 0
	}
	ents, err := os.ReadDir(dir)
	if err != nil {
		return 0
	}
	n, done := 0, true
	for _, e := range ents {
		name := e.Name()
		if e.IsDir() {
			// WebView2Loader.dll sits next to the window now, never in runtimes\
			if strings.EqualFold(name, "runtimes") {
				if os.RemoveAll(filepath.Join(dir, name)) == nil {
					n++
				} else {
					done = false
				}
			}
			continue
		}
		if strings.EqualFold(name, "hostfxr.dll") {
			continue
		}
		if oldLayoutFile(dir, name) {
			removeOrRetire(filepath.Join(dir, name))
			n++
		}
	}
	// hostfxr.dll last: while it is there, the next start looks again
	if done {
		removeOrRetire(filepath.Join(dir, "hostfxr.dll"))
		n++
	}
	return n
}
