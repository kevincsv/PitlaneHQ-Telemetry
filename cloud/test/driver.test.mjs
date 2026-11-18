// node cloud/test/driver.test.mjs: the admin page's driver profile (driver.js, driverlib.js) on a real schema (every
// migration): only admins, driving first (per game, tracks, cars, sessions page by page), sign-ins kept as events,
// devices, app use, money, invites, contact and links; and the Drivers list's counts (/admin/users) read by groups
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { register } from "node:module";
import { DatabaseSync } from "node:sqlite";
register("data:text/javascript," + encodeURIComponent(`import {readFile} from "node:fs/promises";export async function load(u,c,n){if(u.endsWith(".json"))return {format:"module",source:"export default "+await readFile(new URL(u),"utf8"),shortCircuit:true};return n(u,c)}`));
const { driverRoute } = await import("../src/driver.js");
const { drivingOf, appOf, driverOf, PAGE, DAY } = await import("../src/driverlib.js");
const { sha256 } = await import("../src/accounts.js");
const { sealEscrow } = await import("../src/escrow.js");

const db = new DatabaseSync(":memory:");
const dir = new URL("../migrations/", import.meta.url);
for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
const stmt = (sql) => {
  const s = { args: [], bind(...a) { s.args = a; return s; },
    first: async () => { const r = db.prepare(sql).get(...s.args); return r ? { ...r } : null; },
    all: async () => ({ results: db.prepare(sql).all(...s.args).map((x) => ({ ...x })) }),
    run: async () => db.prepare(sql).run(...s.args) };
  return s;
};
const env = { DB: { prepare: stmt, batch: async (l) => { for (const x of l) await x.run(); } }, ADMINS: "boss01", DATA_KEY: "test-secret" };
const now = Date.now(), H = 3600e3;
const acc = (id, display, extra = "") => db.exec(`INSERT INTO accounts (id, email_hash, auth_salt, auth_hash, wrapped_key, display, created${extra ? ", " + extra.split("=")[0] : ""}) VALUES ('${id}', 'h${id}', 's', 'a', 'w', '${display}', ${now - 90 * DAY}${extra ? ", " + extra.split("=")[1] : ""})`);
acc("boss01", "Boss"); acc("ana001", "Ana"); acc("bo0001", "Bo"); acc("cy0001", "Cy");
const esc = await sealEscrow(env, "a".repeat(64), "ana@example.com", async () => true);
db.prepare("UPDATE accounts SET escrow=?, supporter=1, supporter_src='stripe', src='reddit', src_page='landing', country='ES', invite_code='ANA1', tester=1 WHERE id='ana001'").run(esc.value);
await db.prepare("INSERT INTO account_sessions (id, account_id, token_hash, device, created, last_seen) VALUES ('t1','boss01',?,'PC',?,?)").run(await sha256("b".repeat(48)), now - DAY, now);
await db.prepare("INSERT INTO account_sessions (id, account_id, token_hash, device, created, last_seen) VALUES ('t2','ana001',?,'Pixel 8',?,?)").run(await sha256("c".repeat(48)), now - 3 * DAY, now - 2 * H);
// Ana drove iRacing and Le Mans Ultimate; the newest session's lap came up two minutes ago (on track now)
const ses = (i, game, track, car, kind, ago, laps, secs, upAt) => db.prepare("INSERT INTO sessions (id, started, track, car, kind, laps, best, uploader, game, secs, up_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("s" + i, now - ago, track, car, kind, laps, 90 + i, "acct:ana001", game, secs, upAt);
for (let i = 0; i < 40; i++) ses(i, i % 4 ? "iracing" : "lmu", i % 2 ? "Spa" : "Monza", i % 3 ? "BMW M4 GT3" : "Porsche 963", i % 5 ? "Practice" : "Race", (i + 1) * DAY, 10, 1200, null);
ses(99, "lmu", "Le Mans", "Porsche 963", "Race", 20 * 60e3, 3, 600, now - 2 * 60e3);
db.prepare("INSERT INTO sessions (id, started, track, car, laps, uploader) VALUES ('other', ?, 'Spa', 'X', 5, 'acct:bo0001')").run(now - DAY);
db.prepare("INSERT INTO presence (account_id, kind, device, name, app_version, last_seen) VALUES ('ana001','pc','d1','Ana PC','0.10.1',?), ('ana001','android','d2','Pixel 8','0.9.14',?)").run(now - 60e3, now - 5 * DAY);
const day = (n) => new Date(now - n * DAY).toISOString().slice(0, 10);
db.prepare("INSERT INTO usage_days (day, account_id, device, key, n) VALUES (?,?,?,?,?), (?,?,?,?,?), (?,?,?,?,?), (?,?,?,?,?)")
  .run(day(1), "ana001", "pc", "view:laps", 4, day(2), "ana001", "web", "view:coach", 2, day(2), "ana001", "pc", "ov:standings", 30, day(60), "ana001", "pc", "view:home", 1);
db.prepare("INSERT INTO events (id, at, account_id, name, info) VALUES ('e1', ?, 'ana001', 'signin', '{\"device\":\"Pixel 8\",\"how\":\"google\"}'), ('e2', ?, 'ana001', 'trial_started', '{}')").run(now - 3 * DAY, now - 4 * DAY);
db.prepare("INSERT INTO pro_orders (id, account_id, kind, status, at, amount, currency, ref) VALUES ('o1','ana001','supporter','on',?,500,'usd','pi_1')").run(now - 10 * DAY);
db.prepare("INSERT INTO referrals (invitee, inviter, created, state) VALUES ('ana001','bo0001',?,'given'), ('cy0001','ana001',?,'waiting')").run(now - 80 * DAY, now - 5 * DAY);
db.prepare("INSERT INTO feedback (id, account_id, created, rating, text, device) VALUES ('f1','ana001',?,4,'Great coach','pc')").run(now - 6 * DAY);
db.prepare("INSERT INTO support_msgs (id, account_id, from_support, text, created) VALUES ('m1','ana001',0,'hi',?), ('m2','ana001',1,'hello',?)").run(now - 7 * DAY, now - 6 * DAY);
db.exec("INSERT INTO driver_links (game, oid, account_id, created) VALUES ('iracing','123','ana001',1), ('lmu','x9','ana001',1)");
db.prepare("INSERT INTO steam_links (steamid, account_id, persona, created) VALUES ('7656','ana001','AnaSteam',1)").run();
db.exec("INSERT INTO community_users (id, alias, token_hash, created) VALUES ('ana001','Ana','th',1)");
db.exec("INSERT INTO community_laps (id, user_id, track_id, car_id, time, car, track, created, game) VALUES ('l1','ana001',1,1,90,'BMW','Spa',1,'iracing'), ('l2','ana001',2,1,91,'BMW','Monza',1,'iracing')");

const call = async (path, who) => {
  const r = await driverRoute(new Request("https://pitlanehq.app" + path, { headers: who ? { authorization: "Bearer " + who.repeat(48) } : {} }), env, new URL("https://pitlanehq.app" + path));
  return { status: r.status, j: await r.json() };
};
assert.equal((await call("/community/admin/driver?id=ana001")).status, 403, "signed out");
assert.equal((await call("/community/admin/driver?id=ana001", "c")).status, 403, "only the admins");
assert.equal((await call("/community/admin/driver?id=bad id", "b")).status, 400);
assert.equal((await call("/community/admin/driver?id=nobody1", "b")).status, 404);

const { status, j: d } = await call("/community/admin/driver?id=ana001", "b");
assert.equal(status, 200);
assert.equal(d.name, "Ana"); assert.equal(d.tester, true); assert.equal(d.admin, false);
assert.equal(d.supporterSrc, "stripe"); assert.deepEqual([d.src, d.page, d.country], ["reddit", "landing", "ES"]);
assert.ok(d.state.online && d.state.driving && d.state.driving.track === "Le Mans", "on track now");
assert.equal(d.totals.sessions, 41); assert.equal(d.totals.laps, 403);
assert.deepEqual(d.games.map((g) => g.game), ["iracing", "lmu"], "every game it drove, the most first");
assert.equal(d.games.find((g) => g.game === "lmu").races, 3, "races per game");
assert.ok(d.tracks.length && d.tracks[0].sessions >= d.tracks[1].sessions && d.cars.length, "tracks and cars driven most");
assert.equal(d.sessions.length, PAGE); assert.equal(d.sessions[0].id, "s99", "newest first"); assert.equal(d.more, true);
assert.equal(d.cal.length, 41, "every session of the 26 weeks for the calendar");
assert.equal(d.totals.days30, 30, "days driven in the last 30");
assert.deepEqual(d.logins.map((l) => l.device), ["Pixel 8"], "the sign-ins open now");
assert.deepEqual(d.signins, [{ at: now - 3 * DAY, device: "Pixel 8", how: "google" }], "the sign-ins kept as events, nothing else");
assert.deepEqual(d.devices.map((x) => [x.kind, x.version]), [["pc", "0.10.1"], ["android", "0.9.14"]]);
assert.equal(d.app.days30, 2, "the agent's own counters are not opening an app, nor days over 30");
assert.deepEqual(d.app.top.map((x) => x.key), ["view:laps", "view:coach"]);
assert.ok(d.steps.some((s) => s.k === "drove") && d.steps.some((s) => s.k === "raced") && d.steps[0].k === "account", "its first steps");
assert.equal(d.money.orders[0].amount, 500);
assert.deepEqual([d.money.invitedBy.id, d.money.invitedBy.name], ["bo0001", "Bo"]);
assert.deepEqual(d.money.invited.map((x) => [x.id, x.name, x.state]), [["cy0001", "Cy", "waiting"]]);
assert.equal(d.contact.email, "ana@example.com", "the email the server keeps");
assert.equal(d.contact.feedback[0].text, "Great coach");
assert.equal(d.contact.support.n, 1, "only what the driver wrote");
assert.deepEqual(d.contact.games.sort(), ["iracing", "lmu"]); assert.equal(d.contact.steam.persona, "AnaSteam");
assert.equal(d.counts.sharedLaps, 2);

// the next sessions, older than the last one shown
const p2 = (await call("/community/admin/driver/sessions?id=ana001&before=" + d.sessions.at(-1).started, "b")).j;
assert.equal(p2.sessions.length, 11); assert.equal(p2.more, false);
assert.ok(p2.sessions.every((s) => s.started < d.sessions.at(-1).started));

// pure parts
const dv = drivingOf([{ game: "acc", track: "Spa", car: "M4", kind: "Race", started: now - DAY, laps: 5, secs: 600 }, { game: "ac", track: "Imola", car: "F40", started: now - 200 * DAY, laps: 2 }], now);
assert.deepEqual(dv.games.map((g) => g.game).sort(), ["ac", "acc"], "ACC and Assetto Corsa too");
assert.equal(dv.cal.length, 1, "the calendar holds 26 weeks");
assert.equal(appOf([{ day: day(1), device: "desktop", key: "act:x", n: 2 }], now).byDevice[0].device, "pc");
const empty = driverOf({ now, a: { id: "z", created: now - 5 * DAY }, sessions: [], recent: [], logins: [], presence: [], usage: [], signins: [], orders: [], invitedBy: null, invited: [], feedback: [], support: null, links: { games: [] }, guests: [], counts: {} });
assert.equal(empty.state.awayDays, 5, "never used: from its creation"); assert.equal(empty.state.droveDays, null); assert.equal(empty.state.online, false);

// the phones' account list (/admin/users): the same answer as before, its counts read by groups
const { community } = await import("../src/community.js");
const ur = await community(new Request("https://pitlanehq.app/community/admin/users", { headers: { authorization: "Bearer " + "b".repeat(48) } }), { ...env, COMMUNITY: "1" }, new URL("https://pitlanehq.app/community/admin/users"));
const U = Object.fromEntries((await ur.json()).users.map((x) => [x.id, x]));
assert.deepEqual([U.ana001.sessions, U.ana001.laps, U.ana001.driverLinked, U.ana001.driverGames.split(",").sort().join(","), U.ana001.tester], [41, 2, 1, "iracing,lmu", true]);
assert.deepEqual([U.bo0001.sessions, U.bo0001.laps, U.bo0001.driverLinked, U.boss01.admin], [1, 0, 0, true]);
assert.equal(U.ana001.lastSession, now - 20 * 60e3);
// the latest sessions and the shared laps name the account behind them, whose profile the page opens
const cg = async (path) => (await community(new Request("https://pitlanehq.app" + path, { headers: { authorization: "Bearer " + "b".repeat(48) } }), { ...env, COMMUNITY: "1" }, new URL("https://pitlanehq.app" + path))).json();
const SS = (await cg("/community/admin/sessions")).sessions;
assert.deepEqual([SS[0].id, SS[0].accountId, SS[0].who], ["s99", "ana001", "Ana"]); assert.equal(SS.find((x) => x.id === "other").accountId, "bo0001");
assert.ok((await cg("/community/admin/uploads")).items.every((x) => x.accountId === "ana001"));
console.log("driver ok");
