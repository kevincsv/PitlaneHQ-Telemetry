// The tracks' layouts and their official number of turns.
//
// The number of turns comes from the game (iRacing's WeekendInfo.TrackNumTurns), sent by Pitlane HQ Agent for every track
// it sees: a session, a layout it shares, the .ibt files on the PC (track_info, migration 0074). The automatic turns
// (/community/turns, trackgeo.js) are fitted to it until an admin places the official ones.
//
// The layouts drawn by dead reckoning (no geo) are rebuilt from a lap of the same game and track whose path came from the
// game's own position (Trace.g): the same rule as POST /trackmaps (a layout from the game's position replaces one by dead
// reckoning whatever the lap time). A few tracks a run, from the ten-minute job until every one was looked at (app_state
// "trackmaps_rebuild", looked at again once a day), and all of them at once from the admin page.
import { openData } from "./crypt.js";

const STATE = "trackmaps_rebuild";
const PER_RUN = 3;   // tracks looked at per ten-minute run
const PER_TRACK = 6; // laps opened per track at most (the fastest first)

// a track's official number of turns (0: not known)
export async function turnCount(env, game, trackId) {
  const r = await env.DB.prepare("SELECT nturns FROM track_info WHERE game=?1 AND track_id=?2").bind(game, trackId).first().catch(() => null);
  return r && r.nturns > 0 ? r.nturns : 0;
}

// what the agent says of a track: kept when it is new or different (one write at most)
export async function noteTurnCount(env, game, trackId, track, nturns) {
  const n = Number(nturns);
  if (!trackId || !Number.isInteger(n) || n < 1 || n > 60) return false;
  const old = await env.DB.prepare("SELECT nturns, track FROM track_info WHERE game=?1 AND track_id=?2").bind(game, trackId).first().catch(() => null);
  if (old && old.nturns === n && (old.track || "") === (track || old.track || "")) return false;
  await env.DB.prepare(`INSERT INTO track_info (game, track_id, track, nturns, updated) VALUES (?1,?2,?3,?4,?5)
     ON CONFLICT(game, track_id) DO UPDATE SET nturns=excluded.nturns, track=COALESCE(excluded.track, track_info.track), updated=excluded.updated`)
    .bind(game, trackId, track ? String(track).slice(0, 120) : null, n, Date.now()).run();
  return true;
}

// ---------- the wrong track or layout ----------
// A lap whose length is not its track's layout's (a config named like another, an LMU layout under another's name, a new
// version of a track) is not that track: it never goes into the track's model nor onto its leaderboard. The layout's
// length is its points every 5 m; a lap's is its trace's points times its bin.
export const LAYOUT_TOL = 0.06;
export function traceLen(tr) {
  if (!tr || !Array.isArray(tr.d) || tr.d.length < 20) return 0;
  const b = +tr.bin > 0 ? +tr.bin : 5;
  return tr.d.length * b;
}
export function fitsLayout(lapLen, layN) {
  if (!(lapLen > 0) || !(layN >= 100)) return true; // nothing to compare with: the lap is taken as it is
  const L = layN * 5;
  return Math.abs(lapLen - L) / L <= LAYOUT_TOL;
}
export async function layoutN(env, game, trackId) {
  const r = await env.DB.prepare("SELECT n FROM track_maps WHERE game=?1 AND track_id=?2").bind(game, trackId).first().catch(() => null);
  return r && r.n > 0 ? r.n : 0;
}

// the path of a stored lap when it comes from the game's position: {x, y, g} rounded as a layout keeps them, else null
export function geoPath(tr) {
  if (!tr || !Array.isArray(tr.g) || tr.g.length !== 2 || !tr.g.every((v) => typeof v === "number" && isFinite(v))) return null;
  const x = tr.x, y = tr.y;
  if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length < 100 || x.length > 6000) return null; // 6000 points: 30 km, the Nürburgring's combined layout fits
  const ok = (v) => typeof v === "number" && isFinite(v) && Math.abs(v) < 30000;
  if (!x.every(ok) || !y.every(ok)) return null;
  const r1 = (v) => Math.round(v * 10) / 10;
  return { x: x.map(r1), y: y.map(r1), g: tr.g.map((v) => Math.round(v * 1e5) / 1e5) };
}

// one run: the layouts without geo not looked at yet (all of them when all is set) take the fastest valid lap of their
// game and track with a path from the game's position. Answers {checked, rebuilt, left, done}.
export async function rebuildTrackMaps(env, { all = false } = {}) {
  const st = await env.DB.prepare("SELECT v FROM app_state WHERE k=?1").bind(STATE).first().catch(() => null);
  let state = { done: false, seen: [] };
  try { if (st && st.v) state = { done: false, seen: [], ...JSON.parse(st.v) }; } catch (e) { /* starts again */ }
  // looked at again once a day: a lap with the game's position may have come since (the PCs' .ibt files too)
  if (all || (state.done && Date.now() - (state.at || 0) > 86400e3)) state = { done: false, seen: [] };
  if (state.done) return { checked: 0, rebuilt: 0, left: 0, done: true };
  const rows = (await env.DB.prepare("SELECT game, track_id, time FROM track_maps WHERE geo IS NULL").all()).results || [];
  const seen = new Set(state.seen), todo = rows.filter((r) => !seen.has(r.game + ":" + r.track_id));
  const now = todo.slice(0, all ? 40 : PER_RUN);
  let rebuilt = 0;
  for (const t of now) {
    seen.add(t.game + ":" + t.track_id);
    // the session's laps by its track (sessions_combo_ids), only the ones whose trace can hold the game's position
    const laps = (await env.DB.prepare(
      `SELECT a.trace, a.time FROM sessions s JOIN laps a ON a.session_id=s.id
       WHERE s.track_id=?1 AND s.game=?2 AND a.valid=1 AND a.trace IS NOT NULL AND (instr(a.trace,'"g":[')>0 OR substr(a.trace,1,4)='enc:' OR substr(a.trace,1,3)='r2:')
         AND COALESCE(s.kind,'') NOT LIKE '%test%' ORDER BY a.time LIMIT ${PER_TRACK}`
    ).bind(t.track_id, t.game).all().catch(() => ({ results: [] }))).results || [];
    for (const l of laps) {
      let path = null;
      try { path = geoPath(JSON.parse(await openData(env, l.trace))); } catch (e) { path = null; }
      if (!path) continue;
      await env.DB.prepare("UPDATE track_maps SET n=?3, pts=?4, time=?5, geo=?6, created=?7 WHERE game=?1 AND track_id=?2 AND geo IS NULL")
        .bind(t.game, t.track_id, path.x.length, JSON.stringify({ x: path.x, y: path.y }), l.time, JSON.stringify(path.g), Date.now()).run();
      rebuilt++;
      break;
    }
  }
  const left = todo.length - now.length;
  state = { done: left <= 0, seen: [...seen].slice(-500), at: left <= 0 ? Date.now() : 0 };
  await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES (?1, ?2, ?3) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(STATE, JSON.stringify(state), Date.now()).run();
  return { checked: now.length, rebuilt, left, done: state.done, withoutGeo: rows.length - rebuilt };
}

// ---------- the track's edges, from many laps ----------
// The layout is one lap's path. Many drivers' paths from the game's position (any car) put side by side give how far to
// each side of it the cars have been: the outermost few percent at every point are the edges of the road they use.
const EDGE_LAPS = 40;      // laps opened per track at most
const EDGE_MIN = 8;        // laps at a point for its edges
const EDGE_PER_RUN = 2;    // tracks measured per ten-minute run
const EDGE_AGE = 7 * 86400e3; // measured again a week later (more laps by then)
const EDGE_Q = 0.03;       // the outermost 3 % of the positions on each side are left out (a car off the track)

// a path in another path's frame: both from the game's position, the origins [lat, lon] apart turned into metres
function inFrame(a, b) {
  if (!a.g || !b.g) return null;
  if (a.g[0] === b.g[0] && a.g[1] === b.g[1]) return a;
  const dx = (a.g[1] - b.g[1]) * 111320 * Math.cos(b.g[0] * Math.PI / 180), dy = (a.g[0] - b.g[0]) * 110540;
  return { x: a.x.map((v) => v + dx), y: a.y.map((v) => v + dy), g: b.g };
}

// how far path a was to the left (+) or the right (-) of the layout b at each of b's points (m); NaN where a's nearest point
// is far (another layout, a trip through the pits) or not abreast. Null when the two are not in one frame.
export function lateral(a, b) {
  const p = inFrame(a, b);
  if (!p) return null;
  const na = p.x.length, nb = b.x.length, out = new Array(nb).fill(NaN);
  if (na < 60 || nb < 60) return null;
  for (let i = 0; i < nb; i++) {
    const i0 = (i - 2 + nb) % nb, i1 = (i + 2) % nb;
    let tx = b.x[i1] - b.x[i0], ty = b.y[i1] - b.y[i0];
    const tm = Math.hypot(tx, ty) || 1;
    tx /= tm; ty /= tm;
    const j0 = Math.round((i * na) / nb);
    let bj = -1, bd = 1e18;
    for (let k = -30; k <= 30; k++) {
      const j = (((j0 + k) % na) + na) % na, dx = p.x[j] - b.x[i], dy = p.y[j] - b.y[i], d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; bj = j; }
    }
    if (bj < 0 || bd > 40 * 40) continue;
    const dx = p.x[bj] - b.x[i], dy = p.y[bj] - b.y[i];
    if (Math.abs(tx * dx + ty * dy) > 6) continue;
    out[i] = -ty * dx + tx * dy;
  }
  return out;
}

// the edges from the laps' offsets: {l, r} at every point of the layout (l ≥ 0 to the left, r ≤ 0 to the right), the
// points with too few laps filled from their neighbours; null when most of the lap has too few
export function edgesOf(offs, nb) {
  const l = new Array(nb).fill(null), r = new Array(nb).fill(null);
  let have = 0;
  for (let i = 0; i < nb; i++) {
    const v = offs.map((o) => o[i]).filter((x) => isFinite(x)).sort((a, b) => a - b);
    if (v.length < EDGE_MIN) continue;
    const q = (f) => v[Math.min(v.length - 1, Math.max(0, Math.round(f * (v.length - 1))))];
    l[i] = Math.max(0, q(1 - EDGE_Q)); r[i] = Math.min(0, q(EDGE_Q));
    have++;
  }
  if (have < nb * 0.7) return null;
  const fill = (a) => {
    for (let i = 0; i < nb; i++) {
      if (a[i] != null) continue;
      let lo = i, hi = i;
      while (a[(lo - 1 + nb) % nb] == null && hi - lo < nb) lo--;
      while (a[(hi + 1) % nb] == null && hi - lo < nb) hi++;
      const va = a[(lo - 1 + nb) % nb], vb = a[(hi + 1) % nb];
      for (let k = lo; k <= hi; k++) a[(k + nb) % nb] = va + ((vb - va) * (k - lo + 1)) / (hi - lo + 2);
    }
    // a light smoothing over ±10 m: one car's wobble is not the road's edge
    return a.map((_, i) => { let s = 0; for (let k = -2; k <= 2; k++) s += a[(i + k + nb) % nb]; return Math.round((s / 5) * 10) / 10; });
  };
  return { l: fill(l), r: fill(r) };
}

// one run: the layouts from the game's position whose edges were never measured (or a week ago) get them
export async function rebuildEdges(env) {
  const rows = (await env.DB.prepare(
    `SELECT m.game, m.track_id, m.n, m.pts, m.geo FROM track_maps m LEFT JOIN track_edges e ON e.game=m.game AND e.track_id=m.track_id
     WHERE m.geo IS NOT NULL AND (e.updated IS NULL OR e.updated<?1 OR e.n<>m.n) ORDER BY e.updated LIMIT ${EDGE_PER_RUN}`
  ).bind(Date.now() - EDGE_AGE).all().catch(() => ({ results: [] }))).results || [];
  let built = 0;
  for (const t of rows) {
    let lay = null;
    try { const q = JSON.parse(t.pts); lay = { x: q.x, y: q.y, g: JSON.parse(t.geo) }; } catch (e) { lay = null; }
    if (!lay) continue;
    const laps = (await env.DB.prepare(
      `SELECT a.trace FROM sessions s JOIN laps a ON a.session_id=s.id
       WHERE s.track_id=?1 AND s.game=?2 AND a.valid=1 AND a.trace IS NOT NULL AND (instr(a.trace,'"g":[')>0 OR substr(a.trace,1,4)='enc:' OR substr(a.trace,1,3)='r2:')
       ORDER BY a.id DESC LIMIT ${EDGE_LAPS * 2}`
    ).bind(t.track_id, t.game).all().catch(() => ({ results: [] }))).results || [];
    const offs = [];
    for (const l of laps) {
      if (offs.length >= EDGE_LAPS) break;
      let path = null;
      try { path = geoPath(JSON.parse(await openData(env, l.trace))); } catch (e) { path = null; }
      if (!path || !fitsLayout(path.x.length * 5, t.n)) continue;
      const o = lateral(path, lay);
      if (o && o.filter((v) => isFinite(v)).length > t.n * 0.8) offs.push(o);
    }
    const e = offs.length >= EDGE_MIN ? edgesOf(offs, t.n) : null;
    // too few laps yet: noted all the same, so the run looks at it again in a week and not every ten minutes
    await env.DB.prepare(`INSERT INTO track_edges (game, track_id, n, laps, data, updated) VALUES (?1,?2,?3,?4,?5,?6)
       ON CONFLICT(game, track_id) DO UPDATE SET n=excluded.n, laps=excluded.laps, data=excluded.data, updated=excluded.updated`)
      .bind(t.game, t.track_id, t.n, offs.length, e ? JSON.stringify(e) : "{}", Date.now()).run();
    if (e) built++;
  }
  return { checked: rows.length, built };
}
