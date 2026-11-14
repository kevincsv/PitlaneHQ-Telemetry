// The pure part of usage.js (what a batch or an answer keeps, when to ask, the analytics from the rows), so
// cloud/test/usage.test.mjs runs it without the server.
export const DEVICES = ["web", "pc", "android", "ios"];
// live: the Telemetry panels shown (once a day each) and its mode, for the Layout window's "Most used by the community"
// (livepopular.js); kept out of the admin page's features
export const KEY_RE = /^(view|act|game|live):[a-z0-9_.-]{1,40}$/;
export const MAX_KEYS = 100, MAX_N = 1000, MAX_DAYS = 90;
export const FEEDBACK_MAX = 4000, FEEDBACK_PER_DAY = 20;
export const ASK_USED = 6 * 3600e3, ASK_RACES = 2, MAX_MS = 10 * 60e3;
// the overlay window: after the first race with overlays, and once answered every six
export const OV_FIRST = 1, OV_AGAIN = 6, OV_GAMES = ["iracing", "lmu"], OV_MAX = 30;
export const STYLE_RE = /^[a-z0-9_-]{1,20}$/, OV_RE = /^[a-z]{2,12}$/;
// the games a "game:" key may name: the game really driven, never the Settings choice ("auto") nor the demo
export const USAGE_GAMES = ["iracing", "lmu", "acc", "ac"];
const gameKeyOk = (k) => !k.startsWith("game:") || USAGE_GAMES.includes(k.slice(5));

export const day = (t) => new Date(t).toISOString().slice(0, 10);
const cleanV = (v) => String(v == null ? "" : v).replace(/[^0-9a-zA-Z.+-]/g, "").slice(0, 24);

/** A usage batch as the server keeps it, or {error}. Unknown keys are dropped, never an error. */
export function cleanUsage(b) {
  if (!b || typeof b !== "object") return { error: "missing body" };
  const device = String(b.device || "").toLowerCase();
  if (!DEVICES.includes(device)) return { error: "unknown device" };
  const counts = [];
  if (b.counts && typeof b.counts === "object" && !Array.isArray(b.counts)) {
    for (const [k0, n0] of Object.entries(b.counts)) {
      if (counts.length >= MAX_KEYS) break;
      const k = String(k0).toLowerCase(), n = Math.floor(Number(n0));
      if (!KEY_RE.test(k) || !gameKeyOk(k) || !(n > 0)) continue;
      counts.push([k, Math.min(n, MAX_N)]);
    }
  }
  const ms = Math.max(0, Math.min(MAX_MS, Math.floor(Number(b.ms) || 0)));
  return { device, v: cleanV(b.v), counts, ms };
}

/** A feedback answer as the server keeps it, or {error}. */
export function cleanFeedback(b) {
  if (!b || typeof b !== "object") return { error: "missing body" };
  const text = String(b.text == null ? "" : b.text).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  if (!text) return { error: "write something first" };
  if (text.length > FEEDBACK_MAX) return { error: "too long (" + FEEDBACK_MAX + " characters at most)" };
  let rating = null;
  if (b.rating != null && b.rating !== "" && b.rating !== 0) {
    const r = Number(b.rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return { error: "the rating goes from 1 to 5" };
    rating = r;
  }
  const kind = b.kind === "overlays" ? "overlays" : "general";
  let style = null;
  if (kind === "overlays") {
    style = cleanStyle(b.style);
    if (!style) return { error: "unknown overlay design" };
  }
  const device = String(b.device || "").toLowerCase();
  return { text, rating, kind, style, device: DEVICES.includes(device) ? device : "", v: cleanV(b.v), view: String(b.view || "").replace(/[^a-z0-9_.:-]/gi, "").slice(0, 40) };
}

/** The overlay design: a free name (new designs come beside the classic one), "classic" when none is given; null when
 *  it is not a valid name. */
export function cleanStyle(v) {
  if (v == null || v === "") return "classic";
  const s = String(v).toLowerCase();
  return STYLE_RE.test(s) ? s : null;
}

/** A race driven with overlays, as the PC tells it (POST /community/feedback/ovrace), or {error}. */
export function cleanOvRace(b) {
  if (!b || typeof b !== "object") return { error: "missing body" };
  const style = cleanStyle(b.style);
  if (!style) return { error: "unknown overlay design" };
  const game = String(b.game || "").toLowerCase();
  if (!OV_GAMES.includes(game)) return { error: "unknown game" };
  const ovs = [...new Set((Array.isArray(b.ovs) ? b.ovs : []).map((x) => String(x).toLowerCase()).filter((x) => OV_RE.test(x)))].slice(0, OV_MAX);
  if (!ovs.length) return { error: "no overlay was open" };
  const sid = String(b.sid == null ? "" : b.sid).replace(/[^A-Za-z0-9._:-]/g, "").slice(0, 80);
  return { style, game, ovs, sid };
}

/** Whether to show the overlay window: after the first race with overlays, and once answered after six more. */
export const shouldAskOv = (answered, races) => (answered ? races >= OV_AGAIN : races >= OV_FIRST);

/** Whether to ask now: six hours of use, or two races, since the window was last shown. */
export const shouldAsk = (used, races) => used >= ASK_USED || races >= ASK_RACES;

/** The analytics answer from the grouped rows (pure, so the test can run it). */
export function analyticsOf(days, perDay, rows, presence, accounts) {
  const byDev = new Map(), byKey = new Map(), byGame = new Map(), byUser = new Map();
  const add = (m, k, acc, n) => { let x = m.get(k); if (!x) m.set(k, (x = { n: 0, users: new Set() })); x.n += n; x.users.add(acc); };
  for (const r of rows) {
    if (!gameKeyOk(r.key)) continue; // "game:auto" rows of the PCs before 0.7.3 counted the Settings choice
    add(byDev, r.device, r.account_id, r.n);
    if (r.key.startsWith("game:")) add(byGame, r.key.slice(5), r.account_id, r.n);
    else add(byKey, r.key, r.account_id, r.n);
    let u = byUser.get(r.account_id);
    if (!u) byUser.set(r.account_id, (u = { n: 0, devices: new Set(), keys: new Map(), last: "" }));
    u.n += r.n;
    u.devices.add(r.device);
    u.keys.set(r.key, (u.keys.get(r.key) || 0) + r.n);
    if (r.last > u.last) u.last = r.last;
  }
  const seen = new Map(), versions = new Map();
  for (const p of presence) {
    if (!seen.has(p.account_id) || p.last_seen > seen.get(p.account_id)) seen.set(p.account_id, p.last_seen);
    if (p.app_version) { const k = p.kind + "|" + p.app_version; versions.set(k, (versions.get(k) || 0) + 1); }
  }
  const list = (m, name) => [...m].map(([k, x]) => ({ [name]: k, users: x.users.size, n: x.n })).sort((a, b) => b.n - a.n);
  return {
    days,
    active: perDay.map((x) => ({ day: x.day, users: x.users })),
    byDevice: list(byDev, "device"),
    top: list(byKey, "key").slice(0, 60),
    games: list(byGame, "game"),
    versions: [...versions].map(([k, n]) => ({ device: k.split("|")[0], v: k.split("|")[1], devices: n })).sort((a, b) => b.devices - a.devices),
    users: [...byUser].map(([id, u]) => ({
      id, nick: (accounts.get(id) || {}).display || "", lastSeen: seen.get(id) || (u.last ? Date.parse(u.last + "T12:00:00Z") : 0), lastDay: u.last,
      devices: [...u.devices], n: u.n, top: [...u.keys].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n).slice(0, 6),
    })).sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 300),
  };
}


// the keys that mean a driver looked at their laps, and that they used the coach (the funnel of the Analytics)
const LAPS_KEYS = new Set(["view:laps", "view:telemetry", "view:cloudlaps", "view:session", "act:race_summary", "act:compare"]);
const COACH_KEYS = new Set(["act:coach_report", "view:coach", "act:open_in_coach", "act:coach_plan", "act:plan_to_overlay"]);
const sesDay = (t) => new Date(t).toISOString().slice(0, 10);

/** The rest of the Analytics answer (pure, so the test can run it): who was active each day (used an app or drove),
 *  the totals against the period before, the funnel of the period's new accounts, how many days each driver came,
 *  and the games driven from the uploaded sessions. */
export function analyticsMore({ from, t0, actDays, rows, sessions, prevSessions, prevActive, accounts, accountsAll }) {
  const perDay = new Map(), userDays = new Map(), app = new Map(), drove = new Map();
  const mark = (m, d, id) => { let x = m.get(d); if (!x) m.set(d, (x = new Set())); x.add(id); };
  for (const r of actDays) { if (r.day < from) continue; mark(perDay, r.day, r.account_id); mark(app, r.day, r.account_id); mark(userDays, r.account_id, r.day); }
  const games = new Map(), drivers = new Set();
  let nSes = 0, races = 0, laps = 0, secs = 0;
  for (const s of sessions) {
    const id = String(s.uploader || "").slice(5), d = s.day || sesDay(s.started || 0);
    if (!id || d < from) continue;
    mark(perDay, d, id); mark(drove, d, id); mark(userDays, id, d); drivers.add(id);
    let g = games.get(s.game);
    if (!g) games.set(s.game, (g = { game: s.game, drivers: new Set(), sessions: 0, races: 0, laps: 0, secs: 0 }));
    g.drivers.add(id); g.sessions += s.n || 0; g.races += s.races || 0; g.laps += s.laps || 0; g.secs += s.secs || 0;
    nSes += s.n || 0; races += s.races || 0; laps += s.laps || 0; secs += s.secs || 0;
  }
  const devices = new Map(), keys = new Map();
  for (const r of rows) {
    let d = devices.get(r.account_id); if (!d) devices.set(r.account_id, (d = new Set())); d.add(r.device);
    let k = keys.get(r.account_id); if (!k) keys.set(r.account_id, (k = new Set())); k.add(r.key);
  }
  const fresh = accounts.filter((a) => a.created >= t0);
  const has = (id, set) => [...(keys.get(id) || [])].some((k) => set.has(k));
  const daysList = [...userDays.values()].map((x) => x.size);
  const list = (m) => [...m].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, u]) => ({ day, users: u.size }));
  return {
    active: list(perDay),
    activeApp: list(app),
    drove: list(drove),
    signupsPerDay: [...fresh.reduce((m, a) => m.set(sesDay(a.created), (m.get(sesDay(a.created)) || 0) + 1), new Map())].sort().map(([day, n]) => ({ day, n })),
    totals: { active: userDays.size, newAccounts: fresh.length, accounts: accountsAll, drove: drivers.size, sessions: nSes, races, laps, secs: Math.round(secs), returning: daysList.filter((n) => n >= 2).length, multiDevice: [...devices.values()].filter((d) => d.size >= 2).length },
    prev: { active: prevActive, newAccounts: accounts.length - fresh.length, sessions: prevSessions.sessions || 0, drove: prevSessions.drivers || 0, secs: Math.round(prevSessions.secs || 0) },
    funnel: { accounts: fresh.length, opened: fresh.filter((a) => keys.has(a.id)).length, drove: fresh.filter((a) => drivers.has(a.id)).length, laps: fresh.filter((a) => has(a.id, LAPS_KEYS)).length, coach: fresh.filter((a) => has(a.id, COACH_KEYS)).length },
    comeback: { d1: daysList.filter((n) => n === 1).length, d23: daysList.filter((n) => n >= 2 && n <= 3).length, d4: daysList.filter((n) => n >= 4).length },
    driven: [...games.values()].map((g) => ({ game: g.game, drivers: g.drivers.size, sessions: g.sessions, races: g.races, laps: g.laps, secs: Math.round(g.secs) })).sort((a, b) => b.sessions - a.sessions),
  };
}
/** What stands out in an Analytics answer, as keys with their numbers, so every device writes the same sentences in its
 *  own language (web: admHiText in index.html; phones: the strings admin_hi_<k>). Tones: good, bad, warn, blue. */
export function highlightsOf(a) {
  const out = [], t = a.totals || {}, pv = a.prev || {}, F = a.funnel || {}, act = t.active || 0, top = a.top || [];
  if (pv.active) out.push({ k: t.active >= pv.active ? "active_more" : "active_fewer", tone: t.active >= pv.active ? "good" : "bad", a: [act, a.days, Math.abs(act - pv.active)] });
  else out.push({ k: "active_first", tone: "good", a: [act, a.days, t.newAccounts || 0] });
  if (F.accounts >= 3) {
    const w = [["no_app", F.accounts - (F.opened || 0)], ["no_drive", F.accounts - (F.drove || 0)]].sort((x, y) => y[1] - x[1])[0];
    if (w[1] > 0) out.push({ k: w[0], tone: "bad", a: [w[1], F.accounts, Math.round((w[1] / F.accounts) * 100)] });
  }
  const users = (keys) => Math.max(0, ...keys.map((k) => (top.find((x) => x.key === k) || {}).users || 0));
  const coach = users(["act:coach_report", "view:coach"]), laps = users(["view:telemetry", "view:laps"]);
  if (act && laps && coach < laps * 0.6) out.push({ k: "coach_low", tone: "warn", a: [coach, act, laps] });
  const S = a.sources || {}, bs = (S.bySource || []).filter((x) => x.signups && x.src !== "unknown").sort((x, y) => y.signups - x.signups)[0];
  const bv = (S.bySource || []).filter((x) => x.visits).sort((x, y) => y.visits - x.visits)[0];
  if (bs) out.push({ k: "top_signups", tone: "blue", a: [bs.src, bs.signups] });
  else if (bv) out.push({ k: "top_visits", tone: "blue", a: [bv.src, bv.visits, S.visits] });
  const g = (a.driven || []).filter((x) => x.drivers).map((x) => [x.game, x.sessions / x.drivers]).sort((x, y) => y[1] - x[1]);
  if (g.length > 1 && g[0][1] >= g[g.length - 1][1] * 2) out.push({ k: "games", tone: "blue", a: [g[0][0], g[0][1].toFixed(1), g[g.length - 1][0], g[g.length - 1][1].toFixed(1)] });
  const devs = new Map((a.byDevice || []).map((x) => [x.device, x.users]));
  for (const d of ["android", "ios"]) if (act && !devs.get(d)) out.push({ k: "no_" + d, tone: "bad", a: [a.days] });
  const vers = new Map();
  for (const v of a.versions || []) { const k = v.device === "desktop" ? "pc" : v.device; if (!vers.has(k)) vers.set(k, []); vers.get(k).push(v); }
  const num = (v) => String(v || "").split(/[^0-9]+/).filter(Boolean).slice(0, 3).map(Number);
  const cmp = (x, y) => { const p = num(x), q = num(y); for (let i = 0; i < 3; i++) { const d = (p[i] || 0) - (q[i] || 0); if (d) return d; } return 0; };
  let behind = 0;
  for (const list of vers.values()) { const newest = list.map((x) => x.v).sort(cmp).pop(); behind += list.filter((x) => cmp(x.v, newest)).reduce((s, x) => s + x.devices, 0); }
  if (behind) out.push({ k: "behind", tone: "warn", a: [behind] });
  // uninstalls and donations (pcstats.js)
  const I = a.installs || {}, Su = a.supporters || {};
  if (I.uninstalls) out.push({ k: (I.reasons || []).length ? "uninstalls_why" : "uninstalls", tone: "bad", a: [I.uninstalls, a.days, ((I.reasons || [])[0] || {}).k || ""] });
  if (Su.donations) out.push({ k: "donations", tone: "good", a: [Su.donations, a.days] });
  return out;
}
/** Each game Pitlane HQ reads, every one of them even when nobody drove it (pure, so the test can run it): its drivers,
 *  sessions, races, laps and time against the days before, the drivers new to it (their first session of the game),
 *  those whose app counted it (`game:` keys), its drivers per day and its most driven tracks and cars.
 *  sessions: SQL_SESSIONS_DAYS rows; prev [{game, drivers, sessions, secs}]; firsts [{game, n, prevN}];
 *  tracks / cars [{game, name, sessions, drivers}]; appGames: analyticsOf's games [{game, users, n}]. */
export function gamesOf({ from, sessions = [], prev = [], firsts = [], tracks = [], cars = [], appGames = [] }) {
  const G = new Map(USAGE_GAMES.map((g) => [g, { game: g, drivers: new Set(), sessions: 0, races: 0, laps: 0, secs: 0, days: new Map() }]));
  for (const s of sessions) {
    const id = String(s.uploader || "").slice(5), d = s.day || sesDay(s.started || 0), g = G.get(s.game);
    if (!id || !g || d < from) continue;
    g.drivers.add(id); g.sessions += s.n || 0; g.races += s.races || 0; g.laps += s.laps || 0; g.secs += s.secs || 0;
    let x = g.days.get(d); if (!x) g.days.set(d, (x = new Set())); x.add(id);
  }
  const by = (rows, g) => rows.filter((x) => x.game === g);
  const top = (rows, g) => by(rows, g).filter((x) => x.name).sort((a, b) => b.sessions - a.sessions || b.drivers - a.drivers).slice(0, 6).map((x) => ({ name: String(x.name), sessions: x.sessions || 0, drivers: x.drivers || 0 }));
  return [...G.values()].map((g) => {
    const p = by(prev, g.game)[0] || {}, f = by(firsts, g.game)[0] || {}, a = by(appGames, g.game)[0] || {};
    return {
      game: g.game, drivers: g.drivers.size, sessions: g.sessions, races: g.races, laps: g.laps, secs: Math.round(g.secs),
      prevDrivers: p.drivers || 0, prevSessions: p.sessions || 0, prevSecs: Math.round(p.secs || 0),
      newDrivers: f.n || 0, prevNew: f.prevN || 0, appDrivers: a.users || 0,
      perDay: [...g.days].sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([day, u]) => ({ day, users: u.size })),
      tracks: top(tracks, g.game), cars: top(cars, g.game),
    };
  }).sort((a, b) => b.sessions - a.sessions || b.appDrivers - a.appDrivers || USAGE_GAMES.indexOf(a.game) - USAGE_GAMES.indexOf(b.game));
}
// the period before, each game's first session of every driver, and the tracks and cars of each game (GET /community/admin/analytics)
export const SQL_GAMES_PREV = "SELECT game, COUNT(*) AS sessions, COUNT(DISTINCT uploader) AS drivers, SUM(COALESCE(secs,0)) AS secs FROM sessions WHERE started>=?1 AND started<?2 AND uploader LIKE 'acct:%' GROUP BY game";
export const SQL_GAMES_FIRSTS = "SELECT game, SUM(CASE WHEN f>=?2 THEN 1 ELSE 0 END) AS n, SUM(CASE WHEN f>=?1 AND f<?2 THEN 1 ELSE 0 END) AS prevN FROM (SELECT game, uploader, MIN(started) AS f FROM sessions WHERE uploader LIKE 'acct:%' GROUP BY game, uploader) GROUP BY game";
export const SQL_GAMES_TRACKS = "SELECT game, track AS name, COUNT(*) AS sessions, COUNT(DISTINCT uploader) AS drivers FROM sessions WHERE started>=?1 AND uploader LIKE 'acct:%' GROUP BY game, track ORDER BY sessions DESC LIMIT 400";
export const SQL_GAMES_CARS = "SELECT game, car AS name, COUNT(*) AS sessions, COUNT(DISTINCT uploader) AS drivers FROM sessions WHERE started>=?1 AND uploader LIKE 'acct:%' GROUP BY game, car ORDER BY sessions DESC LIMIT 400";
export const SQL_SESSIONS_DAYS = "SELECT date(started/1000,'unixepoch') AS day, game, uploader, COUNT(*) AS n, SUM(COALESCE(laps,0)) AS laps, SUM(COALESCE(secs,0)) AS secs, SUM(CASE WHEN lower(COALESCE(kind,'')) LIKE '%race%' THEN 1 ELSE 0 END) AS races FROM sessions WHERE started>=?1 AND uploader LIKE 'acct:%' GROUP BY 1, game, uploader LIMIT 20000";

// the statements of usage.js the test runs on SQLite too
export const SQL_USAGE_ADD = "INSERT INTO usage_days (day, account_id, device, key, n) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(day, account_id, device, key) DO UPDATE SET n=MIN(usage_days.n+excluded.n, 100000)";
export const SQL_ASK_USED = "INSERT INTO feedback_ask (account_id, shown, used) VALUES (?1,?2,?3) ON CONFLICT(account_id) DO UPDATE SET used=feedback_ask.used+excluded.used";
export const SQL_ASK_SEEN = "INSERT INTO feedback_ask (account_id, shown, used) VALUES (?1,?2,0) ON CONFLICT(account_id) DO UPDATE SET shown=excluded.shown, used=0";
export const SQL_RACES_SINCE = "SELECT COUNT(*) AS n FROM sessions WHERE uploader=?1 AND started>?2 AND lower(COALESCE(kind,'')) LIKE '%race%'";
// the overlay window: one more race with overlays (the same session told again counts once), shown, answered
export const SQL_OV_RACE = "INSERT INTO feedback_ask (account_id, shown, used, ov_races, ov_last_style, ov_last_sid) VALUES (?1,?2,0,1,?3,?4) ON CONFLICT(account_id) DO UPDATE SET ov_races=MIN(feedback_ask.ov_races+(CASE WHEN COALESCE(feedback_ask.ov_last_sid,'')=excluded.ov_last_sid THEN 0 ELSE 1 END), 1000), ov_last_style=excluded.ov_last_style, ov_last_sid=excluded.ov_last_sid";
export const SQL_OV_SEEN = "UPDATE feedback_ask SET ov_races=0 WHERE account_id=?1";
export const SQL_OV_ANSWERED = "INSERT INTO feedback_ask (account_id, shown, used, ov_races, ov_answered) VALUES (?1,?2,0,0,1) ON CONFLICT(account_id) DO UPDATE SET ov_races=0, ov_answered=1";
