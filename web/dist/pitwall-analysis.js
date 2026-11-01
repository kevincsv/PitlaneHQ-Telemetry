/* The lap analysis and the coach of Pitlane HQ, one file for every device: the web and the PC app (index.html loads it)
   and the phones (Android runs it in a JavaScriptSandbox, iOS in JavaScriptCore; they download it from pitlanehq.app and
   keep a copy in the app). Pure JavaScript: no page, no storage, no network. What it needs from around it comes in a
   context argument:
     lang     "en", "es" or "pt": the language of the texts it writes
     units    "metric" or "imperial"
     turns    the track's official turns as fractions of the lap (null without them)
     weights  what the coach learnt from everyone (/community/coach/weights: w and b by "kind|cls", off as a list or a Set)
     me       the driver's own memory (/community/coach/me: w by "kind|cls", habits)
     hint     a function (apex m) → the model's corner card there, or cards: the model's corner cards (/community/model)
     laps     the session's laps (how steady each corner is), for analyse
     step     the next level's step (the model's ladder entry, step), for analyse when lap B is the next level
     post     a function every text of the plan and the analyzer goes through (the web turns "this PC" into "your PC")
     track    the session's track and car {cat, track, track_config, trackType, car, len} (else the laps' own fields): an
              oval gets the oval coach (ovalOf)
     oval     the kind of oval when the caller knows it ("superspeedway", "intermediate", "mile", "short", "dirt"), or false
     estB     true when lap B's pedals and gears are estimated from its speed (a rival's lap, src "field"; B.est or B.field
              say the same): the coach then never speaks of how the brake or the throttle is pressed, nor of gears
     model    the model of this car and track (/community/model), for analyse: the track guide (trackGuide) and where lap A
              stands among the drivers in every corner (cornerRanks)
     byCls    the driver's corner types across their tracks (/community/coach/me byCls), for analyse (clsLines)
     prev     the tips of the driver's last session on this car and track (GET /community/coach/last), for analyse: how
              this lap does where that plan asked for something (followUp)
   A lap is the web's own shape: bins (one every 5 m: [speed m/s, lap time s, throttle 0-1, brake 0-1, gear, steering
   rad]), maxBin, time, sectors, trackId and xy {x, y, g} (the path, g its origin when it comes from the game's position).
   analyse(A, B, ctx) gives everything the analyzer and the coach show as plain JSON. The corners' tips carry English,
   Spanish and Portuguese ([en, es, pt]); text is the one in ctx.lang, and todo what the braking points table says to do
   there (tipMain, tipShort). */
(function (root) {
  "use strict";
  const VERSION = 1, BIN = 5;
  const langOf = (ctx) => { const l = ctx && ctx.lang; return l === "es" || l === "pt" ? l : "en"; };
  const txOf = (ctx) => { const l = langOf(ctx), post = ctx && typeof ctx.post === "function" ? ctx.post : (s) => s; return (en, es, pt) => post(l === "es" ? es : l === "pt" ? (pt != null ? pt : en) : en); };
  const unitsOf = (ctx) => { const imp = !!(ctx && ctx.units === "imperial"); return { spd: (ms) => imp ? ms * 2.23694 : ms * 3.6, spdU: () => imp ? "mph" : "km/h" }; };
  const turnsOf = (ctx) => ctx && Array.isArray(ctx.turns) ? ctx.turns : null;
  const sgn = (d, n = 3) => d == null || isNaN(d) ? "–" : (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(n);
  // what the coach learnt: the weight of a tip (everyone's and this driver's), the metres a braking tip asks for, the kinds turned off
  function coachOf(ctx) {
    const W = (ctx && ctx.weights) || {}, ME = (ctx && ctx.me) || {}, w = W.w || {}, b = W.b || {}, mw = ME.w || {};
    const off = W.off instanceof Set ? W.off : new Set(Array.isArray(W.off) ? W.off : []);
    return {
      weight: (c) => c && c.kind ? (w[c.kind + "|" + c.cls] || 1) * (mw[c.kind + "|" + c.cls] || 1) : 1,
      ask: (k, cls) => { const x = b[k + "|" + cls]; return x && x.ask > 0 ? x.ask : null; },
      off: (k, cls) => off.has(k + "|" + cls),
      habits: Array.isArray(ME.habits) ? ME.habits : [],
      // the drivers' 👍/👎 on the plan's steps (/community/coach/weights plan: a step's id, or its kind before the colon)
      plan: (id) => { const pw = W.plan || {}; return id ? pw[id] || pw[String(id).split(":")[0]] || 1 : 1; },
    };
  }
  // the model's corner card nearest a corner's slowest point (within 60 m), each knowing the hardest corner's spread
  function hintOf(ctx) {
    if (ctx && typeof ctx.hint === "function") return ctx.hint;
    const cs = ctx && Array.isArray(ctx.cards) ? ctx.cards : null;
    if (!cs || !cs.length) return () => null;
    const mx = Math.max(0, ...cs.map((c) => c.spread || 0));
    return (apex) => { if (!(apex >= 0)) return null; let b = null; for (const c of cs) { const g = Math.abs(c.apex - apex); if (g <= 60 && (!b || g < Math.abs(b.apex - apex))) b = c; } return b ? { ...b, spreadMax: b.spreadMax != null ? b.spreadMax : mx } : null; };
  }

  /* lap B's pedals and gears estimated from its speed (a rival's lap the PC saw from its place on track): the coach
     measures braking points, speeds and where the throttle comes back against it, never how a pedal is pressed */
  const estOf = (B, ctx) => !!((ctx && ctx.estB) || (B && (B.est || B.field)));

  /* ---------- a lap's points ---------- */
  function lapSeries(l) { const out = []; let last = null; const lim = Math.min(l.bins.length, (l.maxBin || l.bins.length - 1) + 1); for (let i = 0; i < lim; i++) { const b = l.bins[i] || last; if (!l.bins[i] && !last) continue; out[i] = b; last = b; } const end = out.length; return { arr: out, end }; }
  function serOf(l) { if (!l._ser || l._serN !== l.bins.length) { l._ser = lapSeries(l).arr; l._serN = l.bins.length; } return l._ser; }

  /* ---------- the racing line ---------- */
  /* the shape of a lap Pitlane HQ recorded with the car's position */
  const lapShape = (l) => l && l.xy && l.xy.x.length > 10 ? { x: l.xy.x, y: l.xy.y, N: l.xy.x.length, g: l.xy.g || null, lap: true } : null;
  /* two paths in one frame: both from the game's position (b moved to a's origin) or both dead reckoning; null when one is each (they never line up) */
  function sameFrame(a, b) { if (!a || !b || !!a.g !== !!b.g) return null; if (!a.g || (a.g[0] === b.g[0] && a.g[1] === b.g[1])) return b; const dx = (b.g[1] - a.g[1]) * 111320 * Math.cos(a.g[0] * Math.PI / 180), dy = (b.g[0] - a.g[0]) * 110540; return { ...b, x: b.x.map((v) => v + dx), y: b.y.map((v) => v + dy) }; }
  /* where lap A's car was across the track against lap B's, every 5 m (racingline.go does the same). Both paths share their
     orientation, so at the same lap distance A's point along B's normal is how far A was to one side of B; the slow drift of
     the dead reckoning goes with a ±400 m moving average. Null when either lap has no path or the two paths are not the same
     track; NaN where they do not line up. */
  function lineOffsets(A, B) {
    const a = lapShape(A), b = sameFrame(a, lapShape(B)); if (!a || !b) return null; const n = Math.min(a.N, b.N); if (n < 60) return null;
    const lat = new Array(n), lon = new Array(n);
    for (let i = 0; i < n; i++) { const i0 = Math.max(0, i - 2), i1 = Math.min(n - 1, i + 2); let tx = b.x[i1] - b.x[i0], ty = b.y[i1] - b.y[i0]; const tm = Math.hypot(tx, ty) || 1; tx /= tm; ty /= tm; const dx = a.x[i] - b.x[i], dy = a.y[i] - b.y[i]; lat[i] = -ty * dx + tx * dy; lon[i] = tx * dx + ty * dy; }
    const W = 80, sm = (v) => { const pre = [0]; v.forEach((x, i) => pre.push(pre[i] + x)); return v.map((x, i) => { const lo = Math.max(0, i - W), hi = Math.min(n - 1, i + W); return x - (pre[hi + 1] - pre[lo]) / (hi - lo + 1); }); };
    const lc = sm(lat), oc = sm(lon), ab = oc.map(Math.abs).sort((p, q) => p - q); if (ab[n >> 1] > 6) return null;
    return lc.map((v, i) => Math.abs(oc[i]) > 20 || Math.abs(v) > 25 ? NaN : v);
  }
  /* how far A was to the inside of B (m, + inside) at B's turn-in (its braking point), apex and exit; null on a straight */
  function cornerLine(lat, B, brake, apex) {
    const b = lapShape(B); if (!lat || !b) return null; const n = Math.min(lat.length, b.N); if (apex <= 0 || apex >= n - 1) return null;
    const tan = (i) => { const i0 = Math.max(0, i - 2), i1 = Math.min(n - 1, i + 2), tx = b.x[i1] - b.x[i0], ty = b.y[i1] - b.y[i0], m = Math.hypot(tx, ty) || 1; return [tx / m, ty / m]; };
    const t1 = tan(Math.max(0, apex - 8)), t2 = tan(Math.min(n - 1, apex + 8)), cr = t1[0] * t2[1] - t1[1] * t2[0]; if (Math.abs(cr) < .05) return null; const sg = cr < 0 ? -1 : 1;
    const at = (i) => { let s = 0, c = 0; for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) if (!isNaN(lat[k])) { s += lat[k]; c++; } return c ? s / c * sg : NaN; };
    const r = { entry: at(brake), apex: at(apex), exit: at(Math.min(n - 1, apex + 16)) }; return isNaN(r.entry) || isNaN(r.apex) || isNaN(r.exit) ? null : r;
  }
  /* the advice of the line in one corner, [en, es, kind, pt], or null when it is like the reference's */
  function lineTip(c, sameBrake) {
    if (!c) return null; const f = (v) => Math.abs(v).toFixed(1), o = [];
    if (c.entry >= 1.5) o.push([c.entry, sameBrake ? `You brake where the reference does but ${f(c.entry)} m more to the inside. Turn in from the outside` : `You turn in ${f(c.entry)} m more to the inside. Start the corner from the outside`, sameBrake ? `Frenas donde la referencia pero ${f(c.entry)} m más por dentro. Entra a la curva desde fuera` : `Entras ${f(c.entry)} m más por dentro. Empieza la curva desde fuera`, sameBrake ? "line_same_brake" : "line_turnin",
      sameBrake ? `Você freia onde a referência freia, mas ${f(c.entry)} m mais por dentro. Entre na curva por fora` : `Você entra na curva ${f(c.entry)} m mais por dentro. Comece a curva por fora`]);
    if (c.apex <= -1.5) o.push([-c.apex, `You pass ${f(c.apex)} m away from the apex. Get closer to the inside`, `Pasas a ${f(c.apex)} m del vértice. Acércate más por dentro`, "line_apex", `Você passa a ${f(c.apex)} m do ápice. Chegue mais perto da parte de dentro`]);
    if (c.exit >= 1.5) o.push([c.exit, `You use ${f(c.exit)} m less track on exit. Let the car run out to the outside`, `Usas ${f(c.exit)} m menos de pista a la salida. Deja correr el coche hacia fuera`, "line_exit", `Você usa ${f(c.exit)} m a menos de pista na saída. Deixe o carro abrir até a parte de fora`]);
    if (!o.length) return null; o.sort((p, q) => q[0] - p[0]); return [o[0][1], o[0][2], o[0][3], o[0][4]];
  }

  /* ---------- ovals ---------- */
  /* the kind of oval a lap is driven on, or null on a road course: "superspeedway" (Daytona, Talladega and any long oval the
     reference takes flat out all lap: the draft and the pack), "intermediate" (1.3 miles and up: lifts, the car rolled
     through the middle of the corner), "mile" (the flat miles like Phoenix, Dover or Loudon: a lift and a touch of brake),
     "short" (under 0.9 mile like Martinsville, Bristol or Richmond: braking, the exit, the bottom lane) and "dirt" (a dirt
     oval: the car slid and turned with the throttle, the groove moves). From ctx.oval when the caller knows it, else
     ctx.track or the laps' own cat (iRacing's category), trackType (WeekendInfo's TrackType), track, track_config, car and
     the lap's length */
  const OVAL_KINDS = ["superspeedway", "intermediate", "mile", "short", "dirt"];
  const fullShare = (s) => { let f = 0, c = 0; for (const b of s) { if (!b) continue; c++; if (b[2] > .95) f++; } return c ? f / c : 0; };
  function ovalOf(A, B, ctx) {
    const o = ctx && ctx.oval; if (o === false) return null; if (OVAL_KINDS.includes(o)) return o;
    const T = (ctx && ctx.track) || {}, has = (x, k) => x && x[k] != null && x[k] !== "", get = (k) => has(T, k) ? T[k] : has(A, k) ? A[k] : has(B, k) ? B[k] : "";
    const cat = String(get("cat")).toLowerCase().replace(/[^a-z]/g, ""), name = String(get("track")), cfg = String(get("track_config")), type = String(get("trackType")).toLowerCase(), car = String(get("car"));
    if (/road|roval|infield|rallycross/i.test(cfg) || /road/.test(type) || ["sportscar", "formulacar", "formula", "dirtroad", "road"].includes(cat)) return null;
    const dirt = cat === "dirtoval" || /dirt/.test(type) || (!cat && /\bdirt\b|sprint car|midget/i.test(car));
    if (!dirt && cat !== "oval" && !/oval|speedway/.test(type) && !(!cat && /\boval\b|superspeedway/i.test(name + " " + cfg))) return null;
    if (dirt) return "dirt";
    const L = +get("len") || (A && Array.isArray(A.bins) ? ((A.maxBin || A.bins.length - 1) + 1) * BIN : 0);
    if (/super ?speedway/.test(type) || /daytona|talladega/i.test(name)) return "superspeedway";
    if (L >= 3000 && B && Array.isArray(B.bins) && fullShare(serOf(B)) >= .97) return "superspeedway"; // flat out all lap on a long oval: a drafting track
    return L > 0 && L < 1450 ? "short" : L > 0 && L < 2100 ? "mile" : "intermediate";
  }
  /* the lifts of a lap on an oval, the corners taken without braking: from where the throttle comes off (under 90 %, no
     brake) to the slowest point before it is back, when the car really slows */
  function liftZones(s) {
    const out = [];
    for (let i = 1; i < s.length; i++) { const a = s[i], b = s[i - 1]; if (!a || !b || !(a[2] < .9 && b[2] >= .9 && a[3] <= .12)) continue; let k = i, vmin = a[0], imin = i, brk = false; while (k < s.length && k < i + 160 && s[k] && s[k][2] < .9) { if (s[k][0] < vmin) { vmin = s[k][0]; imin = k; } if (s[k][3] > .12) brk = true; k++; } for (let q = k; q < Math.min(s.length, k + 6); q++) if (s[q] && s[q][0] < vmin) { vmin = s[q][0]; imin = q; } if (!brk && b[0] - vmin > 1.5) out.push({ i, v: b[0], vmin, imin, lift: true }); i = k; }
    return out;
  }
  /* an oval's corners of a lap: its braking zones and its lifts (a lift that runs into a braking zone is that zone) */
  function ovalZones(s) { const zb = brakeZones(s); return zb.concat(liftZones(s).filter((l) => !zb.some((z) => l.i <= z.imin && z.i <= l.imin + 10))).sort((a, b) => a.i - b.i); }
  /* the advice of the line on dirt, [en, es, kind, pt]: the groove the reference runs through the middle of the corner (+ inside) */
  function dirtLineTip(c) {
    if (!c || !(Math.abs(c.apex) >= 2)) return null; const f = Math.abs(c.apex).toFixed(1);
    return c.apex < 0 ? [`You run ${f} m higher than the reference through the middle of the corner. Try its lower groove`, `Vas ${f} m más arriba que la referencia en mitad de la curva. Prueba su línea más baja`, "dirt_groove", `Você passa ${f} m mais alto que a referência no meio da curva. Experimente a linha mais baixa dela`]
      : [`The reference runs ${f} m higher through the middle of the corner. Try its groove higher up`, `La referencia va ${f} m más arriba en mitad de la curva. Prueba su línea más alta`, "dirt_groove", `A referência passa ${f} m mais alto no meio da curva. Experimente a linha mais alta dela`];
  }
  /* the line tip a corner gets: on dirt the groove, on a superspeedway none (the pack decides the line), else lineTip */
  const lineTipOf = (c, sameBrake, oval) => oval === "dirt" ? dirtLineTip(c) : oval === "superspeedway" ? null : lineTip(c, sameBrake);

  /* ---------- corners ---------- */
  /* the braking zones of a lap: where each starts, its entry and minimum speed */
  function brakeZones(s) { const out = []; for (let i = 1; i < s.length; i++) { const a = s[i], b = s[i - 1]; if (!a || !b) continue; if (a[3] > .12 && b[3] <= .12) { let k = i, vmin = a[0], imin = i; while (k < s.length && k < i + 120 && s[k] && !(s[k][2] > .6 && s[k][3] < .05)) { if (s[k][0] < vmin) { vmin = s[k][0]; imin = k; } k++; } if (a[0] - vmin > 4) out.push({ i, v: a[0], vmin, imin }); i = k; } } return out; }
  /* each corner in four phases, as driver coaches read data: braking (brake point, how hard), entry (releasing the brake
     into the turn, trail braking; coasting), apex (minimum speed) and exit (when the throttle comes back) */
  const PHASES = [["brake", "Braking", "Frenada", "Frenagem"], ["entry", "Entry", "Entrada", "Entrada"], ["apex", "Apex", "Vértice", "Ápice"], ["exit", "Exit", "Salida", "Saída"]];
  const phaseName = (k, ctx) => { const p = PHASES.find((x) => x[0] === k); return p ? txOf(ctx)(p[1], p[2], p[3]) : ""; };
  /* the official number of the turn nearest a point of the lap (turns: fractions of the lap, T1 … Tn), else fb */
  function turnNo(turns, d, L, fb) { const t = turns; if (!t || !t.length || !(L > 0)) return fb; const f = (((d / L) % 1) + 1) % 1; let bi = 0, bd = 2; t.forEach((x, i) => { let dd = Math.abs(x - f); dd = Math.min(dd, 1 - dd); if (dd < bd) { bd = dd; bi = i; } }); return bi + 1; }
  /* the tips that say nothing the data showed (their kinds): what the data shows plainly (the gear, lifts, the line) replaces them */
  const COACH_GEN = ["brake_generic", "entry_speed", "apex_line", "full_throttle", "brake_same", "entry_before", "apex_longer"];
  /* a corner's speed at the reference's slowest point (m/s): the coach's tips are counted by it (coachtips.js) */
  const cornerClass = (v) => v < 22 ? "slow" : v < 42 ? "medium" : "fast";
  /* the corners of the reference lap: its braking zones, each named by the track's turn so two brake applications in one
     corner are one corner, plus the turns the reference takes without braking (a lift, a fast corner); without turns, the
     braking zones as they are (cornerZones in ovnative4.go does the same) */
  function cornerZones(sb, n, turns, oval) {
    const zb = oval ? ovalZones(sb) : brakeZones(sb), t = turns; if (!t || !t.length || !(n > 0)) return zb;
    const ap = t.map((f) => Math.round(f * n)).filter((i) => i > 0 && i < n - 1), near = (i) => { let b = -1, bd = 1e9; ap.forEach((a, k) => { const d = Math.abs(a - i); if (d < bd) { bd = d; b = k; } }); return bd <= 30 ? b : -1; }; // the turn whose apex is within 150 m
    const by = new Map(); zb.forEach((z) => { const k = near(z.imin); if (k < 0) { by.set("z" + z.i, z); return; } const o = by.get(k); if (!o) by.set(k, { ...z, turn: k }); else { if (!z.lift) delete o.lift; if (z.vmin < o.vmin) { o.vmin = z.vmin; o.imin = z.imin; } o.i = Math.min(o.i, z.i); o.v = Math.max(o.v, z.v); } });
    // a turn the reference takes without braking: from where it lifts (its last full throttle before the apex, or 100 m before) to its slowest point, when it really slows
    ap.forEach((a, k) => { if (by.has(k)) return; let i0 = Math.max(0, a - 20); for (let i = a; i > Math.max(0, a - 40); i--) if (sb[i] && sb[i][2] > .9) { i0 = i; break; } let imin = a, vmin = sb[a] ? sb[a][0] : 0; for (let i = i0; i < Math.min(n, a + 10); i++) if (sb[i] && sb[i][0] < vmin) { vmin = sb[i][0]; imin = i; } const v = sb[i0] ? sb[i0][0] : vmin; if (v - vmin > 2) by.set(k, { i: i0, v, vmin, imin, turn: k, lift: true }); });
    return [...by.values()].sort((a, b) => a.i - b.i);
  }

  /* ---------- the coach, corner by corner ---------- */
  /* lap A against lap B in every corner of B: where it brakes, its speeds, the time won or lost from 50 m before braking to
     150 m after the slowest point, phase by phase, and the tip about the phase where the time goes, in en, es and pt */
  function coachCompare(A, B, ctx) {
    const { spd, spdU } = unitsOf(ctx), C = coachOf(ctx), tipAsk = C.ask, tipOff = C.off, turns = turnsOf(ctx);
    const oval = ovalOf(A, B, ctx), est = estOf(B, ctx), sa = serOf(A), sb = serOf(B), n = Math.min(sa.length, sb.length), zb = cornerZones(sb, n, turns, oval), za = oval ? ovalZones(sa) : brakeZones(sa), lat = lineOffsets(A, B);
    // on an oval, a corner where you lift and the reference stays flat out is a corner too (flatB)
    if (oval) za.forEach((q) => { if (q.imin >= n || !sb[q.i] || !sb[q.imin] || zb.some((z) => q.imin >= z.i - 20 && q.i <= z.imin + 30)) return; for (let k = q.i; k <= q.imin; k++) if (sb[k] && sb[k][2] < .9) return; zb.push({ i: q.i, imin: q.imin, v: sb[q.i][0], vmin: sb[q.imin][0], lift: true, flatB: true }); });
    if (oval) zb.sort((a, b) => a.i - b.i);
    const T = (s, i) => s[i] && s[i][1], seg = (x, y) => x < y && sa[x] && sa[y] && sb[x] && sb[y] ? (T(sa, y) - T(sa, x)) - (T(sb, y) - T(sb, x)) : 0;
    const peak = (s, x, y) => { let p = 0, ip = x; for (let k = x; k <= y && k < s.length; k++) if (s[k] && s[k][3] > p) { p = s[k][3]; ip = k; } return [p, ip]; };
    const release = (s, from, to) => { for (let k = from; k <= to && k < s.length; k++) if (s[k] && s[k][3] < .05) return k; return to; };
    const coast = (s, x, y) => { let c = 0; for (let k = x; k <= y && k < s.length; k++) if (s[k] && s[k][2] < .05 && s[k][3] < .05) c++; return c * BIN; };
    const pickup = (s, from, to) => { for (let k = from; k <= to && k < s.length; k++) if (s[k] && s[k][2] > .5) return k; return null; };
    return zb.map((z, k) => {
      const m = za.filter((q) => Math.abs(q.i - z.i) <= 20).sort((p, q) => Math.abs(p.i - z.i) - Math.abs(q.i - z.i))[0]; /* the same corner: the nearest braking point within 100 m */
      const i0 = Math.max(0, z.i - 10), i1 = Math.min(n - 1, z.imin + 30); if (!sa[i0] || !sa[i1] || !sb[i0] || !sb[i1]) return null;
      const lost = (sa[i1][1] - sa[i0][1]) - (sb[i1][1] - sb[i0][1]); const dd = m ? (m.i - z.i) * BIN : null, dmin = m ? spd(m.vmin) - spd(z.vmin) : null;
      // the reference lap's phases, on the same distance grid for both laps
      const [pb, ipb] = peak(sb, z.i, z.imin), rel = Math.min(release(sb, ipb, z.imin), z.imin), a0 = Math.max(rel, z.imin - 4), a1 = Math.min(i1, z.imin + 4);
      const ph = { brake: seg(i0, rel), entry: seg(rel, a0), apex: seg(a0, a1), exit: seg(a1, i1) };
      const worst = Object.entries(ph).sort((p, q) => q[1] - p[1])[0];
      // what this lap does differently
      const [pa, ipa] = m ? peak(sa, m.i, m.imin) : [0, 0], relA = m ? release(sa, ipa, m.imin) : 0;
      const trailA = m ? (relA - ipa) * BIN : null, trailB = (rel - ipb) * BIN, coastA = coast(sa, i0, i1), coastB = coast(sb, i0, i1);
      // how the throttle is opened after the apex: metres from picking it up (5 %) to full (95 %)
      const ramp = (s, from, to) => { let a = null; for (let k = from; k <= to && k < s.length; k++) { if (!s[k]) continue; if (a == null && s[k][2] > .05) a = k; if (a != null && s[k][2] > .95) return (k - a) * BIN; } return null; }, rampA = m ? ramp(sa, m.imin, i1) : null, rampB = ramp(sb, z.imin, i1);
      const puA = m ? pickup(sa, m.imin, i1) : null, puB = pickup(sb, z.imin, i1), late = puA != null && puB != null ? (puA - puB) * BIN : null;
      // the gear through the corner, the lifts after the apex and the corrections of the wheel: what a generic tip gives way to
      const gearAt = (s, i) => s[i] && isFinite(s[i][4]) ? Math.round(s[i][4]) : 0, apexA = m ? m.imin : z.imin, gA = gearAt(sa, apexA), gB = gearAt(sb, z.imin);
      const lifts = (s, from, to) => { let n = 0, prev = -1; for (let k = from; k <= to && k < s.length; k++) { if (!s[k]) continue; const t = s[k][2]; if (prev >= 0 && prev > .8 && t < .5) n++; prev = t; } return n; }, lA = lifts(sa, apexA, i1), lB = lifts(sb, z.imin, i1);
      const revs = (s, from, to) => { let n = 0, prevD = 0, last = null, has = false; for (let k = from; k <= to && k < s.length; k++) { if (!s[k] || !isFinite(s[k][5])) continue; const v = s[k][5]; if (v !== 0) has = true; if (last != null) { const d = v - last; if (Math.abs(d) > .004) { if (prevD !== 0 && Math.sign(d) !== Math.sign(prevD)) n++; prevD = d; } } last = v; } return [n, has]; }, [rA, hasA] = revs(sa, i0, i1), [rB, hasB] = revs(sb, i0, i1);
      let en = "", es = "", pt = "", phase = null, kind = ""; const say = (k, a, b, c) => { kind = k; en = a; es = b; pt = c; };
      const cls = cornerClass(z.vmin);
      if (lost > .03) {
        phase = worst[0]; if (z.lift && phase === "brake") phase = "entry"; const r = Math.round; // a corner taken without braking has no braking phase to speak of
        // the metres a braking tip asks for: what the drivers who gained really moved their braking by (tipAsk), never more than the gap seen
        const askA = tipAsk("brake_late_apex", cls), askE = tipAsk("brake_earlier", cls), askL = tipAsk("brake_later", cls);
        // braking later than the reference and arriving slower at the apex is one mistake, whatever phase pays for it
        if (m && dd != null && dd > 6 && dmin != null && dmin < -2) say("brake_late_apex", `You brake ${r(dd)} m later than the reference and lose ${r(-dmin)} ${spdU()} at the apex. Brake ${askA && askA < r(dd) ? askA + " m" : "a little"} earlier and carry the speed`, `Frenas ${r(dd)} m más tarde que la referencia y pierdes ${r(-dmin)} ${spdU()} en el vértice. Frena ${askA && askA < r(dd) ? askA + " m" : "un poco"} antes y conserva la velocidad`, `Você freia ${r(dd)} m depois da referência e perde ${r(-dmin)} ${spdU()} no ápice. Freie ${askA && askA < r(dd) ? askA + " m" : "um pouco"} antes e leve a velocidade`);
        else if (phase === "brake") {
          if (dd != null && dd < -6) { const mv = askL && askL < r(-dd) ? askL : r(-dd); say("brake_later", `Brake ${mv} m later`, `Frena ${mv} m más tarde`, `Freie ${mv} m depois`); }
          else if (!est && m && pa < pb - .05) say("brake_harder", `Brake harder at first (${r(pa * 100)} % vs ${r(pb * 100)} %)`, `Pisa más fuerte al empezar a frenar (${r(pa * 100)} % frente a ${r(pb * 100)} %)`, `Freie mais forte no início (${r(pa * 100)} % contra ${r(pb * 100)} %)`);
          else if (dd != null && dd > 6) say("brake_earlier", `You braked ${r(dd)} m too late and lost the corner. Brake ${askE && askE < r(dd) ? askE + " m" : ""} earlier`.replace("  ", " "), `Frenaste ${r(dd)} m demasiado tarde y perdiste la curva. Frena ${askE && askE < r(dd) ? askE + " m " : ""}antes`, `Você freou ${r(dd)} m tarde demais e perdeu a curva. Freie ${askE && askE < r(dd) ? askE + " m " : ""}antes`);
          else if (!est && trailA != null && trailB - trailA >= 15) say("trail", `Release the brake more gradually into the turn (trail braking ${r(trailA)} m vs ${r(trailB)} m)`, `Suelta el freno más progresivamente al entrar (trail braking ${r(trailA)} m frente a ${r(trailB)} m)`, `Solte o freio de forma mais gradual ao entrar na curva (trail braking ${r(trailA)} m contra ${r(trailB)} m)`);
          // against a reference whose pedals are estimated, the same braking point says what its speed shows, never how to press
          else if (est && dd != null) say("brake_speed", "You brake where the reference does but it carries more speed through the braking zone. Brake a touch less and roll more speed in", "Frenas donde la referencia pero ella lleva más velocidad en la frenada. Frena un poco menos y deja correr más velocidad", "Você freia onde a referência freia, mas ela leva mais velocidade na zona de frenagem. Freie um pouco menos e leve mais velocidade para dentro");
          else if (dd != null) say("brake_same", "Same braking point but slower through the braking zone. Brake hard at once, then release progressively", "Mismo punto de frenada pero más lento en la frenada. Pisa fuerte de golpe y suelta progresivamente", "Mesmo ponto de frenagem, mas mais lento na zona de frenagem. Freie forte de uma vez e depois solte aos poucos");
          else say("brake_generic", "Brake a little later and harder", "Frena un poco más tarde y más fuerte", "Freie um pouco depois e mais forte");
        }
        else if (phase === "entry") {
          if (!est && trailA != null && trailB - trailA >= 15) say("trail", `Release the brake more gradually into the turn (trail braking ${r(trailA)} m vs ${r(trailB)} m)`, `Suelta el freno más progresivamente al entrar (trail braking ${r(trailA)} m frente a ${r(trailB)} m)`, `Solte o freio de forma mais gradual ao entrar na curva (trail braking ${r(trailA)} m contra ${r(trailB)} m)`);
          else if (!est && coastA - coastB >= 10) say("coast", `Do not coast before the apex. ${r(coastA)} m without throttle or brake (reference ${r(coastB)} m)`, `No vayas sin gas ni freno antes del vértice. ${r(coastA)} m (referencia ${r(coastB)} m)`, `Não vá no embalo antes do ápice. ${r(coastA)} m sem acelerador nem freio (referência ${r(coastB)} m)`);
          else if (dmin != null && dmin >= 0) say("entry_before", "You reach the apex as fast as the reference, so the time goes before it. Release the brake more gradually as you turn in", "Llegas al vértice tan rápido como la referencia, así que el tiempo se va antes. Suelta el freno más progresivamente al girar", "Você chega ao ápice tão rápido quanto a referência, então o tempo se perde antes. Solte o freio de forma mais gradual ao entrar na curva");
          else say("entry_speed", "Carry more speed into the turn", "Entra con más velocidad en la curva", "Leve mais velocidade para dentro da curva");
        }
        else if (phase === "apex") { if (dmin != null && dmin < -2) say("apex_speed", `Carry ${r(-dmin)} ${spdU()} more through the apex`, `Pasa ${r(-dmin)} ${spdU()} más rápido por el vértice`, `Passe pelo ápice com ${r(-dmin)} ${spdU()} a mais`); else if (dmin != null && dmin >= 0) say("apex_longer", "As fast at the slowest point but slow for longer. Shorten the slow part of the corner (turn in later, later apex)", "Igual de rápido en el punto más lento, pero lento durante más metros. Acorta la parte lenta de la curva (gira más tarde, vértice más tardío)", "Tão rápido no ponto mais lento, mas lento por mais tempo. Encurte a parte lenta da curva (entre mais tarde, ápice mais tardio)"); else say("apex_line", "A rounder, faster line through the apex", "Una trazada más redonda y rápida por el vértice", "Uma linha mais redonda e rápida pelo ápice"); }
        else {
          if (late != null && late >= 8) say("throttle", `Get on the throttle ${r(late)} m earlier`, `Acelera ${r(late)} m antes`, `Acelere ${r(late)} m antes`);
          else if (!est && rampA != null && rampB != null && rampB - rampA >= 15 && ((lA >= 1 && lA > lB) || (hasA && hasB && rA > rB + 1))) say("throttle_rough", `You open the throttle faster than the reference and then have to correct. Open it more progressively (${Math.round(rampA)} m to full vs ${Math.round(rampB)} m)`, `Abres el gas más rápido que la referencia y luego tienes que corregir. Ábrelo más progresivo (${Math.round(rampA)} m hasta el fondo frente a ${Math.round(rampB)} m)`, `Você abre o acelerador mais rápido que a referência e depois precisa corrigir. Abra de forma mais progressiva (${Math.round(rampA)} m até o fundo contra ${Math.round(rampB)} m)`);
          else if (!est && rampA != null && rampB != null && rampA - rampB >= 15) say("throttle_slow", `You take ${Math.round(rampA)} m to reach full throttle (reference ${Math.round(rampB)} m). Squeeze it to full sooner`, `Tardas ${Math.round(rampA)} m en llegar a fondo (referencia ${Math.round(rampB)} m). Llega al 100 % antes`, `Você leva ${Math.round(rampA)} m para chegar ao acelerador a fundo (referência ${Math.round(rampB)} m). Pise até o fundo mais cedo`);
          else if (!est && coastA - coastB >= 10) say("no_wait", "Do not wait between the brake and the throttle", "No esperes entre el freno y el acelerador", "Não espere entre o freio e o acelerador");
          else if (late != null && late <= -8 && dmin != null && dmin < -1) say("exit_speed", `You pick up the throttle ${r(-late)} m earlier but leave the apex ${r(-dmin)} ${spdU()} slower. Carry the speed through the apex and the exit follows`, `Aceleras ${r(-late)} m antes pero sales del vértice ${r(-dmin)} ${spdU()} más lento. Conserva la velocidad en el vértice y la salida vendrá sola`, `Você acelera ${r(-late)} m antes, mas sai do ápice ${r(-dmin)} ${spdU()} mais lento. Leve a velocidade pelo ápice e a saída vem junto`);
          else say("full_throttle", "Full throttle sooner on exit", "Acelerador a fondo antes en la salida", "Acelerador a fundo mais cedo na saída");
        }
        if (COACH_GEN.includes(kind)) {
          if (est) { /* the reference's gears and throttle are estimated: no gear or lift tip against them */ }
          else if (gA >= 1 && gB >= 1 && gB > gA) say("gear_up", `Take this corner in gear ${gB} like the reference (you use gear ${gA})`, `Toma esta curva en ${gB}ª como la referencia (tú vas en ${gA}ª)`, `Faça esta curva em ${gB}ª marcha como a referência (você usa a ${gA}ª)`);
          else if (gA >= 1 && gB >= 1 && gB < gA) say("gear_down", `Drop to gear ${gB} for the apex like the reference (you stay in gear ${gA})`, `Baja a ${gB}ª en el vértice como la referencia (tú te quedas en ${gA}ª)`, `Reduza para a ${gB}ª marcha no ápice como a referência (você fica na ${gA}ª)`);
          else if (phase === "exit" && lA >= 2 && lA > lB + 1) say("lifts", `Smoother throttle on exit. You lifted ${lA} times after the apex (reference ${lB})`, `Acelera más progresivo a la salida. Levantaste ${lA} veces tras el vértice (referencia ${lB})`, `Acelerador mais suave na saída. Você aliviou ${lA} vezes depois do ápice (referência ${lB})`);
          else if (oval !== "dirt" && hasA && hasB && rA >= 3 && rA > rB + 2) say("steer", `${rA} steering corrections in this corner (reference ${rB}). Turn in once, smoothly`, `${rA} correcciones de volante en esta curva (referencia ${rB}). Gira una vez, suave`, `${rA} correções de volante nesta curva (referência ${rB}). Gire uma vez, com suavidade`);
        }
        // on an oval, a corner the reference takes with a lift hears about the lift (where, how deep, how long) and the
        // speed through the middle of the corner, never about a brake it does not use
        if (oval && (z.lift || z.flatB)) {
          const x0 = Math.max(0, z.i - 30), pc = (v) => Math.round(v * 100) + " %", u = spdU();
          const thrMin = (s) => { let t = 1; for (let q = x0; q <= i1 && q < s.length; q++) if (s[q] && s[q][2] < t) t = s[q][2]; return t; };
          const offFull = (s) => { let c = 0; for (let q = x0; q <= i1 && q < s.length; q++) if (s[q] && s[q][2] < .9) c++; return c * BIN; };
          const mA = thrMin(sa), mB = thrMin(sb), oA = offFull(sa), oB = offFull(sb), bA = peak(sa, x0, i1)[0], bB = peak(sb, x0, i1)[0];
          if (z.flatB) say("oval_flat", `The reference stays flat out here and you lift for ${r(oA)} m (down to ${pc(mA)}). Stay flat out`, `La referencia va a fondo aquí y tú levantas durante ${r(oA)} m (hasta el ${pc(mA)}). Mantén el pie a fondo`, `A referência vai de pé no fundo aqui e você alivia por ${r(oA)} m (até ${pc(mA)}). Mantenha o pé no fundo`);
          else if (!est && bA > .12 && bB <= .12) say("oval_no_brake", `The reference only lifts here (down to ${pc(mB)}) and you brake. Lift instead and roll the speed into the corner`, `La referencia solo levanta aquí (hasta el ${pc(mB)}) y tú frenas. Levanta en vez de frenar y deja correr la velocidad en la curva`, `A referência só alivia aqui (até ${pc(mB)}) e você freia. Alivie em vez de frear e leve a velocidade para dentro da curva`);
          else if (m && dd != null && dd < -8) say("oval_lift_later", `You lift ${r(-dd)} m before the reference. Lift later`, `Levantas ${r(-dd)} m antes que la referencia. Levanta más tarde`, `Você alivia ${r(-dd)} m antes da referência. Alivie mais tarde`);
          else if (m && dd != null && dd > 8 && dmin != null && dmin < -2) say("oval_lift_early", `You lift ${r(dd)} m later than the reference and lose ${r(-dmin)} ${u} in the middle of the corner. Lift a touch earlier and carry the speed through the center`, `Levantas ${r(dd)} m más tarde que la referencia y pierdes ${r(-dmin)} ${u} en mitad de la curva. Levanta un poco antes y conserva la velocidad en el centro`, `Você alivia ${r(dd)} m depois da referência e perde ${r(-dmin)} ${u} no meio da curva. Alivie um pouco antes e leve a velocidade pelo centro`);
          else if (!est && mA < mB - .15) say("oval_lift_less", `You lift to ${pc(mA)} (reference ${pc(mB)}). A lighter lift is enough here`, `Levantas hasta el ${pc(mA)} (referencia ${pc(mB)}). Aquí basta con levantar menos`, `Você alivia até ${pc(mA)} (referência ${pc(mB)}). Aqui basta aliviar menos`);
          else if (!est && oA - oB >= 15) say("oval_back_flat", `You stay off full throttle for ${r(oA)} m (reference ${r(oB)} m). Back to flat out sooner`, `Vas sin el gas a fondo durante ${r(oA)} m (referencia ${r(oB)} m). Vuelve a fondo antes`, `Você fica sem o acelerador a fundo por ${r(oA)} m (referência ${r(oB)} m). Volte ao fundo mais cedo`);
          else if (dmin != null && dmin < -2) say("oval_center", `Carry ${r(-dmin)} ${u} more through the middle of the corner`, `Pasa ${r(-dmin)} ${u} más rápido por el centro de la curva`, `Passe pelo meio da curva com ${r(-dmin)} ${u} a mais`);
          else if (/^(brake|trail|entry_|apex_)/.test(kind)) say("oval_roll", "Roll more speed into the corner with one smooth, lighter lift", "Deja correr más velocidad en la curva con un solo levantón suave y más corto", "Leve mais velocidade para dentro da curva com um só alívio, suave e mais leve");
        }
        // a tip an admin turned off for corners of this speed gives way to the phase's plain tip
        if (tipOff(kind, cls)) { const G = { brake: ["brake_generic", "Brake a little later and harder", "Frena un poco más tarde y más fuerte", "Freie um pouco depois e mais forte"], entry: ["entry_speed", "Carry more speed into the turn", "Entra con más velocidad en la curva", "Leve mais velocidade para dentro da curva"], apex: ["apex_line", "A rounder, faster line through the apex", "Una trazada más redonda y rápida por el vértice", "Uma linha mais redonda e rápida pelo ápice"], exit: ["full_throttle", "Full throttle sooner on exit", "Acelerador a fondo antes en la salida", "Acelerador a fundo mais cedo na saída"] }; say(...(G[phase] || G.brake)); }
      }
      // the line: where the car was across the track. Braking at the reference's point but on the wrong part of the
      // track is said first; a generic tip gives way to it; otherwise it goes after the tip of the phase
      const line = cornerLine(lat, B, z.i, z.imin), lt = lost > .03 ? lineTipOf(line, m && dd != null && Math.abs(dd) <= 6, oval) : null;
      if (lt) {
        const generic = COACH_GEN.includes(kind) || kind === "oval_roll";
        if (generic || (phase === "brake" && m && Math.abs(dd) <= 6)) { en = lt[0]; es = lt[1]; kind = lt[2]; pt = lt[3]; } else { en += ". " + lt[0]; es += ". " + lt[1]; pt += ". " + lt[3]; }
      }
      // the corner's own times (what the lap and the reference spent from the braking zone to the exit): the coach learns from them
      const ta = sa[i1][1] - sa[i0][1], tb = sb[i1][1] - sb[i0][1];
      return { n: z.turn != null ? z.turn + 1 : turnNo(turns, z.imin * BIN, n * BIN, k + 1), d: z.i * BIN, apex: z.imin * BIN, dd, ve: m ? spd(m.v) : null, vr: spd(z.v), vmin: m ? spd(m.vmin) : null, vminr: spd(z.vmin), lost, ph, phase, coastA, coastB, trailA, trailB, late, line, tip: [en, es, pt], kind, cls, ta, tb, gA, gB, lift: !!z.lift, pua: puA != null ? puA * BIN : null, pur: puB != null ? puB * BIN : null, stA: hasA && hasB ? steerMax(sa, i0, i1) : null, stB: hasA && hasB ? steerMax(sb, i0, i1) : null, rA, rB, lA, lB, ...(oval ? { oval, flatB: !!z.flatB } : {}), ...(est ? { est: true } : {}) };
    }).filter(Boolean);
  }
  /* the most the wheel is turned in a stretch (rad): how much steering a corner asks for */
  function steerMax(s, x, y) { let m = 0; for (let k = x; k <= y && k < s.length; k++) if (s[k] && isFinite(s[k][5]) && Math.abs(s[k][5]) > m) m = Math.abs(s[k][5]); return m; }
  /* how steady each corner is over the laps of the session: the spread of its time */
  function cornerConsistency(laps, R, turns, oval) {
    const sb = serOf(R), zb = cornerZones(sb, sb.length, turns, oval); if (laps.length < 3) return null;
    const per = zb.map((z) => { const ts = laps.map((L) => { const s = serOf(L), i0 = Math.max(0, z.i - 10), i1 = Math.min(s.length - 1, z.imin + 30); return s[i0] && s[i1] ? s[i1][1] - s[i0][1] : null; }).filter((x) => x != null); if (ts.length < 3) return null; const mu = ts.reduce((a, b) => a + b, 0) / ts.length; return Math.sqrt(ts.reduce((a, b) => a + (b - mu) * (b - mu), 0) / ts.length); });
    return per.map((sd, i) => ({ n: zb[i].turn != null ? zb[i].turn + 1 : i + 1, sd })).filter((x) => x.sd != null).sort((a, b) => b.sd - a.sd);
  }
  /* the sector times of two laps, the same in the analyzer and in the coach: the ones the game gave for each lap when both
     laps have them; otherwise thirds of the lap from the traces, counted from the start of the lap */
  function pairSecs(A, B, sa, sb, n) {
    const third = Math.floor(n / 3), tAt = (s, i) => { for (let k = Math.min(i, n - 1); k >= 0; k--) if (s.arr[k]) return s.arr[k][1]; return 0; };
    const gameSecs = (L) => Array.isArray(L.sectors) && L.sectors.length >= 2 && L.sectors.every((v) => v > 0) && Math.abs(L.sectors.reduce((p, v) => p + v, 0) - L.time) < 1 ? L.sectors : null;
    const traceSecs = (s, L) => { const c1 = tAt(s, third), c2 = tAt(s, 2 * third), ok = c1 > 0 && c2 > c1 && c2 < L.time; return ok ? [c1, c2 - c1, L.time - c2] : null; };
    const ga = gameSecs(A), gb = gameSecs(B), useGame = ga && gb && ga.length === gb.length, qa = useGame ? ga : traceSecs(sa, A), qb = useGame ? gb : traceSecs(sb, B);
    return qa && qb ? qa.map((v, k) => [v, qb[k]]) : [];
  }
  /* how each lap was driven, from all the telemetry: flat out, coasting, lifts in the middle of a corner and how busy the
     steering is; what A does differently from B, in plain words */
  function lapDriving(sa, sb, n, ctx) {
    const Tx = txOf(ctx);
    const m = (s) => { let full = 0, coast = 0, c = 0, lifts = 0, steer = 0, rev = 0, hasS = false, prevT = null, prevD = 0, lastS = null; for (let i = 0; i < n; i++) { const b = s.arr[i]; if (!b) continue; c++; const t = b[2], k = b[3]; if (t > .95) full++; if (t < .05 && k < .05) coast++;
      if (prevT != null && prevT > .9 && t < .6 && k < .05) lifts++; prevT = t; if (isFinite(b[5])) { hasS = true; if (lastS != null) { const d = b[5] - lastS; steer += Math.abs(d); if (Math.abs(d) > .004 && Math.sign(d) !== Math.sign(prevD) && prevD !== 0) rev++; if (Math.abs(d) > .004) prevD = d; } lastS = b[5]; } }
      return { full: c ? full / c : 0, coast: c ? coast / c : 0, lifts, steer, rev, hasS }; };
    if (estOf(null, ctx)) return []; // lap B's pedals are estimated: how much of it is flat out or coasting is a guess
    const a = m(sa), b = m(sb), out = [], pc = (v) => Math.round(v * 100) + "%";
    if (b.full - a.full > .03) out.push("🦶 " + Tx(`A is flat out ${pc(a.full)} of the lap, B ${pc(b.full)}. Get back on the throttle sooner on the corner exits.`, `A va a fondo el ${pc(a.full)} de la vuelta, B el ${pc(b.full)}. Vuelve al acelerador antes a la salida de las curvas.`, `A vai de pé no fundo ${pc(a.full)} da volta, B ${pc(b.full)}. Volte ao acelerador antes na saída das curvas.`));
    if (a.coast - b.coast > .02) out.push("💤 " + Tx(`A spends ${pc(a.coast)} of the lap with no pedal (B ${pc(b.coast)}). Go from brake to throttle without waiting in between.`, `A pasa el ${pc(a.coast)} de la vuelta sin pisar ningún pedal (B el ${pc(b.coast)}). Pasa del freno al acelerador sin esperar entre medias.`, `A passa ${pc(a.coast)} da volta sem pedal (B ${pc(b.coast)}). Vá do freio ao acelerador sem esperar.`));
    if (a.lifts > b.lifts + 1) out.push("↕️ " + Tx(`A lifts off the throttle ${a.lifts} times in the middle of a corner (B ${b.lifts}). A smoother entry lets you stay on the throttle.`, `A levanta el pie del acelerador ${a.lifts} veces en mitad de curva (B ${b.lifts}). Una entrada más suave te deja mantener el gas.`, `A tira o pé ${a.lifts} vezes no meio da curva (B ${b.lifts}). Uma entrada mais suave deixa você manter o acelerador.`));
    if (ovalOf(null, null, ctx) !== "dirt" && a.hasS && b.hasS && b.steer > 0 && a.steer > b.steer * 1.15) out.push("🎯 " + Tx(`A turns the wheel ${Math.round((a.steer / b.steer - 1) * 100)}% more than B and corrects it ${a.rev} times (B ${b.rev}). The car is sliding or you go in too fast. Smoother hands, a little less speed at the turn-in.`, `A gira el volante un ${Math.round((a.steer / b.steer - 1) * 100)} % más que B y lo corrige ${a.rev} veces (B ${b.rev}). El coche desliza o entras demasiado rápido. Manos más suaves y un poco menos de velocidad al girar.`, `A gira o volante ${Math.round((a.steer / b.steer - 1) * 100)}% mais que B e corrige ${a.rev} vezes (B ${b.rev}). O carro está escorregando ou você entra rápido demais. Mãos mais suaves, um pouco menos de velocidade na entrada.`));
    return out;
  }
  /* the name of a kind of tip, short (the plan's habit, the admin's Coach tab) */
  const KIND_NAMES = { brake_late_apex: ["Brakes later and loses the apex", "Frena más tarde y pierde el vértice", "Freia depois e perde o ápice"], brake_later: ["Brake later", "Frenar más tarde", "Frear depois"], brake_harder: ["Brake harder at first", "Pisar más fuerte al empezar", "Frear mais forte no início"], brake_earlier: ["Braked too late", "Frenó demasiado tarde", "Freou tarde demais"], trail: ["Trail braking", "Trail braking", "Trail braking"], brake_same: ["Same point, slower braking zone", "Mismo punto, frenada más lenta", "Mesmo ponto, frenagem mais lenta"], brake_generic: ["Brake later and harder", "Frenar más tarde y fuerte", "Frear depois e mais forte"], brake_speed: ["More speed through the braking zone", "Más velocidad en la frenada", "Mais velocidade na frenagem"], coast: ["Coasting before the apex", "Inercia antes del vértice", "Embalo antes do ápice"], entry_before: ["Time before the apex", "Tiempo antes del vértice", "Tempo antes do ápice"], entry_speed: ["More speed into the turn", "Más velocidad al entrar", "Mais velocidade na entrada"], apex_speed: ["More speed at the apex", "Más velocidad en el vértice", "Mais velocidade no ápice"], apex_longer: ["Slow for longer", "Lento durante más metros", "Lento por mais tempo"], apex_line: ["Rounder line", "Trazada más redonda", "Linha mais redonda"], throttle: ["Throttle earlier", "Acelerar antes", "Acelerar antes"], no_wait: ["Wait between brake and throttle", "Espera entre freno y acelerador", "Espera entre freio e acelerador"], exit_speed: ["Throttle early, slow apex", "Acelera pronto, vértice lento", "Acelera cedo, ápice lento"], full_throttle: ["Full throttle sooner", "A fondo antes", "Acelerador a fundo mais cedo"], gear_up: ["Higher gear", "Marcha más alta", "Marcha mais alta"], gear_down: ["Lower gear", "Marcha más baja", "Marcha mais baixa"], lifts: ["Throttle lifts on exit", "Levanta el gas a la salida", "Alívios do acelerador na saída"], throttle_slow: ["Slow to full throttle", "Tarda en ir a fondo", "Demora para acelerar a fundo"], throttle_rough: ["Throttle too abrupt", "Gas demasiado brusco", "Acelerador brusco demais"], steer: ["Steering corrections", "Correcciones de volante", "Correções de volante"], line_same_brake: ["Line · turn in from the outside", "Trazada · entrar desde fuera", "Linha · entre por fora"], line_turnin: ["Line · turn-in too inside", "Trazada · giro muy por dentro", "Linha · entrada por dentro demais"], line_apex: ["Line · away from the apex", "Trazada · lejos del vértice", "Linha · longe do ápice"], line_exit: ["Line · track unused on exit", "Trazada · pista sin usar a la salida", "Linha · pista sem usar na saída"],
    oval_flat: ["Lifts where the reference is flat out", "Levanta donde la referencia va a fondo", "Alivia onde a referência vai no fundo"], oval_no_brake: ["Brakes where a lift is enough", "Frena donde basta levantar", "Freia onde basta aliviar"], oval_lift_later: ["Lifts too early", "Levanta demasiado pronto", "Alivia cedo demais"], oval_lift_early: ["Lifts late and loses the center", "Levanta tarde y pierde el centro", "Alivia tarde e perde o centro"], oval_lift_less: ["Lifts too much", "Levanta demasiado", "Alivia demais"], oval_back_flat: ["Slow back to flat out", "Tarda en volver a fondo", "Demora a voltar ao fundo"], oval_center: ["More speed in the center", "Más velocidad en el centro", "Mais velocidade no centro"], oval_roll: ["Roll more speed in", "Dejar correr más velocidad", "Levar mais velocidade"], dirt_groove: ["Groove on dirt", "Línea en tierra", "Linha na terra"] };
  /* the name of a step of the plan by its id ("corner:brake_later", "phase:exit", "trail"…), for the admin's votes */
  const STEP_NAMES = { plan: ["The whole plan", "El plan entero", "O plano inteiro"], corner: ["Corner", "Curva", "Curva"], phase: ["Phase", "Fase", "Fase"], habit: ["Habit", "Hábito", "Hábito"], oval: ["Oval", "Óvalo", "Oval"],
    straight: ["Outside the corners", "Fuera de las curvas", "Fora das curvas"], cons: ["Corner taken differently every lap", "Curva distinta cada vuelta", "Curva diferente a cada volta"], style: ["How the lap is driven", "Cómo se conduce la vuelta", "Como a volta é pilotada"],
    trail: ["Trail braking", "Trail braking", "Trail braking"], rotate: ["The car pushes wide", "El coche se va de morro", "O carro sai de frente"], loose: ["The rear steps out", "La trasera se escapa", "A traseira escapa"], gears: ["Gears", "Marchas", "Marchas"],
    tyres: ["Pace fading over a run", "Ritmo que cae en la tanda", "Ritmo que cai na sequência"], pace: ["Usual lap against the best", "Vuelta habitual frente a la mejor", "Volta habitual contra a melhor"] };
  function stepName(id, ctx) {
    const Tx = txOf(ctx), [k, sub] = String(id || "").split(":"), N = STEP_NAMES[k], base = N ? Tx(N[0], N[1], N[2]) : k;
    if (!sub) return base;
    const PH = { brake: 0, entry: 1, apex: 2, exit: 3 }, sn = k === "phase" && sub in PH ? phaseName(sub, ctx) : k === "oval" ? (OVAL_NAMES[sub] ? Tx(...OVAL_NAMES[sub]) : sub) : kindName(sub, ctx);
    return base + " · " + sn;
  }
  const OVAL_NAMES = { superspeedway: ["Superspeedway", "Superóvalo", "Superspeedway"], intermediate: ["Intermediate", "Intermedio", "Intermediário"], mile: ["Flat mile", "Una milla", "Uma milha"], short: ["Short track", "Óvalo corto", "Pista curta"], dirt: ["Dirt", "Tierra", "Terra"] };
  function kindName(k, ctx) { const N = KIND_NAMES[k]; return N ? txOf(ctx)(N[0], N[1], N[2]) : k; }

  /* ---------- the braking points table ---------- */
  /* a corner's own tip without the line's, which coachCompare adds after the tip of the phase (". ", then lineTip): the
     table says what to do in the phase that loses the most; a line tip that replaced a generic one (kind line_*) stays */
  function tipMain(c) {
    const t = (c && c.tip) || [], lt = /^(line_|dirt_groove)/.test(String((c && c.kind) || "")) ? null : lineTipOf(c && c.line, c && c.dd != null && Math.abs(c.dd) <= 6, c && c.oval);
    if (!lt) return t; const cut = (s, x) => s && x && s.endsWith(". " + x) ? s.slice(0, -(x.length + 2)) : s;
    return [cut(t[0], lt[0]), cut(t[1], lt[1]), cut(t[2], lt[3])];
  }
  /* a tip in a few words: without its figures in brackets (the columns carry them) and, of two sentences, the one that
     says what to do (the last, unless it is only the measurement and the first is not) */
  function tipShort(t) {
    const q = String(t || "").replace(/\s*\([^)]*\)/g, "").trim().split(/\.\s+/).map((x) => x.replace(/\.$/, "").trim()).filter(Boolean); if (q.length < 2) return q[0] || "";
    const last = q[q.length - 1], first = q[0], num = /\d/; return num.test(last) && !num.test(first) ? first : last;
  }
  /* what to do in a corner, in a few words in the context's language: the table's last column ("" when it loses no time) */
  function tipTodo(c, ctx) { if (!c || !(c.lost > .03) || !c.tip || !c.tip[0]) return ""; const t = tipMain(c); return tipShort(txOf(ctx)(t[0], t[1], t[2])); }

  /* ---------- what each step of the plan explains ---------- */
  /* a tip's family: why it costs time and what to do instead are said once per family (EXPLAIN) */
  const FAMILY = { brake_late_apex: "late", brake_earlier: "late", oval_lift_early: "late", brake_later: "early", oval_lift_later: "early", brake_harder: "hard",
    trail: "trail", brake_same: "trail", entry_before: "trail", brake_generic: "trail", coast: "coast", no_wait: "coast",
    entry_speed: "speed", brake_speed: "speed", apex_speed: "speed", apex_line: "speed", oval_center: "speed", oval_roll: "speed", apex_longer: "long",
    throttle: "exit", full_throttle: "exit", throttle_slow: "exit", exit_speed: "exit", throttle_rough: "rough", lifts: "rough",
    gear_up: "gear", gear_down: "gear", steer: "steer", cons: "cons", oval_flat: "lift", oval_no_brake: "lift", oval_lift_less: "lift", oval_back_flat: "lift" };
  const familyOf = (k) => FAMILY[k] || (/^(line_|dirt_)/.test(k || "") ? "line" : "speed");
  const COST = {
    late: ["Braking too deep makes the car scrub speed while it is already turning, so it reaches the apex slower and every metre after the apex is slower too. The exit is worth more than the entry.", "Frenar demasiado tarde hace que el coche pierda velocidad cuando ya está girando, así que llega más lento al vértice y cada metro después también es más lento. La salida vale más que la entrada.", "Frear fundo demais faz o carro perder velocidade quando já está virando, então ele chega mais lento ao ápice e cada metro depois também é mais lento. A saída vale mais do que a entrada."],
    early: ["Every metre you brake before the reference is a metre at lower speed than it. It is a small loss each time, but it comes in every lap.", "Cada metro que frenas antes que la referencia es un metro a menos velocidad que ella. Es poco cada vez, pero se repite en cada vuelta.", "Cada metro que você freia antes da referência é um metro a menos velocidade. É pouco a cada vez, mas se repete em toda volta."],
    early_lift: ["Every metre you lift before the reference is a metre at lower speed than it, and on an oval that speed is carried down the whole straight.", "Cada metro que levantas antes que la referencia es un metro a menos velocidad que ella, y en un óvalo esa velocidad se arrastra por toda la recta.", "Cada metro que você alivia antes da referência é um metro a menos velocidade, e num oval essa velocidade vai pela reta inteira."],
    late_lift: ["Lifting late makes you slow the car in the middle of the corner, where it is already loaded. It loses more speed there than an earlier, lighter lift would.", "Levantar tarde te obliga a frenar el coche en mitad de la curva, donde ya va cargado. Ahí pierde más velocidad que con un levantón antes y más suave.", "Aliviar tarde obriga você a segurar o carro no meio da curva, onde ele já está carregado. Ali ele perde mais velocidade do que com um alívio mais cedo e mais leve."],
    hard: ["A soft first press makes the braking zone longer. The car slows best in the first metres, when it has the most speed and grip.", "Pisar suave al principio alarga la frenada. El coche frena mejor en los primeros metros, cuando tiene más velocidad y más agarre.", "Pisar suave no início deixa a frenagem mais longa. O carro freia melhor nos primeiros metros, quando tem mais velocidade e aderência."],
    trail: ["Letting go of the brake at once takes the weight off the front tyres just as you turn in. The car pushes wide and you wait before you can turn it.", "Soltar el freno de golpe quita peso a las ruedas delanteras justo cuando giras. El coche se va de morro y tienes que esperar para girarlo.", "Soltar o freio de uma vez tira peso dos pneus dianteiros bem quando você entra na curva. O carro sai de frente e você espera para conseguir virá-lo."],
    coast: ["With neither pedal pressed the car is not slowing down well and not speeding up either, and its balance is loose. Those metres are time given away.", "Sin pisar ningún pedal el coche ni frena bien ni acelera, y queda suelto de equilibrio. Esos metros son tiempo regalado.", "Sem nenhum pedal o carro nem freia bem nem acelera, e fica solto de equilíbrio. Esses metros são tempo dado de graça."],
    speed: ["The speed at the slowest point sets the whole exit. A few km/h less there are carried all the way down the next straight.", "La velocidad en el punto más lento marca toda la salida. Unos pocos km/h menos ahí se arrastran por toda la recta siguiente.", "A velocidade no ponto mais lento define toda a saída. Alguns km/h a menos ali são carregados por toda a reta seguinte."],
    long: ["You are as fast as the reference at the slowest point but you stay slow for more metres. A longer slow part costs time even at the same minimum speed.", "Vas tan rápido como la referencia en el punto más lento, pero te quedas lento durante más metros. Una parte lenta más larga cuesta tiempo aunque la velocidad mínima sea la misma.", "Você é tão rápido quanto a referência no ponto mais lento, mas fica lento por mais metros. Uma parte lenta mais longa custa tempo mesmo com a mesma velocidade mínima."],
    exit: ["The exit sets your speed for the whole straight after it. Time lost there keeps growing until the next braking point.", "La salida marca tu velocidad en toda la recta siguiente. El tiempo perdido ahí sigue creciendo hasta la próxima frenada.", "A saída define sua velocidade em toda a reta seguinte. O tempo perdido ali continua crescendo até a próxima frenagem."],
    rough: ["Opening the throttle too fast makes the rear slide and forces you to lift or correct. That costs more than a slower, steady squeeze.", "Abrir el gas demasiado rápido hace deslizar la trasera y te obliga a levantar o corregir. Eso cuesta más que apretarlo despacio y constante.", "Abrir o acelerador rápido demais faz a traseira escorregar e obriga você a aliviar ou corrigir. Isso custa mais do que apertar devagar e constante."],
    gear: ["In the wrong gear the engine is out of its best revs. Too low and the rear steps out on exit, too high and the car is slow to pull out of the corner.", "En la marcha equivocada el motor está fuera de sus mejores revoluciones. Muy corta y la trasera se escapa a la salida, muy larga y el coche tarda en salir de la curva.", "Na marcha errada o motor fica fora da sua melhor rotação. Curta demais e a traseira escapa na saída, longa demais e o carro demora a sair da curva."],
    steer: ["Every correction means the car is sliding. A sliding tyre slows the car and heats up, so it grips less in the next corners too.", "Cada corrección significa que el coche está deslizando. Un neumático que desliza frena el coche y se calienta, así que agarra menos también en las curvas siguientes.", "Cada correção significa que o carro está escorregando. Um pneu que escorrega freia o carro e esquenta, então agarra menos também nas próximas curvas."],
    line: ["The line sets how tight the corner is. A tighter arc forces a lower speed, so a few metres away from the reference's line cost speed in the whole corner.", "La trazada marca lo cerrada que es la curva. Un arco más cerrado obliga a ir más lento, así que unos metros fuera de la trazada de la referencia cuestan velocidad en toda la curva.", "A linha define o quanto a curva é fechada. Um arco mais fechado obriga a ir mais devagar, então alguns metros fora da linha da referência custam velocidade na curva toda."],
    cons: ["A different braking point every lap means a different corner every lap, so you cannot build on what worked.", "Un punto de frenada distinto cada vuelta es una curva distinta cada vuelta, así que no puedes construir sobre lo que funcionó.", "Um ponto de frenagem diferente a cada volta é uma curva diferente a cada volta, então você não consegue evoluir a partir do que deu certo."],
    lift: ["On an oval the car runs close to its top speed, so every lift costs speed that takes the whole straight to win back.", "En un óvalo el coche va cerca de su velocidad punta, así que cada levantón cuesta una velocidad que tarda toda la recta en recuperarse.", "Num oval o carro anda perto da velocidade máxima, então cada alívio custa uma velocidade que leva a reta inteira para recuperar."],
  };
  // what to do instead, with this corner's numbers (A and B are the two laps' marks on the map)
  function howOf(f, c, Tx, u) {
    const r = Math.round, d = r(c.d), vr = c.vminr != null ? r(c.vminr) : null, lift = c.oval && c.lift;
    switch (f) {
      case "late": return lift ? Tx(`Start the lift where the reference does, at B on the map (${d} m from the line), and keep the speed up through the middle of the corner (${vr} ${u}).`, `Empieza a levantar donde la referencia, en B en el mapa (a ${d} m de la línea), y mantén la velocidad por el centro de la curva (${vr} ${u}).`, `Comece a aliviar onde a referência alivia, em B no mapa (a ${d} m da linha), e mantenha a velocidade pelo meio da curva (${vr} ${u}).`)
        : Tx(`Brake at the reference's point, B on the map (${d} m from the line), a little before your own at A. Press hard at first, then release into the apex so you reach it at ${vr} ${u}.`, `Frena en el punto de la referencia, B en el mapa (a ${d} m de la línea), un poco antes que tu punto A. Pisa fuerte al principio y suelta hasta el vértice para llegar a ${vr} ${u}.`, `Freie no ponto da referência, B no mapa (a ${d} m da linha), um pouco antes do seu ponto A. Pise forte no início e solte até o ápice para chegar a ${vr} ${u}.`);
      case "early": return lift ? Tx("Move your lift towards B on the map a few metres at a time, until the car starts to feel loose on entry. Then keep that point.", "Lleva tu levantón hacia B en el mapa unos metros cada vez, hasta que el coche empiece a moverse a la entrada. Luego mantén ese punto.", "Leve seu alívio em direção a B no mapa alguns metros por vez, até o carro começar a ficar solto na entrada. Depois mantenha esse ponto.")
        : Tx(`Pick a marker by the track (a board, a kerb, a shadow) near B on the map, ${d} m from the line, and move your braking towards it 5 m a lap until the entry starts to feel nervous. Then keep that marker.`, `Elige una referencia junto a la pista (un cartel, un piano, una sombra) cerca de B en el mapa, a ${d} m de la línea, y acerca tu frenada 5 m por vuelta hasta que la entrada se ponga nerviosa. Luego mantén esa referencia.`, `Escolha uma referência ao lado da pista (uma placa, uma zebra, uma sombra) perto de B no mapa, a ${d} m da linha, e aproxime sua frenagem 5 m por volta até a entrada ficar nervosa. Depois mantenha essa referência.`);
      case "hard": return Tx("Hit the brake hard at once, close to full pressure, and ease off as the car slows. Most of the braking is done in the first metres.", "Pisa el freno fuerte de golpe, cerca de la presión máxima, y afloja según el coche se frena. Casi toda la frenada se hace en los primeros metros.", "Pise o freio forte de uma vez, perto da pressão máxima, e alivie conforme o carro desacelera. Quase toda a frenagem acontece nos primeiros metros.");
      case "trail": return Tx("Keep a little brake on as you turn in and let it out slowly until the apex. The front stays loaded and the car turns in when you ask.", "Mantén un poco de freno al girar y suéltalo despacio hasta el vértice. El delantero sigue cargado y el coche gira cuando se lo pides.", "Mantenha um pouco de freio ao entrar na curva e solte devagar até o ápice. A dianteira continua carregada e o carro vira quando você pede.");
      case "coast": return Tx("Go straight from the brake to the throttle. As soon as the brake is off, a touch of throttle keeps the car balanced.", "Pasa directamente del freno al acelerador. En cuanto sueltas el freno, un toque de gas mantiene el coche equilibrado.", "Passe direto do freio para o acelerador. Assim que soltar o freio, um toque no acelerador mantém o carro equilibrado.");
      case "speed": return Tx(`Aim for ${vr} ${u} at the slowest point. Brake a touch less, turn in smoothly and let the car roll through the middle of the corner.`, `Busca ${vr} ${u} en el punto más lento. Frena un poco menos, gira con suavidad y deja rodar el coche por el centro de la curva.`, `Busque ${vr} ${u} no ponto mais lento. Freie um pouco menos, entre com suavidade e deixe o carro rolar pelo meio da curva.`);
      case "long": return Tx("Turn in a little later and put the apex later, so you can straighten the wheel and pick up the throttle sooner.", "Gira un poco más tarde y retrasa el vértice, así puedes enderezar el volante y acelerar antes.", "Entre um pouco mais tarde e atrase o ápice, assim você endireita o volante e acelera mais cedo.");
      case "exit": return c.pur != null ? Tx(`Pick up the throttle where the reference does (the green mark on the map, ${r(c.pur)} m from the line) and squeeze it to full as you unwind the wheel.`, `Acelera donde la referencia (la marca verde en el mapa, a ${r(c.pur)} m de la línea) y llega a fondo mientras abres el volante.`, `Acelere onde a referência acelera (a marca verde no mapa, a ${r(c.pur)} m da linha) e chegue ao fundo enquanto desfaz o volante.`)
        : Tx("Pick up the throttle at the apex and squeeze it to full as you unwind the wheel.", "Acelera en el vértice y llega a fondo mientras abres el volante.", "Acelere no ápice e chegue ao fundo enquanto desfaz o volante.");
      case "rough": return Tx("Open the throttle in one smooth movement and straighten the wheel before full throttle. If the rear steps out, you opened it too fast.", "Abre el gas en un solo movimiento suave y endereza el volante antes de ir a fondo. Si la trasera se escapa, lo abriste demasiado rápido.", "Abra o acelerador num só movimento suave e endireite o volante antes de ir ao fundo. Se a traseira escapar, você abriu rápido demais.");
      case "gear": return c.gB > c.gA ? Tx(`Use gear ${c.gB} here. The engine pulls well enough and the rear stays calmer on exit.`, `Usa la ${c.gB}ª aquí. El motor tira lo suficiente y la trasera va más tranquila a la salida.`, `Use a ${c.gB}ª marcha aqui. O motor puxa o bastante e a traseira fica mais calma na saída.`)
        : Tx(`Shift down to gear ${c.gB} before you turn in, so the engine is in its best revs for the exit.`, `Baja a ${c.gB}ª antes de girar, así el motor está en sus mejores revoluciones para la salida.`, `Reduza para a ${c.gB}ª marcha antes de entrar, assim o motor fica na melhor rotação para a saída.`);
      case "steer": return Tx("Turn the wheel once, to the angle the corner needs, and hold it. If you have to correct, you came in too fast, so brake a touch earlier.", "Gira el volante una vez, lo que pide la curva, y mantenlo. Si tienes que corregir es que entraste demasiado rápido, así que frena un poco antes.", "Gire o volante uma vez, o quanto a curva pede, e segure. Se precisar corrigir, você entrou rápido demais, então freie um pouco antes.");
      case "line": return Tx("Use the whole track. Start the corner from the outside edge, touch the apex and let the car run out to the edge on exit.", "Usa toda la pista. Empieza la curva desde el borde exterior, toca el vértice y deja que el coche salga hasta el borde.", "Use a pista toda. Comece a curva pela borda de fora, toque o ápice e deixe o carro sair até a borda.");
      case "cons": return Tx("Pick one braking marker and one turn-in point and hit them every lap. Only move them once you hit them every time.", "Elige una referencia de frenada y un punto de giro y clávalos cada vuelta. Muévelos solo cuando los clavas siempre.", "Escolha uma referência de frenagem e um ponto de entrada e acerte-os em toda volta. Só mude quando acertar sempre.");
      case "lift": return c.flatB ? Tx("Keep your foot down here. If the car feels loose, lift earlier in the corner before so you arrive here straight.", "Mantén el pie a fondo aquí. Si el coche se mueve, levanta antes en la curva anterior para llegar aquí recto.", "Mantenha o pé no fundo aqui. Se o carro ficar solto, alivie antes na curva anterior para chegar aqui reto.")
        : Tx("Copy the reference's lift, which starts at B on the map. One smooth lift, and back to full throttle as soon as the car points down the straight.", "Copia el levantón de la referencia, que empieza en B en el mapa. Un solo levantón suave, y a fondo otra vez en cuanto el coche apunta a la recta.", "Copie o alívio da referência, que começa em B no mapa. Um só alívio suave, e de volta ao fundo assim que o carro apontar para a reta.");
    }
    return "";
  }
  const PHASE_WHERE = { brake: ["under braking", "en la frenada", "na frenagem"], entry: ["on the way into the corner", "al entrar en la curva", "na entrada da curva"], apex: ["around the apex", "en el vértice", "no ápice"], exit: ["on the exit", "a la salida", "na saída"] };
  // what happened in a corner, measured: where the time goes, where you brake or lift against the reference, the speeds, the throttle and the gear
  function whatOf(c, Tx, u) {
    const r = Math.round, r2 = (v) => Math.round(v * 100) / 100, ph = c.phase || "brake", pl = c.ph && c.ph[ph] > 0 ? r2(c.ph[ph]) : null, W = PHASE_WHERE[ph] || PHASE_WHERE.brake, lift = c.oval && c.lift, out = [];
    out.push(pl != null && pl < r2(c.lost) ? Tx(`You lose ${r2(c.lost)} s in T${c.n}, ${pl} s of it ${W[0]}.`, `Pierdes ${r2(c.lost)} s en T${c.n}, ${pl} s de ellos ${W[1]}.`, `Você perde ${r2(c.lost)} s na T${c.n}, ${pl} s deles ${W[2]}.`) : Tx(`You lose ${r2(c.lost)} s in T${c.n}, ${W[0]}.`, `Pierdes ${r2(c.lost)} s en T${c.n}, ${W[1]}.`, `Você perde ${r2(c.lost)} s na T${c.n}, ${W[2]}.`));
    if (c.flatB) out.push(Tx("The reference stays flat out here.", "La referencia va a fondo aquí.", "A referência vai de pé no fundo aqui."));
    else if (c.dd != null && Math.abs(c.dd) >= 5) { const m = r(Math.abs(c.dd)); out.push(lift ? Tx(`You lift ${m} m ${c.dd > 0 ? "later" : "earlier"} than the reference (A and B on the map).`, `Levantas ${m} m ${c.dd > 0 ? "más tarde" : "antes"} que la referencia (A y B en el mapa).`, `Você alivia ${m} m ${c.dd > 0 ? "depois" : "antes"} da referência (A e B no mapa).`) : Tx(`You brake ${m} m ${c.dd > 0 ? "later" : "earlier"} than the reference (A and B on the map).`, `Frenas ${m} m ${c.dd > 0 ? "más tarde" : "antes"} que la referencia (A y B en el mapa).`, `Você freia ${m} m ${c.dd > 0 ? "depois" : "antes"} da referência (A e B no mapa).`)); }
    else if (c.dd != null) out.push(lift ? Tx("You lift at the same point as the reference.", "Levantas en el mismo punto que la referencia.", "Você alivia no mesmo ponto da referência.") : Tx("You brake at the same point as the reference.", "Frenas en el mismo punto que la referencia.", "Você freia no mesmo ponto da referência."));
    if (c.vmin != null && c.vminr != null) { const a = r(c.vmin), b = r(c.vminr); out.push(a === b ? Tx(`At the slowest point you match it, ${a} ${u}.`, `En el punto más lento vas igual, ${a} ${u}.`, `No ponto mais lento você empata, ${a} ${u}.`) : Tx(`At the slowest point you are at ${a} ${u} and the reference at ${b}.`, `En el punto más lento vas a ${a} ${u} y la referencia a ${b}.`, `No ponto mais lento você está a ${a} ${u} e a referência a ${b}.`)); }
    if (c.kind === "trail" && c.trailA != null) out.push(Tx(`You hold the brake ${r(c.trailA)} m into the turn and the reference ${r(c.trailB)} m.`, `Mantienes el freno ${r(c.trailA)} m dentro de la curva y la referencia ${r(c.trailB)} m.`, `Você segura o freio ${r(c.trailA)} m dentro da curva e a referência ${r(c.trailB)} m.`));
    if (!c.est && c.coastA - c.coastB >= 10) out.push(Tx(`${r(c.coastA)} m with no pedal pressed (reference ${r(c.coastB)} m).`, `${r(c.coastA)} m sin pisar ningún pedal (referencia ${r(c.coastB)} m).`, `${r(c.coastA)} m sem nenhum pedal (referência ${r(c.coastB)} m).`));
    if (c.late != null && Math.abs(c.late) >= 8) out.push(Tx(`You pick up the throttle ${r(Math.abs(c.late))} m ${c.late > 0 ? "later" : "earlier"}.`, `Aceleras ${r(Math.abs(c.late))} m ${c.late > 0 ? "más tarde" : "antes"}.`, `Você acelera ${r(Math.abs(c.late))} m ${c.late > 0 ? "depois" : "antes"}.`));
    if (!c.est && c.gA >= 1 && c.gB >= 1 && c.gA !== c.gB) out.push(Tx(`Gear ${c.gA} at the apex (reference ${c.gB}).`, `${c.gA}ª en el vértice (referencia ${c.gB}ª).`, `${c.gA}ª marcha no ápice (referência ${c.gB}ª).`));
    return out.join(" ");
  }
  /* the points of a corner on the map: where you brake (A) and where the reference does (B), its slowest point and where
     each picks up the throttle; the stretch from 50 m before braking to 150 m after the apex is the corner */
  function cornerMarks(c, L) {
    const w = (d) => L > 0 ? ((d % L) + L) % L : d, out = [], lift = !!c.lift;
    if (c.flatB) out.push({ d: w(c.d), k: "a", lift: true });
    else { if (c.dd != null) out.push({ d: w(c.d + c.dd), k: "a", lift }); out.push({ d: w(c.d), k: "b", lift }); }
    out.push({ d: w(c.apex), k: "apex", n: c.n });
    if (c.pur != null && /^(exit|rough)$/.test(familyOf(c.kind))) { out.push({ d: w(c.pur), k: "thr" }); if (c.pua != null) out.push({ d: w(c.pua), k: "thra" }); }
    return out;
  }
  const cornerSpan = (c) => [Math.max(0, c.d - 50), c.apex + 150];
  /* a corner's step of the plan: the tip, what happened, why it costs time and what to do instead, and its points on the map */
  function cornerStep(c, Tx, u, L, w) {
    const f = familyOf(c.kind), what = whatOf(c, Tx, u), cf = c.oval && c.lift && COST[f + "_lift"] ? f + "_lift" : f, cost = Tx(...(COST[cf] || COST.speed)), how = howOf(f, c, Tx, u);
    return { k: "corner", id: "corner:" + (c.kind || ""), kind: c.kind, turns: [c.n], gain: c.lost, w, t: `T${c.n} · ${Tx(c.tip[0], c.tip[1], c.tip[2])}`, what, cost, why: what + " " + cost, how, marks: cornerMarks(c, L), spans: [cornerSpan(c)] };
  }
  // the corners a step is about, as marks at their slowest points and their stretches
  const turnMarks = (list) => list.map((c) => ({ d: c.apex, k: "apex", n: c.n }));
  const turnSpans = (list) => list.map(cornerSpan);
  const tNames = (list) => list.map((c) => "T" + c.n).join(", ");
  const lapClock = (t) => { if (!(t > 0)) return "–"; const m = Math.floor(t / 60), s = t - m * 60; return (m ? m + ":" + (s < 10 ? "0" : "") : "") + s.toFixed(3); };
  const lapTimeOf = (l) => { if (l && l.time > 0) return l.time; const b = l && l.bins, lim = b ? Math.min(b.length - 1, l.maxBin != null ? l.maxBin : b.length - 1) : -1; for (let i = lim; i >= 0; i--) if (b[i] && b[i][1] > 0) return b[i][1]; return null; };
  const medianOf = (a) => { const v = a.slice().sort((x, y) => x - y), h = v.length >> 1; return v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2; };
  /* the plan's steps about the whole lap and the session: trail braking over several corners, a car that pushes or steps
     out (with the setup that helps when it does it everywhere), the gears, tyres that fade over a run, and the gap between
     the driver's usual lap and their best (how races are won) */
  function lapSteps(cs, ov, A, LP, Tx, u) {
    const P = [], r = Math.round, r2 = (v) => Math.round(v * 100) / 100, sum = (l, f) => l.reduce((q, c) => q + f(c), 0), lostOf = (l) => sum(l, (c) => Math.max(0, c.lost)), dirt = ov === "dirt", ss = ov === "superspeedway";
    const T = (a) => Tx(a[0], a[1], a[2]), step = (k, list, gain, t, what, cost, how) => P.push({ k, id: k, turns: list.map((c) => c.n), gain, t, what, cost, why: (what + " " + cost).trim(), how, marks: turnMarks(list), spans: turnSpans(list) });
    // trail braking: braking corners where the brake goes off at once, against a reference that keeps it into the turn
    const tr = cs.filter((c) => !c.est && !c.lift && c.lost > .03 && c.trailA != null && c.trailB - c.trailA >= 12);
    const gTr = sum(tr, (c) => Math.max(0, (c.ph.brake || 0) + (c.ph.entry || 0)));
    if (tr.length >= 2 && !ss && gTr > .06) { const mA = r(sum(tr, (c) => c.trailA) / tr.length), mB = r(sum(tr, (c) => c.trailB) / tr.length), nm = tNames(tr);
      step("trail", tr, gTr * .8, Tx(`Trail braking in ${nm}`, `Trail braking en ${nm}`, `Trail braking em ${nm}`),
        Tx(`In these corners you let go of the brake about ${mA} m into the turn and the reference about ${mB} m.`, `En estas curvas sueltas el freno unos ${mA} m dentro de la curva y la referencia unos ${mB} m.`, `Nestas curvas você solta o freio uns ${mA} m dentro da curva e a referência uns ${mB} m.`), T(COST.trail),
        Tx("Brake hard in a straight line, then let the pedal out slowly as you turn the wheel, like letting out a spring. The brake is fully off at the apex, not before.", "Frena fuerte en línea recta y suelta el pedal despacio mientras giras el volante, como quien suelta un muelle. El freno queda suelto del todo en el vértice, no antes.", "Freie forte em linha reta e solte o pedal devagar enquanto gira o volante, como quem solta uma mola. O freio fica totalmente solto no ápice, não antes.")); }
    // the car pushes (understeer): more wheel than the reference and still slower at the slowest point
    const us = dirt ? [] : cs.filter((c) => c.lost > .03 && c.stA > 0 && c.stB > 0 && c.stA > c.stB * 1.12 && c.vmin != null && c.vmin < c.vminr - 1);
    if (us.length >= 2) { const pc = r(sum(us, (c) => c.stA / c.stB - 1) / us.length * 100), nm = tNames(us);
      step("rotate", us, lostOf(us) * .6, Tx(`The car pushes wide in ${nm}`, `El coche se va de morro en ${nm}`, `O carro sai de frente em ${nm}`),
        Tx(`In these corners you turn the wheel about ${pc} % more than the reference and still pass the slowest point slower.`, `En estas curvas giras el volante un ${pc} % más que la referencia y aun así pasas más lento por el punto más lento.`, `Nestas curvas você gira o volante uns ${pc} % mais que a referência e ainda passa mais lento no ponto mais lento.`),
        Tx("That is understeer. The front tyres are past their grip and slide instead of turning the car, so it runs wide and you wait for it before the throttle.", "Eso es subviraje. Las ruedas delanteras han pasado su límite y deslizan en vez de girar el coche, así que se abre y tienes que esperar para acelerar.", "Isso é sair de frente. Os pneus dianteiros passaram do limite e escorregam em vez de virar o carro, então ele abre e você espera para acelerar."),
        ov ? Tx("Roll in with a little less speed and less wheel, and let the car take a set before you go back to the throttle. If it is tight in every corner, the setup helps. Take a little wedge out (less cross weight) or soften the front.", "Entra con un poco menos de velocidad y menos volante, y deja que el coche se asiente antes de volver al gas. Si va duro de morro en todas las curvas, el reglaje ayuda. Quita un poco de cuña (menos peso cruzado) o ablanda el delantero.", "Entre com um pouco menos de velocidade e menos volante, e deixe o carro assentar antes de voltar ao acelerador. Se sair de frente em todas as curvas, o acerto ajuda. Tire um pouco de cunha (menos peso cruzado) ou amacie a dianteira.")
          : Tx("Brake a touch earlier, keep a little brake on into the turn to load the front, and turn the wheel less, not more. If it pushes in every corner, the setup helps. A softer front anti-roll bar, a little more front wing or a touch less front tyre pressure.", "Frena un poco antes, mantén algo de freno al girar para cargar el delantero y gira menos el volante, no más. Si se va de morro en todas las curvas, el reglaje ayuda. Una barra estabilizadora delantera más blanda, algo más de alerón delantero o un poco menos de presión delante.", "Freie um pouco antes, mantenha um pouco de freio ao entrar para carregar a dianteira e gire menos o volante, não mais. Se sair de frente em todas as curvas, o acerto ajuda. Uma barra estabilizadora dianteira mais macia, um pouco mais de asa dianteira ou um pouco menos de pressão na frente.")); }
    // the rear steps out on exit (oversteer): lifts and corrections after the apex
    const os = dirt ? [] : cs.filter((c) => c.lost > .03 && (/^(steer|lifts|throttle_rough)$/.test(c.kind || "") || (!c.est && c.lA >= 1 && c.lA > c.lB && c.rA > c.rB + 1)));
    if (os.length >= 2) { const nm = tNames(os);
      step("loose", os, lostOf(os) * .6, Tx(`The rear steps out on exit in ${nm}`, `La trasera se escapa a la salida en ${nm}`, `A traseira escapa na saída em ${nm}`),
        Tx("In these corners you lift or correct the wheel after the apex more than the reference.", "En estas curvas levantas el gas o corriges el volante tras el vértice más que la referencia.", "Nestas curvas você alivia o acelerador ou corrige o volante depois do ápice mais que a referência."),
        Tx("That is oversteer. A rear that slides makes you wait with the throttle and heats the rear tyres, so they grip less as the run goes on.", "Eso es sobreviraje. Una trasera que desliza te obliga a esperar con el gas y calienta las ruedas traseras, que agarran menos según avanza la tanda.", "Isso é sair de traseira. Uma traseira que escorrega obriga você a esperar com o acelerador e esquenta os pneus traseiros, que agarram menos conforme a sequência avança."),
        ov ? Tx("Squeeze the throttle off the corner and keep the wheel still. If it is loose in every corner, the setup helps. Add a little wedge (more cross weight) or a touch more rear grip.", "Aprieta el gas progresivamente a la salida y mantén el volante quieto. Si va suelto en todas las curvas, el reglaje ayuda. Pon un poco más de cuña (más peso cruzado) o algo más de agarre detrás.", "Aperte o acelerador aos poucos na saída e mantenha o volante parado. Se ficar solto em todas as curvas, o acerto ajuda. Ponha um pouco mais de cunha (mais peso cruzado) ou um pouco mais de aderência atrás.")
          : Tx("Straighten the wheel before full throttle and squeeze it, never stab it. If it steps out in every corner, the setup helps. A softer rear anti-roll bar, a little more rear wing or one more step of traction control.", "Endereza el volante antes de ir a fondo y aprieta el gas, nunca de golpe. Si la trasera se escapa en todas las curvas, el reglaje ayuda. Una barra estabilizadora trasera más blanda, algo más de alerón trasero o un punto más de control de tracción.", "Endireite o volante antes de ir ao fundo e aperte o acelerador, nunca de uma vez. Se a traseira escapar em todas as curvas, o acerto ajuda. Uma barra estabilizadora traseira mais macia, um pouco mais de asa traseira ou um nível a mais de controle de tração.")); }
    // the gears: corners taken in another gear than the reference's
    const gs = cs.filter((c) => !c.est && c.lost > .03 && c.gA >= 1 && c.gB >= 1 && c.gA !== c.gB);
    if (gs.length >= 2) { const nm = tNames(gs), ls = gs.map((c) => Tx(`T${c.n} in gear ${c.gA} (reference ${c.gB})`, `T${c.n} en ${c.gA}ª (referencia ${c.gB}ª)`, `T${c.n} em ${c.gA}ª (referência ${c.gB}ª)`)).join(", ");
      step("gears", gs, lostOf(gs) * .6, Tx(`Gears in ${nm}`, `Marchas en ${nm}`, `Marchas em ${nm}`), Tx(`You take ${ls}.`, `Tomas ${ls}.`, `Você faz ${ls}.`), T(COST.gear),
        Tx("Copy the reference's gear in these corners. Shift down before you turn in, never in the middle of the corner, and shift up as soon as the revs reach the top of the band.", "Copia la marcha de la referencia en estas curvas. Reduce antes de girar, nunca en mitad de la curva, y sube en cuanto las revoluciones lleguen arriba.", "Copie a marcha da referência nestas curvas. Reduza antes de entrar, nunca no meio da curva, e suba assim que a rotação chegar ao topo.")); }
    // the session: the laps of lap A's session (valid, with a time), in the order they were driven
    const same = (LP || []).filter((l) => l && l.valid !== false && (!A || !A.sessionId || !l.sessionId || l.sessionId === A.sessionId)).map((l, i) => ({ t: lapTimeOf(l), n: l.n != null ? l.n : i })).filter((x) => x.t > 0).sort((a, b) => a.n - b.n);
    // tyres that fade over a run: the last laps against the first ones (the first lap is the out lap, on cold tyres)
    if (same.length >= 8) { const ts = same.map((x) => x.t), first = medianOf(ts.slice(1, 4)), last = medianOf(ts.slice(-3)), fall = last - first;
      if (fall > .4 && fall > first * .003) P.push({ k: "tyres", id: "tyres", gain: fall * .4, t: Tx(`Your pace fades ${r2(fall)} s over the run`, `Tu ritmo cae ${r2(fall)} s a lo largo de la tanda`, `Seu ritmo cai ${r2(fall)} s ao longo da sequência`),
        what: Tx(`Your first laps are around ${lapClock(first)} and the last ones around ${lapClock(last)}.`, `Tus primeras vueltas rondan ${lapClock(first)} y las últimas ${lapClock(last)}.`, `Suas primeiras voltas ficam em torno de ${lapClock(first)} e as últimas de ${lapClock(last)}.`),
        cost: Tx("Tyres that slide get hot and wear, and lose grip lap after lap. In a race the laps at the end of a run matter more than the fastest one.", "Los neumáticos que deslizan se calientan y se gastan, y pierden agarre vuelta tras vuelta. En carrera las vueltas del final de una tanda importan más que la más rápida.", "Pneus que escorregam esquentam e se gastam, e perdem aderência volta após volta. Na corrida as voltas do fim de uma sequência importam mais do que a mais rápida."),
        how: dirt ? Tx("On dirt the track and the tyres change every lap. Move up or down the track to find the grip, and be gentle with the throttle so the rears do not overheat.", "En tierra la pista y los neumáticos cambian cada vuelta. Sube o baja en la pista para buscar agarre y sé suave con el gas para que las traseras no se sobrecalienten.", "Na terra a pista e os pneus mudam a cada volta. Suba ou desça na pista para achar aderência e seja suave no acelerador para os traseiros não superaquecerem.")
          : ov ? Tx("On an oval the right-side tyres go first. As the run goes on, lift a little earlier and lighter and do not let the car slide up the track.", "En un óvalo los neumáticos del lado derecho caen primero. Según avanza la tanda, levanta un poco antes y menos y no dejes que el coche resbale hacia arriba.", "Num oval os pneus do lado direito caem primeiro. Conforme a sequência avança, alivie um pouco antes e mais leve e não deixe o carro escorregar para cima.")
          : Tx("Be smoother with the wheel and the throttle on the exits and do not let the car slide. Late in the run, brake a touch earlier and give up a little entry speed to keep the rear tyres alive.", "Sé más suave con el volante y el gas a la salida y no dejes deslizar el coche. Al final de la tanda, frena un poco antes y sacrifica algo de velocidad de entrada para cuidar las traseras.", "Seja mais suave no volante e no acelerador nas saídas e não deixe o carro escorregar. No fim da sequência, freie um pouco antes e abra mão de um pouco de velocidade de entrada para poupar os traseiros."), marks: [], spans: [] }); }
    // the usual lap against the best one: how races are won
    if (same.length >= 5) { const ts = same.map((x) => x.t), best = Math.min(...ts), med = medianOf(ts), gap = med - best;
      if (gap > .5 && gap > best * .005) P.push({ k: "pace", id: "pace", gain: gap * .5, t: Tx(`Your usual lap is ${r2(gap)} s slower than your best`, `Tu vuelta habitual es ${r2(gap)} s más lenta que la mejor`, `Sua volta habitual é ${r2(gap)} s mais lenta que a melhor`),
        what: Tx(`Over ${ts.length} laps your best is ${lapClock(best)} and your middle lap ${lapClock(med)}.`, `En ${ts.length} vueltas tu mejor es ${lapClock(best)} y tu vuelta media ${lapClock(med)}.`, `Em ${ts.length} voltas sua melhor é ${lapClock(best)} e sua volta média ${lapClock(med)}.`),
        cost: Tx(`A race is won on the usual lap, not the best one. ${r2(gap)} s every lap is ${r(gap * 20)} s over 20 laps.`, `Una carrera se gana con la vuelta habitual, no con la mejor. ${r2(gap)} s cada vuelta son ${r(gap * 20)} s en 20 vueltas.`, `Uma corrida se ganha com a volta habitual, não com a melhor. ${r2(gap)} s por volta são ${r(gap * 20)} s em 20 voltas.`),
        how: Tx("Drive at about 98 %. Use the same markers every lap, brake a touch early rather than late, and after a mistake take the next corner calmly instead of trying to win the time back. In traffic, plan the pass a corner ahead and make it on the exit.", "Conduce al 98 %. Usa las mismas referencias cada vuelta, frena un poco antes mejor que tarde y, después de un error, toma la siguiente curva con calma en vez de intentar recuperar el tiempo. En tráfico, prepara el adelantamiento una curva antes y hazlo a la salida.", "Pilote a uns 98 %. Use as mesmas referências em toda volta, freie um pouco antes em vez de tarde e, depois de um erro, faça a próxima curva com calma em vez de tentar recuperar o tempo. No tráfego, prepare a ultrapassagem uma curva antes e faça-a na saída."), marks: [], spans: [] }); }
    return P;
  }
  /* ---------- the plan ---------- */
  /* the oval's own step of the plan: how this kind of oval is driven, with what lap A did against the reference (how much
     of the lap flat out, its lifts and braking zones); on a superspeedway taken flat out by both laps, the gap is the draft */
  function ovalStep(ov, A, R, sa, sb, n, cs, lapD, Tx) {
    const fA = fullShare(sa.arr.slice(0, n)), fB = fullShare(sb.arr.slice(0, n)), pc = (v) => Math.round(v * 100) + " %", r2 = (v) => Math.round(v * 100) / 100;
    const lA = liftZones(sa.arr).length, lB = liftZones(sb.arr).length, bA = brakeZones(sa.arr).length, bB = brakeZones(sb.arr).length;
    const flat = Tx(`Flat out ${pc(fA)} of the lap (reference ${pc(fB)}).`, `A fondo el ${pc(fA)} de la vuelta (referencia ${pc(fB)}).`, `De pé no fundo ${pc(fA)} da volta (referência ${pc(fB)}).`), turns = cs.filter((c) => c.lost > .05).map((c) => c.n);
    if (ov === "superspeedway" && fA >= .97 && fB >= .97 && lapD > .05) return { k: "oval", gain: lapD, t: Tx(`Flat out all lap like the reference, so the ${r2(lapD)} s are the draft`, `A fondo toda la vuelta como la referencia, así que los ${r2(lapD)} s son el rebufo`, `De pé no fundo a volta toda como a referência, então os ${r2(lapD)} s são o vácuo`),
      why: Tx("On a superspeedway the lap time comes from the cars around you more than from the corners.", "En un superóvalo el tiempo de vuelta sale de los coches que te rodean más que de las curvas.", "Num superspeedway o tempo de volta vem dos carros ao seu redor mais do que das curvas."),
      how: Tx("Work in the pack. Stay in line with a partner, make your moves on the straights and keep the wheel still, because every correction scrubs speed.", "Trabaja en el pelotón. Ponte en fila con un compañero, haz tus movimientos en las rectas y mantén el volante quieto, porque cada corrección frena el coche.", "Trabalhe no pelotão. Fique em fila com um parceiro, faça seus movimentos nas retas e mantenha o volante parado, porque cada correção tira velocidade.") };
    const S = {
      superspeedway: [`Superspeedway · flat out ${pc(fA)} of the lap (reference ${pc(fB)})`, `Superóvalo · a fondo el ${pc(fA)} de la vuelta (referencia ${pc(fB)})`, `Superspeedway · de pé no fundo ${pc(fA)} da volta (referência ${pc(fB)})`,
        Tx(`You lift in ${lA} corners and the reference in ${lB}.`, `Levantas en ${lA} curvas y la referencia en ${lB}.`, `Você alivia em ${lA} curvas e a referência em ${lB}.`),
        ["Here the car goes flat out all lap. Lift only to stay out of trouble in the pack, keep the wheel still and let the draft do the work.", "Aquí el coche va a fondo toda la vuelta. Levanta solo para evitar problemas en el pelotón, mantén el volante quieto y deja que el rebufo haga el trabajo.", "Aqui o carro vai de pé no fundo a volta toda. Alivie só para evitar problemas no pelotão, mantenha o volante parado e deixe o vácuo fazer o trabalho."]],
      intermediate: [`Intermediate oval · lifts in ${lA} corners (reference ${lB})`, `Óvalo intermedio · levantas en ${lA} curvas (referencia ${lB})`, `Oval intermediário · alívios em ${lA} curvas (referência ${lB})`, flat,
        ["Lift once, early and lightly, roll the middle of the corner and squeeze back to full throttle as the car straightens. The tyres fade over a long run, so lift a little earlier as the laps go by.", "Levanta una vez, pronto y poco, deja rodar el centro de la curva y vuelve a fondo progresivamente cuando el coche se endereza. Los neumáticos caen en una tanda larga, así que levanta un poco antes según pasan las vueltas.", "Alivie uma vez, cedo e pouco, deixe o carro rolar no meio da curva e volte ao fundo aos poucos quando o carro endireitar. Os pneus caem numa sequência longa, então alivie um pouco antes conforme as voltas passam."]],
      mile: [`Flat mile · ${bA} braking zones and ${lA} lifts (reference ${bB} and ${lB})`, `Óvalo de una milla · ${bA} frenadas y ${lA} levantones (referencia ${bB} y ${lB})`, `Oval de uma milha · ${bA} frenagens e ${lA} alívios (referência ${bB} e ${lB})`, flat,
        ["A lift and a light touch of the brake set the car for the corner. Get it turned in the middle and squeeze the throttle so the rear stays planted, because the exit is where the lap is won.", "Un levantón y un toque suave de freno preparan el coche para la curva. Hazlo girar en el centro y aprieta el gas progresivamente para que la trasera no se mueva, porque la vuelta se gana en la salida.", "Um alívio e um toque leve no freio preparam o carro para a curva. Faça-o virar no meio e aperte o acelerador aos poucos para a traseira ficar plantada, porque a volta se ganha na saída."]],
      short: [`Short track · ${bA} braking zones (reference ${bB})`, `Óvalo corto · ${bA} frenadas (referencia ${bB})`, `Pista curta · ${bA} frenagens (referência ${bB})`, flat,
        ["Brake in a straight line, come off the brake before the middle of the corner and pick up the throttle gently. Wheelspin off the corner costs the whole straight, and in the race a clean exit is how you pass.", "Frena en línea recta, suelta el freno antes del centro de la curva y acelera con suavidad. Patinar a la salida te cuesta toda la recta, y en carrera una salida limpia es como se adelanta.", "Freie em linha reta, solte o freio antes do meio da curva e acelere com suavidade. Patinar na saída custa a reta inteira, e na corrida uma saída limpa é como se ultrapassa."]],
      dirt: [`Dirt oval · flat out ${pc(fA)} of the lap (reference ${pc(fB)})`, `Óvalo de tierra · a fondo el ${pc(fA)} de la vuelta (referencia ${pc(fB)})`, `Oval de terra · de pé no fundo ${pc(fA)} da volta (referência ${pc(fB)})`,
        Tx(`You brake in ${bA} corners and the reference in ${bB}.`, `Frenas en ${bA} curvas y la referencia en ${bB}.`, `Você freia em ${bA} curvas e a referência em ${bB}.`),
        ["Slow the car early and turn it on entry, then steer it with the throttle. The grip moves during the race, so look for the groove from the bottom to the cushion.", "Frena el coche pronto y hazlo girar a la entrada, y luego dirígelo con el acelerador. El agarre cambia durante la carrera, así que busca la línea desde abajo hasta el cushion.", "Segure o carro cedo e faça-o virar na entrada, e depois guie-o com o acelerador. A aderência muda durante a corrida, então procure a linha de baixo até o cushion."]],
    }[ov];
    return S ? { k: "oval", turns, gain: 0, t: Tx(S[0], S[1], S[2]), why: S[3], how: Tx(S[4][0], S[4][1], S[4][2]) } : null;
  }
  /* what to work on first: the corners that cost the most (weighed by what the coach learnt of their tips and how hard the
     corner is for everyone), the phase that repeats, the straights, the corners taken differently every lap, how the lap is
     driven, and the driver's habit first */
  function coachPlan(A, R, LP, ctx) {
    const Tx = txOf(ctx), { spdU } = unitsOf(ctx), C = coachOf(ctx), tipWeight = C.weight, turns = turnsOf(ctx), cornerHint = hintOf(ctx), pn = (k) => phaseName(k, ctx);
    const ov = ovalOf(A, R, ctx), est = estOf(R, ctx), cx = ov || est ? { ...ctx, ...(ov ? { oval: ov } : {}), ...(est ? { estB: true } : {}) } : ctx; // the oval is found once, from the laps and ctx.track
    const cs = coachCompare(A, R, cx), sa = lapSeries(A), sb = lapSeries(R), n = Math.min(sa.end, sb.end), lapD = A.time - R.time;
    const lost = cs.reduce((s, c) => s + Math.max(0, c.lost), 0), gained = cs.reduce((s, c) => s + Math.min(0, c.lost), 0), inCorners = cs.reduce((s, c) => s + c.lost, 0), straight = lapD - inCorners;
    // a corner whose phases swing more than a second each way is not the same corner on both laps: its phases are not counted
    const ph = { brake: 0, entry: 0, apex: 0, exit: 0 }, phN = { brake: 0, entry: 0, apex: 0, exit: 0 }; cs.forEach((c) => { if (Object.values(c.ph).some((v) => Math.abs(v) > 1)) return; Object.keys(ph).forEach((k) => { const v = c.ph[k] || 0; if (v > 0) { ph[k] += v; if (v > .02) phN[k]++; } }); });
    const secs = pairSecs(A, R, sa, sb, n).map(([a, b], k) => ({ n: k + 1, a, b, d: a - b }));
    const driving = lapDriving(sa, sb, n, cx), cons = cornerConsistency((LP || []).filter((l) => l.valid !== false), R, turns, ov) || [];
    // a corner weighs what the coach learnt of its tip (tipWeight) and how hard the corner is for everyone (the model's spread of
    // times there); a corner you take differently every lap hears about consistency first
    const dif = (c) => { const h = cornerHint(c.apex); return h && h.spread > 0 && h.spreadMax > 0 ? 0.9 + 0.3 * Math.min(1, h.spread / h.spreadMax) : 1; };
    cs.forEach((c) => { const cz = cons.find((x) => x.n === c.n); if (cz && cz.sd > .08 && cz.sd > 2 * c.lost && /^brake/.test(c.kind || "")) { c.kind = "cons"; c.tip = ["Same braking point every lap, before anything else", "El mismo punto de frenada cada vuelta, antes que nada", "O mesmo ponto de frenagem em toda volta, antes de qualquer outra coisa"]; } });
    const P = [], r2 = (v) => Math.round(v * 100) / 100, L = n * BIN, T3 = (a) => Tx(a[0], a[1], a[2]);
    cs.filter((c) => c.lost > .05).sort((a, b) => b.lost * tipWeight(b) * dif(b) - a.lost * tipWeight(a) * dif(a)).slice(0, 3).forEach((c) => P.push(cornerStep(c, Tx, spdU(), L, tipWeight(c) * dif(c))));
    const worst = Object.entries(ph).sort((a, b) => b[1] - a[1])[0];
    // the habit's advice follows the data: where you brake against the reference on average, how fast you reach the apex and when you pick up the throttle
    const avg = (a) => a.length ? a.reduce((q, v) => q + v, 0) / a.length : null, mdd = avg(cs.filter((c) => c.dd != null).map((c) => c.dd)), mdmin = avg(cs.filter((c) => c.vmin != null).map((c) => c.vmin - c.vminr)), mlate = avg(cs.filter((c) => c.late != null).map((c) => c.late));
    if (worst && worst[1] > .12 && phN[worst[0]] >= 3) {
      const HOW = {
        brake: mdd != null && mdd > 4 ? ["You go in deeper than the reference in most corners. Brake a touch earlier and harder, and release the brake into the apex. A later braking point is not buying time here.", "Entras más profundo que la referencia en casi todas las curvas. Frena un poco antes y más fuerte, y suelta el freno hasta el vértice. Frenar más tarde no te está dando tiempo.", "Você entra mais fundo que a referência em quase todas as curvas. Freie um pouco antes e mais forte, e solte o freio até o ápice. Frear mais tarde não está te dando tempo."]
          : mdd != null && mdd < -4 ? ["Pick a fixed braking marker in every corner and brake 5 m later each lap until the entry gets nervous. Press hard at first, then ease off.", "Elige una referencia fija de frenada en cada curva y frena 5 m más tarde cada vuelta hasta que la entrada se ponga nerviosa. Pisa fuerte al principio y luego afloja.", "Escolha uma referência fixa de frenagem em cada curva e freie 5 m mais tarde a cada volta até a entrada ficar nervosa. Pise forte no início e depois alivie."]
          : est ? ["Your braking points match the reference and it carries more speed through the braking zones. Brake a touch less and roll more speed to the apex.", "Tus puntos de frenada coinciden con la referencia y ella lleva más velocidad en las frenadas. Frena un poco menos y deja correr más velocidad hasta el vértice.", "Seus pontos de frenagem coincidem com os da referência e ela leva mais velocidade nas frenagens. Freie um pouco menos e leve mais velocidade até o ápice."]
          : ["Your braking points match the reference, so the time goes in how you brake. Press hard at once, then release progressively as you turn in (trail braking).", "Tus puntos de frenada coinciden con la referencia, así que el tiempo se va en cómo frenas. Pisa fuerte de golpe y suelta progresivamente mientras giras (trail braking).", "Seus pontos de frenagem coincidem com os da referência, então o tempo se perde na forma de frear. Pise forte de uma vez e solte aos poucos enquanto entra na curva (trail braking)."],
        entry: est ? ["Carry more speed into the corners. The reference reaches the turn-in faster and loses less speed before the apex.", "Lleva más velocidad a las curvas. La referencia llega más rápida al punto de giro y pierde menos velocidad antes del vértice.", "Leve mais velocidade para as curvas. A referência chega mais rápida ao ponto de entrada e perde menos velocidade antes do ápice."] : ["Release the brake gradually as you turn in (trail braking) instead of letting go at once, and do not coast. Brake or throttle, never neither.", "Suelta el freno poco a poco mientras giras (trail braking) en vez de soltarlo de golpe, y no vayas en punto muerto. Freno o acelerador, nunca ninguno.", "Solte o freio aos poucos enquanto entra na curva (trail braking) em vez de soltar de uma vez, e não vá no embalo. Freio ou acelerador, nunca nenhum dos dois."],
        apex: mdmin != null && mdmin >= 0 ? ["You are as fast as the reference at the slowest point but slow for longer. Turn in later and put the apex later, so the slow part of the corner gets shorter.", "Vas tan rápido como la referencia en el punto más lento, pero lento durante más metros. Gira más tarde y retrasa el vértice para acortar la parte lenta de la curva.", "Você é tão rápido quanto a referência no ponto mais lento, mas lento por mais tempo. Entre mais tarde e atrase o ápice para encurtar a parte lenta da curva."]
          : ["Turn in a little later and look at the exit. A rounder line lets you keep more speed at the slowest point.", "Gira un poco más tarde y mira a la salida. Una trazada más redonda te deja más velocidad en el punto más lento.", "Entre na curva um pouco mais tarde e olhe para a saída. Uma linha mais redonda deixa você levar mais velocidade no ponto mais lento."],
        exit: mlate != null && mlate <= -5 && mdmin != null && mdmin < -1 ? ["You pick up the throttle earlier than the reference but leave the corners slower. The exit starts at the apex, carry the speed there and the throttle will follow.", "Aceleras antes que la referencia pero sales de las curvas más lento. La salida empieza en el vértice, conserva la velocidad ahí y el acelerador vendrá solo.", "Você acelera antes da referência, mas sai das curvas mais lento. A saída começa no ápice, leve a velocidade ali e o acelerador vem junto."]
          : ["Unwind the steering sooner and open the throttle progressively from the apex, and use all the track on the way out.", "Abre el volante antes y acelera progresivamente desde el vértice, y usa toda la pista a la salida.", "Desfaça o volante mais cedo e abra o acelerador aos poucos desde o ápice, e use toda a pista na saída."],
      };
      // an oval's habits are about the lift, the middle of the corner and the run off it (dirt, the throttle that turns the car)
      if (ov && ov !== "short") HOW.entry = ["Lift once, a little earlier and lighter, and roll the speed into the corner instead of slowing the car at the last moment.", "Levanta una sola vez, un poco antes y menos, y deja correr la velocidad en la curva en vez de frenar el coche en el último momento.", "Alivie uma só vez, um pouco antes e mais leve, e leve a velocidade para dentro da curva em vez de segurar o carro no último momento."];
      if (ov) HOW.apex = ["Keep the car rolling through the middle of the corner. A smoother entry with less steering keeps more speed at the slowest point.", "Mantén el coche rodando por el centro de la curva. Una entrada más suave y con menos volante deja más velocidad en el punto más lento.", "Mantenha o carro rolando pelo meio da curva. Uma entrada mais suave e com menos volante deixa mais velocidade no ponto mais lento."];
      if (ov) HOW.exit = ov === "dirt" ? ["Feed the throttle in on exit instead of stabbing it. Wheelspin on dirt costs you the whole straight.", "Dosifica el gas a la salida en vez de pisarlo de golpe. En tierra, el patinazo te cuesta toda la recta.", "Dose o acelerador na saída em vez de pisar de uma vez. Na terra, a patinada custa a reta inteira."]
        : ["Back to full throttle as soon as the car stops turning and let it run up towards the wall on exit. The speed off the corner is carried down the whole straight.", "Vuelve a fondo en cuanto el coche deja de girar y déjalo subir hacia el muro a la salida. La velocidad de salida se lleva toda la recta.", "Volte ao fundo assim que o carro parar de virar e deixe-o subir em direção ao muro na saída. A velocidade de saída vai pela reta inteira."];
      P.push({ k: "phase", ph0: worst[0], gain: worst[1], t: Tx(`${pn(worst[0])} phase · ${r2(worst[1])} s over the lap`, `Fase de ${pn(worst[0]).toLowerCase()} · ${r2(worst[1])} s en la vuelta`, `Fase de ${pn(worst[0]).toLowerCase()} · ${r2(worst[1])} s na volta`), why: Tx(`It shows in ${phN[worst[0]]} corners, so it is a habit rather than one mistake.`, `Aparece en ${phN[worst[0]]} curvas, así que es un hábito más que un error puntual.`, `Aparece em ${phN[worst[0]]} curvas, então é mais um hábito do que um erro isolado.`), how: Tx(...HOW[worst[0]]) });
    }
    if (straight > .08 && ov) P.push({ k: "straight", gain: straight, t: Tx(`${r2(straight)} s outside the corners`, `${r2(straight)} s fuera de las curvas`, `${r2(straight)} s fora das curvas`), why: Tx("On an oval the straights are won in the corner before them, in the speed you carry off it and how soon you are back flat out.", "En un óvalo las rectas se ganan en la curva anterior, con la velocidad que sacas de ella y lo pronto que vuelves a ir a fondo.", "Num oval as retas se ganham na curva anterior, com a velocidade que você leva dela e o quanto antes volta ao fundo."), how: ov === "superspeedway" ? Tx("Here the draft decides most of it. A lap on your own is slower than one behind another car.", "Aquí el rebufo decide casi todo. Una vuelta en solitario es más lenta que una detrás de otro coche.", "Aqui o vácuo decide quase tudo. Uma volta sozinho é mais lenta do que uma atrás de outro carro.") : Tx("Get the car turned early in the corner so you can be flat out sooner, and let it run up to the wall on exit.", "Haz girar el coche pronto en la curva para ir a fondo antes, y déjalo subir hasta el muro a la salida.", "Faça o carro virar cedo na curva para ir ao fundo mais cedo, e deixe-o subir até o muro na saída.") });
    else if (straight > .08) P.push({ k: "straight", gain: straight, t: Tx(`${r2(straight)} s outside the braking zones`, `${r2(straight)} s fuera de las zonas de frenada`, `${r2(straight)} s fora das zonas de frenagem`), why: Tx("Time lost on the straights comes from the corner exits before them (less speed at the apex and a later throttle) and from the gears.", "El tiempo que se pierde en las rectas viene de las salidas de las curvas anteriores (menos velocidad en el vértice y el acelerador más tarde) y de las marchas.", "O tempo perdido nas retas vem das saídas das curvas anteriores (menos velocidade no ápice e o acelerador mais tarde) e das marchas."), how: Tx("Finish each corner with the throttle fully open as early as you can and check you shift at the right revs.", "Termina cada curva con el acelerador a fondo lo antes posible y comprueba que cambias a las revoluciones correctas.", "Termine cada curva com o acelerador a fundo o quanto antes e confira se você troca de marcha na rotação certa.") });
    const wob = cons.filter((x) => x.sd > .08).slice(0, 2); wob.forEach((x) => P.push({ k: "cons", turns: [x.n], gain: x.sd * .6, t: Tx(`T${x.n} changes ±${r2(x.sd)} s from lap to lap`, `T${x.n} cambia ±${r2(x.sd)} s de una vuelta a otra`, `T${x.n} muda ±${r2(x.sd)} s de uma volta para outra`), why: Tx("Over the session you take this corner differently every lap. The time spread is the gap between your best and your usual lap.", "A lo largo de la sesión tomas esta curva distinto cada vuelta. La dispersión es la diferencia entre tu mejor vuelta y la habitual.", "Ao longo da sessão você faz esta curva de um jeito diferente a cada volta. A dispersão é a diferença entre sua melhor volta e a volta habitual."), how: Tx("Same braking marker, same turn-in point, same line, every lap. Consistency first, speed after.", "La misma referencia de frenada, el mismo punto de giro, la misma trazada, cada vuelta. Primero regularidad, luego velocidad.", "A mesma referência de frenagem, o mesmo ponto de entrada, a mesma linha, em toda volta. Primeiro regularidade, depois velocidade.") }));
    driving.forEach((d) => P.push({ k: "style", gain: 0, t: d.replace(/^\S+\s/, ""), why: "", how: "" }));
    lapSteps(cs, ov, A, LP, Tx, spdU()).forEach((x) => P.push(x));
    // every step says what happened and where (marks and spans on the map), why it costs time and what to do instead
    const PCOST = { brake: ["The braking zones are where the speed changes the most, so a few metres there are worth more than anywhere else on the lap.", "Las frenadas son donde más cambia la velocidad, así que unos metros ahí valen más que en cualquier otra parte de la vuelta.", "As frenagens são onde a velocidade mais muda, então alguns metros ali valem mais do que em qualquer outra parte da volta."], entry: ov && ov !== "short" ? COST.lift : est ? COST.speed : COST.trail, apex: COST.speed, exit: COST.exit };
    const sorted = cs.slice().sort((a, b) => a.d - b.d), tAt = (s, d) => { for (let k = Math.max(0, Math.min(n - 1, Math.round(d / BIN))); k >= 0; k--) if (s.arr[k]) return s.arr[k][1]; return null; };
    const stretch = (a0, a1) => { const x = [tAt(sa, a0), tAt(sa, a1), tAt(sb, a0), tAt(sb, a1)]; return x.some((v) => v == null) ? null : (x[1] - x[0]) - (x[3] - x[2]); };
    const strs = []; sorted.forEach((c, j) => { const a0 = c.apex + 150, a1 = j + 1 < sorted.length ? sorted[j + 1].d - 50 : L; if (a1 - a0 >= 60) { const v = stretch(a0, a1); if (v != null) strs.push({ after: c.n, spans: [[a0, a1]], v }); } });
    if (sorted.length && sorted[0].d - 50 >= 60) { const v = stretch(0, sorted[0].d - 50), lt = sorted[sorted.length - 1], o = strs.find((x) => x.after === lt.n && x.spans[0][1] === L); if (v != null) { if (o) { o.v += v; o.spans.push([0, sorted[0].d - 50]); } else strs.push({ after: lt.n, spans: [[0, sorted[0].d - 50]], v }); } }
    P.forEach((p) => {
      if (p.k === "phase") { const ph0 = p.ph0, list = cs.filter((c) => !Object.values(c.ph).some((v) => Math.abs(v) > 1) && (c.ph[ph0] || 0) > .02); p.id = "phase:" + ph0; p.what = Tx(`It shows in ${tNames(list)}, so it is a habit rather than one mistake.`, `Aparece en ${tNames(list)}, así que es un hábito más que un error puntual.`, `Aparece em ${tNames(list)}, então é mais um hábito do que um erro isolado.`); p.cost = T3(PCOST[ph0] || COST.speed); p.why = p.what + " " + p.cost; p.turns = list.map((c) => c.n); p.marks = turnMarks(list); p.spans = turnSpans(list); delete p.ph0; }
      else if (p.k === "straight") { const top = strs.filter((x) => x.v > .02).sort((a, b) => b.v - a.v).slice(0, 2), nm = top.map((x) => Tx(`after T${x.after} (${r2(x.v)} s)`, `después de T${x.after} (${r2(x.v)} s)`, `depois da T${x.after} (${r2(x.v)} s)`)).join(Tx(" and ", " y ", " e "));
        p.id = "straight"; p.what = top.length ? Tx(`Most of it is on the straight ${nm}.`, `La mayor parte está en la recta ${nm}.`, `A maior parte está na reta ${nm}.`) : ""; p.cost = p.why; p.why = (p.what + " " + p.cost).trim(); p.spans = top.flatMap((x) => x.spans); p.marks = top.map((x) => { const [a0, a1] = x.spans[0]; return { d: (a0 + a1) / 2, k: "str", n: x.after }; }); }
      else if (p.k === "cons") { const c = cs.find((x) => x.n === p.turns[0]); p.id = "cons"; p.what = p.why; p.cost = T3(COST.cons); p.why = p.what + " " + p.cost; p.marks = c ? turnMarks([c]) : []; p.spans = c ? turnSpans([c]) : []; }
      else if (p.k === "style") { p.id = "style"; p.what = ""; p.cost = ""; }
    });
    P.sort((a, b) => b.gain * (b.w || 1) * C.plan(b.id) - a.gain * (a.w || 1) * C.plan(a.id)); // the plan's order weighs each tip by what the coach learnt from the drivers (tipWeight) and their votes on the plan, never its text
    // on an oval, how this kind of oval is driven, with what this lap did: second after the habit
    const OI = ov ? ovalStep(ov, A, R, sa, sb, n, cs, lapD, Tx) : null; if (OI) { const list = cs.filter((c) => c.lost > .05); P.unshift({ ...OI, id: "oval:" + ov, what: OI.why, cost: "", marks: turnMarks(list), spans: turnSpans(list) }); }
    // the driver's habit first: a kind of tip that repeats on several of their tracks (coachMe), with the corners of this lap it shows in
    const H = C.habits[0]; if (H && H.tracks >= 3) {
      const inLap = cs.filter((c) => c.kind === H.kind && c.lost > .03), names = inLap.map((c) => "T" + c.n).join(", ");
      P.unshift({ k: "habit", turns: inLap.map((c) => c.n), gain: inLap.reduce((q, c) => q + c.lost, 0), t: Tx(`${kindName(H.kind, ctx)} · a habit of yours`, `${kindName(H.kind, ctx)} · un hábito tuyo`, `${kindName(H.kind, ctx)} · um hábito seu`), why: Tx(`It shows on ${H.tracks} tracks and ${H.sessions} sessions${names ? `. In this lap in ${names}` : ""}.`, `Lo arrastras en ${H.tracks} circuitos y ${H.sessions} sesiones${names ? `. En esta vuelta en ${names}` : ""}.`, `Aparece em ${H.tracks} pistas e ${H.sessions} sessões${names ? `. Nesta volta em ${names}` : ""}.`), how: "" });
      const hp = P[0], f = familyOf(H.kind); hp.id = "habit:" + H.kind; hp.what = hp.why; hp.cost = T3(COST[f] || COST.speed); hp.why = hp.what + " " + hp.cost; hp.how = inLap[0] ? howOf(f, inLap[0], Tx, spdU()) : ""; hp.marks = turnMarks(inLap); hp.spans = turnSpans(inLap);
    }
    // the map of each step: its points on the lap (d in metres) and the stretches it is about, inside the lap
    P.forEach((p) => { p.id = p.id || p.k; p.what = p.what || ""; p.cost = p.cost || ""; p.marks = (p.marks || []).filter((m) => m.d >= 0 && m.d <= L).map((m) => ({ ...m, d: Math.round(m.d) })); p.spans = (p.spans || []).map(([a, b]) => [Math.round(Math.max(0, a)), Math.round(Math.min(L, b))]).filter(([a, b]) => b > a); });
    const areas = [["brake", ph.brake], ["entry", ph.entry], ["apex", ph.apex], ["exit", ph.exit], ["straight", Math.max(0, straight)]];
    return { cs, lapD, lost, gained, straight, ph, phN, secs, driving, cons, plan: P, areas, focus: areas.slice().sort((a, b) => b[1] - a[1])[0] };
  }

  /* the step to the next level (the model's levelStep): the corners where the drivers at your pace lose to the driver just
     ahead, by the official turns, as the line under the Next level card (" · …"), or "" */
  function stepText(step, A, ctx) {
    if (!Array.isArray(step) || !step.length || !A) return "";
    const n = A.bins ? A.bins.length : 0, turns = turnsOf(ctx), names = step.map((x, k) => "T" + turnNo(turns, x.apex, n * BIN, k + 1)).join(", ");
    return " · " + txOf(ctx)(`the drivers at your pace make the step in ${names}`, `los pilotos de tu ritmo dan el salto en ${names}`, `os pilotos do seu ritmo dão o salto em ${names}`);
  }

  /* ---------- the lap analyzer's key facts ---------- */
  /* the gap, the corner that costs the most, where A falls furthest behind and where it gains most, and the corners against
     the straights; items are [class, value, text] */
  function analyzerFacts(A, B, ctx) {
    const Tx = txOf(ctx), sa = lapSeries(A), sb = lapSeries(B), n = Math.min(sa.end, sb.end), ad = A.time - B.time; let peak = 0, peakI = 0, gain = 0, gainI = 0;
    for (let i = 0; i < n; i++) { const a = sa.arr[i], b = sb.arr[i]; if (a && b) { const d = a[1] - b[1]; if (d > peak) { peak = d; peakI = i; } if (d < gain) { gain = d; gainI = i; } } }
    const all = coachCompare(A, B, ctx), cz = all.filter((c) => c.lost > .03).sort((x, y) => y.lost - x.lost), items = [];
    if (cz[0]) { const t = Tx(cz[0].tip[0], cz[0].tip[1], cz[0].tip[2]); items.push(["bad", "T" + cz[0].n, Tx(`Corner ${cz[0].n} costs the most (${sgn(cz[0].lost, 3)} s) · ${t}`, `La curva ${cz[0].n} es la que más cuesta (${sgn(cz[0].lost, 3)} s) · ${t}`, `A curva ${cz[0].n} é a que mais custa (${sgn(cz[0].lost, 3)} s) · ${t}`)]); }
    if (peak > .05) items.push(["warn", sgn(peak, 3) + " s", Tx(`A is furthest behind at ${Math.round(peakI * BIN)} m (${sgn(peak, 3)} s)`, `A va más atrás en ${Math.round(peakI * BIN)} m (${sgn(peak, 3)} s)`, `A fica mais atrás em ${Math.round(peakI * BIN)} m (${sgn(peak, 3)} s)`)]);
    if (gain < -.05) items.push(["good", sgn(gain, 3) + " s", Tx(`A gains most around ${Math.round(gainI * BIN)} m (${sgn(gain, 3)} s)`, `A gana más alrededor de ${Math.round(gainI * BIN)} m (${sgn(gain, 3)} s)`, `A ganha mais por volta de ${Math.round(gainI * BIN)} m (${sgn(gain, 3)} s)`)]);
    const inC = all.reduce((q, c) => q + c.lost, 0), straight = ad - inC, nL = all.filter((c) => c.lost > .02).length, nG = all.filter((c) => c.lost < -.02).length;
    if (all.length) items.push([Math.abs(straight) > .08 && straight > 0 ? "warn" : "muted", sgn(inC, 2) + " s", Tx(`Corners ${sgn(inC, 2)} s (A loses in ${nL}, gains in ${nG}) · straights ${sgn(straight, 2)} s`, `Curvas ${sgn(inC, 2)} s (A pierde en ${nL}, gana en ${nG}) · rectas ${sgn(straight, 2)} s`, `Curvas ${sgn(inC, 2)} s (A perde em ${nL}, ganha em ${nG}) · retas ${sgn(straight, 2)} s`)]);
    return { ad, items, corners: all };
  }

  /* ---------- last session's plan, this lap ---------- */
  /* how this lap does where the coach asked for something in the driver's last session on this car and track: prev is
     what the coach said then ([{n, apex, kind, lost, tbest}], GET /community/coach/last: the corner, the tip's kind, what
     that lap lost there and the time that session's best lap spent in the corner), cs this lap's corners (coachCompare).
     Each corner that lost time then, matched by its slowest point within 60 m, says whether this lap is faster there than
     that session's best lap (ok 1), slower (-1) or the same (0, within 0.05 s), and what it still loses to the reference */
  function followUp(prev, cs, ctx) {
    if (!Array.isArray(prev) || !prev.length || !Array.isArray(cs) || !cs.length) return [];
    const Tx = txOf(ctx), r2 = (v) => Math.round(v * 100) / 100, seen = new Set();
    return prev.filter((p) => p && p.kind && p.lost > .05 && p.tbest > 0 && p.apex >= 0).sort((a, b) => b.lost - a.lost).map((p) => {
      const c = cs.filter((x) => x.ta > 0 && Math.abs(x.apex - p.apex) <= 60).sort((x, y) => Math.abs(x.apex - p.apex) - Math.abs(y.apex - p.apex))[0];
      if (!c || seen.has(c.n)) return null; seen.add(c.n);
      const d = p.tbest - c.ta, ok = d >= .05 ? 1 : d <= -.05 ? -1 : 0, nm = kindName(p.kind, ctx), left = c.lost > .05 ? c.lost : 0;
      const how = ok > 0 ? Tx(`${r2(d)} s faster than your best lap there last time`, `${r2(d)} s más rápido que tu mejor vuelta ahí la última vez`, `${r2(d)} s mais rápido que sua melhor volta ali da última vez`)
        : ok < 0 ? Tx(`${r2(-d)} s slower than your best lap there last time`, `${r2(-d)} s más lento que tu mejor vuelta ahí la última vez`, `${r2(-d)} s mais lento que sua melhor volta ali da última vez`)
        : Tx("the same as your best lap there last time", "igual que tu mejor vuelta ahí la última vez", "igual à sua melhor volta ali da última vez");
      const still = left ? " · " + Tx(`still ${r2(left)} s to the reference`, `aún ${r2(left)} s frente a la referencia`, `ainda ${r2(left)} s para a referência`) : "";
      return { n: c.n, apex: Math.round(c.apex), kind: p.kind, name: nm, was: Math.round(p.lost * 1000) / 1000, d: Math.round(d * 1000) / 1000, ok, left: Math.round(left * 1000) / 1000, t: `T${c.n} · ${nm}`, text: how + still };
    }).filter(Boolean).slice(0, 5);
  }

  /* ---------- the track guide ---------- */
  /* what the track itself asks for, from the model of this car and track (/community/model: its corner card, which the
     server learns from the fastest drivers here, the drivers who improved here and the coach's tips there): for every
     corner where the fast drivers brake, the gear and the speed at the apex they take it in, how hard it is for everyone,
     the usual mistake there and how much the drivers who improved found in it. It needs no lap of the driver's own, so it
     coaches a track the driver never drove. brief: the three corners that matter most (the hardest, where improvement
     comes from, the usual mistakes) */
  function trackGuide(md, ctx) {
    const cs = md && Array.isArray(md.corners) ? md.corners.filter((c) => c && c.apex >= 0) : [];
    if (!cs.length) return null;
    const Tx = txOf(ctx), { spd, spdU } = unitsOf(ctx), turns = turnsOf(ctx), L = md.nb > 0 ? md.nb * BIN : Math.max(...cs.map((c) => c.apex)) + 200, r = Math.round, r2 = (v) => Math.round(v * 100) / 100;
    const mx = Math.max(0, ...cs.map((c) => c.spread || 0)), imp = Array.isArray(md.improve) ? md.improve : [], u = spdU();
    const out = cs.slice().sort((a, b) => a.apex - b.apex).map((c, k) => {
      const n = turnNo(turns, c.apex, L, k + 1), dif = mx > 0 && c.spread > 0 ? c.spread / mx : 0, lines = [];
      const level = dif >= .66 ? "hard" : dif >= .33 ? "medium" : "easy";
      const brake = c.b0 != null && c.b1 != null ? Tx(`Brake between ${r(c.b0)} and ${r(c.b1)} m`, `Frena entre ${r(c.b0)} y ${r(c.b1)} m`, `Freie entre ${r(c.b0)} e ${r(c.b1)} m`) : "";
      const g = Array.isArray(c.g) && c.g[0] >= 1 ? c.g : null, gear = g ? (g[0] === g[1] ? Tx(`gear ${g[0]}`, `${g[0]}ª`, `${g[0]}ª marcha`) : Tx(`gear ${g[0]} or ${g[1]}`, `${g[0]}ª o ${g[1]}ª`, `${g[0]}ª ou ${g[1]}ª marcha`)) : "";
      const apex = c.v0 != null && c.v1 != null ? (r(spd(c.v0)) === r(spd(c.v1)) ? `${r(spd(c.v0))} ${u}` : `${r(spd(c.v0))}–${r(spd(c.v1))} ${u}`) : "";
      if (brake) lines.push(brake + (gear ? Tx(`, ${gear} at the apex`, `, ${gear} en el vértice`, `, ${gear} no ápice`) : "") + (apex ? Tx(` at ${apex}`, ` a ${apex}`, ` a ${apex}`) : "") + ".");
      // the line at the apex against the record's: where the fast drivers put the car
      const ln = c.line && Array.isArray(c.line.at) ? c.line.at : null;
      if (ln && (ln[0] >= 1 || ln[1] <= -1)) lines.push(ln[0] >= 1 ? Tx("The fast drivers pass the apex a little inside the record's line.", "Los rápidos pasan el vértice un poco por dentro de la trazada del récord.", "Os rápidos passam o ápice um pouco por dentro da linha do recorde.") : Tx("The fast drivers pass the apex a little outside the record's line.", "Los rápidos pasan el vértice un poco por fuera de la trazada del récord.", "Os rápidos passam o ápice um pouco por fora da linha do recorde."));
      const mk = c.mistake && c.mistake.kind ? c.mistake : null, mistake = mk ? Tx(`The most common tip here · ${kindName(mk.kind, ctx)} (${mk.n} drivers)`, `El consejo más común aquí · ${kindName(mk.kind, ctx)} (${mk.n} pilotos)`, `A dica mais comum aqui · ${kindName(mk.kind, ctx)} (${mk.n} pilotos)`) : "";
      if (mistake) lines.push(mistake);
      const im = imp.filter((x) => Math.abs(x.apex - c.apex) <= 60).sort((a, b) => b.gain - a.gain)[0], improve = im ? Tx(`The drivers who improved here found ${r2(im.gain)} s in this corner (${im.n} drivers)`, `Los pilotos que mejoraron aquí encontraron ${r2(im.gain)} s en esta curva (${im.n} pilotos)`, `Os pilotos que melhoraram aqui acharam ${r2(im.gain)} s nesta curva (${im.n} pilotos)`) : "";
      if (improve) lines.push(improve);
      const score = dif + (im ? Math.min(1, im.gain / .2) : 0) + (mk ? Math.min(.6, mk.n / 10) : 0);
      return { n, d: Math.round(c.d), apex: Math.round(c.apex), b: c.b0 != null ? [Math.round(c.b0), Math.round(c.b1)] : null, g, v: c.v0 != null ? [r(spd(c.v0)), r(spd(c.v1))] : null, dif: Math.round(dif * 100) / 100, level, levelText: level === "hard" ? Tx("Hard", "Difícil", "Difícil") : level === "medium" ? Tx("Medium", "Media", "Média") : Tx("Easy", "Fácil", "Fácil"), brake, gear, apexSpeed: apex, mistake, improve, lines, drivers: c.n || 0, score: Math.round(score * 100) / 100 };
    });
    const brief = out.slice().sort((a, b) => b.score - a.score).slice(0, 3).filter((x) => x.score > 0).map((c) => ({ n: c.n, apex: c.apex, t: `T${c.n} · ${c.levelText}`, text: c.lines[0] || "" }));
    return { corners: out, brief, drivers: Math.max(0, ...cs.map((c) => c.n || 0)), L: Math.round(L) };
  }

  /* ---------- where the driver stands in every corner ---------- */
  /* lap A's time in every corner of the model against every driver known here (md.ranks: for each corner of the record,
     the window it is timed in, from 50 m before the braking to 150 m after the slowest point, and the corner times of the
     drivers' best laps, sorted): top is the share of drivers at least as fast there (10 = among the fastest 10 %) */
  function cornerRanks(A, md, ctx) {
    const R = md && Array.isArray(md.ranks) ? md.ranks : [];
    if (!A || !Array.isArray(A.bins) || !R.length) return [];
    const s = serOf(A), turns = turnsOf(ctx), L = md.nb > 0 ? md.nb * BIN : s.length * BIN, tAt = (d) => { for (let k = Math.min(s.length - 1, Math.round(d / BIN)); k >= 0; k--) if (s[k]) return s[k][1]; return null; };
    return R.slice().sort((a, b) => a.apex - b.apex).map((c, k) => {
      const q = Array.isArray(c.q) ? c.q : []; if (q.length < 3) return null;
      const t0 = tAt(c.i0), t1 = tAt(c.i1); if (t0 == null || t1 == null || !(t1 > t0)) return null;
      const t = t1 - t0, faster = q.filter((x) => x < t - .005).length, top = Math.max(1, Math.round((faster + 1) / (q.length + 1) * 100));
      return { n: turnNo(turns, c.apex, L, k + 1), apex: Math.round(c.apex), t: Math.round(t * 1000) / 1000, best: q[0], top, drivers: c.n || q.length };
    }).filter(Boolean);
  }
  /* the corner types across the driver's tracks (/community/coach/me byCls: the average time lost to the reference in slow,
     medium and fast corners), as lines: the weakest first */
  function clsLines(byCls, ctx) {
    const Tx = txOf(ctx), N = { slow: ["Slow corners", "Curvas lentas", "Curvas lentas"], medium: ["Medium corners", "Curvas medias", "Curvas médias"], fast: ["Fast corners", "Curvas rápidas", "Curvas rápidas"] };
    return (Array.isArray(byCls) ? byCls : []).filter((x) => N[x.cls] && x.n >= 5).sort((a, b) => b.avg - a.avg).map((x) => ({ cls: x.cls, avg: x.avg, n: x.n, t: Tx(...N[x.cls]), text: Tx(`${Math.round(x.avg * 100) / 100} s lost on average (${x.n} corners)`, `${Math.round(x.avg * 100) / 100} s perdidos de media (${x.n} curvas)`, `${Math.round(x.avg * 100) / 100} s perdidos em média (${x.n} curvas)`) }));
  }

  /* ---------- race pace against the cars around you ---------- */
  /* a race report's laps against the cars that finished around you (results[].pace, every lap the PC saw them time): each
     one's pace on clean laps (the first lap, the pits, the laps off the track and the slow ones in traffic or under yellow
     left out), its spread, the gap a lap to yours over the race and over its second half, and the line that matters most.
     { rows: [{pos, name, me, avg, sd, gap, late, fade, n}], lines: [{t, good}] }, null with too few laps */
  function racePace(r, ctx) {
    ctx = ctx || {};
    const Tx = txOf(ctx), PACE_MIN = 4, rr = (x) => Math.round(x * 1000) / 1000;
    const stats = (ts) => {
      ts = ts.filter((t) => t > 0);
      if (ts.length < PACE_MIN) return null;
      const m = ts.slice().sort((a, b) => a - b)[Math.floor(ts.length / 2)];
      const c = ts.filter((t) => t <= m * 1.03);
      if (c.length < PACE_MIN) return null;
      const avg = c.reduce((a, t) => a + t, 0) / c.length, sd = Math.sqrt(c.reduce((a, t) => a + (t - avg) ** 2, 0) / c.length);
      const h = Math.floor(c.length / 2), mean = (x) => x.reduce((a, t) => a + t, 0) / x.length;
      return { avg, sd, early: mean(c.slice(0, h)), late: mean(c.slice(h)), n: c.length };
    };
    const mine = stats((r.laps || []).filter((l) => l.n > 1 && !l.pit && !l.cut).map((l) => l.t));
    if (!mine) return null;
    const res = r.results || [], rows = [];
    res.forEach((x, i) => {
      const s = x.me ? mine : stats((x.pace || []).filter((l, k) => k > 0 && !l.x).map((l) => l.t));
      if (!s) return;
      rows.push({ pos: x.cpos || i + 1, name: x.name || "", me: !!x.me, avg: rr(s.avg), sd: rr(s.sd), gap: x.me ? 0 : rr(s.avg - mine.avg), late: x.me ? 0 : rr(s.late - mine.late), fade: rr(s.late - s.early), n: s.n });
    });
    if (rows.length < 2) return null;
    const lines = [], others = rows.filter((x) => !x.me);
    const fast = others.slice().sort((a, b) => a.late - b.late)[0];
    if (fast && fast.late <= -0.1) lines.push({ good: false, t: Tx(`P${fast.pos} was ${(-fast.late).toFixed(2)} s a lap faster than you in the second half`, `P${fast.pos} fue ${(-fast.late).toFixed(2)} s por vuelta más rápido que tú en la segunda mitad`, `P${fast.pos} foi ${(-fast.late).toFixed(2)} s por volta mais rápido que você na segunda metade`) });
    const slow = others.slice().sort((a, b) => b.late - a.late)[0];
    if (slow && slow.late >= 0.1) lines.push({ good: true, t: Tx(`You were ${slow.late.toFixed(2)} s a lap faster than P${slow.pos} in the second half`, `Fuiste ${slow.late.toFixed(2)} s por vuelta más rápido que P${slow.pos} en la segunda mitad`, `Você foi ${slow.late.toFixed(2)} s por volta mais rápido que P${slow.pos} na segunda metade`) });
    const me = rows.find((x) => x.me), fades = others.map((x) => x.fade).sort((a, b) => a - b), fm = fades.length ? fades[Math.floor(fades.length / 2)] : null;
    if (me && fm != null && me.fade - fm >= 0.15) lines.push({ good: false, t: Tx(`Your pace dropped ${(me.fade - fm).toFixed(2)} s a lap more than theirs from the first half to the second`, `Tu ritmo cayó ${(me.fade - fm).toFixed(2)} s por vuelta más que el suyo de la primera mitad a la segunda`, `Seu ritmo caiu ${(me.fade - fm).toFixed(2)} s por volta mais que o deles da primeira metade para a segunda`) });
    const sds = others.map((x) => x.sd).sort((a, b) => a - b), sm = sds.length ? sds[Math.floor(sds.length / 2)] : null;
    if (me && sm != null && me.sd - sm >= 0.15) lines.push({ good: false, t: Tx(`Your laps spread ${me.sd.toFixed(2)} s against ${sm.toFixed(2)} s for the cars around you`, `Tus vueltas varían ${me.sd.toFixed(2)} s frente a ${sm.toFixed(2)} s de los coches de tu alrededor`, `Suas voltas variam ${me.sd.toFixed(2)} s contra ${sm.toFixed(2)} s dos carros ao seu redor`) });
    else if (me && sm != null && sm - me.sd >= 0.1) lines.push({ good: true, t: Tx(`More consistent than the cars around you, ${me.sd.toFixed(2)} s against ${sm.toFixed(2)} s`, `Más regular que los coches de tu alrededor, ${me.sd.toFixed(2)} s frente a ${sm.toFixed(2)} s`, `Mais regular que os carros ao seu redor, ${me.sd.toFixed(2)} s contra ${sm.toFixed(2)} s`) });
    return { rows, lines };
  }

  /* ---------- everything at once, for the phones ---------- */
  /* the analyzer's and the coach's answers for lap A against lap B as plain JSON (a string with opts.json): the gap, every
     corner (tip in en, es and pt, text in ctx.lang), the coach's plan with its corners, phases, sectors and areas, and the
     analyzer's key facts */
  function analyse(A, B, ctx, opts) {
    ctx = ctx || {};
    const Tx = txOf(ctx), withText = (c) => ({ ...c, text: c.tip[0] ? Tx(c.tip[0], c.tip[1], c.tip[2]) : "", todo: tipTodo(c, ctx) });
    const facts = analyzerFacts(A, B, ctx), plan = coachPlan(A, B, Array.isArray(ctx.laps) ? ctx.laps : [], ctx);
    const out = { v: VERSION, gap: A.time - B.time, corners: facts.corners.map(withText), facts: { ad: facts.ad, items: facts.items }, coach: { ...plan, cs: plan.cs.map(withText) } };
    if (Array.isArray(ctx.step)) out.step = stepText(ctx.step, A, ctx); // the next level's step, when lap B is the next level
    if (Array.isArray(ctx.prev)) out.followup = followUp(ctx.prev, plan.cs, ctx); // how this lap does where the last session's plan asked for something
    if (ctx.model) { const g = trackGuide(ctx.model, ctx), rk = cornerRanks(A, ctx.model, ctx); if (g) out.guide = g; if (rk.length) out.ranks = rk; } // the track guide and where lap A stands in every corner
    if (Array.isArray(ctx.byCls)) out.cls = clsLines(ctx.byCls, ctx); // the corner types across the driver's tracks
    return opts && opts.json ? JSON.stringify(out) : out;
  }

  const api = { VERSION, BIN, lapSeries, serOf, lapShape, sameFrame, lineOffsets, cornerLine, lineTip, brakeZones, PHASES, phaseName, turnNo, COACH_GEN, cornerClass, cornerZones,
    OVAL_KINDS, ovalOf, liftZones, ovalZones, dirtLineTip, coachCompare, cornerConsistency, pairSecs, lapDriving, kindName, stepName, tipMain, tipShort, tipTodo, coachPlan, stepText, analyzerFacts, analyse,
    estOf, followUp, trackGuide, cornerRanks, clsLines, racePace };
  root.PW_ANALYSIS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
