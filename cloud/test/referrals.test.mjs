// node cloud/test/referrals.test.mjs: "Invite a friend" (referrals.js, migration 0100): a friend who signed up with a
// driver's code and used Pitlane HQ on 7 different days with a session driven gives both a month of Pro; during the beta
// the month is kept and starts when Pro is switched on; a friend on the inviter's own PC or connection is refused; a
// code is typed only by a new account, never one's own, and an inviter earns at most 12 months a year
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { register } from "node:module";
// the Worker imports JSON without import attributes (wrangler bundles it): node reads it as a module here
register("data:text/javascript," + encodeURIComponent(`import {readFile} from "node:fs/promises";export async function load(u,c,n){if(u.endsWith(".json"))return {format:"module",source:"export default "+await readFile(new URL(u),"utf8"),shortCircuit:true};return n(u,c)}`));
const { referralRoutes, refCheck, cleanCode, INV } = await import("../src/referrals.js");
const { proOf, proGateReset } = await import("../src/lemon.js");
const { sha256 } = await import("../src/accounts.js");

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
const env = { DB: { prepare: stmt, batch: async (l) => { for (const x of l) await x.run(); } }, DATA_KEY: "k", ADMINS: "" };
const DAY = 86400e3, now = Date.now();
const gate = (on) => db.prepare("INSERT INTO app_state (k, v, at) VALUES ('pro_gate', ?, 0) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(on ? "1" : "0");
let tok = 0;
const acct = async (id, created, verified = 1) => {
  db.prepare("INSERT INTO accounts (id, email_hash, auth_salt, auth_hash, wrapped_key, display, created, verified) VALUES (?,?,?,?,?,?,?,?)").run(id, "h" + id, "s", "h", "k", id, created, verified);
  db.prepare("INSERT INTO community_users (id, token_hash, alias, created) VALUES (?,?,?,?)").run(id, "acct:" + id, "N" + id, created);
  const t = "t".repeat(40) + (++tok);
  db.prepare("INSERT INTO account_sessions (id, account_id, token_hash, device, created, last_seen) VALUES (?,?,?,?,?,?)").run("s" + tok, id, await sha256(t), "PC", now, now);
  return t;
};
const call = async (t, p, m = "GET", body = {}, ip = "1.1.1.1") => {
  const r = await referralRoutes(new Request("https://x/community" + p, { method: m, headers: { authorization: "Bearer " + t, "cf-connecting-ip": ip } }), env, p, m, body);
  return { status: r.status, j: await r.json() };
};
const use = (id, created, days, drives = 1) => {
  for (let d = 0; d < days; d++) db.prepare("INSERT INTO usage_days (day, account_id, device, key, n) VALUES (?,?,?,?,?)").run(new Date(created + d * DAY).toISOString().slice(0, 10), id, "web", "home", 1);
  for (let d = 0; d < drives; d++) db.prepare("INSERT INTO sessions (id, track, car, started, uploader) VALUES (?,?,?,?,?)").run("ss" + id + d, "Spa", "GT3", created + d * DAY + 1000, "acct:" + id);
};
const acc = (id) => ({ ...db.prepare("SELECT ref_months, ref_pro_until FROM accounts WHERE id=?").get(id) });
const ref = (id) => db.prepare("SELECT * FROM referrals WHERE invitee=?").get(id);

gate(false);
const tA = await acct("aaaaaaaaaaaa", now - 100 * DAY);
const a = await call(tA, "/invite", "GET", {}, "9.9.9.9");
assert.equal(a.status, 200);
assert.match(a.j.code, /^[A-HJ-NP-Z2-9]{8}$/, "an 8-character code in capitals");
assert.equal(a.j.link, "https://pitlanehq.app/?ref=invite-" + a.j.code.toLowerCase());
assert.equal(a.j.canClaim, false, "an old account types no code");
assert.equal(cleanCode(a.j.link), a.j.code.toLowerCase(), "the link pasted reads as the code");

// a new friend types the code (any case); not their own, not twice
const created = now - 8 * DAY, tB = await acct("bbbbbbbbbbbb", created);
assert.equal((await call(tB, "/invite/claim", "POST", { code: "nope1234" }, "2.2.2.2")).status, 404);
const own = (await call(tB, "/invite", "GET", {}, "2.2.2.2")).j;
assert.equal(own.canClaim, true);
assert.equal((await call(tB, "/invite/claim", "POST", { code: own.code }, "2.2.2.2")).j.code, "self");
const c = await call(tB, "/invite/claim", "POST", { code: a.j.code.toLowerCase() }, "2.2.2.2");
assert.equal(c.status, 200); assert.equal(c.j.invitedBy.name, "Naaaaaaaaaaaa"); assert.equal(c.j.canClaim, false);
assert.equal((await call(tB, "/invite/claim", "POST", { code: a.j.code }, "2.2.2.2")).j.code, "already");
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM follows WHERE account_id IN ('aaaaaaaaaaaa','bbbbbbbbbbbb')").get().n, 2, "they follow each other");
// an old account cannot claim
assert.equal((await call(tA, "/invite/claim", "POST", { code: own.code })).j.code, "too_late");

// six days are not a week; the seventh is, and during the beta the month is kept
use("bbbbbbbbbbbb", created, 6);
await refCheck(env); assert.equal(ref("bbbbbbbbbbbb").state, "waiting");
const prog = (await call(tA, "/invite")).j.friends[0];
assert.deepEqual([prog.days, prog.drives, prog.state], [6, 1, "waiting"]);
use("bbbbbbbbbbbb", created + 6 * DAY, 1, 0);
await refCheck(env);
assert.equal(ref("bbbbbbbbbbbb").state, "given");
assert.deepEqual(acc("aaaaaaaaaaaa"), { ref_months: 1, ref_pro_until: 0 }); assert.deepEqual(acc("bbbbbbbbbbbb"), { ref_months: 1, ref_pro_until: 0 });
assert.equal((await call(tA, "/invite")).j.banked, 1);

// Pro switched on: the kept months start, once
gate(true); proGateReset();
await refCheck(env); await refCheck(env);
for (const id of ["aaaaaaaaaaaa", "bbbbbbbbbbbb"]) {
  const x = acc(id);
  assert.equal(x.ref_months, 0);
  assert.ok(Math.abs(x.ref_pro_until - (Date.now() + 30 * DAY)) < 60e3, "a month from now, given once");
  const p = proOf(db.prepare("SELECT * FROM accounts WHERE id=?").get(id));
  assert.equal(p.pro, true); assert.equal(p.proSrc, "invite");
}

// a friend on the inviter's own connection is the inviter: refused
const tC = await acct("cccccccccccc", created);
assert.equal((await call(tC, "/invite/claim", "POST", { code: a.j.code }, "9.9.9.9")).status, 200);
use("cccccccccccc", created, 7);
await refCheck(env);
assert.equal(ref("cccccccccccc").state, "refused");
assert.equal(acc("cccccccccccc").ref_pro_until, 0);

// with Pro on, a month goes straight on top of the one running
const tD = await acct("dddddddddddd", created);
await call(tD, "/invite/claim", "POST", { code: a.j.code }, "4.4.4.4");
use("dddddddddddd", created, 7);
const before = acc("aaaaaaaaaaaa").ref_pro_until;
await refCheck(env);
assert.equal(ref("dddddddddddd").state, "given");
assert.equal(acc("aaaaaaaaaaaa").ref_pro_until, before + 30 * DAY, "the months add up");

// no week of use in 60 days: expired
const tE = await acct("eeeeeeeeeeee", now - 13 * DAY);
await call(tE, "/invite/claim", "POST", { code: a.j.code }, "5.5.5.5");
db.prepare("UPDATE accounts SET created=? WHERE id='eeeeeeeeeeee'").run(now - 61 * DAY);
await refCheck(env);
assert.equal(ref("eeeeeeeeeeee").state, "expired");

// an inviter at the yearly limit: the friend gets the month, the inviter not
db.prepare("UPDATE referrals SET done=? WHERE state='given'").run(now);
for (let i = 0; i < INV.max; i++) db.prepare("INSERT INTO referrals (invitee, inviter, created, state, done) VALUES (?,?,?,?,?)").run("old" + i, "aaaaaaaaaaaa", now - 50 * DAY, "given", now - 10 * DAY);
const tF = await acct("ffffffffffff", created);
await call(tF, "/invite/claim", "POST", { code: a.j.code }, "6.6.6.6");
use("ffffffffffff", created, 7);
const aBefore = acc("aaaaaaaaaaaa").ref_pro_until;
await refCheck(env);
assert.equal(ref("ffffffffffff").state, "given"); assert.ok(ref("ffffffffffff").why);
assert.equal(acc("aaaaaaaaaaaa").ref_pro_until, aBefore);
assert.ok(acc("ffffffffffff").ref_pro_until > now);

// an unverified friend waits
const tG = await acct("gggggggggggg", created, 0);
await call(tG, "/invite/claim", "POST", { code: a.j.code }, "7.7.7.7");
use("gggggggggggg", created, 7);
await refCheck(env);
assert.equal(ref("gggggggggggg").state, "waiting");

console.log("referrals ok");
