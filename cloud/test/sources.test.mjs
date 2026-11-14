// node cloud/test/sources.test.mjs: where the drivers come from (sourceslib.js) names the sites, the pages and the
// countries as the admin page shows them, counts a visit into its row, keeps a new account's source once, adds the
// period up against the one before; and the Analytics' totals, funnel and games (usagelib.js analyticsMore).
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { siteOf, pageOf, visitOf, countryOf, isBot, appSrc, kindOf, sourcesOf, SQL_VISIT_ADD, SQL_ACCOUNT_SRC } from "../src/sourceslib.js";
import { analyticsMore, highlightsOf, SQL_SESSIONS_DAYS } from "../src/usagelib.js";
import { VISIT_JS } from "../src/sourceslib.js";
import { hiText, areasOf, featureOf } from "../src/usagenames.js";

// the sites
assert.equal(siteOf(""), "direct");
assert.equal(siteOf(null), "direct");
assert.equal(siteOf("https://www.google.com/"), "google");
assert.equal(siteOf("https://www.google.co.uk/search?q=x"), "google");
assert.equal(siteOf("https://old.reddit.com/r/iRacing/comments/1"), "reddit");
assert.equal(siteOf("https://out.reddit.com/x"), "reddit");
assert.equal(siteOf("https://discord.com/channels/1/2"), "discord");
assert.equal(siteOf("https://forums.iracing.com/discussion/1"), "iracing");
assert.equal(siteOf("https://t.co/abc"), "x");
assert.equal(siteOf("https://youtu.be/abc"), "youtube");
assert.equal(siteOf("https://chatgpt.com/"), "chatgpt");
assert.equal(siteOf("https://www.overtake.gg/threads/1"), "overtake");
assert.equal(siteOf("android-app://com.google.android.gm"), "gmail");
assert.equal(siteOf("android-app://com.reddit.frontpage"), "reddit");
assert.equal(siteOf("https://pitlanehq.app/iracing-telemetry"), "", "a link inside Pitlane HQ is not a new visit");
assert.equal(siteOf("https://m.simracingblog.example.com/post"), "simracingblog.example.com", "any other site is its host");
assert.equal(siteOf("not a url"), "direct");
assert.equal(kindOf("google"), "search");
assert.equal(kindOf("reddit"), "community");
assert.equal(kindOf("pc-app"), "app");
assert.equal(kindOf("someblog.com"), "other");

// the pages
assert.equal(pageOf("/"), "landing");
assert.equal(pageOf("/?utm_source=x"), "landing");
assert.equal(pageOf("/app"), "app");
assert.equal(pageOf("/es/telemetria-iracing/"), "es/telemetria-iracing");
assert.equal(pageOf("/<script>"), "-script-");

// a visit: a campaign tag wins over the referrer
assert.deepEqual(visitOf({ ref: "https://www.google.com/", page: "/iracing-telemetry" }), { src: "google", page: "iracing-telemetry", campaign: "" });
assert.deepEqual(visitOf({ ref: "https://www.google.com/", page: "/", us: "Reddit", uc: "Launch Post" }), { src: "reddit", page: "landing", campaign: "launch-post" });
assert.equal(visitOf({ us: "reddit.com" }).src, "reddit");
assert.equal(visitOf({ us: "iracing-forum" }).src, "iracing-forum");
assert.equal(visitOf(null).src, "direct");
assert.equal(visitOf({ ref: "https://pitlanehq.app/downloads" }).src, "");

assert.equal(countryOf({ country: "es" }), "ES");
assert.equal(countryOf({ country: "T1" }), "XX");
assert.equal(countryOf(undefined), "XX");
assert.ok(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)"));
assert.ok(isBot(""));
assert.ok(!isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"));
assert.equal(appSrc("pc/0.9.6"), "pc-app");
assert.equal(appSrc("android/0.9.6"), "android-app");
assert.equal(appSrc("web/0.9.6"), "unknown");

// the statements on the real schema
const db = new DatabaseSync(":memory:");
const dir = new URL("../migrations/", import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
const add = db.prepare(SQL_VISIT_ADD);
add.run("2026-11-01", "google", "ES", "landing");
add.run("2026-11-01", "google", "ES", "landing");
add.run("2026-11-01", "reddit", "BR", "landing");
assert.deepEqual(db.prepare("SELECT src, n FROM visits_days ORDER BY src").all().map((x) => [x.src, x.n]), [["google", 2], ["reddit", 1]]);
db.prepare("INSERT INTO accounts (id, email_hash, auth_salt, auth_hash, wrapped_key, display, created) VALUES ('a1','h','','','','A',1)").run();
db.prepare(SQL_ACCOUNT_SRC).run("a1", "reddit", "landing", "BR");
db.prepare(SQL_ACCOUNT_SRC).run("a1", "google", "landing", "ES");
assert.deepEqual({ ...db.prepare("SELECT src, src_page, country FROM accounts WHERE id='a1'").get() }, { src: "reddit", src_page: "landing", country: "BR" }, "the first source stays");
db.prepare("INSERT INTO sessions (id, started, track, car, kind, laps, uploader, game, secs) VALUES ('s1',?1,'Spa','GT3','Race',10,'acct:a1','iracing',1800)").run(Date.parse("2026-10-31T20:00:00Z"));
db.prepare("INSERT INTO sessions (id, started, track, car, kind, laps, uploader, game, secs) VALUES ('s2',?1,'Spa','GT3','Practice',4,'acct:a1','iracing',600)").run(Date.parse("2026-10-31T21:00:00Z"));
db.prepare("INSERT INTO sessions (id, started, track, car, kind, laps, uploader, game, secs) VALUES ('s3',?1,'Spa','GT3','Practice',4,'guest:x','iracing',600)").run(Date.parse("2026-10-31T21:00:00Z"));
const sd = db.prepare(SQL_SESSIONS_DAYS).all(Date.parse("2026-10-01T00:00:00Z"));
assert.deepEqual(sd.map((x) => [x.day, x.uploader, x.n, x.laps, x.secs, x.races]), [["2026-10-31", "acct:a1", 2, 14, 2400, 1]], "only accounts' sessions, a day each");

// the period against the one before
const S = sourcesOf(
  [{ src: "google", country: "ES", page: "landing", n: 5 }, { src: "reddit", country: "BR", page: "iracing-telemetry", n: 3 }],
  [{ src: "google", country: "ES", page: "landing", n: 2 }],
  [{ src: "reddit", country: "BR" }, { src: null, country: null }],
  [],
);
assert.equal(S.visits, 8);
assert.equal(S.prevVisits, 2);
assert.equal(S.signups, 2);
assert.deepEqual(S.bySource.map((x) => [x.src, x.kind, x.visits, x.prevVisits, x.signups]), [["reddit", "community", 3, 0, 1], ["unknown", "unknown", 0, 0, 1], ["google", "search", 5, 2, 0]]);
assert.deepEqual(S.byCountry[0], { country: "BR", visits: 3, signups: 1 });
assert.deepEqual(S.byPage.map((x) => x.page), ["landing", "iracing-telemetry"]);

// the Analytics' totals, funnel, come-back and games
const t0 = Date.parse("2026-10-03T00:00:00Z");
const M = analyticsMore({
  from: "2026-10-03", t0,
  actDays: [{ account_id: "a", day: "2026-10-30" }, { account_id: "a", day: "2026-10-31" }, { account_id: "b", day: "2026-10-31" }, { account_id: "z", day: "2026-09-01" }],
  rows: [{ account_id: "a", device: "pc", key: "view:laps", n: 3 }, { account_id: "a", device: "web", key: "act:coach_report", n: 1 }, { account_id: "b", device: "ios", key: "view:home", n: 1 }],
  sessions: [{ day: "2026-10-29", uploader: "acct:a", game: "iracing", n: 2, laps: 20, secs: 3600, races: 1 }, { day: "2026-10-31", uploader: "acct:c", game: "lmu", n: 1, laps: 5, secs: 900, races: 0 }],
  prevSessions: { sessions: 4, drivers: 1, secs: 100 }, prevActive: 1,
  accounts: [{ id: "a", created: t0 + 1 }, { id: "b", created: t0 + 2 }, { id: "c", created: t0 + 3 }, { id: "d", created: t0 + 4 }, { id: "old", created: t0 - 5 }],
  accountsAll: 9,
});
assert.deepEqual(M.active, [{ day: "2026-10-29", users: 1 }, { day: "2026-10-30", users: 1 }, { day: "2026-10-31", users: 3 }], "a driver who drove is active even without an app open");
assert.deepEqual(M.drove, [{ day: "2026-10-29", users: 1 }, { day: "2026-10-31", users: 1 }]);
assert.deepEqual(M.totals, { active: 3, newAccounts: 4, accounts: 9, drove: 2, sessions: 3, races: 1, laps: 25, secs: 4500, returning: 1, multiDevice: 1 });
assert.deepEqual(M.prev, { active: 1, newAccounts: 1, sessions: 4, drove: 1, secs: 100 });
assert.deepEqual(M.funnel, { accounts: 4, opened: 2, drove: 2, laps: 1, coach: 1 });
assert.deepEqual(M.comeback, { d1: 2, d23: 1, d4: 0 });
assert.deepEqual(M.driven.map((g) => [g.game, g.drivers, g.sessions, g.races, g.laps, g.secs]), [["iracing", 1, 2, 1, 20, 3600], ["lmu", 1, 1, 0, 5, 900]]);
assert.deepEqual(M.signupsPerDay, [{ day: "2026-10-03", n: 4 }]);

// what stands out, as keys every device writes in its language
const H = highlightsOf({ days: 30, totals: { active: 20, newAccounts: 29 }, prev: { active: 0 }, funnel: { accounts: 29, opened: 20, drove: 21 },
  top: [{ key: "view:telemetry", users: 18 }, { key: "act:coach_report", users: 8 }], sources: { visits: 10, bySource: [{ src: "reddit", visits: 4, signups: 3 }, { src: "unknown", signups: 9, visits: 0 }] },
  driven: [{ game: "iracing", drivers: 10, sessions: 251 }, { game: "lmu", drivers: 10, sessions: 34 }], byDevice: [{ device: "pc", users: 17 }, { device: "ios", users: 2 }],
  versions: [{ device: "pc", v: "0.9.6", devices: 3 }, { device: "desktop", v: "0.9.5", devices: 2 }, { device: "ios", v: "0.9.10", devices: 1 }, { device: "ios", v: "0.9.9", devices: 1 }] });
assert.deepEqual(H.map((h) => [h.k, ...h.a]), [["active_first", 20, 30, 29], ["no_app", 9, 29, 31], ["coach_low", 8, 20, 18], ["top_signups", "reddit", 3], ["games", "iracing", "25.1", "lmu", "3.4"], ["no_android", 30], ["behind", 3]]);
for (const h of H) { const t = hiText(h.k, h.a); assert.ok(Array.isArray(t) && t.length === 3 && t.every((x) => x && !x.includes("undefined") && !/: /.test(x)), "every sentence in three languages, no colon: " + h.k); }
for (const k of ["no_drive", "active_more", "active_fewer", "top_visits", "no_ios"]) assert.equal(hiText(k, ["google", 2, 3, 4]).length, 3);
assert.deepEqual(featureOf("act:coach_report").name, ["Coach report", "Informe del coach", "Relatório do coach"]);
assert.deepEqual(featureOf("view:some_thing").name[0], "Some thing");
const A = areasOf([{ key: "view:home", users: 5, n: 9 }, { key: "act:coach_report", users: 2, n: 3 }, { key: "view:admin", users: 1, n: 1 }, { key: "act:new_thing", users: 1, n: 1 }]);
assert.deepEqual(A.map((a) => [a.k, a.rows.map((x) => x.key)]), [["coach", ["act:coach_report"]], ["account", ["view:home"]], ["other", ["act:new_thing"]]], "the admin's own page is left out");
// the landing and the web app run the same lines as the public pages
assert.ok(readFileSync(new URL("../../web/dist/index.html", import.meta.url), "utf8").includes(VISIT_JS), "index.html carries VISIT_JS as it is in sourceslib.js");

console.log("sources ok");

// "Invite a friend": the inviter's link is one source, "invite", and keeps who sent it
{
  const v = visitOf({ ref: "", page: "/", us: "invite-88407bb0034daced71a27d3f" });
  assert.equal(v.src, "invite");
  assert.equal(v.inviter, "88407bb0034daced71a27d3f");
  assert.equal(visitOf({ ref: "", page: "/", us: "reddit" }).inviter, undefined);
  console.log("invite source ok");
}

// sign-ups in the PC agent: the installer's download keeps where it came from, and the agent's account takes it
{
  const { downloadVisit, appSignupSrc, dlKey, DL_DAYS, SQL_DL_ADD, SQL_DL_FIND } = await import("../src/sourceslib.js");
  const q = (s) => new URLSearchParams(s);
  // from the site's own button: the browser's first visit, added to the link
  assert.deepEqual(downloadVisit(q("fr=https%3A%2F%2Fold.reddit.com%2Fr%2Fsimracing&fu=&fc=&fp=%2Firacing-telemetry"), "https://pitlanehq.app/"), { src: "reddit", page: "iracing-telemetry", campaign: "" });
  assert.deepEqual(downloadVisit(q("fr=&fu=youtube&fc=launch&fp=%2F"), ""), { src: "youtube", page: "landing", campaign: "launch" });
  assert.equal(downloadVisit(q("fr=https%3A%2F%2Fpitlanehq.app%2F&fu=&fc=&fp=%2F"), "").src, "direct", "from Pitlane HQ itself with nothing more");
  // a link to the installer posted elsewhere: its tag, else the site it was clicked on
  assert.deepEqual(downloadVisit(q(""), "https://discord.com/channels/1/2"), { src: "discord", page: "dl", campaign: "" });
  assert.equal(downloadVisit(q("utm_source=reddit"), "").src, "reddit");
  assert.equal(downloadVisit(q(""), null).src, "direct");
  // the agent's account
  assert.deepEqual(appSignupSrc("pc/0.9.15+abc1234", "", { src: "reddit", page: "landing" }), { src: "reddit", page: "landing" });
  assert.deepEqual(appSignupSrc("desktop/0.9.15", "store", { src: "google", page: "landing" }), { src: "google", page: "landing" }, "a download wins over the Store");
  assert.deepEqual(appSignupSrc("pc/0.9.15", "store", null), { src: "msstore", page: null });
  assert.deepEqual(appSignupSrc("pc/0.9.15", "", null), { src: "pc-app", page: null });
  assert.deepEqual(appSignupSrc("android/0.9.15", "store", { src: "reddit" }), { src: "android-app", page: null }, "only the agent");
  assert.equal(kindOf("msstore"), "store");
  // the key: the same for the same address, never the address
  const k1 = await dlKey("secret", "203.0.113.7"), k2 = await dlKey("secret", "203.0.113.7"), k3 = await dlKey("secret", "203.0.113.8");
  assert.equal(k1, k2);
  assert.notEqual(k1, k3);
  assert.ok(/^[0-9a-f]{32}$/.test(k1) && !k1.includes("203"));
  // on the real schema: the newest download of the connection inside DL_DAYS
  const now = Date.parse("2026-11-14T12:00:00Z"), D = 86400e3;
  db.prepare(SQL_DL_ADD).run(k1, now - 20 * D, "youtube", "landing", "");
  db.prepare(SQL_DL_ADD).run(k1, now - 3 * D, "reddit", "landing", "");
  db.prepare(SQL_DL_ADD).run(k3, now - 1 * D, "google", "landing", "");
  assert.deepEqual({ ...db.prepare(SQL_DL_FIND).get(k1, now - DL_DAYS * D) }, { src: "reddit", page: "landing" });
  assert.equal(db.prepare(SQL_DL_FIND).get(await dlKey("secret", "198.51.100.1"), now - DL_DAYS * D), undefined);
  console.log("agent sign-up source ok");
}
