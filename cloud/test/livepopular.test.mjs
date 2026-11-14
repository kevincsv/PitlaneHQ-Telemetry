// node cloud/test/livepopular.test.mjs: the Layout window's "Most used by the community" (livepopular.js) ranks the
// Telemetry panels by accounts, answers only past MIN accounts, keeps the modes apart, and its SQL runs on usage_days.
import assert from "node:assert/strict";
import { popularOf, livePopular, resetLiveMemo, SQL_LIVE_KEYS, SQL_LIVE_ACCOUNTS, MIN, DAYS } from "../src/livepopular.js";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

// too few accounts: no panels, the preset stays off
const few = popularOf([{ key: "live:relative", n: 3 }], 3);
assert.equal(few.ready, false);
assert.equal(few.accounts, 3);
assert.equal(few.min, MIN);
assert.deepEqual(few.panels, []);
assert.deepEqual(few.top, []);

// enough: ranked by accounts, the modes apart, junk dropped, top is what half of them show
const rows = [{ key: "live:map", n: 18 }, { key: "live:relative", n: 30 }, { key: "live:radar", n: 4 }, { key: "live:mode.full", n: 12 }, { key: "live:mode.basic", n: 25 },
  { key: "live:mode.x", n: 9 }, { key: "live:Bad Key", n: 9 }, { key: "view:live", n: 40 }, { key: "live:fuel", n: 15 }];
const ok = popularOf(rows, 30);
assert.equal(ok.ready, true);
assert.equal(ok.days, DAYS);
assert.deepEqual(ok.panels.map((p) => p.w), ["relative", "map", "fuel", "radar"]);
assert.deepEqual(ok.panels[0], { w: "relative", accounts: 30, share: 1 });
assert.deepEqual(ok.top, ["relative", "map", "fuel"], "a panel half the accounts show is in, fewer is out");
assert.deepEqual(ok.modes, { full: 12, basic: 25 });
assert.equal(popularOf(null, 0).ready, false, "no rows is no answer");

// the SQL on a real usage_days (migration 0070): distinct accounts, only the last DAYS days, only live: keys
const db = new DatabaseSync(":memory:");
db.exec(readFileSync(new URL("../migrations/0070_usage_feedback.sql", import.meta.url), "utf8"));
const ins = db.prepare("INSERT INTO usage_days (day, account_id, device, key, n) VALUES (?,?,?,?,?)");
const today = new Date().toISOString().slice(0, 10), old = new Date(Date.now() - 60 * 86400e3).toISOString().slice(0, 10);
for (let i = 0; i < 25; i++) {
  ins.run(today, "a" + i, "web", "live:relative", 1);
  ins.run(today, "a" + i, "pc", "live:relative", 2); // the same account on two devices is one account
  if (i < 10) ins.run(today, "a" + i, "web", "live:map", 1);
  ins.run(today, "a" + i, "web", "live:mode.basic", 1);
  ins.run(today, "a" + i, "web", "view:live", 1);
}
ins.run(old, "z", "web", "live:radar", 1);
const from = new Date(Date.now() - (DAYS - 1) * 86400e3).toISOString().slice(0, 10);
const keys = db.prepare(SQL_LIVE_KEYS.replace("?1", "?")).all(from);
const accs = db.prepare(SQL_LIVE_ACCOUNTS.replace("?1", "?")).get(from);
assert.equal(accs.n, 25);
const got = popularOf(keys, accs.n);
assert.deepEqual(got.panels.map((p) => [p.w, p.accounts]), [["relative", 25], ["map", 10]], "old days are left out");
assert.deepEqual(got.top, ["relative"]);
assert.deepEqual(got.modes, { basic: 25 });

// the route reads once and then answers from memory
let reads = 0;
const env = { LOCAL: "1", DB: { prepare: (sql) => ({ bind: (...a) => ({ all: async () => { reads++; return { results: db.prepare(sql.replace("?1", "?")).all(...a) }; }, first: async () => { reads++; return db.prepare(sql.replace("?1", "?")).get(...a); } }) }) } };
resetLiveMemo();
const r1 = await livePopular(env), r2 = await livePopular(env);
assert.equal(r1.ready, true);
assert.deepEqual(r1, r2);
assert.equal(reads, 2, "two grouped reads, then the memory");
console.log("livepopular: ok");
