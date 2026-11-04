// Reporting and blocking what other drivers post (migration 0097): the App Store's rule for anything one driver writes
// that others see. On Pitlane HQ that is a league post (its name, text and links) and a driver's public name and profile
// (their nickname, their Discord name). Any signed-in driver reports one with a reason (and a note if they like), once;
// the report is emailed to support@ and waits on the admin page, where an admin deletes the post, resets the name to
// "Driver" or dismisses it. Blocking a driver hides their league posts and their profile from the one who blocked them,
// and their name reads "Blocked driver" on the leaderboards that driver reads (maskBlocked). The statements and the
// route take what they need, so cloud/test/moderation.test.mjs runs them on SQLite without the server.
//
// POST /community/report               {kind: "league"|"driver", target, reason, note?} → {ok, reported}
// GET  /community/blocks               {blocks: [{id, name, created}]}  the drivers you blocked, the newest first
// POST /community/blocks               {id, block: true|false} (or {league} to block the driver who posted it) → {ok, blocked}
// GET  /community/admin/content-reports {items: [{id, kind, target, owner, ownerName, reason, note, snapshot, created,
//   reporter, reporterName, count}], open}  the open reports, the newest first (admins)
// POST /community/admin/content-reports {id, action: "delete"|"reset"|"dismiss"} → {ok}  deals with every open report of
//   the same post or driver at once

export const REASONS = new Set(["spam", "offensive", "harassment", "other"]);
export const KINDS = new Set(["league", "driver"]);
export const BLOCKED_NAME = "Blocked driver";

export const SQL_REPORT_ADD = "INSERT OR IGNORE INTO content_reports (id, reporter, kind, target, owner, reason, note, snapshot, created) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)";
export const SQL_LEAGUE = "SELECT l.id, l.owner, l.name, l.about, l.discord, l.web, l.cars, u.alias FROM leagues l LEFT JOIN community_users u ON u.id=l.owner WHERE l.id=?1";
export const SQL_DRIVER = "SELECT a.id, u.alias FROM accounts a JOIN community_users u ON u.id=a.id WHERE a.id=?1";
export const SQL_BLOCK = "INSERT OR IGNORE INTO blocks (account_id, blocked, created) VALUES (?1,?2,?3)";
export const SQL_UNBLOCK = "DELETE FROM blocks WHERE account_id=?1 AND blocked=?2";
export const SQL_BLOCKS = "SELECT b.blocked AS id, COALESCE(u.alias, 'Driver') AS name, b.created FROM blocks b LEFT JOIN community_users u ON u.id=b.blocked WHERE b.account_id=?1 ORDER BY b.created DESC LIMIT 500";
export const SQL_BLOCKED_IDS = "SELECT blocked FROM blocks WHERE account_id=?1 LIMIT 500";
export const SQL_OPEN = `SELECT r.id, r.kind, r.target, r.owner, r.reason, r.note, r.snapshot, r.created, r.reporter,
    COALESCE(ra.display, ru.alias, '') AS reporterName, COALESCE(ou.alias, '') AS ownerName,
    (SELECT COUNT(*) FROM content_reports o WHERE o.kind=r.kind AND o.target=r.target AND o.done IS NULL) AS count
  FROM content_reports r LEFT JOIN accounts ra ON ra.id=r.reporter LEFT JOIN community_users ru ON ru.id=r.reporter LEFT JOIN community_users ou ON ou.id=r.owner
  WHERE r.done IS NULL ORDER BY r.created DESC LIMIT 200`;
export const SQL_OPEN_N = "SELECT COUNT(*) AS n FROM content_reports WHERE done IS NULL";
export const SQL_ONE = "SELECT id, kind, target, owner FROM content_reports WHERE id=?1";
export const SQL_CLOSE = "UPDATE content_reports SET done=?3, action=?4 WHERE kind=?1 AND target=?2 AND done IS NULL";

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } });
const err = (error, status) => json({ error }, status);
const txt = (v, n) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : "");
const rid = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
const changed = (r) => !!(r && (r.meta ? r.meta.changes : r.changes));

/** The ids a driver blocked (an empty set signed out). */
export async function blockedIds(env, viewerId) {
  if (!viewerId) return new Set();
  const r = await env.DB.prepare(SQL_BLOCKED_IDS).bind(viewerId).all().catch(() => null);
  return new Set(((r && r.results) || []).map((x) => x.blocked));
}

/** Leaderboard rows (each with its uid) as the viewer sees them: a blocked driver's name reads "Blocked driver" and their
 *  profile does not open. */
export const maskBlocked = (rows, blocked) => (!blocked || !blocked.size ? rows : rows.map((x) => (blocked.has(x.uid) ? { ...x, alias: BLOCKED_NAME, prof: 0, sup: 0 } : x)));

/** The routes above (p without /community), or null for any other path. deps: {sessionAccount, isAdmin, mail(env, report)}. */
export async function moderationRoutes(req, env, p, m, body, deps, now = Date.now()) {
  if (p !== "/report" && p !== "/blocks" && p !== "/admin/content-reports") return null;
  const acc = await deps.sessionAccount(req, env).catch(() => null);
  if (!acc) return err("sign in with your Pitlane HQ account", 401);
  if (p === "/report") {
    if (m !== "POST") return err("not found", 404);
    const kind = KINDS.has(body.kind) ? body.kind : "", target = txt(body.target, 64);
    if (!kind || !/^[A-Za-z0-9_-]{4,64}$/.test(target)) return err("what is reported", 400);
    const reason = REASONS.has(body.reason) ? body.reason : "other", note = txt(body.note, 500);
    let owner = null, snapshot = "";
    if (kind === "league") {
      const l = await env.DB.prepare(SQL_LEAGUE).bind(target).first();
      if (!l) return err("league not found", 404);
      owner = l.owner;
      snapshot = JSON.stringify({ name: l.name, about: l.about || "", discord: l.discord || "", web: l.web || "", cars: l.cars || "", by: l.alias || "" });
    } else {
      const d = await env.DB.prepare(SQL_DRIVER).bind(target).first();
      if (!d) return err("driver not found", 404);
      owner = d.id;
      snapshot = JSON.stringify({ name: d.alias || "" });
    }
    if (owner === acc.id) return err("this is yours", 400);
    const id = rid();
    const r = await env.DB.prepare(SQL_REPORT_ADD).bind(id, acc.id, kind, target, owner, reason, note, snapshot, now).run();
    if (changed(r) && deps.mail) await deps.mail(env, { kind, target, reason, note, snapshot: JSON.parse(snapshot), reporter: acc.id, reporterName: String(acc.display || ""), owner }).catch(() => {});
    return json({ ok: true, reported: true });
  }
  if (p === "/blocks") {
    if (m === "GET") return json({ blocks: (await env.DB.prepare(SQL_BLOCKS).bind(acc.id).all()).results || [] });
    if (m !== "POST") return err("not found", 404);
    let id = txt(body.id, 64);
    if (!id && body.league) {
      const l = await env.DB.prepare(SQL_LEAGUE).bind(txt(body.league, 64)).first();
      if (!l) return err("league not found", 404);
      id = l.owner || "";
    }
    if (!/^[A-Za-z0-9_:-]{4,64}$/.test(id)) return err("which driver", 400);
    if (id === acc.id) return err("this is you", 400);
    if (body.block === false) { await env.DB.prepare(SQL_UNBLOCK).bind(acc.id, id).run(); return json({ ok: true, blocked: false }); }
    await env.DB.prepare(SQL_BLOCK).bind(acc.id, id, now).run();
    return json({ ok: true, blocked: true });
  }
  if (!deps.isAdmin(env, acc.id)) return err("only the admins of this server can do this", 403);
  if (m === "GET") {
    const items = ((await env.DB.prepare(SQL_OPEN).all()).results || []).map((x) => { let s = {}; try { s = JSON.parse(x.snapshot || "{}"); } catch (e) {} return { ...x, snapshot: s }; });
    return json({ items, open: (((await env.DB.prepare(SQL_OPEN_N).first()) || {}).n) || 0 });
  }
  if (m !== "POST") return err("not found", 404);
  const r = await env.DB.prepare(SQL_ONE).bind(txt(body.id, 64)).first();
  if (!r) return err("report not found", 404);
  const action = ["delete", "reset", "dismiss"].includes(body.action) ? body.action : "";
  if (!action) return err("what to do", 400);
  if (action === "delete") {
    if (r.kind !== "league") return err("only a league post can be deleted", 400);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM league_hits WHERE league_id=?1").bind(r.target),
      env.DB.prepare("DELETE FROM league_days WHERE league_id=?1").bind(r.target),
      env.DB.prepare("DELETE FROM leagues WHERE id=?1").bind(r.target),
    ]);
  }
  if (action === "reset" && r.owner) {
    // the name back to "Driver" and their Discord name off the profile (the link itself stays, for the bot)
    await env.DB.batch([
      env.DB.prepare("UPDATE community_users SET alias='Driver' WHERE id=?1").bind(r.owner),
      env.DB.prepare("UPDATE accounts SET display='Driver', name_kind='nick' WHERE id=?1").bind(r.owner),
      env.DB.prepare("UPDATE discord_links SET shown=0 WHERE account_id=?1").bind(r.owner),
    ]);
  }
  await env.DB.prepare(SQL_CLOSE).bind(r.kind, r.target, now, action).run();
  return json({ ok: true });
}
