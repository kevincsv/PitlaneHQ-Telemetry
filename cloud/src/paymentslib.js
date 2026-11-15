// The admin Analytics' Payments: every payment and donation (pro_orders) with who, how much, when, where it came from
// and what it unlocked, the totals by week and by month, the supporters and the founding supporters. Pure functions,
// read by metrics.js (GET /community/admin/metrics/payments) and tested in cloud/test/payments.test.mjs.
// A donation from an admin is kept with status 'test' (stripe.js) and is never part of this.

const DAY = 86400e3;
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
// the Monday of a day, and its month
const weekOf = (t) => { const d = new Date(dayOf(t) + "T00:00:00Z"); return dayOf(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY); };
const monthOf = (t) => dayOf(t).slice(0, 7);

/** Where an order came from, by its id: Stripe's donation link, a Stripe purchase, Lemon Squeezy (the store before
 *  Stripe) or Pro given by hand. */
export function sourceOf(id) {
  const s = String(id || "");
  if (s.startsWith("stripe:don:")) return { src: "stripe", what: "donation" };
  if (s.startsWith("stripe:sub:")) return { src: "stripe", what: "subscription" };
  if (s.startsWith("stripe:pay:")) return { src: "stripe", what: "lifetime" };
  if (s.startsWith("order:") || s.startsWith("sub:")) return { src: "lemon", what: s.startsWith("sub:") ? "subscription" : "lifetime" };
  return { src: "manual", what: "other" };
}

// the app's buttons that open the donation link, by the usage counter they add to that day (index.html)
const BUTTONS = [["act:donate_bar", "bar"], ["act:donate_menu", "menu"], ["act:donate_pro", "pro"]];

/** orders: {id, account_id, kind, status, at, amount, currency, ref, until} (every kind and status but 'test');
 *  accounts: {id, display, created, supporter, supporter_src, supporter_hidden, founder, pro, pro_src} of the accounts
 *  in the orders and of every supporter or founder; clicks: {account_id, day, key, n} of the donate buttons;
 *  seen: {account_id, last_seen} the last time each account's app was open; staff(id): an admin or a tester;
 *  min: the founding offer's floor in dollars; now. */
export function paymentsOf({ orders = [], accounts = [], clicks = [], seen = [], patrons = 0, staff = () => false, min = 3, now = Date.now() }) {
  const acc = new Map(accounts.map((a) => [a.id, a])), last = new Map();
  for (const s of seen) last.set(s.account_id, Math.max(last.get(s.account_id) || 0, s.last_seen || 0));
  const btn = new Map();
  for (const c of clicks) { const b = BUTTONS.find(([k]) => c.key === k); if (b) { const k = c.account_id + "|" + c.day; btn.set(k, [...new Set([...(btn.get(k) || []), b[1]])]); } }
  const rows = orders.filter((o) => o.status !== "test").sort((a, b) => a.at - b.at);
  // what each donation unlocked: the badge with the first one, the founding offer with the one that reached the floor
  const given = new Map(), payments = [];
  for (const o of rows) {
    const { src, what } = sourceOf(o.id), a = acc.get(o.account_id) || null, key = o.account_id || "?" + (o.email_hash || o.id);
    const paid = o.status === "on" || o.status === "off"; // a subscription that ended was still paid
    const unlocked = [];
    if (o.kind === "supporter") {
      const before = given.get(key) || { n: 0, usd: 0 };
      const usd = before.usd + (paid && o.status === "on" && (o.currency || "usd") === "usd" ? o.amount || 0 : 0);
      if (o.status === "on") {
        if (!before.n) unlocked.push("badge");
        if (before.usd < min * 100 && usd >= min * 100) unlocked.push("founder");
        given.set(key, { n: before.n + 1, usd });
      }
    } else if (paid) unlocked.push(o.kind === "lifetime" ? "pro_life" : "pro_sub");
    const day = dayOf(o.at), via = o.account_id ? btn.get(o.account_id + "|" + day) || [] : [];
    payments.push({ at: o.at, id: o.id, ref: o.ref || "", account: o.account_id || "", name: a ? a.display || "" : "", src, what, kind: o.kind, status: o.status,
      amount: o.amount ?? null, currency: o.currency || "", unlocked, via, staff: !!(o.account_id && staff(o.account_id)), firstDay: !!(a && a.created && o.at - a.created < DAY) });
  }
  payments.reverse();
  // the totals by week and by month, in each currency, without the refunded ones
  const sumBy = (fn) => {
    const m = new Map();
    for (const p of payments) {
      if (p.status === "refunded" || p.amount == null) continue;
      const k = fn(p.at), cur = p.currency || "usd", x = m.get(k) || { key: k, n: 0, by: {}, donors: new Set() };
      x.n++; x.by[cur] = (x.by[cur] || 0) + p.amount; x.donors.add(p.account || p.id); m.set(k, x);
    }
    return [...m.values()].sort((a, b) => (a.key < b.key ? 1 : -1)).map((x) => ({ key: x.key, n: x.n, donors: x.donors.size, amounts: Object.entries(x.by).map(([currency, amount]) => ({ currency, amount })) }));
  };
  const total = (list) => { const by = {}; for (const p of list) if (p.status !== "refunded" && p.amount != null) by[p.currency || "usd"] = (by[p.currency || "usd"] || 0) + p.amount; return Object.entries(by).map(([currency, amount]) => ({ currency, amount })); };
  const inDays = (d) => payments.filter((p) => p.at >= now - d * DAY);
  // the supporters: everyone with the badge or the founding offer, and every donor, with what they gave
  const sup = new Map();
  for (const a of accounts) if (a.supporter || a.founder) sup.set(a.id, { id: a.id });
  for (const p of payments) if (p.kind === "supporter" && p.account) sup.set(p.account, { id: p.account });
  const supporters = [...sup.keys()].map((id) => {
    const a = acc.get(id) || {}, mine = payments.filter((p) => p.account === id && p.kind === "supporter");
    const ok = mine.filter((p) => p.status === "on");
    return { id, name: a.display || "", badge: !!a.supporter, badgeSrc: a.supporter ? a.supporter_src || "manual" : "", hidden: !!a.supporter_hidden, founder: !!a.founder,
      pro: !!a.pro, proSrc: a.pro_src || "", donations: ok.length, refunded: mine.filter((p) => p.status === "refunded").length, given: total(ok),
      first: ok.length ? Math.min(...ok.map((p) => p.at)) : 0, last: ok.length ? Math.max(...ok.map((p) => p.at)) : 0,
      created: a.created || 0, seen: last.get(id) || 0, staff: staff(id),
      // the founding offer without the dollars in donations: given with the badge before the floor (0103) or by hand
      founderNoFloor: !!a.founder && (ok.filter((p) => (p.currency || "usd") === "usd").reduce((s, p) => s + (p.amount || 0), 0) < min * 100) };
  }).sort((a, b) => (b.last || 0) - (a.last || 0) || (b.created || 0) - (a.created || 0));
  const waiting = payments.filter((p) => p.kind === "supporter" && p.status === "on" && !p.account).length;
  const donors = new Set(payments.filter((p) => p.status === "on").map((p) => p.account || p.id)).size;
  return {
    min, payments: payments.slice(0, 500), weeks: sumBy(weekOf).slice(0, 26), months: sumBy(monthOf).slice(0, 24),
    totals: { all: total(payments), d30: total(inDays(30)), d7: total(inDays(7)), n: payments.filter((p) => p.status === "on").length, n30: inDays(30).filter((p) => p.status === "on").length,
      refunded: payments.filter((p) => p.status === "refunded").length, donors, waiting,
      supporters: supporters.filter((s) => s.badge).length, founders: supporters.filter((s) => s.founder).length, patrons: patrons || 0,
      repeat: supporters.filter((s) => s.donations > 1).length },
    supporters,
  };
}
