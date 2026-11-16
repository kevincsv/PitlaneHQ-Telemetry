// Builds the free setups library (web/dist/_setups): setups whose authors publish them under a licence that lets
// anyone share them (CC0, MIT). Each file is kept as it was published, named by its checksum, with its author,
// licence and source in index.json; the licences themselves are copied to _setups/licenses.
// The folder starts with "_" so it stays out of PitlaneHQ.exe (go:embed skips it); the server hands it out at
// /setups-library/ (cloud/src/worker.js) and the agent installs from there.
//
//   node tools/setups-library.mjs <folder with the sources' clones>
//
// The clones are the repositories below, under their names with "/" turned into "_"
// (git clone --depth 1 https://github.com/<repo> <folder>/<owner>_<name>).
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SOURCES = [
  {
    repo: "OlivierWierda/OSW-s-LMU-Setups", game: "lmu", credit: "OSW Sim Sports", licence: "CC0-1.0",
    // <car>/<the game's track folder>/<setup>.svm
    files: (dir) => walk(dir).filter((f) => /\.svm$/i.test(f)).map((f) => {
      const [car, track] = path.relative(dir, f).split(path.sep);
      return { file: f, car, track };
    }),
  },
  {
    repo: "pashaproton/iRacing-Setups", game: "iracing", credit: "Pavlo Ivanichenko", licence: "MIT",
    // <iRacing car folder>/<track>.sto
    cars: { mercedesamgevogt3: "Mercedes-AMG GT3 2020", c8rvettegte: "Chevrolet Corvette C8.R GTE", dallarap217: "Dallara P217",
      porsche911rgt3: "Porsche 911 GT3 R", ferrarievogt3: "Ferrari 488 GT3 Evo 2020" },
    files(dir) {
      return walk(dir).filter((f) => /\.sto$/i.test(f) && !/^default\.sto$/i.test(path.basename(f))).map((f) => {
        const carPath = path.relative(dir, f).split(path.sep)[0];
        return { file: f, carPath, car: this.cars[carPath] || carPath, track: path.basename(f, path.extname(f)) };
      });
    },
  },
];

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.name.startsWith(".") ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
}
// the car of an LMU setup: VehicleClassSetting="Ford_Mustang_LMGT3 GT3 WEC2025" → ford_mustang_lmgt3
function svmCar(text) {
  const m = /^VehicleClassSetting="([^"\s]+)/m.exec(text);
  return m ? m[1].toLowerCase() : "";
}

const src = process.argv[2];
if (!src) {
  console.error("usage: node tools/setups-library.mjs <folder with the clones>");
  process.exit(1);
}
const out = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "web", "dist", "_setups");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "licenses"), { recursive: true });
const setups = [], sources = [];
for (const s of SOURCES) {
  const dir = path.join(src, s.repo.replace("/", "_"));
  const date = execFileSync("git", ["-C", dir, "log", "-1", "--format=%cs"]).toString().trim();
  const commit = execFileSync("git", ["-C", dir, "log", "-1", "--format=%H"]).toString().trim();
  const lic = fs.readdirSync(dir).find((f) => /^licen[cs]e/i.test(f));
  const id = s.repo.replace("/", "_");
  fs.copyFileSync(path.join(dir, lic), path.join(out, "licenses", id + ".txt"));
  sources.push({ id, credit: s.credit, licence: s.licence, url: "https://github.com/" + s.repo, commit, date, licenceFile: "licenses/" + id + ".txt" });
  for (const f of s.files(dir)) {
    const data = fs.readFileSync(f.file);
    const sha = createHash("sha256").update(data).digest("hex"), ext = path.extname(f.file).slice(1).toLowerCase();
    fs.writeFileSync(path.join(out, sha.slice(0, 16) + "." + ext), data);
    setups.push({
      id: sha.slice(0, 16), game: s.game, ext, sha, size: data.length,
      carPath: s.game === "lmu" ? svmCar(data.toString("latin1")) : f.carPath, car: f.car, track: f.track,
      name: path.basename(f.file, path.extname(f.file)), source: id, year: +date.slice(0, 4),
    });
  }
}
setups.sort((a, b) => a.game.localeCompare(b.game) || a.car.localeCompare(b.car) || a.track.localeCompare(b.track) || a.name.localeCompare(b.name));
fs.writeFileSync(path.join(out, "index.json"), JSON.stringify({ sources, setups }, null, 1) + "\n");
console.log(`${setups.length} setups from ${sources.length} sources → ${out}`);
