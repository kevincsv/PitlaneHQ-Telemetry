// node cloud/test/team.test.mjs: team mode (team.js, migration 0101, docs/spec/team.md): create and join with the invite's
// proof (a wrong one 403, a full team 409), leave (the owner's team passes to the oldest member, the last one deletes it),
// remove and rename by the owner only, the log's upsert and its pruning (30 days, 300 a team), deleting an account; and
// the team's live room (live.js): members only, one PC per account, each PC's messages to the viewers with whose they
// are, the viewers' to every PC, the old rooms unchanged
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { register } from "node:module";
// the Worker imports JSON without import attributes, and live.js the Workers runtime: stand-ins for node
register("data:text/javascript," + encodeURIComponent(`import {readFile} from "node:fs/promises";
export async function resolve(s,c,n){if(s==="cloudflare:workers")return {url:"data:text/javascript,export class DurableObject{constructor(ctx,env){this.ctx=ctx;this.env=env}}",shortCircuit:true};return n(s,c)}
export async function load(u,c,n){if(u.endsWith(".json"))return {format:"module",source:"export default "+await readFile(new URL(u),"utf8"),shortCircuit:true};return n(u,c)}`));
const { teamRoute, teamRoomMember, TEAM } = await import("../src/team.js");
const { sha256, deleteAccount } = await import("../src/accounts.js");

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
const kicks = [];
const env = {
  DB: { prepare: stmt, batch: async (l) => { for (const x of l) await x.run(); } },
  LIVE: { idFromName: (n) => n, get: (id) => ({ fetch: async (r) => { kicks.push([id, r.headers.get("x-live-kick")]); return new Response(null, { status: 204 }); } }) },
};
const now = Date.now();
let tok = 0, joinedAt = now - 1000;
const tokens = {};
const acct = async (id, display) => {
  db.prepare("INSERT INTO accounts (id, email_hash, auth_salt, auth_hash, wrapped_key, display, created, verified) VALUES (?,?,?,?,?,?,?,1)").run(id, "h" + id, "s", "h", "k", display, now);
  const t = "t".repeat(40) + (++tok);
  db.prepare("INSERT INTO account_sessions (id, account_id, token_hash, device, created, last_seen) VALUES (?,?,?,?,?,?)").run("s" + tok, id, await sha256(t), "PC", now, now);
  tokens[id] = t;
};
const call = async (who, p, m = "GET", body) => {
  const r = await teamRoute(new Request("https://x" + p, { method: m, headers: who ? { authorization: "Bearer " + tokens[who] } : {}, body: body ? JSON.stringify(body) : undefined }), env, new URL("https://x" + p));
  return { status: r.status, j: await r.json() };
};
const hex = (n, c = "a") => c.repeat(n);
const SEALED = "QUJDREVGR0hJSktMTU5PUFFSU1RVVldY";
for (const [id, n] of [["owner1", "Ana"], ["mate2", "Ben"], ["mate3", "Caro"], ["out4", "Dan"]]) await acct(id, n);

assert.equal(await teamRoute(new Request("https://x/teams"), env, new URL("https://x/teams")), null, "not a team route");
assert.equal((await call(null, "/team")).status, 401, "signed in only");
assert.deepEqual((await call("owner1", "/team")).j, { teams: [] });

// create
const room = hex(32, "b"), join = hex(64, "c");
assert.equal((await call("owner1", "/team/create", "POST", { name: "x", room, join, sealed: SEALED })).status, 400, "a name of 2 characters at least");
assert.equal((await call("owner1", "/team/create", "POST", { name: "Night Owls", room: "zz", join, sealed: SEALED })).status, 400, "the room is 32 hex");
assert.equal((await call("owner1", "/team/create", "POST", { name: "Night Owls", room, join: "c", sealed: SEALED })).status, 400, "the join proof is 64 hex");
assert.equal((await call("owner1", "/team/create", "POST", { name: "Night Owls", room, join, sealed: "A".repeat(600) })).status, 400, "the sealed copy is short");
const c = await call("owner1", "/team/create", "POST", { name: "  Night   Owls ", room, join, sealed: SEALED });
assert.equal(c.status, 200);
const id = c.j.id;
assert.match(id, /^[0-9a-f]{12}$/);
assert.equal(db.prepare("SELECT join_hash FROM teams WHERE id=?").get(id).join_hash !== join, true, "only a hash of the join proof is kept");
assert.equal((await call("mate2", "/team/create", "POST", { name: "Copy", room, join, sealed: SEALED })).status, 409, "a room is one team");

// join
assert.equal((await call("mate2", "/team/join", "POST", { id, join: hex(64, "d"), sealed: SEALED })).status, 403, "a wrong join proof");
assert.equal((await call("mate2", "/team/join", "POST", { id: "ffffffffffff", join, sealed: SEALED })).status, 404, "no such team");
const fix = (acc, t) => db.prepare("UPDATE team_members SET joined=? WHERE account=?").run(t, acc);
fix("owner1", joinedAt);
assert.deepEqual((await call("mate2", "/team/join", "POST", { id, join, sealed: SEALED })).j, { id, name: "Night Owls" });
fix("mate2", joinedAt + 10);
assert.equal((await call("mate2", "/team/join", "POST", { id, join, sealed: SEALED + "AA" })).status, 200, "joining twice is once");
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM team_members WHERE team=?").get(id).n, 2);
await call("mate3", "/team/join", "POST", { id, join, sealed: SEALED });
fix("mate3", joinedAt + 20);
// full: 12 members
for (let i = 0; i < 9; i++) db.prepare("INSERT INTO team_members (team, account, role, sealed, joined) VALUES (?,?,?,?,?)").run(id, "filler" + i, "member", SEALED, joinedAt + 100 + i);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM team_members WHERE team=?").get(id).n, TEAM.members);
assert.equal((await call("out4", "/team/join", "POST", { id, join, sealed: SEALED })).status, 409, "a full team");
db.prepare("DELETE FROM team_members WHERE account LIKE 'filler%'").run();

// the list
const l = (await call("mate2", "/team")).j.teams;
assert.equal(l.length, 1);
assert.equal(l[0].role, "member");
assert.equal(l[0].owner, "owner1");
assert.equal(l[0].sealed, SEALED + "AA");
assert.deepEqual(l[0].members.map((m) => [m.id, m.name, m.role]), [["owner1", "Ana", "owner"], ["mate2", "Ben", "member"], ["mate3", "Caro", "member"]]);

// the owner's routes
assert.equal((await call("mate2", "/team/rename", "POST", { id, name: "Mine" })).status, 403, "only the owner renames");
assert.equal((await call("owner1", "/team/rename", "POST", { id, name: "N" })).status, 400);
assert.deepEqual((await call("owner1", "/team/rename", "POST", { id, name: "Day Owls" })).j, { ok: true });
assert.equal((await call("mate2", "/team/remove", "POST", { id, member: "mate3" })).status, 403, "only the owner removes");
assert.equal((await call("owner1", "/team/remove", "POST", { id, member: "owner1" })).status, 400, "not yourself");
assert.equal((await call("owner1", "/team/remove", "POST", { id, member: "out4" })).status, 404);
assert.equal((await call("out4", "/team/log?id=" + id)).status, 403, "members only");

// the log
assert.deepEqual((await call("mate2", "/team/log", "POST", { id, key: "s1|100", sealed: SEALED })).j, { ok: true });
await call("mate2", "/team/log", "POST", { id, key: "s1|100", sealed: SEALED + "BB" });
await call("mate3", "/team/log", "POST", { id, key: "s1|100", sealed: SEALED });
assert.equal((await call("mate2", "/team/log", "POST", { id, key: "", sealed: SEALED })).status, 400, "a key");
assert.equal((await call("mate2", "/team/log", "POST", { id, key: "k".repeat(81), sealed: SEALED })).status, 400, "a short key");
assert.equal((await call("mate2", "/team/log", "POST", { id, key: "big", sealed: "A".repeat(TEAM.logBytes + 4) })).status, 413, "at most 48 KB");
assert.equal((await call("out4", "/team/log", "POST", { id, key: "x", sealed: SEALED })).status, 403, "members only");
let log = (await call("owner1", "/team/log?id=" + id)).j.log;
assert.equal(log.length, 2, "one entry per member and key");
assert.deepEqual(log.find((e) => e.account === "mate2") && [log.find((e) => e.account === "mate2").name, log.find((e) => e.account === "mate2").sealed], ["Ben", SEALED + "BB"]);
// pruning: older than 30 days goes, and at most 300 a team
db.prepare("INSERT INTO team_log (team, account, key, at, sealed) VALUES (?,?,?,?,?)").run(id, "mate2", "old", now - 31 * 86400e3, SEALED);
for (let i = 0; i < 305; i++) db.prepare("INSERT INTO team_log (team, account, key, at, sealed) VALUES (?,?,?,?,?)").run(id, "mate3", "k" + i, now - 1e6 + i, SEALED);
await call("mate2", "/team/log", "POST", { id, key: "s2|200", sealed: SEALED });
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM team_log WHERE team=?").get(id).n, TEAM.logMax, "300 a team");
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM team_log WHERE key='old'").get().n, 0, "30 days");
assert.ok(db.prepare("SELECT 1 FROM team_log WHERE key='s2|200'").get(), "the newest stays");
log = (await call("owner1", "/team/log?id=" + id)).j.log;
assert.equal(log.length, 300);
assert.equal(log[0].key, "s2|200", "newest first");
assert.equal((await call("owner1", "/team/log?id=" + id + "&since=" + (now - 1e6 + 300))).j.log.length, 7, "since: the 4 newest of the 305, s2 and the two s1");

// remove: out of the team and out of its live room
kicks.length = 0;
assert.deepEqual((await call("owner1", "/team/remove", "POST", { id, member: "mate3" })).j, { ok: true });
assert.deepEqual(kicks, [["team:" + room, "mate3"]]);
assert.equal((await call("mate3", "/team")).j.teams.length, 0);
assert.ok(!(await teamRoomMember(env, room, "mate3")));
assert.ok(await teamRoomMember(env, room, "mate2"));
assert.ok(!(await teamRoomMember(env, "nothex", "mate2")));

// leave: the owner's team passes to the oldest member; the last one deletes it with its log
await call("mate3", "/team/join", "POST", { id, join, sealed: SEALED });
fix("mate3", joinedAt + 30);
assert.deepEqual((await call("owner1", "/team/leave", "POST", { id })).j, { ok: true });
const t2 = (await call("mate2", "/team")).j.teams[0];
assert.equal(t2.owner, "mate2", "the oldest member owns it now");
assert.equal(t2.role, "owner");
assert.equal(t2.name, "Day Owls");
await call("mate3", "/team/leave", "POST", { id });
assert.equal((await call("mate2", "/team")).j.teams[0].owner, "mate2");
await call("mate2", "/team/leave", "POST", { id });
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM teams WHERE id=?").get(id).n, 0, "the last one deletes the team");
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM team_log WHERE team=?").get(id).n, 0, "and its log");

// at most 5 teams an account
for (let i = 0; i < 5; i++) assert.equal((await call("out4", "/team/create", "POST", { name: "T" + i + "x", room: String(i).repeat(32), join, sealed: SEALED })).status, 200);
assert.equal((await call("out4", "/team/create", "POST", { name: "Sixth", room: "9".repeat(32), join, sealed: SEALED })).status, 409, "5 teams");

// deleting an account: its memberships and log entries go; its team passes on; a team of its own alone goes
const t5 = (await call("out4", "/team")).j.teams[0].id;
await call("mate2", "/team/join", "POST", { id: t5, join, sealed: SEALED });
await call("out4", "/team/log", "POST", { id: t5, key: "a", sealed: SEALED });
await call("mate2", "/team/log", "POST", { id: t5, key: "b", sealed: SEALED });
await deleteAccount(env, "out4");
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM team_members WHERE account='out4'").get().n, 0);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM team_log WHERE account='out4'").get().n, 0);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM teams").get().n, 1, "the four teams of its own are gone");
assert.equal(db.prepare("SELECT owner FROM teams WHERE id=?").get(t5).owner, "mate2");
assert.equal(db.prepare("SELECT role FROM team_members WHERE team=? AND account='mate2'").get(t5).role, "owner");
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM team_log WHERE team=?").get(t5).n, 1, "the others' stints stay");

// ---- the live room (live.js) ----
const R0 = globalThis.Response;
globalThis.Response = class extends R0 {
  constructor(b, i) {
    if (i && i.status === 101) { super(null, { status: 200 }); Object.defineProperty(this, "status", { value: 101 }); this.webSocket = i.webSocket; }
    else super(b, i);
  }
};
const mkws = () => ({ readyState: 1, sent: [], att: null, send(m) { this.sent.push(m); }, close(c) { this.readyState = 2; this.code = c; },
  serializeAttachment(a) { this.att = structuredClone(a); }, deserializeAttachment() { return this.att; } });
globalThis.WebSocketRequestResponsePair = class {};
let lastServer = null;
globalThis.WebSocketPair = class { constructor() { lastServer = mkws(); return { 0: mkws(), 1: lastServer }; } };
const { live, LiveRoom } = await import("../src/live.js");
const room2 = hex(32, "e");
await call("owner1", "/team/create", "POST", { name: "Racers", room: room2, join, sealed: SEALED });
const tid = db.prepare("SELECT id FROM teams WHERE room=?").get(room2).id;
await call("mate2", "/team/join", "POST", { id: tid, join, sealed: SEALED });

// the worker's side: members only, the room "team:" + room, who it is in the headers
let to = null;
const lenv = { DB: env.DB, LIVE: { idFromName: (n) => n, get: (n) => ({ fetch: async (r) => { to = { n, h: r.headers }; return new R0("ok"); } }) } };
const wsReq = (who, q, extra = {}) => new Request("https://x/live?" + q, { headers: { upgrade: "websocket", ...(who ? { authorization: "Bearer " + tokens[who] } : {}), ...extra } });
assert.equal((await live(wsReq("mate3", "role=view&team=" + room2), lenv)).status, 403, "not a member");
assert.equal((await live(wsReq(null, "role=view&team=" + room2), lenv)).status, 401, "signed in only");
assert.equal((await live(wsReq("mate2", "role=view&team=xyz"), lenv)).status, 400);
await live(wsReq("mate2", "role=pc&team=" + room2, { "x-live-kick": "owner1", "x-live-acct": "owner1" }), lenv);
assert.equal(to.n, "team:" + room2);
assert.equal(to.h.get("x-live-team"), "1");
assert.equal(to.h.get("x-live-acct"), "mate2");
assert.equal(decodeURIComponent(to.h.get("x-live-name")), "Ben");
assert.equal(to.h.get("x-live-kick"), null, "only the worker kicks");
await live(wsReq("mate2", "role=pc", { "x-live-acct": "owner1", "x-live-team": "1" }), lenv);
assert.equal(to.n, "mate2", "the account's own room as before");
assert.equal(to.h.get("x-live-team"), null);
assert.equal(to.h.get("x-live-acct"), null, "nobody names themselves into a room");

// the room itself
const mkctx = () => {
  const all = [];
  return { all, setWebSocketAutoResponse() {}, getWebSockets: (tag) => all.filter((w) => !tag || w.tags.includes(tag)), getTags: (w) => w.tags,
    acceptWebSocket(w, tags) { w.tags = tags; all.push(w); } };
};
const ctl = (w, k) => w.sent.filter((m) => m.startsWith("{")).map((m) => JSON.parse(m)).filter((m) => m.ctl === k).pop();
const join2 = async (lr, role, acct, name) => {
  const r = await lr.fetch(new Request("https://x/live", { headers: { "x-live-role": role, "x-live-team": "1", "x-live-acct": acct, "x-live-name": encodeURIComponent(name) } }));
  return r.status === 101 ? lastServer : r;
};
const ctx = mkctx(), lr = new LiveRoom(ctx, {});
const v1 = await join2(lr, "view", "owner1", "Ana");
assert.deepEqual(ctl(v1, "pcs"), { ctl: "pcs", list: [] });
const pcA = await join2(lr, "pc", "owner1", "Ana");
const pcB = await join2(lr, "pc", "mate2", "Bén");
assert.deepEqual(pcA.tags, ["pc", "owner1"]);
assert.deepEqual(pcB.att, { team: 1, acct: "mate2", name: "Bén" });
assert.deepEqual(ctl(v1, "pcs").list, [{ id: "owner1", name: "Ana" }, { id: "mate2", name: "Bén" }]);
assert.deepEqual(ctl(v1, "pc"), { ctl: "pc", on: true });
assert.deepEqual(ctl(pcB, "viewers"), { ctl: "viewers", n: 1 });
await lr.webSocketMessage(pcB, "e:abc");
assert.equal(v1.sent.pop(), "f:mate2:e:abc", "a PC's message says whose it is");
assert.ok(!pcA.sent.includes("e:abc") && !pcA.sent.some((m) => m.includes("abc")), "never to the other PCs");
await lr.webSocketMessage(v1, "e:hello");
assert.equal(pcA.sent.pop(), "e:hello");
assert.equal(pcB.sent.pop(), "e:hello", "a viewer's message to every PC");
await lr.webSocketMessage(pcB, "x:plain");
assert.ok(!v1.sent.includes("f:mate2:x:plain"), "only sealed messages");
// the same account's new PC replaces its old one
const pcB2 = await join2(lr, "pc", "mate2", "Ben");
assert.equal(pcB.code, 4000);
assert.equal(pcA.readyState, 1, "another account's PC stays");
assert.deepEqual(ctl(v1, "pcs").list.map((x) => x.id), ["owner1", "mate2"]);
// up to 12 PCs, 16 viewers
for (let i = 0; i < 10; i++) await join2(lr, "pc", "p" + i, "P");
assert.equal((await join2(lr, "pc", "p99", "P")).status, 429, "12 PCs");
for (let i = 0; i < 15; i++) await join2(lr, "view", "v" + i, "V");
assert.equal((await join2(lr, "view", "v99", "V")).status, 429, "16 viewers");
// a PC goes: the viewers are told
pcA.readyState = 3;
await lr.webSocketClose(pcA, 1006);
assert.ok(!ctl(v1, "pcs").list.some((x) => x.id === "owner1"));
// a kicked member is out at once
await lr.fetch(new Request("https://x/kick", { headers: { "x-live-kick": "mate2" } }));
assert.equal(pcB2.code, 4003);
assert.ok(!ctl(v1, "pcs").list.some((x) => x.id === "mate2"));

// an account's own room is as before: one PC, its messages unchanged, no attachment
const ctx2 = mkctx(), old = new LiveRoom(ctx2, {});
const plain = async (role) => { const r = await old.fetch(new Request("https://x/live", { headers: { "x-live-role": role } })); return r.status === 101 ? lastServer : r; };
const ov = await plain("view"), op = await plain("pc");
assert.deepEqual(op.tags, ["pc"]);
assert.equal(op.att, null);
assert.deepEqual(JSON.parse(ov.sent.pop()), { ctl: "pc", on: true });
await old.webSocketMessage(op, "e:zz");
assert.equal(ov.sent.pop(), "e:zz");
const op2 = await plain("pc");
assert.equal(op.code, 4000);
for (let i = 0; i < 7; i++) await plain("view");
assert.equal((await plain("view")).status, 429, "8 viewers as before");
globalThis.Response = R0;
console.log("team ok");
