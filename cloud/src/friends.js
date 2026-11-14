// Friends: the drivers an account follows (Community → Friends on every device, Follow on a driver's profile), to see
// their latest laps and to compare with their lap on the same car and track, wherever it sits on the leaderboard
// (the comparator's community laps only list the fastest few). Only drivers with a public profile can be followed, and a
// follower only ever sees their laps that are not anonymous, as anyone opening their profile would.
//   POST /community/friends/follow   {lap} or {id}: follow the driver of that lap (or that friend again)
//   POST /community/friends/unfollow {lap} or {id}
//   GET  /community/friends          → {friends: [{id, name, sup, laps: [{id, track, car, trackId, carId, time, game, created}]}]}
//   GET  /community/friends/laps?trackId=&carId=&game= → {laps: [{id, alias, time, sectors, fid}]}: each friend's lap there
//   follows(env, account, id) → whether the account follows that driver (the profile opens a friend's by their id)
import { inviteCode, inviteLink } from "./referralslib.js";
import { famId } from "./carfamily.js";

const JSONH = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: JSONH });
const err = (msg, status) => json({ error: msg }, status);
export const FOLLOW_MAX = 200;
const ID_RE = /^[A-Za-z0-9]{8,40}$/;

export async function follows(env, account, id) {
  if (!account || !ID_RE.test(String(id || ""))) return false;
  return !!(await env.DB.prepare("SELECT 1 AS x FROM follows WHERE account_id=?1 AND driver_id=?2").bind(account, id).first().catch(() => null));
}

// the driver behind a lap ({lap}: one of theirs not anonymous) or a friend's id ({id}), when their profile is public
async function target(env, b) {
  let id = null;
  if (typeof b.lap === "string" && b.lap) {
    const l = await env.DB.prepare("SELECT user_id, anon FROM community_laps WHERE id=?1").bind(b.lap.slice(0, 80)).first();
    if (!l || l.anon === 1) return null;
    id = l.user_id;
  } else if (ID_RE.test(String(b.id || ""))) id = b.id;
  if (!id) return null;
  const a = await env.DB.prepare("SELECT id, anon FROM accounts WHERE id=?1").bind(id).first();
  return a && !a.anon ? a.id : null;
}

// acc: the signed-in account ({id}) or null
export async function friendRoutes(req, env, p, m, body, url, game, acc) {
  if (!p.startsWith("/friends")) return null;
  if (!acc) return err("sign in with your Pitlane HQ account to follow drivers", 401);
  if ((p === "/friends/follow" || p === "/friends/unfollow") && m === "POST") {
    const id = await target(env, body || {});
    if (p === "/friends/unfollow") {
      const del = id || (ID_RE.test(String((body || {}).id || "")) ? body.id : null); // a friend who went anonymous can still be let go
      if (del) await env.DB.prepare("DELETE FROM follows WHERE account_id=?1 AND driver_id=?2").bind(acc.id, del).run();
      return json({ following: false });
    }
    if (!id) return err("this driver is anonymous", 404);
    if (id === acc.id) return err("that is you", 400);
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM follows WHERE account_id=?1").bind(acc.id).first();
    if (n && n.n >= FOLLOW_MAX) return err(`you follow ${FOLLOW_MAX} drivers already`, 400);
    await env.DB.prepare("INSERT OR IGNORE INTO follows (account_id, driver_id, created) VALUES (?1,?2,?3)").bind(acc.id, id, Date.now()).run();
    return json({ following: true, id });
  }
  if (p === "/friends" && m === "GET") {
    // the friends with a public profile (one who went anonymous since is left out), their newest laps that are not anonymous
    const fr = ((await env.DB.prepare(
      `SELECT f.driver_id AS id, u.alias AS name, (COALESCE(a.supporter,0)=1 AND COALESCE(a.supporter_hidden,0)=0) AS sup, f.created
       FROM follows f JOIN accounts a ON a.id=f.driver_id JOIN community_users u ON u.id=f.driver_id
       WHERE f.account_id=?1 AND COALESCE(a.anon,0)=0 ORDER BY f.created DESC LIMIT ${FOLLOW_MAX}`
    ).bind(acc.id).all()).results) || [];
    const laps = fr.length ? ((await env.DB.prepare(
      `SELECT id, user_id AS uid, track, car, track_id AS trackId, car_id AS carId, time, game, created, wet FROM community_laps
       WHERE user_id IN (SELECT driver_id FROM follows WHERE account_id=?1) AND anon=0 AND COALESCE(shown,'')<>'model'
       ORDER BY created DESC LIMIT 600`
    ).bind(acc.id).all()).results) || [] : [];
    const by = new Map();
    for (const l of laps) { const k = by.get(l.uid) || []; if (k.length < 8) k.push(l); by.set(l.uid, k); }
    // "Invite a friend": the account's own link; whoever makes an account from it and this account follow each other
    // (inviteFollow in accounts.js)
    const code = await inviteCode(env, acc);
    return json({ invite: code ? inviteLink(code) : "https://pitlanehq.app/?ref=invite-" + acc.id, friends: fr.map((f) => ({ id: f.id, name: f.name || "Driver", sup: !!f.sup, since: f.created, laps: (by.get(f.id) || []).map(({ uid, ...l }) => l) })) });
  }
  if (p === "/friends/laps" && m === "GET") {
    const t = +url.searchParams.get("trackId"), c = await famId(env, game, url.searchParams.get("carId"));
    if (!t || !c) return err("trackId and carId", 400);
    const r = await env.DB.prepare(
      `SELECT l.id, l.user_id AS fid, u.alias, l.time, l.sectors, l.wet FROM community_laps l JOIN community_users u ON u.id=l.user_id JOIN accounts a ON a.id=l.user_id
       WHERE l.track_id=?1 AND l.car_id=?2 AND l.game=?3 AND l.anon=0 AND COALESCE(a.anon,0)=0 AND COALESCE(l.shown,'')<>'model'
         AND l.user_id IN (SELECT driver_id FROM follows WHERE account_id=?4) ORDER BY l.time LIMIT ${FOLLOW_MAX}`
    ).bind(t, c, game, acc.id).all();
    return json({ laps: (r.results || []).map((x) => ({ ...x, sectors: x.sectors ? JSON.parse(x.sectors) : null })) });
  }
  return err("not found", 404);
}
