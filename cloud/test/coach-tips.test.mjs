// node cloud/test/coach-tips.test.mjs: what the apps send about the coach is kept (coachtips.js). A session's start is
// in milliseconds (1.8e12 in 2026): the tips of a lap, a thumb on a tip and a vote on the plan all carry it.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { register } from "node:module";
// the server's JSON files are imported the Worker's way (no import attribute)
register("data:text/javascript," + encodeURIComponent(`export async function load(u, c, n) { return u.endsWith(".json") ? n(u, { ...c, importAttributes: { type: "json" } }) : n(u, c); }`));
const { coachTipRoutes } = await import("../src/coachtips.js");

const db = new DatabaseSync(":memory:");
const dir = new URL("../migrations/", import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
const stmt = (q, a = []) => ({ bind: (...x) => stmt(q, x), all: async () => ({ results: db.prepare(q).all(...a) }), first: async () => db.prepare(q).get(...a) || null, run: async () => db.prepare(q).run(...a) });
const env = { DB: { prepare: (q) => stmt(q), batch: async (l) => { for (const s of l) await s.run(); } } };
const tok = "t".repeat(48);
db.prepare("INSERT INTO accounts (id, email_hash, auth_salt, auth_hash, wrapped_key, display, created) VALUES ('a1','e','s','h','w','D',1)").run();
db.prepare("INSERT INTO account_sessions (id, account_id, token_hash, created, last_seen) VALUES ('s1','a1',?,?,?)").run(createHash("sha256").update(tok).digest("hex"), Date.now(), Date.now());
const call = async (p, body) => {
  const r = await coachTipRoutes(new Request("https://x/community" + p, { method: "POST", headers: { authorization: "Bearer " + tok } }), env, p, "POST", body, "iracing");
  return [r.status, await r.json()];
};
const started = Date.UTC(2026, 10, 16, 12), at = { trackId: 10, carId: 20, sid: "ses1", started, cat: "road" };

let [st, j] = await call("/coach/tips", { ...at, ref: "own", lap: 90.1, flags: [], corners: [{ n: 1, d: 100, apex: 200, kind: "brake", cls: "slow", lost: 0.2, ta: 5, tb: 4.8, tbest: 5, dd: 10 }] });
assert.equal(st, 200, JSON.stringify(j));
assert.equal(j.kept, 1, "the lap's tips are kept");
let row = db.prepare("SELECT src, kind, started FROM coach_tips").get();
assert.equal(row.src, "app", "kept as what the driver saw");
assert.equal(row.started, started);

[st, j] = await call("/coach/rate", { ...at, n: 1, apex: 200, kind: "brake", cls: "slow", up: 1 });
assert.equal(st, 200, "a thumb on a tip: " + JSON.stringify(j));
assert.equal(db.prepare("SELECT rating FROM coach_tips WHERE n=1").get().rating, 1);

[st, j] = await call("/coach/planrate", { ...at, step: "plan", up: -1 });
assert.equal(st, 200, "a vote on the plan: " + JSON.stringify(j));
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM coach_plan_votes").get().n, 1);

[st] = await call("/coach/tips", { ...at, started: 1.5, corners: [] });
assert.equal(st, 400, "a start that is not a whole number");
console.log("coach tips: ok");
