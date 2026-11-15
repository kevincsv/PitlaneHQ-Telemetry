//go:build windows

package main

// Uninstalling always asks why. The installer's own uninstaller (unins000.exe) is never replaced by the app's
// updates, so a PC installed before the uninstaller learnt to open the "Why did you uninstall Pitlane HQ?" page
// (pitlanehq.app/uninstalled) never showed it. The agent now puts itself in front of it: every start it points
// Windows' Uninstall entry at `PitlaneHQ.exe -uninstall` (uninstallHook), which copies itself to the temp folder
// (the app folder is about to go, and the uninstaller closes every PitlaneHQ.exe), asks once, runs the installer's
// uninstaller without its own questions and, once the app is gone, opens the page in the browser. Whatever goes
// wrong on the way, the installer's uninstaller runs as before.

import (
	"io"
	"log"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

const (
	uninstallKey  = `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\{6F1E2B7A-4C59-4E8B-9C3D-PITLANEHQ001}_is1`
	uninstallCopy = "PitlaneHQ-uninstall.exe" // never PitlaneHQ.exe: the uninstaller ends every program of that name
	uninstallPage = "https://pitlanehq.app/uninstalled"
)

var (
	procMessageBoxW    = user32.NewProc("MessageBoxW")
	procGetUILanguage  = syscall.NewLazyDLL("kernel32.dll").NewProc("GetUserDefaultUILanguage")
	uninstallQuestions = map[string][2]string{
		"en": {"Uninstall Pitlane HQ", "Remove Pitlane HQ and everything it keeps on this PC?"},
		"es": {"Desinstalar Pitlane HQ", "¿Quitar Pitlane HQ y todo lo que guarda en este PC?"},
		"pt": {"Desinstalar o Pitlane HQ", "Remover o Pitlane HQ e tudo o que ele guarda neste PC?"},
	}
)

// windowsLang: Windows' own language as one of the app's (en, es, pt)
func windowsLang() string {
	id, _, _ := procGetUILanguage.Call()
	switch id & 0x3ff {
	case 0x0a:
		return "es"
	case 0x16:
		return "pt"
	}
	return "en"
}

func uninstallerOf(dir string) string { return filepath.Join(dir, "unins000.exe") }

// uninstallHook: Windows' "Uninstall" for Pitlane HQ starts this program with -uninstall. Only for the installer's
// copy (its Uninstall entry and its uninstaller are there); the Microsoft Store and Steam remove their own.
func uninstallHook() {
	if storeApp() || underSteam() {
		return
	}
	exe, err := os.Executable()
	if err != nil {
		return
	}
	if _, err := os.Stat(uninstallerOf(filepath.Dir(exe))); err != nil {
		return
	}
	q := exec.Command("reg", "query", uninstallKey, "/v", "UninstallString")
	hideChildWindow(q)
	out, err := q.Output()
	if err != nil {
		return // not installed with the installer
	}
	want := `"` + exe + `" -uninstall`
	if strings.Contains(string(out), want) {
		return
	}
	cmd := exec.Command("reg", "add", uninstallKey, "/v", "UninstallString", "/t", "REG_SZ", "/d", want, "/f")
	hideChildWindow(cmd)
	if err := cmd.Run(); err != nil {
		log.Println("uninstall entry:", err)
	}
}

// runUninstall: `PitlaneHQ.exe -uninstall`, started by Windows from the app's folder. It hands over to a copy of
// itself in the temp folder and leaves; if that cannot be done the installer's uninstaller runs as it always did.
func runUninstall() {
	exe, err := os.Executable()
	if err != nil {
		return
	}
	dir := filepath.Dir(exe)
	un := uninstallerOf(dir)
	plain := func() { exec.Command(un).Start() }
	if _, err := os.Stat(un); err != nil {
		return
	}
	tmp := filepath.Join(os.TempDir(), uninstallCopy)
	if err := copyFile(exe, tmp); err != nil {
		plain()
		return
	}
	if err := exec.Command(tmp, "-uninstall-run", dir).Start(); err != nil {
		plain()
	}
}

func copyFile(from, to string) error {
	in, err := os.Open(from)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(to)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}

// runUninstallFrom: the copy in the temp folder. One question, then the installer's uninstaller (silent: it asks
// nothing more and opens no page of its own), and once the app's folder has lost its uninstaller the page that asks
// why opens in the browser.
func runUninstallFrom(dir string) {
	defer removeSelfLater()
	un := uninstallerOf(dir)
	if _, err := os.Stat(un); err != nil {
		return
	}
	lang := windowsLang()
	t := uninstallQuestions[lang]
	title, _ := syscall.UTF16PtrFromString(t[0])
	text, _ := syscall.UTF16PtrFromString(t[1])
	// MB_YESNO | MB_ICONQUESTION | MB_SETFOREGROUND | MB_TOPMOST; IDYES = 6
	if r, _, _ := procMessageBoxW.Call(0, uintptr(unsafe.Pointer(text)), uintptr(unsafe.Pointer(title)), 0x4|0x20|0x10000|0x40000); r != 6 {
		return
	}
	if err := exec.Command(un, "/SILENT").Run(); err != nil {
		// it could not start silently: the installer's own uninstaller, with its own questions and page
		exec.Command(un).Start()
		return
	}
	// the uninstaller goes on in a copy of its own and removes itself last: 10 minutes at most
	for i := 0; i < 1200; i++ {
		if _, err := os.Stat(un); os.IsNotExist(err) {
			openUninstallPage(lang)
			return
		}
		time.Sleep(500 * time.Millisecond)
	}
}

func openUninstallPage(lang string) {
	u := uninstallPage + "?v=" + url.QueryEscape(appVersion) + "&lang=" + lang
	cmd := exec.Command("rundll32", "url.dll,FileProtocolHandler", u)
	hideChildWindow(cmd)
	cmd.Start()
}

// removeSelfLater: the copy in the temp folder deletes itself a moment after it ends
func removeSelfLater() {
	exe, err := os.Executable()
	if err != nil || !strings.EqualFold(filepath.Base(exe), uninstallCopy) {
		return
	}
	cmd := exec.Command("cmd")
	hideChildWindow(cmd)
	// the whole line as cmd reads it (Go's own quoting is not cmd's)
	cmd.SysProcAttr.CmdLine = `cmd /c ping -n 4 127.0.0.1 >nul & del /f /q "` + exe + `"`
	cmd.Start()
}
