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

// the founding supporter offer: donations of $3 or more in all; smaller gifts keep the badge alone. The new account's
// days of Pro and the launch's thank-you month start only once Pro is on
{
  const { register } = await import("node:module");
  // the Worker imports JSON without import attributes (wrangler bundles it): node reads it as a module here
  register("data:text/javascript," + encodeURIComponent(`import {readFile} from "node:fs/promises";export async function load(u,c,n){if(u.endsWith(".json"))return {format:"module",source:"export default "+await readFile(new URL(u),"utf8"),shortCircuit:true};return n(u,c)}`));
  const { foundingCheck, proOf, trialOnRegister, proLaunch, proGateReset, TRIAL_DAYS, FOUNDING } = await import("../src/lemon.js");
  assert.equal(FOUNDING.min, 3); assert.equal(TRIAL_DAYS, 14);
  const give = async (acc, cents, id, email) => {
    const body = JSON.stringify({ id: "evt_f" + id, type: "checkout.session.completed", data: { object: { id: "cs_f" + id, mode: "payment", payment_status: "paid", payment_intent: "pi_f" + id, payment_link: "plink_x", amount_total: cents, currency: "usd", ...(acc ? { client_reference_id: "support-" + acc } : {}), ...(email ? { customer_details: { email } } : {}) } } });
    const r = await stripeWebhook(new Request("https://x/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": sign(body) } }), env, emailHash, { supportLink: "plink_x", founding: foundingCheck });
    return r.json();
  };
  const row = (id) => db.prepare("SELECT supporter, founder, trial_until, ref_months FROM accounts WHERE id=?").get(id);
  acct("acctfound1", "f1@x.io"); acct("acctfound2", "f2@x.io");
  assert.equal((await give("acctfound1", 150, 1)).founder, false);
  assert.deepEqual([row("acctfound1").supporter, row("acctfound1").founder], [1, 0], "$1.50: the badge, not the offer");
  assert.equal((await give("acctfound1", 150, 2)).founder, true, "$1.50 + $1.50 reaches the floor");
  assert.equal(row("acctfound1").founder, 1);
  assert.equal((await give("acctfound2", 300, 3)).founder, true, "$3 at once");
  // a donor without an account: the offer waits for their sign-up
  assert.equal((await give(null, 2500, 4, "later@x.io")).founder, true);
  // trial and launch month: nothing while Pro is off
  acct("accttrial1", "t1@x.io");
  proGateReset();
  assert.equal(await trialOnRegister(env, "accttrial1"), 0, "no trial during the beta");
  assert.equal(proOf(row("accttrial1")).pro, false);
  db.prepare("INSERT INTO app_state (k, v, at) VALUES ('pro_gate','1',1) ON CONFLICT(k) DO UPDATE SET v='1'").run();
  proGateReset();
  const before = row("acctfound1").ref_months;
  db.prepare("UPDATE accounts SET created=1").run();
  assert.equal((await proLaunch(env)).launched, true);
  assert.equal(row("acctfound1").ref_months, before + 1, "the thank-you month for the beta's accounts");
  assert.equal((await proLaunch(env)).launched, false, "only once");
  assert.equal(row("acctfound1").ref_months, before + 1);
  const until = await trialOnRegister(env, "accttrial1");
  assert.ok(until > Date.now() + 13 * DAY && until < Date.now() + 15 * DAY);
  assert.deepEqual(proOf(row("accttrial1")), { pro: true, proSrc: "trial", proUntil: until });
  assert.equal(proOf({ trial_until: Date.now() - 1 }).pro, false, "the trial ended");
  assert.equal(proOf({ pro: 1, pro_src: "subscription", pro_until: 0, trial_until: until }).proSrc, "subscription", "a purchase wins");
  db.prepare("UPDATE app_state SET v='0' WHERE k='pro_gate'").run(); proGateReset();
  // an admin's donation is a test: kept as 'test', no badge, no offer, never counted
  acct("acctadmin1", "a1@x.io");
  const body = JSON.stringify({ id: "evt_adm", type: "checkout.session.completed", data: { object: { id: "cs_adm", mode: "payment", payment_status: "paid", payment_intent: "pi_adm", payment_link: "plink_x", amount_total: 500, currency: "usd", client_reference_id: "support-acctadmin1" } } });
  const r = await (await stripeWebhook(new Request("https://x/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": sign(body) } }), env, emailHash, { supportLink: "plink_x", founding: foundingCheck, isAdmin: (e, id) => id === "acctadmin1" })).json();
  assert.equal(r.test, true);
  assert.equal(db.prepare("SELECT status FROM pro_orders WHERE id='stripe:don:cs_adm'").get().status, "test");
  assert.deepEqual([row("acctadmin1").supporter, row("acctadmin1").founder], [0, 0], "no badge for a test");
  // the thank-you email goes to the donor, with the founding offer when they have it (not for a test)
  const sent = [], th = async (e, to, o) => { sent.push({ to, ...o }); return true; };
  acct("acctthanks", "th@x.io");
  const tb = JSON.stringify({ id: "evt_th", type: "checkout.session.completed", data: { object: { id: "cs_th", mode: "payment", payment_status: "paid", payment_intent: "pi_th", payment_link: "plink_x", amount_total: 213, currency: "usd", client_reference_id: "support-acctthanks", customer_details: { email: "th@x.io", address: { country: "ES" } } } } });
  await stripeWebhook(new Request("https://x/stripe/webhook", { method: "POST", body: tb, headers: { "stripe-signature": sign(tb) } }), env, emailHash, { supportLink: "plink_x", founding: foundingCheck, isAdmin: (e, id) => id === "acctadmin1", thanks: th });
  assert.deepEqual(sent, [{ to: "th@x.io", l: "es", founder: false, account: true }]);
}
console.log("founding, trial and launch month ok");
