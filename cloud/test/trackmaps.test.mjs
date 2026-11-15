// node cloud/test/trackmaps.test.mjs: the track maps drawn by dead reckoning are rebuilt from a stored lap with the
// game's own position, and the official number of turns is kept per track.
import assert from "node:assert/strict";
import { geoPath, rebuildTrackMaps, noteTurnCount, turnCount, traceLen, fitsLayout, lateral, edgesOf, isUneven, evenPath, evenTrackMaps } from "../src/trackmaps.js";

const ring = (n, g) => ({ bin: 5, d: [], x: Array.from({ length: n }, (_, i) => 300 * Math.cos((2 * Math.PI * i) / n)), y: Array.from({ length: n }, (_, i) => 300 * Math.sin((2 * Math.PI * i) / n)), ...(g ? { g } : {}) });
assert.equal(geoPath(ring(400)), null, "a dead-reckoning path is no exact layout");
assert.equal(geoPath(ring(50, [50, 6])), null, "too short");
const gp = geoPath(ring(400, [50.123456, 6.987654]));
assert.equal(gp.x.length, 400);
assert.deepEqual(gp.g, [50.12346, 6.98765]);

// a small D1 stand-in: the statements trackmaps.js runs
function fakeDB() {
  const st = { app: {}, maps: { "iracing:1": { geo: null }, "iracing:2": { geo: null }, "iracing:3": { geo: "[1,2]" } }, info: {}, writes: 0 };
  const laps = { 1: [{ trace: JSON.stringify(ring(400)), time: 80 }, { trace: JSON.stringify(ring(420, [40, -3])), time: 81 }], 2: [] };
  const q = (sql, args) => ({
    first: async () => {
      if (sql.includes("FROM app_state")) return st.app[args[0]] ? { v: st.app[args[0]] } : null;
      if (sql.includes("FROM track_info")) return st.info[args[0] + ":" + args[1]] || null;
      return null;
    },
    all: async () => {
      if (sql.includes("FROM track_maps WHERE geo IS NULL")) return { results: Object.entries(st.maps).filter(([, m]) => !m.geo).map(([k]) => ({ game: k.split(":")[0], track_id: +k.split(":")[1], time: 90 })) };
      if (sql.includes("FROM sessions s JOIN laps a")) { st.reads = (st.reads || 0) + 1; return { results: laps[args[0]] || [] }; }
      return { results: [] };
    },
    run: async () => {
      st.writes++;
      if (sql.startsWith("UPDATE track_maps")) st.maps[args[0] + ":" + args[1]] = { geo: args[5], n: args[2] };
      if (sql.includes("INSERT INTO app_state")) st.app[args[0]] = args[1];
      if (sql.includes("INSERT INTO track_info")) st.info[args[0] + ":" + args[1]] = { nturns: args[3], track: args[2] };
      return { meta: { changes: 1 } };
    },
  });
  return { st, DB: { prepare: (sql) => ({ bind: (...a) => q(sql, a), ...q(sql, []) }) } };
}
{
  const env = fakeDB();
  const r = await rebuildTrackMaps(env);
  assert.equal(r.checked, 2);
  assert.equal(r.rebuilt, 1, "track 1 has a lap with the game's position, track 2 none");
  assert.equal(env.st.maps["iracing:1"].n, 420);
  assert.equal(env.st.maps["iracing:1"].geo, "[40,-3]");
  assert.ok(env.st.maps["iracing:2"].geo == null);
  const again = await rebuildTrackMaps(env);
  assert.equal(again.done, true, "nothing left to look at until tomorrow");
  assert.equal(again.checked, 0);
  const all = await rebuildTrackMaps(env, { all: true });
  assert.equal(all.checked, 1, "the admin's button looks at every map without geo again");
}
{
  const env = fakeDB();
  assert.equal(await turnCount(env, "iracing", 7), 0);
  assert.equal(await noteTurnCount(env, "iracing", 7, "Spa", 19), true);
  assert.equal(await turnCount(env, "iracing", 7), 19);
  assert.equal(await noteTurnCount(env, "iracing", 7, "Spa", 19), false, "the same count is not written again");
  assert.equal(await noteTurnCount(env, "iracing", 7, "Spa", 0), false);
  assert.equal(await noteTurnCount(env, "iracing", 7, "Spa", 99), false);
}
// the wrong track or layout: a lap more than 6 % longer or shorter than the layout is another track
{
  assert.equal(traceLen({ d: new Array(800).fill([0]) }), 4000);
  assert.equal(traceLen({ d: new Array(400).fill([0]), bin: 10 }), 4000);
  assert.equal(traceLen(null), 0);
  assert.equal(fitsLayout(4000, 800), true);
  assert.equal(fitsLayout(4200, 800), true);
  assert.equal(fitsLayout(4400, 800), false, "10 % longer");
  assert.equal(fitsLayout(3500, 800), false);
  assert.equal(fitsLayout(4400, 0), true, "no layout: nothing to compare with");
  assert.equal(fitsLayout(0, 800), true);
}
// the edges: laps on a circle of 1 km, spread 4 m to the left and 6 m to the right of the layout, another origin each
{
  const N = 1257, R = 200, circ = (off, g) => {
    const x = [], y = [];
    const dx = (g[1] - 7) * 111320 * Math.cos(45 * Math.PI / 180), dy = (g[0] - 45) * 110540;
    for (let i = 0; i < N; i++) { const a = (i * 5) / R; x.push((R - off) * Math.cos(a) - dx); y.push((R - off) * Math.sin(a) - dy); }
    return { x, y, g };
  };
  const lay = circ(0, [45, 7]);
  const offs = [];
  for (let k = 0; k < 20; k++) {
    const off = -6 + (10 * k) / 19, o = lateral(circ(off, [45 + k * 1e-5, 7]), lay);
    assert.ok(o && Math.abs(o[300] - off) < 0.2, `lap ${k}: ${o && o[300]} vs ${off}`);
    offs.push(o);
  }
  assert.equal(lateral({ x: lay.x, y: lay.y, g: null }, lay), null, "no frame: nothing");
  const e = edgesOf(offs, N);
  assert.ok(Math.abs(e.l[100] - 4) < 0.7 && Math.abs(e.r[900] + 6) < 0.7, `${e.l[100]} ${e.r[900]}`);
  assert.equal(edgesOf(offs.slice(0, 5), N), null, "too few laps");
}
console.log("trackmaps ok");

// a layout from a position the game gives slowly: three points on top of each other, then a jump
{
  const n = 600, R = 400, even = { x: [], y: [] }, held = { x: [], y: [] };
  for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n, h = (2 * Math.PI * (i - (i % 3))) / n; even.x.push(R * Math.cos(a)); even.y.push(R * Math.sin(a)); held.x.push(R * Math.cos(h) + (i % 3) * 0.2); held.y.push(R * Math.sin(h)); }
  assert.equal(isUneven(even.x, even.y), false);
  assert.equal(evenPath(even.x, even.y), null, "an even layout is left as it is");
  assert.equal(isUneven(held.x, held.y), true);
  const ev = evenPath(held.x, held.y);
  assert.equal(ev.x.length, n, "the same number of points");
  const d = []; for (let i = 0; i < n; i++) { const j = (i + 1) % n; d.push(Math.hypot(ev.x[j] - ev.x[i], ev.y[j] - ev.y[i])); }
  const mean = d.reduce((a, b) => a + b, 0) / n;
  assert.ok(Math.min(...d) > mean * 0.8 && Math.max(...d) < mean * 1.2, "even steps: " + Math.min(...d).toFixed(2) + " to " + Math.max(...d).toFixed(2));
  assert.ok(ev.x.every((x, i) => Math.abs(Math.hypot(x, ev.y[i]) - R) < 0.6), "the road stays where it was");
  assert.ok(Math.hypot(ev.x[0] - held.x[0], ev.y[0] - held.y[0]) < 1, "point 0 stays on the line");
  assert.equal(isUneven(ev.x, ev.y), false);

  // the stored ones: the uneven one is written again, its old points kept, its edges asked again; once
  const maps = [{ game: "iracing", track_id: 1, pts: JSON.stringify(even) }, { game: "lmu", track_id: 2, pts: JSON.stringify(held) }], app = {}, edges = { "lmu:2": 1 };
  const q = (sql, a) => ({
    first: async () => (sql.includes("FROM app_state") && app[a[0]] ? { v: app[a[0]] } : null),
    all: async () => ({ results: maps.slice(a[1], a[1] + a[0]) }),
    run: async () => {
      if (sql.includes("INSERT INTO app_state") && !(sql.includes("DO NOTHING") && app[a[0]])) app[a[0]] = a[1];
      if (sql.startsWith("UPDATE track_maps")) maps.find((m) => m.game === a[0] && m.track_id === a[1]).pts = a[2];
      if (sql.startsWith("DELETE FROM track_edges")) delete edges[a[0] + ":" + a[1]];
      return {};
    },
  });
  const env = { DB: { prepare: (sql) => ({ bind: (...a) => q(sql, a), ...q(sql, []) }) } };
  const r = await evenTrackMaps(env);
  assert.deepEqual(r, { checked: 2, fixed: 1, done: true });
  assert.equal(maps[0].pts, JSON.stringify(even));
  assert.equal(isUneven(JSON.parse(maps[1].pts).x, JSON.parse(maps[1].pts).y), false);
  assert.equal(app["trackmap_raw:lmu:2"], JSON.stringify(held));
  assert.equal(edges["lmu:2"], undefined);
  assert.deepEqual(await evenTrackMaps(env), { checked: 0, fixed: 0, done: true });
}
