// node cloud/test/fuel.test.mjs: Race fuel learns from everyone. Each session keeps its fuel a lap (migration 0101, the
// daily FUEL_SUMS), GET /community/fuel gives the median driver of a car and track with three drivers at least, and the
// analysis module mixes it with the driver's own laps (fuelUse, ctx.comm)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { FUEL_SUMS, fuelSince, fuelOf, communityFuel, MIN_DRIVERS } from "../src/fuel.js";

const db = new DatabaseSync(":memory:");
db.exec(`CREATE TABLE sessions (id TEXT PRIMARY KEY, started INTEGER NOT NULL, track TEXT, car TEXT, laps INTEGER DEFAULT 0, uploader TEXT,
  game TEXT, track_id INTEGER, car_id INTEGER, tank REAL);
  CREATE TABLE laps (id TEXT PRIMARY KEY, session_id TEXT, n INTEGER, time REAL, valid INTEGER, fuel REAL, drv TEXT);`);
const stmt = (sql) => {
  const s = { args: [], bind(...a) { s.args = a; return s; },
    first: async () => db.prepare(sql).get(...s.args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...s.args) }),
    run: async () => db.prepare(sql).run(...s.args) };
  return s;
};
const DB = { prepare: stmt }, now = Date.UTC(2026, 10, 14, 3);
const ses = (id, up, started, laps, tank = 60, track = 1, car = 2, game = "iracing") => {
  db.prepare("INSERT INTO sessions (id, started, uploader, game, track_id, car_id, laps, tank) VALUES (?,?,?,?,?,?,?,?)").run(id, started, up, game, track, car, laps.length, tank);
  laps.forEach(([t, f], i) => db.prepare("INSERT INTO laps VALUES (?,?,?,?,?,?,?)").run(`${id}-${i}`, id, i + 1, t, 1, f, null));
};
// an old session: the migration fills it. The slow lap (pit stop, safety car) and the refuelled one (no fuel) are left out
ses("old", "acct:a", now - 864e5 * 30, [[100, 2.5], [101, 2.6], [130, 1.2], [100.5, 0]]);
ses("one", "acct:b", now - 864e5 * 30, [[100, 2.4]]);
db.exec(readFileSync(new URL("../migrations/0101_community_fuel.sql", import.meta.url), "utf8"));
const row = (id) => ({ ...db.prepare("SELECT fuel, fuel_n, fuel_t FROM sessions WHERE id=?").get(id) });
assert.deepEqual(row("old"), { fuel: 2.55, fuel_n: 2, fuel_t: 100.5 });
assert.deepEqual(row("one"), { fuel: null, fuel_n: null, fuel_t: null }, "one lap is not enough");
// the daily pass keeps the sessions of the last two days and leaves the older ones alone
ses("b1", "acct:b", now - 3600e3, [[99, 2.7], [99.5, 2.7], [100, 2.7]]);
db.prepare("UPDATE sessions SET fuel=9 WHERE id='old'").run();
await stmt(FUEL_SUMS).bind(fuelSince(now)).run();
assert.ok(Math.abs(row("b1").fuel - 2.7) < 1e-9); assert.equal(row("b1").fuel_n, 3); assert.equal(row("old").fuel, 9, "older than two days: untouched");
db.prepare("UPDATE sessions SET fuel=2.55 WHERE id='old'").run();

// fewer than three drivers: only how many
assert.equal(MIN_DRIVERS, 3);
assert.deepEqual(await communityFuel({ DB, LOCAL: "1" }, "iracing", 1, 2, now), { drivers: 2 });
ses("c1", "acct:c", now - 7200e3, [[98, 2.4], [98, 2.4]], 59.9);
// a fourth driver, with two sessions that count as one driver (their laps together), on another game too (left out)
ses("d1", "acct:d", now - 864e5 * 3, [[101, 2.6], [101, 2.6]]);
ses("d2", "acct:d", now - 864e5 * 4, [[101, 2.4], [101, 2.4]]);
ses("lmu", "acct:e", now - 864e5, [[101, 9], [101, 9]], 60, 1, 2, "lmu");
await stmt(FUEL_SUMS).bind(now - 864e5 * 10).run();
const c = await communityFuel({ DB, LOCAL: "1" }, "iracing", 1, 2, now);
assert.deepEqual(c, { drivers: 4, laps: 2 + 3 + 2 + 4, perLap: 2.525, lapTime: 100, tank: 60 }, "the median of a 2.55, b 2.7, c 2.4 and d 2.5");
// a year back at most
assert.equal(fuelOf([{ uploader: "x", fuel: 3, fuel_n: 2 }]).drivers, 1);
assert.equal((await communityFuel({ DB, LOCAL: "1" }, "iracing", 1, 2, now + 864e5 * 400)).drivers, 0);

// the module: everyone's figure when you have no laps here, yours mixed with it as three more laps when you have some
const src = readFileSync(new URL("../../web/dist/pitwall-analysis.js", import.meta.url), "utf8");
const g = {}; new Function("window", "self", "globalThis", src)(g, g, g);
const PW = Object.values(g).find((v) => v && v.fuelUse);
const lap = (n, fuel, time = 100) => ({ n, fuel, time });
assert.equal(PW.fuelUse([lap(1, 2.5)], {}), null, "one lap and nobody else: nothing");
const only = PW.fuelUse([lap(1, 2.5)], { comm: c });
assert.deepEqual([only.perLap, only.maxLap, only.tank, only.own, only.comm, only.lapTime], [2.525, null, 60, 0, 4, 100], "everyone's, the tank too");
const mix = PW.fuelUse([lap(1, 2.3), lap(2, 2.3), lap(3, 2.3)], { tank: 50, comm: c });
assert.deepEqual([mix.perLap, mix.maxLap, mix.tank, mix.own, mix.comm], [2.412, 2.3, 50, 3, 4], "half and half with three laps, your own tank");
assert.equal(PW.fuelUse([lap(1, 2.3), lap(2, 2.3)], { comm: { drivers: 2, perLap: 3 } }).perLap, 2.3, "two drivers are not enough");
assert.ok(PW.fuelPlan(only, { laps: 40 }).stops === 1, "a plan from everyone's figure and tank");
console.log("fuel ok");
