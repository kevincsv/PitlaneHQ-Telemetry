// The real turns of the circuits (their official numbers, which way each one goes and its name), put on a track's layout.
// The geometry alone (trackgeo.js) cannot know that a flat kink has no number or that a long corner counts as two, so a
// track listed in turnsref-data.js takes its turns from there: the reference says where each turn sat on one layout of
// the circuit (metres from the line), and placeRef finds the same corners on the layout it is given (another game's, a
// rebuilt one, a line a little further on) by their direction and the distances between them. Only the turns an admin
// placed by hand win over these (/community/turns).
import { curvature } from "./trackgeo.js";
import { REF, NOT } from "./turnsref-data.js";

const STEP = 5;          // m between a layout's points
const BEND_LIM = 1 / 900; // a stretch bending tighter than this radius is a bend
const HARD_MIN = 20;     // a bend under this many degrees never stands for one of the reference's clear corners
const SNAP_M = 40;       // a light turn (a kink) moves to a bend of its direction this close to where it should be
const LEN_TOL = 0.04;    // a layout this much longer or shorter than the reference is not that circuit's layout

// the layout's curvature, a little smoother than trackgeo's
function smoothK(x, y) {
  const k0 = curvature(x, y, STEP), n = k0.length;
  return k0.map((_, i) => (k0[(i - 1 + n) % n] + 2 * k0[i] + k0[(i + 1) % n]) / 4);
}

// every bend of a closed path, in lap order: {i (the most curved point), from, to, dir ("L"/"R"), deg (how much it turns)}
// a stretch bending one way is cut where it eases to under 55 % between two peaks 30 m or more apart (a double apex)
export function bends(x, y, k = smoothK(x, y)) {
  const n = Math.min(x.length, y.length), out = [];
  if (n < 20) return out;
  let start = 0;
  while (start < n && Math.abs(k[start]) > BEND_LIM) start++;
  if (start >= n) return out;
  const runs = [];
  let cur = null;
  for (let c = 0; c < n; c++) {
    const i = (start + c) % n, s = Math.abs(k[i]) > BEND_LIM ? Math.sign(k[i]) : 0;
    if (s && cur && cur.dir === s) cur.pts.push(i);
    else { if (cur) runs.push(cur); cur = s ? { dir: s, pts: [i] } : null; }
  }
  if (cur) runs.push(cur);
  for (const r of runs) {
    const a = r.pts.map((p) => Math.abs(k[p])), m = a.length, cuts = [0], peaks = [];
    for (let j = 0; j < m; j++) {
      let top = true;
      for (let d = -4; d <= 4 && top; d++) if (d && j + d >= 0 && j + d < m && a[j + d] > a[j]) top = false;
      if (top) peaks.push(j);
    }
    let last = peaks[0];
    for (const p of peaks.slice(1)) {
      let dip = last;
      for (let j = last; j <= p; j++) if (a[j] < a[dip]) dip = j;
      if (p - last >= 6 && a[dip] < 0.55 * Math.min(a[last], a[p])) { cuts.push(dip); last = p; } else if (a[p] > a[last]) last = p;
    }
    cuts.push(m);
    for (let c = 0; c + 1 < cuts.length; c++) {
      const pts = r.pts.slice(cuts[c], cuts[c + 1]);
      if (!pts.length) continue;
      let apex = pts[0], ang = 0;
      for (const p of pts) { if (Math.abs(k[p]) > Math.abs(k[apex])) apex = p; ang += Math.abs(k[p]) * STEP; }
      const deg = Math.round((ang * 180) / Math.PI);
      if (deg >= 4) out.push({ i: apex, from: pts[0], to: pts[pts.length - 1], dir: r.dir > 0 ? "L" : "R", deg });
    }
  }
  return out.sort((p, q) => p.i - q.i);
}

// where the turns of a bend sit (metres): its most curved point for one turn; for m turns in one bend (a double apex),
// the points where the bend has turned 1/2m, 3/2m … of its angle
export function inBend(b, m, k, n) {
  if (m <= 1) return [b.i * STEP];
  const pts = [];
  for (let p = b.from; ; p = (p + 1) % n) { pts.push(p); if (p === b.to) break; }
  const tot = pts.reduce((s, p) => s + Math.abs(k[p]), 0), out = [];
  for (let c = 0; c < m; c++) {
    const want = (tot * (2 * c + 1)) / (2 * m);
    let acc = 0;
    for (const p of pts) { acc += Math.abs(k[p]); if (acc >= want) { out.push(p * STEP); break; } }
  }
  return out;
}

const weight = (b) => Math.min(b.deg, 60) + b.deg / 100;
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

// the reference's turns on a layout: [{f (fraction of the lap), name}] T1 … Tn, or null when the layout is not this
// circuit's (its clear corners are not all there in order, or its length is another).
// ref.t: [metres on the reference layout, "L"/"R"/"X" (no bend: placed between its neighbours), kind, name, of]:
// kind 1 a clear corner, 0 a light one (a kink); of > 1 on the turns that share one bend with the ones before them.
export function placeRef(ref, x, y) {
  const n = Math.min(x.length, y.length), L = n * STEP;
  if (n < 20 || !ref || !ref.t || !ref.t.length || Math.abs(L / ref.len - 1) > LEN_TOL) return null;
  const k = smoothK(x, y), B = bends(x, y, k), sc = L / ref.len, T = ref.t;
  // the clear corners, one unit per bend of the reference (the turns of a double apex together); the units that follow
  // each other the same way, with no turn the other way between them, are one group: another layout of the circuit may
  // draw two such corners as one long bend, or one double apex as two bends
  const units = [];
  let prevHard = -1, group = 0;
  T.forEach((t, i) => {
    if (t[2] !== 1) return;
    const u = units[units.length - 1], run = u && u.dir === t[1] && !T.slice(prevHard + 1, i).some((o) => o[1] !== "X" && o[1] !== t[1]);
    prevHard = i;
    if (run && t[4] > 1 && u.m === t[4] && u.idx.length < u.m) { u.idx.push(i); return; }
    if (!run) group++;
    units.push({ dir: t[1], m: t[4] > 1 ? t[4] : 1, idx: [i], group });
  });
  const q = units.length, pos = new Array(T.length).fill(null);
  if (q) {
    const S = B.map((b, j) => ({ b, j })).filter((o) => o.b.deg >= HARD_MIN), m = S.length;
    const refC = (i, c) => mean(units.slice(i, i + c).flatMap((u) => u.idx).map((ti) => T[ti][0])) * sc;
    // best[i][e]: the best score with the first i units placed, the last of them on the layout's clear bend e
    const best = Array.from({ length: q + 1 }, () => new Array(m).fill(-1e9)), from = Array.from({ length: q + 1 }, () => new Array(m).fill(null));
    const put = (i, c, e, sp, w, pe) => {
      const cen = mean(sp), rc = refC(i, c), pr = pe >= 0 ? from[i][pe] : null;
      const sc1 = pr ? best[i][pe] + w - 0.5 * Math.abs((cen - pr.cen) - (rc - pr.rc)) : w - 0.2 * Math.abs(cen - rc);
      if (sc1 > best[i + c][e]) { best[i + c][e] = sc1; from[i + c][e] = { sp, cen, rc, pe, c, i, first: e - (sp.used - 1) }; }
    };
    for (let i = 0; i < q; i++) {
      const starts = i === 0 ? [-1] : S.map((_, e) => e).filter((e) => best[i][e] > -1e8);
      for (const pe of starts) for (let j = pe + 1; j < m; j++) {
        const b = S[j].b, u = units[i];
        if (b.dir !== u.dir) continue;
        // c units of one group on this one bend
        for (let c = 1; i + c <= q && units[i + c - 1].group === u.group; c++) {
          const turns = units.slice(i, i + c).reduce((a, x) => a + x.idx.length, 0), sp = inBend(b, c === 1 ? u.m : turns, k, n);
          sp.used = 1;
          put(i, c, j, sp, weight(b), pe);
        }
        // the turns of one double apex on as many bends in a row
        if (u.m > 1 && j + u.m <= m && S.slice(j, j + u.m).every((o) => o.b.dir === u.dir)) {
          const sp = S.slice(j, j + u.m).map((o) => o.b.i * STEP);
          sp.used = u.m;
          put(i, 1, j + u.m - 1, sp, S.slice(j, j + u.m).reduce((a, o) => a + weight(o.b), 0), pe);
        }
      }
    }
    let e = -1;
    for (let j = 0; j < m; j++) if (best[q][j] > -1e8 && (e < 0 || best[q][j] > best[q][e])) e = j;
    if (e < 0) return null;
    const used = new Set();
    for (let i = q; i > 0;) {
      const f = from[i][e];
      units.slice(f.i, f.i + f.c).flatMap((u) => u.idx).forEach((ti, c) => { pos[ti] = f.sp[c]; });
      for (let c = f.first; c <= e; c++) used.add(S[c].j);
      i = f.i; e = f.pe;
    }
    // a corner found far from where the reference has it (against the one before, or from the line) is another corner
    const hard = units.flatMap((u) => u.idx);
    for (let h = 1; h < hard.length; h++) {
      const a = hard[h - 1], b = hard[h];
      if (Math.abs((pos[b] - pos[a]) - (T[b][0] - T[a][0]) * sc) > 150) return null;
    }
    if (Math.abs(pos[hard[0]] - T[hard[0]][0] * sc) > 400) return null;
    // the light turns: between the clear corners around them as in the reference, then on a bend of their direction
    const hs = hard.map((i) => ({ d: T[i][0] * sc, p: pos[i] }));
    const lo = { d: hs[hs.length - 1].d - L, p: hs[hs.length - 1].p - L }, hi = { d: hs[0].d + L, p: hs[0].p + L };
    T.forEach((t, i) => {
      if (pos[i] != null) return;
      const d = t[0] * sc;
      let a = lo, b = hi;
      for (const h of hs) { if (h.d <= d) a = h; if (h.d > d) { b = h; break; } }
      let p = b.d > a.d ? a.p + ((d - a.d) * (b.p - a.p)) / (b.d - a.d) : a.p;
      if (t[1] !== "X") {
        let pick = null;
        B.forEach((bd, j) => {
          if (used.has(j) || bd.dir !== t[1]) return;
          const dist = Math.abs(bd.i * STEP - p);
          if (dist <= SNAP_M && (!pick || dist < pick.dist)) pick = { j, dist };
        });
        if (pick) { p = B[pick.j].i * STEP; used.add(pick.j); }
      }
      pos[i] = ((p % L) + L) % L;
    });
  } else {
    T.forEach((t, i) => { pos[i] = (t[0] * sc) % L; });
  }
  // the turns stay in the reference's order (a light one never jumps over its neighbour)
  for (let i = 1; i < pos.length; i++) if (pos[i] <= pos[i - 1]) {
    if (T[i][2] === 1 && T[i - 1][2] === 1) return null;
    const a = pos[i - 1], nx = pos.slice(i + 1).find((v) => v > a);
    if (T[i][2] !== 1) pos[i] = Math.min(a + 10, nx != null ? (a + nx) / 2 : L - STEP);
    else return null;
  }
  if (pos[pos.length - 1] >= L) return null;
  return T.map((t, i) => ({ f: Math.round((pos[i] / L) * 1e5) / 1e5, name: t[3] || "" }));
}

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// the reference of a track: by the game's own id when the reference lists it, else by the circuit's name in the track's
// name and a lap as long as the reference's (the layouts of one circuit differ in length)
export function refFor(game, trackId, track, len) {
  const id = game + ":" + trackId;
  const byId = REF.find((r) => r.ids.includes(id));
  if (byId) return byId;
  if (NOT.includes(id)) return null;
  const name = " " + norm(track) + " ";
  if (!(len > 0) || name.length < 4) return null;
  let pick = null;
  for (const r of REF) {
    if (!(r.match || []).some((w) => name.includes(" " + w + " "))) continue;
    const off = Math.abs(len / r.len - 1);
    if (off <= LEN_TOL && (!pick || off < pick.off)) pick = { r, off };
  }
  return pick ? pick.r : null;
}

// the real turns of a track on its layout: {turns: [fractions], names: [""]} or null when the reference has none for it
export function refTurns(game, trackId, track, x, y) {
  const n = Math.min(x.length, y.length), ref = refFor(game, trackId, track, n * STEP);
  const placed = ref ? placeRef(ref, x, y) : null;
  return placed ? { key: ref.key, turns: placed.map((t) => t.f), names: placed.map((t) => t.name) } : null;
}

// the reference's names for a track whose turns an admin placed by hand: only when they placed as many as it has
export function refNames(game, trackId, track, len, count) {
  const ref = refFor(game, trackId, track, len);
  return ref && ref.t.length === count && ref.t.some((t) => t[3]) ? ref.t.map((t) => t[3] || "") : null;
}

export { REF };
