// node cloud/test/lap-repair.test.mjs: a lap the live recording left with a hole is repaired from the game's telemetry
// file (the PC sends the file's copy with repair, worker.js addLap replaces the account's copy only when it really had a
// hole: traceHole), and the model leaves a lap recorded badly aside (goodLap with the trace's health h)
import assert from "node:assert/strict";
import { traceHole } from "../src/laphealth.js";
import { goodLap } from "../src/model.js";

const d = Array.from({ length: 100 }, (_, i) => [50, 1, 0, 4, 0, i * 0.1]);
assert.equal(traceHole({ d, h: { gap: 120, seen: 0.95, hz: 60 } }), true, "a hole of 120 m");
assert.equal(traceHole({ d, h: { gap: 10, seen: 0.8, hz: 60 } }), true, "a fifth of the lap never seen");
assert.equal(traceHole({ d, h: { gap: 10, seen: 0.99, hz: 60 } }), false, "a whole lap is never replaced");
assert.equal(traceHole({ d, incK: ["off"] }), false, "a lap of before with an Off Track stays as it is");
assert.equal(traceHole({ d, incK: ["loss"] }), true, "a lap of before without one may be repaired");
assert.equal(traceHole(null), true, "no trace at all");

const lap = (h) => ({ d: Array.from({ length: 80 }, (_, i) => [40, 1, 0, 4, 0, i * 0.125]), ...(h ? { h } : {}) });
assert.ok(goodLap(10, lap()), "a lap of before");
assert.ok(goodLap(10, lap({ gap: 5, seen: 1, hz: 60 })), "a lap recorded well");
assert.equal(goodLap(10, lap({ gap: 80, seen: 0.97, hz: 60 })), null, "a lap with a hole never teaches the model");
assert.equal(goodLap(10, lap({ gap: 5, seen: 0.7, hz: 60 })), null, "nor one mostly guessed");
console.log("lap repair: ok");
