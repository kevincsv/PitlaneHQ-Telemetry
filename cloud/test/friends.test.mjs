// node cloud/test/friends.test.mjs: following drivers (friends.js, migration 0090): only a public profile can be
// followed, a follower sees only their laps that are not anonymous, and each friend's lap on a car and track is found
// wherever it sits on the leaderboard
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { friendRoutes, follows } from "../src/friends.js";

const db = new DatabaseSync(":memory:");
const dir = new URL("../migrations/", import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
const stmt = (sql) => {
  const s = { args: [], bind(...a) { s.args = a; return s; },
    first: async () => db.prepare(sql).get(...s.args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...s.args) }),
    run: async () => db.prepare(sql).run(...s.args) };
  return s;
};
const env = { DB: { prepare: stmt } };
const acct = (id, alias, anon = 0) => {
  db.prepare("INSERT INTO accounts (id, email_hash, auth_salt, auth_hash, wrapped_key, display, created, anon) VALUES (?,?,?,?,?,?,?,?)").run(id, "h" + id, "s", "h", "k", alias, 1, anon);
  db.prepare("INSERT INTO community_users (id, token_hash, alias, created) VALUES (?,?,?,?)").run(id, "t" + id, alias, 1);
};
const cols = db.prepare("PRAGMA table_info(accounts)").all().map((c) => c.name);
assert.ok(cols.includes("anon"), "accounts.anon");
acct("aaaaaaaa1", "Me"); acct("bbbbbbbb2", "Ana"); acct("cccccccc3", "Hidden", 1);
const lap = (id, uid, time, anon = 0, track = 5, car = 9, created = 1) =>
  db.prepare("INSERT INTO community_laps (id, user_id, car_id, car, track_id, track, time, created, anon, game) VALUES (?,?,?,?,?,?,?,?,?,?)").run(id, uid, car, "GT3", track, "Spa", time, created, anon, "iracing");
lap("l1", "bbbbbbbb2", 138.2, 0, 5, 9, 10); lap("l2", "bbbbbbbb2", 90.1, 1, 6, 9, 20); lap("l3", "cccccccc3", 137, 0); lap("l4", "bbbbbbbb2", 70, 0, 7, 9, 30);
for (let i = 0; i < 40; i++) lap("x" + i, "o:" + i, 130 + i / 10); // forty faster drivers: Ana is far from the top

const me = { id: "aaaaaaaa1" }, url = (q = "") => new URL("https://x/community/friends" + q);
const call = async (p, m, body, q) => { const r = await friendRoutes(null, env, p, m, body, url(q), "iracing", me); return { status: r.status, j: await r.json() }; };

assert.equal(await friendRoutes(null, env, "/laps", "GET", {}, url(), "iracing", me), null, "not a friends route");
assert.equal((await friendRoutes(null, env, "/friends", "GET", {}, url(), "iracing", null)).status, 401, "signed in only");
assert.equal((await call("/friends/follow", "POST", { lap: "l2" })).status, 404, "an anonymous lap names nobody");
assert.equal((await call("/friends/follow", "POST", { lap: "l3" })).status, 404, "an anonymous profile cannot be followed");
assert.equal((await call("/friends/follow", "POST", { id: "aaaaaaaa1" })).status, 400, "not yourself");
assert.deepEqual((await call("/friends/follow", "POST", { lap: "l1" })).j, { following: true, id: "bbbbbbbb2" });
assert.ok(await follows(env, "aaaaaaaa1", "bbbbbbbb2"));
await call("/friends/follow", "POST", { lap: "l1" }); // twice is once
const fr = (await call("/friends", "GET")).j.friends;
assert.equal(fr.length, 1);
assert.deepEqual(fr[0].laps.map((l) => l.id), ["l4", "l1"], "newest first, never the anonymous lap");
const fl = (await call("/friends/laps", "GET", null, "/laps?trackId=5&carId=9")).j.laps;
assert.deepEqual(fl.map((l) => [l.id, l.alias]), [["l1", "Ana"]], "the friend's lap there, 41st on the board");
assert.deepEqual((await call("/friends/unfollow", "POST", { id: "bbbbbbbb2" })).j, { following: false });
assert.equal((await call("/friends", "GET")).j.friends.length, 0);
console.log("friends ok");
