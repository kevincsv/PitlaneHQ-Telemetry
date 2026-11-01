//go:build windows

package main

import (
	"sync"
	"syscall"
	"unsafe"
)

// storeApp: Pitlane HQ installed from the Microsoft Store (the MSIX package, msix/). The Store keeps the files up to
// date, so the app's own updater stays off, and Windows' startup task starts it with Windows (the window turns it
// on and off, desktop/PitlaneHQ.Desktop/Store.cs), not the Run entry.
var (
	storeOnce sync.Once
	storeOn   bool
)

func storeApp() bool {
	storeOnce.Do(func() {
		proc := syscall.NewLazyDLL("kernel32.dll").NewProc("GetCurrentPackageFullName")
		if proc.Find() != nil {
			return // Windows 7/8: no packages
		}
		var n uint32
		r, _, _ := proc.Call(uintptr(unsafe.Pointer(&n)), 0)
		// APPMODEL_ERROR_NO_PACKAGE (15700): a normal install; ERROR_INSUFFICIENT_BUFFER (122): it has a package
		storeOn = r == 122
	})
	return storeOn
}
