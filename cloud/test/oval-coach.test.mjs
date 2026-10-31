// node cloud/test/oval-coach.test.mjs: the oval coach of web/dist/pitwall-analysis.js (ovalOf, liftZones, the oval tips
// and the oval's step of the plan). Road courses keep every answer (analysis.test.mjs); these laps are ovals.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const PW = require("../../web/dist/pitwall-analysis.js");

// a lap every 5 m, L metres: flat out at 80 m/s but for the corners, each a lift to thr that slows the car by dv over len
// metres from at, braking (brake) over its first fifth when given
function lap(L, corners, v0 = 80) {
  const n = Math.round(L / 5), bins = []; let t = 0;
  for (let i = 0; i < n; i++) {
    const d = i * 5; let v = v0, thr = 1, br = 0;
    for (const c of corners) { const x = d - c.at; if (x >= 0 && x < c.len) { const p = x / c.len; v = v0 - c.dv * Math.sin(Math.PI * p); thr = p < .6 ? c.thr : c.thr + (1 - c.thr) * (p - .6) / .4; br = c.brake && p < .2 ? c.brake : 0; } }
    if (i) t += 5 / v; bins.push([v, t, thr, br, 4, 0]);
  }
  return { bins, maxBin: n - 1, time: t + 5 / v0 };
}
const T = (cat, track, cfg, extra) => ({ track: { cat, track, track_config: cfg || "", ...(extra || {}) } });

// the kind of oval
const L15 = lap(2414, []);
assert.equal(PW.ovalOf(L15, L15, T("Road", "Daytona International Speedway", "Road Course")), null);
assert.equal(PW.ovalOf(L15, L15, T("oval", "Charlotte Motor Speedway", "Roval")), null);
assert.equal(PW.ovalOf(L15, L15, T("sports_car", "Spa-Francorchamps")), null);
assert.equal(PW.ovalOf(L15, L15, T("oval", "Daytona International Speedway", "Oval")), "superspeedway");
assert.equal(PW.ovalOf(lap(846, []), null, T("Oval", "Martinsville Speedway")), "short");
assert.equal(PW.ovalOf(lap(1609, []), null, T("Oval", "Phoenix Raceway", "Oval")), "mile");
assert.equal(PW.ovalOf(L15, null, T("oval", "Charlotte Motor Speedway", "Oval")), "intermediate");
assert.equal(PW.ovalOf(L15, L15, T("DirtOval", "Eldora Speedway")), "dirt");
assert.equal(PW.ovalOf(L15, L15, T("dirt_oval", "Eldora Speedway")), "dirt");
assert.equal(PW.ovalOf({ ...L15, car: "Dirt Sprint Car - 410", track: "Knoxville Raceway" }, null, {}), "dirt");
assert.equal(PW.ovalOf(L15, L15, { oval: "short" }), "short");
assert.equal(PW.ovalOf(L15, L15, { oval: false, ...T("oval", "Charlotte Motor Speedway") }), null);
assert.equal(PW.ovalOf({ ...L15, cat: "oval", track: "Charlotte Motor Speedway" }, null, {}), "intermediate"); // the lap's own fields
// a long oval the reference takes flat out all lap is a drafting track
assert.equal(PW.ovalOf(lap(4000, []), lap(4000, []), T("oval", "Atlanta Motor Speedway", "Oval")), "superspeedway");

// an intermediate: a lift too early, a lift where the reference is flat out, never a word about a brake
const R = lap(2414, [{ at: 600, len: 300, dv: 6, thr: .6 }, { at: 1800, len: 300, dv: 6, thr: .6 }]);
const A = lap(2414, [{ at: 560, len: 340, dv: 9, thr: .3 }, { at: 1800, len: 300, dv: 6, thr: .6 }, { at: 1300, len: 200, dv: 4, thr: .7 }]);
const ctx = T("oval", "Charlotte Motor Speedway", "Oval");
const out = PW.analyse(A, R, { lang: "en", ...ctx }), cs = out.corners.filter((c) => c.lost > .03);
assert.deepEqual(cs.map((c) => c.kind), ["oval_lift_later", "oval_flat"]);
assert.equal(cs[0].text, "You lift 40 m before the reference. Lift later");
assert.ok(cs.every((c) => c.oval === "intermediate" && !/brak/i.test(c.text)), "no brake on a lift corner");
assert.equal(cs[1].flatB, true);
const plan = out.coach.plan;
assert.equal(plan[0].k, "oval");
assert.match(plan[0].t, /^Intermediate oval · lifts in 3 corners \(reference 2\)$/);
assert.ok(plan.every((p) => !/[;]/.test(p.t + p.why + (p.how || ""))), "no semicolons");
assert.match(plan.find((p) => p.k === "corner").why, /You lift 40 m earlier/);
// Spanish and Portuguese too
assert.equal(PW.analyse(A, R, { lang: "es", ...ctx }).corners[0].text, "Levantas 40 m antes que la referencia. Levanta más tarde");
assert.equal(PW.analyse(A, R, { lang: "pt", ...ctx }).corners[0].text, "Você alivia 40 m antes da referência. Alivie mais tarde");
// braking where the reference only lifts
const AB = lap(2414, [{ at: 600, len: 300, dv: 9, thr: .1, brake: .4 }, { at: 1800, len: 300, dv: 6, thr: .6 }]);
assert.equal(PW.analyse(AB, R, { lang: "en", ...ctx }).corners[0].kind, "oval_no_brake");
// the same laps on a road course: lifts are no corners without official turns
assert.equal(PW.analyse(A, R, { lang: "en", ...T("Road", "Road America", "Full Course") }).corners.length, 0);

// a superspeedway, both laps flat out: the gap is the draft
const S1 = lap(4023, [], 85), S2 = lap(4023, [], 84);
const ss = PW.analyse(S2, S1, { lang: "en", ...T("oval", "Daytona International Speedway", "Oval") });
assert.equal(ss.coach.plan[0].k, "oval");
assert.match(ss.coach.plan[0].t, /^Flat out all lap like the reference, so the [\d.]+ s are the draft$/);

// a short track keeps its braking tips, with the short track's step of the plan
const SR = lap(846, [{ at: 150, len: 200, dv: 30, thr: 0, brake: .8 }, { at: 570, len: 200, dv: 30, thr: 0, brake: .8 }], 45);
const SA = lap(846, [{ at: 130, len: 220, dv: 33, thr: 0, brake: .8 }, { at: 570, len: 200, dv: 30, thr: 0, brake: .8 }], 45);
const sh = PW.analyse(SA, SR, { lang: "en", ...T("oval", "Martinsville Speedway") });
assert.ok(sh.corners.some((c) => c.lost > .03) && sh.corners.every((c) => !c.lift && !/^oval_/.test(c.kind)), JSON.stringify(sh.corners.map((c) => c.kind)));
assert.match(sh.coach.plan[0].t, /^Short track · 2 braking zones \(reference 2\)$/);

// dirt: no steering corrections tip, the groove instead of the road's line
assert.equal(PW.lapDriving({ arr: A.bins.map((b) => [...b.slice(0, 5), Math.sin(b[1] * 9)]) }, { arr: R.bins }, 400, { oval: "dirt" }).some((t) => /wheel/.test(t)), false);
assert.equal(PW.dirtLineTip({ entry: 0, apex: -3, exit: 0 })[0], "You run 3.0 m higher than the reference through the middle of the corner. Try its lower groove");
assert.equal(PW.tipMain({ tip: ["Carry 5 km/h more through the middle of the corner. You run 3.0 m higher than the reference through the middle of the corner. Try its lower groove", "", ""], kind: "oval_center", oval: "dirt", line: { entry: 0, apex: -3, exit: 0 } })[0], "Carry 5 km/h more through the middle of the corner");
assert.equal(PW.kindName("oval_flat", { lang: "en" }), "Lifts where the reference is flat out");
console.log("oval coach: ok");
