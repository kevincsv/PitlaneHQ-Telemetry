// What the drivers use and what they tell us (the admin page's Summary, Users and Feedback; migration 0070).
//
// POST /community/usage   (signed in)  {device, v, counts: {"view:laps": 3, "act:compare": 1, "game:iracing": 1}, ms}
//   every app counts the views it opens, its notable actions and the game it drives, and sends a batch every few
//   minutes and when it goes to the background; the server adds them to one row per day, account, device and key.
//   ms (optional, the web and the PC) is how long the app was on the screen since the last batch: it feeds the
//   feedback window's six hours of use.
// GET  /community/admin/analytics?days=N (admins)  the numbers of the Summary and the Users tabs over the days asked (at
//   most 90) and the same days before them: grouped reads of usage_days, sessions, accounts, visits_days and presence;
//   never a query per account.
// POST /community/visit (anyone, no sign-in)  {ref, page, us, um, uc}  a visit to the landing, the web app or a public
//   page, once per browser session: where it came from, its country and page (sourceslib.js, migration 0089)
// POST /community/feedback (signed in)  {text, rating, device, v, view, kind, style}  kept and emailed to support@
//   (email.js); kind "overlays" is the overlay window's answer, with the overlay design it was about (style)
// GET  /community/feedback/ask (signed in)  {ask, ov, ovStyle}: the web and the PC show "Share your feedback" when ask
//   says so, and the PC the overlay window when ov does (after the first race with overlays, once answered every six)
// POST /community/feedback/seen (signed in)  the window was shown and put off (Not now): it waits again; with
//   {kind: "overlays"} the overlay window, which waits for the next races with overlays
// POST /community/feedback/ovrace (signed in, the PC)  {style, ovs, game, sid}  a race ended with overlays open
// GET  /community/admin/feedback (admins)  every answer, newest first; DELETE /community/admin/feedback/:id one;
// POST /community/admin/feedback/old {days} the older ones; POST /community/admin/feedback/discord the earlier ones to Discord
//   (the uninstall answers, uninstall.js, come with no account: accountId null)
// Every answer is also a driver's message of their support chat (support.js, migration 0075).
import { sessionAccount, isAdmin } from "./accounts.js";
import { installsOf, supportersOf } from "./pcstats.js";
import { srcName, KIND_NAMES, hiText, areasOf } from "./usagenames.js";
import { visitOf, countryOf, isBot, sourcesOf, SQL_VISIT_ADD } from "./sourceslib.js";
import { openEscrow } from "./escrow.js";
import { sendFeedback } from "./email.js";
import { discordFeedback } from "./discord.js";
import { driverMessage, cleanLang } from "./supportlib.js";
import { SQL_USAGE_ADD, SQL_ASK_USED, SQL_ASK_SEEN, SQL_RACES_SINCE, SQL_OV_RACE, SQL_OV_SEEN, SQL_OV_ANSWERED, day, cleanUsage, cleanFeedback, analyticsMore, highlightsOf, SQL_SESSIONS_DAYS, gamesOf, SQL_GAMES_PREV, SQL_GAMES_FIRSTS, SQL_GAMES_TRACKS, SQL_GAMES_CARS, cleanOvRace, shouldAsk, shouldAskOv, analyticsOf, ASK_USED, FEEDBACK_PER_DAY, MAX_DAYS } from "./usagelib.js";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const err = (m, s) => json({ error: m }, s);

/** The routes above; null when the path is none of them. */
export async function usageRoute(req, env, url) {
  const p = url.pathname, m = req.method;
  const ours = ["/community/usage", "/community/feedback", "/community/feedback/ask", "/community/feedback/seen", "/community/feedback/ovrace", "/community/admin/analytics", "/community/admin/feedback"];
  if (p === "/community/visit" && m === "POST") {
    // text/plain (sendBeacon), so the browser sends it without asking first; robots and Pitlane HQ's own links are not visits
    if (isBot(req.headers.get("user-agent"))) return json({ ok: true });
    let b = null;
    try { b = JSON.parse((await req.text()).slice(0, 4000)); } catch { b = null; }
    const v = visitOf(b);
    if (v.src) await env.DB.prepare(SQL_VISIT_ADD).bind(day(Date.now()), v.src, countryOf(req.cf), v.page).run();
    return json({ ok: true });
  }
  if (!ours.includes(p) && !p.startsWith("/community/admin/feedback/")) return null;
  const acc = await sessionAccount(req, env);
  if (!acc) return err("sign in with your Pitlane HQ account", 401);
  const now = Date.now();
  if (p === "/community/usage" && m === "POST") {
    const u = cleanUsage(await req.json().catch(() => null));
    if (u.error) return err(u.error, 400);
    const d = day(now), st = [];
    for (const [k, n] of u.counts)
      st.push(env.DB.prepare(SQL_USAGE_ADD).bind(d, acc.id, u.device, k, n));
    if (u.ms) st.push(env.DB.prepare(SQL_ASK_USED).bind(acc.id, now, u.ms));
    if (st.length) await env.DB.batch(st);
    return json({ ok: true, kept: u.counts.length });
  }
  if (p === "/community/feedback/ask" && m === "GET") {
    const r = await env.DB.prepare("SELECT shown, used, ov_races, ov_answered, ov_last_style FROM feedback_ask WHERE account_id=?1").bind(acc.id).first();
    // the first time: the clock starts now, nobody is asked the day this comes out
    if (!r) { await env.DB.prepare("INSERT OR IGNORE INTO feedback_ask (account_id, shown, used) VALUES (?1,?2,0)").bind(acc.id, now).run(); return json({ ask: false, ov: false }); }
    let races = 0;
    if (r.used < ASK_USED) {
      const c = await env.DB.prepare(SQL_RACES_SINCE).bind("acct:" + acc.id, r.shown).first();
      races = (c && c.n) || 0;
    }
    return json({ ask: shouldAsk(r.used, races), used: r.used, races, ov: shouldAskOv(!!r.ov_answered, r.ov_races || 0), ovRaces: r.ov_races || 0, ovStyle: r.ov_last_style || "classic" });
  }
  if (p === "/community/feedback/seen" && m === "POST") {
    const b = await req.json().catch(() => null);
    if (b && b.kind === "overlays") await env.DB.prepare(SQL_OV_SEEN).bind(acc.id).run();
    else await env.DB.prepare(SQL_ASK_SEEN).bind(acc.id, now).run();
    return json({ ok: true });
  }
  if (p === "/community/feedback/ovrace" && m === "POST") {
    const o = cleanOvRace(await req.json().catch(() => null));
    if (o.error) return err(o.error, 400);
    await env.DB.prepare(SQL_OV_RACE).bind(acc.id, now, o.style, o.sid || crypto.randomUUID()).run();
    return json({ ok: true });
  }
  if (p === "/community/feedback" && m === "POST") {
    const b = await req.json().catch(() => null), f = cleanFeedback(b);
    if (f.error) return err(f.error, 400);
    const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM feedback WHERE account_id=?1 AND created>?2").bind(acc.id, now - 86400e3).first();
    if (c && c.n >= FEEDBACK_PER_DAY) return err("thank you, that is enough for today", 429);
    const id = crypto.randomUUID();
    // an answer puts its own window off: the general one for its six hours or two races, the overlay one for six races
    await env.DB.batch([
      env.DB.prepare("INSERT INTO feedback (id, account_id, created, device, v, rating, text, view, kind, style) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)").bind(id, acc.id, now, f.device, f.v, f.rating, f.text, f.view, f.kind, f.style),
      f.kind === "overlays" ? env.DB.prepare(SQL_OV_ANSWERED).bind(acc.id, now) : env.DB.prepare(SQL_ASK_SEEN).bind(acc.id, now),
      // and it is a message of the driver's support chat (support.js), so they see it there
      ...driverMessage(env, acc.id, id, now, { ...f, lang: cleanLang(b && b.lang) }),
    ]);
    const esc = await openEscrow(env, acc.escrow).catch(() => null);
    const mailed = await sendFeedback(env, { ...f, nick: acc.display || "", accountId: acc.id, email: (esc && esc.email) || "" }).catch(() => false);
    // and in the Discord feedback forum an admin chose, without the driver's name (discord.js)
    if ((await discordFeedback(env, f).catch(() => 0)) > 0) await env.DB.prepare("UPDATE feedback SET discord_at=?2 WHERE id=?1").bind(id, now).run().catch(() => {});
    return json({ ok: true, id, mailed });
  }
  if (!isAdmin(env, acc.id)) return err("only the admins of this server can do this", 403);
  if (p === "/community/admin/feedback" && m === "GET") {
    const r = await env.DB.prepare("SELECT f.id, CASE WHEN f.kind='uninstall' THEN NULL ELSE f.account_id END AS accountId, f.created, f.device, f.v, f.rating, f.text, f.view, f.kind, f.style, f.discord_at AS discordAt, a.display AS nick FROM feedback f LEFT JOIN accounts a ON a.id=f.account_id ORDER BY f.created DESC LIMIT 300").all();
    const items = r.results || [];
    const rated = items.filter((x) => x.rating);
    const np = await env.DB.prepare("SELECT COUNT(*) AS n FROM feedback WHERE discord_at IS NULL").first().catch(() => null);
    const fc = await env.DB.prepare("SELECT COUNT(*) AS n FROM discord_guilds WHERE feedback_channel IS NOT NULL").first().catch(() => null);
    return json({ notOnDiscord: (fc && fc.n) ? (np && np.n) || 0 : 0, items, count: items.length, avg: rated.length ? Math.round((rated.reduce((s, x) => s + x.rating, 0) / rated.length) * 10) / 10 : null });
  }
  // an answer deleted, or every answer older than `days` (from the admin panel); its support chat message stays
  if (p.startsWith("/community/admin/feedback/") && m === "DELETE") {
    const id = decodeURIComponent(p.slice("/community/admin/feedback/".length));
    if (!/^[0-9a-f-]{8,40}$/i.test(id)) return err("bad id", 400);
    const r = await env.DB.prepare("DELETE FROM feedback WHERE id=?1").bind(id).run();
    return json({ ok: true, deleted: (r.meta && r.meta.changes) || 0 });
  }
  if (p === "/community/admin/feedback/old" && m === "POST") {
    const b = await req.json().catch(() => ({})), days = Math.floor(Number(b && b.days));
    if (!(days >= 1 && days <= 3650)) return err("days from 1 to 3650", 400);
    const r = await env.DB.prepare("DELETE FROM feedback WHERE created<?1").bind(now - days * 86400e3).run();
    return json({ ok: true, deleted: (r.meta && r.meta.changes) || 0 });
  }
  // the answers sent before the Discord feedback forum was chosen, posted there oldest first, 8 at a time (the page
  // asks again while some are left)
  if (p === "/community/admin/feedback/discord" && m === "POST") {
    const rows = (await env.DB.prepare("SELECT id, device, v, rating, text, kind, style FROM feedback WHERE discord_at IS NULL ORDER BY created ASC LIMIT 8").all()).results || [];
    let posted = 0;
    for (const x of rows) {
      const n = await discordFeedback(env, x).catch(() => 0);
      if (!n) return json({ error: posted ? "Discord stopped answering, press it again in a minute" : "No Discord feedback forum is chosen, or Discord did not answer", posted }, posted ? 200 : 400);
      await env.DB.prepare("UPDATE feedback SET discord_at=?2 WHERE id=?1").bind(x.id, Date.now()).run();
      posted++;
    }
    const left = await env.DB.prepare("SELECT COUNT(*) AS n FROM feedback WHERE discord_at IS NULL").first();
    return json({ ok: true, posted, left: (left && left.n) || 0 });
  }
  if (p === "/community/admin/analytics" && m === "GET") {
    const days = Math.max(1, Math.min(MAX_DAYS, Math.floor(Number(url.searchParams.get("days")) || 30)));
    // this period and the same number of days before it, for the changes
    const t0 = Date.parse(day(now - (days - 1) * 86400e3) + "T00:00:00Z"), p0 = t0 - days * 86400e3;
    const from = day(t0), pFrom = day(p0);
    const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results || []);
    const [actDays, rows, pres, ses, pSes, pAct, accs, allAcc, vis] = await Promise.all([
      q("SELECT DISTINCT account_id, day FROM usage_days WHERE day>=?1 LIMIT 20000", from),
      q("SELECT account_id, device, key, SUM(n) AS n, MAX(day) AS last FROM usage_days WHERE day>=?1 GROUP BY account_id, device, key LIMIT 20000", from),
      q("SELECT account_id, kind, app_version, last_seen FROM presence WHERE last_seen>?1 LIMIT 5000", now - 7 * 86400e3),
      q(SQL_SESSIONS_DAYS, t0),
      q("SELECT COUNT(*) AS sessions, COUNT(DISTINCT uploader) AS drivers, SUM(COALESCE(secs,0)) AS secs FROM sessions WHERE started>=?1 AND started<?2 AND uploader LIKE 'acct:%'", p0, t0),
      q("SELECT COUNT(*) AS n FROM (SELECT account_id AS a FROM usage_days WHERE day>=?1 AND day<?2 UNION SELECT substr(uploader,6) FROM sessions WHERE started>=?3 AND started<?4 AND uploader LIKE 'acct:%')", pFrom, from, p0, t0),
      q("SELECT id, created, src, country FROM accounts WHERE created>=?1 LIMIT 20000", p0),
      q("SELECT COUNT(*) AS n FROM accounts"),
      q("SELECT day, src, country, page, n FROM visits_days WHERE day>=?1 LIMIT 20000", pFrom).catch(() => []),
    ]);
    // each game apart: the days before, the drivers new to it, its tracks and cars (gamesOf)
    const [gPrev, gFirsts, gTracks, gCars] = await Promise.all([
      q(SQL_GAMES_PREV, p0, t0), q(SQL_GAMES_FIRSTS, p0, t0), q(SQL_GAMES_TRACKS, t0), q(SQL_GAMES_CARS, t0),
    ]);
    // installs and uninstalls, and the supporters and their donations (pcstats.js)
    const [pcRows, unAns, badges, patrons, orders] = await Promise.all([
      q("SELECT day, kind, v, n FROM pc_days WHERE day>=?1 LIMIT 20000", pFrom).catch(() => []),
      q("SELECT created, v, style, text FROM feedback WHERE kind='uninstall' AND created>=?1 ORDER BY created DESC LIMIT 2000", p0).catch(() => []),
      q("SELECT supporter_src AS src, COUNT(*) AS n FROM accounts WHERE supporter=1 GROUP BY supporter_src").catch(() => []),
      q("SELECT COUNT(*) AS n FROM patreon_patrons WHERE active=1").catch(() => []),
      q("SELECT o.at, o.status, o.amount, o.currency, o.account_id, a.display AS name FROM pro_orders o LEFT JOIN accounts a ON a.id=o.account_id WHERE o.kind='supporter' AND o.at>=?1 ORDER BY o.at DESC LIMIT 2000", p0).catch(() => []),
    ]);
    const ids = [...new Set([...rows.map((x) => x.account_id), ...ses.map((x) => x.uploader.slice(5))])].slice(0, 300), accounts = new Map();
    // the nicknames of the accounts in the list, in pieces of 90 (D1's bound parameters)
    for (let i = 0; i < ids.length; i += 90) {
      const part = ids.slice(i, i + 90);
      const a = await env.DB.prepare(`SELECT id, display FROM accounts WHERE id IN (${part.map((_, j) => "?" + (j + 1)).join(",")})`).bind(...part).all();
      for (const x of a.results || []) accounts.set(x.id, x);
    }
    const out = analyticsOf(days, [], rows, pres, accounts);
    const more = analyticsMore({ from, t0, actDays, rows, sessions: ses, prevSessions: pSes[0] || {}, prevActive: (pAct[0] || {}).n || 0, accounts: accs, accountsAll: (allAcc[0] || {}).n || 0 });
    const vNow = vis.filter((x) => x.day >= from), vPrev = vis.filter((x) => x.day < from);
    const installs = installsOf({ from, pcRows, answers: unAns.map((x) => ({ ...x, day: day(x.created) })) });
    const supporters = supportersOf({ t0, badges, patrons: (patrons[0] || {}).n || 0, orders });
    more.driven = gamesOf({ from, sessions: ses, prev: gPrev, firsts: gFirsts, tracks: gTracks, cars: gCars, appGames: out.games || [] });
    const all = { ...out, ...more, installs, supporters, sources: sourcesOf(vNow, vPrev, accs.filter((a) => a.created >= t0), accs.filter((a) => a.created < t0)) };
    // the names and sentences in the three languages, so the phones show what the web shows (usagenames.js)
    all.sources.bySource = all.sources.bySource.map((x) => ({ ...x, name: srcName(x.src), kindName: KIND_NAMES[x.kind] || KIND_NAMES.other }));
    return json({ ...all, highlights: highlightsOf(all).map((h) => ({ ...h, text: hiText(h.k, h.a) })), areas: areasOf(all.top || []) });
  }
  return err("not found", 404);
}

// the hourly job: a little over a year of usage and visits is enough
export async function pruneUsage(env) {
  const old = day(Date.now() - 400 * 86400e3);
  await env.DB.batch([env.DB.prepare("DELETE FROM usage_days WHERE day < ?1").bind(old), env.DB.prepare("DELETE FROM visits_days WHERE day < ?1").bind(old)]);
}
