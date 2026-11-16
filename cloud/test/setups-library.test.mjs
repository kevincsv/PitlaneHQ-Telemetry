// node cloud/test/setups-library.test.mjs: the free setups library (web/dist/_setups, tools/setups-library.mjs).
// Every setup is there with its checksum, author and licence, every licence text is there, only licences that let
// anyone share the files are used, and the worker hands out every file at /setups-library/.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL("../../web/dist/_setups/", import.meta.url));
const idx = JSON.parse(readFileSync(DIR + "index.json", "utf8"));
const OPEN = new Set(["CC0-1.0", "MIT", "Unlicense", "CC-BY-4.0", "Apache-2.0"]);
const src = new Map(idx.sources.map((s) => [s.id, s]));
assert.ok(idx.setups.length > 0, "some setups");
for (const s of idx.sources) {
  assert.ok(OPEN.has(s.licence), `${s.id}: a licence that lets anyone share (${s.licence})`);
  assert.ok(s.credit && s.date && s.commit, `${s.id}: author, date and commit`);
  assert.ok(readFileSync(DIR + s.licenceFile, "utf8").length > 100, `${s.id}: its licence text`);
}
const ids = new Set();
for (const x of idx.setups) {
  assert.ok(["iracing", "lmu"].includes(x.game), x.id);
  assert.equal(x.ext, x.game === "lmu" ? "svm" : "sto", x.id);
  assert.ok(src.has(x.source), `${x.id}: its source`);
  assert.ok(/^[A-Za-z0-9 _.\-]{1,80}$/.test(x.carPath), `${x.id}: car folder ${x.carPath}`);
  assert.ok(/^[A-Za-z0-9 _.\-]{1,80}$/.test(x.track), `${x.id}: track ${x.track}`);
  const data = readFileSync(DIR + x.id + "." + x.ext);
  assert.equal(createHash("sha256").update(data).digest("hex"), x.sha, `${x.id}: checksum`);
  assert.equal(x.id, x.sha.slice(0, 16));
  assert.equal(data.length, x.size);
  ids.add(x.id + "." + x.ext);
}
// nothing in the folder that the index does not name
for (const f of readdirSync(DIR)) if (f !== "index.json" && f !== "licenses") assert.ok(ids.has(f), `${f} is in index.json`);

// the worker's route
const w = readFileSync(fileURLToPath(new URL("../src/worker.js", import.meta.url)), "utf8");
const m = w.match(/const lib = url\.pathname\.match\((\/\^\\\/setups-library.*?\$\/)\);/);
assert.ok(m, "the worker serves /setups-library/");
const re = new Function("return " + m[1])();
for (const f of [...ids, "index.json", ...idx.sources.map((s) => s.licenceFile)]) assert.ok(re.test("/setups-library/" + f), f);
for (const bad of ["/setups-library/../index.html", "/setups-library/x.exe", "/setups-library/licenses/../a.txt"]) assert.ok(!re.test(bad), bad);
console.log(`setups library ok (${idx.setups.length} setups)`);
