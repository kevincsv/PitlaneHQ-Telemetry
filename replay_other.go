//go:build !windows

package main

import "errors"

func irReplayReady() bool { return false }

func irReplaySeek(num, ms int) error { return errors.New("iRacing runs only on Windows") }
