// The drivers' 👍/👎 on the coach's plan for the next session (migration 0084, POST /community/coach/planrate in coachtips.js):
// the counts by step and the weight each step's id or kind gets in everyone's plan (coachOf in pitwall-analysis.js, plan).
// the drivers' votes on the plan's steps, by the step's id and by its kind ("corner", "trail"…), and on whole plans
export const MIN_PLAN_VOTES = 15; // votes the admin panel calls enough to read a step's share
export const STEP = /^(plan|[a-z_]{1,24}(:[a-z_]{0,32})?@[0-9,]{0,48})$/;
// (with a group, only the votes on that group's tracks: road, oval, dirt_oval, dirt_road)
export async function planVotes(env, grp) {
  const r = await (grp ? env.DB.prepare("SELECT sid, k, SUM(up=1) AS up, SUM(up=-1) AS down, COUNT(DISTINCT account) AS drivers FROM coach_plan_votes WHERE cat=?1 GROUP BY sid, k ORDER BY COUNT(*) DESC LIMIT 200").bind(grp)
    : env.DB.prepare("SELECT sid, k, SUM(up=1) AS up, SUM(up=-1) AS down, COUNT(DISTINCT account) AS drivers FROM coach_plan_votes GROUP BY sid, k ORDER BY COUNT(*) DESC LIMIT 200")).all().catch(() => ({ results: [] }));
  return (r.results || []).map((x) => ({ id: x.sid, k: x.k, up: x.up || 0, down: x.down || 0, drivers: x.drivers || 0 }));
}
export const PLAN_SHRINK = 8;     // a step of this many votes has moved half way from its prior to what its votes say
// a step's weight in the plan from its votes (0.8 to 1.2): 0.8 + 0.4 × the share of thumbs up, moved towards from the
// first votes, a little at a time (half way at PLAN_SHRINK votes). A kind's votes together start from 1 (or the prior
// given, a wider group's weight); a step's own id starts from its kind's weight
const shrinkTo = (prior, up, n) => (n > 0 ? prior + (0.8 + 0.4 * up / n - prior) * (n / (n + PLAN_SHRINK)) : prior);
const r2 = (v) => Math.round(v * 100) / 100;
export function planWeights(votes, prior = 1) {
  const w = {}, byK = {}, kw = {};
  for (const v of votes) { if (v.id === "plan") continue; const o = (byK[v.k] = byK[v.k] || { up: 0, down: 0 }); o.up += v.up; o.down += v.down; }
  for (const [k, o] of Object.entries(byK)) kw[k] = shrinkTo(prior, o.up, o.up + o.down);
  for (const v of votes) { if (v.id === "plan") continue; const n = v.up + v.down; if (n > 0) w[v.id] = r2(shrinkTo(kw[v.k] != null ? kw[v.k] : prior, v.up, n)); }
  for (const [k, x] of Object.entries(kw)) if (w[k] == null) w[k] = r2(x);
  for (const k of Object.keys(w)) if (w[k] === 1) delete w[k];
  return w;
}

// the plan's weights for a group: a step the group's drivers voted on enough (its id or its kind) weighs by their votes,
// every other step by everyone's
export async function planWeightsFor(env, grp) {
  const all = planWeights(await planVotes(env));
  if (!grp) return all;
  const gv = await planVotes(env, grp), mine = planWeights(gv), out = { ...all };
  // what the group voted on enough replaces everyone's, also where the group's votes say 1 (then it is left out)
  const enough = new Set(), byK = {};
  for (const v of gv) { if (v.id === "plan") continue; const n = v.up + v.down; if (n >= MIN_PLAN_VOTES) enough.add(v.id); byK[v.k] = (byK[v.k] || 0) + n; }
  for (const [k, n] of Object.entries(byK)) if (n >= MIN_PLAN_VOTES) enough.add(k);
  for (const k of enough) delete out[k];
  return { ...out, ...mine };
}
