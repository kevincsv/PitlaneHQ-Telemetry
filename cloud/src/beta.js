// The test version of the server (beta.pitlanehq.app): the same Worker built from the working branch, deployed by
// cloud.yml with channel "beta" as its own Worker (pitlanehq-beta, vars BETA = "1") on the same database and files.
// Only testers and admins use it: a signed-in request from anyone else is refused, the public pages (landing, SEO,
// legal, webhooks, sign-in returns) go to pitlanehq.app, search engines never index it, and its timed jobs never run
// (the production Worker runs them). docs/spec/pc-app.md, "Test builds".
import { sessionAccount, isAdmin, isTester, sha256 } from "./accounts.js";

export const isBeta = (env) => env.BETA === "1";
const PROD = "https://pitlanehq.app";
const APP_FILE = /^\/(fonts\.css|pitwall-[a-z0-9-]+\.js|app-news\.json|whats-new\.json|server\.json|manifest\.webmanifest|favicon\.ico|favicon-32\.png|icon-\d+\.png|logo\.svg|robots\.txt)$/;

/** null: the request goes on as on pitlanehq.app; a Response: the test version's own answer. */
export async function betaGate(req, env, url) {
  if (!isBeta(env)) return null;
  const p = url.pathname;
  if (p === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
  // the app served here talks to this server, never to pitlanehq.app's
  if (p === "/server.json") return new Response(JSON.stringify({ url: url.origin }), { headers: { "content-type": "application/json", "cache-control": "no-cache" } });
  if (p === "/" || APP_FILE.test(p) || p === "/live" || p === "/voice/ice" || p.startsWith("/dl/")) return null;
  if (p.startsWith("/account/") || p.startsWith("/community/")) {
    let a = null;
    try { a = await sessionAccount(req, env, true); } catch (e) { a = null; }
    // signing in and the public reads (no account yet) go through; the answer says tester/admin, and the app stops there
    if (!a || isAdmin(env, a.id) || isTester(env, a.id, a)) return null;
    return NO();
  }
  if (req.method === "GET" || req.method === "HEAD") return Response.redirect(PROD + p + url.search, 302);
  return new Response("not found", { status: 404 });
}

const NO = () => new Response(JSON.stringify({ error: "Only testers can sign in to the test version.", code: "beta_only" }), { status: 403, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } });

/** A sign-in or sign-up on the test version (an answer with a session token): anyone but a tester or an admin is
 * refused and the new session is removed at once, so only testers and admins can sign in there. */
export async function betaSignIn(res, env) {
  if (!isBeta(env) || !res || !res.ok || !(res.headers.get("content-type") || "").includes("json")) return res;
  let j;
  try { j = await res.clone().json(); } catch (e) { return res; }
  if (!j || typeof j.token !== "string" || !j.id) return res;
  if (isAdmin(env, j.id) || j.tester || isTester(env, j.id, null)) return res;
  try { await env.DB.prepare("DELETE FROM account_sessions WHERE token_hash=?1").bind(await sha256(j.token)).run(); } catch (e) { /* it expires by itself */ }
  return NO();
}

/** Every answer of the test version stays out of search engines. */
export function betaHeaders(r, env) {
  if (!isBeta(env) || r.status === 101 || r.webSocket) return r;
  const h = new Headers(r.headers);
  h.set("x-robots-tag", "noindex, nofollow");
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}
