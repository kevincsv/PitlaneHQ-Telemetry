// The coach learns faster (migration 0088). Before, it learnt only when a driver opened the coach on a session and then
// opened it again on their next session there. Now:
// - The server's own coach (shadowRun, every ten minutes): it runs the analysis module (web/dist/pitwall-analysis.js, the
//   same file every device runs) over the best lap of every session of an account that nobody opened the coach on,
//   against the model's next level (else the record), and keeps what it would have said (coach_tips, src 'auto'). Those
//   tips are never shown; they say what the drivers find by themselves where nobody told them anything.
// - The server answers every tip itself (answerRun): the driver's next session here with a whole lap says what came of
//   it (the same corner, from 50 m before the reference's braking point to 150 m after its slowest point, in that
//   session's best lap), whether the driver opens the coach again or not.
// - What a tip is worth (upliftOf): the share of the lost time the drivers won back in that corner after seeing the tip,
//   against the share they won back by themselves where the tip was only the server's (the same kind on corners of the
//   same speed, else every kind there). The weights move from the first cases, a little at a time (coachtips.js weightOf).
// - Your corners over time (GET /community/coach/progress): every corner's time in the driver's last sessions here,
//   and the tips they saw in each corner with what came of them, so the coach changes its approach in a corner where the
//   same tip did not pay off twice (coachCompare in the module, ctx.progress).
// Never an LLM and never an outside API; counts over real laps only.
import "../../web/dist/pitwall-analysis.js";
import { goodLap, gunz } from "./model.js";
import { famId, famSql } from "./carfamily.js";
import { openData } from "./crypt.js";

const PW = globalThis.PW_ANALYSIS;
const BIN = 5;
export const GAIN_S = 0.05;          // a corner counts as gained (or lost) from this many seconds
const SHADOW_PER_RUN = 10;           // sessions the server's coach goes over per run
const SHADOW_DAYS = 180;             // how far back it goes (the history teaches it too)
const ANSWER_PER_RUN = 25;           // sessions whose tips it tries to answer per run
const LOOK_AGAIN = 86400e3;          // a tip with no later session yet is looked at again a day later
const NEXT_DAYS = 60;                // the next session answers a tip only within this many days
const PROGRESS_SESSIONS = 8;         // sessions the corner progress reads
const r3 = (v) => Math.round(v * 1000) / 1000;

// the corner's time on a lap: from 50 m before the reference's braking point to 150 m after its slowest point (the
// window coachCompare measures ta, tb and the session's best lap in)
export function winTime(bins, d, apex) {
  if (!Array.isArray(bins) || !(d >= 0) || !(apex >= 0)) return null;
  const i0 = Math.max(0, Math.round(d / BIN) - 10), i1 = Math.round(apex / BIN) + 30;
  if (i1 >= bins.length || !bins[i0] || !bins[i1]) return null;
  const t = bins[i1][1] - bins[i0][1];
  return t > 0 && t < 60 ? t : null;
}

// the reference the server's coach measures a lap against: the next level for its time (the real lap of the driver just
// ahead, as pitwall-model.js refFor picks it), else the record when it is faster; null when nobody known is ahead
export function refForLap(m, t) {
  if (!m || !(m.nb > 0)) return null;
  const L = Array.isArray(m.ladder) ? m.ladder : [];
  if (L.length) {
    let i = L.findIndex((x) => t <= x.upTo);
    if (i < 0) i = L.length - 1;
    while (i > 0 && !(L[i].time < t * 0.997)) i--;
    const x = L[i];
    if (x && x.time < t - 0.001 && Array.isArray(x.bins)) {
      const out = []; // the model keeps its next levels one bin in two: back to every bin, as pitwall-model.js does
      x.bins.forEach((b, k) => { const nx = x.bins[k + 1]; out.push([b[0], b[1], b[2], b[3], b[4], 0, null]); out.push(nx ? [(b[0] + nx[0]) / 2, (b[1] + nx[1]) / 2, b[2], b[3], b[4], 0, null] : [b[0], b[1], b[2], b[3], b[4], 0, null]); });
      const bins = out.slice(0, m.nb);
      if (bins.length) return { ref: "level", lap: { time: x.time, bins, maxBin: bins.length - 1, est: !!x.field } };
    }
  }
  if (Array.isArray(m.ideal) && m.ideal.length && m.idealTime < t - 0.001) {
    const bins = m.ideal.map((b) => [b[0], b[1], b[2], b[3], b[4], b[5], null]);
    return { ref: "record", lap: { time: m.idealTime, bins, maxBin: bins.length - 1, est: !!m.idealField } };
  }
  return null;
}

// what the coach would say on lap A against the model (exported for the tests): one row per corner, as the apps send them
export function shadowTips(A, m, track) {
  const R = refForLap(m, A.time);
  if (!R) return null;
  let cs;
  try { cs = PW.coachCompare(A, R.lap, { lang: "en", units: "metric", track: track || null, estB: R.lap.est }); } catch (e) { return null; }
  return {
    ref: R.ref,
    rows: cs.slice(0, 40).map((x) => ({ n: x.n, d: Math.round(x.d), apex: Math.round(x.apex), kind: x.lost > 0.03 ? x.kind || "" : "", cls: x.cls || "", lost: r3(x.lost), ta: r3(x.ta), tb: r3(x.tb), tbest: r3(x.ta), dd: x.dd != null ? Math.round(x.dd) : null })),
  };
}

// the best whole lap of a session with its telemetry, as the coach reads laps; null when none opens or fits
async function bestLap(env, sessionId, nb) {
  const r = await env.DB.prepare("SELECT time, trace FROM laps WHERE session_id=?1 AND valid=1 AND time>10 AND trace IS NOT NULL ORDER BY time LIMIT 3").bind(sessionId).all();
  for (const x of r.results || []) {
    let tr = null;
    try { tr = JSON.parse(await openData(env, x.trace)); } catch (e) { tr = null; }
    const g = goodLap(x.time, tr);
    if (!g) continue;
    if (nb > 0 && Math.abs(g.bins.length - nb) > nb * 0.03) continue; // another layout of the track
    const bins = g.bins.map((b) => [b[0], b[1], b[2], b[3], b[4], b[5], null]);
    return { time: g.time, bins, maxBin: bins.length - 1, flags: Array.isArray(tr.f) ? tr.f : [] };
  }
  return null;
}

async function modelOf(env, game, trackId, carId) {
  const row = await env.DB.prepare("SELECT data FROM model_cache WHERE game=?1 AND track_id=?2 AND car_id=?3").bind(game, trackId, carId).first();
  if (!row || !row.data) return null;
  try { return JSON.parse(await gunz(row.data)); } catch (e) { return null; }
}

// the server's coach over the sessions nobody opened the coach on: the newest first, then back through the history
export async function shadowRun(env, now = Date.now()) {
  const ss = await env.DB.prepare(
    `SELECT s.id, s.started, s.game, s.track_id, s.car_id, s.uploader, s.cat, s.track, s.track_config, s.car FROM sessions s
      WHERE s.uploader LIKE 'acct:%' AND s.track_id>0 AND s.car_id>0 AND s.started>?1 AND s.started>0
        AND LOWER(COALESCE(s.kind,'')) NOT LIKE '%test%' AND (COALESCE(s.official,1)<>0 OR s.ai=1)
        AND NOT EXISTS (SELECT 1 FROM coach_shadow c WHERE c.session_id=s.id)
      ORDER BY s.started DESC LIMIT ?2`).bind(now - SHADOW_DAYS * 86400e3, SHADOW_PER_RUN).all();
  let kept = 0;
  for (const s of ss.results || []) {
    const account = s.uploader.slice(5), game = s.game || "iracing", carId = await famId(env, game, s.car_id);
    let n = -1;
    try {
      // the driver opened the coach on it: what they saw is already there
      const seen = await env.DB.prepare("SELECT 1 FROM coach_tips WHERE account=?1 AND session_id=?2 LIMIT 1").bind(account, s.id).first();
      const m = seen ? null : await modelOf(env, game, s.track_id, carId);
      const A = m ? await bestLap(env, s.id, m.nb) : null;
      const sh = A ? shadowTips(A, m, { cat: s.cat || "", track: s.track || "", track_config: s.track_config || "", car: s.car || "" }) : null;
      if (sh && sh.rows.length) {
        const ins = env.DB.prepare(
          `INSERT INTO coach_tips (account, game, track_id, car_id, session_id, started, n, d, apex, kind, cls, ref, lost, ta, tb, tbest, created, dd, flags, src)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,'auto') ON CONFLICT(account, session_id, n) DO NOTHING`);
        const flags = A.flags.filter((x) => x === "traffic" || x === "cold").join(",") || null;
        await env.DB.batch(sh.rows.map((c) => ins.bind(account, game, s.track_id, carId, s.id, s.started, c.n, c.d, c.apex, c.kind, c.cls, sh.ref, c.lost, c.ta, c.tb, c.tbest, now, c.dd, flags)));
        n = sh.rows.length; kept += n;
      } else if (seen) n = 0;
    } catch (e) { n = -1; }
    await env.DB.prepare("INSERT INTO coach_shadow (session_id, at, n) VALUES (?1,?2,?3) ON CONFLICT(session_id) DO UPDATE SET at=excluded.at, n=excluded.n").bind(s.id, now, n).run();
  }
  return { sessions: (ss.results || []).length, kept };
}

// every tip with no answer yet: the driver's next session here with a whole lap answers it, the same corner of its best lap
export async function answerRun(env, now = Date.now()) {
  const open = await env.DB.prepare(
    `SELECT account, game, track_id, car_id, session_id, started FROM coach_tips
      WHERE outcome IS NULL AND kind<>'' AND tbest IS NOT NULL AND started>?1 AND (looked IS NULL OR looked<?2)
      GROUP BY account, session_id ORDER BY started DESC LIMIT ?3`).bind(now - (SHADOW_DAYS + NEXT_DAYS) * 86400e3, now - LOOK_AGAIN, ANSWER_PER_RUN).all();
  let scored = 0;
  for (const o of open.results || []) {
    const game = o.game || "iracing";
    const nx = await env.DB.prepare(
      `SELECT id FROM sessions WHERE uploader=?1 AND game=?2 AND track_id=?3 AND car_id IN (${await famSql(env, game, o.car_id)}) AND started>?4 AND started<?5 AND id<>?6
        ORDER BY started LIMIT 3`).bind("acct:" + o.account, game, o.track_id, o.started, o.started + NEXT_DAYS * 86400e3, o.session_id).all();
    let lap = null;
    for (const s of nx.results || []) { lap = await bestLap(env, s.id, 0); if (lap) break; }
    const tips = await env.DB.prepare("SELECT id, d, apex, tbest FROM coach_tips WHERE account=?1 AND session_id=?2 AND outcome IS NULL AND kind<>'' AND tbest IS NOT NULL").bind(o.account, o.session_id).all();
    const upd = [];
    for (const t of tips.results || []) {
      const w = lap ? winTime(lap.bins, t.d, t.apex) : null;
      if (w != null) { upd.push(env.DB.prepare("UPDATE coach_tips SET outcome=?2, outcome_at=?3, looked=?3 WHERE id=?1").bind(t.id, r3(t.tbest - w), now)); scored++; }
      else upd.push(env.DB.prepare("UPDATE coach_tips SET looked=?2 WHERE id=?1").bind(t.id, now));
    }
    if (upd.length) await env.DB.batch(upd);
  }
  return { sessions: (open.results || []).length, scored };
}

export const SHRINK = 15;            // a bucket of this many cases has moved half way from its prior to what its cases say
const MIN_RATINGS = 20;              // ratings a kind needs before its thumbs count
// the weight of a bucket (0.7 to 1.3): what its cases say it is worth, moved towards from the prior (1, or the weight of
// a wider group) as the cases come, half way at SHRINK cases. What it is worth: 1 + the share of the lost time the drivers
// won back after the tip beyond the share they win back by themselves (up, coachlearn.js upliftOf, ±0.3); without that
// baseline, 0.8 + 0.4 × the share of drivers who gained there next time. 15 % less when the drivers mostly gave the kind a
// thumbs down
export function weightOf(b, rt, prior = 1) {
  let w = prior;
  const n = (b && b.n) || 0;
  if (n > 0) {
    const raw = b.up != null ? 1 + Math.max(-0.3, Math.min(0.3, b.up)) : 0.8 + 0.4 * ((b.win || 0) / n);
    w = prior + (raw - prior) * (n / (n + SHRINK));
  }
  w = Math.min(1.3, Math.max(0.7, w));
  if (rt && rt.up + rt.down >= MIN_RATINGS && rt.down > 0.6 * (rt.up + rt.down)) w *= 0.85;
  return Math.round(Math.max(0.6, w) * 100) / 100;
}

// the share of a corner's lost time won back next time, between -1 and 1.5 (a corner that got slower, or won back more)
export const recOf = (outcome, lost) => (lost > 0.03 && outcome != null ? Math.max(-1, Math.min(1.5, outcome / lost)) : null);

// what each bucket (a tip's kind × the corner's speed) is worth beyond the time the drivers find by themselves: the
// share won back after the tip (src 'app') against the share won back where nobody said anything (src 'auto'), the same
// kind there when it has 5 cases or more, else every kind on corners of that speed. Exported for the tests: rows are
// {kind, cls, src, n, rec} (rec the average share won back)
export function upliftOf(rows) {
  const by = {}, base = {};
  for (const x of rows) {
    if (!x.kind || x.rec == null || !(x.n > 0)) continue;
    const k = x.kind + "|" + (x.cls || "");
    const b = (by[k] = by[k] || { n: 0, rec: 0, nu: 0, recu: 0 });
    if (x.src === "auto") {
      b.nu += x.n; b.recu += x.rec * x.n;
      const c = (base[x.cls || ""] = base[x.cls || ""] || { n: 0, s: 0 }); c.n += x.n; c.s += x.rec * x.n;
    } else { b.n += x.n; b.rec += x.rec * x.n; }
  }
  const out = {};
  for (const [k, b] of Object.entries(by)) {
    const cls = k.split("|")[1], cb = base[cls];
    const rec = b.n ? b.rec / b.n : null, recu = b.nu ? b.recu / b.nu : null, all = cb && cb.n ? cb.s / cb.n : null;
    // the kind's own baseline weighs in from its first cases, towards the corners' baseline while it has few
    const baseK = recu != null && all != null ? all + (recu - all) * (b.nu / (b.nu + 5)) : recu != null && b.nu >= 5 ? recu : all;
    out[k] = { rec: rec != null ? r3(rec) : null, nu: b.nu, base: baseK != null ? r3(baseK) : null, up: rec != null && baseK != null ? r3(rec - baseK) : null };
  }
  return out;
}
export async function upliftStats(env) {
  const r = await env.DB.prepare(
    `SELECT kind, cls, COALESCE(src,'app') AS src, COUNT(*) AS n, AVG(MIN(1.5, MAX(-1.0, outcome/lost))) AS rec
       FROM coach_tips WHERE outcome IS NOT NULL AND kind<>'' AND lost>0.03 GROUP BY kind, cls, COALESCE(src,'app')`).all().catch(() => ({ results: [] }));
  return upliftOf(r.results || []);
}

// every corner's time in the driver's last sessions here (oldest first), in the windows of the newest session's corners,
// and how it went (exported for the tests). laps: [{started, time, bins}] oldest first; corners: [{n, d, apex, lost}]
export function progressOf(laps, corners) {
  const out = [];
  for (const c of corners) {
    const t = laps.map((l) => winTime(l.bins, c.d, c.apex)).map((v) => (v != null ? r3(v) : null));
    const vals = t.filter((v) => v != null);
    if (vals.length < 2) continue;
    const first = vals[0], last = vals[vals.length - 1], best = Math.min(...vals), gain = r3(first - last);
    // stuck: three sessions or more, no faster than the first of them and still losing to the reference
    const trend = gain >= GAIN_S ? "better" : gain <= -GAIN_S ? "worse" : vals.length >= 3 && c.lost > GAIN_S ? "stuck" : "same";
    out.push({ n: c.n, apex: c.apex, d: c.d, t, first, last, best: r3(best), gain, trend, sessions: vals.length, lost: c.lost != null ? r3(c.lost) : null });
  }
  return out;
}

// GET /community/coach/progress?trackId&carId: the corners over the driver's last sessions here and the tips they saw in
// each corner with what came of them
export async function progressRoute(env, acc, game, trackId, rawCarId, before) {
  const carId = await famId(env, game, rawCarId);
  const ss = await env.DB.prepare(
    `SELECT id, started FROM sessions WHERE uploader=?1 AND game=?2 AND track_id=?3 AND car_id IN (${await famSql(env, game, carId)}) AND started<=?4
      ORDER BY started DESC LIMIT ?5`).bind("acct:" + acc.id, game, trackId, before, PROGRESS_SESSIONS * 2).all();
  const laps = [];
  for (const s of ss.results || []) {
    if (laps.length >= PROGRESS_SESSIONS) break;
    const l = await bestLap(env, s.id, laps.length ? laps[0].bins.length : 0);
    if (l) laps.push({ sid: s.id, started: s.started, time: l.time, bins: l.bins });
  }
  laps.reverse();
  // the corners: the newest session the coach (the apps' or the server's) went over, as it numbered them
  const last = await env.DB.prepare(
    `SELECT session_id FROM coach_tips WHERE account=?1 AND game=?2 AND track_id=?3 AND car_id=?4 AND started<=?5 AND tbest IS NOT NULL ORDER BY started DESC LIMIT 1`).bind(acc.id, game, trackId, carId, before).first();
  const cs = last ? ((await env.DB.prepare("SELECT n, d, apex, lost FROM coach_tips WHERE account=?1 AND session_id=?2 AND d IS NOT NULL AND apex IS NOT NULL ORDER BY apex").bind(acc.id, last.session_id).all()).results || []) : [];
  const corners = laps.length >= 2 ? progressOf(laps, cs) : [];
  // the tips the driver saw here and what came of each (the newest first): the coach tries another approach where one
  // did not pay off twice
  const tr = await env.DB.prepare(
    `SELECT apex, kind, outcome, started FROM coach_tips WHERE account=?1 AND game=?2 AND track_id=?3 AND car_id=?4 AND COALESCE(src,'app')='app'
       AND kind<>'' AND outcome IS NOT NULL ORDER BY started DESC LIMIT 60`).bind(acc.id, game, trackId, carId).all();
  const tried = (tr.results || []).map((x) => ({ apex: x.apex, kind: x.kind, ok: x.outcome >= GAIN_S ? 1 : x.outcome <= -GAIN_S ? -1 : 0, at: x.started }));
  return { sessions: laps.map((l) => ({ started: l.started, best: r3(l.time) })), corners, tried };
}
