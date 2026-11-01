// node cloud/test/preview-sample.test.mjs: the overlay previews' samples from other drivers (previewsample.js): the
// shape is checked, one per driver and game kept at most once an hour, and the newest one of the game is handed out.
import assert from "node:assert/strict";
import { storeSample, pickSample, PREVIEW_EVERY, PREVIEW_KEEP } from "../src/previewsample.js";

const store = new Map();
const DL = {
  async head(k) { const o = store.get(k); return o ? { key: k, customMetadata: o.meta } : null; },
  async put(k, body, opt) { store.set(k, { body, meta: opt.customMetadata, uploaded: new Date() }); },
  async get(k) { const o = store.get(k); return o ? { text: async () => o.body } : null; },
  async list({ prefix }) { return { objects: [...store].filter(([k]) => k.startsWith(prefix)).map(([key, o]) => ({ key, customMetadata: o.meta, uploaded: o.uploaded })), truncated: false }; },
};
const env = { DL };
const names = ["Speed", "CarIdxLapDistPct"];
const sample = (game = "iracing", n = 200, extra = {}) => ({ game, hz: 10, names, session: "WeekendInfo:\n TrackName: spa\n", frames: Array.from({ length: n }, (_, i) => ({ k: i, v: [40 + i, [0.1, 0.2]] })), ...extra });
const now = Date.UTC(2026, 10, 1, 12);

assert.deepEqual(await storeSample(env, "a", sample(), now), { ok: true, kept: true });
assert.deepEqual(await storeSample(env, "a", sample(), now + 60e3), { ok: true, kept: false }, "once an hour per driver");
assert.equal((await storeSample(env, "a", sample(), now + PREVIEW_EVERY + 1)).kept, true);
assert.equal((await storeSample(env, "b", sample("acc"), now)).status, 400, "only iRacing and Le Mans Ultimate");
assert.equal((await storeSample(env, "b", sample("iracing", 10), now)).status, 400, "too short");
assert.equal((await storeSample(env, "b", sample("iracing", 500), now)).status, 400, "too long");
assert.equal((await storeSample(env, "b", { ...sample(), names: ["bad name!"] }, now)).status, 400);
assert.equal((await storeSample(env, "b", { ...sample(), frames: sample().frames.map((f) => ({ k: f.k, v: [1] })) }, now)).status, 400, "a value for every name");
assert.equal(await pickSample(env, "lmu", now), null);
await storeSample(env, "c", sample("lmu"), now);
await storeSample(env, "d", sample("lmu", 200, { session: "newer" }), now + 5000);
assert.equal(JSON.parse(await pickSample(env, "lmu", now + 6000)).session, "newer", "the newest of the game");
assert.equal(await pickSample(env, "lmu", now + PREVIEW_KEEP + 6000), null, "a month old at most");
const got = JSON.parse(await pickSample(env, "iracing", now + PREVIEW_EVERY + 2));
assert.equal(got.frames.length, 200);
assert.deepEqual(got.names, names);
assert.ok(![...store.keys()].some((k) => k.includes("..")), "keys are the driver's id only");
console.log("preview sample ok");
