// Pro bought in a store (Lemon Squeezy, Stripe): given to the account, and every purchase kept in pro_orders so a buyer
// without an account yet gets it when they sign up with that email (proOnRegister in lemon.js)
// give (or take) Pro: on the account when it is known, and kept by the email's hash for an account made later
export async function setPro(env, { accountId, eh, kind, until, on, order }) {
  const now = Date.now();
  if (!accountId && eh) { const a = await env.DB.prepare("SELECT id FROM accounts WHERE email_hash=?1").bind(eh).first().catch(() => null); if (a) accountId = a.id; }
  if (order) await env.DB.prepare("INSERT INTO pro_orders (id, account_id, email_hash, kind, status, until, at) VALUES (?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(id) DO UPDATE SET account_id=COALESCE(excluded.account_id, pro_orders.account_id), status=excluded.status, until=excluded.until, at=excluded.at")
    .bind(order, accountId || null, eh || null, kind, on ? "on" : "off", until || 0, now).run();
  if (!accountId) return false;
  if (on) await env.DB.prepare("UPDATE accounts SET pro=1, pro_src=?2, pro_until=?3, pro_since=CASE WHEN pro_since>0 THEN pro_since ELSE ?4 END WHERE id=?1 AND NOT (pro=1 AND pro_src='lifetime' AND ?2<>'lifetime')").bind(accountId, kind, until || 0, now).run();
  // a subscription that ends or an order refunded never takes away a lifetime or a Pro given by hand
  else await env.DB.prepare("UPDATE accounts SET pro=0, pro_src=NULL, pro_until=0 WHERE id=?1 AND pro_src=?2").bind(accountId, kind).run();
  return true;
}
