// node cloud/test/tryout.test.mjs: trying Pitlane HQ without an account (tryout.js): the server counts a PC's sessions
// by its hash, the same session once, keeps a few rows at most, and an admin's PC starts again
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { TRY_LIMIT, tryoutRoutes, tryReset, tryUsed } from "../src/tryout.js";

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
console.log("tryout ok");
