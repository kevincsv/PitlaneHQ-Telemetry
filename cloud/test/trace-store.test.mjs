// node cloud/test/trace-store.test.mjs: a lap's telemetry in the telemetry bucket (tracestore.js). Gzipped and sealed,
// "r2:" + its key in the row; off until the database says so; every reader opens the old forms and the new one; a lap
// shared to the leaderboard keeps its own copy; only a lap's own objects are deleted with it; and the laps of before
// move over checked one by one, a row changed meanwhile left alone.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { register } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { sealData, openData, packData, unpackData } from "../src/crypt.js";
import { traceStoreOn, forgetTraceStore, sealTrace, ownTrace, dropTraces, lapTracePtrs, moveTraces, moveOne } from "../src/tracestore.js";
// the Worker imports JSON and HTML as wrangler bundles them, and Cloudflare's own module: node reads them as modules here
register("data:text/javascript," + encodeURIComponent(`import {readFile} from "node:fs/promises";export async function resolve(s,c,n){if(s.startsWith("cloudflare:"))return {url:"data:text/javascript,export class DurableObject{}",shortCircuit:true};return n(s,c)}export async function load(u,c,n){if(u.endsWith(".json"))return {format:"module",source:"export default "+await readFile(new URL(u),"utf8"),shortCircuit:true};if(u.endsWith(".html"))return {format:"module",source:"export default "+JSON.stringify(await readFile(new URL(u),"utf8")),shortCircuit:true};return n(u,c)}`));
const { keepBestLap } = await import("../src/community.js");
const { deleteAccount } = await import("../src/accounts.js");
const worker = (await import("../src/worker.js")).default;

const db = new DatabaseSync(":memory:");
const dir = new URL("../migrations/", import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
const stmt = (q, a = []) => ({
  bind: (...x) => stmt(q, x),
  all: async () => ({ results: db.prepare(q).all(...a) }),
  first: async () => db.prepare(q).get(...a) || null,
  run: async () => { const r = db.prepare(q).run(...a); return { meta: { changes: Number(r.changes) } }; },
});
// the bucket, as the Worker sees R2
const objs = new Map();
let failGets = 0;
const TRACES = {
  put: async (k, v) => { objs.set(k, new Uint8Array(v)); },
  get: async (k) => { if (failGets > 0) { failGets--; throw new Error("busy"); } const v = objs.get(k); return v ? { arrayBuffer: async () => v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) } : null; },
  delete: async (k) => { for (const x of Array.isArray(k) ? k : [k]) objs.delete(x); },
};
const env = { DATA_KEY: "test-key", TRACES, DB: { prepare: (q) => stmt(q), batch: async (list) => { const out = []; for (const s of list) out.push(await s.run()); return out; } } };
const setOn = (on) => { db.prepare("DELETE FROM app_state WHERE k='trace_store'").run(); if (on) db.prepare("INSERT INTO app_state (k, v, at) VALUES ('trace_store','r2',1)").run(); forgetTraceStore(); };

// a lap as the PC sends it: 5 m bins of [speed, throttle, brake, gear, steering, time], and where the car was
const lap = (n = 900, seed = 1) => {
  const d = [], x = [], y = [];
  let t = 0, v = 60;
  for (let i = 0; i < n; i++) { v = 40 + 25 * Math.sin((i + seed) / 40); t += 5 / v; d.push([+v.toFixed(2), i % 90 < 60 ? 1 : 0, i % 90 < 60 ? 0 : 0.8, 3 + (i % 3), +(Math.sin(i / 17) / 3).toFixed(3), +t.toFixed(4)]); x.push(+(i * 4.9).toFixed(1)); y.push(+(Math.cos(i / 30) * 200).toFixed(1)); }
  return JSON.stringify({ bin: 5, d, x, y, g: [45, 0], f: ["traffic"] });
};
const plain = lap(), T = JSON.parse(plain).d.at(-1)[5]; // its lap time

// packed: gzip then sealed, far smaller than the column's sealed base64, and the same text back
const inRow = await sealData(env, plain), packed = await packData(env, plain);
assert.ok(inRow.startsWith("enc:") && packed[0] === 1, "sealed both ways");
assert.ok(packed.byteLength < inRow.length * 0.4, `well under half the size (${packed.byteLength} of ${inRow.length})`);
assert.equal(await unpackData(env, packed), plain, "the same text comes back");
assert.equal(await unpackData({}, await packData({}, plain)), plain, "a server without its key: gzipped only");
await assert.rejects(unpackData({ DATA_KEY: "another" }, packed), "another key opens nothing");

// off until the database says so, and never without a bucket
setOn(false);
assert.equal(await traceStoreOn(env), false, "off by itself");
assert.ok((await sealTrace(env, plain, "l")).startsWith("enc:"), "off: sealed into the row as before");
assert.equal(objs.size, 0, "nothing in the bucket");
setOn(true);
assert.equal(await traceStoreOn({ ...env, TRACES: undefined }), false, "no bucket: off whatever the database says");
assert.equal(await traceStoreOn(env), true, "on");

// on: the row keeps where the telemetry is, every reader opens it
const ptr = await sealTrace(env, plain, "l");
assert.match(ptr, /^r2:l\/[0-9a-f]{24}$/, "the row keeps the key");
assert.equal(await openData(env, ptr), plain, "openData reads it from the bucket");
assert.equal(await openData(env, inRow), plain, "and a lap sealed in its row still");
assert.equal(await openData(env, plain), plain, "and a lap of before any sealing");
failGets = 2;
assert.equal(await openData(env, ptr), plain, "a read that fails is tried again");
failGets = 3;
await assert.rejects(openData(env, ptr), "three failures are an error, never an empty lap");
failGets = 0;
await assert.rejects(openData(env, "r2:l/none"), /not found/, "an object that is not there is an error for the reader");
await assert.rejects(openData({ ...env, TRACES: undefined }, ptr), /bucket/, "no bucket to read from");

// a shared lap keeps its own copy; only a lap's own objects are ever deleted
const copy = await ownTrace(env, ptr, "c");
assert.ok(/^r2:c\//.test(copy) && copy !== ptr, "its own object");
assert.equal(await dropTraces(env, [copy, null, "enc:abc", plain]), 0, "a leaderboard lap's object is never deleted here");
assert.equal(await dropTraces(env, [ptr, ptr]), 1, "the lap's own goes with it");
assert.equal(await openData(env, copy), plain, "the shared copy is whole after the lap went");
assert.equal(await ownTrace(env, ptr, "c"), null, "a lap whose telemetry is gone is shared without it");
assert.ok(/^r2:c\//.test(await ownTrace(env, inRow, "c")), "on: a trace sealed in a row goes to the bucket when it is shared");
setOn(false);
assert.equal(await ownTrace(env, inRow, "c"), inRow, "off: it stays as it is");
assert.ok(/^r2:c\//.test(await ownTrace(env, copy, "c")), "off: what is in the bucket is still copied, never shared");
assert.equal(await ownTrace(env, null, "c"), null);

// the leaderboard: a lap taken from the account's lap gets its own copy, and the session's deletion leaves it whole
setOn(true);
db.prepare("INSERT INTO community_users (id, token_hash, alias, created) VALUES ('u1','acct:u1','Driver',1)").run();
db.prepare("INSERT INTO sessions (id, started, track, car, uploader, game, track_id, car_id) VALUES ('s1',1,'Track','Car','acct:u1','iracing',10,20)").run();
const lapPtr = await sealTrace(env, plain, "l");
db.prepare("INSERT INTO laps (id, session_id, n, time, valid, trace, created) VALUES ('s1:1','s1',1,?,1,?,1)").run(T, lapPtr);
db.prepare("INSERT INTO laps (id, session_id, n, time, valid, trace, created) VALUES ('s1:2','s1',2,99.5,0,?,1)").run(await sealTrace(env, lap(900, 2), "l"));
const kept = await keepBestLap(env, "u1", { game: "iracing", carId: 20, trackId: 10, car: "Car", track: "Track", time: T, sectors: null, trace: lapPtr });
assert.ok(kept.shared && kept.traced, "shared with its telemetry");
const shared = db.prepare("SELECT trace, sectors FROM community_laps WHERE user_id='u1'").get();
assert.ok(/^r2:c\//.test(shared.trace) && shared.trace !== lapPtr, "the leaderboard's row has its own object");
assert.ok(shared.sectors && JSON.parse(shared.sectors).length === 3, "its sectors read from the bucket's telemetry");
const gone = await lapTracePtrs(env, "l.session_id=?1", "s1");
assert.equal(gone.length, 2, "the session's telemetry objects");
db.prepare("DELETE FROM laps WHERE session_id='s1'").run();
assert.equal(await dropTraces(env, gone), 2);
await assert.rejects(openData(env, lapPtr), "the session's telemetry left the bucket");
assert.equal(await openData(env, shared.trace), plain, "the leaderboard's lap is whole");

// deleting the account: the laps nobody learns from go with their telemetry, the valid ones stay with theirs
db.prepare("INSERT INTO community_users (id, token_hash, alias, created) VALUES ('u2','acct:u2','Other',1)").run();
db.prepare("INSERT INTO sessions (id, started, track, car, uploader, game, track_id, car_id) VALUES ('s2',1,'Track','Car','acct:u2','iracing',10,20)").run();
const good = await sealTrace(env, plain, "l"), bad = await sealTrace(env, lap(900, 3), "l");
db.prepare("INSERT INTO laps (id, session_id, n, time, valid, trace, created) VALUES ('s2:1','s2',1,91.5,1,?,1)").run(good);
db.prepare("INSERT INTO laps (id, session_id, n, time, valid, trace, created) VALUES ('s2:2','s2',2,95.5,0,?,1)").run(bad);
db.prepare("INSERT INTO community_laps (id, user_id, car_id, track_id, time, created, game, trace) VALUES ('c2','u2',21,10,80,1,'iracing',?)").run(await ownTrace(env, good, "c"));
db.prepare("INSERT INTO community_laps (id, user_id, car_id, track_id, time, created, game) VALUES ('c3','u2',20,10,91.5,1,'iracing')").run();
await deleteAccount(env, "u2");
assert.equal(db.prepare("SELECT COUNT(*) n FROM laps WHERE session_id='s2'").get().n, 1, "the valid lap stays for the model");
assert.equal(await openData(env, good), plain, "with its telemetry");
await assert.rejects(openData(env, bad), "the lap that went took its telemetry");
const took = db.prepare("SELECT trace FROM community_laps WHERE id='c3'").get().trace;
assert.ok(/^r2:c\//.test(took) && (await openData(env, took)) === plain, "the shared lap that showed the account's lap keeps its own copy now");

// the laps of before move to the bucket: checked one by one
db.exec("DELETE FROM laps; DELETE FROM community_laps; DELETE FROM sessions; DELETE FROM app_state WHERE k='trace_move'");
db.prepare("INSERT INTO sessions (id, started, track, car, uploader, game) VALUES ('s3',1,'Track','Car','acct:u1','iracing')").run();
const olds = [plain, await sealData(env, lap(900, 4)), await sealData({ DATA_KEY: "another" }, plain), null, await sealData(env, lap(900, 5)), "not telemetry"];
olds.forEach((t, i) => db.prepare("INSERT INTO laps (id, session_id, n, time, valid, trace, created) VALUES (?,?,?,?,1,?,1)").run("s3:" + i, "s3", i + 1, 90 + i, t));
db.prepare("INSERT INTO community_laps (id, user_id, car_id, track_id, time, created, game, trace) VALUES ('c9','u1',20,10,90,1,'iracing',?)").run(olds[1]);
const before = db.prepare("SELECT id, trace FROM laps ORDER BY rowid").all();
const texts = [];
for (const r of before) { try { texts.push(r.trace == null ? null : await openData(env, r.trace)); } catch (e) { texts.push(undefined); } }
setOn(false);
assert.deepEqual(await moveTraces(env), { on: false }, "nothing moves while it is off");
setOn(true);
const first = await moveTraces(env, { limit: 2 });
assert.equal(first.moved, 2, "two a run when told so");
assert.equal(db.prepare("SELECT COUNT(*) n FROM laps WHERE substr(trace,1,3)='r2:'").get().n, 2);
const rest = await moveTraces(env, { limit: 50 });
assert.deepEqual([rest.moved, rest.bad], [2, 2], "the rest: one lap of the table, the leaderboard's, and two that do not open");
const after = db.prepare("SELECT id, trace FROM laps ORDER BY rowid").all();
for (let i = 0; i < after.length; i++) {
  if (texts[i] === null) assert.equal(after[i].trace, null, "a lap without telemetry stays so");
  else if (texts[i] === undefined || i === 5) assert.equal(after[i].trace, before[i].trace, "what does not open keeps what it has");
  else { assert.match(after[i].trace, /^r2:l\//); assert.equal(await openData(env, after[i].trace), texts[i], "the same telemetry, from the bucket"); }
}
assert.match(db.prepare("SELECT trace FROM community_laps WHERE id='c9'").get().trace, /^r2:c\//, "the leaderboard's laps too, under their own kind");
const n = objs.size;
assert.deepEqual(await moveTraces(env, { limit: 50 }), { on: true, moved: 0, bad: 0, skipped: 0 }, "both tables are through: nothing is read again");
// a lap that came in the old form since is found by the daily pass, a day later
db.prepare("INSERT INTO laps (id, session_id, n, time, valid, trace, created) VALUES ('s3:late','s3',9,88,1,?,1)").run(await sealData(env, plain));
assert.equal((await moveTraces(env, { limit: 50, daily: true })).moved, 0, "not within the same day");
const later = await moveTraces(env, { limit: 50, daily: true, now: Date.now() + 21 * 3600e3 });
assert.equal(later.moved, 1, "the daily pass a day later");
assert.equal(later.bad, 2, "the two that do not open are looked at again, and stay");
assert.equal(objs.size, n + 1, "one object more, none left behind by the laps that did not move");
// a row changed while its telemetry was on the way keeps its own
const stale = { rid: db.prepare("SELECT rowid AS r FROM laps WHERE id='s3:late'").get().r, trace: await sealData(env, plain) };
db.prepare("UPDATE laps SET trace=? WHERE id='s3:late'").run(stale.trace);
db.prepare("UPDATE laps SET trace=? WHERE id='s3:late'").run(await sealData(env, lap(900, 7)));
const m = objs.size;
assert.equal(await moveOne(env, "laps", stale), "skip", "the row holds something else now: left alone");
assert.equal(objs.size, m, "and the object made for it is gone");
// what came back from the bucket must be the same text, or the row is not touched
const real = TRACES.put;
TRACES.put = async (k, v) => { const b = new Uint8Array(v); b[b.length - 1] ^= 1; objs.set(k, b); };
const row = db.prepare("SELECT rowid AS rid, trace FROM laps WHERE id='s3:late'").get();
assert.equal(await moveOne(env, "laps", row), "bad", "an object that does not read back the same");
assert.equal(db.prepare("SELECT trace FROM laps WHERE id='s3:late'").get().trace, row.trace, "its row keeps the telemetry it had");
TRACES.put = real;
assert.equal(objs.size, m, "nothing left in the bucket");

// the whole way, as the PC and the apps use it: upload, read, send again, edit the incidents, delete
db.exec("DELETE FROM laps; DELETE FROM community_laps; DELETE FROM sessions");
objs.clear();
const wenv = { ...env, PITLANE_KEY: "owner-key-owner-key-owner-key" };
const call = async (method, path, body) => {
  const waits = [];
  const res = await worker.fetch(new Request("https://pitlanehq.app" + path, { method, headers: { authorization: "Bearer " + wenv.PITLANE_KEY, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }), wenv, { waitUntil: (pr) => waits.push(Promise.resolve(pr).catch(() => {})) });
  await Promise.all(waits);
  return { status: res.status, j: await res.json().catch(() => null) };
};
const up = { session: { id: "sess-w1", started: 1700000000000, track: "Track", car: "Car", kind: "Practice", game: "iracing" }, laps: [{ id: "sess-w1-1", n: 1, time: T, valid: true, trace: JSON.parse(plain) }, { id: "sess-w1-2", n: 2, time: T + 1, valid: false, trace: JSON.parse(lap(900, 8)) }] };
{ const r = await call("POST", "/api/upload", up); assert.equal(r.status, 200, "the PC's upload: " + JSON.stringify(r.j)); }
const rows = db.prepare("SELECT id, trace FROM laps WHERE session_id='sess-w1' ORDER BY n").all();
assert.ok(rows.length === 2 && rows.every((r) => /^r2:l\//.test(r.trace)), "each lap's row keeps where its telemetry is");
assert.equal(objs.size, 2, "one object a lap");
assert.ok(db.prepare("SELECT SUM(LENGTH(trace)) b FROM laps").get().b < 100, "and the database a few bytes of it");
const got = await call("GET", "/api/sessions/sess-w1?traces=1");
assert.deepEqual(got.j.laps.map((l) => l.trace && l.trace.d.length), [900, 900], "the analyzer gets every lap's telemetry");
assert.deepEqual(got.j.laps[0].trace, JSON.parse(plain), "the same telemetry the PC sent");
assert.deepEqual((await call("GET", "/api/laps/sess-w1-1")).j.trace, JSON.parse(plain), "one lap by itself");
assert.equal((await call("POST", "/api/upload", up)).status, 200, "the PC sends the same laps again");
assert.equal(objs.size, 2, "nothing new in the bucket");
assert.deepEqual(db.prepare("SELECT trace FROM laps WHERE session_id='sess-w1' ORDER BY n").all().map((r) => r.trace), rows.map((r) => r.trace), "the rows as they were");
// the incidents of a lap, sent later: its telemetry is written again with them, the object of before goes
assert.equal((await call("POST", "/api/sessions/sess-w1/incidents", { laps: [{ n: 1, inc: 2, at: [120, 2], k: ["off"] }] })).j.laps, 1);
const edited = db.prepare("SELECT trace, inc FROM laps WHERE id='sess-w1-1'").get();
assert.ok(edited.inc === 2 && edited.trace !== rows[0].trace && /^r2:l\//.test(edited.trace), "a new object");
assert.deepEqual(JSON.parse(await openData(env, edited.trace)).incK, ["off"], "with the incidents in it");
assert.equal(objs.size, 2, "the one of before left the bucket");
// a lap with a missing object does not take the session's answer with it
objs.delete(db.prepare("SELECT trace FROM laps WHERE id='sess-w1-2'").get().trace.slice(3));
const holed = await call("GET", "/api/sessions/sess-w1?traces=1");
assert.ok(holed.status === 200 && holed.j.laps[0].trace && holed.j.laps[1].trace === null, "the other laps still come");
assert.equal((await call("DELETE", "/api/sessions/sess-w1")).status, 200, "the driver deletes the session");
assert.equal(objs.size, 0, "its telemetry leaves the bucket");
// off: an upload is sealed into the row as it always was, and reads the same
setOn(false);
assert.equal((await call("POST", "/api/upload", { session: { ...up.session, id: "sess-w2" }, laps: [{ id: "sess-w2-1", n: 1, time: T, trace: JSON.parse(plain) }] })).status, 200);
assert.match(db.prepare("SELECT trace FROM laps WHERE id='sess-w2-1'").get().trace, /^enc:/, "off: in the row");
assert.deepEqual((await call("GET", "/api/sessions/sess-w2?traces=1")).j.laps[0].trace, JSON.parse(plain));
assert.equal(objs.size, 0);
// the move's own timed job, every minute: it moves the laps of before and runs nothing else
setOn(true);
db.exec("DELETE FROM app_state WHERE k='trace_move'");
const usage = () => db.prepare("SELECT route FROM d1_usage").all().map((r) => r.route).join();
await worker.scheduled({ cron: "* * * * *", scheduledTime: Date.now() }, wenv, { waitUntil: () => { throw new Error("the minute job starts nothing else"); } });
assert.match(db.prepare("SELECT trace FROM laps WHERE id='sess-w2-1'").get().trace, /^r2:l\//, "the lap sealed in its row a moment ago is in the bucket");
assert.deepEqual(JSON.parse(await openData(env, db.prepare("SELECT trace FROM laps WHERE id='sess-w2-1'").get().trace)), JSON.parse(plain), "the same telemetry");
assert.ok(usage().split(",").includes("cron 1 min"), "its reads counted under its own name");
assert.equal((await worker.scheduled({ cron: "* * * * *" }, { ...wenv, BETA: "1" }, {})), undefined, "never on the test version");
console.log("trace store: ok");
