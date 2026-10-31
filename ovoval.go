package main

// The oval coach of the coach overlay and the SimHub plugin, like ovalOf, liftZones and the oval tips of
// web/dist/pitwall-analysis.js: on an oval the corners are lifts as much as braking zones, and a corner the reference takes
// with a lift hears about the lift (where, how deep, how long) and the speed through the middle of the corner.

import (
	"fmt"
	"math"
	"regexp"
	"strings"
)

var (
	ovalRoadCfg  = regexp.MustCompile(`(?i)road|roval|infield|rallycross`)
	ovalDirtCar  = regexp.MustCompile(`(?i)\bdirt\b|sprint car|midget`)
	ovalName     = regexp.MustCompile(`(?i)\boval\b|superspeedway`)
	ovalSSName   = regexp.MustCompile(`(?i)daytona|talladega`)
	ovalSuperTyp = regexp.MustCompile(`super ?speedway`)
)

// ovalKind: the kind of oval a session runs on, "" on a road course: "superspeedway" (Daytona, Talladega: the draft),
// "intermediate" (1.3 miles and up), "mile" (the flat miles), "short" (under 0.9 mile) or "dirt". cat is iRacing's
// Category (Oval, DirtOval, Road…), ttype WeekendInfo's TrackType, L the track's length in metres.
func ovalKind(cat, ttype, track, cfg, car string, L float64) string {
	c := strings.Map(func(r rune) rune {
		if r >= 'a' && r <= 'z' {
			return r
		}
		return -1
	}, strings.ToLower(cat))
	t := strings.ToLower(ttype)
	if ovalRoadCfg.MatchString(cfg) || strings.Contains(t, "road") {
		return ""
	}
	switch c {
	case "sportscar", "formulacar", "formula", "dirtroad", "road":
		return ""
	}
	dirt := c == "dirtoval" || strings.Contains(t, "dirt") || (c == "" && ovalDirtCar.MatchString(car))
	if !dirt && c != "oval" && !strings.Contains(t, "oval") && !strings.Contains(t, "speedway") && !(c == "" && ovalName.MatchString(track+" "+cfg)) {
		return ""
	}
	switch {
	case dirt:
		return "dirt"
	case ovalSuperTyp.MatchString(t) || ovalSSName.MatchString(track):
		return "superspeedway"
	case L > 0 && L < 1450:
		return "short"
	case L > 0 && L < 2100:
		return "mile"
	}
	return "intermediate"
}

// oval: the kind of oval of the session the overlays read ("" a road course); st.mu is held
func (st *ovState) oval() string {
	if st.ses == nil {
		return ""
	}
	s := st.ses
	return ovalKind(s.Cat, s.TrackType, s.Track, s.TrackConfig, s.CarName, s.TrackLen)
}

// fullShare: the share of a lap's points with the throttle over 95 %
func fullShare(s []*lapPt) float64 {
	f, c := 0, 0
	for _, p := range s {
		if p == nil {
			continue
		}
		c++
		if p[2] > .95 {
			f++
		}
	}
	if c == 0 {
		return 0
	}
	return float64(f) / float64(c)
}

// liftZones: the corners an oval lap takes without braking, from where the throttle comes off (under 90 %, no brake)
// to the slowest point before it is back, when the car really slows
func liftZones(s []*lapPt) []cornerZone {
	var out []cornerZone
	for i := 1; i < len(s); i++ {
		a, b := s[i], s[i-1]
		if a == nil || b == nil || !(a[2] < .9 && b[2] >= .9 && a[3] <= .12) {
			continue
		}
		k, vmin, imin, brk := i, a[0], i, false
		for k < len(s) && k < i+160 && s[k] != nil && s[k][2] < .9 {
			if s[k][0] < vmin {
				vmin, imin = s[k][0], k
			}
			if s[k][3] > .12 {
				brk = true
			}
			k++
		}
		for q := k; q < len(s) && q < k+6; q++ {
			if s[q] != nil && s[q][0] < vmin {
				vmin, imin = s[q][0], q
			}
		}
		if !brk && b[0]-vmin > 1.5 {
			out = append(out, cornerZone{i: i, imin: imin, v: b[0], vmin: vmin, turn: -1, lift: true})
		}
		i = k
	}
	return out
}

// lapZones: a lap's corners for the coach, its braking zones and, on an oval, its lifts (a lift that runs into a braking
// zone is that zone)
func lapZones(s []*lapPt, oval bool) []cornerZone {
	var out []cornerZone
	for _, z := range brakeZones(s) {
		out = append(out, cornerZone{i: z.i, imin: z.imin, v: z.v, vmin: z.vmin, turn: -1})
	}
	if !oval {
		return out
	}
	nb := len(out)
	for _, l := range liftZones(s) {
		hit := false
		for _, z := range out[:nb] {
			if l.i <= z.imin && z.i <= l.imin+10 {
				hit = true
				break
			}
		}
		if !hit {
			out = append(out, l)
		}
	}
	sortZones(out)
	return out
}

func sortZones(z []cornerZone) {
	for a := 1; a < len(z); a++ {
		for b := a; b > 0 && z[b].i < z[b-1].i; b-- {
			z[b], z[b-1] = z[b-1], z[b]
		}
	}
}

// ovalFlatZones: the corners where lap A lifts and the reference stays flat out (flatB), added to the reference's
func ovalFlatZones(zb, za []cornerZone, sb []*lapPt, n int) []cornerZone {
	ok := func(i int) bool { return i >= 0 && i < len(sb) && sb[i] != nil }
	add := zb
	for _, q := range za {
		if q.imin >= n || !ok(q.i) || !ok(q.imin) {
			continue
		}
		near := false
		for _, z := range zb {
			if q.imin >= z.i-20 && q.i <= z.imin+30 {
				near = true
				break
			}
		}
		if near {
			continue
		}
		flat := true
		for k := q.i; k <= q.imin; k++ {
			if ok(k) && sb[k][2] < .9 {
				flat = false
				break
			}
		}
		if flat {
			add = append(add, cornerZone{i: q.i, imin: q.imin, v: sb[q.i][0], vmin: sb[q.imin][0], turn: -1, lift: true, flatB: true})
		}
	}
	sortZones(add)
	return add
}

// ovalTip: the tip of a corner the reference takes with a lift (or flat out, flatB) on an oval; "" keeps the tip the
// phases gave. x0..i1 is the stretch both laps are measured over, dd and dmin as compareLaps has them.
func (st *ovState) ovalTip(sa, sb []*lapPt, z cornerZone, x0, i1 int, hasM bool, dd, dmin float64, roadish bool) (string, string) {
	thrMin := func(s []*lapPt) float64 {
		t := 1.0
		for q := x0; q <= i1 && q < len(s); q++ {
			if s[q] != nil && s[q][2] < t {
				t = s[q][2]
			}
		}
		return t
	}
	offFull := func(s []*lapPt) float64 {
		c := 0
		for q := x0; q <= i1 && q < len(s); q++ {
			if s[q] != nil && s[q][2] < .9 {
				c++
			}
		}
		return float64(c) * ovLapBin
	}
	brk := func(s []*lapPt) float64 {
		p := 0.0
		for q := x0; q <= i1 && q < len(s); q++ {
			if s[q] != nil && s[q][3] > p {
				p = s[q][3]
			}
		}
		return p
	}
	r := func(v float64) int { return int(math.Round(v)) }
	pc := func(v float64) int { return r(v * 100) }
	mA, mB, oA, oB, bA, bB := thrMin(sa), thrMin(sb), offFull(sa), offFull(sb), brk(sa), brk(sb)
	switch {
	case z.flatB:
		return fmt.Sprintf("The reference stays flat out here and you lift for %d m (down to %d %%). Stay flat out", r(oA), pc(mA)),
			fmt.Sprintf("La referencia va a fondo aquí y tú levantas durante %d m (hasta el %d %%). Mantén el pie a fondo", r(oA), pc(mA))
	case bA > .12 && bB <= .12:
		return fmt.Sprintf("The reference only lifts here (down to %d %%) and you brake. Lift instead and roll the speed into the corner", pc(mB)),
			fmt.Sprintf("La referencia solo levanta aquí (hasta el %d %%) y tú frenas. Levanta en vez de frenar y deja correr la velocidad en la curva", pc(mB))
	case hasM && dd < -8:
		return fmt.Sprintf("You lift %d m before the reference. Lift later", r(-dd)), fmt.Sprintf("Levantas %d m antes que la referencia. Levanta más tarde", r(-dd))
	case hasM && dd > 8 && dmin < -2:
		return fmt.Sprintf("You lift %d m later than the reference and lose %d %s in the middle of the corner. Lift a touch earlier and carry the speed through the center", r(dd), r(-dmin), st.spdU()),
			fmt.Sprintf("Levantas %d m más tarde que la referencia y pierdes %d %s en mitad de la curva. Levanta un poco antes y conserva la velocidad en el centro", r(dd), r(-dmin), st.spdU())
	case mA < mB-.15:
		return fmt.Sprintf("You lift to %d %% (reference %d %%). A lighter lift is enough here", pc(mA), pc(mB)), fmt.Sprintf("Levantas hasta el %d %% (referencia %d %%). Aquí basta con levantar menos", pc(mA), pc(mB))
	case oA-oB >= 15:
		return fmt.Sprintf("You stay off full throttle for %d m (reference %d m). Back to flat out sooner", r(oA), r(oB)), fmt.Sprintf("Vas sin el gas a fondo durante %d m (referencia %d m). Vuelve a fondo antes", r(oA), r(oB))
	case hasM && dmin < -2:
		return fmt.Sprintf("Carry %d %s more through the middle of the corner", r(-dmin), st.spdU()), fmt.Sprintf("Pasa %d %s más rápido por el centro de la curva", r(-dmin), st.spdU())
	case roadish:
		return ovalRollEn, "Deja correr más velocidad en la curva con un solo levantón suave y más corto"
	}
	return "", ""
}

const ovalRollEn = "Roll more speed into the corner with one smooth, lighter lift"

// dirtLineTip: on dirt, the groove the reference runs through the middle of the corner (apex: metres A was to the inside)
func dirtLineTip(apex float64) (string, string) {
	if math.Abs(apex) < 2 {
		return "", ""
	}
	f := fmt.Sprintf("%.1f", math.Abs(apex))
	if apex < 0 {
		return "You run " + f + " m higher than the reference through the middle of the corner. Try its lower groove", "Vas " + f + " m más arriba que la referencia en mitad de la curva. Prueba su línea más baja"
	}
	return "The reference runs " + f + " m higher through the middle of the corner. Try its groove higher up", "La referencia va " + f + " m más arriba en mitad de la curva. Prueba su línea más alta"
}
