// node cloud/test/coach-learn.test.mjs: the coach learns faster (coachlearn.js, migration 0088). The server's own coach
// goes over a session nobody opened the coach on and keeps what it would have said; the driver's next session answers
// every tip by itself; what a tip is worth is measured against what the drivers find by themselves, from the first
// cases (weightOf); the corners over the driver's sessions; and the module tries another approach in a corner where the
// same tip did not pay off twice.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createRequire } from "node:module";
import { refsOf, gz } from "../src/model.js";
import { winTime, refForLap, shadowTips, shadowRun, answerRun, upliftOf, recOf, progressOf, progressRoute } from "../src/coachlearn.js";
import { weightOf, SHRINK } from "../src/coachlearn.js";
const require = createRequire(import.meta.url);
const PW = require("../../web/dist/pitwall-analysis.js");

// a lap of 400 points (2 km): one braking zone into a slow corner at 220 (the apex), back to speed
function lap(o = {}) {
  const bp = o.bp ?? 190, vmin = o.vmin ?? 27, bins = [];
  let t = 0;
  for (let i = 0; i < 400; i++) {
    let v = 60, thr = 1, brk = 0, g = 6;
    if (i >= bp && i < 220) { v = Math.max(vmin, 60 - (i - bp) * ((60 - vmin) / (220 - bp))); thr = 0; brk = 0.9; g = 3; }
    else if (i >= 220 && i < 250) { v = vmin + (i - 220) * ((60 - vmin) / 30); thr = 1; g = 3; }
    bins.push([v, 0, thr, brk, g, 0]);
  }
  for (const b of bins) { t += 5 / b[0]; b[1] = t; }
  return { time: t, bins, maxBin: bins.length - 1 };
}
// as the agent uploads it: [speed, throttle, brake, gear, steer, time]
const trace = (l) => JSON.stringify({ d: l.bins.map((b) => [b[0], b[2], b[3], b[4], b[5], b[1]]) });

// the corner's time in a lap
const L = lap();
assert.ok(winTime(L.bins, 190 * 5, 220 * 5) > 0, "a corner's time");
assert.equal(winTime(L.bins, 190 * 5, 395 * 5), null, "a window past the lap's end");

// the model: the record and the next levels of four drivers
const field = [lap({ bp: 200, vmin: 33 }), lap({ bp: 197, vmin: 31 }), lap({ bp: 194, vmin: 30 }), lap({ bp: 190, vmin: 29 })];
const model = { v: 12, nb: 400, ...(await refsOf(field.map((l) => ({ ...l })), async () => null)) };
const slow = lap({ bp: 180, vmin: 24 });
const ref = refForLap(model, slow.time);
assert.ok(ref && ref.lap.time < slow.time && ref.lap.bins.length === 400, "the next level, every bin");
assert.equal(refForLap(model, model.idealTime - 1), null, "nobody ahead of the record");
const sh = shadowTips(slow, model, null);
assert.ok(sh.rows.length === 1 && sh.rows[0].kind && sh.rows[0].lost > 0.03 && sh.rows[0].tbest === sh.rows[0].ta, "what the coach would have said");

// the server over a database
const db = new DatabaseSync(":memory:");
const dir = new URL("../migrations/", import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
const stmt = (q, a = []) => ({
  bind: (...x) => stmt(q, x),
  all: async () => ({ results: db.prepare(q).all(...a) }),
  first: async () => db.prepare(q).get(...a) || null,
  run: async () => db.prepare(q).run(...a),
});
const env = { DB: { prepare: (q) => stmt(q), batch: async (list) => { for (const s of list) await s.run(); } } };
db.prepare("INSERT INTO model_cache (game, track_id, car_id, dirty, built, data) VALUES ('iracing', 10, 20, 0, 1, ?)").run(await gz(JSON.stringify(model)));
const DAY = 86400e3, now = Date.now();
const sess = (id, started, l, kind = "Practice") => {
  db.prepare("INSERT INTO sessions (id, started, track, car, kind, uploader, game, track_id, car_id, official) VALUES (?,?,?,?,?,?,?,?,?,1)").run(id, started, "Track", "Car", kind, "acct:u1", "iracing", 10, 20);
  db.prepare("INSERT INTO laps (id, session_id, n, time, valid, trace, created) VALUES (?,?,?,?,1,?,?)").run(id + ":1", id, 1, l.time, trace(l), started);
};
sess("s1", now - 3 * DAY, slow);
sess("s0", now - 4 * DAY, slow, "Test drive"); // a test drive teaches nothing
const r1 = await shadowRun(env, now);
assert.equal(r1.sessions, 1, "only the real session");
const auto = db.prepare("SELECT * FROM coach_tips WHERE session_id='s1'").all();
assert.ok(auto.length === 1 && auto[0].src === "auto" && auto[0].kind, "kept as the server's own");
assert.equal((await shadowRun(env, now)).sessions, 0, "a session is gone over once");
assert.equal((await answerRun(env, now)).scored, 0, "no next session yet");
assert.equal((await answerRun(env, now)).sessions, 0, "looked at again only a day later");
const better = lap({ bp: 186, vmin: 27 });
sess("s2", now - 2 * DAY, better);
assert.equal((await answerRun(env, now + DAY + 1)).scored, 1, "the next session answers it by itself");
const o = db.prepare("SELECT outcome FROM coach_tips WHERE session_id='s1'").get().outcome;
assert.ok(o > 0.05, "a gain in that corner");

await shadowRun(env, now + DAY);
assert.ok(db.prepare("SELECT COUNT(*) AS n FROM coach_tips WHERE session_id='s2' AND src='auto'").get().n === 1, "the next session is gone over too");

// the corners over the sessions, and what came of the tips the driver saw
sess("s3", now - DAY, lap({ bp: 188, vmin: 28 }));
db.prepare("UPDATE coach_tips SET src='app' WHERE session_id='s1'").run();
const pr = await progressRoute(env, { id: "u1" }, "iracing", 10, 20, now);
assert.equal(pr.sessions.length, 4, "every session of the driver's here, test drives too: it is their own progress");
assert.ok(pr.corners.length === 1 && pr.corners[0].trend === "better" && pr.corners[0].gain > 0.05, "the corner got faster");
assert.ok(pr.tried.length === 1 && pr.tried[0].ok === 1, "the tip they saw paid off");
const pl = progressOf([{ bins: slow.bins }, { bins: slow.bins }, { bins: slow.bins }], [{ n: 1, d: 950, apex: 1100, lost: 0.3 }]);
assert.equal(pl[0].trend, "stuck", "three sessions no faster while still losing");

// what a tip is worth: the share won back after it against the share won back where nobody said anything
assert.equal(recOf(0.1, 0.2), 0.5);
assert.equal(recOf(1, 0.2), 1.5, "capped");
const u = upliftOf([{ kind: "brake_later", cls: "slow", src: "app", n: 20, rec: 0.5 }, { kind: "brake_later", cls: "slow", src: "auto", n: 40, rec: 0.2 }, { kind: "coast", cls: "slow", src: "auto", n: 40, rec: 0.3 }]);
assert.ok(u["brake_later|slow"].up > 0.2 && u["brake_later|slow"].up < 0.3, "beyond what the drivers find by themselves");
assert.equal(u["coast|slow"].up, null, "no case after a shown tip yet");
// the weights move from the first cases, a little at a time
const w1 = weightOf({ n: 1, win: 1, up: 0.3 }), w15 = weightOf({ n: SHRINK, win: 15, up: 0.3 }), w200 = weightOf({ n: 200, win: 200, up: 0.3 });
assert.ok(w1 > 1 && w1 < w15 && w15 < w200 && w200 <= 1.3, "more cases, more weight");
assert.equal(w15, 1.15, "half way at SHRINK cases");
assert.equal(weightOf({ n: 0, win: 0 }), 1, "no case, no weight");
assert.equal(weightOf({ n: 0, win: 0 }, null, 0.9), 0.9, "the prior with no case");
assert.ok(weightOf({ n: 40, win: 4 }) < 0.9, "without a baseline, the share of drivers who gained");

// the module: a tip this driver saw twice in a corner without gaining gives way to another approach there
const A = lap({ bp: 180, vmin: 24 }), B = lap({ bp: 196, vmin: 31 });
const c0 = PW.coachCompare(A, B, {})[0];
assert.ok(c0.kind && !c0.alt, "the usual tip");
const tried = [{ apex: c0.apex + 10, kind: c0.kind, ok: 0, at: 2 }, { apex: c0.apex, kind: c0.kind, ok: -1, at: 1 }];
const c1 = PW.coachCompare(A, B, { progress: { tried } })[0];
assert.ok(c1.kind !== c0.kind && c1.alt === c0.kind, `another approach (${c0.kind} → ${c1.kind})`);
assert.equal(PW.coachCompare(A, B, { progress: { tried: [{ apex: c0.apex, kind: c0.kind, ok: 1, at: 3 }, ...tried] } })[0].kind, c0.kind, "it paid off last time: the same tip");
assert.equal(PW.coachCompare(A, B, { progress: { tried: tried.slice(0, 1) } })[0].kind, c0.kind, "once is not enough");
// the corners over time in the analysis' notes
const out = PW.analyse(A, B, { progress: { corners: [{ n: 1, apex: c0.apex, gain: 0.21, trend: "better", sessions: 4 }, { n: 2, apex: 1800, gain: 0, trend: "stuck", sessions: 3 }, { n: 3, apex: 1900, gain: 0, trend: "same", sessions: 3 }] } });
assert.equal(out.progress.length, 2, "the same is not said");
assert.equal(out.progress[0].trend, "stuck", "what needs work first");
assert.ok(out.notes.some((n) => n.k === "progress" && n.items.length === 2), "in the notes the phones read");
console.log("coach learn: ok");
