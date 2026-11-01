// node cloud/test/pc-min.test.mjs: /dl/version.json never tells a PC a minimum below PC_MIN (downloads.js), so every
// older PitlaneHQ.exe has to update; PC_MIN matches appMinVersion in main.go
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { downloads, PC_MIN, versionLess } from "../src/downloads.js";

const files = { "version.json": JSON.stringify({ version: "0.9.6", build: "abc", min: "0.7.2", notes: {} }) };
const env = { DL: { get: async (n) => (n in files ? { text: async () => files[n], size: files[n].length } : null) } };
const get = async (p) => downloads(new Request("https://pitlanehq.app" + p), env, new URL("https://pitlanehq.app" + p));

let r = await get("/dl/version.json");
let v = await r.json();
assert.equal(v.min, PC_MIN);
assert.equal(v.version, "0.9.6");
assert.equal(v.build, "abc");
assert.match(r.headers.get("content-type"), /json/);

files["version.json"] = JSON.stringify({ version: "1.2.0", build: "x", min: "1.1.0" });
v = await (await get("/dl/version.json")).json();
assert.equal(v.min, "1.1.0"); // a higher minimum from the build stays

files["version.json"] = "not json";
assert.equal(await (await get("/dl/version.json")).text(), "not json");

assert.ok(versionLess("0.7.2", "0.9.0") && versionLess("0.8.9", "0.9.0") && !versionLess("0.9.0", "0.9.0") && versionLess("0.9.9", "0.10.0"));
const goMin = readFileSync(new URL("../../main.go", import.meta.url), "utf8").match(/const appMinVersion = "([^"]+)"/)[1];
assert.equal(goMin, PC_MIN, "PC_MIN in downloads.js and appMinVersion in main.go must agree");
console.log("pc-min: ok");
