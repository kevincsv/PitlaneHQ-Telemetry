// node cloud/test/quick-signup.test.mjs: accounts made in one tap from Steam, Discord or Google (no form, no password, the
// server makes and keeps the data key), "Continue with Google" (google.js, migration 0083) signing in to the account of its
// verified email, and the form's sign-up of the new apps signed in at once to a session that waits for the email (gated)
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { register } from "node:module";
import { DatabaseSync } from "node:sqlite";
// the Worker imports JSON without import attributes (wrangler bundles it): node reads it as a module here
register("data:text/javascript," + encodeURIComponent(`import {readFile} from "node:fs/promises";export async function load(u,c,n){if(u.endsWith(".json"))return {format:"module",source:"export default "+await readFile(new URL(u),"utf8"),shortCircuit:true};return n(u,c)}`));
const { accounts, sha256, freeName } = await import("../src/accounts.js");
const { googleOAuth, googleUser } = await import("../src/google.js");

const db = new DatabaseSync(":memory:");
const dir = new URL("../migrations/", import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
const stmt = (sql) => {
  const s = { sql, args: [], bind(...a) { s.args = a; return s; },
    first: async () => { const r = db.prepare(sql).get(...s.args); return r ? { ...r } : null; },
    all: async () => ({ results: db.prepare(sql).all(...s.args).map((x) => ({ ...x })) }),
    run: async () => db.prepare(sql).run(...s.args) };
  return s;
};
const DB = { prepare: stmt, batch: async (list) => { for (const x of list) await x.run(); } };
const env = { COMMUNITY: "1", DATA_KEY: "test-secret", DB, GOOGLE_CLIENT_ID: "cid.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "sec", EMAIL_FROM: "Pitlane HQ <hi@pitlanehq.app>", RESEND_API_KEY: "re_x" };

// Google's token endpoint answers with an ID token for whoever "signs in" next; Resend accepts every email
let who = null;
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
globalThis.fetch = async (u, o) => {
  if (u === "https://oauth2.googleapis.com/token") return new Response(JSON.stringify({ id_token: b64u({ alg: "RS256" }) + "." + b64u(who) + ".sig" }));
  if (String(u).startsWith("https://api.resend.com")) return new Response(JSON.stringify({ id: "m1" }));
  throw new Error("unexpected fetch " + u);
};
const call = async (m, path, body, token) => {
  const r = await accounts(new Request("https://pitlanehq.app/account" + path, { method: m, headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3." + Math.floor(Math.random() * 250), ...(token ? { authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, new URL("https://pitlanehq.app/account" + path));
  return { status: r.status, j: await r.json() };
};
// a whole "Continue with Google" in the browser: the start, Google's way back, the query the web app gets
async function google(person) {
  who = { iss: "https://accounts.google.com", aud: env.GOOGLE_CLIENT_ID, exp: Math.floor(Date.now() / 1000) + 600, ...person };
  const st = (await call("POST", "/google/login/start", { device: "Web" })).j;
  assert.ok(st.url.startsWith("https://accounts.google.com/o/oauth2/v2/auth?") && st.url.includes("scope=openid+email+profile"));
  const r = await googleOAuth(null, env, new URL("https://pitlanehq.app/google/oauth?state=" + st.state + "&code=abc"));
  return { code: st.code, q: new URL(r.headers.get("location")).searchParams };
}

// the ID token: only ours, from Google, not expired; the email only when verified
const base = { iss: "https://accounts.google.com", aud: "x", sub: "1234567890", exp: Math.floor(Date.now() / 1000) + 60 };
const tok = (p) => "h." + b64u(p) + ".s";
assert.deepEqual(googleUser(tok({ ...base, email: "Ana@Example.com", email_verified: true, name: "Ana R" }), "x"), { sub: "1234567890", email: "ana@example.com", name: "Ana R" });
assert.equal(googleUser(tok({ ...base, email: "ana@example.com", email_verified: false }), "x").email, "", "an unverified email is not taken");
assert.equal(googleUser(tok(base), "other"), null, "another app's token");
assert.equal(googleUser(tok({ ...base, iss: "https://evil.example" }), "x"), null);
assert.equal(googleUser(tok({ ...base, exp: 1 }), "x"), null, "expired");
assert.equal(googleUser("garbage", "x"), null);

// a new Google person: a sign-up grant, then the account in one tap with the server's data key
let g = await google({ sub: "111111", email: "Lia@Example.com", email_verified: true, name: "Lia Ramos" });
assert.equal(g.q.get("googleLogin"), "0"); assert.equal(g.q.get("new"), "1"); assert.equal(g.q.get("name"), "Lia Ramos");
assert.equal((await call("POST", "/register", { quick: 1, googleSid: g.q.get("sid"), code: "f".repeat(48) })).status, 400, "only with the code of the app that started");
g = await google({ sub: "111111", email: "lia@example.com", email_verified: true, name: "Lia Ramos" });
const lia = await call("POST", "/register", { quick: 1, googleSid: g.q.get("sid"), code: g.code, device: "Web" });
assert.equal(lia.status, 200);
assert.ok(lia.j.token && /^[0-9a-f]{64}$/.test(lia.j.dataKey) && lia.j.noPassword && lia.j.verified && lia.j.created);
assert.equal(lia.j.display, "Lia Ramos"); assert.equal(lia.j.email, "lia@example.com");
const row = db.prepare("SELECT * FROM accounts WHERE id=?").get(lia.j.id);
assert.equal(row.auth_hash, ""); assert.ok(row.escrow.startsWith("enc:") && !row.escrow.includes(lia.j.dataKey), "the key is kept sealed");
let me = (await call("GET", "/me", null, lia.j.token)).j;
assert.equal(me.noPassword, true); assert.equal(me.google, true);
assert.equal((await call("GET", "/sync", null, lia.j.token)).status, 200, "the account works at once");
// no password to sign in with, to change or to unwrap the key; the authenticator needs one
assert.equal((await call("POST", "/login", { email: "lia@example.com", auth: "a".repeat(64) })).j.code, "social_only");
assert.equal((await call("POST", "/key", { auth: "a".repeat(64) }, lia.j.token)).j.code, "social_only");
assert.equal((await call("POST", "/password", {}, lia.j.token)).j.code, "social_only");
assert.equal((await call("POST", "/2fa/setup", {}, lia.j.token)).j.code, "social_only");
assert.equal((await call("POST", "/google/unlink", {}, lia.j.token)).j.code, "last_way", "the only way in stays");
// Google again: a sign-in with the same data key
g = await google({ sub: "111111", email: "lia@example.com", email_verified: true, name: "Lia Ramos" });
assert.ok(/^[0-9a-f]{48}$/.test(g.q.get("googleLogin")));
const again = await call("POST", "/login/google", { grant: g.q.get("googleLogin"), code: g.code });
assert.equal(again.j.id, lia.j.id); assert.equal(again.j.dataKey, lia.j.dataKey);
// a second person with the same Google name gets a free one
g = await google({ sub: "222222", name: "Lia Ramos" });
const lia2 = await call("POST", "/register", { quick: 1, googleSid: g.q.get("sid"), code: g.code });
assert.equal(lia2.j.display, "Lia Ramos 2"); assert.equal(lia2.j.email, undefined, "no verified email: none kept");

// Steam and Discord in one tap: the persona, or the Discord name
const grant = async (table, cols, vals) => {
  const gr = "a".repeat(40) + Math.random().toString(16).slice(2, 10).padEnd(8, "0"), code = "c".repeat(48), pre = table.split("_")[0];
  db.prepare(`INSERT INTO ${table} (grant_hash, code_hash, kind, expires, ${cols.join(",")}) VALUES (?,?,'signup',?,${cols.map(() => "?").join(",")})`)
    .run(await sha256(pre + "-grant:" + gr), await sha256(pre + "-code:" + code), Date.now() + 60e3, ...vals);
  return { gr, code };
};
let s = await grant("steam_grants", ["steamid", "persona"], ["76561198000000001", "Max V"]);
const max = await call("POST", "/register", { quick: 1, sid: s.gr, code: s.code });
assert.equal(max.j.display, "Max V"); assert.ok(max.j.noPassword && max.j.dataKey);
assert.equal(db.prepare("SELECT account_id FROM steam_links WHERE steamid='76561198000000001'").get().account_id, max.j.id);
s = await grant("steam_grants", ["steamid", "persona"], ["76561198000000001", "Max V"]);
assert.equal((await call("POST", "/register", { quick: 1, sid: s.gr, code: s.code })).j.code, "taken");
s = await grant("discord_grants", ["discord_id", "handle", "name"], ["123456789012", "kai_r", "Kai"]);
const kai = await call("POST", "/register", { quick: 1, discordSid: s.gr, code: s.code });
assert.equal(kai.j.display, "Kai"); assert.equal(db.prepare("SELECT login FROM discord_links WHERE discord_id='123456789012'").get().login, 1);
// a passwordless account deletes itself with its session
assert.equal((await call("POST", "/delete", {}, kai.j.token)).j.deleted, true);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM discord_links WHERE discord_id='123456789012'").get().n, 0);
// without DATA_KEY the server cannot keep a key: the email form instead
s = await grant("steam_grants", ["steamid", "persona"], ["76561198000000009", "Zed"]);
const keep = env.DATA_KEY; delete env.DATA_KEY;
assert.equal((await call("POST", "/register", { quick: 1, sid: s.gr, code: s.code })).j.code, "no_quick");
env.DATA_KEY = keep;
assert.equal(await freeName(env, "  "), "Driver");
assert.equal(await freeName(env, "Anonymous"), "Anonymous 2", "the reserved name is never given");

// the form (new apps, gate): signed in at once to a session that waits for the email
const form = { email: "rui@example.com", auth: "b".repeat(64), wrappedKey: "A".repeat(60), display: "Rui", device: "Web", gate: 1 };
const rui = await call("POST", "/register", form);
assert.equal(rui.status, 200); assert.equal(rui.j.gated, true); assert.equal(rui.j.verified, false); assert.ok(rui.j.token);
me = (await call("GET", "/me", null, rui.j.token)).j;
assert.equal(me.gated, true); assert.equal(me.verified, false);
assert.equal((await call("GET", "/sync", null, rui.j.token)).j.code, "verify_first", "nothing else until the email is confirmed");
assert.equal((await call("POST", "/verify/resend", { email: "rui@example.com" }, rui.j.token)).status, 200);
const { sessionAccount } = await import("../src/accounts.js");
await assert.rejects(sessionAccount(new Request("https://x/", { headers: { authorization: "Bearer " + rui.j.token } }), env), (e) => e.gated === true, "the rest of the server answers 403, never a 401 that signs the app out");
// an older app gets the old answer: confirm first, then sign in
const old = await call("POST", "/register", { ...form, email: "old@example.com", display: "Olde", gate: undefined });
assert.equal(old.status, 202); assert.equal(old.j.token, undefined);
// the sign-in with the password: gated too (the new apps), still refused for the older ones
assert.equal((await call("POST", "/login", { email: "rui@example.com", auth: form.auth })).j.code, "verify_first");
assert.equal((await call("POST", "/login", { email: "rui@example.com", auth: form.auth, gate: 1 })).j.gated, true);
// Google with the same verified email signs in to that account, links it and confirms the email
g = await google({ sub: "333333", email: "rui@example.com", email_verified: true, name: "Rui G" });
const ruiG = await call("POST", "/login/google", { grant: g.q.get("googleLogin"), code: g.code });
assert.equal(ruiG.j.id, rui.j.id); assert.equal(ruiG.j.needKey, true, "no copy of the key yet: the password once");
assert.equal(db.prepare("SELECT verified FROM accounts WHERE id=?").get(rui.j.id).verified, 1);
assert.equal((await call("GET", "/sync", null, rui.j.token)).status, 200, "confirmed: the waiting session works now");
// "Wrong email?": a waiting account is deleted with its session alone
const typo = await call("POST", "/register", { ...form, email: "typo@exmaple.com", display: "Typo" });
assert.equal((await call("POST", "/delete", {}, typo.j.token)).j.deleted, true);
console.log("quick sign-up ok");
