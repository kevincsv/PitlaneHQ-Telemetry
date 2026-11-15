// node cloud/test/turnsref.test.mjs: a circuit's real turns (their numbers, directions and names, turnsref-data.js) land
// on the right corners of its layout, on another game's layout of the same circuit and on a layout whose line moved,
// and never on a layout that is another track. The layouts are the server's own (turnsref.fixture.json).
import assert from "node:assert/strict";
import fs from "node:fs";
import { REF, bends, placeRef, refFor, refTurns, refNames } from "../src/turnsref.js";
import { NOT } from "../src/turnsref-data.js";
import { turnsFromPath } from "../src/trackgeo.js";

const LAY = JSON.parse(fs.readFileSync(new URL("./turnsref.fixture.json", import.meta.url), "utf8"));
const at = (id) => { const [game, tid] = id.split(":"), l = LAY[id]; return { game, tid: +tid, ...l, n: l.x.length, L: l.x.length * 5 }; };
const metres = (id) => { const l = at(id), r = refTurns(l.game, l.tid, l.track, l.x, l.y); assert.ok(r, id + " has its real turns"); return { ...r, m: r.turns.map((f) => Math.round(f * l.L)) }; };
const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= tol, `${what}: ${got} m, expected about ${want} m`);

// ---- the reference itself ----
{
  const seen = new Set(), keys = new Set();
  for (const r of REF) {
    assert.ok(!keys.has(r.key), "one entry per key: " + r.key); keys.add(r.key);
    assert.ok(r.len > 500 && r.ids.length >= 1 && r.t.length >= 2 && r.t.length <= 60, r.key + " is whole");
    for (const id of r.ids) { assert.ok(!seen.has(id), id + " belongs to one layout only"); seen.add(id); assert.ok(!NOT.includes(id), id + " is not also refused"); }
    r.t.forEach((t, i) => {
      assert.ok(["L", "R", "X"].includes(t[1]) && (t[2] === 0 || t[2] === 1) && typeof t[3] === "string", `${r.key} T${i + 1} reads`);
      assert.ok(t[0] >= 0 && t[0] < r.len && (i === 0 || t[0] > r.t[i - 1][0]), `${r.key} T${i + 1} comes after T${i} within the lap`);
      assert.ok(t[1] !== "X" || t[2] === 0, `${r.key} T${i + 1}: a turn with no bend is never a clear corner`);
    });
    for (const w of r.match || []) assert.equal(w, w.toLowerCase().replace(/[^a-z0-9 ]/g, ""), r.key + ": match words are plain lower case");
  }
}

// ---- Spa: the Kemmel kink has no number, Pouhon counts twice ----
{
  const l = at("iracing:523"), s = metres("iracing:523");
  assert.equal(s.key, "spa");
  assert.equal(s.m.length, 19);
  near(s.m[0], 390, 15, "T1 La Source");
  near(s.m[4], 2410, 15, "T5 Les Combes");
  assert.ok(s.m[4] > 2000, "T5 is not the kink on the Kemmel straight");
  near(s.m[9], 3805, 40, "T10 Pouhon"); near(s.m[10], 4015, 40, "T11 Pouhon");
  near(s.m[16], 6160, 15, "T17 Blanchimont");
  assert.deepEqual([s.names[0], s.names[4], s.names[7], s.names[16]], ["La Source", "Les Combes", "Bruxelles", "Blanchimont"]);
  // what the geometry alone did: the kink took T5 and every turn after it was one number late
  const old = turnsFromPath(l.x, l.y, 19).map((f) => Math.round(f * l.L));
  assert.ok(old[4] < 1700, "the geometry alone numbers the Kemmel kink (the bug this reference fixes)");
  // every clear corner sits on a bend of the layout that turns its way
  const B = bends(l.x, l.y), ref = refFor("iracing", 523);
  ref.t.forEach((t, i) => {
    if (t[2] !== 1) return;
    const b = B.find((x) => x.from * 5 - 10 <= s.m[i] && s.m[i] <= x.to * 5 + 10 && x.dir === t[1]);
    assert.ok(b && b.deg >= 20, `T${i + 1} is on a ${t[1]} bend`);
  });
}

// ---- the same circuit in another game: another line, another drawing of the same corners ----
{
  const s = metres("lmu:467877"); // Le Mans Ultimate's Spa: the line is 115 m nearer La Source
  assert.equal(s.m.length, 19);
  near(s.m[0], 275, 15, "LMU T1 La Source");
  near(s.m[4], 2285, 20, "LMU T5 Les Combes");
  near(s.m[18], 6660, 20, "LMU T19");
  const i = metres("lmu:670461"); // Imola: LMU draws Acque Minerali's two rights as one bend
  assert.equal(i.key, "imola");
  assert.equal(i.m.length, 19);
  near(i.m[6], 1685, 20, "LMU Tosa");
  assert.ok(i.m[10] < i.m[11] && i.m[11] - i.m[10] < 200 && i.m[10] > 2700 && i.m[11] < 2950, "Acque Minerali keeps its two turns in the one bend");
  assert.equal(i.names[6], "Tosa");
  for (const id of Object.keys(LAY)) { const m = metres(id).m; m.forEach((d, k) => assert.ok(k === 0 || d > m[k - 1], `${id}: T${k + 1} after T${k}`)); }
}

// ---- Monza, Silverstone, an oval ----
{
  const m = metres("iracing:239");
  assert.equal(m.m.length, 11);
  near(m.m[2], 1440, 15, "Curva Grande"); near(m.m[10], 5135, 15, "Parabolica");
  assert.equal(m.names[10], "Parabolica");
  const s = metres("iracing:341");
  assert.equal(s.m.length, 18);
  assert.deepEqual([s.names[0], s.names[3], s.names[4], s.names[8], s.names[14]], ["Abbey", "The Loop", "Aintree", "Copse", "Stowe"]);
  const o = metres("iracing:27");
  assert.equal(o.m.length, 4, "an oval has four turns, two at each end");
  assert.ok(o.m[1] - o.m[0] > 200 && o.m[3] - o.m[2] > 200 && o.m[2] - o.m[1] > 1000);
}

// ---- a layout whose line moved, a rebuilt layout, the wrong track ----
{
  const l = at("iracing:523"), ref = refFor("iracing", 523), base = placeRef(ref, l.x, l.y).map((t) => t.f * l.L);
  const rot = (k) => ({ x: l.x.slice(k).concat(l.x.slice(0, k)), y: l.y.slice(k).concat(l.y.slice(0, k)) });
  const a = rot(l.n - 30), moved = placeRef(ref, a.x, a.y).map((t) => t.f * l.L); // the line 150 m earlier
  moved.forEach((d, i) => near(d, base[i] + 150, 12, `T${i + 1} with the line 150 m earlier`));
  // a noisy copy (a layout drawn again from another lap)
  const nx = l.x.map((v, i) => v + Math.sin(i * 0.1) * 0.6), ny = l.y.map((v, i) => v + Math.cos(i * 0.13) * 0.6);
  placeRef(ref, nx, ny).forEach((t, i) => near(t.f * l.L, base[i], 45, `T${i + 1} on a layout drawn again`));
  // Monza's layout is not Spa, whatever the id says, and a lap of another length is another layout
  const mz = at("iracing:239");
  assert.equal(placeRef(ref, mz.x, mz.y), null, "another circuit");
  assert.equal(placeRef({ ...ref, len: mz.L }, mz.x, mz.y), null, "another circuit of the reference's length");
  const b = rot(200); // the line a kilometre away: not the same layout of the circuit
  assert.equal(placeRef(ref, b.x, b.y), null);
}

// ---- which reference a track takes ----
{
  assert.equal(refFor("iracing", 523, "anything", 1).key, "spa", "by the game's id first");
  assert.equal(refFor("acc", 9001, "Spa-Francorchamps", 7004).key, "spa", "by the circuit's name and length");
  assert.equal(refFor("acc", 9002, "Autodromo Nazionale di Monza", 5793).key, "monza");
  assert.equal(refFor("ac", 9003, "Brands Hatch GP", 3908).key, "brands-gp");
  assert.equal(refFor("ac", 9004, "Brands Hatch Indy", 1944).key, "brands-indy");
  assert.equal(refFor("acc", 9005, "Circuit de Spa-Francorchamps", 4000), null, "the name with another length is another layout");
  assert.equal(refFor("acc", 9006, "Spartan Raceway", 6930), null, "a word inside another word is not the circuit");
  assert.equal(refFor("iracing", 445, "Fuji Speedway · No Chicane", 4465), null, "a layout the reference refuses");
  assert.equal(refFor("iracing", 99999, "", 5000), null);
  const sp = at("iracing:523");
  assert.equal(refTurns("iracing", 99999, "Unknown Park", sp.x, sp.y), null, "a track the reference does not know keeps the geometry's corners");
  assert.equal(refTurns("acc", 9001, "Spa-Francorchamps", sp.x, sp.y).turns.length, 19, "another game's Spa by name");
  // names for turns an admin placed by hand: only with as many turns
  assert.equal(refNames("iracing", 523, "", sp.L, 19)[0], "La Source");
  assert.equal(refNames("iracing", 523, "", sp.L, 18), null);
}

console.log("turnsref ok");
