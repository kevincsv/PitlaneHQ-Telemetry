// node cloud/test/anon.test.mjs: the coach learns from PCs without an account (anon.js): their sessions are kept under
// the install's own id with no name, move to the account when someone signs in there, are forgotten when the PC asks,
// and the ones nobody claimed are deleted after ANON_DAYS
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { DEV, ANON_DAYS, ANON_PER_DAY, LEARNERS, isLearner, tipAccount, uploaderOf, deviceOf, anonSession, anonCount, anonAdopt, anonForget, anonPrune } from "../src/anon.js";

const db = new DatabaseSync(":memory:");
const dir = new URL("../migrations/", import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
const stmt = (sql) => {
  const s = { args: [], bind(...a) { s.args = a; return s; },
    first: async () => db.prepare(sql).get(...s.args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...s.args) }),
    run: async () => { const r = db.prepare(sql).run(...s.args); return { meta: { changes: r.changes } }; } };
  return s;
};
const env = { DB: { prepare: stmt, batch: async (l) => { for (const x of l) await x.run(); } } };
const DAY = 86400e3, now = Date.now();
const dev = (id, hash) => db.prepare("INSERT INTO community_users (id, token_hash, alias, created) VALUES (?,?,?,?)").run(id, hash, "Driver", now);
const sess = (id, up, started) => {
  db.prepare("INSERT INTO sessions (id, started, track, car, uploader, game, track_id, car_id) VALUES (?,?,?,?,?,?,?,?)").run(id, started, "Spa", "GT3", up, "lmu", 5, 7);
  db.prepare("INSERT INTO laps (id, session_id, n, time, valid, created) VALUES (?,?,?,?,?,?)").run(id + "-1", id, 1, 120.5, 1, started);
};
const tip = (account, sid) => db.prepare("INSERT INTO coach_tips (account, game, track_id, car_id, session_id, started, n, apex, created) VALUES (?,?,?,?,?,?,?,?,?)").run(account, "lmu", 5, 7, sid, now, 1, 100, now);
const count = (sql, ...a) => db.prepare(sql).get(...a).n;

// names
assert.equal(isLearner("acct:a"), true); assert.equal(isLearner("dev:d"), true); assert.equal(isLearner("owner"), false);
assert.equal(tipAccount("acct:abc"), "abc"); assert.equal(tipAccount("dev:d1"), "dev:d1");
assert.equal(uploaderOf("abc"), "acct:abc"); assert.equal(uploaderOf("dev:d1"), "dev:d1");
assert.match(LEARNERS("s.uploader"), /acct:%.*dev:%/);

// only a PC's own token: never an account's row, a rival's or a guest's
dev("devone0001", "hash-one"); dev("o:rival", "hash-rival"); dev("guest-x", "hash-guest");
assert.equal((await deviceOf(env, "hash-one")).id, "devone0001");
assert.equal(await deviceOf(env, "hash-rival"), null);
assert.equal(await deviceOf(env, "hash-guest"), null);
assert.equal(await deviceOf(env, "nobody"), null);

// nothing that names the driver
assert.deepEqual(anonSession({ id: "s", driver: "Jane Doe", lic: "A 4.2", track: "Spa" }), { id: "s", driver: "", track: "Spa" });

// the daily limit
{
  const d = await deviceOf(env, "hash-one");
  assert.equal(await anonCount(env, d, 20), true);
  assert.equal((await deviceOf(env, "hash-one")).uploads, 20);
  assert.equal(await anonCount(env, { ...d, uploads_day: new Date().toISOString().slice(0, 10), uploads: ANON_PER_DAY }, 1), false);
}

// signing in on that PC: its sessions, laps and tips are the account's
sess("dev_devone0001:s1", DEV + "devone0001", now - DAY); sess("dev_devone0001:s2", DEV + "devone0001", now);
tip(DEV + "devone0001", "dev_devone0001:s1");
tip("acct9", "dev_devone0001:s2"); tip(DEV + "devone0001", "dev_devone0001:s2"); // the account's own tip on the same session stays
assert.equal(await anonAdopt(env, "devone0001", "acct9"), 2);
assert.equal(count("SELECT COUNT(*) AS n FROM sessions WHERE uploader='acct:acct9'"), 2);
assert.equal(count("SELECT COUNT(*) AS n FROM sessions WHERE uploader LIKE 'dev:%'"), 0);
assert.equal(count("SELECT COUNT(*) AS n FROM coach_tips WHERE account='acct9'"), 2);
assert.equal(count("SELECT COUNT(*) AS n FROM coach_tips WHERE account LIKE 'dev:%'"), 0);
assert.equal(count("SELECT COUNT(*) AS n FROM laps"), 2, "the laps came along");
assert.equal(await anonAdopt(env, "devone0001", "acct9"), 0, "nothing left to move");

// the PC asks for what it sent to be removed
dev("devtwo0002", "hash-two"); sess("dev_devtwo0002:s1", DEV + "devtwo0002", now); tip(DEV + "devtwo0002", "dev_devtwo0002:s1");
await anonForget(env, "devtwo0002");
assert.equal(count("SELECT COUNT(*) AS n FROM sessions WHERE uploader='dev:devtwo0002'"), 0);
assert.equal(count("SELECT COUNT(*) AS n FROM laps WHERE session_id LIKE 'dev_devtwo0002:%'"), 0);
assert.equal(count("SELECT COUNT(*) AS n FROM coach_tips WHERE account='dev:devtwo0002'"), 0);

// nobody signed in: gone after ANON_DAYS, an account's sessions never
sess("dev_old:s1", "dev:old", now - (ANON_DAYS + 1) * DAY); sess("dev_new:s1", "dev:new", now - (ANON_DAYS - 1) * DAY); sess("acct_a:old", "acct:a", now - 400 * DAY);
assert.equal(await anonPrune(env, now), 1);
assert.equal(count("SELECT COUNT(*) AS n FROM sessions WHERE id='dev_old:s1'"), 0);
assert.equal(count("SELECT COUNT(*) AS n FROM laps WHERE session_id='dev_old:s1'"), 0);
assert.equal(count("SELECT COUNT(*) AS n FROM sessions WHERE id IN ('dev_new:s1','acct_a:old')"), 2);

// the model and the server's coach read them, and a PC without an account only uploads
const src = (f) => readFileSync(new URL("../src/" + f, import.meta.url), "utf8");
assert.equal((src("model.js").match(/s\.uploader LIKE 'acct:%' OR s\.uploader LIKE 'dev:%'/g) || []).length, 2);
assert.match(src("coachlearn.js"), /s\.uploader LIKE 'acct:%' OR s\.uploader LIKE 'dev:%'/);
assert.match(src("worker.js"), /role === "device" && !\(p === "\/api\/upload" && m === "POST"\)/);
console.log("anon ok");

// a PC without an account never puts a lap on a leaderboard: POST /community/laps keeps it out (the privacy policy)
{
  const src = readFileSync(new URL("../src/community.js", import.meta.url), "utf8");
  const at = src.indexOf('if (p === "/laps" && m === "POST")');
  assert.ok(at > 0 && /if \(!u\.account && typeof body\.other !== "string"\) return json\(\{ kept:/.test(src.slice(at, at + 1200)), "no-account laps stay off the leaderboards");
}
console.log("anon: no-account laps stay off the leaderboards");
