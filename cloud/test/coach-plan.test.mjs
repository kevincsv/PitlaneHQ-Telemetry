// node cloud/test/coach-plan.test.mjs: the coach's plan for the next session (coachPlan in web/dist/pitwall-analysis.js)
// says what happened in each step, why it costs time and what to do instead, with its points on the map (marks, spans
// inside the lap); the steps about the whole lap and the session (trail braking, gears, tyres that fade, the usual lap
// against the best); and the drivers' votes on the plan (coachplan.js, migration 0084) that reorder it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { planWeights, planVotes, STEP, MIN_PLAN_VOTES } from "../src/coachplan.js";
const require = createRequire(import.meta.url);
const PW = require("../../web/dist/pitwall-analysis.js");

// a road lap every 5 m: 70 m/s on the straights and, for each corner, braking at `at` (from `brake` m before the apex)
// down to vmin at the apex, the brake let go `trail` m before the apex, the throttle back `pick` m after it, in `gear`
function lap(L, corners, o = {}) {
  const n = Math.round(L / 5), bins = []; let t = 0;
  for (let i = 0; i < n; i++) {
    const d = i * 5; let v = 70, thr = 1, br = 0, gear = 6;
    for (const c of corners) {
      const ap = c.apex, b0 = ap - (c.brake || 120), rel = ap - (c.trail || 0), pk = ap + (c.pick || 20), out = ap + 160;
      if (d >= b0 && d < ap) { const p = (d - b0) / (ap - b0); v = 70 - (70 - c.vmin) * Math.sin(p * Math.PI / 2); thr = 0; br = d < rel ? (d - b0 < 15 ? .9 : .9 * (rel - d) / (rel - b0) + .3) : 0; gear = c.gear || 3; }
      else if (d >= ap && d < out) { const p = (d - ap) / (out - ap); v = c.vmin + (70 - c.vmin) * p; thr = d < pk ? .1 : 1; gear = c.gear || 3; }
    }
    if (i) t += 5 / v; bins.push([v, t, thr, Math.min(1, br), gear, 0]);
  }
  return { bins, maxBin: n - 1, time: t + 5 / 70, ...o };
}
const C = [{ apex: 600, vmin: 25, trail: 5, gear: 3 }, { apex: 1500, vmin: 35, trail: 5, gear: 4 }, { apex: 2400, vmin: 30, trail: 5, gear: 3 }];
const B = lap(3000, C, { n: 2 });
const A = lap(3000, C.map((c, k) => ({ ...c, vmin: c.vmin - 2.5, trail: k === 1 ? 5 : 70, pick: 40, gear: k === 1 ? 4 : c.gear + 1, brake: k === 1 ? 135 : 120 })), { n: 3 });
const ctx = { lang: "en", units: "metric", turns: [0.2, 0.5, 0.8] };
const P = PW.coachPlan(A, B, [], ctx).plan;
assert.ok(P.length >= 3, "a plan");
const L = 3000;
for (const p of P) {
  assert.ok(p.id, "every step has an id");
  for (const m of p.marks) assert.ok(m.d >= 0 && m.d <= L, "a mark inside the lap");
  for (const [a, b] of p.spans) assert.ok(a >= 0 && b <= L && b > a, "a stretch inside the lap");
  const txt = [p.t, p.what, p.cost, p.how].join(" ");
  assert.ok(!/;/.test(txt), "no semicolons: " + txt);
  assert.ok(!/[a-z]: [a-zA-Z]/.test(txt), "no two phrases joined with a colon: " + txt);
}
const corner = P.find((p) => p.k === "corner");
assert.ok(corner && corner.what && corner.cost && corner.how, "a corner's step says what, why and how");
assert.match(corner.what, /^You lose [\d.]+ s in T\d/);
assert.ok(corner.marks.some((m) => m.k === "a") && corner.marks.some((m) => m.k === "b") && corner.marks.some((m) => m.k === "apex"), "a corner's points A, B and the apex");
assert.equal(corner.why, corner.what + " " + corner.cost, "why (what the phones of before show) is what and why together");
assert.ok(P.some((p) => p.k === "trail" && p.turns.length >= 2), "trail braking over several corners");
assert.ok(P.some((p) => p.k === "gears"), "the gears");
// in Spanish and Portuguese too
for (const lang of ["es", "pt"]) { const Q = PW.coachPlan(A, B, [], { ...ctx, lang }).plan; assert.ok(Q.find((p) => p.k === "corner").what.length > 20); assert.ok(!Q.some((p) => /\bYou\b/.test(p.what + p.cost + p.how)), lang + " has no English"); }

// the session: tyres that fade over a run and the usual lap against the best
const run = Array.from({ length: 10 }, (_, i) => ({ ...B, n: i + 1, sessionId: "s1", time: 100 + (i === 0 ? 3 : 0) + (i > 0 ? i * 0.15 : 0) + (i % 3 === 0 ? 0.6 : 0) }));
const R = PW.coachPlan({ ...A, sessionId: "s1" }, B, run, ctx).plan;
const ty = R.find((p) => p.k === "tyres");
assert.ok(ty, "tyres fading over the run");
assert.match(ty.what, /^Your first laps are around 1:40\.\d{3} and the last ones around 1:41\.\d{3}\.$/);
assert.ok(R.find((p) => p.k === "pace"), "the usual lap against the best");
// laps of another session do not count
assert.ok(!PW.coachPlan({ ...A, sessionId: "s2" }, B, run, ctx).plan.some((p) => p.k === "tyres"), "only lap A's session");

// the votes reorder the plan: a step the drivers vote down goes after one they vote up
const ids = P.filter((p) => p.gain > 0).map((p) => p.id), first = ids[0], second = ids.find((x) => x !== first);
const w = { [first]: 0.5, [second]: 1.5 }, V = PW.coachPlan(A, B, [], { ...ctx, weights: { plan: w } }).plan.filter((p) => p.gain > 0).map((p) => p.id);
assert.ok(V.indexOf(second) < V.indexOf(first), "the votes move a step");

// the server: what a vote is, the weights from the votes
assert.ok(STEP.test("plan") && STEP.test("corner:brake_later@3") && STEP.test("trail@2,5,7") && STEP.test("phase:exit@1,3") && STEP.test("corner:@4"));
assert.ok(!STEP.test("corner:x@3;drop") && !STEP.test("") && !STEP.test("Trail@1"));
const db = new DatabaseSync(":memory:");
db.exec(readFileSync(new URL("../migrations/0084_coach_plan_votes.sql", import.meta.url), "utf8"));
const ins = db.prepare("INSERT INTO coach_plan_votes (account, track_id, car_id, session_id, started, step, sid, k, kind, turns, up, created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
for (let i = 0; i < MIN_PLAN_VOTES; i++) { ins.run("a" + i, 1, 2, "s" + i, 1, "trail@2", "trail", "trail", "", "2", i < 12 ? 1 : -1, 1); ins.run("a" + i, 1, 2, "s" + i, 1, "corner:coast@4", "corner:coast", "corner", "coast", "4", i < 3 ? 1 : -1, 1); ins.run("a" + i, 1, 2, "s" + i, 1, "plan", "plan", "plan", "", "", 1, 1); }
const env = { DB: { prepare: (q) => ({ all: async () => ({ results: db.prepare(q).all() }) }) } };
const votes = await planVotes(env), W = planWeights(votes);
assert.equal(votes.find((x) => x.id === "plan").up, MIN_PLAN_VOTES);
assert.equal(W.trail, 1.12);
assert.equal(W["corner:coast"], 0.88);
assert.equal(W.corner, 0.88, "a kind of step from all its votes");
assert.equal(W.plan, undefined, "votes on the whole plan move no step");
assert.deepEqual(planWeights([{ id: "trail", k: "trail", up: 3, down: 1 }]), {}, "too few votes move nothing");
console.log("coach plan: ok");
