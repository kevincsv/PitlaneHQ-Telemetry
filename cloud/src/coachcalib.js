// How often the coach says each thing on real laps (the admin panel's Coach tab, "Check the coach on real laps"): the
// analysis module (web/dist/pitwall-analysis.js, the same file every device runs) goes over the model's memory of the
// cars and tracks with the most drivers, every driver's best lap against the fastest real lap there, and counts the tips
// and the plan's steps it gives. A threshold that fires on nearly every lap, or never, shows here before drivers notice.
// Nothing is kept: it reads the memory (model_laps, points only) and answers.
import "../../web/dist/pitwall-analysis.js";
import { goodLap, cleanLaps, memTrace, gunz, getCarCard } from "./model.js";
import { estimatePedals } from "./pedals.js";

const PW = globalThis.PW_ANALYSIS;
const COMBOS = 6, LAPS = 14;

// the counts over a set of laps (exported for the tests): every lap against the fastest one, the share of laps each
// tip kind and each plan step appears in, and how many corners and steps a lap gets on average
export function calibrate(laps) {
  const ref = laps.reduce((a, b) => (b.time < a.time ? b : a));
  const kinds = {}, steps = {};
  let n = 0, corners = 0, tips = 0, planN = 0;
  for (const A of laps) {
    if (A === ref) continue;
    let c;
    try { c = PW.coachPlan(A, ref, [], { lang: "en", units: "metric" }); } catch (e) { continue; }
    n++;
    corners += c.cs.length;
    const seenK = new Set(), seenS = new Set();
    for (const x of c.cs) if (x.lost > 0.03 && x.kind) { tips++; seenK.add(x.kind); }
    for (const p of c.plan.slice(0, 5)) seenS.add(p.k);
    planN += Math.min(5, c.plan.length);
    for (const k of seenK) kinds[k] = (kinds[k] || 0) + 1;
    for (const k of seenS) steps[k] = (steps[k] || 0) + 1;
  }
  const share = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round((v / Math.max(1, n)) * 100)]));
  return { laps: n, corners: n ? Math.round((corners / n) * 10) / 10 : 0, tips: n ? Math.round((tips / n) * 10) / 10 : 0, plan: n ? Math.round((planN / n) * 10) / 10 : 0, kinds: share(kinds), steps: share(steps) };
}

export async function calibrateRun(env) {
  const top = (await env.DB.prepare("SELECT game, track_id, car_id, COUNT(DISTINCT drv) AS d FROM model_laps GROUP BY game, track_id, car_id HAVING d>=5 ORDER BY d DESC LIMIT ?1").bind(COMBOS).all()).results || [];
  const out = [], all = [];
  for (const t of top) {
    const rows = (await env.DB.prepare("SELECT drv, MIN(time) AS time, data FROM model_laps WHERE game=?1 AND track_id=?2 AND car_id=?3 GROUP BY drv ORDER BY time LIMIT ?4").bind(t.game, t.track_id, t.car_id, LAPS).all()).results || [];
    const card = await getCarCard(env, t.game, t.car_id).catch(() => null), laps = [];
    for (const x of rows) {
      let g = null;
      try { g = goodLap(x.time, memTrace(JSON.parse(await gunz(x.data)))); } catch (e) {}
      if (!g) continue;
      const bins = g.field ? estimatePedals(g.bins, card && card.pedals, card && card.shifts) : g.bins;
      laps.push({ time: g.time, bins, maxBin: bins.length - 1, est: g.field });
    }
    const cl = cleanLaps(laps);
    if (cl.length < 3) continue;
    const r = calibrate(cl);
    out.push({ game: t.game, trackId: t.track_id, carId: t.car_id, drivers: t.d, ...r });
    all.push(...cl.map((l) => ({ l, k: out.length })));
  }
  // every combo together: the share of laps (over all of them) each kind and step reaches
  const sum = { laps: 0, kinds: {}, steps: {} };
  for (const c of out) { sum.laps += c.laps; for (const [k, v] of Object.entries(c.kinds)) sum.kinds[k] = (sum.kinds[k] || 0) + (v * c.laps) / 100; for (const [k, v] of Object.entries(c.steps)) sum.steps[k] = (sum.steps[k] || 0) + (v * c.laps) / 100; }
  const pc = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round((v / Math.max(1, sum.laps)) * 100)]));
  return { combos: out, total: { laps: sum.laps, kinds: pc(sum.kinds), steps: pc(sum.steps) } };
}
