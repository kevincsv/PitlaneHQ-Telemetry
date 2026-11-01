// node cloud/test/stripe.test.mjs: Pro bought with Stripe (stripe.js): only events signed with the webhook's secret count,
// a lifetime payment gives Pro for good and a full refund takes it away, a subscription gives Pro until its period ends
// (whichever of its events comes first) and ends with it, and a buyer without an account gets Pro when they sign up
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createHmac } from "node:crypto";
import { stripeWebhook, stripeSigned } from "../src/stripe.js";

const db = new DatabaseSync(":memory:");
const dir = new URL("../migrations/", import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
const stmt = (sql) => {
  const s = { args: [], bind(...a) { s.args = a; return s; },
    first: async () => db.prepare(sql).get(...s.args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...s.args) }),
    run: async () => { const r = db.prepare(sql).run(...s.args); return { meta: { changes: r.changes } }; } };
  return s;
};
const SECRET = "whsec_test";
const env = { DB: { prepare: stmt }, STRIPE_WEBHOOK_SECRET: SECRET };
const emailHash = async (_env, e) => "eh:" + String(e).trim().toLowerCase();
const acct = (id, email) => db.prepare("INSERT INTO accounts (id, email_hash, auth_salt, auth_hash, wrapped_key, display, created) VALUES (?,?,?,?,?,?,?)").run(id, "eh:" + email, "s", "h", "k", id, 1);
acct("acct000001", "a@x.io"); acct("acct000002", "b@x.io"); acct("acct000003", "c@x.io");
const pro = (id) => db.prepare("SELECT pro, pro_src, pro_until FROM accounts WHERE id=?").get(id);

const sign = (body, t = Math.floor(Date.now() / 1000), secret = SECRET) => `t=${t},v1=${createHmac("sha256", secret).update(t + "." + body).digest("hex")}`;
const send = async (type, object, sig) => {
  const body = JSON.stringify({ id: "evt_" + Math.random(), type, data: { object } });
  const r = await stripeWebhook(new Request("https://x/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": sig === undefined ? sign(body) : sig } }), env, emailHash);
  return { status: r.status, j: await r.json() };
};
const sec = (ms) => Math.floor(ms / 1000), DAY = 86400e3;

// signatures
{
  const b = '{"a":1}';
  assert.equal(await stripeSigned(SECRET, sign(b), b), true);
  assert.equal(await stripeSigned(SECRET, sign(b, undefined, "other"), b), false, "another secret");
  assert.equal(await stripeSigned(SECRET, sign(b, sec(Date.now()) - 3600), b), false, "an old event");
  assert.equal(await stripeSigned(SECRET, sign(b), b + " "), false, "a changed body");
  assert.equal((await send("checkout.session.completed", { mode: "payment" }, "t=1,v1=00")).status, 401);
  assert.equal((await stripeWebhook(new Request("https://x", { method: "POST", body: "{}" }), { ...env, STRIPE_WEBHOOK_SECRET: "" }, emailHash)).status, 404, "not set up");
}

// lifetime: paid once, then refunded
{
  await send("checkout.session.completed", { mode: "payment", payment_status: "unpaid", payment_intent: "pi_1", client_reference_id: "acct000001" });
  assert.equal(pro("acct000001").pro, 0, "not paid yet");
  await send("checkout.session.async_payment_succeeded", { mode: "payment", payment_status: "paid", payment_intent: "pi_1", client_reference_id: "acct000001" });
  assert.deepEqual({ ...pro("acct000001") }, { pro: 1, pro_src: "lifetime", pro_until: 0 });
  await send("charge.refunded", { refunded: false, payment_intent: "pi_1" });
  assert.equal(pro("acct000001").pro, 1, "a partial refund keeps it");
  await send("charge.refunded", { refunded: true, payment_intent: "pi_1" });
  assert.equal(pro("acct000001").pro, 0, "a full refund takes it away");
}

// subscription: checkout first, then its events
{
  const end = sec(Date.now() + 365 * DAY);
  await send("checkout.session.completed", { mode: "subscription", subscription: "sub_1", payment_status: "paid", client_reference_id: "acct000002" });
  let p = pro("acct000002");
  assert.equal(p.pro_src, "subscription"); assert.ok(p.pro_until > Date.now() + 30 * DAY, "a month until Stripe says more");
  await send("customer.subscription.updated", { id: "sub_1", status: "active", items: { data: [{ current_period_end: end }] } });
  assert.equal(pro("acct000002").pro_until, end * 1000 + 3 * DAY, "the yearly period, plus grace");
  await send("customer.subscription.updated", { id: "sub_1", status: "active", cancel_at_period_end: true, current_period_end: end });
  assert.equal(pro("acct000002").pro, 1, "cancelled keeps what was paid for");
  await send("customer.subscription.deleted", { id: "sub_1", status: "canceled", current_period_end: end });
  assert.equal(pro("acct000002").pro, 0, "ended");
}

// subscription: its event comes before the checkout; a lifetime is never taken by a subscription ending
{
  const end = sec(Date.now() + 30 * DAY);
  await send("customer.subscription.created", { id: "sub_2", status: "active", current_period_end: sec(Date.now() + 400 * DAY) });
  await send("checkout.session.completed", { mode: "subscription", subscription: "sub_2", client_reference_id: "acct000003" });
  assert.equal(pro("acct000003").pro_until, sec(Date.now() + 400 * DAY) * 1000 + 3 * DAY, "keeps the real end");
  db.prepare("UPDATE accounts SET pro_src='lifetime', pro_until=0 WHERE id='acct000003'").run();
  await send("customer.subscription.deleted", { id: "sub_2", status: "canceled", current_period_end: end });
  assert.equal(pro("acct000003").pro, 1, "the lifetime stays");
}

// a buyer without an account: kept by the email's hash
{
  await send("checkout.session.completed", { mode: "payment", payment_status: "paid", payment_intent: "pi_9", customer_details: { email: " New@X.io " } });
  const o = db.prepare("SELECT account_id, email_hash, kind, status FROM pro_orders WHERE id='stripe:pay:pi_9'").get();
  assert.deepEqual({ ...o }, { account_id: null, email_hash: "eh:new@x.io", kind: "lifetime", status: "on" });
  acct("acct000004", "new@x.io");
  await send("checkout.session.completed", { mode: "payment", payment_status: "paid", payment_intent: "pi_10", client_reference_id: "nope-not-an-account", customer_details: { email: "new@x.io" } });
  assert.equal(pro("acct000004").pro, 1, "an unknown account id falls back to the email");
}
// donations (the Support link): the Supporter badge, never Pro; a refund leaves it; a donor without an account gets it on sign-up
{
  acct("acct000005", "d@x.io");
  const sup = (id) => db.prepare("SELECT supporter, supporter_src, pro FROM accounts WHERE id=?").get(id);
  await send("checkout.session.completed", { id: "cs_d1", mode: "payment", payment_status: "paid", payment_intent: "pi_d1", client_reference_id: "support-acct000005", amount_total: 500, currency: "USD" });
  assert.deepEqual({ ...sup("acct000005") }, { supporter: 1, supporter_src: "stripe", pro: 0 });
  assert.deepEqual({ ...db.prepare("SELECT amount, currency, ref, status FROM pro_orders WHERE id='stripe:don:cs_d1'").get() }, { amount: 500, currency: "usd", ref: "pi_d1", status: "on" }, "the amount for the Analytics");
  await send("charge.refunded", { refunded: true, payment_intent: "pi_d1" });
  assert.equal(sup("acct000005").supporter, 1);
  assert.equal(db.prepare("SELECT status FROM pro_orders WHERE id='stripe:don:cs_d1'").get().status, "refunded", "a refunded donation no longer counts");
  const r = await stripeWebhook(new Request("https://x", { method: "POST", body: JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_d2", mode: "payment", payment_status: "paid", payment_link: "plink_support", customer_details: { email: "later@x.io" } } } }), headers: {} }), env, emailHash, { supportLink: "plink_support" }).catch(() => null);
  assert.equal(r.status, 401, "unsigned");
  const body = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_d2", mode: "payment", payment_status: "paid", payment_link: "plink_support", customer_details: { email: "later@x.io" } } } });
  await stripeWebhook(new Request("https://x", { method: "POST", body, headers: { "stripe-signature": sign(body) } }), env, emailHash, { supportLink: "plink_support" });
  const o = db.prepare("SELECT kind, account_id FROM pro_orders WHERE id='stripe:don:cs_d2'").get();
  assert.deepEqual({ ...o }, { kind: "supporter", account_id: null }, "kept for a later account, not as Pro");
}
console.log("stripe.test: ok");
