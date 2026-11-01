// Pitlane HQ Pro bought with Stripe (Managed Payments: Stripe is the merchant of record and handles VAT and sales tax).
// The apps open a Stripe Payment Link with ?client_reference_id=<account id>&prefilled_email=<email>. Stripe calls
// POST /stripe/webhook for every event, signed with the endpoint's secret (STRIPE_WEBHOOK_SECRET, the
// Stripe-Signature header: HMAC-SHA256 of "<t>.<body>"). The server needs no Stripe API key.
// - checkout.session.completed (and async_payment_succeeded): a one-off payment is the lifetime offer; a subscription
//   gives Pro until its period ends (35 days until Stripe sends the subscription itself)
// - customer.subscription.created / updated / deleted: the subscription's state and the end of the paid period
//   (+3 days of grace for the renewal); a cancelled subscription keeps Pro until the period it paid for ends
// - charge.refunded: a fully refunded lifetime payment takes the lifetime away; a refunded donation is marked refunded
// - a donation (the Support link: client_reference_id "support-<account id>", or the session's payment_link is
//   donate.link of license_plans.json) gives the ♥ Supporter badge, like Patreon, never Pro; a donor without an account
//   gets it when they sign up with that email (pro_orders kind 'supporter')
// The account comes from client_reference_id; without it the buyer's email is matched by its hash, now or when they
// sign up (pro_orders, proOnRegister in lemon.js). A subscription's events find their account through its order.
import { setPro } from "./prostore.js";

const JSONH = { "content-type": "application/json" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: JSONH });
const err = (e, s = 400) => json({ error: e }, s);
const DAY = 86400e3, GRACE = 3 * DAY, FIRST = 35 * DAY, TOLERANCE = 300;

async function hmacHex(secret, body) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body)));
  return [...s].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

// is this body signed by Stripe with this secret, recently? (a resent event older than TOLERANCE seconds is refused)
export async function stripeSigned(secret, header, body, nowSec = Math.floor(Date.now() / 1000)) {
  let t = 0; const v1 = [];
  for (const part of String(header || "").split(",")) {
    const i = part.indexOf("="); if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === "t") t = +v; else if (k === "v1") v1.push(v.toLowerCase());
  }
  if (!t || !v1.length || Math.abs(nowSec - t) > TOLERANCE) return false;
  const want = await hmacHex(secret, t + "." + body);
  return v1.some((s) => same(s, want));
}

const subOrder = (id) => "stripe:sub:" + id;
const payOrder = (id) => "stripe:pay:" + id;
const donOrder = (id) => "stripe:don:" + id;
const orderRow = (env, id) => env.DB.prepare("SELECT account_id, email_hash, kind, until, status FROM pro_orders WHERE id=?1").bind(id).first().catch(() => null);

export async function stripeWebhook(req, env, emailHash, opts = {}) {
  if (!env.STRIPE_WEBHOOK_SECRET) return err("Stripe is not set up on this server", 404);
  const body = await req.text();
  if (body.length > 300000) return err("too large", 413);
  if (!(await stripeSigned(env.STRIPE_WEBHOOK_SECRET, req.headers.get("stripe-signature"), body))) return err("bad signature", 401);
  let j;
  try { j = JSON.parse(body); } catch (e) { return err("not JSON"); }
  const ev = String(j.type || ""), o = (j.data && j.data.object) || {}, now = Date.now();

  if (ev === "checkout.session.completed" || ev === "checkout.session.async_payment_succeeded") {
    let ref = String(o.client_reference_id || "");
    const support = ref.startsWith("support-") || !!(opts.supportLink && o.payment_link === opts.supportLink);
    if (ref.startsWith("support-")) ref = ref.slice(8);
    let accountId = /^[\w-]{6,80}$/.test(ref) ? ref : null;
    if (accountId) { const a = await env.DB.prepare("SELECT id FROM accounts WHERE id=?1").bind(accountId).first().catch(() => null); if (!a) accountId = null; }
    const email = String((o.customer_details && o.customer_details.email) || o.customer_email || "").trim().toLowerCase();
    const eh = email ? await emailHash(env, email) : null;
    if (support) {
      if (o.payment_status !== "paid") return json({ ok: true, skipped: "not paid yet" });
      if (!accountId && eh) { const a = await env.DB.prepare("SELECT id FROM accounts WHERE email_hash=?1").bind(eh).first().catch(() => null); if (a) accountId = a.id; }
      // the amount and currency for the admin Analytics (pcstats.js), and the payment so a refund finds it
      const pi = typeof o.payment_intent === "string" ? o.payment_intent : (o.payment_intent && o.payment_intent.id) || null;
      const amount = Number.isFinite(+o.amount_total) && o.amount_total !== null ? Math.round(+o.amount_total) : null;
      const cur = /^[a-z]{3}$/i.test(String(o.currency || "")) ? String(o.currency).toLowerCase() : null;
      await env.DB.prepare("INSERT INTO pro_orders (id, account_id, email_hash, kind, status, until, at, amount, currency, ref) VALUES (?1,?2,?3,'supporter','on',0,?4,?5,?6,?7) ON CONFLICT(id) DO NOTHING").bind(donOrder(o.id), accountId, eh, now, amount, cur, pi).run();
      if (accountId) await env.DB.prepare("UPDATE accounts SET supporter=1, supporter_src=COALESCE(supporter_src,'stripe') WHERE id=?1").bind(accountId).run();
      return json({ ok: true, supporter: !!accountId });
    }
    if (o.mode === "subscription" && o.subscription) {
      const id = subOrder(typeof o.subscription === "string" ? o.subscription : o.subscription.id);
      const had = await orderRow(env, id);
      // the subscription's own event may have come first: it knows the real end (or that it already ended)
      if (had && had.status === "off") { await setPro(env, { accountId, eh, kind: "subscription", until: had.until, on: false, order: id }); return json({ ok: true, subscription: false }); }
      const until = Math.max((had && had.until) || 0, now + FIRST);
      await setPro(env, { accountId, eh, kind: "subscription", until, on: true, order: id });
      return json({ ok: true, subscription: true });
    }
    if (o.mode === "payment") {
      if (o.payment_status !== "paid") return json({ ok: true, skipped: "not paid yet" });
      const pi = typeof o.payment_intent === "string" ? o.payment_intent : (o.payment_intent && o.payment_intent.id) || o.id;
      await setPro(env, { accountId, eh, kind: "lifetime", until: 0, on: true, order: payOrder(pi) });
      return json({ ok: true, lifetime: true });
    }
    return json({ ok: true, skipped: "mode " + o.mode });
  }

  if (/^customer\.subscription\.(created|updated|deleted)$/.test(ev) && o.id) {
    if (o.status === "incomplete") return json({ ok: true, skipped: "incomplete" });
    const id = subOrder(o.id), had = await orderRow(env, id);
    const end = o.current_period_end || (o.items && o.items.data && o.items.data[0] && o.items.data[0].current_period_end) || 0;
    const live = ev !== "customer.subscription.deleted" && ["active", "trialing", "past_due"].includes(o.status);
    const until = end ? end * 1000 + GRACE : (had && had.until) || now + FIRST;
    const on = live && until > now;
    await setPro(env, { accountId: (had && had.account_id) || null, eh: (had && had.email_hash) || null, kind: "subscription", until: on ? until : now, on, order: id });
    return json({ ok: true, subscription: on });
  }

  if (ev === "charge.refunded" && o.refunded && o.payment_intent) {
    const pi = typeof o.payment_intent === "string" ? o.payment_intent : o.payment_intent.id;
    const had = await orderRow(env, payOrder(pi));
    if (!had || had.kind !== "lifetime") {
      // a refunded donation keeps the badge it gave, but no longer counts as a donation (nor gives it on a later sign-up)
      const r = await env.DB.prepare("UPDATE pro_orders SET status='refunded' WHERE kind='supporter' AND ref=?1").bind(pi).run().catch(() => null);
      return json({ ok: true, skipped: r && r.meta && r.meta.changes ? "donation refunded" : "not a lifetime payment" });
    }
    await setPro(env, { accountId: had.account_id, eh: had.email_hash, kind: "lifetime", until: 0, on: false, order: payOrder(pi) });
    return json({ ok: true, lifetime: false });
  }
  return json({ ok: true, skipped: ev });
}
