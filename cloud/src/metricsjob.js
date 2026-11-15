// The daily job of the admin Analytics' weekly numbers (metrics.js has the routes; kept apart so
// cloud/test/metrics.test.mjs runs it on SQLite). It reads the usage, the sessions, the accounts, the visits, the
// installer's counts, the donations and the invites of the last JOB_WEEKS weeks, adds them up (metricslib.js) and writes
// only the rows that changed into metrics_weeks and cohort_weeks.
import { buildMetrics, changedRows, metricKey, cohortKey, sameMetric, sameCohort, weekOf, addDays, weeksBetween, dayOf, JOB_WEEKS } from "./metricslib.js";

const q = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results || []);
const soft = (p) => p.catch(() => []);

// the rows the job reads (the test runs them on SQLite too)
export const SQL_M_ACCOUNTS = "SELECT id, created, COALESCE(src,'unknown') AS src, tester FROM accounts LIMIT 100000";
export const SQL_M_USAGE = "SELECT account_id, day, device, key, n FROM usage_days WHERE day>=?1 LIMIT 200000";
export const SQL_M_SESSIONS = "SELECT date(started/1000,'unixepoch') AS day, game, uploader, COUNT(*) AS n, SUM(CASE WHEN lower(COALESCE(kind,'')) LIKE '%race%' THEN 1 ELSE 0 END) AS races, MIN(started) AS first FROM sessions WHERE started>=?1 AND uploader LIKE 'acct:%' GROUP BY 1, game, uploader LIMIT 100000";
export const SQL_M_ANON = "SELECT date(started/1000,'unixepoch') AS day, uploader, COUNT(*) AS n FROM sessions WHERE started>=?1 AND uploader LIKE 'dev:%' GROUP BY 1, uploader LIMIT 50000";
export const SQL_M_VISITS = "SELECT day, src, SUM(n) AS n FROM visits_days WHERE day>=?1 GROUP BY day, src LIMIT 50000";
export const SQL_M_UPSERT = "INSERT INTO metrics_weeks (week, aud, metric, split, value) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(week, aud, metric, split) DO UPDATE SET value=excluded.value";
export const SQL_C_UPSERT = "INSERT INTO cohort_weeks (week, aud, split, wk, size, ripe, active, drove, raced) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9) ON CONFLICT(week, aud, split, wk) DO UPDATE SET size=excluded.size, ripe=excluded.ripe, active=excluded.active, drove=excluded.drove, raced=excluded.raced";

/** The daily job: the last JOB_WEEKS weeks (or everything there is, all) added up and the changed rows written.
 *  Answers {from, weeks, metrics, cohorts, wrote, ms}. */
export async function weeklyMetrics(env, { all = false, now = Date.now(), staff = () => false } = {}) {
  const t0 = Date.now(), today = dayOf(now);
  let from = addDays(weekOf(today), -7 * (JOB_WEEKS - 1));
  if (all) {
    const f = await env.DB.prepare("SELECT MIN(day) AS d FROM usage_days").first().catch(() => null);
    const a = await env.DB.prepare("SELECT MIN(created) AS t FROM accounts").first().catch(() => null);
    const first = [f && f.d, a && a.t ? dayOf(a.t) : null].filter(Boolean).sort()[0] || today, floor = addDays(today, -400);
    // never before the 400 days the usage is kept
    from = weekOf(first < floor ? floor : first);
  }
  const ms = Date.parse(from + "T00:00:00Z");
  const [accounts, usage, sessions, anon, visits, pc, orders, referrals, events, badge] = await Promise.all([
    q(env, SQL_M_ACCOUNTS), q(env, SQL_M_USAGE, from), q(env, SQL_M_SESSIONS, ms), soft(q(env, SQL_M_ANON, ms)), soft(q(env, SQL_M_VISITS, from)),
    soft(q(env, "SELECT day, kind, SUM(n) AS n FROM pc_days WHERE day>=?1 AND v<>'beta' GROUP BY day, kind LIMIT 5000", from)),
    soft(q(env, "SELECT at, amount, currency FROM pro_orders WHERE kind='supporter' AND status<>'refunded' AND at>=?1 LIMIT 5000", ms)),
    soft(q(env, "SELECT created, state, done FROM referrals WHERE created>=?1 OR done>=?1 LIMIT 20000", ms)),
    soft(q(env, "SELECT at, name FROM events WHERE at>=?1 LIMIT 50000", ms)),
    soft(q(env, "SELECT COUNT(*) AS n FROM accounts WHERE supporter=1")),
  ]);
  // the admins and the testers are staff: the drivers' numbers leave them out
  const built = buildMetrics({ accounts: accounts.map((a) => ({ id: a.id, created: a.created, src: a.src, staff: staff(a) })), usage, sessions, anon, visits, pc, orders, referrals, events, from, today, supporters: badge[0] ? badge[0].n : null });
  const [haveM, haveC] = await Promise.all([
    q(env, "SELECT week, aud, metric, split, value FROM metrics_weeks WHERE week>=?1 LIMIT 200000", from),
    q(env, "SELECT week, aud, split, wk, size, ripe, active, drove, raced FROM cohort_weeks WHERE week>=?1 LIMIT 200000", from),
  ]);
  // a number that was there and is no longer (a session deleted, an account gone) goes back to zero; the supporters
  // of the weeks before are kept as they were counted then
  const nextKeys = new Set(built.metrics.map(metricKey));
  for (const o of haveM) if (!nextKeys.has(metricKey(o)) && o.value && o.metric !== "supporters") built.metrics.push({ ...o, value: 0 });
  const cKeys = new Set(built.cohorts.map(cohortKey));
  for (const o of haveC) if (!cKeys.has(cohortKey(o)) && o.size) built.cohorts.push({ ...o, size: 0, ripe: 0, active: 0, drove: 0, raced: 0 });
  const m = changedRows(built.metrics, haveM, metricKey, sameMetric), c = changedRows(built.cohorts, haveC, cohortKey, sameCohort);
  const st = [...m.map((x) => env.DB.prepare(SQL_M_UPSERT).bind(x.week, x.aud, x.metric, x.split, x.value)), ...c.map((x) => env.DB.prepare(SQL_C_UPSERT).bind(x.week, x.aud, x.split, x.wk, x.size, x.ripe, x.active, x.drove, x.raced))];
  for (let i = 0; i < st.length; i += 80) await env.DB.batch(st.slice(i, i + 80));
  const out = { at: now, from, weeks: weeksBetween(from, today).length, metrics: built.metrics.length, cohorts: built.cohorts.length, wrote: st.length, read: accounts.length + usage.length + sessions.length + visits.length + haveM.length + haveC.length, ms: Date.now() - t0 };
  await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('metrics_job', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(JSON.stringify(out), now).run().catch(() => {});
  return out;
}

