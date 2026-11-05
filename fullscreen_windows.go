//go:build windows

package main

import (
	"syscall"
	"unsafe"
)

var procSHQueryUserNotificationState = syscall.NewLazyDLL("shell32.dll").NewProc("SHQueryUserNotificationState")

// gameFullscreen: a game holds the screen in exclusive full screen (QUNS_RUNNING_D3D_FULL_SCREEN), where no window,
// the overlays included, can show over it. Borderless full screen is not this (it reports QUNS_BUSY at most).
func gameFullscreen() bool {
	if procSHQueryUserNotificationState.Find() != nil {
		return false
	}
	var st int32
	r, _, _ := procSHQueryUserNotificationState.Call(uintptr(unsafe.Pointer(&st)))
	return r == 0 && st == 3
}
