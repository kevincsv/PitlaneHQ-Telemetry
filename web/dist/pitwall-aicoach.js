/* Ask the coach: the AI coach of Pitlane HQ, with the driver's own API key (Anthropic, OpenAI or Google Gemini). One file
   for every device, like pitwall-analysis.js: the web and the PC app load it, the phones run it in their JavaScript
   sandbox. Pure JavaScript: no page, no storage, no network. It builds what goes to the AI and reads what comes back;
   the caller sends the request (the browser straight to the provider, the PC through the agent's /api/aicoach, which
   adds the key, the phones natively).
     context(A, B, coach, info)  the lap pair as compact text for the system prompt: the gap, sectors, every corner with
                                  its tip, the plan, how the lap is driven (coach = coachPlan's answer, or analyse().coach)
     traces(A, B, coach, turns)  the raw traces of the corners asked about (every 10 m: speed, throttle, brake, gear and
                                  the time gained or lost), for the question that names them
     turnsIn(text)               the corners a question names ("T3", "turn 3", "curva 3")
     system(info)                the coach's instructions in the driver's language, then the lap context
     request(p, model, key, sys, messages)  {url, method, headers, body} for that provider (key null: the agent adds it)
     parse(p, status, text)      {text} or {error}
     modelsRequest(p, key), parseModels(p, text)  the models the key can use
   Drivers other than the user are never named: they are their position (P3) or what they are (the record, the next
   level). The info the caller passes says who lap B is. */
(function (root) {
  "use strict";
  const VERSION = 1, BIN = 5, STEP = 10;
  const PROVIDERS = {
    anthropic: { name: "Claude", models: ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"], keyHint: "sk-ant-…", keys: "https://console.anthropic.com/settings/keys" },
    openai: { name: "OpenAI", models: ["gpt-5-mini", "gpt-5"], keyHint: "sk-…", keys: "https://platform.openai.com/api-keys" },
    gemini: { name: "Gemini", models: ["gemini-2.5-flash", "gemini-2.5-pro"], keyHint: "AIza…", keys: "https://aistudio.google.com/apikey" },
  };
  const MAX_TURNS = 12, MAX_OUT = 4000;
  const r1 = (v) => v == null || isNaN(v) ? null : Math.round(v * 10) / 10;
  const r2 = (v) => v == null || isNaN(v) ? null : Math.round(v * 100) / 100;
  const r3 = (v) => v == null || isNaN(v) ? null : Math.round(v * 1000) / 1000;
  const langOf = (info) => { const l = info && info.lang; return l === "es" || l === "pt" ? l : "en"; };
  const LANG_NAME = { en: "English", es: "Spanish (Spain)", pt: "Portuguese (Brazil)" };
  const imp = (info) => !!(info && info.units === "imperial");
  const spdOf = (info) => (ms) => ms == null ? null : Math.round(imp(info) ? ms * 2.23694 : ms * 3.6);
  const clean = (s) => String(s == null ? "" : s).replace(/[\r\n]+/g, " ").trim();
  const tipText = (c, l) => { const t = c && c.tip; if (!Array.isArray(t)) return clean(c && c.text); return clean(l === "es" ? t[1] : l === "pt" ? (t[2] != null ? t[2] : t[0]) : t[0]); };

  // a lap's bins filled forward (a missing bin takes the one before), as the analysis module reads them
  function series(l) { const out = [], bins = (l && l.bins) || []; let last = null; const lim = Math.min(bins.length, (l && l.maxBin != null ? l.maxBin : bins.length - 1) + 1); for (let i = 0; i < lim; i++) { const b = bins[i] || last; if (b) { out[i] = b; last = b; } } return out; }

  /* the lap pair as text: short lines a model reads easily and that cost few tokens */
  function context(A, B, coach, info) {
    info = info || {}; const l = langOf(info), U = imp(info) ? "mph" : "km/h", c = coach || {}, L = [];
    const who = (x, d) => clean(x || d);
    L.push(`Game: ${clean(info.game || "iRacing")} · Track: ${clean(info.track || (A && A.track) || "?")} · Car: ${clean(info.car || (A && A.car) || "?")}${info.len ? ` · Lap length: ${Math.round(info.len)} m` : ""}`);
    if (info.driver) L.push(`Driver: ${clean(info.driver)}`);
    L.push(`Lap A (the driver's): ${who(info.a, "the driver's lap")} · ${r3(A && A.time)} s${A && A.valid === false ? " · invalid" : ""}`);
    L.push(`Lap B (the reference): ${who(info.b, "a reference lap")} · ${r3(B && B.time)} s`);
    if (info.conditions) L.push(`Conditions: ${clean(info.conditions)}`);
    L.push(`Speeds in ${U}, distances in metres from the start/finish line. A positive gap or loss means lap A is slower.`);
    if (c.lapD != null) L.push(`Gap: ${r3(c.lapD)} s · lost in corners ${r2(c.lost)} s · gained in corners ${r2(-(c.gained || 0))} s · straights ${r2(c.straight)} s`);
    if (Array.isArray(c.secs) && c.secs.length) L.push("Sectors: " + c.secs.map((s) => `S${s.n} ${r3(s.d) > 0 ? "+" : ""}${r3(s.d)} (A ${r3(s.a)}, B ${r3(s.b)})`).join(" · "));
    if (c.focus && c.focus[0]) L.push(`Biggest area: ${clean(c.focus[0])} (${r2(c.focus[1])} s)`);
    const cs = Array.isArray(c.cs) ? c.cs : [];
    if (cs.length) {
      L.push("", "Corners (turn · at m · time lost · braking point Δ m, + = A brakes later · entry speed A/B · minimum speed A/B · throttle pick-up A/B m · phase · coach's tip):");
      for (const x of cs) {
        const p = [`T${x.n}`, `${Math.round(x.apex != null ? x.apex : x.d)} m`, `${r2(x.lost) > 0 ? "+" : ""}${r2(x.lost)} s`];
        if (x.dd != null) p.push(`brake ${x.dd > 0 ? "+" : ""}${Math.round(x.dd)} m`);
        if (x.ve != null || x.vr != null) p.push(`entry ${x.ve != null ? Math.round(x.ve) : "?"}/${x.vr != null ? Math.round(x.vr) : "?"}`);
        if (x.vmin != null || x.vminr != null) p.push(`min ${x.vmin != null ? Math.round(x.vmin) : "?"}/${x.vminr != null ? Math.round(x.vminr) : "?"}`);
        if (x.pua != null || x.pur != null) p.push(`throttle ${x.pua != null ? Math.round(x.pua) : "?"}/${x.pur != null ? Math.round(x.pur) : "?"}`);
        if (x.phase) p.push(clean(x.phase));
        if (x.est) p.push("B's pedals estimated");
        const t = tipText(x, l); if (t) p.push(`tip: ${t}`);
        L.push("- " + p.join(" · "));
      }
    }
    const plan = Array.isArray(c.plan) ? c.plan.slice(0, 5) : [];
    if (plan.length) { L.push("", "The coach's plan for the next session:"); plan.forEach((s, i) => L.push(`${i + 1}. ${clean(s.t)}${s.why ? " — " + clean(s.why) : ""}${s.how ? " — " + clean(s.how) : ""}`)); }
    if (c.ph && typeof c.ph === "object") L.push("Time lost by phase (s): " + ["brake", "entry", "apex", "exit"].map((k) => `${k} ${r2(c.ph[k])}`).join(" · "));
    if (Array.isArray(c.driving) && c.driving.length) { L.push("", "How lap A is driven against B:"); for (const d of c.driving.slice(0, 6)) L.push("- " + clean(String(d).replace(/^[^\p{L}\d]+/u, ""))); }
    if (Array.isArray(c.cons) && c.cons.length) L.push("Consistency over the session (turn · spread s): " + c.cons.slice(0, 12).map((x) => `T${x.n} ${r2(x.sd != null ? x.sd : x.s)}`).join(" · "));
    if (Array.isArray(info.laps) && info.laps.length > 1) L.push(`The session's lap times: ${info.laps.slice(-15).map((t) => r3(t)).join(", ")}`);
    if (Array.isArray(info.notes)) for (const n of info.notes.slice(0, 6)) L.push("Note: " + clean(n));
    return L.join("\n");
  }

  /* the corners a question names: "T3", "turn 3", "curva 3", "curve 3" */
  function turnsIn(text) { const out = new Set(), re = /\b(?:t|turn|turns|curva|curvas|curve|corner)\s?(\d{1,2})\b/gi; let m; while ((m = re.exec(String(text || "")))) out.add(+m[1]); return [...out]; }

  /* the raw traces of these corners (turn numbers; none: the two that cost the most), every 10 m from 80 m before the
     braking zone to 120 m past the apex: speed, throttle and brake (%), gear for A and B, and the time A has gained (−)
     or lost (+) since the start of the stretch */
  function traces(A, B, coach, turns, info) {
    const cs = (coach && Array.isArray(coach.cs) ? coach.cs : []);
    let pick = (turns && turns.length ? cs.filter((x) => turns.includes(x.n)) : cs.slice().sort((a, b) => b.lost - a.lost).slice(0, 2)).slice(0, 4);
    if (!pick.length) return "";
    const sa = series(A), sb = series(B), spd = spdOf(info), U = imp(info) ? "mph" : "km/h", out = [];
    for (const x of pick) {
      const d0 = Math.max(0, (x.d != null ? x.d : x.apex) - 80), d1 = (x.apex != null ? x.apex : x.d) + 120;
      const i0 = Math.round(d0 / BIN), i1 = Math.min(Math.round(d1 / BIN), sa.length - 1, sb.length - 1);
      if (!(i1 > i0) || !sa[i0] || !sb[i0]) continue;
      const ta0 = sa[i0][1], tb0 = sb[i0][1], rows = [`T${x.n} raw trace (m · speed A/B ${U} · throttle A/B % · brake A/B % · gear A/B · time Δ s):`];
      for (let i = i0; i <= i1; i += STEP / BIN) {
        const a = sa[i], b = sb[i]; if (!a || !b) continue;
        const pc = (v) => v == null ? "?" : Math.round(v * 100), g = (v) => v == null || v < 0 ? "?" : v;
        const dt = a[1] != null && b[1] != null && ta0 != null && tb0 != null ? r3((a[1] - ta0) - (b[1] - tb0)) : null;
        rows.push(`${i * BIN} · ${spd(a[0])}/${spd(b[0])} · ${pc(a[2])}/${pc(b[2])} · ${pc(a[3])}/${pc(b[3])} · ${g(a[4])}/${g(b[4])} · ${dt == null ? "?" : (dt > 0 ? "+" : "") + dt}`);
      }
      out.push(rows.join("\n"));
    }
    return out.join("\n\n");
  }

  const PROMPT = (l) => [
    "You are the race engineer and driving coach inside Pitlane HQ, a sim racing app. A driver asks about one of their laps (lap A) against a reference lap (lap B).",
    `Always answer in ${LANG_NAME[l]}.`,
    "Use only the data below and the traces sent with a question. Never make up numbers, corners or events. When the data cannot answer, say so in one sentence and say what would answer it (for example, driving a few more laps).",
    "Be short and practical, like an engineer on the radio after the session. Under 150 words unless the driver asks for more. Say what to do differently, where (the turn and the metres) and why it is faster.",
    "Name corners the way the app does (T1, T7). Use the driver's units. Plain text, short paragraphs or a short list. No tables, no headings, no markdown symbols.",
    "Other drivers are never named. They are their position (P3) or what they are (the record, the next level).",
    "Pedal traces of lap B can be estimated from its speed when the data says so. Then do not judge how B presses the pedals.",
  ].join("\n");
  function system(info, ctxText) { const l = langOf(info); return PROMPT(l) + "\n\n--- The laps ---\n" + (ctxText || ""); }

  /* the question as it goes to the AI: the driver's words, then the traces of the corners they name */
  function question(text, A, B, coach, info, first) {
    const t = turnsIn(text), tr = t.length || first ? traces(A, B, coach, t, info) : "";
    return clean(text) + (tr ? "\n\n--- Traces ---\n" + tr : "");
  }

  const isClaude5 = (m) => /^claude-[a-z]+-5/.test(String(m || ""));
  /* the request for a provider: messages are [{role: "user"|"assistant", content: text}] (the newest MAX_TURNS) */
  function request(p, model, key, sys, messages) {
    const msgs = (messages || []).slice(-MAX_TURNS * 2), m = model || PROVIDERS[p].models[0];
    if (p === "anthropic") {
      const body = { model: m, max_tokens: MAX_OUT, system: [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }], messages: msgs.map((x) => ({ role: x.role, content: x.content })) };
      if (isClaude5(m)) body.output_config = { effort: "low" };
      const h = { "content-type": "application/json", "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
      if (key) h["x-api-key"] = key;
      return { url: "https://api.anthropic.com/v1/messages", method: "POST", headers: h, body: JSON.stringify(body) };
    }
    if (p === "openai") {
      const h = { "content-type": "application/json" }; if (key) h.authorization = "Bearer " + key;
      return { url: "https://api.openai.com/v1/chat/completions", method: "POST", headers: h, body: JSON.stringify({ model: m, max_completion_tokens: MAX_OUT, messages: [{ role: "system", content: sys }, ...msgs.map((x) => ({ role: x.role, content: x.content }))] }) };
    }
    if (p === "gemini") {
      const h = { "content-type": "application/json" }; if (key) h["x-goog-api-key"] = key;
      return { url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, method: "POST", headers: h,
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: msgs.map((x) => ({ role: x.role === "assistant" ? "model" : "user", parts: [{ text: x.content }] })), generationConfig: { maxOutputTokens: MAX_OUT } }) };
    }
    throw new Error("unknown provider");
  }

  function errOf(p, status, j, text) {
    const msg = j && (j.error && (j.error.message || (typeof j.error === "string" ? j.error : "")) || j.message) || "";
    const kind = status === 401 || status === 403 ? "key" : status === 429 ? "limit" : status === 404 ? "model" : status === 402 ? "credit" : /credit|billing|quota/i.test(msg) ? "credit" : "other";
    return { error: clean(msg || text || "HTTP " + status).slice(0, 300), kind, status };
  }
  function parse(p, status, text) {
    let j = null; try { j = JSON.parse(text); } catch (e) { /* not JSON */ }
    if (!(status >= 200 && status < 300) || !j) return errOf(p, status, j, text);
    let t = "";
    if (p === "anthropic") { if (j.stop_reason === "refusal") return { error: "refused", kind: "refused" }; t = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join(""); }
    else if (p === "openai") t = ((j.choices || [])[0] || {}).message ? j.choices[0].message.content || "" : "";
    else if (p === "gemini") t = (((j.candidates || [])[0] || {}).content || {}).parts ? j.candidates[0].content.parts.map((x) => x.text || "").join("") : "";
    t = String(t || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/gm, "").trim();
    return t ? { text: t, usage: j.usage || j.usageMetadata || null } : { error: "empty answer", kind: "other" };
  }

  function modelsRequest(p, key) {
    if (p === "anthropic") { const h = { "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }; if (key) h["x-api-key"] = key; return { url: "https://api.anthropic.com/v1/models?limit=100", method: "GET", headers: h }; }
    if (p === "openai") { const h = {}; if (key) h.authorization = "Bearer " + key; return { url: "https://api.openai.com/v1/models", method: "GET", headers: h }; }
    if (p === "gemini") { const h = {}; if (key) h["x-goog-api-key"] = key; return { url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", method: "GET", headers: h }; }
    throw new Error("unknown provider");
  }
  /* the chat models a key can use, the newest first as the provider lists them ({models} or {error}) */
  function parseModels(p, status, text) {
    let j = null; try { j = JSON.parse(text); } catch (e) { /* not JSON */ }
    if (!(status >= 200 && status < 300) || !j) return errOf(p, status, j, text);
    let ids = [];
    if (p === "anthropic") ids = (j.data || []).map((x) => x.id);
    else if (p === "openai") ids = (j.data || []).map((x) => x.id).filter((id) => /^(gpt-|o\d|chatgpt-)/.test(id) && !/(audio|realtime|transcribe|tts|image|search|embedding|instruct)/.test(id)).sort().reverse();
    else if (p === "gemini") ids = (j.models || []).filter((x) => (x.supportedGenerationMethods || []).includes("generateContent")).map((x) => String(x.name || "").replace(/^models\//, "")).filter((id) => /^gemini-/.test(id) && !/(embedding|image|tts|audio)/.test(id));
    return { models: ids };
  }

  const api = { VERSION, PROVIDERS, MAX_TURNS, context, traces, turnsIn, system, question, request, parse, modelsRequest, parseModels };
  root.PW_AICOACH = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
