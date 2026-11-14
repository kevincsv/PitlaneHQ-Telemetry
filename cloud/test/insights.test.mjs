// node cloud/test/insights.test.mjs: the analysis beyond one lap in pitwall-analysis.js, the same on every device: each
// corner lap after lap (corner consistency) and the laps' spread (the most consistent session), every off explained by
// what the lap did just before it, the g-forces, the steering against the speed and understeer, the tyres lap by lap and
// the race fuel and stints
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const PW = require("../../web/dist/pitwall-analysis.js");

// a lap of 400 points (2 km) round a circle-ish track: one braking zone into a slow corner at 220 (the apex); o moves the
// braking point (bp), the speed at the apex (vmin), the brake pressure (brk) and where the throttle comes back (thr)
function lap(n, o = {}) {
  const bp = o.bp ?? 190, vmin = o.vmin ?? 27, brk = o.brk ?? 0.8, thrAt = o.thr ?? 220, bins = [], x = [], y = [];
  let t = 0, h = 0, px = 0, py = 0;
  for (let i = 0; i < 400; i++) {
    let v = 60, thr = 1, br = 0, g = 6, st = 0.01;
    if (i >= bp && i < 220) { v = Math.max(vmin, 60 - (i - bp) * ((60 - vmin) / (220 - bp))); thr = 0; br = i < 212 ? brk : 0.05; g = 3; st = 0.15; }
    else if (i >= 220 && i < 250) { v = vmin + (i - 220) * ((60 - vmin) / 30); thr = i >= thrAt ? 1 : 0.2; g = 3; st = 0.12; }
    if (i >= thrAt && i < 220) thr = 0.8;
    bins.push([v, 0, thr, br, g, st, null]);
    // the path: straight, then the corner bends 90° over 60 m around the apex
    if (i >= 205 && i < 235) h += (Math.PI / 2) / 30;
    px += 5 * Math.cos(h); py += 5 * Math.sin(h); x.push(px); y.push(py);
  }
  for (const b of bins) { t += 5 / b[0]; b[1] = t; }
  return { n, time: t + (o.slow || 0), bins, maxBin: 399, valid: o.valid !== false, fuel: o.fuel ?? 2.5, xy: { x, y, g: null }, incAt: o.incAt || [], incK: o.incK || [], tt: o.tt };
}
const ctx = { lang: "en", units: "metric" };

// the laps' spread: five laps within 3 % of the best at least
assert.equal(PW.lapSpread([lap(1), lap(2), lap(3)]), null, "too few laps for a spread");
const sp = PW.lapSpread([lap(1), lap(2, { slow: 0.2 }), lap(3, { slow: 0.4 }), lap(4, { slow: 0.1 }), lap(5, { slow: 0.3 }), lap(6, { slow: 20 })]);
assert.equal(sp.n, 5, "a lap 20 s slower is left out");
assert.ok(Math.abs(sp.sd - 0.141) < 0.002, "sd " + sp.sd);

// corner consistency: the corner taken differently every lap costs time against your best there
const laps = [lap(1, { bp: 190 }), lap(2, { bp: 185, vmin: 25 }), lap(3, { bp: 192, vmin: 24 }), lap(4, { bp: 188, vmin: 26 })];
const cs = PW.cornerSpread(laps, ctx);
assert.equal(cs.rows.length, 1);
const c = cs.rows[0];
assert.ok(c.sd > 0.05 && c.cost > 0.05 && c.worst > c.best && c.vsd > 0, JSON.stringify(c));
assert.match(c.text, /^T1 changes ±/);
assert.equal(PW.cornerSpread(laps.slice(0, 2), ctx), null, "three clean laps at least");

// offs explained: braking 40 m later than the best lap, too fast at turn-in, early throttle, harder on the brake
const best = lap(1), why = (o) => PW.offsExplained([best, lap(2), lap(3, { slow: 0.5 }), lap(9, { ...o, valid: false, incAt: [1110, 1], incK: ["off"] })], ctx)[0];
assert.equal(why({ bp: 198 }).why, "late");
assert.equal(why({ bp: 190, vmin: 36 }).why, "fast");
assert.equal(why({ thr: 214 }).why, "throttle");
assert.equal(why({ brk: 1 }).why, "lock");
assert.equal(why({}).why, "line", "the same lap: the line took you off");
assert.match(why({ bp: 198 }).text, /braked 40 m later than on your best lap/);
assert.equal(PW.offsExplained([best, lap(2, { incAt: [600, 4], incK: ["contact"] })], ctx).length, 0, "a car contact is no off");

// more charts: the g-forces from the speed and the path, the steering in the corners
const gg = PW.ggOf(best);
assert.ok(gg && gg.pts.length > 50 && gg.max.lat > 1 && gg.max.brake > 0.5, JSON.stringify(gg && gg.max));
assert.equal(PW.ggOf({ ...best, xy: null }), null, "no path, no g across the car");
assert.ok(PW.steerOf(best, ctx).every((p) => p[1] > 3));
const pushes = lap(2); pushes.bins.forEach((b) => (b[5] *= 1.3));
assert.match(PW.understeer(pushes, best, ctx).text, /A needs 30 % more steering than B/);
// the tyres lap by lap where the game gives them
const tt = [80, 82, 84, 81, 83, 85, 70, 72, 74, 71, 73, 75];
assert.deepEqual(PW.tyreLaps([lap(1, { tt }), lap(2)]), [{ n: 1, tt, avg: [82, 83, 72, 73] }]);

// race fuel: 2.5 l a lap, a 60 l tank (24 laps), a 50-lap race needs 127.5 l with one lap spare: two stops of 33.8 l
const u = PW.fuelUse([lap(1), lap(2, { fuel: 2.4 }), lap(3, { fuel: 2.6 }), lap(4, { fuel: 9, slow: 30 })], { tank: 60 });
assert.deepEqual([u.perLap, u.maxLap, u.laps, u.tank], [2.5, 2.6, 3, 60], "a slow lap behind the safety car is left out");
assert.deepEqual(PW.fuelPlan(u, { laps: 50 }), { laps: 50, need: 127.5, perTank: 24, stops: 2, add: 33.8, adds: [33.8, 33.8], start: 60, stint: 17, stints: [17, 17, 16], tank: 60 });
// a stop comes only between laps: a tank of 10.9 laps lasts 10 (9 with the spare), so 31 laps take three stops, not two
const whole = PW.fuelPlan({ perLap: 1, tank: 10.9, lapTime: 90 }, { laps: 31 });
assert.deepEqual([whole.stops, whole.perTank, whole.stints], [3, 10, [8, 8, 8, 7]]);
// every plan, followed lap by lap, never runs dry, never overfills the tank, keeps a lap at the flag and has no stop to spare
for (let t = 2.5; t < 40; t += 0.37) for (let n = 1; n < 200; n += 3) {
  const p = 2.37, tank = t * p, r = PW.fuelPlan({ perLap: p, tank, lapTime: 90 }, { laps: n }), adds = r.add != null ? Array(r.stops).fill(r.add) : r.adds, tol = 0.05 * (r.stops + 2);
  let f = r.start;
  r.stints.forEach((k, i) => { if (i) { f += adds[i - 1]; assert.ok(f <= tank + tol, `overfilled ${t} ${n}`); } f -= k * p; assert.ok(f >= -tol, `ran dry ${t} ${n}`); });
  assert.ok(f >= p - tol && r.stints.reduce((a, b) => a + b, 0) === n, `spare ${t} ${n}`);
  if (r.stops) assert.ok((r.stops - 1) * r.perTank + Math.floor(tank / p - 1 + 1e-9) < n, `a stop too many ${t} ${n}`);
}
const shortRace = PW.fuelPlan(u, { laps: 10 });
assert.equal(shortRace.stops, 0); assert.equal(shortRace.start, 27.5);
assert.equal(PW.fuelPlan(u, { min: 30 }).laps, Math.floor(1800 / u.lapTime) + 1, "a timed race counts its laps at your pace");
assert.equal(PW.fuelPlan({ ...u, tank: null }, { laps: 50 }).stops, null, "no tank, no stops");

// all at once, for the phones: plain JSON
const all = JSON.parse(JSON.stringify(PW.insights(best, lap(2), { ...ctx, laps: [best, lap(2), lap(3), lap(4, { valid: false, bp: 198, incAt: [1110, 1], incK: ["off"] })], tank: 60 })));
assert.ok(all.spread && all.offs.length === 1 && all.gg.a && all.steer.a.length && all.fuel.perLap === 2.5);
console.log("insights ok");

// the pedal and wheel check: good laps say nothing; a brake that never passes 55 %, a throttle that reads with the foot
// on the brake and a wheel off centre on the straights are found on every lap
{
  const good = [1, 2, 3].map((n) => lap(n));
  assert.deepEqual(PW.pedalCheck(good, ctx), []);
  const bad = [1, 2, 3].map((n) => { const l = lap(n, { brk: 0.55 }); for (const b of l.bins) { if (b[3] > 0.3) b[2] = 0.06; if (b[2] > 0.97) b[5] = 0.07; } return l; });
  const ks = PW.pedalCheck(bad, ctx).map((x) => x.k);
  assert.ok(ks.includes("brakeMax") && ks.includes("thrFloor") && ks.includes("steerOff"), ks.join(","));
  assert.equal(PW.pedalCheck(bad.slice(0, 2), ctx).length, 0, "needs three laps");
}
console.log("pedal check ok");

// session goals: beat last time's best, five clean laps in a row and the corner where last time's best lap lost the most
{
  const prev = [lap(1), lap(2, { bp: 200 }), lap(3, { vmin: 25 })];
  const g0 = PW.sessionGoals([], prev, { ...ctx, turns: [0.1, 220 * 5 / 2000], trackLen: 2000 });
  assert.equal(g0.find((g) => g.k === "best").done, false);
  const cur = [1, 2, 3, 4, 5].map((n) => lap(n, { bp: 205 }));
  const g = PW.sessionGoals(cur, prev, { ...ctx, turns: [0.1, 220 * 5 / 2000], trackLen: 2000 });
  assert.equal(g.find((x) => x.k === "clean").done, true);
  assert.equal(PW.sessionGoals(cur, [], ctx).length, 0);
}
console.log("session goals ok");

// the race story: the start, places won and lost, the stop, an incident and the finish, in order
{
  const r = { start: 8, finish: 5, laps: [{ n: 1, p: 6 }, { n: 2, p: 6 }, { n: 3, p: 7 }, { n: 4, p: 9, pit: true }, { n: 5, p: 5 }], incidents: [{ lap: 3, d: 1200, pts: 2, kind: "loss" }] };
  const st = PW.raceStory(r, ctx).map((x) => x.k);
  assert.deepEqual(st, ["start", "inc", "loss", "pit", "gain", "finish"]);
}
console.log("race story ok");
