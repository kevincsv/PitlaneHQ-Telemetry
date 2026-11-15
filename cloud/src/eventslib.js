// What the server itself does to an account and when (migration 0105, table events): a trial started or ended, a
// payment, a month of Pro given, an email sent or its link opened. The admin Analytics counts them week by week
// (metrics.js, "e:<name>"). Names: trial_started, trial_ended, pro_paid, pro_renewed, pro_cancelled, pro_refunded,
// thanks_month, donation_paid, email_sent, email_click.
export const EVENT_RE = /^[a-z0-9_]{2,40}$/;
export const SQL_EVENT_ADD = "INSERT OR IGNORE INTO events (id, at, account_id, name, info) VALUES (?1,?2,?3,?4,?5)";
/** The statement that keeps one event, to run alone or inside a batch; null when the name is not one. id: its own id
 * when the same event can arrive twice (a payment webhook sent again), so it is kept once. */
export function eventStmt(env, name, accountId, info, at = Date.now(), id = "") {
  if (!EVENT_RE.test(String(name))) return null;
  let j = null;
  try { j = info == null ? null : JSON.stringify(info).slice(0, 1000); } catch { j = null; }
  return env.DB.prepare(SQL_EVENT_ADD).bind(id ? String(id).slice(0, 120) : crypto.randomUUID(), at, accountId || null, name, j);
}
/** Keeps one event; never fails the request that caused it. */
export async function logEvent(env, name, accountId, info, at, id) {
  const st = eventStmt(env, name, accountId, info, at || Date.now(), id);
  if (st) await st.run().catch(() => {});
}
