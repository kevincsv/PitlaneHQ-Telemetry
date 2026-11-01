// node cloud/test/coach-like.test.mjs: the coach learns apart by discipline and borrows from other tracks.
// - coachtips.js (migration 0087): a group's buckets weigh by its own cases once it has enough, else by everyone's;
//   the plan's votes the same (coachplan.js planWeightsFor)
// - model.js cornerSamples / ovalProfile (the car card's corners and ovals) and likeOf / likeSteps in
//   web/dist/pitwall-analysis.js: the hints for a track with no corner card yet, from the car's other tracks and, on an
//   oval, from every car's ovals of that kind (the first driver ever on an oval still hears something)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, register } from "node:module";
import { DatabaseSync } from "node:sqlite";
// the Worker imports JSON without import attributes (wrangler bundles it): node reads it as a module here
register("data:text/javascript," + encodeURIComponent(`import {readFile} from "node:fs/promises";export async function load(u,c,n){if(u.endsWith(".json"))return {format:"module",source:"export default "+await readFile(new URL(u),"utf8"),shortCircuit:true};return n(u,c)}`));
const { buckets, MIN_CASES } = await import("../src/coachtips.js");
const { planWeightsFor, MIN_PLAN_VOTES } = await import("../src/coachplan.js");
const { cornerSamples, ovalProfile } = await import("../src/model.js");
const { groupOf } = await import("../src/categories.js");
const require = createRequire(import.meta.url);
const PW = require("../../web/dist/pitwall-analysis.js");

// ---------- the groups ----------
assert.equal(groupOf("oval"), "oval");
assert.equal(groupOf("dirt_oval"), "dirt_oval");
assert.equal(groupOf("dirt_road"), "dirt_road");
assert.equal(groupOf("formula_car"), "road");
assert.equal(groupOf("sports_car"), "road");
assert.equal(PW.catGroup(null, null, { track: { cat: "Oval" } }), "oval");
assert.equal(PW.catGroup(null, null, { track: { cat: "DirtRoad" } }), "dirt_road");
assert.equal(PW.catGroup(null, null, { track: { cat: "dirt_oval" } }), "dirt_oval");
assert.equal(PW.catGroup(null, null, { track: { cat: "Road" } }), "road");
assert.equal(PW.catGroup(null, null, {}), "");

// ---------- the buckets by group ----------
const db = new DatabaseSync(":memory:");
db.exec("CREATE TABLE model_laps (game TEXT, track_id INTEGER, car_id INTEGER)"); // 0053 adds a column to the model's memory too
for (const f of ["0051_coach_tips.sql", "0053_coach_learning.sql", "0084_coach_plan_votes.sql", "0087_coach_categories.sql", "0088_coach_learn_faster.sql"]) db.exec(readFileSync(new URL("../migrations/" + f, import.meta.url), "utf8"));
const D1 = { prepare: (q) => { const mk = (a) => ({ bind: (...b) => mk(b), all: async () => ({ results: db.prepare(q).all(...a) }), first: async () => db.prepare(q).get(...a) ?? null, run: async () => db.prepare(q).run(...a) }); return mk([]); }, batch: async (l) => { for (const x of l) await x.run(); } };
const env = { DB: D1 };
const tip = db.prepare("INSERT INTO coach_tips (account, game, track_id, car_id, session_id, started, n, apex, kind, cls, outcome, created, cat) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
let sn = 0;
// road: brake_later on slow corners pays (every driver gains); ovals: it never pays
for (let i = 0; i < 40; i++) tip.run("a" + i, "iracing", 1, 1, "r" + sn++, 1, 1, 100, "brake_later", "slow", 0.2, 1, "road");
for (let i = 0; i < 35; i++) tip.run("b" + i, "iracing", 2, 2, "o" + sn++, 1, 1, 100, "brake_later", "slow", -0.2, 1, "oval");
// dirt roads: only 5 cases, too few of their own
for (let i = 0; i < 5; i++) tip.run("c" + i, "iracing", 3, 3, "d" + sn++, 1, 1, 100, "brake_later", "slow", -0.2, 1, "dirt_road");
const wOf = async (g) => (await buckets(env, null, g)).buckets.find((x) => x.kind === "brake_later" && x.cls === "slow");
const all = await wOf(""), road = await wOf("road"), oval = await wOf("oval"), dirt = await wOf("dirt_road");
assert.equal(all.n, 80); assert.equal(all.cat, undefined);
assert.equal(road.n, 40); assert.equal(road.cat, "road"); assert.ok(road.w > 1.1 && road.w <= 1.2, "most of the way to 1.2 from everyone's weight");
assert.equal(oval.n, 35); assert.equal(oval.cat, "oval"); assert.ok(oval.w < 0.9 && oval.w >= 0.8);
assert.ok(oval.w < all.w && all.w < road.w, "each group by its own drivers");
assert.equal(dirt.n, 80, "a group with fewer than MIN_CASES cases learns from everyone"); assert.equal(dirt.cat, undefined);
assert.ok(MIN_CASES > 5);

// the plan's votes: the ovals' drivers dislike a step everyone else likes
const vote = db.prepare("INSERT INTO coach_plan_votes (account, track_id, car_id, session_id, started, step, sid, k, kind, turns, up, created, cat) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
for (let i = 0; i < 20; i++) vote.run("r" + i, 1, 1, "vr" + i, 1, "trail@", "trail", "trail", "", "", 1, 1, "road");
for (let i = 0; i < MIN_PLAN_VOTES; i++) vote.run("o" + i, 2, 2, "vo" + i, 1, "trail@", "trail", "trail", "", "", -1, 1, "oval");
const pAll = await planWeightsFor(env, ""), pRoad = await planWeightsFor(env, "road"), pOval = await planWeightsFor(env, "oval"), pDirt = await planWeightsFor(env, "dirt_oval");
assert.ok(pRoad.trail > 1.1 && pRoad.trail <= 1.2); assert.ok(pOval.trail < 0.9 && pOval.trail >= 0.8);
assert.equal(pDirt.trail, pAll.trail, "a group with too few votes takes everyone's");

// ---------- the car card's corners and ovals ----------
// a road lap every 5 m: 70 m/s on the straights, braking `brake` m before each apex down to vmin, in `gear` there,
// the wheel turned `steer` through the corner
function lap(L, corners, o = {}) {
  const n = Math.round(L / 5), bins = []; let t = 0;
  for (let i = 0; i < n; i++) {
    const d = i * 5; let v = 70, thr = 1, br = 0, gear = 6, st = 0;
    for (const c of corners) {
      const ap = c.apex, b0 = ap - (c.brake || 120), out = ap + 160;
      if (d >= b0 && d < ap) { const p = (d - b0) / (ap - b0); v = 70 - (70 - c.vmin) * Math.sin(p * Math.PI / 2); thr = 0; br = .9; gear = c.gear || 3; st = p > .5 ? (c.steer || 0) : 0; }
      else if (d >= ap && d < out) { const p = (d - ap) / (out - ap); v = c.vmin + (70 - c.vmin) * p; thr = d < ap + 20 ? .1 : 1; gear = c.gear || 3; st = d < ap + 30 ? (c.steer || 0) : 0; }
    }
    if (i) t += 5 / v; bins.push([v, t, thr, br, gear, st]);
  }
  return { bins, maxBin: n - 1, time: t + 5 / 70, ...o };
}
const fastC = [{ apex: 600, vmin: 25, brake: 120, gear: 3, steer: .2 }, { apex: 1500, vmin: 40, brake: 90, gear: 4, steer: .1 }];
const card = [10, 11, 12].flatMap((t) => [0, 1].map((k) => ({ trackId: t, drv: "d" + k, ...lap(3000, fastC), bins: lap(3000, fastC).bins, time: 60 + k * 0.1 })));
const cz = cornerSamples(card, {});
assert.equal(cz.length, 12, "two corners of six fast laps");
const s0 = cz.find((x) => x[0] === 10);
assert.equal(s0[1], 70); assert.equal(s0[2], 25); assert.equal(s0[4], 3); assert.equal(s0[5], 0.2); assert.equal(s0[6], 0);
assert.ok(Math.abs(s0[3] - 120) <= 10, "the metres from the braking to the slowest point");
assert.equal(cornerSamples([...card, { trackId: 10, drv: "slow", bins: card[0].bins, time: 70 }], {}).length, 12, "a lap 3 % off the fastest there teaches nothing");

// ---------- the hints on a track with no corner card ----------
const like = { cz, ot: [], kinds: {} };
// lap A: the first corner braked over 200 m (the same speeds) in 4th, the second as tight as theirs but slower through it
const AC = [{ apex: 600, vmin: 25, brake: 200, gear: 4, steer: .2 }, { apex: 1500, vmin: 34, brake: 90, gear: 4, steer: .1 }];
const A = lap(3000, AC);
const ctx = { lang: "en", units: "metric", like };
const lk = PW.likeOf(A, ctx);
assert.ok(lk && lk.corners.length === 2, "both corners have something");
const c1 = lk.corners.find((c) => c.n === 1), c2 = lk.corners.find((c) => c.n === 2);
assert.deepEqual(c1.kinds, ["brake", "gear"]);
assert.match(c1.lines[0], /^In this car the fast drivers slow from 252 to 90 km\/h in about 1\d\d m on other tracks\. You took 200 m here\. Brake later and harder\.$/);
assert.equal(c1.lines[1], "At these speeds the fast drivers in this car take the slowest point in gear 3. You were in 4.");
assert.deepEqual(c2.kinds, ["apex"]);
assert.equal(c2.lines[0], "In corners like this one (the same speed in, the same steering) the fast drivers in this car keep 144 km/h at the slowest point. You were at 122. Carry more speed through the middle.");
assert.ok(c1.gain > 0 && c2.gain > 0);
for (const t of [...c1.lines, ...c2.lines]) assert.ok(!/[;:]/.test(t), "one sentence or two, no colon: " + t);
// Spanish and Portuguese
assert.match(PW.likeOf(A, { ...ctx, lang: "es" }).corners.find((c) => c.n === 1).lines[0], /^En este coche los rápidos bajan de 252 a 90 km\/h/);
assert.match(PW.likeOf(A, { ...ctx, lang: "pt" }).corners.find((c) => c.n === 1).lines[0], /^Neste carro os rápidos reduzem de 252 para 90 km\/h/);
// once the track has its own corner card there, the track's fast drivers speak instead
assert.deepEqual(PW.likeOf(A, { ...ctx, cards: [{ apex: 600, b0: 470, b1: 480, v0: 25, v1: 26, n: 5 }, { apex: 1500, b0: 1400, b1: 1410, v0: 40, v1: 41, n: 5 }] }), null);
assert.deepEqual(PW.likeOf(A, { ...ctx, cards: [{ apex: 600, b0: 470, b1: 480, v0: 25, v1: 26, n: 5 }] }).corners.map((c) => c.n), [2]);
// samples from one track only say nothing
assert.equal(PW.likeOf(A, { ...ctx, like: { cz: cz.filter((x) => x[0] === 10) } }), null);
// in the plan (k "like") and in the notes the phones draw
const out = PW.analyse(A, lap(3000, AC), ctx);
const st = out.coach.plan.find((p) => p.k === "like");
assert.ok(st, "a step from other tracks");
assert.ok(["like:brake", "like:apex"].includes(st.id)); assert.ok(st.marks.length === 2 && st.spans.length === 1);
assert.match(st.t, /^T[12] · From other tracks$/);
assert.equal(out.coach.plan.filter((p) => p.k === "like").length, 2);
assert.ok(out.notes.some((x) => x.k === "like" && x.title === "From other tracks" && x.items.length === 2));
assert.equal(PW.stepName("like:brake", { lang: "es" }).split(" · ")[0], "De otros circuitos");
// no like data, no change
assert.ok(!PW.analyse(A, A, { lang: "en" }).coach.plan.some((p) => p.k === "like"));

// ---------- the first driver on an oval ----------
// a mile oval, 1609 m: lap A brakes into both turns; nobody drove an oval in this car, the other cars' miles say how
function oLap(L, corners, v0 = 60) {
  const n = Math.round(L / 5), bins = []; let t = 0;
  for (let i = 0; i < n; i++) {
    const d = i * 5; let v = v0, thr = 1, br = 0;
    for (const c of corners) { const x = d - c.at; if (x >= 0 && x < c.len) { const p = x / c.len; v = v0 - c.dv * Math.sin(Math.PI * p); thr = p < .6 ? c.thr : c.thr + (1 - c.thr) * (p - .6) / .4; br = c.brake && p < .3 ? c.brake : 0; } }
    if (i) t += 5 / v; bins.push([v, t, thr, br, 4, 0]);
  }
  return { bins, maxBin: n - 1, time: t + 5 / v0 };
}
const OA = oLap(1609, [{ at: 300, len: 300, dv: 14, thr: 0, brake: .5 }, { at: 1100, len: 300, dv: 14, thr: 0, brake: .5 }]);
const octx = { lang: "en", units: "metric", track: { cat: "oval", track: "Phoenix Raceway", track_config: "Oval" }, like: { cz: [], ot: [], kinds: { mile: { f: [.7, .78, .85], lf: .8, n: 6, cars: 3 } } } };
const ol = PW.likeOf(OA, octx);
assert.ok(ol && ol.oval, "the oval's hint");
assert.equal(ol.oval.kind, "mile"); assert.equal(ol.oval.own, false);
assert.match(ol.oval.lines[0], /^On one-mile ovals the fast drivers are flat out 70–85 % of the lap \(3 cars\)\. This lap \d+ %\.$/);
assert.match(ol.oval.lines[1], /^They take 80 % of the turns there with a lift and no brake\. You braked in T1, T2\.$/);
const oplan = PW.analyse(OA, OA, octx).coach.plan;
assert.ok(oplan.some((p) => p.id === "like:oval"), "the first oval driver gets a step from the other cars' ovals");
// the car's own ovals of that kind, when it has them
const ol2 = PW.likeOf(OA, { ...octx, like: { ...octx.like, ot: [{ t: 9, k: "mile", g: "oval", f: .74, lf: .9, n: 4 }] } });
assert.equal(ol2.oval.own, true);
assert.match(ol2.oval.lines[0], /^On one-mile ovals the fast drivers in this car are flat out 74 % of the lap \(1 track\)\./);
// how a car's ovals are driven, from its laps (model.js ovalProfile)
const op = ovalProfile([{ trackId: 9, drv: "x", time: 30, bins: oLap(1609, [{ at: 300, len: 300, dv: 8, thr: .5 }, { at: 1100, len: 300, dv: 8, thr: .5 }]).bins }], { 9: { cat: "oval", g: "oval", track: "Phoenix Raceway", cfg: "Oval" } });
assert.equal(op.length, 1); assert.equal(op[0].k, "mile"); assert.equal(op[0].lf, 1); assert.ok(op[0].f > .5 && op[0].f < 1);
assert.deepEqual(ovalProfile(card, { 10: { g: "road" } }), [], "a road track has no oval profile");

console.log("coach-like: groups, borrowed hints and the first oval OK");
