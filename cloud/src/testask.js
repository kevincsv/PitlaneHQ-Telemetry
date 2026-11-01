// Asking to test (migration 0094): a driver who meets something In development (a view, a game of the apps) asks to test
// it with one tap. Every admin hears it (an alert, which wakes their phones, and the admin page's Users section) and says
// yes, which gives the tester level (accounts.tester, as the admin page's own button does), or no with one tap. A driver
// who was told no is not asked again. The statements and the route take what they need, so cloud/test/testask.test.mjs
// runs them on SQLite without the server.
//
// GET  /community/tester/ask              {asked, tester, pending}: pending is how many wait, for an admin only
// POST /community/tester/ask              {what} → {ok, asked} (a tester or an admin: {ok, tester: true})
// GET  /community/admin/test-asks         {items: [{id, display, asked, what}]}, the newest first
// POST /community/admin/test-asks         {id, yes} → {ok, tester}: yes makes the driver a tester, no closes the request

export const SQL_ASK = "UPDATE accounts SET test_ask=?2, test_ask_what=?3 WHERE id=?1 AND test_ask IS NULL AND COALESCE(tester,0)=0";
export const SQL_PENDING = "SELECT id, display, test_ask AS asked, test_ask_what AS what FROM accounts WHERE test_ask>0 AND COALESCE(tester,0)=0 ORDER BY test_ask DESC LIMIT 200";
export const SQL_PENDING_N = "SELECT COUNT(*) AS n FROM accounts WHERE test_ask>0 AND COALESCE(tester,0)=0";
export const SQL_YES = "UPDATE accounts SET tester=1, test_ask=NULL WHERE id=?1 AND test_ask>0";
export const SQL_NO = "UPDATE accounts SET test_ask=?2 WHERE id=?1 AND test_ask>0";

// where a driver can ask from: the views and games still in development on every device ("" when it was not said)
export const ASK_WHAT = new Set(["leagues", "planner", "acc", "ac", "nascar", "team", "coach", "general"]);
export const adminIds = (env) => String(env.ADMINS || env.SEASON_UPLOADERS || "").split(",").map((x) => x.trim()).filter(Boolean);

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } });
const err = (error, status) => json({ error }, status);

/** The routes above (p without /community), or null for any other path. deps: {sessionAccount, isAdmin, isTester,
 *  testerAlert, testAskAlert}. */
export async function testAskRoutes(req, env, p, m, body, deps, now = Date.now()) {
  if (p !== "/tester/ask" && p !== "/admin/test-asks") return null;
  const acc = await deps.sessionAccount(req, env);
  if (!acc) return err("sign in with your Pitlane HQ account", 401);
  const admin = deps.isAdmin(env, acc.id), tester = deps.isTester(env, acc.id, acc);
  if (p === "/tester/ask") {
    if (m === "GET") {
      const pending = admin ? (((await env.DB.prepare(SQL_PENDING_N).first()) || {}).n || 0) : undefined;
      return json({ asked: acc.test_ask != null, tester: tester || admin, pending });
    }
    if (m !== "POST") return err("not found", 404);
    if (tester || admin) return json({ ok: true, tester: true });
    const what = ASK_WHAT.has(String(body.what || "")) ? String(body.what) : "general";
    const r = await env.DB.prepare(SQL_ASK).bind(acc.id, now, what).run();
    const changed = r && (r.meta ? r.meta.changes : r.changes);
    if (changed) await deps.testAskAlert(env, adminIds(env).filter((a) => a !== acc.id), { account: acc.id, name: String(acc.display || "").slice(0, 60), what }, now);
    return json({ ok: true, asked: true });
  }
  if (!admin) return err("only the admins of this server can do this", 403);
  if (m === "GET") return json({ items: ((await env.DB.prepare(SQL_PENDING).all()).results || []).map((x) => ({ ...x, what: x.what || "general" })) });
  if (m !== "POST") return err("not found", 404);
  const id = String(body.id || "");
  if (body.yes) {
    const r = await env.DB.prepare(SQL_YES).bind(id).run();
    if (!(r && (r.meta ? r.meta.changes : r.changes))) return err("this request is no longer waiting", 404);
    await deps.testerAlert(env, id, now);
    return json({ ok: true, tester: true });
  }
  const r = await env.DB.prepare(SQL_NO).bind(id, -now).run();
  if (!(r && (r.meta ? r.meta.changes : r.changes))) return err("this request is no longer waiting", 404);
  return json({ ok: true, tester: false });
}
