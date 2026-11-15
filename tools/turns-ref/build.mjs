// node tools/turns-ref/build.mjs [layouts dir] [--show]: writes cloud/src/turnsref-data.js from src.mjs.
// The layouts are read from the directory (game-id.json, as /community/trackmaps gives them) and fetched from the
// server into it when missing. Every layout of an entry is then placed again with the server's own placeRef and
// printed with --show, so a turn that moved is seen before it ships.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SRC, NOT } from "./src.mjs";
import { bends, inBend } from "../../cloud/src/turnsref.js";
import { curvature } from "../../cloud/src/trackgeo.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : path.join(here, "layouts");
const show = process.argv.includes("--show");
const HOST = "https://pitlanehq.app";

async function layout(id) {
  const [game, tid] = id.split(":"), f = path.join(dir, `${game}-${tid}.json`);
  if (!fs.existsSync(f)) {
    fs.mkdirSync(dir, { recursive: true });
    const r = await fetch(`${HOST}/community/trackmaps?trackId=${tid}&game=${game}`);
    if (!r.ok) throw new Error(`${id}: no layout on the server (${r.status})`);
    fs.writeFileSync(f, await r.text());
  }
  return JSON.parse(fs.readFileSync(f, "utf8"));
}
const smooth = (x, y) => { const k0 = curvature(x, y, 5), n = k0.length; return k0.map((_, i) => (k0[(i - 1 + n) % n] + 2 * k0[i] + k0[(i + 1) % n]) / 4); };

export function parse(seq) {
  return seq.split(",").map((s) => {
    const m = /^([RLX])(\*(\d))?(@(\d+))?\s*(.*)$/.exec(s.trim());
    if (!m) throw new Error("bad turn: " + s);
    return { dir: m[1], k: m[3] ? +m[3] : 1, at: m[5] ? +m[5] : null, names: (m[6] || "").split("/") };
  });
}

// the sequence on the first layout: the bends of each direction in order that turn the most, the @ ones where they say
export function author(e, lay) {
  const n = Math.min(lay.x.length, lay.y.length), L = n * 5, k = smooth(lay.x, lay.y), B = bends(lay.x, lay.y, k), T = parse(e.seq);
  const real = T.map((t, i) => ({ t, i })).filter((o) => o.t.dir !== "X"), q = real.length, m = B.length;
  const w = (b) => Math.min(b.deg, 60) + b.deg / 100;
  const ok = (t, b) => b.dir === t.dir && (t.at == null || Math.abs(b.i * 5 - t.at) <= 45);
  const best = real.map(() => new Array(m).fill(-1e9)), prev = real.map(() => new Array(m).fill(-1));
  for (let i = 0; i < q; i++) for (let j = 0; j < m; j++) {
    if (!ok(real[i].t, B[j])) continue;
    if (i === 0) { best[0][j] = w(B[j]); continue; }
    for (let p = 0; p < j; p++) if (best[i - 1][p] + w(B[j]) > best[i][j]) { best[i][j] = best[i - 1][p] + w(B[j]); prev[i][j] = p; }
  }
  let end = -1;
  for (let j = 0; j < m; j++) if (best[q - 1][j] > -1e8 && (end < 0 || best[q - 1][j] > best[q - 1][end])) end = j;
  if (end < 0) throw new Error(`${e.key}: the sequence does not fit the layout\n  ` + B.map((b) => `${b.i * 5}${b.dir}${b.deg}`).join(" "));
  const pick = new Array(q);
  for (let i = q - 1, j = end; i >= 0; i--) { pick[i] = j; j = prev[i][j]; }
  const out = [], slot = new Array(T.length);
  real.forEach((o, ri) => { slot[o.i] = B[pick[ri]]; });
  T.forEach((t, i) => {
    if (t.dir === "X") { out.push({ d: t.at, dir: "X", kind: 0, name: t.names[0] || "", of: 1 }); return; }
    const b = slot[i], hard = b.deg >= 40 ? 1 : 0;
    inBend(b, t.k, k, n).forEach((d, c) => out.push({ d, dir: t.dir, kind: hard, name: t.names[Math.min(c, t.names.length - 1)] || "", of: t.k, deg: b.deg }));
  });
  // an X without its @ sits between its neighbours (several in a row share the gap evenly)
  for (let i = 0; i < out.length; i++) {
    if (out[i].d != null) continue;
    let j = i;
    while (j < out.length && out[j].d == null) j++;
    if (i === 0 || j >= out.length) throw new Error(`${e.key}: an X at an end needs its @`);
    const a = out[i - 1].d, b = out[j].d;
    for (let c = i; c < j; c++) out[c].d = Math.round(a + ((b - a) * (c - i + 1)) / (j - i + 1));
  }
  for (let i = 1; i < out.length; i++) if (out[i].d <= out[i - 1].d) throw new Error(`${e.key}: T${i + 1} is not after T${i}`);
  const used = new Set(pick);
  return { L, turns: out, skipped: B.filter((b, j) => !used.has(j) && b.deg >= 20) };
}

const refs = [], notes = [];
for (const e of SRC) {
  const lay = await layout(e.ids[0]), a = author(e, lay);
  refs.push({ key: e.key, len: a.L, ids: e.ids, ...(e.match.length ? { match: e.match } : {}), ...(e.sure ? {} : { sure: false }), t: a.turns.map((t) => [t.d, t.dir, t.kind, t.name, ...(t.of > 1 ? [t.of] : [])]) });
  notes.push({ e, a, lay });
}
const body = `// Written by tools/turns-ref/build.mjs from tools/turns-ref/src.mjs: change that file and run it again, never this one.\n// One entry per circuit layout: len (m, the layout the turns were placed on), ids (the games' track ids with this layout),\n// match (words of the circuit's name), t: [metres from the line, "L"/"R"/"X", 1 a clear corner / 0 a light one, name, turns in its bend].\nexport const REF = [\n${refs.map((r) => "  " + JSON.stringify(r)).join(",\n")},\n];\n// layouts that are not one of the above although their circuit's name and length say so\nexport const NOT = ${JSON.stringify(NOT)};\n`;
fs.writeFileSync(path.join(here, "../../cloud/src/turnsref-data.js"), body);
console.log(`${refs.length} layouts, ${refs.reduce((s, r) => s + r.ids.length, 0)} tracks`);

if (show) {
  const { placeRef } = await import("../../cloud/src/turnsref.js?again");
  for (const { e, a } of notes) {
    const ref = refs.find((r) => r.key === e.key);
    console.log(`## ${e.key} n=${a.turns.length}${e.sure ? "" : " (unsure)"}\n  src: ` + a.turns.map((t, i) => `${i + 1}:${t.d}${t.dir}${t.kind ? "" : "~"}${t.deg ?? ""}`).join(" ") + (a.skipped.length ? `\n  skipped: ` + a.skipped.map((b) => `${b.i * 5}${b.dir}${b.deg}`).join(" ") : ""));
    for (const id of e.ids) {
      const lay = await layout(id), p = placeRef(ref, lay.x, lay.y), L = lay.n * 5;
      const line = p ? p.map((t) => Math.round(t.f * L)).join(" ") : "NOT PLACED";
      const same = p && id === e.ids[0] && p.every((t, i) => Math.abs(t.f * L - a.turns[i].d) <= 5);
      console.log(`  ${id} L=${L}: ${id === e.ids[0] ? (same ? "same" : "DIFFERENT " + line) : line}`);
    }
  }
}
