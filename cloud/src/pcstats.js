// The admin Analytics' "Installs and uninstalls" and "Supporters" (GET /community/admin/analytics, usage.js).
// - pc_days (migration 0095): one row per day, kind and version, counted by the server with no address or account:
//   'download' every time the Windows installer (PitlaneHQ-Setup.exe) is downloaded (downloads.js, v 'beta' for the
//   test builds), 'uninstall' every time the page the uninstaller opens is shown (uninstall.js, v the version removed)
// - the uninstall answers are feedback rows of kind 'uninstall' (uninstall.js), their reasons in `style`
// - the supporters are the accounts with the badge, by where it came from (Stripe donations, by hand, Patreon from
//   before the donations moved to Stripe in 0.9.8); the donations are pro_orders of kind 'supporter' (stripe.js)
import { REASONS, isVersion } from "./uninstall.js";

export const SQL_PC_ADD = "INSERT INTO pc_days (day, kind, v, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(day, kind, v) DO UPDATE SET n = n + 1";

/** Counts one download or uninstall page for today; never fails the request it rides on. */
export function pcCount(env, kind, v) {
  if (!env || !env.DB) return Promise.resolve();
  const d = new Date().toISOString().slice(0, 10);
  return env.DB.prepare(SQL_PC_ADD).bind(d, kind, String(v || "").replace(/[^0-9a-z.+-]/gi, "").slice(0, 20)).run().catch(() => {});
}

const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0);
const L3 = (r) => [r.en, r.es, r.pt];

/** The installs and uninstalls of the days from `from` (this period) and before it (the one before).
 *  pcRows: {day, kind, v, n}; answers: {created, day, v, style, text} of both periods. */
export function installsOf({ from, pcRows = [], answers = [] }) {
  // rows counted before the page asked for a real version (a scanner posting anything) are not uninstalls
  pcRows = pcRows.filter((x) => x.kind !== "uninstall" || !x.v || isVersion(x.v));
  answers = answers.filter((x) => !x.v || isVersion(x.v));
  const now = pcRows.filter((x) => x.day >= from), prev = pcRows.filter((x) => x.day < from);
  const aNow = answers.filter((x) => x.day >= from), aPrev = answers.filter((x) => x.day < from);
  // an uninstall is a page shown; on a day with more answers than pages (before the pages were counted) the answers
  const perDayU = (rows, ans) => {
    const m = new Map();
    for (const x of rows) if (x.kind === "uninstall") m.set(x.day, (m.get(x.day) || 0) + x.n);
    const a = new Map();
    for (const x of ans) a.set(x.day, (a.get(x.day) || 0) + 1);
    for (const [d, n] of a) if (n > (m.get(d) || 0)) m.set(d, n);
    return m;
  };
  const uNow = perDayU(now, aNow), uPrev = perDayU(prev, aPrev);
  const dl = (rows) => sum(rows.filter((x) => x.kind === "download"), (x) => x.n);
  const days = new Map();
  for (const x of now) if (x.kind === "download") days.set(x.day, { day: x.day, downloads: ((days.get(x.day) || {}).downloads || 0) + x.n, uninstalls: 0 });
  for (const [d, n] of uNow) days.set(d, { day: d, downloads: (days.get(d) || {}).downloads || 0, uninstalls: n });
  const byV = new Map();
  for (const x of now) if (x.kind === "uninstall" && x.v) byV.set(x.v, (byV.get(x.v) || 0) + x.n);
  if (!byV.size) for (const x of aNow) if (x.v) byV.set(x.v, (byV.get(x.v) || 0) + 1);
  const reasons = new Map();
  for (const x of aNow) for (const k of String(x.style || "").split(",")) if (REASONS[k]) reasons.set(k, (reasons.get(k) || 0) + 1);
  return {
    downloads: dl(now), prevDownloads: dl(prev),
    downloadsBeta: sum(now.filter((x) => x.kind === "download" && x.v === "beta"), (x) => x.n),
    uninstalls: sum([...uNow.values()], (n) => n), prevUninstalls: sum([...uPrev.values()], (n) => n),
    answered: aNow.length, prevAnswered: aPrev.length,
    perDay: [...days.values()].sort((a, b) => (a.day < b.day ? -1 : 1)),
    byVersion: [...byV].map(([v, n]) => ({ v, n })).sort((a, b) => b.n - a.n).slice(0, 8),
    reasons: Object.keys(REASONS).filter((k) => reasons.has(k)).map((k) => ({ k, n: reasons.get(k), name: L3(REASONS[k]) })).sort((a, b) => b.n - a.n),
    // what they wrote beyond the reasons (the answer's text after the reasons' line), newest first
    said: aNow.filter((x) => x.text).sort((a, b) => b.created - a.created).map((x) => ({ at: x.created, v: x.v || "", text: saidOf(x) })).filter((x) => x.text).slice(0, 6),
  };
}
// an answer's text is "<reasons> \n\n <what they wrote>" (cleanUninstall): only what they wrote
function saidOf(x) {
  const t = String(x.text || ""), hasReasons = String(x.style || "").length > 0;
  if (!hasReasons) return t.slice(0, 400);
  const i = t.indexOf("\n\n");
  return i < 0 ? "" : t.slice(i + 2).slice(0, 400);
}

/** The supporters now and the donations of this period and the one before.
 *  badges: {src, n} of the accounts with the badge; patrons: active Patreon patrons;
 *  orders: {at, status, amount, currency, account_id, name} donations of both periods (t0 starts this one). */
export function supportersOf({ t0, badges = [], patrons = 0, orders = [] }) {
  const by = (s) => sum(badges.filter((x) => (x.src || "manual") === s), (x) => x.n);
  const paid = orders.filter((x) => x.status === "on");
  const now = paid.filter((x) => x.at >= t0), prev = paid.filter((x) => x.at < t0);
  const money = (rows) => {
    const m = new Map();
    for (const x of rows) if (x.amount != null && x.currency) m.set(x.currency, (m.get(x.currency) || 0) + x.amount);
    return [...m].map(([currency, amount]) => ({ currency, amount })).sort((a, b) => b.amount - a.amount);
  };
  return {
    total: sum(badges, (x) => x.n), stripe: by("stripe"), manual: by("manual"), patreon: by("patreon"), patrons: patrons || 0,
    donations: now.length, prevDonations: prev.length, amounts: money(now), prevAmounts: money(prev),
    // donors who have no account yet: they get the badge when they sign up with that email
    waiting: now.filter((x) => !x.account_id).length,
    refunded: orders.filter((x) => x.status === "refunded" && x.at >= t0).length,
    recent: now.sort((a, b) => b.at - a.at).slice(0, 8).map((x) => ({ at: x.at, amount: x.amount ?? null, currency: x.currency || "", name: x.name || "", id: x.account_id || "" })),
  };
}
