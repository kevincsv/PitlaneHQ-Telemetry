// The admin page's driver profile (admins only), opened by every driver name in admin (admDriver in pitwall-admin.js):
//   GET /community/admin/driver?id=                 one account's whole profile (driverlib.js driverOf)
//   GET /community/admin/driver/sessions?id=&before=  its next sessions, older than [before] (ms), PAGE at a time
// Every read is by the account's id (indexes on sessions.uploader, usage_days, account_sessions, presence, events,
// feedback, support_msgs, referrals, pro_orders and community_laps.user_id), so a profile costs about the rows of that
// one driver, never a scan of every account.
import { sessionAccount, isAdmin, isTester } from "./accounts.js";
import { openEscrow } from "./escrow.js";
import { proOf } from "./lemon.js";
import { driverOf, sessionRow, PAGE, DAY } from "./driverlib.js";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const ID_RE = /^[A-Za-z0-9]{6,64}$/;
const SESSION_COLS = "id, started, game, track, track_config, car, kind, laps, best, secs, official, cat, pos, field, up_at";

export async function loadDriver(env, id, now = Date.now()) {
  const a = await env.DB.prepare("SELECT * FROM accounts WHERE id=?1").bind(id).first();
  if (!a) return null;
  const q = (sql, ...x) => env.DB.prepare(sql).bind(...x).all().then((r) => r.results || []).catch(() => []);
  const one = (sql, ...x) => env.DB.prepare(sql).bind(...x).first().catch(() => null);
  const up = "acct:" + id;
  const [sessions, logins, presence, usage, signins, orders, invitedBy, invited, feedback, support, games, steam, discord, google, guests, laps, leagues, owned] = await Promise.all([
    q(`SELECT ${SESSION_COLS} FROM sessions WHERE uploader=?1 ORDER BY started DESC LIMIT 20000`, up),
    q("SELECT device, created, last_seen FROM account_sessions WHERE account_id=?1 ORDER BY last_seen DESC LIMIT 50", id),
    q("SELECT kind, device, name, app_version, last_seen FROM presence WHERE account_id=?1 ORDER BY last_seen DESC LIMIT 30", id),
    q("SELECT day, device, key, n FROM usage_days WHERE account_id=?1 ORDER BY day LIMIT 20000", id),
    q("SELECT at, info FROM events WHERE account_id=?1 AND name='signin' ORDER BY at DESC LIMIT 20", id),
    q("SELECT id, at, kind, status, amount, currency, ref FROM pro_orders WHERE account_id=?1 ORDER BY at DESC LIMIT 100", id),
    one("SELECT r.inviter, r.state, r.created, a.display AS name FROM referrals r LEFT JOIN accounts a ON a.id=r.inviter WHERE r.invitee=?1", id),
    q("SELECT r.invitee, r.state, r.created, a.display AS name FROM referrals r LEFT JOIN accounts a ON a.id=r.invitee WHERE r.inviter=?1 ORDER BY r.created DESC LIMIT 100", id),
    q("SELECT id, created, rating, text, device, v, kind FROM feedback WHERE account_id=?1 ORDER BY created DESC LIMIT 10", id),
    one("SELECT COUNT(*) AS n, MAX(created) AS last FROM support_msgs WHERE account_id=?1 AND from_support=0", id),
    q("SELECT game FROM driver_links WHERE account_id=?1", id),
    one("SELECT persona FROM steam_links WHERE account_id=?1", id),
    one("SELECT 1 AS x FROM discord_links WHERE account_id=?1", id),
    one("SELECT 1 AS x FROM google_links WHERE account_id=?1", id),
    q("SELECT gl.gid, g.alias FROM guest_links gl JOIN community_users g ON g.id=gl.gid WHERE gl.account_id=?1", id),
    one("SELECT COUNT(*) AS n FROM community_laps WHERE user_id=?1", id),
    one("SELECT COUNT(*) AS n FROM leagues WHERE owner=?1", id),
    one("SELECT COUNT(*) AS n FROM community_users WHERE owner=?1 AND id LIKE 'guest-%'", id),
  ]);
  let email = "";
  if (a.escrow) { const e = await openEscrow(env, a.escrow).catch(() => null); email = (e && e.email) || ""; }
  return driverOf({
    now, a, admin: isAdmin(env, id), tester: isTester(env, id, a), pro: proOf(a), email,
    sessions, recent: sessions.slice(0, PAGE), logins, presence, usage, signins, orders, invitedBy, invited, feedback, support,
    links: { games: games.map((g) => g.game), steam: steam ? { persona: steam.persona || "" } : null, discord: !!discord, google: !!google },
    guests, counts: { laps: laps && laps.n, leagues: leagues && leagues.n, guests: owned && owned.n },
  });
}

export async function driverRoute(req, env, url) {
  const acc = await sessionAccount(req, env);
  if (!acc || !isAdmin(env, acc.id)) return json({ error: "only the admins of this server can do this" }, 403);
  if (req.method !== "GET") return json({ error: "not found" }, 404);
  const id = String(url.searchParams.get("id") || "");
  if (!ID_RE.test(id)) return json({ error: "bad id" }, 400);
  if (url.pathname === "/community/admin/driver") {
    const d = await loadDriver(env, id);
    return d ? json(d) : json({ error: "no such account" }, 404);
  }
  if (url.pathname === "/community/admin/driver/sessions") {
    const before = Number(url.searchParams.get("before")) || Date.now() + DAY;
    const r = await env.DB.prepare(`SELECT id, started, game, track, track_config, car, kind, laps, best, secs, official, cat, pos, field FROM sessions WHERE uploader=?1 AND started<?2 ORDER BY started DESC LIMIT ?3`)
      .bind("acct:" + id, before, PAGE + 1).all();
    const rows = r.results || [];
    return json({ sessions: rows.slice(0, PAGE).map(sessionRow), more: rows.length > PAGE });
  }
  return json({ error: "not found" }, 404);
}
