// The drivers' 👍/👎 on the coach's plan for the next session (migration 0084, POST /community/coach/planrate in coachtips.js):
// the counts by step and the weight each step's id or kind gets in everyone's plan (coachOf in pitwall-analysis.js, plan).
// the drivers' votes on the plan's steps, by the step's id and by its kind ("corner", "trail"…), and on whole plans
export const MIN_PLAN_VOTES = 15; // votes a step needs before it moves in the plan
export const STEP = /^(plan|[a-z_]{1,24}(:[a-z_]{0,32})?@[0-9,]{0,48})$/;
export async function planVotes(env) {
  const r = await env.DB.prepare("SELECT sid, k, SUM(up=1) AS up, SUM(up=-1) AS down, COUNT(DISTINCT account) AS drivers FROM coach_plan_votes GROUP BY sid, k ORDER BY COUNT(*) DESC LIMIT 200").all().catch(() => ({ results: [] }));
  return (r.results || []).map((x) => ({ id: x.sid, k: x.k, up: x.up || 0, down: x.down || 0, drivers: x.drivers || 0 }));
}
// a step's weight in the plan from its votes: 0.8 + 0.4 × the share of thumbs up (0.8 to 1.2), from MIN_PLAN_VOTES votes;
// a step's own id first, else its kind's votes together
export function planWeights(votes) {
  const w = {}, byK = {};
  for (const v of votes) { if (v.id === "plan") continue; const n = v.up + v.down; if (n >= MIN_PLAN_VOTES) w[v.id] = Math.round((0.8 + 0.4 * v.up / n) * 100) / 100; const o = (byK[v.k] = byK[v.k] || { up: 0, down: 0 }); o.up += v.up; o.down += v.down; }
  for (const [k, o] of Object.entries(byK)) { const n = o.up + o.down; if (n >= MIN_PLAN_VOTES && w[k] == null) w[k] = Math.round((0.8 + 0.4 * o.up / n) * 100) / 100; }
  for (const k of Object.keys(w)) if (w[k] === 1) delete w[k];
  return w;
}

