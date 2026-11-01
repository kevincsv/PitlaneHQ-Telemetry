//go:build windows

package main

import (
	"errors"
	"syscall"
	"unsafe"
)

var (
	procRegisterWindowMessage = syscall.NewLazyDLL("user32.dll").NewProc("RegisterWindowMessageW")
	procSendNotifyMessage     = syscall.NewLazyDLL("user32.dll").NewProc("SendNotifyMessageW")
)

const (
	irBcastReplaySetPlaySpeed      = 3
	irBcastReplaySearchSessionTime = 12
)

// irBroadcast: iRacing's irsdk_broadcastMsg (HWND_BROADCAST, IRSDK_BROADCASTMSG, MAKELONG(msg, var1), var2)
func irBroadcast(msg, var1, var2 int) error {
	name, _ := syscall.UTF16PtrFromString("IRSDK_BROADCASTMSG")
	id, _, _ := procRegisterWindowMessage.Call(uintptr(unsafe.Pointer(name)))
	if id == 0 {
		return errors.New("no message")
	}
	wp := uintptr(uint32(msg&0xffff) | uint32(var1&0xffff)<<16)
	r, _, _ := procSendNotifyMessage.Call(0xffff, id, wp, uintptr(uint32(int32(var2))))
	if r == 0 {
		return errors.New("not sent")
	}
	return nil
}

// irReplayReady: iRacing is running (its telemetry is open), so it can take the jump
func irReplayReady() bool {
	tel.mu.RLock()
	ok := tel.connected && tel.source == "iracing"
	tel.mu.RUnlock()
	return ok
}

func irReplaySeek(num, ms int) error {
	if !irReplayReady() {
		return errors.New("iRacing is not running")
	}
	if err := irBroadcast(irBcastReplaySearchSessionTime, num, ms); err != nil {
		return err
	}
	return irBroadcast(irBcastReplaySetPlaySpeed, 1, 0)
}
