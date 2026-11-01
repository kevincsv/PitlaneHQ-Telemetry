// node cloud/test/pcstats.test.mjs: the admin Analytics' installs, uninstalls and supporters (pcstats.js). The page the
// uninstaller opens and the installer's download are counted per day (robots and resumed downloads not), an
// uninstall is a page shown or, before they were counted, an answer; the reasons and what drivers wrote come from the
// answers; the supporters are split by Stripe, by hand and Patreon (legacy), and refunded donations do not count.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { installsOf, supportersOf } from "../src/pcstats.js";
import { uninstallRoute } from "../src/uninstall.js";
import { downloads } from "../src/downloads.js";
import { highlightsOf } from "../src/usagelib.js";
import { hiText } from "../src/usagenames.js";

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
const env = { DB: { prepare: stmt }, DL: { get: async () => ({ body: "x", size: 1, text: async () => "{}" }) } };
const req = (path, h = {}) => { const r = new Request("https://pitlanehq.app" + path, { headers: { "user-agent": "Mozilla/5.0", ...h } }); return [r, env, new URL(r.url)]; };

await uninstallRoute(...req("/uninstalled?v=0.9.11&lang=es"));
await uninstallRoute(...req("/uninstalled?v=0.9.11"));
await uninstallRoute(...req("/uninstalled?v=0.9.11", { "user-agent": "Googlebot/2.1" }));
await downloads(...req("/dl/PitlaneHQ-Setup.exe"));
await downloads(...req("/dl/PitlaneHQ-Setup.exe", { range: "bytes=1000-" }));
await downloads(...req("/dl/beta/PitlaneHQ-Setup.exe"));
await downloads(...req("/dl/PitlaneHQ-windows.zip"));
const rows = db.prepare("SELECT kind, v, n FROM pc_days ORDER BY kind, v").all().map((x) => ({ ...x }));
assert.deepEqual(rows, [{ kind: "download", v: "", n: 1 }, { kind: "download", v: "beta", n: 1 }, { kind: "uninstall", v: "0.9.11", n: 2 }], "robots, resumed downloads and updates are not counted");

// installs and uninstalls
const I = installsOf({ from: "2026-11-01",
  pcRows: [{ day: "2026-11-01", kind: "download", v: "", n: 4 }, { day: "2026-11-01", kind: "download", v: "beta", n: 1 }, { day: "2026-11-02", kind: "uninstall", v: "0.9.11", n: 2 }, { day: "2026-10-20", kind: "download", v: "", n: 3 }],
  answers: [{ day: "2026-10-31", created: 1, v: "0.9.10", style: "bugs", text: "Bugs or crashes" },
    { day: "2026-11-01", created: 2, v: "0.9.11", style: "bugs,slow", text: "Bugs or crashes · It slows down my PC or my game\n\nToo heavy" },
    { day: "2026-11-02", created: 3, v: "0.9.11", style: "slow", text: "It slows down my PC or my game" },
    { day: "2026-11-02", created: 4, v: "0.9.11", style: null, text: "only words" }] });
assert.equal(I.downloads, 5); assert.equal(I.downloadsBeta, 1); assert.equal(I.prevDownloads, 3);
assert.equal(I.uninstalls, 3, "the pages shown, or the answers of a day with more answers than pages");
assert.equal(I.prevUninstalls, 1); assert.equal(I.answered, 3); assert.equal(I.prevAnswered, 1);
assert.deepEqual(I.reasons.map((x) => [x.k, x.n]), [["slow", 2], ["bugs", 1]]);
assert.deepEqual(I.reasons[0].name, ["It slows down my PC or my game", "Hace ir lento mi PC o mi juego", "Deixa meu PC ou meu jogo lento"]);
assert.deepEqual(I.said.map((x) => x.text), ["only words", "Too heavy"], "what they wrote, without the reasons' line");
assert.deepEqual(I.byVersion, [{ v: "0.9.11", n: 2 }]);
assert.deepEqual(I.perDay, [{ day: "2026-11-01", downloads: 5, uninstalls: 1 }, { day: "2026-11-02", downloads: 0, uninstalls: 2 }]);

// supporters
const t0 = 1000;
const S = supportersOf({ t0, patrons: 1,
  badges: [{ src: "stripe", n: 2 }, { src: "manual", n: 2 }, { src: "patreon", n: 1 }, { src: null, n: 1 }],
  orders: [{ at: 1500, status: "on", amount: 500, currency: "usd", account_id: "a1", name: "Ana" }, { at: 1600, status: "on", amount: 100, currency: "usd", account_id: null },
    { at: 1700, status: "on", amount: 300, currency: "eur", account_id: "a2", name: "Bo" }, { at: 1800, status: "refunded", amount: 900, currency: "usd", account_id: "a3" },
    { at: 500, status: "on", amount: 200, currency: "usd", account_id: "a4" }] });
assert.deepEqual([S.total, S.stripe, S.manual, S.patreon, S.patrons], [6, 2, 3, 1, 1]);
assert.deepEqual([S.donations, S.prevDonations, S.waiting, S.refunded], [3, 1, 1, 1]);
assert.deepEqual(S.amounts, [{ currency: "usd", amount: 600 }, { currency: "eur", amount: 300 }], "refunds do not count");
assert.deepEqual(S.prevAmounts, [{ currency: "usd", amount: 200 }]);
assert.equal(S.recent[0].name, "Bo");

// what stands out
const hs = highlightsOf({ days: 30, totals: { active: 1 }, prev: {}, installs: I, supporters: S, byDevice: [{ device: "android", users: 1 }, { device: "ios", users: 1 }] });
const un = hs.find((h) => h.k === "uninstalls_why"), dn = hs.find((h) => h.k === "donations");
assert.ok(un && dn);
assert.equal(hiText(un.k, un.a)[0], 'The agent was uninstalled 3 times in these 30 days, most often because "It slows down my PC or my game".');
assert.equal(hiText(dn.k, dn.a)[1], "Llegaron 3 donaciones por Stripe en estos 30 días.");
console.log("pcstats ok");
