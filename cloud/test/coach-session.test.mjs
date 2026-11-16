// node cloud/test/coach-session.test.mjs: the coach over the whole session (sessionRepeat, repText, turnByTurn,
// sinceLast) and the race steps (trafficCost and the hybrid battery, hybridUse) of web/dist/pitwall-analysis.js
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const PW = require("../../web/dist/pitwall-analysis.js");

// a 4 km lap every 5 m with two braking corners (at 1000 and 2500 m); slow: 15 % slower around the second one
function lap(n, { slow = false, late = 0, flags = [], bat = null } = {}) {
  const bins = []; let t = 0;
  for (let i = 0; i < 800; i++) {
    const d = i * 5; let v = 60;
    for (const a of [1000, 2500]) { const x = Math.abs(d - a); if (x < 150) v = 25 + (x / 150) * 35; }
    if (slow && Math.abs(d - 2500) < 200) v *= 0.85;
    t += 5 / v;
    const brk = [1000, 2500].some((a) => d < a && a - d < 160 + (a === 2500 ? late : 0) && a - d > (a === 2500 ? late : 0)) ? 0.9 : 0;
    bins.push([v, t, v > 55 ? 1 : 0.3, brk, 4, 0]);
  }
  return { n, time: t, valid: true, bins, maxBin: 799, sessionId: "s1", flags, bat };
}

// a mistake on most laps of the session is said with its count, and weighs more than one made once
const R = lap(1);
const laps = [2, 3, 4, 5, 6, 7].map((n) => lap(n, { slow: n !== 7 }));
const plan = PW.coachPlan(laps[0], R, [R, ...laps], { lang: "en" });
const c2 = plan.cs.find((c) => c.apex > 2000);
assert.ok(c2 && c2.rep, "the corner carries the session");
assert.equal(c2.rep.of, 6, "six laps of the session, the reference left out");
assert.equal(c2.rep.same, 5, "five of them make the same mistake");
assert.deepEqual(PW.repText(c2), ["On 5 of 6 laps", "En 5 de 6 vueltas", "Em 5 de 6 voltas"]);
const st = plan.plan.find((p) => p.k === "corner" && p.turns[0] === c2.n);
assert.ok(st && st.rep && st.rep[0] === 5 && /On 5 of 6 laps\./.test(st.what), "the plan's step says it");
// the phones' copies of the same laps count once
const copies = JSON.parse(JSON.stringify([R, ...laps]));
const p2 = PW.coachPlan(laps[0], R, copies, { lang: "en" });
assert.equal(p2.cs.find((c) => c.apex > 2000).rep.of, 6, "a lap is known by its number, time and session too");

// turn by turn: one row per turn in track order with the session's columns
const tt = PW.turnByTurn(laps[0], R, plan.cs, [R, ...laps], { lang: "en" });
assert.ok(tt.length >= 2 && tt[0].d < tt[1].d, "rows in track order");
assert.equal(tt[tt.length - 1].rep, "On 5 of 6 laps");
assert.ok(tt.every((x) => "med" in x && "sd" in x && "top" in x), "every row has the typical lap, the spread and the rank");
const an = PW.analyse(laps[0], R, { lang: "en", laps: [R, ...laps] });
assert.ok(Array.isArray(an.turns) && an.turns.length === tt.length, "analyse answers with turns");

// this session against the last one
const sl = PW.sinceLast([{ n: c2.n, apex: c2.apex, kind: "apex_speed", lost: 0.5, tbest: c2.ta + 0.2 }], null, plan.cs, { lang: "en" });
assert.ok(sl && sl.better.includes(c2.n) && /^Faster than last time in T\d/.test(sl.lines[0].text), "a corner faster than last time");
assert.equal(PW.sinceLast(null, null, plan.cs, { lang: "en" }), null, "nothing before this session, nothing said");

// traffic: the laps a car was close ahead against the clean ones, and where they lose
const tl = [2, 3, 4, 5, 6, 7, 8, 9].map((n) => lap(n, { slow: n % 3 === 0, flags: n % 3 === 0 ? ["traffic"] : [] }));
const tc = PW.trafficCost(tl[0], tl, {});
assert.equal(tc.n, 3); assert.equal(tc.of, 8); assert.ok(tc.cost > 1 && tc.corners.length === 1 && tc.corners[0].apex > 2000);
const tp = PW.coachPlan(tl[0], R, tl, { lang: "es" }).plan.find((p) => p.k === "traffic");
assert.ok(tp && /^El tráfico te cuesta/.test(tp.t) && /En 3 de 8 vueltas/.test(tp.what), "the traffic step");
assert.equal(PW.trafficCost(laps[0], laps, {}), null, "no traffic laps, no step");

// the hybrid: the reference deploys more, after T1
const batA = Array.from({ length: 80 }, (_, i) => 80 - i * 0.2), batB = Array.from({ length: 80 }, (_, i) => (i > 20 && i < 40 ? 80 - (i - 20) * 1.5 : i >= 40 ? 50 : 80));
const hy = PW.hybridUse({ ...laps[0], bat: batA }, { ...R, bat: batB });
assert.ok(hy.depB > hy.depA && hy.more && hy.more.d0 === 1000, "where the reference deploys more");
const hp = PW.coachPlan({ ...laps[0], bat: batA }, { ...R, bat: batB }, [], { lang: "en" }).plan.find((p) => p.k === "hybrid");
assert.ok(hp && /more battery than the reference/.test(hp.t) && hp.spans.length === 1, "the hybrid step");
assert.equal(PW.hybridUse(laps[0], R), null, "no battery, no step");

// no text joins two phrases with a colon
[...plan.plan, tp, hp].forEach((p) => [p.t, p.what, p.cost, p.how].forEach((t) => assert.ok(!/\S: \S/.test(t || ""), t)));
console.log("coach session: ok");
