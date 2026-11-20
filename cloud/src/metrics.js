// The admin Analytics' weekly numbers (migration 0105; the pure part in metricslib.js).
//
// The daily job (03:00 UTC, weeklyMetrics) reads the usage, the sessions, the accounts, the visits, the installer's
// counts, the donations and the invites of the last JOB_WEEKS weeks, adds them up per week and per sign-up week, and
// writes only the rows that changed into metrics_weeks and cohort_weeks. The page then reads those two small tables.
//
// GET  /community/admin/metrics?weeks=N&aud=0|1 (admins)  the weeks (4 to 26, 12 by default), the seven Monday numbers
//   with their targets, every weekly number, the cohorts, what goes with staying and each source's funnel; aud 0 leaves
//   the admins out (the default; the testers are drivers and count), 1 counts everyone. Kept CACHE_S seconds.
// POST /community/admin/metrics/run {all}  runs the job now; all: from the first day there is usage (the backfill)
// POST /community/admin/metrics/targets {d1, d2, t}  the targets of the Monday numbers
// GET  /community/admin/metrics/health  every counter family and device with the last day it sent something, the
//   job's last run and the database rows the Analytics cost in the last 7 days
// GET  /community/admin/metrics/account?id=  one account's steps with their days and where it came from
// GET  /community/admin/links, POST {name, place, tag?}, DELETE /community/admin/links/<tag>  the tagged links
import { sessionAccount, isAdmin, emailHash } from "./accounts.js";
import { sendThanks, langOf } from "./email.js";
import { metricsAnswer, healthOf, timelineOf, cleanTag, weekOf, addDays, weeksBetween, dayOf, TARGETS, DAY } from "./metricslib.js";
import { weeklyMetrics as runWeekly } from "./metricsjob.js";
import { SRC_RE } from "./sourceslib.js";
import { paymentsOf } from "./paymentslib.js";
import { FOUNDING } from "./lemon.js";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const err = (m, s) => json({ error: m }, s);
export const CACHE_S = 600;
const q = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results || []);
const soft = (p) => p.catch(() => []);

/** The daily job with this server's admins as staff (metricsjob.js). The testers are drivers like everyone (unpaid,
 *  they race like everyone), so they count in every number. */
export const weeklyMetrics = (env, o = {}) => runWeekly(env, { ...o, staff: (a) => isAdmin({ ...env, LOCAL: "0" }, a.id) });

const state = async (env, k) => { const r = await env.DB.prepare("SELECT v FROM app_state WHERE k=?1").bind(k).first().catch(() => null); try { return r && r.v ? JSON.parse(r.v) : null; } catch { return null; } };
const cacheOf = (env) => (env.LOCAL !== "1" && typeof caches !== "undefined" && caches.default ? caches.default : null);
/** An admin answer kept for a few minutes (only ever asked for after the admin check; the key is not an address anyone
 *  can open). bust: drop what is kept under a key. */
export async function adminCache(env, key, secs, fn) {
  const cache = cacheOf(env), req = new Request("https://admin.cache/" + key);
  if (cache) { const hit = await cache.match(req).catch(() => null); if (hit) { try { return await hit.json(); } catch {} } }
  const body = await fn();
  if (cache) await cache.put(req, new Response(JSON.stringify(body), { headers: { "content-type": "application/json", "cache-control": "max-age=" + secs } })).catch(() => {});
  return body;
}
const bust = async (env) => { const cache = cacheOf(env); if (!cache) return; for (const aud of [0, 1]) for (const w of [4, 8, 12, 26]) await cache.delete(new Request(`https://admin.cache/metrics/${w}/${aud}`)).catch(() => {}); };

const cleanTargets = (b) => {
  const day = (v, d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : d), out = { d1: day(b && b.d1, TARGETS.d1), d2: day(b && b.d2, TARGETS.d2), t: {} };
  for (const k of Object.keys(TARGETS.t)) { const v = b && b.t && b.t[k]; out.t[k] = [0, 1].map((i) => { const n = Array.isArray(v) ? Number(v[i]) : NaN; return Number.isFinite(n) && n >= 0 && n <= 1e7 && !(Array.isArray(v) && (v[i] == null || v[i] === "")) ? n : null; }); }
  return out;
};

/** The routes above; null when the path is none of them. */
export async function metricsRoute(req, env, url) {
  const p = url.pathname, m = req.method;
  if (!p.startsWith("/community/admin/metrics") && !p.startsWith("/community/admin/links")) return null;
  const acc = await sessionAccount(req, env);
  if (!acc) return err("sign in with your Pitlane HQ account", 401);
  if (!isAdmin(env, acc.id)) return err("only the admins of this server can do this", 403);
  const now = Date.now(), today = dayOf(now);
  if (p === "/community/admin/metrics" && m === "GET") {
    const n = [4, 8, 12, 26].includes(Number(url.searchParams.get("weeks"))) ? Number(url.searchParams.get("weeks")) : 12, aud = url.searchParams.get("aud") === "1" ? 1 : 0;
    return json(await adminCache(env, `metrics/${n}/${aud}`, CACHE_S, async () => {
      const from = addDays(weekOf(today), -7 * (n - 1)), weeks = weeksBetween(from, today);
      const [rows, cohorts, links, targets, job] = await Promise.all([
        q(env, "SELECT week, metric, split, value FROM metrics_weeks WHERE week>=?1 AND aud=?2 LIMIT 50000", from, aud),
        q(env, "SELECT week, split, wk, size, ripe, active, drove, raced FROM cohort_weeks WHERE week>=?1 AND aud=?2 LIMIT 50000", from, aud),
        soft(q(env, "SELECT tag, name, place, created FROM links ORDER BY created DESC LIMIT 500")), state(env, "metrics_targets"), state(env, "metrics_job"),
      ]);
      return { ...metricsAnswer({ rows, cohorts, weeks, today, targets: targets || TARGETS, links, job }), aud, links };
    }));
  }
  // every payment and donation, the supporters and the founding supporters (paymentslib.js); read live, it is small
  if (p === "/community/admin/metrics/payments" && m === "GET") {
    const who = "SELECT account_id FROM pro_orders WHERE account_id IS NOT NULL UNION SELECT id FROM accounts WHERE supporter=1 OR founder=1";
    const [orders, accounts, clicks, seen, patrons] = await Promise.all([
      q(env, "SELECT id, account_id, email_hash, kind, status, until, at, amount, currency, ref FROM pro_orders WHERE status<>'test' ORDER BY at DESC LIMIT 5000"),
      q(env, `SELECT id, display, created, supporter, supporter_src, supporter_hidden, founder, pro, pro_src FROM accounts WHERE id IN (${who}) LIMIT 5000`),
      soft(q(env, `SELECT account_id, day, key, SUM(n) AS n FROM usage_days WHERE key IN ('act:donate_bar','act:donate_menu','act:donate_pro') AND account_id IN (${who}) GROUP BY account_id, day, key LIMIT 20000`)),
      soft(q(env, `SELECT account_id, MAX(last_seen) AS last_seen FROM presence WHERE account_id IN (${who}) GROUP BY account_id LIMIT 5000`)),
      soft(q(env, "SELECT COUNT(*) AS n FROM patreon_patrons WHERE active=1")),
    ]);
    const staff = (id) => isAdmin({ ...env, LOCAL: "0" }, id); // a tester's payment is a real one
    return json(paymentsOf({ orders, accounts, clicks, seen, patrons: (patrons[0] || {}).n || 0, staff, min: FOUNDING.min, now }));
  }
  // the thank-you email by hand for one donation (a donation from before the email existed): the admin types the donor's
  // email, which must be the one the donation or its account was made with (the server keeps only its hash)
  if (p === "/community/admin/metrics/payments/thanks" && m === "POST") {
    const b = await req.json().catch(() => null), id = String((b && b.id) || ""), to = String((b && b.email) || "").trim().toLowerCase();
    if (!id || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return err("an order and an email are needed", 400);
    const o = await env.DB.prepare("SELECT o.account_id, o.email_hash, o.status, a.email_hash AS acc_eh, a.founder FROM pro_orders o LEFT JOIN accounts a ON a.id=o.account_id WHERE o.id=?1 AND o.kind='supporter'").bind(id).first();
    if (!o || o.status !== "on") return err("no paid donation with that id", 404);
    const eh = await emailHash(env, to);
    if (eh !== o.email_hash && eh !== o.acc_eh) return err("that is not the email of this donation or its account", 400);
    const sl = o.account_id ? await env.DB.prepare("SELECT lang FROM support_msgs WHERE account_id=?1 AND from_support=0 AND lang IS NOT NULL ORDER BY created DESC LIMIT 1").bind(o.account_id).first().catch(() => null) : null;
    const l = ["en", "es", "pt"].includes(b && b.lang) ? b.lang : langOf(sl && sl.lang, "");
    const ok = await sendThanks(env, to, { l, founder: !!o.founder, account: !!o.account_id, f: FOUNDING });
    return ok ? json({ ok: true, lang: l }) : err("the email could not be sent", 502);
  }
  if (p === "/community/admin/metrics/run" && m === "POST") {
    const b = await req.json().catch(() => null);
    const out = await weeklyMetrics(env, { all: !!(b && b.all), now });
    await bust(env);
    return json({ ok: true, ...out });
  }
  if (p === "/community/admin/metrics/targets" && m === "POST") {
    const t = cleanTargets(await req.json().catch(() => null));
    await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('metrics_targets', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(JSON.stringify(t), now).run();
    await bust(env);
    return json({ ok: true, targets: t });
  }
  if (p === "/community/admin/metrics/health" && m === "GET") {
    return json(await adminCache(env, "metrics/health", CACHE_S, async () => {
      const d30 = addDays(today, -29), d7 = addDays(today, -6);
      const [rows, vers, reads, job, first] = await Promise.all([
        q(env, "SELECT substr(key,1,instr(key,':')-1) AS fam, device, MAX(day) AS last, COUNT(DISTINCT CASE WHEN day>=?2 THEN account_id END) AS users7 FROM usage_days WHERE day>=?1 GROUP BY 1, device", d30, d7),
        soft(q(env, "SELECT kind AS device, app_version AS v, COUNT(*) AS devices FROM presence WHERE last_seen>?1 AND app_version IS NOT NULL GROUP BY kind, app_version ORDER BY devices DESC LIMIT 60", now - 7 * DAY)),
        soft(q(env, "SELECT day, route, reqs, rows_read AS read, rows_written AS written FROM d1_usage WHERE day>=?1 AND (route LIKE '%/community/admin/metrics%' OR route LIKE '%/community/admin/analytics%' OR route='cron daily') ORDER BY day DESC, rows_read DESC LIMIT 200", d7)),
        state(env, "metrics_job"), env.DB.prepare("SELECT MIN(day) AS d FROM usage_days").first().catch(() => null),
      ]);
      return { today, families: healthOf(rows, today), versions: vers, reads, job, since: { usage: first && first.d ? first.d : null } };
    }));
  }
  if (p === "/community/admin/metrics/account" && m === "GET") {
    const id = String(url.searchParams.get("id") || "");
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) return err("bad id", 400);
    const a = await env.DB.prepare("SELECT id, created, src, src_page AS page, country FROM accounts WHERE id=?1").bind(id).first();
    if (!a) return err("no such account", 404);
    const [usage, sessions] = await Promise.all([
      q(env, "SELECT day, device, key FROM usage_days WHERE account_id=?1 ORDER BY day LIMIT 20000", id),
      q(env, "SELECT date(started/1000,'unixepoch') AS day, SUM(CASE WHEN lower(COALESCE(kind,'')) LIKE '%race%' THEN 1 ELSE 0 END) AS races FROM sessions WHERE uploader=?1 GROUP BY 1 LIMIT 5000", "acct:" + id),
    ]);
    return json({ id, src: a.src || "unknown", page: a.page || "", country: a.country || "", steps: timelineOf({ created: a.created, usage, sessions }) });
  }
  if (p === "/community/admin/links" && m === "GET") return json({ links: await q(env, "SELECT tag, name, place, created FROM links ORDER BY created DESC LIMIT 500") });
  if (p === "/community/admin/links" && m === "POST") {
    const b = await req.json().catch(() => null), name = String((b && b.name) || "").trim().slice(0, 80), place = String((b && b.place) || "").trim().slice(0, 120);
    if (!name) return err("give the link a name", 400);
    const tag = cleanTag((b && b.tag) || name);
    if (!tag || !SRC_RE.test(tag)) return err("the tag needs letters or numbers", 400);
    if (await env.DB.prepare("SELECT 1 FROM links WHERE tag=?1").bind(tag).first()) return err("that tag is already a link", 409);
    await env.DB.prepare("INSERT INTO links (tag, name, place, created) VALUES (?1,?2,?3,?4)").bind(tag, name, place, now).run();
    await bust(env);
    return json({ ok: true, tag, name, place, created: now });
  }
  if (p.startsWith("/community/admin/links/") && m === "DELETE") {
    const tag = cleanTag(decodeURIComponent(p.slice("/community/admin/links/".length)));
    const r = await env.DB.prepare("DELETE FROM links WHERE tag=?1").bind(tag).run();
    await bust(env);
    return json({ ok: true, deleted: (r.meta && r.meta.changes) || 0 });
  }
  return err("not found", 404);
}
