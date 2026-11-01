// node cloud/test/coach-guide.test.mjs: what the model learns for the track guide and the coach beyond one lap against
// another (model.js): the gear the fast drivers take each corner in, every driver's time in every corner (where a lap
// stands among them), where the drivers who improved here found their time and the next level by track temperature; and
// what the analysis module makes of it (pitwall-analysis.js): the track guide, the corner ranks, how this lap does where
// the last session's plan asked for something, and no brake or throttle tip against a reference whose pedals are estimated.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { bandsOf, progressPairs, improveSteps, cornerRanksOf, refsOf, cleanLaps, forCompound } from "../src/model.js";
const require = createRequire(import.meta.url);
const PW = require("../../web/dist/pitwall-analysis.js");

// a lap of 400 points (2 km): one braking zone into a slow corner at 220 (the apex), back to speed; a driver's skill
// moves the braking point, the speed at the apex and the gear
function lap(drv, o = {}) {
  const bp = o.bp ?? 190, vmin = o.vmin ?? 27, gear = o.gear ?? 3, bins = [];
  let t = 0;
  for (let i = 0; i < 400; i++) {
    let v = 60, thr = 1, brk = 0, g = 6;
    if (i >= bp && i < 220) { v = Math.max(vmin, 60 - (i - bp) * ((60 - vmin) / (220 - bp))); thr = 0; brk = 0.9; g = gear; }
    else if (i >= 220 && i < 250) { v = vmin + (i - 220) * ((60 - vmin) / 30); thr = 1; g = gear; }
    bins.push([v, 0, thr, brk, g, 0]);
  }
  for (const b of bins) { t += 5 / b[0]; b[1] = t; }
  return { time: t, bins, field: !!o.field, up: drv, temp: o.temp ?? null };
}

// track temperature bands: only when the laps were driven in several, each with enough laps and drivers
const rows = (spec) => spec.flatMap(([temp, k, drivers]) => Array.from({ length: k }, (_, i) => ({ drv: "d" + (i % drivers) + temp, time: 90 + i * 0.1, temp })));
assert.deepEqual(bandsOf(rows([[20, 10, 4]])), [], "one band: the model as before");
assert.deepEqual(bandsOf(rows([[20, 10, 4], [40, 6, 3]])), ["cold", "hot"], "two bands with enough laps and drivers");
assert.deepEqual(bandsOf(rows([[20, 10, 4], [40, 6, 2]])), ["cold"], "a band of two drivers keeps to the model of every lap");
assert.deepEqual(bandsOf(rows([[20, 10, 4], [null, 30, 5]])), [], "laps without a temperature are no band");

// the drivers who improved: each one's first lap kept against their best, later one
const pr = progressPairs([
  { drv: "a", time: 92, created: 1 }, { drv: "a", time: 90, created: 5 }, { drv: "a", time: 91, created: 3 },
  { drv: "b", time: 90, created: 1 }, { drv: "b", time: 91, created: 5 }, // the best first: no progress to read
  { drv: "c", time: 95, created: 1 }, { drv: "c", time: 90.1, created: 2 },
  { drv: "d", time: 90.1, created: 1 }, { drv: "d", time: 90, created: 2 }, // 0.1 %: not a real step
]);
assert.equal(pr.length, 2, "two drivers improved");
assert.equal(pr[0][0].drv, "c", "the one who came furthest first");
assert.equal(pr[1][0].time, 92, "the first lap kept, not the one in between");

// where they found it: the corner of the record, from three drivers
const rec = lap("r", { bp: 196, vmin: 31 }), n = 400, zones = [{ i: 196, imin: 219 }];
const pairs = ["x", "y", "z"].map((d, k) => ({ old: lap(d, { bp: 180, vmin: 24 + k }), now: lap(d, { bp: 194, vmin: 30 }) }));
const im = improveSteps(pairs, zones, n);
assert.equal(im.length, 1, "one corner");
assert.ok(im[0].gain > 0.1 && im[0].n === 3 && im[0].apex === 219 * 5, "the time the drivers found there");
assert.deepEqual(improveSteps(pairs.slice(0, 2), zones, n), [], "two drivers are not enough");

// every driver's time in every corner, one lap each (their best), sorted
const field = [rec, lap("a", { bp: 192, vmin: 30 }), lap("a", { bp: 180, vmin: 26 }), lap("b", { bp: 188, vmin: 29 }), lap("c", { bp: 184, vmin: 28 })].sort((p, q) => p.time - q.time);
const rk = cornerRanksOf(field, zones, n);
assert.equal(rk.length, 1);
assert.equal(rk[0].n, 4, "one time per driver");
assert.ok(rk[0].q.every((t, k) => k === 0 || t >= rk[0].q[k - 1]), "sorted");
assert.deepEqual(cornerRanksOf(field.slice(0, 2), zones, n), [], "two drivers rank nobody");

// the references of a set of laps: the gear of the fast drivers at each apex and the corner ranks
const many = [];
for (let d = 0; d < 8; d++) many.push(lap("d" + d, { bp: 186 + d, vmin: 26 + d * 0.6, gear: d < 6 ? 3 : 2, temp: d < 4 ? 20 : 40 }));
const refs = await refsOf(cleanLaps(many), async () => null);
assert.ok(refs.corners.length >= 1 && Array.isArray(refs.corners[0].g), "the gear range at the apex");
assert.ok(refs.ranks.length >= 1 && refs.ranks[0].n === 8, "every driver ranked in the corner");

// the next level of the band of lap A's track, when the model has it and its compound has none of its own
const md = { ladder: [{ time: 1 }], corners: [], byBand: { hot: { n: 4, ladder: [{ time: 2 }] } }, byCmp: { 1: { ladder: [{ time: 3 }] } } };
assert.equal(forCompound(md, 0, 40).ladder[0].time, 2, "a hot track: the hot band's next level");
assert.equal(forCompound(md, 0, 40).band, "hot");
assert.equal(forCompound(md, 0, 20).ladder[0].time, 1, "no band of its own: every lap's");
assert.equal(forCompound(md, 1, 40).ladder[0].time, 3, "the compound's own references come first");
assert.equal(forCompound(md, 0, null).ladder[0].time, 1, "no temperature: every lap's");
assert.ok(!("byBand" in forCompound(md, 0, 40)), "the bands never go out whole");

// ---------- the module ----------
const ctx = { lang: "en", units: "metric", turns: null };
// the track guide from the model alone: where to brake, the gear, the apex speed, how hard, the usual tip, the drivers who improved
const model = { nb: 400, corners: [{ d: 960, apex: 1095, b0: 950, b1: 990, v0: 28, v1: 31, n: 6, spread: 0.2, g: [3, 3], mistake: { kind: "brake_later", n: 4 } }, { d: 1500, apex: 1600, b0: 1490, b1: 1505, v0: 40, v1: 42, n: 6, spread: 0.05 }], improve: [{ apex: 1100, gain: 0.25, n: 5 }], ranks: rk };
const g = PW.trackGuide(model, ctx);
assert.equal(g.corners.length, 2);
const c1 = g.corners[0];
assert.match(c1.lines[0], /^Brake between 950 and 990 m, gear 3 at the apex at 101–112 km\/h\.$/);
assert.ok(c1.lines.some((x) => /most common tip here · Brake later \(4 drivers\)/.test(x)), "the usual tip");
assert.ok(c1.lines.some((x) => /improved here found 0\.25 s/.test(x)), "the drivers who improved");
assert.equal(c1.level, "hard");
assert.equal(g.brief[0].n, 1, "the corner that matters most first");
for (const c of g.corners) for (const t of c.lines) assert.ok(!/;|: /.test(t), "no semicolon nor colon: " + t);
assert.equal(PW.trackGuide({ corners: [] }, ctx), null, "no corners, no guide");
const es = PW.trackGuide(model, { ...ctx, lang: "es" });
assert.match(es.corners[0].lines[0], /^Frena entre 950 y 990 m/);

// where a lap stands in each corner: the share of drivers at least as fast there
const mine = lap("me", { bp: 184, vmin: 28 }), fast = lap("me", { bp: 196, vmin: 31 });
const r1 = PW.cornerRanks(mine, model, ctx), r2 = PW.cornerRanks(fast, model, ctx);
assert.equal(r1.length, 1);
assert.ok(r2[0].top < r1[0].top, "a faster corner ranks higher");
assert.ok(r2[0].top <= 25, "the record's corner is among the fastest");
assert.deepEqual(PW.cornerRanks(mine, {}, ctx), []);

// how this lap does where the last plan asked for something
const B = lap("ref", { bp: 196, vmin: 31 });
const cs = PW.coachCompare(mine, B, ctx);
const ta = cs[0].ta;
const fu = PW.followUp([{ n: 1, apex: cs[0].apex + 20, kind: "brake_later", lost: 0.2, tbest: ta + 0.15 }, { n: 2, apex: 3000, kind: "apex_speed", lost: 0.1, tbest: 9 }, { n: 3, apex: cs[0].apex, kind: "", lost: 0.3, tbest: 1 }], cs, ctx);
assert.equal(fu.length, 1, "the corners of this lap only, with a tip");
assert.equal(fu[0].ok, 1, "faster than last time");
assert.match(fu[0].text, /^0\.15 s faster than your best lap there last time · still /);
assert.equal(PW.followUp([{ n: 1, apex: cs[0].apex, kind: "brake_later", lost: 0.2, tbest: ta - 0.1 }], cs, ctx)[0].ok, -1, "slower");
assert.equal(PW.followUp([{ n: 1, apex: cs[0].apex, kind: "brake_later", lost: 0.2, tbest: ta + 0.01 }], cs, ctx)[0].ok, 0, "the same");
assert.deepEqual(PW.followUp(null, cs, ctx), []);
const an = PW.analyse(mine, B, { ...ctx, prev: [{ n: 1, apex: cs[0].apex, kind: "brake_later", lost: 0.2, tbest: ta + 0.15 }], model, byCls: [{ cls: "slow", n: 12, avg: 0.11 }, { cls: "fast", n: 8, avg: 0.02 }, { cls: "medium", n: 2, avg: 0.5 }] });
assert.equal(an.followup.length, 1);
assert.ok(an.guide && an.guide.corners.length === 2, "the guide in the phones' answer");
assert.equal(an.ranks.length, 1);
assert.deepEqual(an.cls.map((x) => x.cls), ["slow", "fast"], "the weakest corner type first, too few corners left out");

// a reference whose pedals and gears are estimated from its speed: no tip about pressing the brake or the throttle, nor gears
const soft = (o) => { const l = lap("s", o); l.bins.forEach((b, i) => { if (i >= (o.bp ?? 190) && i < 220) b[3] = 0.4; }); return l; };
const Aest = soft({ bp: 196, vmin: 26, gear: 2 }), Best = { ...lap("r", { bp: 196, vmin: 31, gear: 3 }), est: true };
const ce = PW.coachCompare(Aest, Best, ctx), cr = PW.coachCompare(Aest, { ...Best, est: false }, ctx);
assert.ok(ce.every((c) => !["brake_harder", "trail", "brake_same", "coast", "no_wait", "throttle_rough", "throttle_slow", "gear_up", "gear_down", "lifts"].includes(c.kind)), "no pedal or gear tip: " + ce.map((c) => c.kind));
assert.ok(ce.every((c) => c.est), "the corners say their reference is estimated");
assert.ok(cr.every((c) => !c.est));
assert.ok(PW.coachCompare(Aest, Best, { ...ctx }).length === ce.length);
assert.deepEqual(PW.lapDriving(PW.lapSeries(Aest), PW.lapSeries(Best), 400, { ...ctx, estB: true }), [], "nor how the lap is driven");
const pe = PW.coachPlan(Aest, Best, [], ctx).plan;
assert.ok(pe.every((p) => p.k !== "trail" && p.k !== "gears"), "nor trail braking or gear steps in the plan");
assert.ok(PW.estOf({ field: true }) && PW.estOf(null, { estB: true }) && !PW.estOf({}), "a rival's lap from its place on track");
// the race pace: P2 faster in the second half, P4 slower, your pace fading more than theirs
{
  const laps = (base, fade, n = 12) => Array.from({ length: n }, (_, k) => base + (k >= n / 2 ? fade : 0) + (k % 2) * 0.05);
  const me = laps(90, 0.4);
  const r = { laps: me.map((t, k) => ({ n: k + 1, t: k === 0 ? 110 : t, pit: k === 7 })), results: [
    { cpos: 2, name: "A", pace: laps(89.9, 0).map((t, k) => ({ n: k + 1, t, x: k === 3 })) },
    { cpos: 3, me: true, name: "Me" },
    { cpos: 4, name: "B", pace: laps(90.6, 0.1).map((t, k) => ({ n: k + 1, t })) },
    { cpos: 5, name: "C", pace: [{ n: 1, t: 90 }] }] };
  const p = PW.racePace(r, { lang: "en" });
  assert.equal(p.rows.length, 3);
  const a = p.rows.find((x) => x.name === "A"), b = p.rows.find((x) => x.name === "B");
  assert.ok(a.late < -0.3 && b.late > 0, JSON.stringify(p.rows));
  assert.match(p.lines[0].t, /^P2 was 0\.\d\d s a lap faster than you in the second half$/);
  assert.ok(p.lines.some((l) => /dropped/.test(l.t)), JSON.stringify(p.lines));
  for (const l of p.lines) assert.ok(!/[;:]/.test(l.t));
  assert.equal(PW.racePace({ laps: [], results: [] }), null);
}
// the track left unused: a circle 4 m of road to the left of the layout and 6 m to the right; a lap 2 m to the left
// leaves 8 m on the outside of the exit, a lap 5.5 m to the right none
{
  const N = 1257, R = 200, circ = (off) => { const x = [], y = []; for (let i = 0; i < N; i++) { const a = (i * 5) / R; x.push((R - off) * Math.cos(a)); y.push((R - off) * Math.sin(a)); } return { x, y }; };
  const lay = { ...circ(0), g: [45, 7], edges: { l: new Array(N).fill(4), r: new Array(N).fill(-6) } };
  const A = (off) => ({ xy: { ...circ(off), g: [45, 7] }, bins: [] });
  const u = PW.edgeUse(A(2), lay, { lang: "es", turns: [0.25] });
  assert.equal(u.length, 1);
  assert.equal(u[0].m, 8);
  assert.equal(u[0].text, "Dejas 8,0 m de pista sin usar a la salida de T1");
  assert.equal(PW.edgeUse(A(-5.5), lay, { turns: [0.25] }).length, 0);
  assert.equal(PW.edgeUse({ xy: { ...circ(2), g: null } }, lay, { turns: [0.25] }).length, 0, "no game position: nothing");
}
console.log("coach guide: ok");

// the admin's check of the coach on real laps: the share of laps each tip and step appears in
const { calibrate } = await import("../src/coachcalib.js");
const cal = calibrate([lap("a", { bp: 196, vmin: 31 }), lap("b", { bp: 185, vmin: 27 }), lap("c", { bp: 200, vmin: 26 }), lap("d", { bp: 190, vmin: 29, gear: 2 })]);
assert.equal(cal.laps, 3, "every lap but the fastest");
assert.ok(Object.values(cal.kinds).every((v) => v > 0 && v <= 100) && Object.keys(cal.kinds).length >= 1, "tips counted in percent");
assert.ok(cal.steps.corner > 0, "the corners' steps counted");
console.log("coach calibration: ok");
