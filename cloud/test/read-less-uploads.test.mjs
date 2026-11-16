// node cloud/test/read-less-uploads.test.mjs: what the server audit of 2026-11-15 found reading whole tables
// - a lap upload looks for provisional ids by index, never through every session and shared lap (reconcileIds)
// - the admin's Users list counts an account's Drinks drivers by index (migration 0107)
// - what there is of Le Mans Ultimate is read once in five minutes for a server, whatever env each request gets
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { reconcileIds, pseudoId } from "../src/model.js";
import { seoPage } from "../src/seo.js";

const dir = new URL("../migrations/", import.meta.url);
const db = new DatabaseSync(":memory:");
for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));

// every statement the code runs, with the plan the database picks for it
const seen = [];
const stmt = (sql) => {
  const s = { args: [], bind(...a) { s.args = a; return s; },
    first: async () => { seen.push(sql); return db.prepare(sql).get(...s.args) ?? null; },
    all: async () => { seen.push(sql); return { results: db.prepare(sql).all(...s.args) }; },
    run: async () => { seen.push(sql); const r = db.prepare(sql).run(...s.args); return { meta: { changes: Number(r.changes) } }; } };
  return s;
};
const DB = { prepare: stmt, batch: async (qs) => { const out = []; for (const q of qs) out.push(await q.run()); return out; } };
const plan = (sql) => db.prepare("EXPLAIN QUERY PLAN " + sql.replace(/\?\d+/g, "1")).all().map((x) => x.detail).join(" | ");

// an upload with real ids and nothing under provisional ones: six lookups, each by an index
await reconcileIds({ DB }, "iracing", "Spa", "GP", "Porsche 911 GT3 R", 523, 169);
assert.equal(seen.length, 6, "the three tables, by track and by car");
for (const sql of seen) assert.match(plan(sql), /^SEARCH \w+ USING (COVERING )?INDEX/, `by index: ${sql} → ${plan(sql)}`);

// what was shared under provisional ids still moves to the real ones
const pt = await pseudoId("t", "iracing", "Spa · GP"), pc = await pseudoId("c", "iracing", "Porsche 911 GT3 R");
db.prepare("INSERT INTO sessions (id, started, track, track_config, car, game, track_id, car_id) VALUES ('s1', 1, 'Spa', 'GP', 'Porsche 911 GT3 R', 'iracing', ?, ?)").run(pt, pc);
await reconcileIds({ DB }, "iracing", "Spa", "GP", "Porsche 911 GT3 R", 523, 169);
assert.deepEqual({ ...db.prepare("SELECT track_id, car_id FROM sessions WHERE id='s1'").get() }, { track_id: 523, car_id: 169 });
// a car alone under a provisional id (the track had its real one) moves too
db.prepare("INSERT INTO sessions (id, started, track, track_config, car, game, track_id, car_id) VALUES ('s2', 1, 'Spa', 'GP', 'Porsche 911 GT3 R', 'iracing', 523, ?)").run(pc);
await reconcileIds({ DB }, "iracing", "Spa", "GP", "Porsche 911 GT3 R", 523, 169);
assert.equal(db.prepare("SELECT car_id FROM sessions WHERE id='s2'").get().car_id, 169);

// the Users list's count of an account's Drinks drivers
assert.match(plan("SELECT COUNT(*) FROM community_users g WHERE g.owner=?1 AND g.id LIKE 'guest-%'"), /community_users_owner/);

// the memo of what there is of Le Mans Ultimate: one read for a server, though every request has an env of its own
let asked = 0;
const none = { prepare(sql) { const o = { bind: () => o, all: async () => ({ results: [] }), first: async () => { if (/game='lmu'/.test(sql)) asked++; return null; }, run: async () => ({ meta: {} }) }; return o; } };
const root = { LOCAL: "1" };
for (let i = 0; i < 3; i++) { const url = new URL("https://pitlanehq.app/pricing"); await seoPage(new Request(url), { ...root, ROOT: root, DB: none }, url); }
assert.equal(asked, 1, "read once, kept for the server");

console.log("read less on uploads ok");
