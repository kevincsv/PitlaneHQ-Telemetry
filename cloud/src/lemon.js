// Pitlane HQ Pro: who has it and the lifetime offer.
// During the beta everything is free; the admins switch Pro on when it ends (the admin page, app_state 'pro_gate').
// Then the experimental overlays and more than freeApps programs starting by themselves need Pro. Pro comes from Lemon Squeezy (the
// lifetime offer: half price during the beta) or from an admin by hand. Lemon Squeezy calls POST /lemonsqueezy/webhook
// for every order and subscription, signed with the webhook's secret (LEMONSQUEEZY_WEBHOOK_SECRET, HMAC-SHA256 of the
// body in X-Signature); the checkout carries the account's id (custom data), else the buyer's email is matched by its
// hash (the server never keeps emails). A buyer without an account yet gets Pro when they create one with that email.
import PLANS from "../../license_plans.json";
import { sessionAccount, isAdmin, emailHash } from "./accounts.js";
import { setPro } from "./prostore.js";

const JSONH = { "content-type": "application/json", "access-control-allow-origin": "*" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: JSONH });
const err = (e, s = 400) => json({ error: e }, s);

// is Pro switched on (the beta is over)? cached for a minute
let gateAt = 0, gateOn = false;
export async function proGate(env) {
  if (Date.now() - gateAt < 60e3) return gateOn;
  const r = await env.DB.prepare("SELECT v FROM app_state WHERE k='pro_gate'").first().catch(() => null);
  gateOn = !!(r && r.v === "1"); gateAt = Date.now();
  return gateOn;
}
export const proGateReset = () => { gateAt = 0; };

const DAY = 86400e3, MONTH = 30 * DAY;
export const TRIAL_DAYS = PLANS.trialDays > 0 ? PLANS.trialDays : 0;
export const FOUNDING = { min: 3, off: 50, lifetime: 29.99, months: 2, graceMonths: 2, ...(PLANS.founding || {}) };
const THANKS_MONTHS = (PLANS.launch && PLANS.launch.thanksMonths) || 0;

// an account's Pro, from its row (accounts.*)
// (or from its invites: "Invite a friend" gives months of Pro of its own, ref_pro_until, referrals.js; the launch's
// thank-you month goes there too; or the new account's first days, trial_until, given only once Pro is on)
export function proOf(a) {
  const now = Date.now(), on = !!(a && a.pro) && (!a.pro_until || a.pro_until > now);
  if (on) return { pro: true, proSrc: a.pro_src || "", proUntil: a.pro_until || 0 };
  const gift = (a && a.ref_pro_until) || 0, trial = (a && a.trial_until) || 0;
  if (gift > now && gift >= trial) return { pro: true, proSrc: "invite", proUntil: gift };
  if (trial > now) return { pro: true, proSrc: "trial", proUntil: trial };
  if (gift > now) return { pro: true, proSrc: "invite", proUntil: gift };
  return { pro: false, proSrc: "", proUntil: 0 };
}

// a new account's days of Pro: only once Pro is on (during the beta everything is free and nothing is given)
export async function trialOnRegister(env, id, now = Date.now()) {
  if (!TRIAL_DAYS || !(await proGate(env))) return 0;
  const until = now + TRIAL_DAYS * DAY;
  await env.DB.prepare("UPDATE accounts SET trial_until=?2 WHERE id=?1 AND trial_until=0").bind(id, until).run();
  return until;
}

// the day Pro is switched on for the first time (app_state 'pro_launch'): everyone who has an account from the beta
// gets the thank-you months, kept with their invite months (ref_months), which the hourly job starts (refCheck)
export async function proLaunch(env, now = Date.now()) {
  const r = await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('pro_launch', ?1, ?2) ON CONFLICT(k) DO NOTHING").bind(String(now), now).run();
  if (!(r.meta && r.meta.changes)) return { launched: false, thanked: 0 };
  if (!THANKS_MONTHS) return { launched: true, thanked: 0 };
  const g = await env.DB.prepare("UPDATE accounts SET ref_months=ref_months+?1 WHERE created<?2").bind(THANKS_MONTHS, now).run();
  return { launched: true, thanked: (g.meta && g.meta.changes) || 0 };
}

// the founding supporter offer: donations of FOUNDING.min dollars or more in all (pro_orders of kind 'supporter', by the
// account or its email; amounts in cents, a donation whose amount is unknown counts as none)
export async function foundingCheck(env, accountId, eh) {
  if (!accountId && !eh) return false;
  const r = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS cents FROM pro_orders WHERE kind='supporter' AND status='on' AND ((?1 IS NOT NULL AND account_id=?1) OR (?2 IS NOT NULL AND email_hash=?2))").bind(accountId || null, eh || null).first().catch(() => null);
  const ok = !!r && r.cents >= FOUNDING.min * 100;
  if (ok && accountId) await env.DB.prepare("UPDATE accounts SET founder=1 WHERE id=?1 AND founder=0").bind(accountId).run();
  return ok;
}

// what the apps show: the prices, the trial, the founding offer, the lifetime offer (founding supporters only) and how
// many programs may start by themselves without Pro
export async function proOffer(env) {
  const gate = await proGate(env), L = PLANS.lifetime || {}, P = PLANS.prices || {};
  return { gate, beta: !gate, freeApps: PLANS.freeApps || 3, trialDays: TRIAL_DAYS, prices: { currency: P.currency || "USD", monthly: P.monthly || 0, yearly: P.yearly || 0 },
    founding: { min: FOUNDING.min, off: FOUNDING.off, lifetime: FOUNDING.lifetime, months: FOUNDING.months },
    lifetime: { price: gate ? L.full : L.beta, full: L.full, beta: L.beta, currency: L.currency || "USD", buy: L.buy || "", founders: !!L.founders }, donate: (PLANS.donate && PLANS.donate.buy) || "" };
}

async function hmacHex(secret, body) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body)));
  return [...s].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

export async function lemonWebhook(req, env) {
  if (!env.LEMONSQUEEZY_WEBHOOK_SECRET) return err("Lemon Squeezy is not set up on this server", 404);
  const body = await req.text();
  if (body.length > 300000) return err("too large", 413);
  const sig = (req.headers.get("x-signature") || "").toLowerCase();
  if (!sig || !same(sig, await hmacHex(env.LEMONSQUEEZY_WEBHOOK_SECRET, body))) return err("bad signature", 401);
  let j;
  try { j = JSON.parse(body); } catch (e) { return err("not JSON"); }
  const ev = (j.meta && j.meta.event_name) || "", custom = (j.meta && j.meta.custom_data) || {}, d = j.data || {}, at = d.attributes || {};
  const email = String(at.user_email || "").trim().toLowerCase();
  const eh = email ? await emailHash(env, email) : null;
  let accountId = /^[\w-]{6,80}$/.test(String(custom.account || "")) ? String(custom.account) : null;
  if (accountId) { const a = await env.DB.prepare("SELECT id FROM accounts WHERE id=?1").bind(accountId).first().catch(() => null); if (!a) accountId = null; }
  const t = (v) => (v ? Date.parse(v) || 0 : 0);
  if (ev === "order_created" || ev === "order_refunded") {
    // a one-off order is the lifetime offer (a subscription's first order comes with its own subscription events)
    const items = at.first_order_item || {}, isSub = !!(custom.kind === "subscription" || /month|year|mes|año|anual/i.test(String(items.variant_name || "")));
    if (isSub) return json({ ok: true, skipped: "subscription order" });
    const paid = ev === "order_created" && at.status === "paid" && !at.refunded;
    await setPro(env, { accountId, eh, kind: "lifetime", until: 0, on: paid, order: "order:" + d.id });
    return json({ ok: true, lifetime: paid });
  }
  if (/^subscription_/.test(ev)) {
    const live = ["active", "on_trial", "past_due", "cancelled"].includes(at.status);
    const until = at.status === "cancelled" ? t(at.ends_at) : t(at.renews_at) + 3 * 86400e3; // a few days of grace for the renewal
    await setPro(env, { accountId, eh, kind: "subscription", until, on: live && until > Date.now(), order: "sub:" + d.id });
    return json({ ok: true, subscription: live });
  }
  return json({ ok: true, skipped: ev });
}

// a new account whose email already bought Pro
export async function proOnRegister(env, id, eh) {
  // a donation on Stripe before the account existed: the ♥ Supporter badge (stripe.js)
  const d = await env.DB.prepare("SELECT 1 AS y FROM pro_orders WHERE email_hash=?1 AND kind='supporter' AND status='on' LIMIT 1").bind(eh).first().catch(() => null);
  if (d) await env.DB.prepare("UPDATE accounts SET supporter=1, supporter_src=COALESCE(supporter_src,'stripe') WHERE id=?1").bind(id).run();
  if (d) await foundingCheck(env, id, eh).catch(() => {});
  await trialOnRegister(env, id).catch(() => {}); // the new account's days of Pro, once Pro is on
  const o = await env.DB.prepare("SELECT kind, until FROM pro_orders WHERE email_hash=?1 AND status='on' AND kind<>'supporter' ORDER BY (kind='lifetime') DESC, until DESC LIMIT 1").bind(eh).first().catch(() => null);
  if (o && (!o.until || o.until > Date.now())) await env.DB.prepare("UPDATE accounts SET pro=1, pro_src=?2, pro_until=?3, pro_since=?4 WHERE id=?1").bind(id, o.kind, o.until || 0, Date.now()).run();
}

const pcOf = (q) => (/^[0-9a-f]{32}$/.test(q.get("pc") || "") ? q.get("pc") : "");
const pcNameOf = (q) => String(q.get("pcname") || "").replace(/[^\w .-]/g, "").slice(0, 40);

// Pro is kept on one PC: the first PC that asks takes it, any other is told where it is (pcName) and may move it
// (POST /community/pro/pc); asked by /community/pro and /account/me with the PC's ?pc=&pcname=
export async function proHere(env, acc, q) {
  const pc = pcOf(q), mine = proOf(acc);
  if (!pc || !mine.pro) return {};
  // a new account's days of Pro run once on each PC: on a PC that already ran another account's, there is none
  if (mine.proSrc === "trial") {
    await env.DB.prepare("INSERT INTO trial_pcs (pc, account_id, at) VALUES (?1,?2,?3) ON CONFLICT(pc) DO NOTHING").bind(pc, acc.id, Date.now()).run().catch(() => {});
    const t = await env.DB.prepare("SELECT account_id FROM trial_pcs WHERE pc=?1").bind(pc).first().catch(() => null);
    if (t && t.account_id !== acc.id) return { pro: false, proSrc: "", proUntil: 0, trialUsed: true };
  }
  if (!acc.pro_pc) {
    await env.DB.prepare("UPDATE accounts SET pro_pc=?2, pro_pc_name=?3, pro_pc_at=?4 WHERE id=?1 AND pro_pc IS NULL").bind(acc.id, pc, pcNameOf(q), Date.now()).run();
    return { pcOk: true };
  }
  return acc.pro_pc === pc ? { pcOk: true } : { pcOk: false, pcName: acc.pro_pc_name || "" };
}

// /community/pro (the offer and your Pro), /community/admin/pro (the beta switch, the counts) and
// /community/admin/pro-user (Pro by hand for one account)
export async function proRoutes(req, env, p, m, body) {
  if (p === "/pro" && m === "GET") {
    const acc = await sessionAccount(req, env).catch(() => null);
    const q = new URL(req.url).searchParams, out = { ...(await proOffer(env)), ...(acc ? proOf(acc) : {}), admin: !!(acc && isAdmin(env, acc.id)) };
    // Pro is kept on one PC: the first PC that asks takes it, any other is told where it is and may move it
    if (acc) Object.assign(out, await proHere(env, acc, q));
    return json(out);
  }
  if (p === "/pro/pc" && m === "POST") {
    // move Pro to this PC: the other one loses it
    const acc = await sessionAccount(req, env);
    if (!acc) return err("sign in", 401);
    const q = new URL(req.url).searchParams, pc = pcOf(q);
    if (!pc) return err("only the Pitlane HQ Agent on a PC can do this");
    if (!proOf(acc).pro) return err("this account has no Pro", 403);
    await env.DB.prepare("UPDATE accounts SET pro_pc=?2, pro_pc_name=?3, pro_pc_at=?4 WHERE id=?1").bind(acc.id, pc, pcNameOf(q), Date.now()).run();
    return json({ ok: true, pcOk: true });
  }
  if (p !== "/admin/pro" && p !== "/admin/pro-user") return null;
  const acc = await sessionAccount(req, env);
  if (!acc || !isAdmin(env, acc.id)) return err("only the admins of this server can do this", 403);
  if (p === "/admin/pro" && m === "POST") {
    await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('pro_gate', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(body.gate ? "1" : "0", Date.now()).run();
    gateAt = 0;
    if (body.gate) await proLaunch(env).catch(() => {}); // the first time: the thank-you month for everyone from the beta
  }
  if (p === "/admin/pro-user" && m === "POST") {
    const id = String(body.id || "");
    const r = body.on
      ? await env.DB.prepare("UPDATE accounts SET pro=1, pro_src='manual', pro_until=0, pro_since=CASE WHEN pro_since>0 THEN pro_since ELSE ?2 END WHERE id=?1").bind(id, Date.now()).run()
      : await env.DB.prepare("UPDATE accounts SET pro=0, pro_src=NULL, pro_until=0 WHERE id=?1 AND pro_src='manual'").bind(id).run();
    return r.meta && r.meta.changes ? json({ ok: true }) : err("account not found, or its Pro was bought (only a Pro given by hand is taken away here)", 404);
  }
  const c = await env.DB.prepare("SELECT COUNT(*) AS n, SUM(pro_src='lifetime') AS life, SUM(pro_src='subscription') AS sub, SUM(pro_src='manual') AS man FROM accounts WHERE pro=1 AND (pro_until=0 OR pro_until>?1)").bind(Date.now()).first().catch(() => ({}));
  const waiting = await env.DB.prepare("SELECT COUNT(*) AS n FROM pro_orders WHERE account_id IS NULL AND status='on' AND kind<>'supporter'").first().catch(() => ({ n: 0 }));
  const o = await env.DB.prepare("SELECT SUM(founder=1) AS founders, SUM(trial_until>?1) AS trials, COUNT(*) AS accounts FROM accounts").bind(Date.now()).first().catch(() => ({}));
  const launch = await env.DB.prepare("SELECT v FROM app_state WHERE k='pro_launch'").first().catch(() => null);
  return json({ ...(await proOffer(env)), counts: { pro: c.n || 0, lifetime: c.life || 0, subscription: c.sub || 0, manual: c.man || 0, waiting: waiting.n || 0, founders: o.founders || 0, trials: o.trials || 0, accounts: o.accounts || 0 },
    launch: { at: launch ? +launch.v || 0 : 0, thanksMonths: THANKS_MONTHS },
    store: PLANS.provider === "stripe"
      ? { provider: "stripe", webhook: !!env.STRIPE_WEBHOOK_SECRET, secret: "STRIPE_WEBHOOK_SECRET", checkout: !!(PLANS.lifetime && PLANS.lifetime.buy), url: "https://pitlanehq.app/stripe/webhook" }
      : { provider: "lemonsqueezy", webhook: !!env.LEMONSQUEEZY_WEBHOOK_SECRET, secret: "LEMONSQUEEZY_WEBHOOK_SECRET", checkout: !!(PLANS.lifetime && PLANS.lifetime.buy), url: "https://pitlanehq.app/lemonsqueezy/webhook" } });
}
