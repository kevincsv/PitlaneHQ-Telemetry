// node cloud/test/winback.test.mjs: the admin page's Activity list and the "we miss you" email (winbacklib.js)
import assert from "node:assert/strict";
import { activityOf, activitySummary, canWinback, winbackMail, DAY } from "../src/winbacklib.js";

const now = Date.parse("2026-11-14T15:00:00Z"), d = (n) => new Date(now - n * DAY).toISOString().slice(0, 10);
const accounts = [
  { id: "busy", display: "Busy", created: now - 90 * DAY },
  { id: "gone", display: "Gone", created: now - 80 * DAY },
  { id: "sent", display: "Sent", created: now - 80 * DAY, winback_at: now - 5 * DAY },
  { id: "nomail", display: "NoMail", created: now - 60 * DAY },
  { id: "boss", display: "Boss", created: now - 60 * DAY },
  { id: "new", display: "New", created: now - 2 * DAY },
];
const list = activityOf({
  now, accounts,
  signins: [{ account_id: "gone", t: now - 40 * DAY }, { account_id: "sent", t: now - 50 * DAY }, { account_id: "nomail", t: now - 20 * DAY }, { account_id: "boss", t: now - 30 * DAY }],
  presence: [{ account_id: "busy", kind: "desktop", t: now - 60e3 }],
  usageDays: [{ account_id: "busy", day: d(1), device: "web" }, { account_id: "busy", day: d(2), device: "android" }, { account_id: "gone", day: d(45), device: "web" }],
  usageLast: [{ account_id: "busy", day: d(1) }, { account_id: "gone", day: d(45) }],
  sessions: [{ uploader: "acct:busy", started: now - 3 * DAY, laps: 12, secs: 1800 }, { uploader: "acct:busy", started: now - 1 * DAY, laps: 8, secs: 900 }],
  sessionsLast: [{ uploader: "acct:busy", t: now - 1 * DAY, n: 40 }, { uploader: "acct:gone", t: now - 41 * DAY, n: 5 }],
  driving: [{ uploader: "acct:busy", game: "lmu", track: "Spa", car: "BMW", started: now - 30 * 60e3, secs: 1500, up_at: now - 2 * 60e3 }],
  langs: [{ account_id: "gone", lang: "es" }, { account_id: "nomail", lang: "de" }],
  emails: new Map([["gone", "g@x.io"], ["sent", "s@x.io"], ["boss", "b@x.io"], ["busy", "u@x.io"]]),
  admins: new Set(["boss"]),
});
const by = Object.fromEntries(list.map((x) => [x.id, x]));
assert.equal(list[0].id, "busy", "the most active first");
assert.equal(by.busy.days30, 3, "app days and driven days together, each day once");
assert.equal(by.busy.laps30, 20);
assert.equal(by.busy.hours30, 0.8);
assert.deepEqual(by.busy.devices, ["android", "pc", "web"]);
assert.ok(by.busy.online && by.busy.driving && by.busy.driving.track === "Spa", "on track now");
assert.equal(by.gone.awayDays, 40, "the latest of every sign");
assert.equal(by.gone.droveDays, 41, "gone is counted from the last session (the owner's rule: not driving)");
assert.equal(by.busy.sessions, 40, "sessions in all");
assert.equal(by.busy.drove30, 2, "days driven in 30");
assert.equal(by.busy.droveDays, 0);
assert.equal(by.nomail.droveDays, 60, "never drove: from its creation");
assert.equal(by.gone.lang, "es");
assert.equal(by.nomail.lang, "en", "only English, Spanish and Portuguese");
assert.equal(by.new.awayDays, 2, "an account never used counts from its creation");
assert.ok(canWinback(by.gone));
assert.ok(!canWinback(by.sent), "once per account");
assert.ok(!canWinback(by.nomail), "no email known");
assert.ok(!canWinback(by.boss), "never the admins");
assert.ok(!canWinback(by.busy), "not someone using it");
assert.ok(!canWinback(by.gone, 60), "the chosen number of days");
const s = activitySummary(list);
assert.deepEqual([s.accounts, s.driving, s.online, s.away, s.canEmail, s.emailed, s.droveWeek], [6, 1, 1, 4, 1, 1, 1]);
assert.ok(canWinback({ ...by.gone, awayDays: 0, online: false }), "signing in without driving is still gone");

const es = winbackMail("es", "Carlos<script>"), de = winbackMail("de", "");
assert.equal(es.lang, "es");
assert.ok(es.text.startsWith("Hola Carlos script,"));
assert.equal(de.lang, "en");
assert.ok(de.text.startsWith("Hi,\n"));
assert.equal(es.link, "https://pitlanehq.app/app?feedback=1");
for (const l of ["en", "es", "pt"]) assert.ok(!/;|encrypt|cifr|cript/i.test(winbackMail(l, "A").text), l + ": no ; and nothing about encryption");
console.log("winback ok");
