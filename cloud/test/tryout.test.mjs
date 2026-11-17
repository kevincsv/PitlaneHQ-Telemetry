// node cloud/test/tryout.test.mjs: trying Pitlane HQ without an account (tryout.js): the server counts a PC's sessions
// by its hash, the same session once, keeps a few rows at most, and an admin's PC starts again
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { TRY_LIMIT, tryoutRoutes, tryReset, tryUsed, tryoutsOf, SQL_TRY_ROWS, SQL_TRY_SESSIONS } from "../src/tryout.js";

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
const env = { DB: { prepare: stmt } };
const pc = "0123456789abcdef0123456789abcdef";
const call = async (m, body, q = "") => {
  const r = await tryoutRoutes(env, "/tryout", m, body || {}, new URL("https://x/community/tryout" + q));
  return { status: r.status, ...(await r.json()) };
};

assert.equal(TRY_LIMIT, 3);
assert.equal(await tryoutRoutes(env, "/other", "GET", {}, new URL("https://x/")), null);
assert.equal((await call("GET", null, "?pc=nothex")).status, 400);
assert.equal((await call("POST", { pc, session: "" })).status, 400);
assert.deepEqual(await call("GET", null, "?pc=" + pc), { status: 200, used: 0, limit: 3 });
assert.equal((await call("POST", { pc, session: "ir-1" })).used, 1);
assert.equal((await call("POST", { pc, session: "ir-1" })).used, 1, "the same session counts once");
assert.equal((await call("POST", { pc, session: "lmu-2" })).used, 2);
assert.equal((await call("GET", null, "?pc=" + pc)).used, 2, "a new install reads what this PC used");
for (let i = 0; i < 20; i++) await call("POST", { pc, session: "s" + i });
assert.equal(await tryUsed(env, pc), 10, "a few rows a PC at most");
await tryReset(env, "nothex");
assert.equal(await tryUsed(env, pc), 10);
await tryReset(env, pc);
assert.equal(await tryUsed(env, pc), 0, "an admin's PC starts again");

// the admin Analytics' "Tried without an account": each PC with what it drove, and whether it signed up after
{
  const t0 = 1_000_000, a = "a".repeat(32), b = "b".repeat(32), c = "c".repeat(32);
  const ins = db.prepare("INSERT INTO tryout_pcs (pc, session, at) VALUES (?,?,?)");
  for (const [pc, s, at] of [[a, "t-1", t0 + 10], [a, "t-2", t0 + 20], [a, "t-3", t0 + 30], [b, "t-4", t0 + 40], [c, "t-old", t0 - 5]]) ins.run(pc, s, at);
  const ses = db.prepare("INSERT INTO sessions (id, started, track, car, uploader, game, laps) VALUES (?,?,?,?,?,?,?)");
  ses.run("dev_x:t-1", t0, "Spa", "GT3", "acct:acc1", "lmu", 5);
  ses.run("dev_x:t-2", t0, "Monza", "LMP2", "acct:acc1", "lmu", 3);
  ses.run("dev_y:t-4", t0, "Daytona", "NASCAR", "dev:y", "iracing", 7);
  ses.run("acct_z:t-4", t0, "Nope", "Nope", "acct:z", "iracing", 99); // not a PC without an account
  const rows = db.prepare(SQL_TRY_ROWS).all(t0), sessions = db.prepare(SQL_TRY_SESSIONS).all(t0 - 3600e3);
  assert.equal(sessions.length, 3, "only the sessions a PC uploaded with its own token");
  const y = tryoutsOf({ t0, rows, sessions });
  assert.equal(y.pcs, 2, "a PC that last drove before the days asked is left out");
  assert.equal(y.hit, 1); assert.equal(y.signedUp, 1); assert.equal(y.laps, 15); assert.equal(y.limit, TRY_LIMIT);
  assert.deepEqual(y.list.map((x) => x.pc), ["bbbbbb", "aaaaaa"], "newest first, a short id and no whole hash");
  const pa = y.list[1];
  assert.equal(pa.used, 3); assert.equal(pa.hit, true); assert.equal(pa.signedUp, true);
  assert.deepEqual(pa.sessions.map((s) => s.track), ["Spa", "Monza", ""], "a session it uploaded nothing of stays, empty");
  assert.deepEqual(y.list[0].games, ["iracing"]); assert.equal(y.list[0].signedUp, false);
}
console.log("tryout ok");
