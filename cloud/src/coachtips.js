// The coach learns from what happens after its tips. Every tip the coach shows (the corner, the tip's kind, what the lap
// lost there and the time the session's best lap spent in that corner) comes here with the account, once per lap and
// reference. When the same driver drives that car and track again and opens the coach, the same corner's time in the new
// session's best lap says whether the tip worked (outcome, seconds gained). The 👍/👎 a driver presses on a tip goes with
// it. Nothing of this shows to the drivers. The admin panel shows the buckets (the tip's kind × the corner's speed), and
// from MIN_CASES cases a bucket's share of drivers who gained reorders the plan's tips (w, read by coachPlan on the web
// through /community/coach/weights). The tips' texts never change here, and no lap is made of this.
import { sessionAccount, isAdmin } from "./accounts.js";
import { famId } from "./carfamily.js";
import { groupFor, GROUPS } from "./categories.js";
import { MIN_PLAN_VOTES, STEP, planVotes, planWeights, planWeightsFor } from "./coachplan.js";
import { calibrateRun } from "./coachcalib.js";

export const MIN_CASES = 30;   // cases a bucket needs before it reorders anything
const MIN_RATINGS = 20;        // ratings a kind needs before its thumbs count
const SAME_CORNER_M = 60;      // the same corner next time: its slowest point within this many metres
const GAIN_S = 0.05;           // a corner counts as gained (or lost) from this many seconds

const JSONH = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
const json = (v, status = 200, h = {}) => new Response(JSON.stringify(v), { status, headers: { ...JSONH, ...h } });
const err = (msg, status) => json({ error: msg }, status);
const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);
const int = (v) => (Number.isInteger(v) && v > 0 && v < 1e12 ? v : null);
const str = (v, max = 40) => (typeof v === "string" ? v.slice(0, max) : "");
const KIND = /^[a-z_]{1,32}$/, CLS = { slow: 1, medium: 1, fast: 1 }, REF = { level: 1, record: 1, own: 1, comm: 1 };
const r3 = (v) => Math.round(v * 1000) / 1000;
const BRAKE_KINDS = ["brake_later", "brake_earlier", "brake_late_apex"]; // the tips that ask for metres of braking: their numbers are calibrated
const MIN_ASK = 10;      // gains a bucket needs before its metres calibrate a tip
const MIN_PERSONAL = 10; // cases a driver's own bucket needs before it weighs
const HABIT_TRACKS = 3;  // tracks a kind has to repeat on to be a habit of the driver
// the kinds of tip about the pedals and the speed: a habit of them on other kinds of track is still worth saying (the line,
// the gears and the steering belong to the kind of track)
const TRANSFER = /^(brake_|trail|coast|throttle|full_throttle|no_wait|lifts|entry_|apex_speed|apex_longer|exit_speed|cons)/;
const FLAGS = { traffic: 1, cold: 1 };
const median = (a) => { if (!a.length) return null; const v = a.slice().sort((x, y) => x - y); return v[v.length >> 1]; };
const flagsOf = (f) => (Array.isArray(f) ? f.filter((x) => FLAGS[x]).slice(0, 4).join(",") : "") || null;

// the weight of a bucket: 1 while it has fewer than MIN_CASES cases, else 0.8 + 0.4 × the share of drivers who gained
// there next time (0.7 to 1.3), and 15 % less when the drivers mostly gave the kind a thumbs down
export function weightOf(b, rt) {
  let w = 1;
  if (b.n >= MIN_CASES) w = Math.min(1.3, Math.max(0.7, 0.8 + 0.4 * (b.win / b.n)));
  if (rt && rt.up + rt.down >= MIN_RATINGS && rt.down > 0.6 * (rt.up + rt.down)) w *= 0.85;
  return Math.round(Math.max(0.6, w) * 100) / 100;
}

// the buckets (a tip's kind × the corner's speed) for everyone, or for one account (the driver's own weights). With a group
// (categories.js groupOf: road, oval, dirt_oval, dirt_road) a bucket that has MIN_CASES cases of its own in that group
// weighs by them (cat on the bucket), and the rest by everyone's cases together: an oval's "brake later" learns from the
// ovals once they have enough, and until then from every track
export async function buckets(env, account, grp, min = MIN_CASES) {
  const who = account ? " AND account=?2" : "";
  const b = await env.DB.prepare(
    `SELECT COALESCE(cat,'') AS cat, kind, cls, COUNT(*) AS n, SUM(outcome>?1) AS win, SUM(outcome<-?1) AS loss, SUM(outcome) AS tot
       FROM coach_tips WHERE outcome IS NOT NULL AND kind<>''${who} GROUP BY cat, kind, cls`).bind(...(account ? [GAIN_S, account] : [GAIN_S])).all();
  const t = await env.DB.prepare(`SELECT COALESCE(cat,'') AS cat, kind, SUM(rating=1) AS up, SUM(rating=-1) AS down FROM coach_tips WHERE rating<>0 AND kind<>''${account ? " AND account=?1" : ""} GROUP BY cat, kind`).bind(...(account ? [account] : [])).all();
  const ratings = {}, gRatings = {};
  for (const x of t.results || []) {
    const o = (ratings[x.kind] = ratings[x.kind] || { up: 0, down: 0 }); o.up += x.up || 0; o.down += x.down || 0;
    if (grp && x.cat === grp) gRatings[x.kind] = { up: x.up || 0, down: x.down || 0 };
  }
  // a group's thumbs once they are enough to count, else everyone's
  const rtOf = (kind) => { const g = gRatings[kind]; return g && g.up + g.down >= MIN_RATINGS ? g : ratings[kind]; };
  const pool = new Map(), mine = new Map();
  for (const x of b.results || []) {
    const k = x.kind + "|" + (x.cls || ""), o = pool.get(k) || { kind: x.kind, cls: x.cls || "", n: 0, win: 0, loss: 0, tot: 0 };
    o.n += x.n; o.win += x.win || 0; o.loss += x.loss || 0; o.tot += x.tot || 0; pool.set(k, o);
    if (grp && x.cat === grp) mine.set(k, { kind: x.kind, cls: x.cls || "", n: x.n, win: x.win || 0, loss: x.loss || 0, tot: x.tot || 0 });
  }
  const out = [];
  for (const [k, o] of pool) {
    const g = mine.get(k), use = g && g.n >= min ? g : o;
    out.push({ kind: o.kind, cls: o.cls, n: use.n, win: use.win, loss: use.loss, avg: r3(use.n ? use.tot / use.n : 0), w: weightOf(use, rtOf(o.kind)), ...(use === g ? { cat: grp } : {}) });
  }
  // a kind whose thumbs are down also weighs less on corners where it has no scored case yet
  const kinds = new Set([...Object.keys(ratings), ...Object.keys(gRatings)]);
  for (const kind of kinds) for (const cls of Object.keys(CLS)) if (!out.some((x) => x.kind === kind && x.cls === cls)) { const w = weightOf({ n: 0, win: 0 }, rtOf(kind)); if (w !== 1) out.push({ kind, cls, n: 0, win: 0, loss: 0, avg: 0, w }); }
  // the metres a braking tip should ask for: among the drivers who gained next time, the median of how much their braking
  // point really moved (a tip that asks for 8 m when 4 m is what paid is calibrated down to 4); the group's own from MIN_ASK gains
  if (!account) {
    const d = await env.DB.prepare(
      `SELECT COALESCE(cat,'') AS cat, kind, cls, dd, ddn FROM coach_tips WHERE outcome>?1 AND kind IN (${BRAKE_KINDS.map((k) => `'${k}'`).join(",")}) AND dd IS NOT NULL AND ddn IS NOT NULL`).bind(GAIN_S).all();
    const moved = {}, gMoved = {};
    for (const x of d.results || []) {
      const k = x.kind + "|" + (x.cls || ""), v = Math.abs(x.ddn - x.dd);
      (moved[k] = moved[k] || []).push(v);
      if (grp && x.cat === grp) (gMoved[k] = gMoved[k] || []).push(v);
    }
    for (const [k, a0] of Object.entries(moved)) {
      const a = gMoved[k] && gMoved[k].length >= MIN_ASK ? gMoved[k] : a0;
      if (a.length < MIN_ASK) continue;
      const [kind, cls] = k.split("|");
      let bk = out.find((x) => x.kind === kind && x.cls === cls);
      if (!bk) { bk = { kind, cls, n: 0, win: 0, loss: 0, avg: 0, w: 1 }; out.push(bk); }
      bk.ask = Math.max(2, Math.round(median(a)));
    }
  }
  return { buckets: out, ratings };
}
// the group the app asks about: ?cat= (its session's category) with ?trackId= and ?carId=; "" for an app of before
async function groupQ(env, game, u) {
  const q = (k) => u.searchParams.get(k) || "";
  const c = String(q("cat")).slice(0, 20), t = +q("trackId") || 0, car = +q("carId") || 0;
  if (!c && !t) return "";
  return groupFor(env, game, t, car, c);
}
// the group of what a POST keeps (its car and track, and the category the app sends)
const groupOfBody = (env, game, body, trackId, carId) => groupFor(env, game, trackId, carId, typeof body.cat === "string" ? body.cat.slice(0, 20) : "").catch(() => "");

// the rows kept before the groups (migration 0087) get theirs from the season and their session's category; a few hundred a run
export async function fillCats(env) {
  for (const tb of ["coach_tips", "coach_plan_votes"]) {
    const r = await env.DB.prepare(
      `SELECT DISTINCT t.game, t.track_id AS trackId, t.car_id AS carId, t.session_id AS sid, s.cat AS hint, s.track, s.car FROM ${tb} t LEFT JOIN sessions s ON s.id=t.session_id WHERE t.cat IS NULL LIMIT 300`).all().catch(() => ({ results: [] }));
    const up = [];
    for (const x of r.results || []) up.push(env.DB.prepare(`UPDATE ${tb} SET cat=?1 WHERE session_id=?2 AND track_id=?3 AND car_id=?4 AND cat IS NULL`).bind((await groupFor(env, x.game || "iracing", x.trackId, x.carId, x.hint, x.track, x.car)) || "road", x.sid, x.trackId, x.carId));
    for (let i = 0; i < up.length; i += 50) await env.DB.batch(up.slice(i, i + 50));
  }
}

// the tips an admin turned off (a kind on corners of one speed): the apps say the phase's plain tip instead
async function offList(env) {
  const r = await env.DB.prepare("SELECT kind, cls FROM coach_off").all().catch(() => ({ results: [] }));
  return (r.results || []).map((x) => x.kind + "|" + x.cls);
}
async function confidenceOn(env) {
  const r = await env.DB.prepare("SELECT v FROM app_state WHERE k='coach_confidence'").first().catch(() => null);
  return !!(r && r.v === "1");
}

export async function coachTipRoutes(req, env, p, m, body, game) {
  if (!p.startsWith("/coach/") && !p.startsWith("/admin/coach")) return null;
  const acc = await sessionAccount(req, env);
  if (!acc) return err("sign in with your Pitlane HQ account", 401);

  // the tips of one lap, with the corner times of the session's best lap; then the tips of this driver's earlier
  // sessions here get their outcome from this one
  if (p === "/coach/tips" && m === "POST") {
    const trackId = int(body.trackId), carId = int(body.carId) && (await famId(env, game, body.carId)), sid = str(body.sid, 120), started = int(body.started);
    const ref = REF[body.ref] ? body.ref : "own";
    if (!trackId || !carId || !sid || !started || !Array.isArray(body.corners)) return err("trackId, carId, sid, started and corners", 400);
    const now = Date.now(), rows = [], flags = flagsOf(body.flags);
    for (const c of body.corners.slice(0, 40)) {
      const n = int(c.n), apex = num(c.apex);
      if (!n || apex == null) continue;
      const kind = KIND.test(c.kind || "") ? c.kind : "";
      rows.push({ n, d: num(c.d), apex, kind, cls: CLS[c.cls] ? c.cls : "", lost: num(c.lost), ta: num(c.ta), tb: num(c.tb), tbest: num(c.tbest), dd: num(c.dd) });
    }
    if (!rows.length) return json({ ok: true, kept: 0, scored: 0 });
    const cat = (await groupOfBody(env, game, body, trackId, carId)) || null;
    const ins = env.DB.prepare(
      `INSERT INTO coach_tips (account, game, track_id, car_id, session_id, started, n, d, apex, kind, cls, ref, lost, ta, tb, tbest, created, dd, flags, cat)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20)
       ON CONFLICT(account, session_id, n) DO UPDATE SET d=excluded.d, apex=excluded.apex, kind=excluded.kind, cls=excluded.cls, ref=excluded.ref,
         lost=excluded.lost, ta=excluded.ta, tb=excluded.tb, tbest=COALESCE(excluded.tbest, coach_tips.tbest), created=excluded.created, dd=excluded.dd, flags=excluded.flags, cat=COALESCE(excluded.cat, coach_tips.cat)`);
    await env.DB.batch(rows.map((c) => ins.bind(acc.id, game, trackId, carId, sid, started, c.n, c.d, c.apex, c.kind, c.cls, ref, c.lost, c.ta, c.tb, c.tbest, now, c.dd, flags, cat)));
    // the earlier sessions of this driver here whose tips have no outcome yet: the same corner (by its slowest point) in
    // this session's best lap says what came of them
    const old = await env.DB.prepare(
      `SELECT id, apex, tbest FROM coach_tips WHERE account=?1 AND game=?2 AND track_id=?3 AND car_id=?4 AND started<?5 AND session_id<>?6
         AND outcome IS NULL AND kind<>'' AND tbest IS NOT NULL ORDER BY started DESC LIMIT 200`).bind(acc.id, game, trackId, carId, started, sid).all();
    const upd = [];
    for (const o of old.results || []) {
      let best = null;
      for (const c of rows) if (c.tbest != null && Math.abs(c.apex - o.apex) <= SAME_CORNER_M && (!best || Math.abs(c.apex - o.apex) < Math.abs(best.apex - o.apex))) best = c;
      if (best) upd.push(env.DB.prepare("UPDATE coach_tips SET outcome=?2, outcome_at=?3, ddn=?4 WHERE id=?1").bind(o.id, r3(o.tbest - best.tbest), now, best.dd));
    }
    // and the other way round: when the driver opens an older session after a newer one here, the newer one's best lap
    // (the nearest later session the coach saw) answers these tips now
    const later = await env.DB.prepare(
      `SELECT session_id FROM coach_tips WHERE account=?1 AND game=?2 AND track_id=?3 AND car_id=?4 AND started>?5 AND tbest IS NOT NULL ORDER BY started LIMIT 1`).bind(acc.id, game, trackId, carId, started).first();
    if (later) {
      const nx = await env.DB.prepare("SELECT apex, tbest, dd FROM coach_tips WHERE account=?1 AND session_id=?2 AND tbest IS NOT NULL").bind(acc.id, later.session_id).all();
      for (const c of rows) {
        if (!c.kind || c.tbest == null) continue;
        let best = null;
        for (const o of nx.results || []) if (Math.abs(c.apex - o.apex) <= SAME_CORNER_M && (!best || Math.abs(o.apex - c.apex) < Math.abs(best.apex - c.apex))) best = o;
        if (best) upd.push(env.DB.prepare("UPDATE coach_tips SET outcome=?3, outcome_at=?4, ddn=?6 WHERE account=?1 AND session_id=?2 AND n=?5 AND outcome IS NULL").bind(acc.id, sid, r3(c.tbest - best.tbest), now, c.n, best.dd));
      }
    }
    if (upd.length) await env.DB.batch(upd);
    return json({ ok: true, kept: rows.length, scored: upd.length });
  }

  // a thumb on one tip (1 up, -1 down, 0 takes it back)
  if (p === "/coach/rate" && m === "POST") {
    const trackId = int(body.trackId), carId = int(body.carId) && (await famId(env, game, body.carId)), sid = str(body.sid, 120), started = int(body.started), n = int(body.n), apex = num(body.apex);
    if (!trackId || !carId || !sid || !started || !n || apex == null) return err("trackId, carId, sid, started, n and apex", 400);
    const up = body.up === 1 ? 1 : body.up === -1 ? -1 : 0, kind = KIND.test(body.kind || "") ? body.kind : "", cls = CLS[body.cls] ? body.cls : "";
    const cat = (await groupOfBody(env, game, body, trackId, carId)) || null;
    await env.DB.prepare(
      `INSERT INTO coach_tips (account, game, track_id, car_id, session_id, started, n, apex, kind, cls, rating, created, cat) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
       ON CONFLICT(account, session_id, n) DO UPDATE SET rating=excluded.rating, kind=CASE WHEN coach_tips.kind='' THEN excluded.kind ELSE coach_tips.kind END, cls=CASE WHEN coach_tips.cls='' THEN excluded.cls ELSE coach_tips.cls END, cat=COALESCE(coach_tips.cat, excluded.cat)`
    ).bind(acc.id, game, trackId, carId, sid, started, n, apex, kind, cls, up, Date.now(), cat).run();
    return json({ ok: true });
  }

  // a thumb on one step of the coach's plan, or on the whole plan (1 up, -1 down, 0 takes it back)
  if (p === "/coach/planrate" && m === "POST") {
    const trackId = int(body.trackId), carId = int(body.carId) && (await famId(env, game, body.carId)), sid = str(body.sid, 120), started = int(body.started);
    const step = typeof body.step === "string" && STEP.test(body.step) ? body.step : "";
    if (!trackId || !carId || !sid || !started || !step) return err("trackId, carId, sid, started and step", 400);
    const up = body.up === 1 ? 1 : body.up === -1 ? -1 : 0, id = step === "plan" ? "plan" : step.split("@")[0], k = KIND.test(body.k || "") ? body.k : id.split(":")[0];
    const kind = KIND.test(body.kind || "") ? body.kind : "", turns = Array.isArray(body.turns) ? body.turns.filter((n) => int(n) && n < 1000).slice(0, 12).join(",") : "";
    if (!up) await env.DB.prepare("DELETE FROM coach_plan_votes WHERE account=?1 AND session_id=?2 AND step=?3").bind(acc.id, sid, step).run();
    else await env.DB.prepare(
      `INSERT INTO coach_plan_votes (account, game, track_id, car_id, session_id, started, step, sid, k, kind, turns, up, created, cat) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)
       ON CONFLICT(account, session_id, step) DO UPDATE SET up=excluded.up, created=excluded.created, cat=COALESCE(coach_plan_votes.cat, excluded.cat)`
    ).bind(acc.id, game, trackId, carId, sid, started, step, id, k, kind, turns, up, Date.now(), (await groupOfBody(env, game, body, trackId, carId)) || null).run();
    return json({ ok: true });
  }

  // what the apps read to order the plan: the weight of every bucket (1 until it has MIN_CASES cases), the metres a braking
  // tip should ask for, the tips an admin turned off, and whether a tip may say how many drivers it helped
  // With ?cat=&trackId=&carId= (the coach's car and track and its session's category) the weights of that group where it
  // has learnt enough, else everyone's (cat on the answer: the group, "" for everyone's)
  if (p === "/coach/weights" && m === "GET") {
    const grp = await groupQ(env, game, new URL(req.url));
    const { buckets: b } = await buckets(env, null, grp);
    return json({ min: MIN_CASES, cat: grp, buckets: b.filter((x) => x.w !== 1 || x.ask || x.n >= MIN_CASES), off: await offList(env), confidence: await confidenceOn(env), plan: await planWeightsFor(env, grp) }, 200, { "cache-control": "private, max-age=3600" });
  }
  // what the coach said in the driver's last session on this car and track before the one they look at now (before: its
  // start): every corner with a tip, what that lap lost there and the time that session's best lap spent in it. The apps
  // show how the lap they look at does where that plan asked for something (followUp in pitwall-analysis.js)
  if (p === "/coach/last" && m === "GET") {
    const u = new URL(req.url), trackId = +u.searchParams.get("trackId") || 0, carId = (+u.searchParams.get("carId") || 0) && (await famId(env, game, +u.searchParams.get("carId"))), before = +u.searchParams.get("before") || Date.now();
    if (!trackId || !carId) return err("trackId and carId", 400);
    const last = await env.DB.prepare(
      `SELECT session_id, started FROM coach_tips WHERE account=?1 AND game=?2 AND track_id=?3 AND car_id=?4 AND started<?5 AND kind<>'' AND tbest IS NOT NULL ORDER BY started DESC LIMIT 1`).bind(acc.id, game, trackId, carId, before).first();
    if (!last) return json({ tips: [] }, 200, { "cache-control": "private, max-age=300" });
    const t = await env.DB.prepare("SELECT n, apex, kind, lost, tbest FROM coach_tips WHERE account=?1 AND session_id=?2 AND kind<>'' AND lost>0.05 AND tbest IS NOT NULL ORDER BY lost DESC LIMIT 12").bind(acc.id, last.session_id).all();
    return json({ started: last.started, tips: (t.results || []).map((x) => ({ n: x.n, apex: x.apex, kind: x.kind, lost: r3(x.lost), tbest: r3(x.tbest) })) }, 200, { "cache-control": "private, max-age=300" });
  }
  // the driver's own memory: the kinds that repeat across their tracks (habits), and their own buckets' weights
  // With ?cat=&trackId=&carId= the habits, weights and corner types of that group first: a habit of the ovals on an oval;
  // with none there yet, the habits of every track that are about the pedals and the speed (they carry to any track), and
  // everything else of every track
  if (p === "/coach/me" && m === "GET") {
    const grp = await groupQ(env, game, new URL(req.url));
    const habitsOf = async (g) => {
      const h = await env.DB.prepare(
        `SELECT kind, COUNT(DISTINCT track_id||':'||car_id) AS tracks, COUNT(DISTINCT session_id) AS sessions, COUNT(*) AS n, SUM(outcome>?2) AS win, SUM(outcome<-?2) AS loss
           FROM coach_tips WHERE account=?1 AND kind<>''${g ? " AND cat=?3" : ""} GROUP BY kind ORDER BY tracks DESC, n DESC LIMIT 12`).bind(...(g ? [acc.id, GAIN_S, g] : [acc.id, GAIN_S])).all();
      return (h.results || []).filter((x) => x.tracks >= HABIT_TRACKS).map((x) => ({ kind: x.kind, tracks: x.tracks, sessions: x.sessions, n: x.n, win: x.win || 0, loss: x.loss || 0 }));
    };
    let habits = grp ? await habitsOf(grp) : [];
    if (grp && habits.length) habits = habits.map((x) => ({ ...x, cat: grp }));
    else habits = (await habitsOf("")).filter((x) => !grp || TRANSFER.test(x.kind));
    const { buckets: mine } = await buckets(env, acc.id, grp, MIN_PERSONAL);
    const w = {};
    for (const x of mine) if (x.n >= MIN_PERSONAL && x.w !== 1) w[x.kind + "|" + x.cls] = x.w;
    // the corner types across their tracks: what they lose on average in slow, medium and fast corners against the
    // next level or the record (the strengths and weaknesses the apps show); the group's when it has them
    const clsOf = async (g) => {
      const bc = await env.DB.prepare(
        `SELECT cls, COUNT(*) AS n, AVG(CASE WHEN lost>0 THEN lost ELSE 0 END) AS avg FROM coach_tips WHERE account=?1 AND cls<>'' AND lost IS NOT NULL AND ref IN ('level','record')${g ? " AND cat=?2" : ""} GROUP BY cls`).bind(...(g ? [acc.id, g] : [acc.id])).all().catch(() => ({ results: [] }));
      return (bc.results || []).filter((x) => x.n >= 5).map((x) => ({ cls: x.cls, n: x.n, avg: r3(x.avg || 0) }));
    };
    let byCls = grp ? await clsOf(grp) : [];
    if (!byCls.length) byCls = await clsOf("");
    return json({ habits, w, minTracks: HABIT_TRACKS, byCls, cat: grp }, 200, { "cache-control": "private, max-age=600" });
  }

  // the admin panel: a tip's kind on corners of one speed turned off (or back on), and whether the tips say how many drivers they helped
  if (p === "/admin/coach/off" && m === "POST") {
    if (!isAdmin(env, acc.id)) return err("only the admins of this server can do this", 403);
    const kind = KIND.test(body.kind || "") ? body.kind : "", cls = CLS[body.cls] ? body.cls : "";
    if (!kind || !cls) return err("kind and cls", 400);
    if (body.off) await env.DB.prepare("INSERT INTO coach_off (kind, cls, created) VALUES (?1,?2,?3) ON CONFLICT DO NOTHING").bind(kind, cls, Date.now()).run();
    else await env.DB.prepare("DELETE FROM coach_off WHERE kind=?1 AND cls=?2").bind(kind, cls).run();
    return json({ ok: true, off: await offList(env) });
  }
  if (p === "/admin/coach/confidence" && m === "POST") {
    if (!isAdmin(env, acc.id)) return err("only the admins of this server can do this", 403);
    await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('coach_confidence', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(body.on ? "1" : "0", Date.now()).run();
    return json({ ok: true, confidence: !!body.on });
  }
  // the admin panel: how often each tip and step of the plan fires on real laps (coachcalib.js)
  if (p === "/admin/coach/calibrate" && m === "GET") {
    if (!isAdmin(env, acc.id)) return err("only the admins of this server can do this", 403);
    return json(await calibrateRun(env));
  }
  // the admin panel: every bucket with its cases, how many gained, the average gain and the thumbs
  if (p === "/admin/coach" && m === "GET") {
    if (!isAdmin(env, acc.id)) return err("only the admins of this server can do this", 403);
    const { buckets: b, ratings } = await buckets(env);
    const tot = await env.DB.prepare(
      `SELECT COUNT(*) AS tips, SUM(kind<>'') AS withTip, SUM(outcome IS NOT NULL) AS scored, SUM(rating<>0) AS rated, COUNT(DISTINCT account) AS drivers,
         COUNT(DISTINCT track_id||':'||car_id) AS combos, SUM(created>?1) AS week FROM coach_tips`).bind(Date.now() - 7 * 86400e3).first();
    const kinds = await env.DB.prepare("SELECT kind, COUNT(*) AS n, SUM(outcome IS NOT NULL) AS scored FROM coach_tips WHERE kind<>'' GROUP BY kind ORDER BY n DESC").all();
    const pv = await planVotes(env);
    return json({ min: MIN_CASES, gain: GAIN_S, totals: tot || {}, buckets: b, ratings, kinds: kinds.results || [], off: await offList(env), confidence: await confidenceOn(env), plan: pv, planMin: MIN_PLAN_VOTES });
  }
  return null;
}
