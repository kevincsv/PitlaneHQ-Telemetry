// "Invite a friend" (referrals.js): the account's code and link, apart so friends.js can show the link without the rest
// codes: 8 letters and digits nobody confuses (no 0/o, 1/l/i), shown in capitals, matched in any case
const ABC = "abcdefghjkmnpqrstuvwxyz23456789";
export const cleanCode = (c) => String(c || "").trim().toLowerCase().replace(/^.*[?&]ref=invite-/, "").replace(/[^0-9a-z]/g, "").slice(0, 32);
const newCode = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => ABC[b % ABC.length]).join("");
export const inviteLink = (code) => "https://pitlanehq.app/?ref=invite-" + code;

// the account's code, made the first time it is asked for
export async function inviteCode(env, acc) {
  if (acc.invite_code) return acc.invite_code;
  for (let i = 0; i < 5; i++) {
    const c = newCode();
    const r = await env.DB.prepare("UPDATE accounts SET invite_code=?2 WHERE id=?1 AND invite_code IS NULL").bind(acc.id, c).run().catch(() => null);
    if (r && r.meta && r.meta.changes) { acc.invite_code = c; return c; }
    const now = await env.DB.prepare("SELECT invite_code FROM accounts WHERE id=?1").bind(acc.id).first().catch(() => null);
    if (now && now.invite_code) return (acc.invite_code = now.invite_code);
  }
  return "";
}

