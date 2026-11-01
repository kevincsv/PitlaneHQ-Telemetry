// node cloud/test/recorded.test.mjs: the coach and the lap analysis on laps the agent's own lap recorder made. The Go test
// TestLapRecorderGolden (laprec_golden_test.go) drives realistic laps through the recorder at 60 frames a second and
// writes them, as they go to the account, to testdata/laprec/laps.json; here they go through web/dist/pitwall-analysis.js
// the way the web reads them (traceBins in index.html) in every language, both units, with and without the track's
// official turns, as an oval and against a reference with estimated pedals, and every answer (analyse and insights) must
// hash to recorded.fixture.json. So a change to the recorder or to the coach that changes what the driver is told shows
// here, lap by lap. It also feeds the module laps it may meet in the wild (no trace, holes, NaN, null laps in the session,
// no reference) and none of them may throw.
//
//   node cloud/test/recorded.test.mjs            check against the fixture
//   node cloud/test/recorded.test.mjs --capture  rewrite the fixture (say why in the commit)
import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = new URL("../../", import.meta.url);
const FIXTURE = new URL("recorded.fixture.json", import.meta.url);
const P = require(new URL("web/dist/pitwall-analysis.js", ROOT).pathname);

// the web's own reading of a trace (index.html traceBins and traceXY)
const traceXY = (tr) => tr && Array.isArray(tr.x) && Array.isArray(tr.y) && tr.x.length > 10 && tr.x.length === tr.y.length ? { x: tr.x, y: tr.y, g: Array.isArray(tr.g) && tr.g.length === 2 ? tr.g : null } : null;
const toLap = (l) => { const bins = l.trace.d.map((x) => [x[0], x[5], x[1], x[2], x[3], x[4], null]); return { n: l.n, time: l.time, valid: l.valid, pit: !!l.pit, sectors: l.sectors || null, bins, maxBin: bins.length - 1, xy: traceXY(l.trace), trackId: 1 }; };

const raw = JSON.parse(fs.readFileSync(new URL("testdata/laprec/laps.json", ROOT), "utf8"));
const fresh = () => raw.map(toLap);
const turns = [0.08, 0.22, 0.31, 0.47, 0.6, 0.74, 0.88]; // the golden road's apexes (laprec_golden_test.go)

const hash = (v) => crypto.createHash("sha256").update(JSON.stringify(v, (k, x) => (typeof x === "number" && !Number.isFinite(x) ? String(x) : x))).digest("hex").slice(0, 16);
const answers = {};
const laps0 = fresh().filter((l) => l.valid);
assert.ok(laps0.length >= 3, "the recorder's clean drive has at least three valid laps");
const best = laps0.reduce((a, b) => (b.time < a.time ? b : a));
for (const lang of ["en", "es", "pt"]) for (const units of ["metric", "imperial"]) for (const tv of ["turns", "no turns"]) for (const kind of ["road", "oval", "estimated"]) {
  for (const A of laps0) {
    const laps = fresh().filter((l) => l.valid), a = laps.find((l) => l.n === A.n), b = laps.find((l) => l.n === best.n);
    if (a === b) continue;
    const ctx = { lang, units, turns: tv === "turns" ? turns : null, laps, ...(kind === "oval" ? { oval: "intermediate", track: { cat: "oval", trackType: "oval" } } : {}), ...(kind === "estimated" ? { estB: true } : {}) };
    const key = `${lang} ${units} ${tv} ${kind} lap ${a.n} vs ${b.n}`;
    answers[key] = hash({ analyse: P.analyse(a, b, ctx), insights: P.insights(a, b, ctx) });
  }
}

// laps the module may meet: none of these may throw
const L = () => fresh().filter((l) => l.valid)[0], R = () => fresh().filter((l) => l.valid)[1];
const odd = {
  "no trace": () => [{ time: 80 }, R()],
  "empty bins": () => [{ bins: [], time: 0 }, R()],
  "one point": () => [{ bins: [[10, 1, 1, 0, 3, 0]], time: 1 }, R()],
  "a hole": () => { const a = L(); for (let i = 100; i < 160; i++) a.bins[i] = null; return [a, R()]; },
  "NaN point": () => { const a = L(); a.bins[200] = [NaN, NaN, NaN, NaN, NaN, NaN]; return [a, R()]; },
  "short lap": () => { const a = L(); a.bins = a.bins.slice(0, 150); a.maxBin = 149; return [a, R()]; },
  "no reference": () => [L(), null],
  "a bad path": () => { const a = L(); a.xy = { x: [1, 2], y: [1] }; return [a, R()]; },
};
const oddCtx = [{}, { laps: [null, undefined, { time: 3 }, L(), R(), L()] }, { turns: [0.1, 1.2, -0.1, NaN] }, { oval: "dirt", laps: [L(), R(), L()] }];
for (const [k, f] of Object.entries(odd)) oddCtx.forEach((c, i) => {
  for (const fn of ["analyse", "insights"]) {
    const [A, B] = f();
    assert.doesNotThrow(() => P[fn](A, B, c), `${fn} on "${k}" (context ${i})`);
  }
});

if (process.argv.includes("--capture")) {
  fs.writeFileSync(FIXTURE, JSON.stringify(answers, null, 1) + "\n");
  console.log(`recorded: ${Object.keys(answers).length} answers written`);
} else {
  const want = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const diff = Object.keys({ ...want, ...answers }).filter((k) => want[k] !== answers[k]);
  assert.deepEqual(diff, [], `answers changed on the recorder's laps: ${diff.slice(0, 8).join("; ")}${diff.length > 8 ? " …" : ""}`);
  console.log(`recorded: ${Object.keys(answers).length} answers as before on the recorder's laps, ${Object.keys(odd).length * oddCtx.length * 2} odd laps without an error`);
}

// two corners close together with a part throttle between them are two braking zones: every corner of the golden road
// brakes, so every lap has all seven (the second of a pair was swallowed by the first before)
for (const l of fresh().filter((x) => x.valid)) assert.equal(P.brakeZones(P.serOf(l)).length, turns.length, `lap ${l.n}: one braking zone a corner`);
