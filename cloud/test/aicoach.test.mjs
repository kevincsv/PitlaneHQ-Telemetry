// node cloud/test/aicoach.test.mjs: Ask the coach (web/dist/pitwall-aicoach.js), the AI coach with the driver's own key.
// Two laps go through the analysis module the way the phones run it, then through the AI coach module: the context has
// the gap, the corners and the plan, never the name of another driver; a question that names a corner carries that
// corner's raw trace; each provider's request has the right address, headers and body; the answers and errors read back.
import assert from "node:assert/strict";
import "../../web/dist/pitwall-analysis.js";
import "../../web/dist/pitwall-aicoach.js";

const PWA = globalThis.PW_ANALYSIS, AI = globalThis.PW_AICOACH;

// a 3 km lap with three corners; lap B brakes later and carries more speed through the second one
function lap(time, opt) {
  const N = 600, bins = [], apex = [700, 1500, 2400], vmin = opt.vmin;
  let t = 0;
  for (let i = 0; i < N; i++) {
    const d = i * 5;
    let v = 70, thr = 1, brk = 0, gear = 6;
    apex.forEach((a, k) => {
      const brakeAt = a - 120 + (opt.later && k === 1 ? 15 : 0);
      if (d >= brakeAt && d < a) { const f = (d - brakeAt) / (a - brakeAt); v = Math.min(v, 70 - (70 - vmin[k]) * f); thr = 0; brk = 1 - f * 0.7; gear = 3; }
      else if (d >= a && d < a + 200) { const f = (d - a) / 200; v = Math.min(v, vmin[k] + (70 - vmin[k]) * f); thr = Math.min(1, 0.3 + f); brk = 0; gear = 4; }
    });
    t += 5 / v;
    bins.push([v, t, thr, brk, gear, 0]);
  }
  const k = time / t;
  bins.forEach((b) => { b[1] *= k; });
  return { bins, maxBin: N - 1, time, trackId: 1, track: "Test Ring", car: "Test Car" };
}
const A = lap(92.4, { vmin: [30, 24, 33] }), B = lap(91.9, { vmin: [30.5, 27, 33], later: true });
const an = PWA.analyse(A, B, { lang: "en", units: "metric" });
assert.ok(an.coach.cs.length >= 2, "the analysis finds the corners");

// the context: the gap, the corners with their tips, the plan; the driver's own name, the others as a position
const info = { lang: "es", units: "metric", game: "iRacing", track: "Test Ring", car: "Test Car", driver: "Alex Driver", a: "Vuelta 7", b: "P3 (otro piloto)" };
const ctx = AI.context(A, B, an.coach, info);
assert.match(ctx, /Track: Test Ring/);
assert.match(ctx, /Driver: Alex Driver/);
assert.match(ctx, /Lap B \(the reference\): P3/);
assert.match(ctx, /Gap: 0\.5 s/);
assert.match(ctx, /- T2 · /, "every corner has a line");
const sys = AI.system(info, ctx);
assert.match(sys, /Always answer in Spanish/);
assert.match(sys, /Other drivers are never named/);

// the corners a question names, and their raw traces
assert.deepEqual(AI.turnsIn("¿Por qué pierdo en la curva 2 y en T3?").sort(), [2, 3]);
assert.deepEqual(AI.turnsIn("turn 12, Turn 4"), [12, 4]);
assert.deepEqual(AI.turnsIn("what next?"), []);
const n2 = an.coach.cs.find((c) => c.n === 2) ? 2 : an.coach.cs[0].n;
const tr = AI.traces(A, B, an.coach, [n2], info);
assert.match(tr, new RegExp(`^T${n2} raw trace`));
const rows = tr.split("\n").slice(1);
assert.ok(rows.length >= 15 && rows.length <= 40, "a row every 10 m around the corner: " + rows.length);
assert.match(rows[0], /^\d+ · \d+\/\d+ · \d+\/\d+ · \d+\/\d+ · \d+\/\d+ · /);
assert.equal(AI.traces(A, B, an.coach, [], info).split(/\n\n/).length, 2, "no corner named: the two that cost the most");
const q1 = AI.question("¿Y la T" + n2 + "?", A, B, an.coach, info, false);
assert.match(q1, /--- Traces ---/);
assert.doesNotMatch(AI.question("¿Qué practico?", A, B, an.coach, info, false), /Traces/, "a follow-up without a corner sends no traces");
assert.match(AI.question("¿Qué practico?", A, B, an.coach, info, true), /Traces/, "the first question carries the two that cost the most");

// the requests
const msgs = [{ role: "user", content: "hola" }];
let r = AI.request("anthropic", "claude-haiku-5-5", "sk-ant-x", sys, msgs), b = JSON.parse(r.body);
assert.equal(r.url, "https://api.anthropic.com/v1/messages");
assert.equal(r.headers["x-api-key"], "sk-ant-x");
assert.equal(r.headers["anthropic-dangerous-direct-browser-access"], "true");
assert.equal(b.model, "claude-haiku-5-5");
assert.equal(b.system[0].cache_control.type, "ephemeral");
assert.deepEqual(b.output_config, { effort: "low" });
assert.equal(b.messages[0].content, "hola");
r = AI.request("anthropic", "claude-haiku-5-5", null, sys, msgs);
assert.equal(r.headers["x-api-key"], undefined, "without a key (the agent adds it) no key header");
r = AI.request("openai", "gpt-5-mini", "sk-x", sys, msgs); b = JSON.parse(r.body);
assert.equal(r.url, "https://api.openai.com/v1/chat/completions");
assert.equal(r.headers.authorization, "Bearer sk-x");
assert.equal(b.messages[0].role, "system");
assert.equal(b.messages[1].content, "hola");
r = AI.request("gemini", "gemini-2.5-flash", "AIzaX", sys, [...msgs, { role: "assistant", content: "¿sí?" }]); b = JSON.parse(r.body);
assert.equal(r.url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
assert.equal(r.headers["x-goog-api-key"], "AIzaX");
assert.equal(b.contents[1].role, "model");
assert.match(b.systemInstruction.parts[0].text, /race engineer/);
const long = Array.from({ length: 60 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "m" + i }));
assert.equal(JSON.parse(AI.request("anthropic", null, "k", sys, long).body).messages.length, AI.MAX_TURNS * 2, "only the newest turns go");

// the answers
assert.equal(AI.parse("anthropic", 200, JSON.stringify({ content: [{ type: "thinking", thinking: "" }, { type: "text", text: "Frena **más tarde** en la T2." }] })).text, "Frena más tarde en la T2.");
assert.equal(AI.parse("anthropic", 200, JSON.stringify({ stop_reason: "refusal", content: [] })).kind, "refused");
assert.equal(AI.parse("openai", 200, JSON.stringify({ choices: [{ message: { content: "Brake later." } }] })).text, "Brake later.");
assert.equal(AI.parse("gemini", 200, JSON.stringify({ candidates: [{ content: { parts: [{ text: "## Hi\nBrake" }] } }] })).text, "Hi\nBrake");
let e = AI.parse("anthropic", 401, JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }));
assert.equal(e.kind, "key"); assert.equal(e.error, "invalid x-api-key");
assert.equal(AI.parse("openai", 429, JSON.stringify({ error: { message: "Rate limit" } })).kind, "limit");
assert.equal(AI.parse("gemini", 400, "not json").error, "not json");

// the models a key can use
assert.deepEqual(AI.parseModels("anthropic", 200, JSON.stringify({ data: [{ id: "claude-opus-5-5" }, { id: "claude-haiku-5-5" }] })).models, ["claude-opus-5-5", "claude-haiku-5-5"]);
assert.deepEqual(AI.parseModels("openai", 200, JSON.stringify({ data: [{ id: "gpt-5" }, { id: "text-embedding-3" }, { id: "gpt-4o-realtime" }, { id: "gpt-5-mini" }] })).models, ["gpt-5-mini", "gpt-5"]);
assert.deepEqual(AI.parseModels("gemini", 200, JSON.stringify({ models: [{ name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] }, { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] }] })).models, ["gemini-2.5-flash"]);
assert.equal(AI.modelsRequest("gemini", "k").headers["x-goog-api-key"], "k");

console.log("aicoach: ok");
