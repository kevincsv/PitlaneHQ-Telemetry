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
