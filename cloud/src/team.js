// Team mode (docs/spec/team.md, migration 0101): a small group of accounts (up to 12) for endurance races with friends.
// Whoever is in the car streams their live telemetry to the team's live room (live.js, "team:" + room) and keeps their
// stints in the team's log. The team's secret never reaches the server: it keeps the room (a hash of the secret), the
// hash of the join proof the invite gives, each member's copy of the secret sealed with their own data key, and the log
// entries sealed with the team key.
//   GET  /team                        → {teams:[{id, name, role, owner, sealed, members:[{id, name, role, joined}]}]}
//   POST /team/create {name, room, join, sealed} → {id}
//   POST /team/join   {id, join, sealed}         → {id, name}
//   POST /team/leave  {id}                       → {ok}
//   POST /team/remove {id, member}               → {ok} (owner only)
//   POST /team/rename {id, name}                 → {ok} (owner only)
//   POST /team/log    {id, key, sealed}          → {ok} (upserts the member's entry)
//   GET  /team/log?id=&since=                    → {log:[{id, account, name, key, at, sealed}]}
import { sessionAccount, sha256 } from "./accounts.js";

const JSONH = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: JSONH });
const err = (e, s = 400) => json({ error: e }, s);

export const TEAM = { members: 12, teams: 5, logDays: 30, logMax: 300, logBytes: 48 * 1024, sealedMax: 512, keyMax: 80 };
const DAY = 86400e3;
const ID = /^[0-9a-f]{12}$/, ROOM = /^[0-9a-f]{32}$/, JOIN = /^[0-9a-f]{64}$/, B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const sealedOk = (s, max) => typeof s === "string" && s.length >= 16 && s.length <= max && B64.test(s);
// a team's name: 2 to 40 characters, no control characters, spaces folded
export function teamName(v) {
  const n = String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return n.length >= 2 && n.length <= 40 ? n : null;
}
const logKey = (v) => (typeof v === "string" && v.length >= 1 && v.length <= TEAM.keyMax && !/[\u0000-\u001f\u007f]/.test(v) ? v : null);
const newId = () => [...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, "0")).join("");

function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const joinHash = (join) => sha256("pitlanehq-team-join|" + join);

const memberOf = (env, team, account) => env.DB.prepare("SELECT role FROM team_members WHERE team=?1 AND account=?2").bind(team, account).first();

// the live room: whether the account is in the team whose room it is (live.js)
export async function teamRoomMember(env, room, account) {
  if (!ROOM.test(String(room || "")) || !account) return false;
  return !!(await env.DB.prepare("SELECT 1 AS x FROM team_members m JOIN teams t ON t.id=m.team WHERE t.room=?1 AND m.account=?2").bind(room, account).first());
}

// the teams of an account, each with its members (their public name is the account's)
async function teamsOf(env, account) {
  const ts = (await env.DB.prepare(
    `SELECT t.id, t.name, t.owner, m.role, m.sealed FROM team_members m JOIN teams t ON t.id=m.team WHERE m.account=?1 ORDER BY m.joined`
  ).bind(account).all()).results || [];
  if (!ts.length) return [];
  const ms = (await env.DB.prepare(
    `SELECT m.team, m.account AS id, a.display AS name, m.role, m.joined FROM team_members m LEFT JOIN accounts a ON a.id=m.account
     WHERE m.team IN (SELECT team FROM team_members WHERE account=?1) ORDER BY m.joined, m.account`
  ).bind(account).all()).results || [];
  return ts.map((t) => ({ ...t, members: ms.filter((m) => m.team === t.id).map(({ team, ...m }) => ({ ...m, name: m.name || "Driver" })) }));
}

// a member goes (leaves or is removed): the oldest member left takes over from an owner; the last one deletes the team
async function dropMember(env, team, account) {
  const t = await env.DB.prepare("SELECT owner FROM teams WHERE id=?1").bind(team).first();
  await env.DB.prepare("DELETE FROM team_members WHERE team=?1 AND account=?2").bind(team, account).run();
  const next = await env.DB.prepare("SELECT account FROM team_members WHERE team=?1 ORDER BY joined, account LIMIT 1").bind(team).first();
  if (!next) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM team_log WHERE team=?1").bind(team),
      env.DB.prepare("DELETE FROM teams WHERE id=?1").bind(team),
    ]);
    return;
  }
  if (t && t.owner === account) {
    await env.DB.batch([
      env.DB.prepare("UPDATE team_members SET role='owner' WHERE team=?1 AND account=?2").bind(team, next.account),
      env.DB.prepare("UPDATE teams SET owner=?2 WHERE id=?1").bind(team, next.account),
    ]);
  }
}

// a member who left or was removed is put out of the team's live room at once
async function kick(env, team, account) {
  try {
    if (!env.LIVE) return;
    const t = await env.DB.prepare("SELECT room FROM teams WHERE id=?1").bind(team).first();
    if (!t) return;
    const room = env.LIVE.get(env.LIVE.idFromName("team:" + t.room));
    await room.fetch(new Request("https://live/kick", { headers: { "x-live-kick": account } }));
  } catch (e) {}
}

export async function teamRoute(req, env, url) {
  const p = url.pathname, m = req.method;
  if (p !== "/team" && !p.startsWith("/team/")) return null;
  if (m === "OPTIONS") return new Response(null, { status: 204, headers: { ...JSONH, "access-control-allow-methods": "GET,POST", "access-control-allow-headers": "authorization,content-type", "access-control-max-age": "86400" } });
  let acc = null;
  try {
    acc = await sessionAccount(req, env);
  } catch (e) {
    if (e && e.gated) return json({ error: e.message, code: "verify_first" }, 403);
    throw e;
  }
  if (!acc) return err("Sign in with your Pitlane HQ account.", 401);
  let b = {};
  if (m === "POST") {
    const text = await req.text();
    if (text.length > TEAM.logBytes + 4096) return err("This entry is too big.", 413);
    try { b = JSON.parse(text || "{}") || {}; } catch (e) { return err("The request is not valid.", 400); }
    if (typeof b !== "object") b = {};
  }
  const now = Date.now();

  if (p === "/team" && m === "GET") return json({ teams: await teamsOf(env, acc.id) });

  if (p === "/team/create" && m === "POST") {
    const name = teamName(b.name);
    if (!name) return err("The team's name needs 2 to 40 characters.");
    if (!ROOM.test(String(b.room || "")) || !JOIN.test(String(b.join || "")) || !sealedOk(b.sealed, TEAM.sealedMax)) return err("The request is not valid.");
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM team_members WHERE account=?1").bind(acc.id).first();
    if (n && n.n >= TEAM.teams) return err(`You are in ${TEAM.teams} teams already.`, 409);
    if (await env.DB.prepare("SELECT 1 AS x FROM teams WHERE room=?1").bind(b.room).first()) return err("This team exists already.", 409);
    let id = newId();
    for (let i = 0; i < 5 && (await env.DB.prepare("SELECT 1 AS x FROM teams WHERE id=?1").bind(id).first()); i++) id = newId();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO teams (id, name, owner, room, join_hash, created) VALUES (?1,?2,?3,?4,?5,?6)").bind(id, name, acc.id, b.room, await joinHash(b.join), now),
      env.DB.prepare("INSERT INTO team_members (team, account, role, sealed, joined) VALUES (?1,?2,'owner',?3,?4)").bind(id, acc.id, b.sealed, now),
    ]);
    return json({ id });
  }

  // every other route names a team
  const id = String(b.id || url.searchParams.get("id") || "");
  if (!ID.test(id)) return err("This team does not exist.", 404);

  if (p === "/team/join" && m === "POST") {
    if (!JOIN.test(String(b.join || "")) || !sealedOk(b.sealed, TEAM.sealedMax)) return err("The request is not valid.");
    const t = await env.DB.prepare("SELECT id, name, join_hash FROM teams WHERE id=?1").bind(id).first();
    if (!t) return err("This team does not exist.", 404);
    if (!same(await joinHash(b.join), t.join_hash)) return err("This invite link is not valid.", 403);
    if (await memberOf(env, id, acc.id)) {
      // already in it (another device joined first): its sealed copy is the newest
      await env.DB.prepare("UPDATE team_members SET sealed=?3 WHERE team=?1 AND account=?2").bind(id, acc.id, b.sealed).run();
      return json({ id, name: t.name });
    }
    const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM team_members WHERE team=?1").bind(id).first();
    if (c && c.n >= TEAM.members) return err(`This team has ${TEAM.members} members already.`, 409);
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM team_members WHERE account=?1").bind(acc.id).first();
    if (n && n.n >= TEAM.teams) return err(`You are in ${TEAM.teams} teams already.`, 409);
    await env.DB.prepare("INSERT OR IGNORE INTO team_members (team, account, role, sealed, joined) VALUES (?1,?2,'member',?3,?4)").bind(id, acc.id, b.sealed, now).run();
    return json({ id, name: t.name });
  }

  const me = await memberOf(env, id, acc.id);
  if (!me) return err("You are not in this team.", 403);

  if (p === "/team/leave" && m === "POST") {
    await kick(env, id, acc.id);
    await dropMember(env, id, acc.id);
    return json({ ok: true });
  }
  if (p === "/team/remove" && m === "POST") {
    if (me.role !== "owner") return err("Only the team's owner can do this.", 403);
    const who = String(b.member || "");
    if (who === acc.id) return err("Use Leave to leave your own team.");
    if (!who || !(await memberOf(env, id, who))) return err("This driver is not in the team.", 404);
    await kick(env, id, who);
    await dropMember(env, id, who);
    return json({ ok: true });
  }
  if (p === "/team/rename" && m === "POST") {
    if (me.role !== "owner") return err("Only the team's owner can do this.", 403);
    const name = teamName(b.name);
    if (!name) return err("The team's name needs 2 to 40 characters.");
    await env.DB.prepare("UPDATE teams SET name=?2 WHERE id=?1").bind(id, name).run();
    return json({ ok: true });
  }
  if (p === "/team/log" && m === "POST") {
    const key = logKey(b.key);
    if (!key) return err("The request is not valid.");
    if (typeof b.sealed === "string" && b.sealed.length > TEAM.logBytes) return err("This entry is too big.", 413);
    if (!sealedOk(b.sealed, TEAM.logBytes)) return err("The request is not valid.");
    await env.DB.batch([
      env.DB.prepare("INSERT INTO team_log (team, account, key, at, sealed) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(team, account, key) DO UPDATE SET at=excluded.at, sealed=excluded.sealed")
        .bind(id, acc.id, key, now, b.sealed),
      // the last 30 days, at most 300 entries a team
      env.DB.prepare("DELETE FROM team_log WHERE team=?1 AND at<?2").bind(id, now - TEAM.logDays * DAY),
      env.DB.prepare(`DELETE FROM team_log WHERE team=?1 AND id NOT IN (SELECT id FROM team_log WHERE team=?1 ORDER BY at DESC, id DESC LIMIT ${TEAM.logMax})`).bind(id),
    ]);
    return json({ ok: true });
  }
  if (p === "/team/log" && m === "GET") {
    const since = Math.max(Number(url.searchParams.get("since")) || 0, now - TEAM.logDays * DAY);
    const r = (await env.DB.prepare(
      `SELECT l.id, l.account, a.display AS name, l.key, l.at, l.sealed FROM team_log l LEFT JOIN accounts a ON a.id=l.account
       WHERE l.team=?1 AND l.at>?2 ORDER BY l.at DESC, l.id DESC LIMIT ${TEAM.logMax}`
    ).bind(id, since).all()).results || [];
    return json({ log: r.map((x) => ({ ...x, name: x.name || "Driver" })) });
  }
  return err("Not found.", 404);
}
