// node cloud/test/metrics.test.mjs: the admin Analytics' weekly numbers (metricslib.js, metricsjob.js). The weeks are
// Monday to Sunday, a new account is kept when it is active on days 7 to 13, the drivers leave the staff out, the job
// writes only what changed, the page's answer has the seven Monday numbers, and a quiet counter is told apart from one
// that never sent.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { weekOf, addDays, weeksBetween, buildMetrics, metricsAnswer, healthOf, timelineOf, cleanTag, changedRows, metricKey, sameMetric, TARGETS, STEPS, BEHAVIOURS } from "../src/metricslib.js";
import { weeklyMetrics } from "../src/metricsjob.js";
import { cleanUsage, analyticsOf, KEY_RE } from "../src/usagelib.js";
import { eventStmt, EVENT_RE } from "../src/eventslib.js";

// weeks
assert.equal(weekOf("2026-11-15"), "2026-11-09", "a Sunday belongs to the week of its Monday");
assert.equal(weekOf("2026-11-16"), "2026-11-16");
assert.equal(addDays("2026-10-28", 7), "2026-11-04");
assert.deepEqual(weeksBetween("2026-10-28", "2026-11-15"), ["2026-10-26", "2026-11-02", "2026-11-09"]);

const T = (d, h = 12) => Date.parse(d + "T" + String(h).padStart(2, "0") + ":00:00Z");
const u = (id, day, key, device = "pc", n = 1) => ({ account_id: id, day, device, key, n });
const s = (id, day, game = "lmu", races = 0, n = 1) => ({ day, game, uploader: "acct:" + id, n, races, first: T(day, 18) });
// a: signs up Mon Oct 26, drives and races that day, opens Community, comes back on day 8 (kept)
// b: signs up Tue Oct 27, opens the app only, never comes back
// c: signs up Mon Nov 2, drives iRacing on day 3 (not within two days), not yet 14 days old on Nov 15
// t: a tester who does everything
const accounts = [
  { id: "a", created: T("2026-10-26"), src: "chatgpt", staff: false }, { id: "b", created: T("2026-10-27"), src: "reddit-lmu", staff: false },
  { id: "c", created: T("2026-11-02"), src: "google", staff: false }, { id: "t", created: T("2026-10-26"), src: "direct", staff: true },
  { id: "old", created: T("2026-09-01"), src: "unknown", staff: false },
];
const usage = [
  u("a", "2026-10-26", "view:home"), u("a", "2026-10-26", "view:community"), u("a", "2026-10-26", "act:pro_badge.race_fuel", "pc", 2), u("a", "2026-11-03", "view:laps", "web"),
  u("b", "2026-10-27", "view:home", "web"), u("c", "2026-11-02", "view:home"), u("c", "2026-11-05", "ov:relative", "pc", 30),
  u("t", "2026-10-26", "view:home"), u("t", "2026-11-04", "view:home"), u("old", "2026-11-10", "run:agent"), u("old", "2026-11-11", "view:home"),
];
const sessions = [s("a", "2026-10-26", "lmu", 1), s("a", "2026-11-03", "lmu"), s("c", "2026-11-05", "iracing"), s("t", "2026-10-26", "lmu", 1), s("old", "2026-11-11", "iracing", 1)];
const built = buildMetrics({ accounts, usage, sessions, visits: [{ day: "2026-10-26", src: "chatgpt", n: 10 }, { day: "2026-10-28", src: "reddit-lmu", n: 4 }, { day: "2026-11-10", src: "google", n: 7 }],
  pc: [{ day: "2026-10-27", kind: "download", n: 5 }, { day: "2026-10-27", kind: "uninstall", n: 1 }], orders: [{ at: T("2026-11-03"), amount: 500, currency: "USD" }],
  referrals: [{ created: T("2026-10-28"), state: "given", done: T("2026-11-05") }], events: [{ at: T("2026-11-04"), name: "trial_started" }],
  anon: [{ day: "2026-11-12", uploader: "dev:1", n: 3 }, { day: "2026-11-13", uploader: "dev:1", n: 1 }], from: "2026-10-26", today: "2026-11-15", supporters: 2 });
const val = (week, metric, split = "", aud = 0) => (built.metrics.find((x) => x.week === week && x.aud === aud && x.metric === metric && x.split === split) || { value: 0 }).value;
assert.equal(val("2026-10-26", "users"), 1, "only who drove is a weekly driver, and the tester is not one of the drivers");
assert.equal(val("2026-10-26", "users", "", 1), 2, "everyone counts the tester");
assert.equal(val("2026-10-26", "opened"), 2, "opening the app is a second number");
assert.equal(val("2026-10-26", "opened", "", 1), 3);
assert.equal(val("2026-10-26", "drove"), 1);
assert.equal(val("2026-10-26", "drove", "game:lmu"), 1);
assert.equal(val("2026-10-26", "raced"), 1);
assert.equal(val("2026-10-26", "new"), 2);
assert.equal(val("2026-10-26", "new", "src:chatgpt"), 1);
assert.equal(val("2026-10-26", "used", "dev:web"), 1);
assert.equal(val("2026-11-09", "users"), 1);
assert.equal(val("2026-11-09", "opened"), 1, "the agent running is not opening a screen, the day after is");
assert.equal(val("2026-11-09", "agent"), 1);
assert.equal(val("2026-11-09", "users_bg"), 1);
assert.equal(val("2026-10-26", "visits"), 14);
assert.equal(val("2026-10-26", "visits", "src:reddit-lmu"), 4);
assert.equal(val("2026-10-26", "downloads"), 5);
assert.equal(val("2026-10-26", "uninstalls"), 1);
assert.equal(val("2026-11-02", "donations"), 1);
assert.equal(val("2026-11-02", "donated", "cur:usd"), 500);
assert.equal(val("2026-10-26", "invited"), 1);
assert.equal(val("2026-11-02", "invite_given"), 1);
assert.equal(val("2026-11-02", "e:trial_started"), 1);
assert.equal(val("2026-11-09", "anon_pcs"), 1);
assert.equal(val("2026-11-09", "anon_sessions"), 4);
assert.equal(val("2026-11-09", "supporters"), 2, "the supporters are counted as they stand, in the week it is");
assert.equal(val("2026-10-26", "k:act:pro_badge.race_fuel"), 1);
assert.equal(val("2026-10-26", "kn:act:pro_badge.race_fuel"), 2);
// the sign-up week
assert.equal(val("2026-10-26", "c:n"), 2);
assert.equal(val("2026-10-26", "c:mature"), 2);
assert.equal(val("2026-10-26", "c:kept"), 1, "a drove again on day 8, b never did");
assert.equal(val("2026-10-26", "c:kept_open"), 1);
assert.equal(val("2026-10-26", "c:up2"), 1);
assert.equal(val("2026-10-26", "c:up7"), 1);
assert.equal(val("2026-10-26", "c:kept", "src:chatgpt"), 1);
assert.equal(val("2026-10-26", "c:n", "game:lmu"), 1);
assert.equal(val("2026-11-02", "c:n"), 1);
assert.equal(val("2026-11-02", "c:mature"), 0, "13 days old is not yet a whole second week");
assert.equal(val("2026-11-02", "c:up2"), 0, "day 3 is not within two days");
assert.equal(val("2026-11-02", "c:up7"), 1);
assert.equal(val("2026-10-26", "s:opened:1"), 2);
assert.equal(val("2026-10-26", "s:raced:1"), 1);
assert.equal(val("2026-10-26", "s:community:2"), 1);
assert.equal(val("2026-11-02", "s:drove:2"), 0);
assert.equal(val("2026-11-02", "s:drove:7"), 1);
assert.equal(val("2026-11-02", "s:overlay:7"), 1);
assert.equal(val("2026-10-26", "s:second:7"), 0, "the second device came on day 8");
assert.equal(val("2026-10-26", "b:raced:n"), 1);
assert.equal(val("2026-10-26", "b:raced:kept"), 1);
assert.equal(val("2026-10-26", "b:lmu:n"), 1);
assert.equal(val("2026-10-26", "c:med_h"), 6, "from noon to the first session at six");
const co = (week, wk, split = "", aud = 0) => built.cohorts.find((x) => x.week === week && x.wk === wk && x.split === split && x.aud === aud);
assert.deepEqual(co("2026-10-26", 0), { week: "2026-10-26", aud: 0, split: "", wk: 0, size: 2, ripe: 2, active: 2, drove: 1, raced: 1 });
assert.equal(co("2026-10-26", 1).active, 1);
assert.equal(co("2026-10-26", 2).active, 0);
assert.equal(co("2026-10-26", 2).ripe, 0, "their third week ends today or tomorrow: not over yet");
assert.equal(co("2026-10-26", 1).ripe, 2);
assert.equal(co("2026-10-26", 3), undefined, "a week that has not begun for anyone has no row");
assert.equal(co("2026-11-02", 1).ripe, 0, "c's second week is still running");
assert.equal(co("2026-10-26", 0, "", 1).size, 3);
for (const k of STEPS) assert.ok(/^[a-z]+$/.test(k));
for (const k of BEHAVIOURS) assert.ok(/^[a-z]+$/.test(k));

// the page's answer
const weeks = weeksBetween("2026-10-26", "2026-11-15");
const ans = metricsAnswer({ rows: built.metrics.filter((x) => x.aud === 0), cohorts: built.cohorts.filter((x) => x.aud === 0), weeks, today: "2026-11-15", links: [{ tag: "reddit-lmu", name: "LMU post", place: "r/LeMansUltimateWEC" }, { tag: "yt-clip", name: "Clip", place: "YouTube" }] });
assert.deepEqual(ans.monday.map((x) => x.k), ["users", "new", "kept", "up7", "raced", "visits_day", "supporters"], "the seven Monday numbers");
const mon = (k) => ans.monday.find((x) => x.k === k);
assert.deepEqual(mon("users").v, [1, 2, 1]);
assert.deepEqual(mon("users").open, [2, 2, 1]);
assert.deepEqual(mon("kept").v, [50, null, null], "a week with no account old enough has no share yet");
assert.deepEqual(mon("kept").open, [50, null, null]);
assert.deepEqual(mon("up7").v, [50, 100, null]);
assert.deepEqual(mon("raced").share, [100, 0, 100]);
assert.equal(mon("visits_day").v[0], 2);
assert.equal(mon("visits_day").v[2], 1, "the week it is divides by its days so far");
assert.deepEqual(mon("users").t, TARGETS.t.users);
// coming back to look, without driving, is not staying: only the second number counts it
{
  const b2 = buildMetrics({ accounts: [{ id: "x", created: T("2026-10-26"), src: "direct", staff: false }], usage: [u("x", "2026-10-26", "view:home"), u("x", "2026-11-03", "view:laps")], sessions: [s("x", "2026-10-26", "lmu")], from: "2026-10-26", today: "2026-11-15" });
  const v2 = (w, m) => (b2.metrics.find((r) => r.week === w && r.aud === 0 && r.metric === m && r.split === "") || { value: 0 }).value;
  assert.equal(v2("2026-10-26", "c:kept"), 0); assert.equal(v2("2026-10-26", "c:kept_open"), 1);
  assert.equal(v2("2026-11-02", "users"), 0); assert.equal(v2("2026-11-02", "opened"), 1);
}
const raced = ans.stay.find((x) => x.k === "raced");
assert.deepEqual([raced.n, raced.kept, raced.rate, raced.restN, raced.restKept, raced.restRate], [1, 1, 100, 1, 0, 0]);
assert.equal(ans.sources[0].src, "chatgpt", "the source whose drivers stayed comes first");
assert.deepEqual(ans.sources.find((x) => x.src === "reddit-lmu"), { src: "reddit-lmu", visits: 4, accounts: 1, up2: 0, mature: 1, kept: 0, kind: "other", link: { name: "LMU post", place: "r/LeMansUltimateWEC" } });
assert.ok(ans.sources.find((x) => x.src === "yt-clip"), "a link nobody used yet is listed with zeros");
assert.deepEqual(ans.steps.rows.find((x) => x.k === "drove").w7, [1, 1, 0]);

// what is written
const have = [{ week: "2026-10-26", aud: 0, metric: "users", split: "", value: 1 }, { week: "2026-10-26", aud: 0, metric: "new", split: "", value: 1 }];
const ch = changedRows(built.metrics, have, metricKey, sameMetric);
assert.ok(!ch.find((x) => metricKey(x) === "2026-10-26|0|users|"), "a number that did not move is not written again");
assert.ok(ch.find((x) => metricKey(x) === "2026-10-26|0|new|"));

// the counters' health
const h = healthOf([{ fam: "view", device: "pc", last: "2026-11-15", users7: 40 }, { fam: "ov", device: "pc", last: "2026-11-10", users7: 2 }], "2026-11-15");
assert.equal(h.find((x) => x.fam === "view" && x.device === "pc").state, "ok");
assert.equal(h.find((x) => x.fam === "ov").state, "quiet", "five days without a row");
assert.equal(h.find((x) => x.fam === "run").state, "never", "a counter that never sent is not a failure");
assert.deepEqual(timelineOf({ created: T("2026-10-26"), usage: [u("a", "2026-10-26", "view:home"), u("a", "2026-10-27", "act:coach_report"), u("a", "2026-11-03", "view:laps", "ios"), u("a", "2026-10-30", "ov:relative")], sessions: [{ day: "2026-10-28", races: 0 }, { day: "2026-10-29", races: 1 }] }).map((x) => x.k + "@" + x.day.slice(5)),
  ["account@10-26", "opened@10-26", "coach@10-27", "drove@10-28", "raced@10-29", "overlay@10-30", "laps@11-03", "second@11-03", "phone@11-03"]);
assert.equal(cleanTag("  LMU post, Nov!  "), "lmu-post-nov");

// the new counter families: kept by the server, out of the features
assert.ok(KEY_RE.test("run:agent") && KEY_RE.test("set:autostart.on") && KEY_RE.test("pro_use:race_fuel") && KEY_RE.test("act:pro_badge.race_fuel"));
assert.deepEqual(cleanUsage({ device: "pc", counts: { "run:agent": 1, "set:autostart.off": 1, "pro_use:race_fuel": 2 } }).counts.length, 3);
const an = analyticsOf(7, [], [{ account_id: "a", device: "pc", key: "run:agent", n: 1, last: "2026-11-15" }, { account_id: "a", device: "pc", key: "live:relative", n: 3, last: "2026-11-15" }, { account_id: "b", device: "web", key: "live:relative", n: 1, last: "2026-11-15" }, { account_id: "a", device: "pc", key: "live:mode.full", n: 3, last: "2026-11-15" }], [], new Map());
assert.deepEqual(an.top, [], "neither is a feature");
assert.deepEqual(an.live[0], { w: "relative", users: 2, days: 4 });
assert.ok(EVENT_RE.test("trial_started") && !EVENT_RE.test("Trial Started"));

// the job on a real database: every migration, then two runs
const db = new DatabaseSync(":memory:");
const dir = new URL("../migrations/", import.meta.url);
for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
const D1 = { prepare(sql) { const st = db.prepare(sql.replace(/\?(\d+)/g, "?$1")); let args = []; const o = { bind(...a) { args = a; return o; }, async all() { return { results: st.all(...args) }; }, async first() { return st.get(...args) || null; }, async run() { const r = st.run(...args); return { meta: { changes: r.changes } }; } }; return o; }, async batch(list) { for (const x of list) await x.run(); } };
const env = { DB: D1 };
for (const a of accounts) db.prepare("INSERT INTO accounts (id, email_hash, auth_salt, auth_hash, wrapped_key, display, created, src) VALUES (?,?,?,?,?,?,?,?)").run(a.id, a.id + "@h", "s", "h", "k", a.id, a.created, a.src);
for (const r of usage) db.prepare("INSERT INTO usage_days (day, account_id, device, key, n) VALUES (?,?,?,?,?)").run(r.day, r.account_id, r.device, r.key, r.n);
for (const [i, x] of sessions.entries()) db.prepare("INSERT INTO sessions (id, started, track, car, kind, game, uploader) VALUES (?,?,?,?,?,?,?)").run("s" + i, x.first, "Spa", "GT3", x.races ? "Race" : "Practice", x.game, x.uploader);
db.prepare("INSERT INTO sessions (id, started, track, car, kind, game, uploader) VALUES ('anon1', ?, 'Spa', 'GT3', 'Practice', 'lmu', 'dev:9')").run(T("2026-11-12"));
const now = T("2026-11-15", 3);
const r1 = await weeklyMetrics(env, { now, staff: (a) => a.id === "t" });
assert.ok(r1.wrote > 50, "the first run writes every row");
const row = (week, metric, split = "", aud = 0) => (db.prepare("SELECT value FROM metrics_weeks WHERE week=? AND aud=? AND metric=? AND split=?").get(week, aud, metric, split) || {}).value;
assert.equal(row("2026-10-26", "users"), 1);
assert.equal(row("2026-10-26", "users", "", 1), 2);
assert.equal(row("2026-10-26", "opened"), 2);
assert.equal(row("2026-10-26", "c:kept"), 1);
assert.equal(row("2026-11-09", "anon_pcs"), 1);
assert.equal(db.prepare("SELECT active FROM cohort_weeks WHERE week='2026-10-26' AND aud=0 AND split='' AND wk=1").get().active, 1);
const r2 = await weeklyMetrics(env, { now, staff: (a) => a.id === "t" });
assert.equal(r2.wrote, 0, "a second run with nothing new writes nothing");
// a session deleted: its numbers go back down
db.prepare("DELETE FROM sessions WHERE uploader='acct:c'").run();
const r3 = await weeklyMetrics(env, { now, staff: (a) => a.id === "t" });
assert.ok(r3.wrote > 0);
assert.equal(row("2026-11-02", "drove", "game:iracing"), 0);
assert.equal(row("2026-11-02", "users"), 1, "a still drove that week");
assert.equal(row("2026-11-02", "c:up7"), 0);
const all = await weeklyMetrics(env, { now, all: true, staff: () => false });
assert.equal(all.from, "2026-08-31", "the backfill starts at the first account or usage, a Monday");
assert.ok(JSON.parse(db.prepare("SELECT v FROM app_state WHERE k='metrics_job'").get().v).at === now);
const D = { prepare: (sql) => ({ bind: (...a) => ({ sql, a }) }) };
assert.equal(eventStmt({ DB: D }, "bad name", "a"), null);
assert.deepEqual(eventStmt({ DB: D }, "pro_paid", "a", { plan: "year" }, 5).a.slice(1), [5, "a", "pro_paid", '{"plan":"year"}']);
console.log("metrics ok");

// the actions the page counts by wrapping a function when it starts: each one must still be a function of the page
// itself (one renamed, or moved to a file loaded later, would stop counting with no error), and the page's own key
// filter lets the same families through as the server's, the agent's ones apart
{
  const html = readFileSync(new URL("../../web/dist/index.html", import.meta.url), "utf8");
  const m = /const USE_LAST=\{\};setTimeout\(\(\)=>(\[\[.*?\]\])\.forEach/.exec(html);
  assert.ok(m, "the list of counted actions");
  const list = JSON.parse(m[1]);
  assert.ok(list.length >= 12);
  for (const [k, fn] of list) {
    assert.ok(new RegExp("(^|[\\n;{}])\\s*(async\\s+)?function\\s+" + fn + "\\s*\\(").test(html), `act:${k} counts ${fn}(), which is no longer a function of index.html`);
    assert.ok(KEY_RE.test("act:" + k));
  }
  const re = /if\(!\/\^\(([a-z_|]+)\):\[a-z0-9_\.-\]\{1,40\}\$\/\.test\(k\)/.exec(html);
  assert.ok(re, "usageCount's key filter");
  for (const fam of re[1].split("|")) assert.ok(KEY_RE.test(fam + ":x"), `the server drops the family ${fam}`);
  for (const k of ["act:pro_badge.", "act:pro_info", "act:pricing_open", "act:donate_shown", "act:donate_bar_shown", "act:donate_pro", "act:invite_copy", "act:invite_share"]) assert.ok(html.includes('usageCount("' + k + '"'), `${k} is counted`);
}
console.log("counters ok");
