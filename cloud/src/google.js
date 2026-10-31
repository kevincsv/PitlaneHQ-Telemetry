// "Continue with Google": Google's OAuth2 with OpenID Connect in a browser (the web, the PC's browser and the phones), made
// like Discord's (discord.js). The browser goes to accounts.google.com and comes back to /google/oauth with a code the server
// exchanges (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET) for the ID token, which says who: Google's id of the person (sub), the
// name and the email when Google has verified it. The app that started gets a one-use grant, good only with the code the
// server gave it (googleStart; the browser never sees it): a sign-in (POST /account/login/google) when that Google account
// is linked, or when its verified email is an account's (linked then, the email is proven), else a sign-up (googleSid on
// POST /account/register, the account made at once with no password, accounts.js). The PC's browser goes on to the PC's
// agent (http://127.0.0.1:<port>/google/done), the phones get it back by their scheme, pitlanehq://google?state=…&, with the
// query the web gets (googleLogin=<grant> | googleLogin=0 | googleLogin=0&new=1&sid=&name=).
import { sha256, cleanName, emailHash } from "./accounts.js";
import { goOn, appOf } from "./steam.js";
import { sealData, openData } from "./crypt.js";

const SITE = "https://pitlanehq.app";
const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const hexOf = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const rid = () => hexOf(crypto.getRandomValues(new Uint8Array(24)));
const isHex48 = (v) => typeof v === "string" && /^[0-9a-f]{48}$/.test(v);
const portOf = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 && Number(v) < 65536 ? Number(v) : null);
const siteOf = (env, url) => (env.LOCAL === "1" && url ? url.origin : SITE);
const back = (env, url) => siteOf(env, url) + "/google/oauth";
// off for now (the owner's choice, Oct 31): GOOGLE_ON="1" on the worker brings it back with the two secrets
export const googleReady = (env) => env.GOOGLE_ON === "1" && !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

// the address the browser opens, and what only the app that asked keeps (the state, 10 minutes, and the code its grant is
// redeemed with); port the PC's agent, app the phone apps, one of the two at most
export async function googleStart(env, url, device, port, app) {
  if (portOf(port) && appOf(app)) return { error: "port or app, not both" };
  const state = rid(), code = rid(), now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM google_oauth WHERE expires<?1").bind(now),
    env.DB.prepare("INSERT INTO google_oauth (state_hash, code_hash, device, port, app, expires) VALUES (?1,?2,?3,?4,?5,?6)")
      .bind(await sha256("google-oauth:" + state), await sha256("google-code:" + code), cleanName(device) || null, portOf(port), appOf(app) ? 1 : 0, now + 10 * 60e3),
  ]);
  const q = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, response_type: "code", scope: "openid email profile", redirect_uri: back(env, url), state, prompt: "select_account" });
  return { url: AUTH + "?" + q, state, code };
}

// who the ID token names (pure, so a test can run it): it came straight from Google's token endpoint over TLS, so its
// claims are read as they are (OpenID Connect 3.1.3.7), checked for our client, Google as issuer and not expired.
// { sub, email (only verified), name } or null
export function googleUser(idToken, clientId, now = Date.now()) {
  try {
    const p = JSON.parse(atob(String(idToken).split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!p || (p.iss !== "https://accounts.google.com" && p.iss !== "accounts.google.com")) return null;
    if (p.aud !== clientId || !(Number(p.exp) * 1000 > now) || !/^[0-9]{5,40}$/.test(String(p.sub || ""))) return null;
    const verified = p.email_verified === true || p.email_verified === "true";
    const email = verified && typeof p.email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email) ? p.email.trim().toLowerCase() : "";
    return { sub: String(p.sub), email, name: cleanName(p.name || p.given_name || "") };
  } catch (e) {
    return null;
  }
}

async function newGrant(env, kind, st, me, ttl) {
  const g = rid();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM google_grants WHERE expires<?1").bind(Date.now()),
    env.DB.prepare("INSERT INTO google_grants (grant_hash, code_hash, sub, email_hash, email, name, device, kind, expires) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)")
      .bind(await sha256("google-grant:" + g), st.code_hash, me.sub, me.email ? await emailHash(env, me.email) : null, me.email && env.DATA_KEY ? await sealData(env, me.email) : null, me.name || null, st.device, kind, Date.now() + ttl),
  ]);
  return g;
}
// a grant is used once, with the code of the app that started: { sub, email_hash, email (opened), name, device } or null
export async function useGoogleGrant(env, g, kind, code) {
  if (!isHex48(g) || !isHex48(code)) return null;
  const r = await env.DB.prepare("DELETE FROM google_grants WHERE grant_hash=?1 AND kind=?2 RETURNING code_hash, sub, email_hash, email, name, device, expires").bind(await sha256("google-grant:" + g), kind).first();
  if (!r || r.expires < Date.now() || r.code_hash !== (await sha256("google-code:" + code))) return null;
  let email = "";
  try { email = r.email ? String(await openData(env, r.email)) : ""; } catch (e) {}
  return { ...r, email };
}
// the account a Google account signs in to: its link, else the account of its verified email (by its hash)
export const googleLinked = async (env, sub) => ((await env.DB.prepare("SELECT account_id FROM google_links WHERE sub=?1").bind(sub).first()) || {}).account_id || null;
export async function googleAccountId(env, sub, eh) {
  const id = await googleLinked(env, sub);
  if (id || !eh) return id;
  return ((await env.DB.prepare("SELECT id FROM accounts WHERE email_hash=?1").bind(eh).first()) || {}).id || null;
}
// one Google account to one account: "taken" when it is another account's
export async function linkGoogle(env, sub, accountId) {
  const other = await googleLinked(env, sub);
  if (other && other !== accountId) return "taken";
  await env.DB.batch([
    env.DB.prepare("DELETE FROM google_links WHERE sub=?1 OR account_id=?2").bind(sub, accountId),
    env.DB.prepare("INSERT INTO google_links (sub, account_id, created) VALUES (?1,?2,?3)").bind(sub, accountId, Date.now()),
  ]);
  return "ok";
}

// Google comes back here (GET /google/oauth?code&state, or ?error&state when the person said no)
export async function googleOAuth(req, env, url) {
  const base = siteOf(env, url);
  const state = url.searchParams.get("state") || "", code = url.searchParams.get("code") || "";
  if (!isHex48(state)) return Response.redirect(base + "/?googleLogin=0", 302);
  const st = await env.DB.prepare("DELETE FROM google_oauth WHERE state_hash=?1 RETURNING code_hash, device, port, app, expires").bind(await sha256("google-oauth:" + state)).first();
  const to = (q) => goOn(base, "google", st, state, q);
  if (!st || st.expires < Date.now() || !code || !googleReady(env)) return to("googleLogin=0");
  try {
    const t = await fetch(TOKEN, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, grant_type: "authorization_code", code, redirect_uri: back(env, url) }),
    });
    const tok = t.ok ? await t.json() : null;
    const me = tok && tok.id_token ? googleUser(tok.id_token, env.GOOGLE_CLIENT_ID) : null;
    if (!me) return to("googleLogin=0");
    if (await googleAccountId(env, me.sub, me.email ? await emailHash(env, me.email) : null)) return to("googleLogin=" + (await newGrant(env, "login", st, me, 5 * 60e3)));
    const q = new URLSearchParams({ googleLogin: "0", new: "1", sid: await newGrant(env, "signup", st, me, 30 * 60e3) });
    if (me.name) q.set("name", me.name);
    return to(String(q));
  } catch (e) {
    return to("googleLogin=0");
  }
}
