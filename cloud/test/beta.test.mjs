// node cloud/test/beta.test.mjs: the test version (beta.pitlanehq.app, BETA = "1") is for testers and admins only,
// sends its public pages to pitlanehq.app, stays out of search engines, and changes nothing on pitlanehq.app (beta.js)
import assert from "node:assert/strict";
import { register } from "node:module";
// the Worker imports JSON without import attributes (wrangler bundles it): node reads it as a module here
register("data:text/javascript," + encodeURIComponent(`import {readFile} from "node:fs/promises";export async function load(u,c,n){if(u.endsWith(".json"))return {format:"module",source:"export default "+await readFile(new URL(u),"utf8"),shortCircuit:true};return n(u,c)}`));
const { betaGate, betaHeaders, betaSignIn } = await import("../src/beta.js");

const now = Date.now();
const rows = { ["t".repeat(48)]: { id: "plain", verified: 1 }, ["s".repeat(48)]: { id: "tst", tester: 1, verified: 1 }, ["a".repeat(48)]: { id: "adm", verified: 1 } };
const hex = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const byHash = {};
for (const [t, r] of Object.entries(rows)) byHash[await hex(t)] = { sid: 1, last_seen: now, session_created: now, ...r };
const DB = { prepare: () => ({ bind: (h) => ({ first: async () => byHash[h] || null, run: async () => ({}) }) }) };
const beta = { BETA: "1", DB, ADMINS: "adm" }, prod = { DB, ADMINS: "adm" };
const go = (env, path, token, method = "GET") => { const url = new URL("https://beta.pitlanehq.app" + path); return betaGate(new Request(url, { method, headers: token ? { authorization: "Bearer " + token } : {} }), env, url); };

// pitlanehq.app: never touched
assert.equal(await go(prod, "/community/leaderboard", "t".repeat(48)), null);
assert.equal(await go(prod, "/iracing"), null);

// the app, its files, live and downloads open; sign-in (no session yet) and public reads go through
assert.equal((await (await go(beta, "/server.json")).json()).url, "https://beta.pitlanehq.app");
for (const p of ["/", "/pitwall-analysis.js", "/whats-new.json", "/live", "/dl/beta/version.json"]) assert.equal(await go(beta, p), null, p);
assert.equal(await go(beta, "/account/login", null, "POST"), null);
assert.equal(await go(beta, "/community/leaderboard"), null);

// signed in: testers and admins go through, everyone else is refused
assert.equal(await go(beta, "/account/me", "s".repeat(48)), null);
assert.equal(await go(beta, "/community/admin/online", "a".repeat(48)), null);
// the laps and sessions answer on the test version too (never sent to pitlanehq.app, which would lose the session)
for (const p of ["/api/sessions", "/api/bests", "/api/sessions/summary"]) assert.equal(await go(beta, p, "s".repeat(48)), null, p);
assert.equal(await go(beta, "/api/upload", "a".repeat(48), "POST"), null);
assert.equal((await go(beta, "/api/sessions", "t".repeat(48))).status, 403);
const no = await go(beta, "/account/me", "t".repeat(48));
assert.equal(no.status, 403);
assert.equal((await no.json()).code, "beta_only");

// public pages go to pitlanehq.app; posts elsewhere are not found
const r = await go(beta, "/iracing/tracks?x=1");
assert.equal(r.status, 302);
assert.equal(r.headers.get("location"), "https://pitlanehq.app/iracing/tracks?x=1");
assert.equal((await go(beta, "/stripe/webhook", null, "POST")).status, 404);
assert.match(await (await go(beta, "/robots.txt")).text(), /Disallow: \//);

// signing in: only testers and admins get a session on the test version; anyone else's is removed at once
const deleted = [];
const sdb = { prepare: (q) => ({ bind: (h) => ({ run: async () => { deleted.push([q, h]); return {}; } }) }) };
const ans = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
const out = await betaSignIn(ans({ id: "plain", token: "x".repeat(48), tester: false }), { ...beta, DB: sdb });
assert.equal(out.status, 403);
assert.equal((await out.json()).code, "beta_only");
assert.equal(deleted.length, 1);
assert.match(deleted[0][0], /DELETE FROM account_sessions/);
assert.equal((await betaSignIn(ans({ id: "tst", token: "y".repeat(48), tester: true }), { ...beta, DB: sdb })).status, 200);
assert.equal((await betaSignIn(ans({ id: "adm", token: "z".repeat(48) }), { ...beta, DB: sdb })).status, 200);
assert.equal((await betaSignIn(ans({ id: "plain", token: "x".repeat(48) }), { ...prod, DB: sdb })).status, 200); // pitlanehq.app: untouched
assert.equal((await betaSignIn(ans({ ok: true }), { ...beta, DB: sdb })).status, 200); // answers without a session
assert.equal(deleted.length, 1);

// noindex on the test version only
assert.equal(betaHeaders(new Response("x"), beta).headers.get("x-robots-tag"), "noindex, nofollow");
assert.equal(betaHeaders(new Response("x"), prod).headers.get("x-robots-tag"), null);
console.log("beta: ok");
