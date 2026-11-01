// node cloud/test/testask.test.mjs: asking to test what is in development (migration 0094, testask.js): a driver asks once,
// every admin hears it, an admin says yes (the tester level, and the driver hears it) or no (not asked again)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { testAskRoutes } from "../src/testask.js";

const db = new DatabaseSync(":memory:");
const stmt = (sql) => {
  const s = { args: [], bind(...a) { s.args = a; return s; },
    first: async () => { const r = db.prepare(sql).get(...s.args); return r ? { ...r } : null; },
    all: async () => ({ results: db.prepare(sql).all(...s.args).map((x) => ({ ...x })) }),
    run: async () => db.prepare(sql).run(...s.args) };
  return s;
};
const env = { DB: { prepare: stmt }, ADMINS: "boss" };
db.exec("CREATE TABLE accounts (id TEXT PRIMARY KEY, display TEXT)");
db.exec(readFileSync(new URL("../migrations/0086_testers.sql", import.meta.url), "utf8"));
db.exec(readFileSync(new URL("../migrations/0094_test_ask.sql", import.meta.url), "utf8"));
db.exec("INSERT INTO accounts (id, display) VALUES ('boss','Boss'), ('ana','Ana'), ('bo','Bo'), ('cy','Cy')");
db.exec("UPDATE accounts SET tester=1 WHERE id='cy'");

const alerts = [], told = [];
const deps = {
  sessionAccount: async (req) => { const t = req.headers.get("authorization"); return t ? db.prepare("SELECT * FROM accounts WHERE id=?").get(t.slice(7)) || null : null; },
  isAdmin: (e, id) => id === "boss", isTester: (e, id, row) => !!(row && row.tester),
  testerAlert: async (e, id) => { told.push(id); }, testAskAlert: async (e, admins, data) => { alerts.push({ admins, data }); },
};
const call = async (method, p, body, who) => {
  const h = { "content-type": "application/json" }; if (who) h.authorization = "Bearer " + who;
  const req = new Request("https://pitlanehq.app/community" + p, { method, headers: h, body: body == null ? undefined : JSON.stringify(body) });
  const r = await testAskRoutes(req, env, p, method, body || {}, deps, 5000);
  return r && { status: r.status, body: await r.json() };
};

assert.equal(await call("GET", "/other", null, "ana"), null, "other paths go on");
assert.equal((await call("POST", "/tester/ask", { what: "acc" })).status, 401);
assert.deepEqual((await call("GET", "/tester/ask", null, "ana")).body, { asked: false, tester: false });
assert.deepEqual((await call("POST", "/tester/ask", { what: "acc" }, "ana")).body, { ok: true, asked: true });
assert.equal(alerts.length, 1); assert.deepEqual(alerts[0], { admins: ["boss"], data: { account: "ana", name: "Ana", what: "acc" } });
await call("POST", "/tester/ask", { what: "leagues" }, "ana");
assert.equal(alerts.length, 1, "asking again tells the admins once");
assert.equal((await call("GET", "/tester/ask", null, "ana")).body.asked, true);
assert.deepEqual((await call("POST", "/tester/ask", { what: "acc" }, "cy")).body, { ok: true, tester: true }, "a tester need not ask");
await call("POST", "/tester/ask", { what: "<x>" }, "bo");
assert.equal(alerts[1].data.what, "general", "an unknown place is general");

// the admin's side
assert.equal((await call("GET", "/admin/test-asks", null, "ana")).status, 403);
assert.equal((await call("GET", "/tester/ask", null, "boss")).body.pending, 2);
const items = (await call("GET", "/admin/test-asks", null, "boss")).body.items;
assert.deepEqual(items.map((x) => x.id).sort(), ["ana", "bo"]);
assert.deepEqual((await call("POST", "/admin/test-asks", { id: "ana", yes: true }, "boss")).body, { ok: true, tester: true });
assert.deepEqual(told, ["ana"], "the new tester hears it");
assert.equal(db.prepare("SELECT tester FROM accounts WHERE id='ana'").get().tester, 1);
assert.deepEqual((await call("POST", "/admin/test-asks", { id: "bo", yes: false }, "boss")).body, { ok: true, tester: false });
assert.equal((await call("POST", "/admin/test-asks", { id: "bo", yes: true }, "boss")).status, 404, "answered once");
assert.equal((await call("GET", "/tester/ask", null, "boss")).body.pending, 0);
assert.equal((await call("GET", "/tester/ask", null, "bo")).body.asked, true, "a no still reads as asked");
await call("POST", "/tester/ask", { what: "acc" }, "bo");
assert.equal(alerts.length, 2, "a driver told no does not ask again");
console.log("testask ok");
