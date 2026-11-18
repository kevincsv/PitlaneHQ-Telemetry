// The admin page's Drivers list (winback.js): every account with when it last drove and last used Pitlane HQ, how much
// it drove in the last 30 days, its sessions in all, whether it is online or driving now, and the "we miss you" email
// for the drivers who stopped driving. Pure, so cloud/test/winback.test.mjs runs it without a database.

export const DAY = 86400e3;
export const AWAY_DAYS = 14; // away from this many days on: the list's default and who the email is for
export const ONLINE_MS = 3 * 60e3; // the Online part's three minutes
export const DRIVING_MS = 10 * 60e3; // a lap came up in the last ten minutes: on track now
export const SEND_MAX = 20; // emails per request; the page asks again while some are left

const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const noonOf = (d) => Date.parse(d + "T12:00:00Z");

/** One row per account, the most active first. [now] ms; the arrays are the database's answers (winback.js). */
export function activityOf({ now, accounts, signins, presence, usageDays, usageLast, sessions, sessionsLast, driving, langs, emails, admins }) {
  const t30 = now - 30 * DAY, from30 = dayOf(t30);
  const A = new Map();
  for (const a of accounts) {
    A.set(a.id, {
      id: a.id, nick: a.display || "", created: a.created || 0, tester: !!a.tester, supporter: !!a.supporter, admin: !!(admins && admins.has(a.id)),
      supporterSrc: a.supporter ? a.supporter_src || "manual" : "", anon: !!a.anon, testAsk: a.test_ask ? { at: a.test_ask, what: a.test_ask_what || "" } : null,
      sessions: 0, lastDrove: 0,
      email: (emails && emails.get(a.id)) || "", lang: "en", winbackAt: a.winback_at || 0,
      lastUsed: 0, days30: new Set(), drove30: new Set(), laps30: 0, secs30: 0, sessions30: 0, devices: new Set(), online: false, driving: null,
    });
  }
  const last = (x, t) => { if (x && t > x.lastUsed) x.lastUsed = Math.min(t, now); };
  for (const r of signins) last(A.get(r.account_id), r.t || 0);
  for (const r of presence) {
    const x = A.get(r.account_id);
    if (!x) continue;
    last(x, r.t || 0);
    x.devices.add(r.kind === "desktop" ? "pc" : r.kind);
    if (now - (r.t || 0) <= ONLINE_MS) x.online = true;
  }
  for (const r of usageLast) last(A.get(r.account_id), noonOf(r.day));
  for (const r of usageDays) {
    const x = A.get(r.account_id);
    if (!x || r.day < from30) continue;
    x.days30.add(r.day);
    if (r.device) x.devices.add(r.device === "desktop" ? "pc" : r.device);
  }
  for (const r of sessionsLast) {
    const x = A.get(String(r.uploader || "").slice(5));
    if (!x) continue;
    last(x, r.t || 0);
    x.lastDrove = Math.max(x.lastDrove, Math.min(r.t || 0, now)); x.sessions = r.n || 0;
  }
  for (const s of sessions) {
    const x = A.get(String(s.uploader || "").slice(5));
    if (!x || (s.started || 0) < t30) continue;
    x.days30.add(dayOf(s.started)); x.drove30.add(dayOf(s.started));
    x.laps30 += s.laps || 0; x.secs30 += s.secs || 0; x.sessions30++;
    x.devices.add("pc");
  }
  for (const s of driving) {
    const x = A.get(String(s.uploader || "").slice(5));
    const at = s.up_at || (s.started || 0) + (s.secs || 0) * 1000;
    if (!x || now - at > DRIVING_MS || (x.driving && x.driving.at > at)) continue;
    x.driving = { at, game: s.game || "iracing", track: s.track || "", car: s.car || "", kind: s.kind || "" };
    last(x, at); x.lastDrove = Math.max(x.lastDrove, Math.min(at, now));
  }
  for (const r of langs) { const x = A.get(r.account_id); if (x && ["en", "es", "pt"].includes(r.lang)) x.lang = r.lang; }
  const out = [...A.values()].map((x) => {
    const lastUsed = x.lastUsed || x.created;
    return {
      id: x.id, nick: x.nick, created: x.created, tester: x.tester, supporter: x.supporter, supporterSrc: x.supporterSrc, admin: x.admin, anon: x.anon,
      testAsk: x.testAsk, email: x.email, lang: x.lang, winbackAt: x.winbackAt, lastUsed, awayDays: Math.max(0, Math.floor((now - lastUsed) / DAY)),
      // not driving is what counts as gone (the owner's rule, 2026-11-15): an account that never drove counts from its creation
      lastDrove: x.lastDrove, droveDays: Math.max(0, Math.floor((now - (x.lastDrove || x.created)) / DAY)), sessions: x.sessions,
      drove30: x.drove30.size, days30: x.days30.size,
      laps30: x.laps30, hours30: Math.round(x.secs30 / 360) / 10, sessions30: x.sessions30, devices: [...x.devices].sort(),
      online: x.online || !!x.driving, driving: x.driving,
    };
  });
  return out.sort(byActive);
}

/** Most active first: days driven in the last 30, then time on track, then days used, then the most recent. */
export const byActive = (a, b) => (b.drove30 || 0) - (a.drove30 || 0) || b.hours30 - a.hours30 || b.days30 - a.days30 || b.laps30 - a.laps30 || b.lastUsed - a.lastUsed;

/** Who the "we miss you" email can go to: not driven for long enough, an email the server knows, never sent before, not
 * an admin, not online now. */
export const canWinback = (x, days = AWAY_DAYS) => !!x.email && !x.winbackAt && !x.admin && x.droveDays >= days && !x.online;

/** The counts above the list. */
export function activitySummary(list, days = AWAY_DAYS) {
  return {
    accounts: list.length,
    driving: list.filter((x) => x.driving).length,
    online: list.filter((x) => x.online).length,
    week: list.filter((x) => x.awayDays < 7).length,
    droveWeek: list.filter((x) => x.lastDrove && x.droveDays < 7).length,
    away: list.filter((x) => x.droveDays >= days).length,
    canEmail: list.filter((x) => canWinback(x, days)).length,
    emailed: list.filter((x) => x.winbackAt).length,
  };
}

const T = {
  subject: { en: "We miss you at Pitlane HQ", es: "Te echamos de menos en Pitlane HQ", pt: "Sentimos sua falta no Pitlane HQ" },
  hi: { en: (n) => (n ? `Hi ${n},` : "Hi,"), es: (n) => (n ? `Hola ${n},` : "Hola,"), pt: (n) => (n ? `Olá ${n},` : "Olá,") },
  body: {
    en: "It has been a while since you last used Pitlane HQ, and we miss you.\n\nA lot has changed since then. The coach, the overlays and Le Mans Ultimate got better, and everything is still free during the beta.\n\nIf something did not work for you or felt hard to use, we would really like to know. Two minutes of your feedback helps us make Pitlane HQ better for every driver.\n\nThis is the only email of this kind we will send you.\n\nSee you on track,\nThe Pitlane HQ team",
    es: "Hace tiempo que no usas Pitlane HQ y te echamos de menos.\n\nHan cambiado muchas cosas desde entonces. El coach, los overlays y Le Mans Ultimate han mejorado, y todo sigue siendo gratis durante la beta.\n\nSi algo no te funcionó o te resultó difícil, nos encantaría saberlo. Dos minutos de tu opinión nos ayudan a mejorar Pitlane HQ para todos los pilotos.\n\nEs el único email de este tipo que te enviaremos.\n\nNos vemos en pista,\nEl equipo de Pitlane HQ",
    pt: "Faz tempo que você não usa o Pitlane HQ e sentimos sua falta.\n\nMuita coisa mudou desde então. O coach, os overlays e o Le Mans Ultimate melhoraram, e tudo continua grátis durante o beta.\n\nSe algo não funcionou para você ou foi difícil de usar, adoraríamos saber. Dois minutos da sua opinião nos ajudam a melhorar o Pitlane HQ para todos os pilotos.\n\nEste é o único email deste tipo que vamos enviar.\n\nNos vemos na pista,\nA equipe do Pitlane HQ",
  },
  button: { en: "Tell us what you think", es: "Danos tu opinión", pt: "Dê sua opinião" },
};
export const WINBACK_LINK = "https://pitlanehq.app/app?feedback=1";
const cleanNick = (n) => String(n || "").replace(/[\r\n<>]/g, " ").trim().slice(0, 40);

/** The email in the driver's language: {subject, text, link, button, lang}. */
export function winbackMail(l, nick) {
  const L = ["en", "es", "pt"].includes(l) ? l : "en";
  return { subject: T.subject[L], text: T.hi[L](cleanNick(nick)) + "\n\n" + T.body[L], link: WINBACK_LINK, button: T.button[L], lang: L };
}
