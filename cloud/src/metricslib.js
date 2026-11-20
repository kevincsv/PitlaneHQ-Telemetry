// The pure part of metrics.js (the admin Analytics' weekly numbers, migration 0105), so cloud/test/metrics.test.mjs
// runs it without the server. The words mean one thing everywhere (docs/spec/admin.md, "The weekly numbers"):
//   week      Monday to Sunday, UTC
//   used it   opened a screen of an app that day (a usage row that is not the agent's own)
//   drove     uploaded a session that day; raced: one of them was a race
//   active    drove: what matters is that the app is used to drive, not that it was opened (the owner's choice,
//             2026-11-15). "users" is the accounts that drove; "opened" (used it or drove) stays as a second number;
//             the agent running in the background, "run:agent", is counted apart
//   new       an account created in the week; the drivers leave the admins out
//   kept      a new account that drove on any of days 7 to 13 after the day it was created (c:kept_open: opened or drove)
//   activated a new account that uploaded a session within 2 days (its day and the next)
import { USAGE_GAMES } from "./usagelib.js";
import { kindOf } from "./sourceslib.js";

export const DAY = 86400e3, MAX_WK = 12, JOB_WEEKS = 15;
const d2n = (d) => Math.round(Date.parse(d + "T00:00:00Z") / DAY), n2d = (n) => new Date(n * DAY).toISOString().slice(0, 10);
export const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
/** The Monday of a day's week. */
export const weekOf = (d) => { const n = d2n(d); return n2d(n - ((new Date(n * DAY).getUTCDay() + 6) % 7)); };
export const addDays = (d, k) => n2d(d2n(d) + k);
/** Every week from one Monday to another, both included. */
export const weeksBetween = (a, b) => { const out = []; for (let w = weekOf(a); w <= weekOf(b); w = addDays(w, 7)) out.push(w); return out; };

// the families the agent sends by itself: they do not mean the driver opened a screen
const AGENT_FAM = /^(ov|ovrace|run|set):/;
const LAPS = new Set(["view:laps", "view:telemetry", "view:cloudlaps", "view:session", "act:race_summary", "act:compare"]);
const COACH = new Set(["act:coach_report", "view:coach", "act:open_in_coach", "act:coach_plan", "act:plan_to_overlay"]);
const COMMUNITY = new Set(["view:community", "act:leaderboard", "act:track_page", "view:leagues", "act:profile"]);
const OVERLAY = (k) => k.startsWith("ov:") || k.startsWith("ovrace:") || k === "act:overlay_open";
// what a new account can do, in the order of the funnel; and what it did in its first two days, against staying
export const STEPS = ["opened", "drove", "laps", "raced", "coach", "overlay", "community", "second"];
export const BEHAVIOURS = ["drove", "raced", "community", "overlay", "coach", "laps", "second", "iracing", "lmu", "autostart"];
// the counters kept week by week for Sales: who pressed what
const SALES_KEY = /^(act:(pro_|donate_|invite_|trial_|checkout_|pricing_|share_card|recap_)|pro_use:)/;
export const TARGETS = { d1: "2026-12-20", d2: "2027-01-31", t: { users: [120, 300], new: [60, 120], kept: [30, 40], up7: [80, 85], raced_share: [null, 50], visits_day: [80, 150], supporters: [6, 15] } };

/** Every weekly number and every cohort row from the raw rows (pure).
 *  accounts [{id, created, src, staff}] (every account), usage [{account_id, day, device, key, n}], sessions [{day,
 *  game, uploader 'acct:<id>', n, races, first}] (grouped by day, game and uploader), visits [{day, src, n}], pc
 *  [{day, kind, n}], orders [{at, amount, currency}] (paid donations), referrals [{created, state, done}], events
 *  [{at, name}], anon [{day, uploader, n}] (the sessions of PCs with no account), from: the first day to count,
 *  today, supporters: how many accounts have the badge now. */
export function buildMetrics({ accounts = [], usage = [], sessions = [], visits = [], pc = [], orders = [], referrals = [], events = [], anon = [], from, today, supporters = null }) {
  const M = new Map(), C = new Map();
  const put = (week, aud, metric, split, v) => { const k = week + "|" + aud + "|" + metric + "|" + split; M.set(k, { week, aud, metric, split, value: (M.get(k) || { value: 0 }).value + v }); };
  const set = (week, aud, metric, split, v) => M.set(week + "|" + aud + "|" + metric + "|" + split, { week, aud, metric, split, value: v });
  const first = weekOf(from), thisWeek = weekOf(today), tn = d2n(today);
  const acc = new Map(accounts.map((a) => [a.id, a]));
  // each account's days: what it used and what it drove
  const days = new Map();
  const dayRow = (id, d) => { let m = days.get(id); if (!m) days.set(id, (m = new Map())); let x = m.get(d); if (!x) m.set(d, (x = { used: false, agent: false, drove: false, raced: false, keys: new Set(), devs: new Set(), games: new Set(), firstSes: 0 })); return x; };
  const sales = new Map(); // week|key -> {users, n}
  for (const r of usage) {
    if (r.day < first || r.day > today) continue;
    const x = dayRow(r.account_id, r.day), k = String(r.key);
    x.keys.add(k);
    if (AGENT_FAM.test(k)) { if (k === "run:agent") x.agent = true; }
    else { x.used = true; x.devs.add(r.device); }
    if (SALES_KEY.test(k)) { const sk = weekOf(r.day) + "|" + k; let s = sales.get(sk); if (!s) sales.set(sk, (s = { users: new Set(), n: 0 })); s.users.add(r.account_id); s.n += r.n || 0; }
  }
  const sums = new Map(); // week -> {sessions, races}
  for (const s of sessions) {
    const id = String(s.uploader || "").slice(5);
    if (!id || s.day < first || s.day > today) continue;
    const x = dayRow(id, s.day);
    x.drove = true; if (s.races) x.raced = true; x.games.add(s.game);
    if (s.first && (!x.firstSes || s.first < x.firstSes)) x.firstSes = s.first;
    const w = weekOf(s.day); let t = sums.get(w); if (!t) sums.set(w, (t = { sessions: 0, races: 0 })); t.sessions += s.n || 0; t.races += s.races || 0;
  }
  const auds = (id) => { const a = acc.get(id); return a && a.staff ? [1] : [0, 1]; };
  // the calendar weeks: who was there
  const W = new Map(); // week|aud|metric|split -> Set
  const mark = (week, aud, metric, split, id) => { const k = week + "|" + aud + "|" + metric + "|" + split; let s = W.get(k); if (!s) W.set(k, (s = new Set())); s.add(id); };
  for (const [id, m] of days) for (const [d, x] of m) {
    const w = weekOf(d);
    for (const aud of auds(id)) {
      if (x.drove) mark(w, aud, "users", "", id);
      if (x.used || x.drove) mark(w, aud, "opened", "", id);
      if (x.used || x.drove || x.agent) mark(w, aud, "users_bg", "", id);
      if (x.agent) mark(w, aud, "agent", "", id);
      if (x.used) { mark(w, aud, "used", "", id); for (const dv of x.devs) mark(w, aud, "used", "dev:" + dv, id); }
      if (x.drove) { mark(w, aud, "drove", "", id); for (const g of x.games) mark(w, aud, "drove", "game:" + g, id); }
      if (x.raced) mark(w, aud, "raced", "", id);
    }
  }
  for (const [k, s] of W) { const [week, aud, metric, split] = k.split("|"); set(week, +aud, metric, split, s.size); }
  for (const [w, t] of sums) for (const aud of [0, 1]) { set(w, aud, "sessions", "", t.sessions); set(w, aud, "races", "", t.races); }
  // what does not depend on who: the visits, the installer, the donations, the invites, the server's events, the PCs with no account
  const both = (w, metric, split, v) => { put(w, 0, metric, split, v); put(w, 1, metric, split, v); };
  const inRange = (d) => d >= first && d <= today;
  for (const v of visits) if (inRange(v.day)) { both(weekOf(v.day), "visits", "", v.n || 0); both(weekOf(v.day), "visits", "src:" + v.src, v.n || 0); }
  for (const p of pc) if (inRange(p.day) && (p.kind === "download" || p.kind === "uninstall")) both(weekOf(p.day), p.kind === "download" ? "downloads" : "uninstalls", "", p.n || 0);
  for (const o of orders) { const d = dayOf(o.at); if (inRange(d)) { both(weekOf(d), "donations", "", 1); both(weekOf(d), "donated", "cur:" + String(o.currency || "usd").toLowerCase(), o.amount || 0); } }
  for (const r of referrals) { const d = dayOf(r.created); if (inRange(d)) both(weekOf(d), "invited", "", 1); if (r.state === "given" && r.done) { const g = dayOf(r.done); if (inRange(g)) both(weekOf(g), "invite_given", "", 1); } }
  for (const e of events) { const d = dayOf(e.at); if (inRange(d)) both(weekOf(d), "e:" + e.name, "", 1); }
  const anonW = new Map();
  for (const a of anon) if (inRange(a.day)) { const w = weekOf(a.day); let x = anonW.get(w); if (!x) anonW.set(w, (x = { pcs: new Set(), n: 0 })); x.pcs.add(a.uploader); x.n += a.n || 0; }
  for (const [w, x] of anonW) for (const aud of [0, 1]) { set(w, aud, "anon_pcs", "", x.pcs.size); set(w, aud, "anon_sessions", "", x.n); }
  for (const [k, s] of sales) { const [w, key] = [k.slice(0, 10), k.slice(11)]; for (const aud of [0, 1]) { set(w, aud, "k:" + key, "", s.users.size); set(w, aud, "kn:" + key, "", s.n); } }
  if (supporters != null) for (const aud of [0, 1]) set(thisWeek, aud, "supporters", "", supporters);

  // the sign-up weeks: what each new account did, counted from its own day
  const coh = (week, aud, split, wk) => { const k = week + "|" + aud + "|" + split + "|" + wk; let x = C.get(k); if (!x) C.set(k, (x = { week, aud, split, wk, size: 0, ripe: 0, active: 0, drove: 0, raced: 0 })); return x; };
  const med = new Map();
  for (const a of accounts) {
    const cd = dayOf(a.created);
    if (cd < first || cd > today) continue;
    const w = weekOf(cd), c0 = d2n(cd), m = days.get(a.id) || new Map();
    // the first day (0 is the day it was created) of each step, and what each of its weeks had
    const at = {}, wks = [], devs = new Set(), games = new Set();
    let firstSes = 0, firstGame = "";
    const step = (k, n) => { if (at[k] == null || n < at[k]) at[k] = n; };
    for (const d of [...m.keys()].sort()) {
      const x = m.get(d), n = d2n(d) - c0;
      if (n < 0) continue;
      const wk = Math.floor(n / 7);
      if (wk <= MAX_WK) { const y = wks[wk] || (wks[wk] = { active: false, drove: false, raced: false }); if (x.used || x.drove) y.active = true; if (x.drove) y.drove = true; if (x.raced) y.raced = true; }
      if (x.used) step("opened", n);
      if (x.drove) { step("drove", n); if (!firstGame) firstGame = [...x.games].sort((p, q) => USAGE_GAMES.indexOf(p) - USAGE_GAMES.indexOf(q))[0] || ""; for (const g of x.games) if (n <= 1) games.add(g); if (x.firstSes && (!firstSes || x.firstSes < firstSes)) firstSes = x.firstSes; }
      if (x.raced) step("raced", n);
      for (const k of x.keys) { if (LAPS.has(k)) step("laps", n); if (COACH.has(k)) step("coach", n); if (COMMUNITY.has(k)) step("community", n); if (OVERLAY(k)) step("overlay", n); if (k === "set:autostart.on" && n <= 1) at.autostart = 0; }
      for (const dv of x.devs) { if (!devs.has(dv)) { devs.add(dv); if (devs.size === 2) step("second", n); } }
    }
    const age = tn - c0, mature = age > 13, kept = !!(wks[1] && wks[1].drove), keptOpen = !!(wks[1] && wks[1].active);
    const splits = ["", "src:" + (a.src || "unknown")]; if (firstGame) splits.push("game:" + firstGame);
    for (const aud of a.staff ? [1] : [0, 1]) {
      for (const sp of splits) {
        put(w, aud, "c:n", sp, 1);
        if (at.opened != null && at.opened <= 6) put(w, aud, "c:open7", sp, 1);
        if (at.drove != null && at.drove <= 1) put(w, aud, "c:up2", sp, 1);
        if (at.drove != null && at.drove <= 6) put(w, aud, "c:up7", sp, 1);
        if (mature) { put(w, aud, "c:mature", sp, 1); if (kept) put(w, aud, "c:kept", sp, 1); if (keptOpen) put(w, aud, "c:kept_open", sp, 1); }
        for (let wk = 0; wk <= MAX_WK; wk++) {
          if (c0 + wk * 7 > tn) break; // that week has not begun
          const x = coh(w, aud, sp, wk), y = wks[wk] || {};
          x.size++; if (age > wk * 7 + 6) x.ripe++;
          if (y.active) x.active++; if (y.drove) x.drove++; if (y.raced) x.raced++;
        }
      }
      for (const s of STEPS) for (const win of [1, 2, 7]) if (at[s] != null && at[s] < win) put(w, aud, "s:" + s + ":" + win, "", 1);
      if (mature) {
        const did = { drove: at.drove <= 1, raced: at.raced <= 1, community: at.community <= 1, overlay: at.overlay <= 1, coach: at.coach <= 1, laps: at.laps <= 1, second: at.second <= 1, iracing: games.has("iracing"), lmu: games.has("lmu"), autostart: at.autostart === 0 };
        for (const b of BEHAVIOURS) if (did[b]) { put(w, aud, "b:" + b + ":n", "", 1); if (kept) put(w, aud, "b:" + b + ":kept", "", 1); }
      }
      if (firstSes && firstSes >= a.created) { const k = w + "|" + aud; if (!med.has(k)) med.set(k, []); med.get(k).push((firstSes - a.created) / 3600e3); }
    }
    for (const aud of a.staff ? [1] : [0, 1]) { put(w, aud, "new", "", 1); put(w, aud, "new", "src:" + (a.src || "unknown"), 1); }
  }
  // the median time from the account to its first session, in hours
  for (const [k, list] of med) { const [w, aud] = k.split("|"); list.sort((x, y) => x - y); const h = list.length % 2 ? list[(list.length - 1) / 2] : (list[list.length / 2 - 1] + list[list.length / 2]) / 2; set(w, +aud, "c:med_h", "", Math.round(h * 10) / 10); }
  return { metrics: [...M.values()].filter((x) => x.week >= first), cohorts: [...C.values()] };
}

/** What to write: the rows that are new or changed against the ones the table has (so a quiet night writes nothing). */
export function changedRows(next, have, key, same) {
  const old = new Map(have.map((x) => [key(x), x]));
  return next.filter((x) => { const o = old.get(key(x)); return !o || !same(x, o); });
}
export const metricKey = (x) => x.week + "|" + x.aud + "|" + x.metric + "|" + x.split;
export const cohortKey = (x) => x.week + "|" + x.aud + "|" + x.split + "|" + x.wk;
export const sameMetric = (a, b) => Math.abs(a.value - b.value) < 1e-9;
export const sameCohort = (a, b) => a.size === b.size && a.ripe === b.ripe && a.active === b.active && a.drove === b.drove && a.raced === b.raced;

/** The page's answer from the saved rows (pure): the weeks oldest first, every number as one list per week, the seven
 *  Monday numbers with their targets, the cohorts, what goes with staying and the funnel of each source. */
export function metricsAnswer({ rows = [], cohorts = [], weeks = [], today, targets = TARGETS, links = [], job = null }) {
  const S = {}, idx = new Map(weeks.map((w, i) => [w, i]));
  for (const r of rows) { const i = idx.get(r.week); if (i == null) continue; const k = r.split ? r.metric + "|" + r.split : r.metric; (S[k] || (S[k] = weeks.map(() => 0)))[i] = r.value; }
  const g = (k) => S[k] || weeks.map(() => 0);
  const thisWeek = weekOf(today), dIn = weeks.map((w) => (w === thisWeek ? d2n(today) - d2n(w) + 1 : 7));
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
  const T = (targets && targets.t) || {};
  const monday = [
    { k: "users", v: g("users"), open: g("opened"), t: T.users },
    { k: "new", v: g("new"), t: T.new },
    // a sign-up week's share is only whole once every account of it has had its 14 days
    { k: "kept", unit: "%", v: weeks.map((_, i) => pct(g("c:kept")[i], g("c:mature")[i])), n: g("c:mature"), of: g("c:n"), open: weeks.map((_, i) => pct(g("c:kept_open")[i], g("c:mature")[i])), t: T.kept },
    { k: "up7", unit: "%", v: weeks.map((_, i) => pct(g("c:up7")[i], g("c:n")[i])), n: g("c:n"), t: T.up7 },
    { k: "raced", v: g("raced"), share: weeks.map((_, i) => pct(g("raced")[i], g("drove")[i])), n: g("drove"), t: T.raced_share, tk: "share" },
    { k: "visits_day", v: weeks.map((_, i) => Math.round((g("visits")[i] / dIn[i]) * 10) / 10), t: T.visits_day },
    { k: "supporters", v: g("supporters"), t: T.supporters },
  ];
  // what goes with staying, over every week shown: of those who did it in their first two days, how many stayed
  const sum = (k) => g(k).reduce((a, b) => a + b, 0);
  const all = sum("c:mature"), allKept = sum("c:kept");
  const stay = BEHAVIOURS.map((b) => { const n = sum("b:" + b + ":n"), kept = sum("b:" + b + ":kept"); return { k: b, n, kept, rate: pct(kept, n), restN: all - n, restKept: allKept - kept, restRate: pct(allKept - kept, all - n) }; });
  // each source, over every week shown: visits, accounts, drove within two days, stayed
  const srcs = new Map();
  const src = (s) => { let x = srcs.get(s); if (!x) srcs.set(s, (x = { src: s, visits: 0, accounts: 0, up2: 0, mature: 0, kept: 0 })); return x; };
  for (const k of Object.keys(S)) {
    const m = /^(visits|c:n|c:up2|c:mature|c:kept)\|src:(.+)$/.exec(k);
    if (!m) continue;
    const x = src(m[2]), n = sum(k);
    if (m[1] === "visits") x.visits = n; else if (m[1] === "c:n") x.accounts = n; else if (m[1] === "c:up2") x.up2 = n; else if (m[1] === "c:mature") x.mature = n; else x.kept = n;
  }
  const tags = new Map(links.map((l) => [l.tag, l]));
  for (const l of links) src(l.tag);
  const sources = [...srcs.values()].map((x) => ({ ...x, kind: kindOf(x.src), link: tags.has(x.src) ? { name: tags.get(x.src).name, place: tags.get(x.src).place } : undefined }))
    .sort((a, b) => b.kept - a.kept || b.up2 - a.up2 || b.accounts - a.accounts || b.visits - a.visits || (a.src < b.src ? -1 : 1));
  const steps = { n: g("c:n"), med: g("c:med_h"), rows: STEPS.map((s) => ({ k: s, w1: g("s:" + s + ":1"), w2: g("s:" + s + ":2"), w7: g("s:" + s + ":7") })) };
  return { today, weeks, days: dIn, monday, targets, series: S, cohorts: cohorts.filter((c) => idx.has(c.week)), stay, stayAll: { n: all, kept: allKept, rate: pct(allKept, all) }, sources, steps, job };
}

/** A link's tag from what the admin typed: lower case, the letters, numbers and dashes a source may have. */
export const cleanTag = (s) => String(s == null ? "" : s).toLowerCase().trim().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

// the counter families every app is meant to send, and from which devices: the Data tab says when one goes quiet
export const FAMILIES = [
  { fam: "view", devices: ["pc", "web", "android", "ios"] }, { fam: "act", devices: ["pc", "web", "android", "ios"] },
  { fam: "game", devices: ["pc", "web"] }, { fam: "live", devices: ["pc", "web"] }, { fam: "ov", devices: ["pc"] },
  { fam: "ovrace", devices: ["pc"] }, { fam: "run", devices: ["pc"] }, { fam: "set", devices: ["pc"] }, { fam: "pro_use", devices: ["pc", "web"] },
];
export const QUIET_DAYS = 3;
/** Each family and device: the last day it sent something and the accounts of the last 7 days; quiet when it sent
 *  before and nothing came for QUIET_DAYS days, never when it never sent. rows [{fam, device, last, users7}]. */
export function healthOf(rows, today) {
  const m = new Map(rows.map((r) => [r.fam + "|" + r.device, r])), out = [];
  for (const f of FAMILIES) for (const device of f.devices) {
    const r = m.get(f.fam + "|" + device), last = r ? r.last : "";
    out.push({ fam: f.fam, device, last, users7: r ? r.users7 || 0 : 0, ago: last ? d2n(today) - d2n(last) : null, state: !last ? "never" : d2n(today) - d2n(last) >= QUIET_DAYS ? "quiet" : "ok" });
  }
  return out;
}

/** One account's steps with their days, for its detail on the admin page. usage [{day, device, key}] and sessions
 *  [{day, races}] of that account. */
export function timelineOf({ created, usage = [], sessions = [] }) {
  const at = {}, devs = new Set(), put = (k, d) => { if (!at[k] || d < at[k]) at[k] = d; };
  for (const r of [...usage].sort((a, b) => (a.day < b.day ? -1 : 1))) {
    const k = String(r.key);
    if (k === "run:agent") put("agent", r.day);
    if (AGENT_FAM.test(k)) { if (OVERLAY(k)) put("overlay", r.day); continue; }
    put("opened", r.day);
    if (LAPS.has(k)) put("laps", r.day); if (COACH.has(k)) put("coach", r.day); if (COMMUNITY.has(k)) put("community", r.day); if (OVERLAY(k)) put("overlay", r.day);
    if (!devs.has(r.device)) { devs.add(r.device); if (devs.size === 2) put("second", r.day); if (r.device === "android" || r.device === "ios") put("phone", r.day); }
  }
  for (const s of sessions) { put("drove", s.day); if (s.races) put("raced", s.day); }
  return [{ k: "account", day: dayOf(created) }, ...Object.entries(at).map(([k, day]) => ({ k, day }))].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}
