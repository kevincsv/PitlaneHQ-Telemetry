// The admin page's driver profile (driver.js): one account's driving first (per game, tracks, cars, the days it drove,
// every session), then its sign-ins, devices, what it uses in the apps, its money, how to reach it and its links.
// Pure, so cloud/test/driver.test.mjs runs it without a database.
import { timelineOf } from "./metricslib.js";

export const DAY = 86400e3;
export const ONLINE_MS = 3 * 60e3; // seen in the last three minutes: online (the Drivers list's rule, winbacklib.js)
export const DRIVING_MS = 10 * 60e3; // a lap came up in the last ten minutes: on track now
export const PAGE = 30; // sessions per page of the profile
export const CAL_DAYS = 26 * 7; // the calendar of the days driven: 26 weeks
const TOP = 8; // tracks and cars shown

const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
export const isRace = (kind) => /race/i.test(String(kind || ""));
// the agent's own counters are not the driver opening an app (metricslib.js: ov:, ovrace:, run:, set:)
const APP_KEY = /^(view|act):/;

/** One session as the profile lists it. */
export const sessionRow = (s) => ({
  id: s.id, started: s.started || 0, game: s.game || "iracing", track: s.track || "", config: s.track_config || "", car: s.car || "",
  kind: s.kind || "", laps: s.laps || 0, best: s.best || null, secs: s.secs || 0, official: !!s.official, cat: s.cat || "",
  pos: s.pos || null, field: s.field || null,
});

/** What it drove: totals, per game, the tracks and cars it drove most and the start of every session of the calendar. */
export function drivingOf(sessions, now) {
  const G = new Map(), T = new Map(), C = new Map(), from30 = now - 30 * DAY, fromCal = now - CAL_DAYS * DAY, days30 = new Set(), cal = [];
  const tot = { sessions: 0, races: 0, laps: 0, secs: 0, first: 0, last: 0 };
  for (const s of sessions) {
    const g = s.game || "iracing", t = s.started || 0, race = isRace(s.kind) ? 1 : 0;
    let x = G.get(g);
    if (!x) G.set(g, (x = { game: g, sessions: 0, races: 0, laps: 0, secs: 0, first: 0, last: 0 }));
    for (const o of [x, tot]) {
      o.sessions++; o.races += race; o.laps += s.laps || 0; o.secs += s.secs || 0;
      if (t && (!o.first || t < o.first)) o.first = t;
      if (t > o.last) o.last = t;
    }
    const add = (M, name) => {
      if (!name) return;
      const k = g + "|" + name;
      let y = M.get(k);
      if (!y) M.set(k, (y = { name, game: g, sessions: 0, laps: 0, secs: 0 }));
      y.sessions++; y.laps += s.laps || 0; y.secs += s.secs || 0;
    };
    add(T, s.track); add(C, s.car);
    if (t >= from30) days30.add(dayOf(t));
    if (t >= fromCal) cal.push(t);
  }
  const top = (M) => [...M.values()].sort((a, b) => b.sessions - a.sessions || b.laps - a.laps).slice(0, TOP);
  return { totals: { ...tot, days30: days30.size }, games: [...G.values()].sort((a, b) => b.sessions - a.sessions), tracks: top(T), cars: top(C), cal };
}

/** What it uses in the apps: the days it opened one in the last 30, what it uses most, per kind of device. */
export function appOf(usage, now) {
  const from30 = dayOf(now - 30 * DAY), days = new Set(), F = new Map(), D = new Map();
  for (const r of usage) {
    if (!APP_KEY.test(String(r.key)) || r.day < from30) continue;
    days.add(r.day);
    F.set(r.key, (F.get(r.key) || 0) + (r.n || 0));
    const dv = r.device === "desktop" ? "pc" : r.device;
    let d = D.get(dv);
    if (!d) D.set(dv, (d = { device: dv, days: new Set() }));
    d.days.add(r.day);
  }
  return {
    days30: days.size,
    top: [...F].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n).slice(0, 10),
    byDevice: [...D.values()].map((d) => ({ device: d.device, days: d.days.size })).sort((a, b) => b.days - a.days),
  };
}

/** The whole profile. [a] the account row; the arrays are the database's answers (driver.js). */
export function driverOf({ now, a, admin, tester, pro, email, sessions, recent, logins, presence, usage, signins, orders, invitedBy, invited, feedback, support, links, guests, counts }) {
  const drv = drivingOf(sessions, now);
  // the newest session whose lap came up in the last ten minutes: on track now
  const live = sessions.map((s) => ({ s, at: s.up_at || (s.started || 0) + (s.secs || 0) * 1000 })).filter((x) => now - x.at <= DRIVING_MS).sort((x, y) => y.at - x.at)[0];
  const seen = Math.max(0, ...presence.map((p) => p.last_seen || 0), ...logins.map((l) => l.last_seen || 0));
  const lastUsed = Math.max(seen, drv.totals.last, live ? live.at : 0) || a.created || 0;
  const devices = presence.map((p) => ({ kind: p.kind === "desktop" ? "pc" : p.kind, app: p.kind, name: p.name || "", version: p.app_version || "", lastSeen: p.last_seen || 0 })).sort((x, y) => y.lastSeen - x.lastSeen);
  return {
    id: a.id, name: a.display || "", nameKind: a.name_kind || "nick", anon: !!a.anon, created: a.created || 0, memberSince: a.member_since || null,
    verified: !!a.verified, twoFactor: !!a.totp_on, admin: !!admin, tester: !!tester,
    supporter: !!a.supporter, supporterSrc: a.supporter ? a.supporter_src || "manual" : "", supporterHidden: !!a.supporter_hidden, founder: !!a.founder,
    pro: pro || { pro: false, proSrc: "", proUntil: 0 }, proByHand: !!a.pro && a.pro_src === "manual",
    testAsk: a.test_ask ? { at: a.test_ask, what: a.test_ask_what || "" } : null,
    src: a.src || "unknown", page: a.src_page || "", country: a.country || "",
    state: {
      online: !!live || now - seen <= ONLINE_MS,
      driving: live ? { at: live.at, game: live.s.game || "iracing", track: live.s.track || "", car: live.s.car || "", kind: live.s.kind || "" } : null,
      lastSeen: seen || 0, lastDrove: drv.totals.last || 0, lastUsed,
      awayDays: Math.max(0, Math.floor((now - lastUsed) / DAY)), droveDays: drv.totals.last ? Math.max(0, Math.floor((now - drv.totals.last) / DAY)) : null,
    },
    totals: drv.totals, games: drv.games, tracks: drv.tracks, cars: drv.cars, cal: drv.cal,
    sessions: recent.map(sessionRow), more: sessions.length > recent.length,
    logins: logins.map((l) => ({ device: l.device || "", created: l.created || 0, lastSeen: l.last_seen || 0 })).sort((x, y) => y.lastSeen - x.lastSeen),
    signins: signins.map((e) => { let i = {}; try { i = JSON.parse(e.info || "{}") || {}; } catch { i = {}; } return { at: e.at, device: i.device || "", how: i.how || "" }; }),
    devices, app: appOf(usage, now),
    steps: timelineOf({ created: a.created || 0, usage, sessions: stepDays(sessions) }),
    money: {
      orders: orders.map((o) => ({ id: o.id, at: o.at || 0, kind: o.kind || "", status: o.status || "", amount: o.amount ?? null, currency: o.currency || "", ref: o.ref || "" })).sort((x, y) => y.at - x.at),
      invitedBy: invitedBy ? { id: invitedBy.inviter, name: invitedBy.name || "", state: invitedBy.state || "", created: invitedBy.created || 0 } : null,
      invited: invited.map((r) => ({ id: r.invitee, name: r.name || "", state: r.state || "", created: r.created || 0 })),
      inviteCode: a.invite_code || "",
    },
    contact: {
      email: email || "", winbackAt: a.winback_at || 0,
      feedback: feedback.map((f) => ({ id: f.id, created: f.created || 0, rating: f.rating || null, text: String(f.text || "").slice(0, 600), device: f.device || "", v: f.v || "", kind: f.kind || "" })),
      support: { n: (support && support.n) || 0, last: (support && support.last) || 0 },
      games: links.games, steam: links.steam, discord: !!links.discord, google: !!links.google,
      guests: guests.map((g) => ({ id: g.gid, name: g.alias || "" })),
    },
    counts: { sharedLaps: (counts && counts.laps) || 0, leagues: (counts && counts.leagues) || 0, guestsOwned: (counts && counts.guests) || 0 },
  };
}

/** The days with a session and whether one was a race, for the first steps (metricslib.js timelineOf). */
export function stepDays(sessions) {
  const by = new Map();
  for (const s of sessions) { const d = dayOf(s.started || 0); by.set(d, (by.get(d) || 0) + (isRace(s.kind) ? 1 : 0)); }
  return [...by].map(([day, races]) => ({ day, races }));
}
