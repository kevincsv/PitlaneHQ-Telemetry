// a shared lap without sectors takes them from its trace: thirds of the lap distance, from the trace's lap time
import assert from "node:assert/strict";
import { traceSectors } from "../src/lapsectors.js";

const n = 300, time = 90;
// a lap at even speed whose last third is slower: 30 s, 25 s and 35 s
const d = [];
for (let i = 0; i < n; i++) {
  const t = i < 100 ? i * 0.3 : i < 200 ? 30 + (i - 100) * 0.25 : 55 + (i - 200) * 0.35;
  d.push([40, 1, 0, 3, 0, t]);
}
assert.deepEqual(traceSectors({ d }, time), [30, 25, 35], "the thirds of the lap");
assert.equal(traceSectors({ d: d.slice(0, 30) }, time), null, "too short a trace");
assert.equal(traceSectors({ d: d.map((p) => [...p.slice(0, 5), 0]) }, time), null, "a trace without times");
assert.equal(traceSectors({ d }, 50), null, "times that are not this lap's");
assert.equal(traceSectors(null, time), null);
console.log("lap-sectors ok");
