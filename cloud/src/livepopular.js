// Telemetry's "Most used by the community" (the Layout window's preset in index.html).
//
// GET /community/live/popular (signed in)  {ready, accounts, min, days, panels: [{w, accounts, share}], top: [w], modes}
//   the Telemetry panels ranked by how many accounts showed them in the last DAYS days. Every app counts each panel it
//   shows while Telemetry is open once a day ("live:<panel>") and the mode it is in ("live:mode.<basic|full|cmp>")
//   through POST /community/usage (usage.js, usagelib.js KEY_RE). Below MIN accounts it answers ready:false and the
//   preset stays off. top is every panel at least half of those accounts show (the preset's set). One grouped read of
//   usage_days, kept CACHE_S seconds in the Cache API and in memory, so a busy day costs a handful of reads.
export const DAYS = 30, MIN = 20, CACHE_S = 6 * 3600, TOP_SHARE = 0.5;
export const PANEL_RE = /^[a-z]{2,20}$/, MODES = ["basic", "full", "cmp"];

// the panels and modes per key, and the accounts that showed any panel (one query each, both grouped)
export const SQL_LIVE_KEYS = "SELECT key, COUNT(DISTINCT account_id) AS n FROM usage_days WHERE day>=?1 AND key LIKE 'live:%' GROUP BY key LIMIT 200";
export const SQL_LIVE_ACCOUNTS = "SELECT COUNT(DISTINCT account_id) AS n FROM usage_days WHERE day>=?1 AND key LIKE 'live:%' AND key NOT LIKE 'live:mode.%'";

/** The answer from the grouped rows ([{key, n}]) and the number of accounts. */
export function popularOf(rows, accounts, min = MIN) {
  const total = Math.max(0, Math.floor(Number(accounts) || 0));
  const panels = [], modes = {};
  for (const r of rows || []) {
    const k = String(r.key || ""), n = Math.max(0, Math.floor(Number(r.n) || 0));
    if (!k.startsWith("live:") || !n) continue;
    const w = k.slice(5);
    if (w.startsWith("mode.")) { const m = w.slice(5); if (MODES.includes(m)) modes[m] = n; continue; }
    if (!PANEL_RE.test(w)) continue;
    panels.push({ w, accounts: Math.min(n, total || n), share: total ? Math.round(Math.min(1, n / total) * 100) / 100 : 0 });
  }
  panels.sort((a, b) => b.accounts - a.accounts || (a.w < b.w ? -1 : 1));
  if (total < min) return { ready: false, accounts: total, min, days: DAYS, panels: [], top: [], modes: {} };
  return { ready: true, accounts: total, min, days: DAYS, panels, top: panels.filter((p) => p.share >= TOP_SHARE).map((p) => p.w), modes };
}

let MEMO = null; // {at, body}
/** The route; null when the path is not it. acc is the signed-in account (usage.js checks it). */
export async function livePopular(env, now = Date.now()) {
  if (MEMO && now - MEMO.at < CACHE_S * 1000) return MEMO.body;
  const cache = env.LOCAL !== "1" && typeof caches !== "undefined" && caches.default ? caches.default : null, ck = new Request("https://live.cache/popular");
  if (cache) {
    const hit = await cache.match(ck).catch(() => null);
    if (hit) { const body = await hit.json().catch(() => null); if (body) { MEMO = { at: now, body }; return body; } }
  }
  const from = new Date(now - (DAYS - 1) * 86400e3).toISOString().slice(0, 10);
  const [rows, acc] = await Promise.all([
    env.DB.prepare(SQL_LIVE_KEYS).bind(from).all().then((r) => r.results || []),
    env.DB.prepare(SQL_LIVE_ACCOUNTS).bind(from).first(),
  ]);
  const body = popularOf(rows, acc && acc.n);
  MEMO = { at: now, body };
  if (cache) await cache.put(ck, new Response(JSON.stringify(body), { headers: { "content-type": "application/json", "cache-control": "max-age=" + CACHE_S } })).catch(() => {});
  return body;
}
export const resetLiveMemo = () => { MEMO = null; };
