// node cloud/test/trackmaps.test.mjs: the track maps drawn by dead reckoning are rebuilt from a stored lap with the
// game's own position, and the official number of turns is kept per track.
import assert from "node:assert/strict";
import { geoPath, rebuildTrackMaps, noteTurnCount, turnCount, traceLen, fitsLayout, lateral, edgesOf } from "../src/trackmaps.js";

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
