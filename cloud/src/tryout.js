// Trying Pitlane HQ without an account (the owner's choice, Nov 15 2026): a PC nobody is signed in on may drive
// TRY_LIMIT sessions, then the app asks for a free account (tryout.go in the agent). The agent counts them itself and
// tells the server too, by its ?pc= (a hash of Windows' own machine id, the same after reinstalling), so a new install
// starts from what that PC already used. No account, no name: only the PC's hash and the session's id.
export const TRY_LIMIT = 3;
const KEEP = 10; // rows kept a PC at most (more never change the answer)

const pcOk = (pc) => /^[0-9a-f]{32}$/.test(String(pc || ""));
const sessOk = (s) => typeof s === "string" && s.length > 0 && s.length <= 80;

export async function tryUsed(env, pc) {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM tryout_pcs WHERE pc=?1").bind(pc).first().catch(() => null);
  return (r && r.n) || 0;
}

// GET /community/tryout?pc=…: the sessions this PC used; POST /community/tryout {pc, session}: one more
export async function tryoutRoutes(env, p, m, body, url) {
  if (p !== "/tryout") return null;
  const h = { "content-type": "application/json", "access-control-allow-origin": "*" };
  const out = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: h });
  const pc = m === "POST" ? body.pc : url.searchParams.get("pc");
  if (!pcOk(pc)) return out({ error: "pc" }, 400);
  if (m === "POST") {
    if (!sessOk(body.session)) return out({ error: "session" }, 400);
    if ((await tryUsed(env, pc)) < KEEP) await env.DB.prepare("INSERT OR IGNORE INTO tryout_pcs (pc, session, at) VALUES (?1,?2,?3)").bind(pc, body.session, Date.now()).run();
  } else if (m !== "GET") return out({ error: "GET or POST" }, 405);
  return out({ used: await tryUsed(env, pc), limit: TRY_LIMIT });
}

// an admin signed in on that PC starts its count again (to try it as a new driver would)
export async function tryReset(env, pc) {
  if (pcOk(pc)) await env.DB.prepare("DELETE FROM tryout_pcs WHERE pc=?1").bind(pc).run().catch(() => {});
}

// The admin Analytics' "Tried without an account": each PC that drove without an account in the days asked, its
// sessions with the game, track and car (the sessions it uploaded with its own token, "dev_<install>:<session>"), whether
// it used the TRY_LIMIT sessions and whether someone signed in there afterwards (anonAdopt moved its sessions to an
// account). No name: a PC is the first characters of its hash.
export const SQL_TRY_ROWS = "SELECT pc, session, at FROM tryout_pcs WHERE pc IN (SELECT pc FROM tryout_pcs WHERE at>=?1) LIMIT 3000";
export const SQL_TRY_SESSIONS = "SELECT id, uploader, game, track, car, laps, started FROM sessions WHERE started>=?1 AND id LIKE 'dev\\_%' ESCAPE '\\' LIMIT 5000";

export function tryoutsOf({ t0, rows = [], sessions = [] }) {
  const bySess = new Map();
  for (const s of sessions) {
    const i = String(s.id).indexOf(":");
    if (i > 0) bySess.set(s.id.slice(i + 1), s);
  }
  const pcs = new Map();
  for (const r of rows) {
    if (!pcs.has(r.pc)) pcs.set(r.pc, []);
    pcs.get(r.pc).push(r);
  }
  const list = [...pcs.entries()].map(([pc, rs]) => {
    rs.sort((a, b) => a.at - b.at);
    const ses = rs.map((r) => {
      const s = bySess.get(r.session);
      return { at: r.at, game: (s && s.game) || "", track: (s && s.track) || "", car: (s && s.car) || "", laps: (s && s.laps) || 0, acct: s && String(s.uploader).startsWith("acct:") ? String(s.uploader).slice(5) : "" };
    });
    return { pc: pc.slice(0, 6), used: rs.length, first: rs[0].at, last: rs[rs.length - 1].at, hit: rs.length >= TRY_LIMIT, signedUp: ses.some((s) => s.acct), account: (ses.find((s) => s.acct) || {}).acct || "",
      laps: ses.reduce((n, s) => n + s.laps, 0), games: [...new Set(ses.map((s) => s.game).filter(Boolean))], sessions: ses.map(({ acct, ...s }) => s) };
  }).filter((x) => x.last >= t0).sort((a, b) => b.last - a.last);
  return { pcs: list.length, hit: list.filter((x) => x.hit).length, signedUp: list.filter((x) => x.signedUp).length, laps: list.reduce((n, x) => n + x.laps, 0), limit: TRY_LIMIT, list: list.slice(0, 100) };
}
