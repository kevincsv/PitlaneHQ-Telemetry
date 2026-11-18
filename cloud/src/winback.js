// The admin page's Drivers list (admin only): every account with when it last drove and used Pitlane HQ, how much in the
// last 30 days, its sessions in all, who is online or on track now, and the "we miss you" email to the drivers who
// stopped driving (winbacklib.js).
//   GET  /community/admin/activity            the list and its counts
//   GET  /community/admin/activity?now=1      only who is on track or online now (the Overview's On track now), a few rows
//   GET  /community/admin/winback/preview?lang=es   the email as the drivers get it ({subject, html})
//   POST /community/admin/winback {ids}      sends it to those accounts (at most SEND_MAX a request, once per account)
//   POST /community/admin/winback {test:true, lang}  sends it to the admin's own email
// The emails come from the escrow (the only place the server keeps one) and never leave this route but to Resend.
import { sessionAccount, isAdmin } from "./accounts.js";
import { openEscrow } from "./escrow.js";
import { sendWinback, winbackHTML, mailReady } from "./email.js";
import { activityOf, activitySummary, canWinback, winbackMail, AWAY_DAYS, SEND_MAX, DAY, ONLINE_MS, DRIVING_MS } from "./winbacklib.js";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function loadActivity(env, now) {
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results || []).catch(() => []);
  const t30 = now - 30 * DAY, from30 = new Date(t30).toISOString().slice(0, 10);
  const [accounts, signins, presence, usageDays, usageLast, sessions, sessionsLast, driving, langs] = await Promise.all([
    q("SELECT id, display, created, escrow, tester, supporter, supporter_src, anon, test_ask, test_ask_what, winback_at FROM accounts LIMIT 20000"),
    q("SELECT account_id, MAX(last_seen) AS t FROM account_sessions GROUP BY account_id"),
    q("SELECT account_id, kind, MAX(last_seen) AS t FROM presence GROUP BY account_id, kind"),
    q("SELECT DISTINCT account_id, day, device FROM usage_days WHERE day>=?1 LIMIT 50000", from30),
    q("SELECT account_id, MAX(day) AS day FROM usage_days GROUP BY account_id"),
    q("SELECT uploader, started, laps, secs FROM sessions WHERE started>=?1 AND uploader LIKE 'acct:%' LIMIT 50000", t30),
    q("SELECT uploader, MAX(started) AS t, COUNT(*) AS n FROM sessions WHERE uploader LIKE 'acct:%' GROUP BY uploader"),
    q("SELECT uploader, game, track, car, kind, started, secs, up_at FROM sessions WHERE started>?1 AND uploader LIKE 'acct:%' AND COALESCE(up_at, started+COALESCE(secs,0)*1000)>?2", now - 12 * 3600e3, now - 15 * 60e3),
    q("SELECT account_id, lang, MAX(created) AS t FROM support_msgs WHERE from_support=0 AND lang IS NOT NULL GROUP BY account_id"),
  ]);
  const emails = new Map();
  for (const a of accounts) {
    if (!a.escrow) continue;
    const e = await openEscrow(env, a.escrow).catch(() => null);
    if (e && e.email) emails.set(a.id, e.email);
  }
  const admins = new Set(accounts.filter((a) => isAdmin({ ...env, LOCAL: "" }, a.id)).map((a) => a.id));
  return activityOf({ now, accounts, signins, presence, usageDays, usageLast, sessions, sessionsLast, driving, langs, emails, admins });
}

// who is on track (a lap came up in the last ten minutes) or online (seen in three minutes) now, read from the few recent
// rows only: the Overview opens often and needs no email nor the whole list
async function loadNow(env, now) {
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results || []).catch(() => []);
  const [presence, driving] = await Promise.all([
    q("SELECT account_id, kind, MAX(last_seen) AS t FROM presence WHERE last_seen>?1 GROUP BY account_id, kind", now - ONLINE_MS),
    q("SELECT uploader, game, track, car, kind, started, secs, up_at FROM sessions WHERE started>?1 AND uploader LIKE 'acct:%' AND COALESCE(up_at, started+COALESCE(secs,0)*1000)>?2", now - 12 * 3600e3, now - DRIVING_MS),
  ]);
  const ids = [...new Set([...presence.map((p) => p.account_id), ...driving.map((s) => String(s.uploader).slice(5))])].slice(0, 90);
  const accounts = ids.length ? await q(`SELECT id, display, created, tester, supporter, supporter_src, anon FROM accounts WHERE id IN (${ids.map((_, i) => "?" + (i + 1)).join(",")})`, ...ids) : [];
  return activityOf({ now, accounts, signins: [], presence, usageDays: [], usageLast: [], sessions: [], sessionsLast: [], driving, langs: [], emails: new Map(), admins: new Set() })
    .filter((x) => x.online).map(({ email, lang, winbackAt, testAsk, ...x }) => x);
}

export async function winbackRoute(req, env, url) {
  const acc = await sessionAccount(req, env);
  if (!acc || !isAdmin(env, acc.id)) return json({ error: "only the admins of this server can do this" }, 403);
  const p = url.pathname, m = req.method, now = Date.now();
  if (p === "/community/admin/activity" && m === "GET") {
    if (url.searchParams.get("now") === "1") return json({ now, users: await loadNow(env, now) });
    const days = Math.max(1, Math.min(365, Math.floor(Number(url.searchParams.get("days")) || AWAY_DAYS)));
    const list = await loadActivity(env, now);
    return json({ now, days, mail: mailReady(env), counts: activitySummary(list, days), users: list.map((x) => ({ ...x, canEmail: canWinback(x, days) })) });
  }
  if (p === "/community/admin/winback/preview" && m === "GET") {
    const mm = winbackMail(url.searchParams.get("lang"), acc.display || "");
    return json({ subject: mm.subject, lang: mm.lang, html: winbackHTML(mm) });
  }
  if (p === "/community/admin/winback" && m === "POST") {
    if (!mailReady(env)) return json({ error: "emails are not set up on this server" }, 503);
    const b = (await req.json().catch(() => null)) || {};
    if (b.test === true) {
      const e = await openEscrow(env, acc.escrow).catch(() => null);
      if (!e || !e.email) return json({ error: "the server does not know your email" }, 400);
      const ok = await sendWinback(env, e.email, winbackMail(b.lang, acc.display || ""));
      return json({ ok, sent: ok ? 1 : 0, to: e.email });
    }
    const days = Math.max(1, Math.min(365, Math.floor(Number(b.days)) || AWAY_DAYS));
    const want = new Set((Array.isArray(b.ids) ? b.ids : []).map(String).filter((x) => /^[A-Za-z0-9_.:-]{1,80}$/.test(x)));
    if (!want.size) return json({ error: "no accounts chosen" }, 400);
    // checked again here, whatever the page sent: away long enough, an email, never sent before, not an admin
    const ready = (await loadActivity(env, now)).filter((x) => want.has(x.id) && canWinback(x, days));
    let sent = 0, failed = 0;
    for (const x of ready.slice(0, SEND_MAX)) {
      const ok = await sendWinback(env, x.email, winbackMail(x.lang, x.nick)).catch(() => false);
      if (ok) { sent++; await env.DB.prepare("UPDATE accounts SET winback_at=?2 WHERE id=?1").bind(x.id, Date.now()).run(); }
      else failed++;
      if (failed >= 3 && !sent) break; // Resend says no: stop, the reason is on the Server tab
    }
    return json({ ok: sent > 0 || !ready.length, sent, failed, left: Math.max(0, ready.length - sent - failed) });
  }
  return json({ error: "not found" }, 404);
}
