// node cloud/test/uninstall.test.mjs: the page the uninstaller opens and its answer (uninstall.js). The page speaks
// English, Spanish and Portuguese with no text about how data is protected; an answer keeps only the known reasons,
// needs a reason or some text, is kept as a feedback row of kind "uninstall" with no account (on an in-memory SQLite
// behind a small D1-like wrapper), is limited per network and day, and its email says it was an uninstall.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { uninstallRoute, uninstallPage, uninstallLang, cleanUninstall, REASONS, UNINSTALL_PER_DAY } from "../src/uninstall.js";
import { feedbackMail } from "../src/email.js";

// the answer
assert.equal(cleanUninstall(null).error, "missing body");
assert.equal(cleanUninstall({ reasons: ["nope"], text: "  " }).error, "choose a reason or write something first");
assert.ok(cleanUninstall({ text: "x".repeat(4001) }).error);
const a = cleanUninstall({ reasons: ["slow", "bugs", "bugs", "<b>"], text: " Too heavy\r\nfor my rig ", v: "0.9.9<x>" });
assert.deepEqual(a.reasons, ["bugs", "slow"], "known reasons only, once, in the page's order");
assert.equal(a.text, "Bugs or crashes · It slows down my PC or my game\n\nToo heavy\nfor my rig");
assert.equal(a.style, "bugs,slow");
assert.equal(a.kind, "uninstall");
assert.equal(a.device, "pc");
assert.equal(a.v, "0.9.9x");
assert.equal(cleanUninstall({ text: "only words" }).text, "only words");
assert.equal(cleanUninstall({ reasons: ["other"] }).text, "Something else");

// the page
const get = (path, al = "") => { const req = new Request("https://pitlanehq.app" + path, { headers: { "accept-language": al } }); return [req, new URL(req.url)]; };
assert.equal(uninstallLang(...get("/uninstalled?lang=pt")), "pt");
assert.equal(uninstallLang(...get("/uninstalled", "de-DE,es;q=0.8")), "es");
assert.equal(uninstallLang(...get("/uninstalled?lang=de", "de-DE")), "en", "no German");
for (const l of ["en", "es", "pt"]) {
  const html = uninstallPage(l, "0.9.9");
  for (const k of Object.keys(REASONS)) { assert.ok(html.includes(`value="${k}"`), k); assert.ok(REASONS[k][l], k + " " + l); }
  assert.match(html, /noindex/);
  const text = html.replace(/<style>[\s\S]*?<\/style>|<script>[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
  assert.ok(!/encrypt|cifra|criptograf|sealed|sellad/i.test(text), "no text about how data is protected (" + l + ")");
  assert.ok(!/[;:]/.test(text.replace(/&[a-z]+;/g, "")), "no ; or : (" + l + ")");
}
assert.match(uninstallPage("es", '0.9.9"</script>'), /V="0\.9\.9script"/, "the version cannot break out of the script");

// the routes
const db = new DatabaseSync(":memory:");
for (const n of ["0070_usage_feedback.sql", "0073_overlay_feedback.sql", "0093_feedback_discord.sql"]) db.exec(readFileSync(new URL("../migrations/" + n, import.meta.url), "utf8"));
db.exec(readFileSync(new URL("../migrations/0095_installs_donations.sql", import.meta.url), "utf8").split("-- a Stripe")[0]);
const stmt = (sql) => {
  const s = { args: [], bind(...x) { s.args = x; return s; },
    first: async () => { const r = db.prepare(sql).get(...s.args); return r ? { ...r } : null; },
    all: async () => ({ results: db.prepare(sql).all(...s.args).map((x) => ({ ...x })) }),
    run: async () => { const r = db.prepare(sql).run(...s.args); return { meta: { changes: r.changes } }; } };
  return s;
};
const env = { DB: { prepare: stmt } };
const call = (path, method = "GET", body, ip = "203.0.113.7") => {
  const req = new Request("https://pitlanehq.app" + path, { method, headers: { "cf-connecting-ip": ip, "user-agent": "Mozilla/5.0", "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return uninstallRoute(req, env, new URL(req.url));
};
assert.equal(await call("/privacy"), null);
const page = await call("/uninstalled?v=0.9.9&lang=es");
assert.equal(page.status, 200);
assert.match(await page.text(), /¿Por qué has desinstalado Pitlane HQ\?/);
assert.equal((await call("/community/feedback/uninstall/shown", "POST", { v: "0.9.9" })).status, 204, "the page counts itself once it runs");
assert.deepEqual(db.prepare("SELECT kind, v, n FROM pc_days").all().map((r) => ({ ...r })), [{ kind: "uninstall", v: "0.9.9", n: 1 }], "the page itself is not counted, its script is");
assert.equal((await call("/community/feedback/uninstall", "POST", { reasons: [] })).status, 400);
for (let i = 0; i < UNINSTALL_PER_DAY; i++) assert.equal((await call("/community/feedback/uninstall", "POST", { reasons: ["hard"], text: "t" + i, v: "0.9.9" })).status, 200);
assert.equal((await call("/community/feedback/uninstall", "POST", { reasons: ["hard"] })).status, 429, "3 a day per network");
assert.equal((await call("/community/feedback/uninstall", "POST", { reasons: ["game"] }, "198.51.100.1")).status, 200, "another network");
const rows = db.prepare("SELECT * FROM feedback ORDER BY created").all();
assert.equal(rows.length, UNINSTALL_PER_DAY + 1);
assert.ok(rows.every((r) => r.kind === "uninstall" && r.device === "pc" && r.view === "uninstall" && /^uninstall:[0-9a-f]{16}$/.test(r.account_id)));
assert.ok(!rows.some((r) => r.account_id.includes("203.0.113.7")), "never the address");
assert.notEqual(rows[0].account_id, rows.at(-1).account_id);
assert.equal(rows[0].text, "Hard to use\n\nt0");
assert.equal(rows[0].style, "hard");

// the email
const m = feedbackMail({ ...a, nick: "", accountId: "" });
assert.equal(m.subject, "Pitlane HQ uninstalled · version 0.9.9x");
assert.match(m.text, /^Bugs or crashes/);
console.log("uninstall ok");
