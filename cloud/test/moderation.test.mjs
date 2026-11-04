// node cloud/test/moderation.test.mjs: reporting and blocking what drivers post (migration 0097, moderation.js): a report
// once per driver and post, emailed and waiting for the admins; a block hides the driver; the admins delete, reset or dismiss
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { moderationRoutes, blockedIds, maskBlocked, BLOCKED_NAME } from "../src/moderation.js";

const db = new DatabaseSync(":memory:");
const stmt = (sql) => {
  const s = { args: [], bind(...a) { s.args = a; return s; },
    first: async () => { const r = db.prepare(sql).get(...s.args); return r ? { ...r } : null; },
    all: async () => ({ results: db.prepare(sql).all(...s.args).map((x) => ({ ...x })) }),
    run: async () => db.prepare(sql).run(...s.args) };
  return s;
};
const env = { DB: { prepare: stmt, batch: async (q) => { for (const x of q) await x.run(); } } };
db.exec("CREATE TABLE accounts (id TEXT PRIMARY KEY, display TEXT, name_kind TEXT)");
db.exec("CREATE TABLE community_users (id TEXT PRIMARY KEY, alias TEXT)");
db.exec("CREATE TABLE leagues (id TEXT PRIMARY KEY, owner TEXT, name TEXT, about TEXT, discord TEXT, web TEXT, cars TEXT)");
db.exec("CREATE TABLE league_hits (league_id TEXT)"); db.exec("CREATE TABLE league_days (league_id TEXT)");
db.exec("CREATE TABLE discord_links (account_id TEXT, shown INTEGER)");
db.exec(readFileSync(new URL("../migrations/0097_content_reports.sql", import.meta.url), "utf8"));
db.exec("INSERT INTO accounts (id, display) VALUES ('boss','Boss'), ('anaxx','Ana'), ('bobxx','Bad Name')");
db.exec("INSERT INTO community_users (id, alias) VALUES ('boss','Boss'), ('anaxx','Ana'), ('bobxx','Bad Name')");
db.exec("INSERT INTO leagues VALUES ('lg0001','bobxx','Spam League','buy now','https://discord.gg/abc','','GT3')");
db.exec("INSERT INTO discord_links VALUES ('bobxx', 1)");

const mails = [];
const deps = {
  sessionAccount: async (req) => { const t = req.headers.get("authorization"); return t ? db.prepare("SELECT * FROM accounts WHERE id=?").get(t.slice(7)) || null : null; },
  isAdmin: (e, id) => id === "boss", mail: async (e, r) => { mails.push(r); },
};
const call = async (method, p, body, who) => {
  const h = { "content-type": "application/json" }; if (who) h.authorization = "Bearer " + who;
  const r = await moderationRoutes(new Request("https://pitlanehq.app/community" + p, { method, headers: h }), env, p, method, body || {}, deps, 1000);
  return r && { status: r.status, body: await r.json() };
};

assert.equal(await call("GET", "/leagues", null, "anaxx"), null, "other paths go on");
assert.equal((await call("POST", "/report", { kind: "league", target: "lg0001", reason: "spam" })).status, 401);
assert.equal((await call("POST", "/report", { kind: "league", target: "lg0001", reason: "spam" }, "bobxx")).status, 400, "not your own");
assert.equal((await call("POST", "/report", { kind: "nope", target: "lg0001" }, "anaxx")).status, 400);
assert.equal((await call("POST", "/report", { kind: "league", target: "zzzz99" }, "anaxx")).status, 404);
assert.deepEqual((await call("POST", "/report", { kind: "league", target: "lg0001", reason: "spam", note: "ads" }, "anaxx")).body, { ok: true, reported: true });
assert.equal(mails.length, 1); assert.equal(mails[0].snapshot.name, "Spam League"); assert.equal(mails[0].owner, "bobxx");
await call("POST", "/report", { kind: "league", target: "lg0001", reason: "spam" }, "anaxx");
assert.equal(mails.length, 1, "once per driver and post");
assert.equal((await call("POST", "/report", { kind: "driver", target: "bobxx", reason: "offensive" }, "anaxx")).status, 200);

// blocks
assert.equal((await call("POST", "/blocks", { id: "anaxx", block: true }, "anaxx")).status, 400, "not yourself");
assert.deepEqual((await call("POST", "/blocks", { league: "lg0001", block: true }, "anaxx")).body, { ok: true, blocked: true });
assert.deepEqual((await call("GET", "/blocks", null, "anaxx")).body.blocks.map((x) => [x.id, x.name]), [["bobxx", "Bad Name"]]);
const bl = await blockedIds(env, "anaxx");
assert.ok(bl.has("bobxx"));
assert.deepEqual(maskBlocked([{ uid: "bobxx", alias: "Bad Name", prof: 1 }, { uid: "c", alias: "C", prof: 1 }], bl).map((x) => [x.alias, x.prof]), [[BLOCKED_NAME, 0], ["C", 1]]);
assert.equal((await blockedIds(env, null)).size, 0);
await call("POST", "/blocks", { id: "bobxx", block: false }, "anaxx");
assert.equal((await blockedIds(env, "anaxx")).size, 0, "unblocked");

// the admins
assert.equal((await call("GET", "/admin/content-reports", null, "anaxx")).status, 403);
const open = (await call("GET", "/admin/content-reports", null, "boss")).body;
assert.equal(open.open, 2); assert.equal(open.items.length, 2);
const lgRep = open.items.find((x) => x.kind === "league"), drRep = open.items.find((x) => x.kind === "driver");
assert.equal(lgRep.snapshot.about, "buy now"); assert.equal(lgRep.reporterName, "Ana");
assert.equal((await call("POST", "/admin/content-reports", { id: drRep.id, action: "delete" }, "boss")).status, 400, "a driver is not deleted");
assert.equal((await call("POST", "/admin/content-reports", { id: lgRep.id, action: "delete" }, "boss")).status, 200);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM leagues").get().n, 0, "the post is gone");
assert.equal((await call("POST", "/admin/content-reports", { id: drRep.id, action: "reset" }, "boss")).status, 200);
assert.equal(db.prepare("SELECT alias FROM community_users WHERE id='bobxx'").get().alias, "Driver");
assert.equal(db.prepare("SELECT shown FROM discord_links WHERE account_id='bobxx'").get().shown, 0);
assert.equal((await call("GET", "/admin/content-reports", null, "boss")).body.open, 0, "dealt with");
console.log("moderation ok");
