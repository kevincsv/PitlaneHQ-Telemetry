// The coach learns from drivers without an account too (the owner's choice, Nov 15 2026). A PC with no account
// uploads its laps with its own token (community_users, POST /community/register, the token the PC always had for
// sharing): they are kept as sessions of "dev:<that id>", a random id of the install, with no driver name, and nothing
// of them shows anywhere (no profile, no list) but the best lap of each car and track, always Anonymous on the leaderboards. The model and the server's coach learn from them like
// from an account's (model.js learnNewLaps, coachlearn.js). When someone signs in on that PC its laps move to the
// account (POST /community/adopt, anonAdopt). Laps nobody claimed are deleted after ANON_DAYS; what the model learnt
// from them stays, as it does when an account is deleted. Said in the privacy policy (legal.js).
export const DEV = "dev:";
export const ANON_DAYS = 180;
export const ANON_PER_DAY = 1500; // laps a day per install, as every driver's uploads

// the sessions' uploader of an account or of a PC without one
export const isLearner = (up) => typeof up === "string" && (up.startsWith("acct:") || up.startsWith(DEV));
// SQL: the sessions the model and the server's coach learn from (an account's, or a PC's without one)
export const LEARNERS = (col) => `(${col} LIKE 'acct:%' OR ${col} LIKE 'dev:%')`;
// coach_tips.account of a session's uploader, and back: an account's id as it is, a PC's with its "dev:"
export const tipAccount = (up) => (up.startsWith("acct:") ? up.slice(5) : up);
export const uploaderOf = (account) => (String(account).startsWith(DEV) ? account : "acct:" + account);

// the PC a token belongs to: never an account's row, a race rival's or a DRINKS guest's
export async function deviceOf(env, tokenHash) {
  const d = await env.DB.prepare("SELECT id, uploads_day, uploads FROM community_users WHERE token_hash=?1").bind(tokenHash).first().catch(() => null);
  return d && !/^(o:|guest-)/.test(d.id) ? d : null;
}

// what a session of a PC without an account keeps: nothing that names the driver
export function anonSession(s) {
  const out = { ...s, driver: "" };
  delete out.lic;
  return out;
}

export async function anonCount(env, d, laps) {
  const day = new Date().toISOString().slice(0, 10);
  const n = (d.uploads_day === day ? d.uploads || 0 : 0) + Math.max(1, laps || 0);
  if (n > ANON_PER_DAY) return false;
  await env.DB.prepare("UPDATE community_users SET uploads_day=?2, uploads=?3 WHERE id=?1").bind(d.id, day, n).run();
  return true;
}

// someone signed in on that PC: its sessions, laps and the coach's tips on them go to the account. A session the
// account has already (the same session uploaded both ways) keeps the account's copy
export async function anonAdopt(env, devId, accountId) {
  const from = DEV + devId, to = "acct:" + accountId;
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE uploader=?1").bind(from).first().catch(() => null);
  if (!n || !n.n) return 0;
  await env.DB.batch([
    env.DB.prepare("UPDATE sessions SET uploader=?2 WHERE uploader=?1").bind(from, to),
    env.DB.prepare("UPDATE OR IGNORE coach_tips SET account=?2 WHERE account=?1").bind(from, accountId),
    env.DB.prepare("DELETE FROM coach_tips WHERE account=?1").bind(from),
  ]);
  return n.n;
}

// a PC without an account asks for what it sent to be removed (DELETE /community/me with its token)
export async function anonForget(env, devId) {
  const from = DEV + devId;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM laps WHERE session_id IN (SELECT id FROM sessions WHERE uploader=?1)").bind(from),
    env.DB.prepare("DELETE FROM sessions WHERE uploader=?1").bind(from),
    env.DB.prepare("DELETE FROM coach_tips WHERE account=?1").bind(from),
  ]);
}

// once a day: the laps of PCs nobody signed in on, older than ANON_DAYS (a few sessions each run)
export async function anonPrune(env, now = Date.now()) {
  const old = (await env.DB.prepare("SELECT id FROM sessions WHERE uploader LIKE 'dev:%' AND started<?1 ORDER BY started LIMIT 200").bind(now - ANON_DAYS * 86400e3).all()).results || [];
  for (const s of old) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM laps WHERE session_id=?1").bind(s.id),
      env.DB.prepare("DELETE FROM coach_tips WHERE session_id=?1 AND account LIKE 'dev:%'").bind(s.id),
      env.DB.prepare("DELETE FROM coach_shadow WHERE session_id=?1").bind(s.id),
      env.DB.prepare("DELETE FROM sessions WHERE id=?1").bind(s.id),
    ]);
  }
  return old.length;
}
