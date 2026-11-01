package main

// The spotter overlay: a bar down each side that lights while a car is alongside (the game's CarLeftRight: iRacing,
// Le Mans Ultimate and Assetto Corsa give it), amber for one car, red for two, with "CAR LEFT" in the middle.

import "math"

func spotterOverlay(name string) bool { return name == "spotter" }

func spotterVars() []string { return []string{"CarLeftRight", "IsOnTrack"} }

// spotterSides: which sides have a car and how many (0, 1 or 2) from CarLeftRight (iRacing's irsdk_CarLeftRight:
// 0 off, 1 clear, 2 car left, 3 car right, 4 cars both sides, 5 two cars left, 6 two cars right)
func spotterSides(v int) (left, right int) {
	switch v {
	case 2:
		return 1, 0
	case 3:
		return 0, 1
	case 4:
		return 1, 1
	case 5:
		return 2, 0
	case 6:
		return 0, 2
	}
	return 0, 0
}

func drawSpotterOv(c *ovCanvas, st *ovState, z float64) int {
	W := float64(c.w)
	H := 64 * z
	panel(c, H, z)
	v, _ := st.num("CarLeftRight")
	l, r := spotterSides(int(math.Round(v)))
	pad, bw := 10*z, 14*z
	bar := func(x float64, n int) {
		col, a := uint32(0x222b37), 1.0
		if n == 1 {
			col = colWarn
		} else if n >= 2 {
			col = colBad
		}
		c.roundRect(x, pad, bw, H-2*pad, 5*z, col, a, colLine, 1, 1)
	}
	bar(pad, l)
	bar(W-pad-bw, r)
	msg, col := st.T("Clear", "Libre"), uint32(colMuted)
	switch {
	case l > 0 && r > 0:
		msg, col = st.T("CARS BOTH SIDES", "COCHES A AMBOS LADOS"), colBad
	case l >= 2:
		msg, col = st.T("TWO CARS LEFT", "DOS COCHES A LA IZQUIERDA"), colBad
	case r >= 2:
		msg, col = st.T("TWO CARS RIGHT", "DOS COCHES A LA DERECHA"), colBad
	case l > 0:
		msg, col = st.T("◀ CAR LEFT", "◀ COCHE A LA IZQUIERDA"), colWarn
	case r > 0:
		msg, col = st.T("CAR RIGHT ▶", "COCHE A LA DERECHA ▶"), colWarn
	}
	f := ovFace(fkDisplayB, 22*z)
	c.text(f, ellipsis(f, msg, W-4*pad-2*bw), W/2, H/2, col, 1, 1)
	return int(math.Ceil(H))
}
