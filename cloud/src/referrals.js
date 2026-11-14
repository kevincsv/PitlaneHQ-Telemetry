// "Invite a friend" (migration 0100, docs/spec/pro.md): every account has an invite link
// (https://pitlanehq.app/?ref=invite-<code>) and a short code. A friend who makes an account from the link, or types the
// code in their first days (claimDays, for the PC agent and the phones, where no link was opened), is that driver's
// invite. Once the friend has used Pitlane HQ on `days` different days, with at least `drives` sessions driven, within
// `within` days of signing up, both get `months` of Pro. Invites count during the beta too: a month earned while
// everything is free is kept (accounts.ref_months) and starts when the admin switches Pro on (proGate). An inviter earns
// at most `max` months a year (the friend always gets theirs). A friend seen on the same PC, install or connection as
// their inviter is the inviter themselves: refused. The hourly job settles the waiting invites (refCheck).
import PLANS from "../../license_plans.json";
import { sessionAccount, isAdmin, sha256 } from "./accounts.js";
import { proGate } from "./lemon.js";
import { cleanCode, inviteCode, inviteLink } from "./referralslib.js";
export { cleanCode, inviteCode, inviteLink };

const JSONH = { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "no-store" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: JSONH });
const err = (e, s = 400) => json({ error: e }, s);
const DAY = 86400e3, MONTH = 30 * DAY;
export const INV = { days: 7, drives: 1, within: 60, months: 1, max: 12, claimDays: 14, ...(PLANS.invite || {}) };

// whose code or link it is: the code, or an account's id (the links made before codes)
export async function inviterOf(env, code) {
  const c = cleanCode(code);
  if (c.length < 8) return null;
  return (await env.DB.prepare("SELECT id, display, created FROM accounts WHERE invite_code=?1 OR id=?1 LIMIT 1").bind(c).first().catch(() => null)) || null;
}

// the PC (?pc=, a hash of Windows' id), the install (X-Pitlane-Install) and the connection a request came from, as
// hashes with the server's secret; noted for the accounts of a waiting invite, at most once an hour each
const marked = new Map();
async function marksOf(env, req) {
  const k = env.DATA_KEY || "", out = [], q = new URL(req.url).searchParams;
  const add = async (kind, v) => { if (v) out.push((await sha256("ref|" + k + "|" + kind + "|" + v)).slice(0, 32)); };
  await add("net", req.headers.get("cf-connecting-ip"));
  await add("pc", /^[0-9a-f]{32}$/.test(q.get("pc") || "") ? q.get("pc") : "");
  await add("inst", /^[\w-]{8,80}$/.test(req.headers.get("x-pitlane-install") || "") ? req.headers.get("x-pitlane-install") : "");
  return out;
}
export async function noteRef(env, req, accountId) {
  try {
    const now = Date.now(), hs = await marksOf(env, req), todo = hs.filter((h) => now - (marked.get(accountId + h) || 0) > 3600e3);
    if (!todo.length) return;
    todo.forEach((h) => marked.set(accountId + h, now));
    if (marked.size > 20000) marked.clear();
    await env.DB.batch(todo.map((h) => env.DB.prepare("INSERT INTO referral_marks (account_id, h, at) VALUES (?1,?2,?3) ON CONFLICT(account_id, h) DO UPDATE SET at=excluded.at").bind(accountId, h, now)));
  } catch (e) {}
}

// a new invite: the friend (a new account) and whose link or code it was; both are watched from now on
async function addInvite(env, req, inviteeId, inviter, via) {
  if (!inviter || inviter.id === inviteeId) return "self";
  // two drivers who invite each other are one driver
  if (await env.DB.prepare("SELECT 1 FROM referrals WHERE invitee=?1 AND inviter=?2").bind(inviter.id, inviteeId).first()) return "self";
  const r = await env.DB.prepare("INSERT OR IGNORE INTO referrals (invitee, inviter, created, via) VALUES (?1,?2,?3,?4)").bind(inviteeId, inviter.id, Date.now(), via).run();
  if (!(r.meta && r.meta.changes)) return "already";
  await env.DB.prepare("UPDATE accounts SET ref_watch=1 WHERE id IN (?1, ?2)").bind(inviteeId, inviter.id).run();
  if (req) await noteRef(env, req, inviteeId);
  return "ok";
}

// sign-up from an invite link (inviteFollow in accounts.js calls it with the inviter the link named)
export async function inviteOnSignup(env, req, id, by) {
  const inviter = await inviterOf(env, by);
  if (inviter) await addInvite(env, req, id, inviter, "link").catch(() => {});
}

// what a friend has done so far: the different days they used Pitlane HQ (any device) and the sessions they drove,
// within `within` days of signing up
async function progressOf(env, id, created) {
  const from = new Date(created).toISOString().slice(0, 10), to = new Date(created + INV.within * DAY).toISOString().slice(0, 10);
  const d = await env.DB.prepare(
    `SELECT COUNT(DISTINCT d) AS n FROM (SELECT day AS d FROM usage_days WHERE account_id=?1 AND day>=?2 AND day<=?3
      UNION SELECT date(started/1000,'unixepoch') AS d FROM sessions WHERE uploader=?4 AND started>=?5 AND started<?6)`
  ).bind(id, from, to, "acct:" + id, created, created + INV.within * DAY).first().catch(() => null);
  const s = await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE uploader=?1 AND started>=?2 AND started<?3").bind("acct:" + id, created, created + INV.within * DAY).first().catch(() => null);
  return { days: Math.min((d && d.n) || 0, INV.days), drives: Math.min((s && s.n) || 0, INV.drives) };
}

// months of Pro for an account: banked while Pro is off, added to the end of its invite Pro when it is on
async function giveMonths(env, id, n, gate, now) {
  if (gate) await env.DB.prepare("UPDATE accounts SET ref_pro_until=MAX(ref_pro_until, ?2) + ?3 WHERE id=?1").bind(id, now, n * MONTH).run();
  else await env.DB.prepare("UPDATE accounts SET ref_months=ref_months+?2 WHERE id=?1").bind(id, n).run();
}

// the hourly job: settles the waiting invites, and once Pro is on starts the months kept from the beta
export async function refCheck(env, now = Date.now()) {
  const gate = await proGate(env);
  if (gate) {
    // the months earned during the beta start now (once: ref_months goes back to 0)
    const banked = (await env.DB.prepare("SELECT id, ref_months FROM accounts WHERE ref_months>0 LIMIT 500").all()).results || [];
    for (const a of banked)
      await env.DB.prepare("UPDATE accounts SET ref_pro_until=MAX(ref_pro_until, ?2) + ?3, ref_months=0 WHERE id=?1 AND ref_months=?4").bind(a.id, now, a.ref_months * MONTH, a.ref_months).run();
  }
  const rows = (await env.DB.prepare(
    "SELECT r.invitee, r.inviter, r.created, a.created AS acreated, a.verified FROM referrals r JOIN accounts a ON a.id=r.invitee WHERE r.state='waiting' ORDER BY r.created LIMIT 300"
  ).all()).results || [];
  const settle = (r, state, why) => env.DB.prepare("UPDATE referrals SET state=?2, why=?3, done=?4 WHERE invitee=?1 AND state='waiting'").bind(r.invitee, state, why || null, now).run();
  let given = 0;
  for (const r of rows) {
    const created = r.acreated || r.created;
    if (now > created + INV.within * DAY) { await settle(r, "expired", "no week of use"); continue; }
    if (!r.verified) continue;
    const p = await progressOf(env, r.invitee, created);
    if (p.days < INV.days || p.drives < INV.drives) continue;
    const same = await env.DB.prepare("SELECT 1 FROM referral_marks a JOIN referral_marks b ON b.h=a.h WHERE a.account_id=?1 AND b.account_id=?2 LIMIT 1").bind(r.invitee, r.inviter).first();
    if (same) { await settle(r, "refused", "same PC or connection"); continue; }
    const year = await env.DB.prepare("SELECT COUNT(*) AS n FROM referrals WHERE inviter=?1 AND state='given' AND (why IS NULL OR why='approved by hand') AND done>?2").bind(r.inviter, now - 365 * DAY).first();
    const capped = ((year && year.n) || 0) * INV.months >= INV.max;
    await giveMonths(env, r.invitee, INV.months, gate, now);
    if (!capped) await giveMonths(env, r.inviter, INV.months, gate, now);
    await settle(r, "given", capped ? "inviter at the yearly limit" : null);
    given++;
  }
  // accounts with no waiting invite left are not watched any more; marks are kept 90 days
  await env.DB.prepare("UPDATE accounts SET ref_watch=0 WHERE ref_watch=1 AND id NOT IN (SELECT invitee FROM referrals WHERE state='waiting' UNION SELECT inviter FROM referrals WHERE state='waiting')").run().catch(() => {});
  await env.DB.prepare("DELETE FROM referral_marks WHERE at<?1").bind(now - 90 * DAY).run().catch(() => {});
  return { checked: rows.length, given };
}

// what the Invite card shows: your code and link, your invites and the Pro they gave, and (a new account) the way to
// type a friend's code
async function inviteState(env, acc) {
  const now = Date.now(), gate = await proGate(env), code = await inviteCode(env, acc);
  const mine = (await env.DB.prepare(
    `SELECT r.invitee, r.state, r.why, r.created, u.alias AS name, a.created AS acreated FROM referrals r LEFT JOIN accounts a ON a.id=r.invitee
     LEFT JOIN community_users u ON u.id=r.invitee WHERE r.inviter=?1 ORDER BY r.created DESC LIMIT 50`
  ).bind(acc.id).all()).results || [];
  const friends = [];
  for (const r of mine) {
    const f = { name: r.name || "Driver", state: r.state, since: r.created };
    if (r.state === "waiting" && r.acreated) Object.assign(f, await progressOf(env, r.invitee, r.acreated));
    friends.push(f);
  }
  const me = await env.DB.prepare("SELECT r.state, r.inviter, u.alias AS name FROM referrals r LEFT JOIN community_users u ON u.id=r.inviter WHERE r.invitee=?1").bind(acc.id).first();
  const out = {
    gate, code: code.toUpperCase(), link: code ? inviteLink(code) : "",
    rule: { days: INV.days, drives: INV.drives, within: INV.within, months: INV.months, max: INV.max },
    friends, given: mine.filter((r) => r.state === "given" && (!r.why || r.why === "approved by hand")).length, waiting: mine.filter((r) => r.state === "waiting").length,
    // the months kept for when Pro starts, and the end of the Pro the invites gave
    banked: acc.ref_months || 0, proUntil: (acc.ref_pro_until || 0) > now ? acc.ref_pro_until : 0,
    canClaim: !me && now - (acc.created || 0) < INV.claimDays * DAY,
  };
  if (me) {
    out.invitedBy = { name: me.name || "Driver", state: me.state };
    if (me.state === "waiting") Object.assign(out.invitedBy, await progressOf(env, acc.id, acc.created || now));
  }
  return out;
}

// GET /community/invite (the card), POST /community/invite/claim {code} (a new account types a friend's code) and
// GET /community/admin/invites (the counts on the admin page's Pro part)
export async function referralRoutes(req, env, p, m, body) {
  if (p !== "/invite" && p !== "/invite/claim" && p !== "/admin/invites" && p !== "/admin/invites/approve") return null;
  const acc = await sessionAccount(req, env);
  if (!acc) return err("sign in with your Pitlane HQ account", 401);
  if (p === "/invite" && m === "GET") {
    // whoever opens the card may share their link: where they are is noted (a friend there later is refused)
    await noteRef(env, req, acc.id);
    return json(await inviteState(env, acc));
  }
  if (p === "/invite/claim" && m === "POST") {
    if (Date.now() - (acc.created || 0) >= INV.claimDays * DAY) return json({ error: `a friend's code can only be entered in the first ${INV.claimDays} days of a new account`, code: "too_late" }, 400);
    const inviter = await inviterOf(env, body && body.code);
    if (!inviter) return json({ error: "this code is not valid", code: "bad_code" }, 404);
    if (inviter.created && inviter.created > (acc.created || 0)) return json({ error: "this code is from an account newer than yours", code: "newer" }, 400);
    const r = await addInvite(env, req, acc.id, inviter, "code");
    if (r === "self") return json({ error: "you cannot use your own code", code: "self" }, 400);
    if (r === "already") return json({ error: "a friend's code is already on your account", code: "already" }, 409);
    // the two follow each other, as with the link
    const add = "INSERT OR IGNORE INTO follows (account_id, driver_id, created) VALUES (?1,?2,?3)", now = Date.now();
    await env.DB.batch([env.DB.prepare(add).bind(acc.id, inviter.id, now), env.DB.prepare(add).bind(inviter.id, acc.id, now)]).catch(() => {});
    return json(await inviteState(env, { ...acc, ref_watch: 1 }));
  }
  // an admin approves an invite refused for the same PC or connection (two people in the same house, who wrote to
  // Support): both get their month now, as the hourly job would have given it
  if (p === "/admin/invites/approve" && m === "POST") {
    if (!isAdmin(env, acc.id)) return err("only the admins of this server can do this", 403);
    const r = await env.DB.prepare("SELECT invitee, inviter FROM referrals WHERE invitee=?1 AND state='refused'").bind(String((body && body.invitee) || "")).first();
    if (!r) return err("no refused invite for this account", 404);
    const now = Date.now(), gate = await proGate(env);
    await giveMonths(env, r.invitee, INV.months, gate, now);
    await giveMonths(env, r.inviter, INV.months, gate, now);
    await env.DB.prepare("UPDATE referrals SET state='given', why='approved by hand', done=?2 WHERE invitee=?1").bind(r.invitee, now).run();
    return json({ ok: true });
  }
  if (p === "/admin/invites" && m === "GET") {
    if (!isAdmin(env, acc.id)) return err("only the admins of this server can do this", 403);
    const c = (await env.DB.prepare("SELECT state, COUNT(*) AS n FROM referrals GROUP BY state").all()).results || [];
    const b = await env.DB.prepare("SELECT COALESCE(SUM(ref_months),0) AS banked, SUM(ref_pro_until>?1) AS active FROM accounts WHERE ref_months>0 OR ref_pro_until>?1").bind(Date.now()).first();
    const top = (await env.DB.prepare(
      `SELECT r.inviter AS id, u.alias AS name, COUNT(*) AS n, SUM(r.state='given') AS given FROM referrals r LEFT JOIN community_users u ON u.id=r.inviter
       GROUP BY r.inviter ORDER BY given DESC, n DESC LIMIT 10`
    ).all()).results || [];
    const by = Object.fromEntries(c.map((x) => [x.state, x.n]));
    // the refused ones, to approve by hand when they wrote to Support (the same house)
    const refused = (await env.DB.prepare(
      `SELECT r.invitee, r.inviter, r.done, a.alias AS friend, b.alias AS by FROM referrals r LEFT JOIN community_users a ON a.id=r.invitee
       LEFT JOIN community_users b ON b.id=r.inviter WHERE r.state='refused' ORDER BY r.done DESC LIMIT 30`
    ).all()).results || [];
    return json({ waiting: by.waiting || 0, given: by.given || 0, refused: by.refused || 0, expired: by.expired || 0, refusedList: refused, banked: (b && b.banked) || 0, active: (b && b.active) || 0, top, rule: INV });
  }
  return err("not found", 404);
}
