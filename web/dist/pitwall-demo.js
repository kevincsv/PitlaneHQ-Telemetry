/* Demo data for testing (admins only: Settings → Demo data). The same invented sessions, laps,
   races and community as the phone apps' Demo.kt / Demo.swift. It only lives in this browser:
   nothing is uploaded, and a DEMO banner shows on every screen while it is on. */
(function () {
  const COMBOS = [
    { track: "Spa-Francorchamps", cfg: "Grand Prix Pits", trackId: 163, car: "Porsche 911 GT3 R (992)", carId: 169, len: 7004, lap: 137.8 },
    { track: "Watkins Glen International", cfg: "Boot", trackId: 434, car: "Mazda MX-5 Cup", carId: 67, len: 5435, lap: 126.4 },
    { track: "Okayama International Circuit", cfg: "Full Course", trackId: 166, car: "Toyota GR86", carId: 160, len: 3703, lap: 92.1 },
    { track: "Road Atlanta", cfg: "Full Course", trackId: 127, car: "BMW M4 GT3", carId: 132, len: 4088, lap: 85.6 },
    { track: "Laguna Seca", cfg: "Full Course", trackId: 47, car: "Mazda MX-5 Cup", carId: 67, len: 3602, lap: 95.3 },
    { track: "Lime Rock Park", cfg: "Full Course", trackId: 54, car: "Ray Formula 1600", carId: 74, len: 2459, lap: 63.2, cat: "formula_car" },
  ];
  // Le Mans Ultimate: four sessions of its own (the game question before the session window, its own screens)
  const LMU = [
    { track: "Circuit de la Sarthe", cfg: "Circuit des 24 Heures du Mans", trackId: 9001, car: "Porsche 963", carId: 9101, len: 13626, lap: 219.4, kind: "Practice" },
    { track: "Spa-Francorchamps", cfg: "Endurance", trackId: 9002, car: "Ferrari 296 LMGT3", carId: 9102, len: 7004, lap: 141.9, kind: "Race" },
    { track: "Autodromo Nazionale Monza", cfg: "Grand Prix", trackId: 9003, car: "BMW M4 LMGT3", carId: 9103, len: 5793, lap: 108.2, kind: "Practice" },
    { track: "Bahrain International Circuit", cfg: "WEC", trackId: 9004, car: "Toyota GR010", carId: 9104, len: 5412, lap: 112.6, kind: "Qualifying" },
  ];
  const ALL = COMBOS.concat(LMU);
  const NAMES = "ABCDEFGHIJ".split("").map((c) => "Demo Driver " + c);
  const DAY = 86400000, NOW = Date.now();

  // a repeatable random sequence, so the demo looks the same every time
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    const next = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    return { f: (a, b) => a + (b - a) * next(), i: (a, b) => Math.floor(a + (b - a) * next()) };
  }
  const hash = (str) => { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff; return h; };

  // a lap trace: a speed profile with braking zones; rows of speed m/s, throttle, brake, gear, steering, lap time
  function trace(c, lapTime, seed) {
    const r = rng(seed), bin = 10, n = Math.floor(c.len / bin);
    // the corners of a track are always in the same place: every lap of a combination shares them
    const rc = rng(hash(c.track)), corners = Array.from({ length: 9 }, (_, k) => (k + 0.5 + rc.f(-0.2, 0.2)) / 9);
    const raw = [];
    for (let i = 0; i < n; i++) {
      const x = i / n;
      let v = 72;
      for (const k of corners) { const d = x - k; v -= 38 * Math.exp(-(d * d) / 0.0009); }
      raw.push(Math.max(18, v + Math.sin(x * 2 * Math.PI * 3) * 3 + r.f(-0.6, 0.6)));
    }
    const f = raw.reduce((a, v) => a + bin / v, 0) / lapTime;
    let t = 0;
    const d = raw.map((rv, i) => {
      const v = rv * f;
      t += bin / v;
      const next = raw[Math.min(n - 1, i + 3)] * f, braking = next < v - 1.5;
      return [v, braking ? 0 : Math.min(1, 0.55 + v / 80), braking ? Math.min(1, (v - next) / 8) : 0, Math.min(6, Math.floor(1 + v / 14)), Math.cos(i * 0.05) * 0.1, t];
    });
    // the shape of the track, like the position Pitlane HQ records: a loop that turns at every corner
    const turns = corners.map((_, k) => (k % 3 === 2 ? -0.6 : 1) * rc.f(0.6, 1.3)), tot = turns.reduce((p, q) => p + q, 0);
    const x = [], y = []; let h = 0, px = 0, py = 0;
    for (let i = 0; i < n; i++) {
      const q = i / n; let dh = 0;
      corners.forEach((k, j) => { const dd = q - k; dh += turns[j] * 2 * Math.PI / tot * Math.exp(-(dd * dd) / 0.0006) / (Math.sqrt(Math.PI * 0.0006) * n); });
      h += dh; px += bin * Math.cos(h); py += bin * Math.sin(h); x.push(px); y.push(py);
    }
    const ex = x[n - 1] - x[0], ey = y[n - 1] - y[0];
    for (let i = 0; i < n; i++) { const f = i / (n - 1); x[i] = Math.round((x[i] - ex * f) * 10) / 10; y[i] = Math.round((y[i] - ey * f) * 10) / 10; }
    return { bin, d, x, y };
  }
  // a lap with incidents carries where they happened: [distance m, points]
  function withInc(tr, l, c) { return l && l.inc ? { ...tr, inc: [Math.round(c.len * 0.42), l.inc] } : tr; }
  function sectors(lap, r) {
    const a = [0.31, 0.37, 0.32].map((x) => x * lap + r.f(-0.15, 0.15)), s = a.reduce((p, x) => p + x, 0);
    return a.map((x) => (x * lap) / s);
  }

  function sessions() {
    const out = [];
    COMBOS.forEach((c, i) => {
      out.push({ id: `demo:${i}:p`, started: NOW - (i * 2 + 1) * DAY, track: c.track, track_config: c.cfg, car: c.car, kind: "Practice", laps: 9, cat: c.cat || "sports_car", best: c.lap + 0.4 + i * 0.05, game: "iracing", driver: "You" });
      out.push({ id: `demo:${i}:r`, started: NOW - i * 2 * DAY - 3600000, track: c.track, track_config: c.cfg, car: c.car, kind: "Race", laps: 14, cat: c.cat || "sports_car", best: c.lap + 0.2, game: "iracing", driver: "You" });
    });
    // the weeks before (Statistics): practice of the first four cars and tracks most weeks for four months, the best
    // coming down as the weeks go
    COMBOS.slice(0, 4).forEach((c, i) => {
      const r = rng(i * 977 + 13);
      for (let w = 2; w <= 17; w++) {
        if (r.f(0, 1) < 0.25) continue;
        out.push({ id: `demo:${i}:h${w}`, started: NOW - w * 7 * DAY - i * DAY - 5 * 3600000, track: c.track, track_config: c.cfg, car: c.car, kind: "Practice", laps: r.i(6, 17), cat: c.cat || "sports_car", best: c.lap + 0.45 + 1.7 * (w / 17) + r.f(-0.12, 0.25), game: "iracing", driver: "You" });
      }
    });
    LMU.forEach((c, i) => out.push({ id: `demo:${COMBOS.length + i}:l`, started: NOW - (i * 3 + 2) * DAY, track: c.track, track_config: c.cfg, car: c.car, kind: c.kind, laps: 6 + i * 3, cat: "sports_car", best: c.lap, game: "lmu", driver: "You" }));
    return out.sort((a, b) => b.started - a.started);
  }
  const comboOf = (id) => ALL[+String(id).split(":")[1] || 0];
  function laps(sid) {
    const s = sessions().find((x) => x.id === sid);
    if (!s) return [];
    const r = rng(hash(sid)), out = [];
    for (let n = 1; n <= s.laps; n++) {
      const time = n === 3 ? s.best : s.best + r.f(0.1, 1.6) + (n === 1 ? 4 : 0);
      out.push({ id: `${sid}:${n}`, n, time, valid: n === 6 ? 0 : 1, fuel: null, vmax: null, sectors: sectors(time, r), inc: n === 3 ? 2 : 0 });
    }
    return out;
  }
  function board(trackId, carId) {
    const i = COMBOS.findIndex((c) => c.trackId === +trackId && c.carId === +carId);
    if (i < 0) return [];
    const c = COMBOS[i], r = rng(i * 31 + 7);
    // ten named drivers, then the rest of the field (Statistics places you among them)
    return Array.from({ length: 48 }, (_, k) => k < 10 ? NAMES[k] : "Demo Driver " + (k + 1)).map((n, k) => {
      const time = k < 10 ? c.lap - 0.7 + k * r.f(0.08, 0.35) : c.lap + 0.4 + (k - 10) * r.f(0.04, 0.12);
      return { id: `comm:${i}:${k}`, alias: n, time, created: NOW - k * DAY, hasTrace: true, sectors: sectors(time, r), car: c.car, track: c.track };
    }).sort((a, b) => a.time - b.time);
  }
  function races() {
    let ir = 2150;
    const out = [];
    for (let k = 0; k < 22; k++) { // eight in the last eight days, then one every four days (Statistics)
      const c = COMBOS[k % COMBOS.length], r = rng(k * 101 + 1);
      const field = 16 + r.i(0, 8), start = 1 + r.i(0, field), finish = Math.max(1, Math.min(field, start + r.i(-5, 5)));
      const change = Math.trunc((Math.trunc(field / 2) - finish) * 6.5) + r.i(-8, 8), inc = r.i(0, 9), best = c.lap + 0.3 + r.f(0, 0.8);
      const lapsArr = Array.from({ length: 15 }, (_, j) => {
        const n = j + 1;
        return { n, t: best + r.f(0, 1.5) + (n === 1 ? 5 : 0), p: Math.max(1, start + Math.trunc(((finish - start) * n) / 15)), i: n === 4 ? Math.min(inc, 4) : 0, pit: n === 9 };
      });
      const results = Array.from({ length: field }, (_, j) => {
        const p = j + 1;
        return p === finish ? { pos: p, cpos: p, name: "You", ir, best, inc, laps: 15 } : { pos: p, cpos: p, name: NAMES[(p + k) % NAMES.length], ir: 1500 + r.i(0, 1600), best: best + r.f(-0.8, 1.2), inc: r.i(0, 10), laps: 15 };
      });
      out.push({ id: "demo-race-" + k, when: NOW - (k < 8 ? k : 8 + (k - 8) * 4) * DAY - 7200000, track: c.track, trackId: c.trackId, car: c.car, carId: c.carId, official: true, start, finish, field, inc, best, fieldBest: best - 0.4, avg: best + 0.7, consistency: 0.42, pits: 1, fuelUsed: 38.5, ir, irChange: change, sof: 1800 + r.i(0, 900), laps: lapsArr, results });
      ir -= change;
    }
    return out;
  }
  function reports() {
    const out = [];
    COMBOS.forEach((c, i) => { for (let k = 0; k < 2; k++) out.push({ id: `rep${i}${k}`, alias: NAMES[(i + k) % NAMES.length], track: c.track, car: c.car, created: NOW - (i + k) * DAY, finish: 3 + k * 4, field: 18 + i, best: c.lap + 0.3 + k * 0.2 }); });
    return out;
  }
  function setups() {
    return COMBOS.map((c, i) => ({ id: "set" + i, alias: NAMES[i], carPath: c.car.toLowerCase().replace(/[^a-z0-9]+/g, ""), car: c.car, track: c.track, name: c.track.split(" ")[0] + " race", notes: "Stable on entry, a click less rear wing for the long straight.", size: 4200, downloads: 12 + i * 9, created: NOW - i * 3 * DAY }));
  }

  /** The demo answer for a GET of the Pitlane HQ API, or undefined when the demo has none. */
  function get(path) {
    const u = new URL(path, "https://x"), p = u.pathname, q = u.searchParams;
    if (p === "/api/sessions") return sessions();
    let m = p.match(/^\/api\/sessions\/(.+)$/);
    if (m) {
      const id = decodeURIComponent(m[1]), s = sessions().find((x) => x.id === id);
      if (!s) return undefined;
      const ls = laps(id);
      return { session: s, laps: q.get("traces") === "1" ? ls.map((l) => ({ ...l, trace: withInc(trace(comboOf(l.id), l.time, hash(l.id)), l, comboOf(l.id)) })) : ls };
    }
    m = p.match(/^\/api\/laps\/(.+)$/);
    if (m) {
      const id = decodeURIComponent(m[1]), sid = id.slice(0, id.lastIndexOf(":")), l = laps(sid).find((x) => x.id === id), s = sessions().find((x) => x.id === sid);
      return l && s ? { ...l, session_id: sid, track: s.track, car: s.car, started: s.started, trace: withInc(trace(comboOf(id), l.time, hash(id)), l, comboOf(id)) } : undefined;
    }
    if (p === "/api/bests") return COMBOS.map((c, i) => ({ game: "iracing", track: c.track, track_config: c.cfg, car: c.car, who: "you", driver: "You", best: c.lap + 0.2, laps: 23, last: NOW - i * 2 * DAY, bestLapId: `demo:${i}:r:3`, bestSessionId: `demo:${i}:r` }));
    if (p === "/api/races") return { races: races() };
    if (p === "/api/community/combos") return { combos: COMBOS.map((c) => ({ trackId: c.trackId, track: c.track, carId: c.carId, car: c.car, laps: 40 + (c.carId % 30), best: c.lap - 0.7 })) };
    if (p === "/api/community/laps") {
      const id = q.get("id");
      if (id) {
        const i = +id.split(":")[1], c = COMBOS[i], l = c && board(c.trackId, c.carId).find((x) => x.id === id);
        return l ? { ...l, game: "iracing", carId: c.carId, trackId: c.trackId, trace: trace(c, l.time, hash(id)) } : undefined;
      }
      return { laps: board(q.get("trackId"), q.get("carId")) };
    }
    if (p === "/api/community/reports") return q.get("id") ? undefined : { reports: reports() };
    // the records feed: the fastest lap of every car and track (the leaderboard's first) and the lap it beat (its second)
    if (p === "/api/community/records") return { records: COMBOS.map((c, i) => { const b = board(c.trackId, c.carId), r = b[0], s = b[1]; return r && { ...r, trackId: c.trackId, track: c.track, carId: c.carId, car: c.car, cat: c.cat || "sports_car", n: b.length, prev: s ? { time: s.time, alias: s.alias } : null, created: NOW - i * 5 * 3600e3 }; }).filter(Boolean) };
    // the track page: its layout from the demo lap, no official turns, the record of every car driven on it
    if (p === "/api/community/track") {
      const tid = +q.get("trackId"), cs = COMBOS.filter((c) => c.trackId === tid);
      if (!cs.length) return undefined;
      const tr = trace(cs[0], cs[0].lap, 1);
      return { trackId: tid, game: "iracing", track: cs[0].track, drivers: 9, laps: cs.length * 9, layout: { n: tr.x.length, len: cs[0].len, x: tr.x, y: tr.y }, turns: [],
        cars: cs.map((c) => { const b = board(c.trackId, c.carId), r = b[0]; return { ...r, trackId: tid, track: c.track, carId: c.carId, car: c.car, cat: c.cat || "sports_car", n: b.length }; }) };
    }
    if (p === "/api/community/setups") return { setups: setups() };
    // the admin page's analytics and feedback, invented (admins only, like every demo answer)
    if (p === "/community/records") return get("/api/community/records");
    // the drivers you follow: two of the board's drivers, their laps the board's own (Compare opens them)
    if (p === "/community/friends") return { friends: [6, 8].map((k, n) => ({ id: "demofriend" + n, name: NAMES[k], sup: n === 0, since: NOW - 30 * DAY,
      laps: COMBOS.slice(0, 3).map((c, i) => { const l = board(c.trackId, c.carId)[k]; return l && { id: l.id, track: c.track, car: c.car, trackId: c.trackId, carId: c.carId, time: l.time, game: "iracing", created: NOW - (i + n) * DAY }; }).filter(Boolean) })) };
    // "Invite a friend": a code, three friends invited (one in their first week, one month earned), saved for when Pro starts
    // the most active leagues (Home and the Leagues hub): six invented Discord leagues, with last read's places in `prev`
    if (p === "/community/leagues/found") {
      const col = [["#ff8a00", "#d9480f"], ["#3b82f6", "#1e3a8a"], ["#a855f7", "#581c87"], ["#ef4444", "#7f1d1d"], ["#a16207", "#3f2a06"], ["#10b981", "#064e3b"]];
      const art = ['<path d="M10 28h20l-4-8H14z" fill="#fff"/><circle cx="15" cy="29" r="3" fill="#fff"/><circle cx="26" cy="29" r="3" fill="#fff"/>', '<path d="M20 9l3 7 7 .6-5.4 4.6 1.7 7-6.3-3.8-6.3 3.8 1.7-7L10 16.6l7-.6z" fill="#fff"/>', '<path d="M8 22h24M12 16h16M14 28h12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>', '<ellipse cx="20" cy="20" rx="11" ry="7" fill="none" stroke="#fff" stroke-width="3"/><circle cx="20" cy="20" r="2.5" fill="#fff"/>', '<path d="M9 27c4-10 18-10 22 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="15" r="3" fill="#fff"/>', '<path d="M12 10h16v6l-8 14-8-14z" fill="#fff"/>'];
      const icon = (k) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${col[k][0]}"/><stop offset="1" stop-color="${col[k][1]}"/></linearGradient></defs><rect width="40" height="40" rx="12" fill="url(#g)"/>${art[k]}</svg>`);
      const L = [["Endurance Hub Racing", ["sports_car"], 412, 3810, 3, "Weekly GT3 and GTP endurance, all splits, new drivers welcome", "iRacing", 3, 4],
        ["Midweek Sprint League", ["sports_car", "formula_car"], 287, 2240, 2, "Wednesday sprints in the MX-5 and F4, two splits", "iRacingLeagues", 24, 2],
        ["Open Wheel Collective", ["formula_car"], 236, 1975, 4, "Season 6 sign-ups open, Super Formula Lights and F3", "iRacing", 5, 1],
        ["Short Track Thursday", ["oval"], 190, 2602, 2, "Late Models at short tracks, live broadcast every week", "iRacingLeagues", 48, 3],
        ["Dirt Night Series", ["dirt_oval"], 121, 980, 0, "New league, sprint cars and late models on dirt", "iRacing", 8, 1],
        ["Sunday Touring Cup", ["sports_car"], 96, 1430, 5, "TCR and GT4 on Sundays, clean racing first", "iRacingLeagues", 96, 2]];
      const leagues = L.map(([name, cats, online, members, , title, sub, h, posts], k) => ({ guild: "demoguild" + k, name, cats, online, members, title, sub, posts, icon: icon(k),
        posted: NOW - h * 3600e3, url: "https://www.reddit.com/r/" + sub + "/", invite: "https://discord.gg/" }));
      const prev = {}; L.forEach((x, k) => { if (x[4]) prev["demoguild" + k] = x[4]; });
      return { updated: NOW - 2 * 3600e3, leagues, prev };
    }
    if (p === "/community/invite") return { gate: false, code: "K7PX4QMB", link: "https://pitlanehq.app/?ref=invite-k7px4qmb", rule: { days: 7, drives: 1, within: 60, months: 1, max: 12 },
      friends: [{ name: NAMES[2], state: "waiting", since: NOW - 4 * DAY, days: 4, drives: 1 }, { name: NAMES[6], state: "given", since: NOW - 20 * DAY }, { name: NAMES[8], state: "given", since: NOW - 30 * DAY }],
      given: 2, waiting: 1, banked: 2, proUntil: 0, canClaim: false };
    if (p === "/community/friends/laps") return { laps: [6, 8].map((k) => board(q.get("trackId"), q.get("carId"))[k]).filter(Boolean).map((l) => ({ id: l.id, alias: l.alias, time: l.time, sectors: l.sectors })) };
    if (p === "/community/admin/analytics") {
      const days = Math.max(1, Math.min(90, +q.get("days") || 30)), r = rng(7), d = (i) => new Date(NOW - i * DAY).toISOString().slice(0, 10);
      const keys = ["view:home", "view:laps", "view:coach", "view:live", "view:community", "view:races", "view:overlays", "act:race_summary", "act:coach_report", "act:leaderboard", "act:overlay_open", "act:track_page"];
      return { days, active: Array.from({ length: days }, (_, i) => ({ day: d(days - 1 - i), users: 6 + r.i(0, 14) })),
        byDevice: [{ device: "pc", users: 31, n: 2400 }, { device: "web", users: 22, n: 1310 }, { device: "android", users: 9, n: 420 }, { device: "ios", users: 4, n: 150 }],
        top: keys.map((key, i) => ({ key, users: 30 - i * 2, n: 900 - i * 60 })), games: [{ game: "iracing", users: 28, n: 310 }, { game: "lmu", users: 7, n: 64 }],
        versions: [{ device: "pc", v: "0.9.14", devices: 24 }, { device: "web", v: "0.9.14", devices: 18 }, { device: "pc", v: "0.9.13", devices: 5 }],
        users: NAMES.slice(0, 8).map((nick, i) => ({ id: "acct_demo" + i, nick, lastSeen: NOW - i * 5 * 3600e3, devices: i % 2 ? ["web"] : ["pc", "web"], n: 400 - i * 40, top: keys.slice(i % 3, (i % 3) + 4).map((key, j) => ({ key, n: 60 - j * 12 })) })) };
    }
    // the Analytics section's weekly numbers (cloud/src/metrics.js): invented weeks in the shape the server answers
    if (p === "/community/admin/metrics") {
      const n = [4, 8, 12, 26].includes(+q.get("weeks")) ? +q.get("weeks") : 12, r0 = rng(11), r = () => r0.f(0, 1), today = new Date(NOW).toISOString().slice(0, 10);
      const mon = (t) => { const d = new Date(t); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
      const weeks = [...Array(n).keys()].map((i) => mon(NOW - (n - 1 - i) * 7 * DAY)), S = {}, put = (k, f) => { S[k] = weeks.map((_, i) => Math.max(0, Math.round(f(i)))); };
      put("users", (i) => 20 + i * 4 + r() * 6); put("new", (i) => 22 + i + r() * 10); put("drove", (i) => 14 + i * 3 + r() * 4); put("raced", (i) => 6 + i * 1.5 + r() * 3);
      put("visits", (i) => 180 + i * 18 + r() * 60); put("downloads", (i) => 30 + i * 2 + r() * 10); put("uninstalls", () => r() * 4); put("supporters", (i) => (i > n - 4 ? 2 : 0));
      put("c:n", (i) => S.new[i]); put("c:up2", (i) => S.new[i] * 0.6); put("c:up7", (i) => S.new[i] * 0.72); put("c:mature", (i) => (i < n - 2 ? S.new[i] : 0)); put("c:kept", (i) => S["c:mature"][i] * (0.2 + r() * 0.1)); put("c:med_h", () => 1 + r() * 5);
      for (const [k, share] of [["opened", 0.9], ["drove", 0.7], ["laps", 0.55], ["raced", 0.3], ["coach", 0.25], ["overlay", 0.35], ["community", 0.3], ["second", 0.12]]) for (const [w, f] of [[1, 0.7], [2, 0.85], [7, 1]]) put("s:" + k + ":" + w, (i) => S.new[i] * share * f);
      for (const k of ["k:act:donate_shown", "k:act:donate_bar", "k:act:donate_bar_no", "k:act:pro_info", "k:act:invite_menu", "invited", "anon_pcs", "anon_sessions", "donations"]) put(k, (i) => (i > n - 3 ? 1 + r() * (k.includes("shown") ? 30 : 5) : 0));
      for (const f of ["race_fuel", "community_compare", "plan_map", "ask_coach"]) { put("kn:act:pro_badge." + f, (i) => (i > n - 3 ? 2 + r() * 9 : 0)); put("k:act:pro_badge." + f, (i) => (i > n - 3 ? 1 + r() * 5 : 0)); }
      put("donated|cur:usd", (i) => S.donations[i] * 500);
      const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null), days = weeks.map((w, i) => (i === n - 1 ? Math.max(1, Math.round((NOW - Date.parse(w)) / DAY) + 1) : 7));
      const T = { users: [120, 300], new: [60, 120], kept: [30, 40], up7: [80, 85], raced_share: [null, 50], visits_day: [80, 150], supporters: [6, 15] };
      const monday = [{ k: "users", v: S.users, t: T.users }, { k: "new", v: S.new, t: T.new }, { k: "kept", unit: "%", v: weeks.map((_, i) => pct(S["c:kept"][i], S["c:mature"][i])), n: S["c:mature"], of: S["c:n"], t: T.kept },
        { k: "up7", unit: "%", v: weeks.map((_, i) => pct(S["c:up7"][i], S["c:n"][i])), n: S["c:n"], t: T.up7 }, { k: "raced", v: S.raced, share: weeks.map((_, i) => pct(S.raced[i], S.drove[i])), n: S.drove, t: T.raced_share, tk: "share" },
        { k: "visits_day", v: weeks.map((_, i) => Math.round((S.visits[i] / days[i]) * 10) / 10), t: T.visits_day }, { k: "supporters", v: S.supporters, t: T.supporters }];
      const cohorts = [];
      weeks.forEach((w, i) => { for (const split of ["", "game:lmu", "game:iracing"]) { const size = Math.max(1, Math.round(S.new[i] * (split ? (split === "game:lmu" ? 0.6 : 0.25) : 1))); for (let wk = 0; wk <= Math.min(12, n - 1 - i); wk++) { const a = Math.round(size * (wk ? (split === "game:iracing" ? 0.5 : 0.3) / Math.sqrt(wk) : 0.92)); cohorts.push({ week: w, split, wk, size, ripe: wk < n - 1 - i ? size : Math.round(size / 2), active: a, drove: Math.round(a * 0.8), raced: Math.round(a * 0.35) }); } } });
      const all = S["c:mature"].reduce((a, b) => a + b, 0), kept = S["c:kept"].reduce((a, b) => a + b, 0);
      const stay = [["drove", 0.7, 0.3], ["raced", 0.3, 0.44], ["community", 0.3, 0.31], ["overlay", 0.35, 0.3], ["coach", 0.25, 0.24], ["laps", 0.55, 0.27], ["second", 0.1, 0.4], ["iracing", 0.22, 0.5], ["lmu", 0.6, 0.22], ["autostart", 0.05, 0.6]].map(([k, sh, rt]) => { const nn = Math.round(all * sh), kk = Math.min(kept, Math.round(nn * rt)); return { k, n: nn, kept: kk, rate: pct(kk, nn), restN: all - nn, restKept: kept - kk, restRate: pct(kept - kk, all - nn) }; });
      const links = [{ tag: "lmu-post-nov", name: "LMU post November", place: "r/LeMansUltimateWEC", created: NOW - 9 * DAY }];
      const sources = [["chatgpt", "ai", 211, 13, 9, 10, 4], ["google", "search", 146, 9, 6, 7, 2], ["lmu-post-nov", "other", 90, 11, 8, 6, 2], ["direct", "direct", 420, 30, 18, 24, 5], ["msstore", "store", 0, 6, 4, 5, 1], ["reddit", "community", 25, 2, 1, 2, 0]].map(([src, kind, visits, accounts, up2, mature, k]) => ({ src, kind, visits, accounts, up2, mature, kept: k, link: src === "lmu-post-nov" ? { name: links[0].name, place: links[0].place } : undefined }));
      const steps = { n: S["c:n"], med: S["c:med_h"], rows: ["opened", "drove", "laps", "raced", "coach", "overlay", "community", "second"].map((k) => ({ k, w1: S["s:" + k + ":1"], w2: S["s:" + k + ":2"], w7: S["s:" + k + ":7"] })) };
      return { today, weeks, days, monday, targets: { d1: "2026-12-20", d2: "2027-01-31", t: T }, series: S, cohorts, stay, stayAll: { n: all, kept, rate: pct(kept, all) }, sources, steps, job: { at: NOW - 5 * 3600e3, weeks: 15, read: 5210, wrote: 84, ms: 240 }, aud: +q.get("aud") || 0, links };
    }
    if (p === "/community/admin/metrics/health") { const d = (i) => new Date(NOW - i * DAY).toISOString().slice(0, 10), f = (fam, device, ago, users7) => ({ fam, device, last: ago == null ? "" : d(ago), users7, ago, state: ago == null ? "never" : ago >= 3 ? "quiet" : "ok" });
      return { today: d(0), families: [f("view", "pc", 0, 41), f("view", "web", 0, 18), f("view", "android", 1, 3), f("view", "ios", 0, 2), f("act", "pc", 0, 36), f("act", "web", 0, 12), f("act", "android", 5, 0), f("act", "ios", 1, 2), f("game", "pc", 0, 33), f("game", "web", 0, 9), f("live", "pc", 0, 12), f("live", "web", 1, 4), f("ov", "pc", 0, 9), f("ovrace", "pc", 0, 7), f("run", "pc", null, 0), f("set", "pc", null, 0), f("pro_use", "pc", null, 0), f("pro_use", "web", null, 0)],
        versions: [{ device: "pc", v: "0.9.22", devices: 31 }, { device: "pc", v: "0.9.21", devices: 9 }, { device: "web", v: "0.9.22", devices: 14 }], reads: [{ day: d(0), route: "cron daily", reqs: 1, read: 61200, written: 310 }, { day: d(0), route: "GET /community/admin/metrics", reqs: 6, read: 2900, written: 0 }], job: { at: NOW - 5 * 3600e3, weeks: 15, read: 5210, wrote: 84, ms: 240 }, since: { usage: "2026-10-28" } }; }
    if (p === "/community/admin/links") return { links: [{ tag: "lmu-post-nov", name: "LMU post November", place: "r/LeMansUltimateWEC", created: NOW - 9 * DAY }] };
    if (p === "/community/admin/metrics/account") { const d = (i) => new Date(NOW - i * DAY).toISOString().slice(0, 10); return { id: q.get("id"), src: "chatgpt", page: "landing", country: "ES", steps: [{ k: "account", day: d(20) }, { k: "opened", day: d(20) }, { k: "drove", day: d(20) }, { k: "laps", day: d(20) }, { k: "raced", day: d(18) }, { k: "coach", day: d(17) }, { k: "overlay", day: d(15) }, { k: "phone", day: d(9) }] }; }
    if (p === "/community/admin/users") return { users: NAMES.slice(0, 8).map((display, i) => ({ id: "acct_demo" + i, display, created: NOW - (40 + i * 30) * DAY, verified: 1, twoFactor: i % 3 === 0 ? 1 : 0, supporter: i === 2 ? 1 : 0, supporterSrc: "manual", sessions: 120 - i * 12, lastSession: NOW - i * DAY, laps: 30 - i * 3, leagues: i % 4 === 0 ? 1 : 0, guests: 0, admin: false })) };
    if (p === "/community/admin/feedback") {
      const items = NAMES.slice(0, 5).map((nick, i) => ({ id: "fb" + i, accountId: "acct_demo" + i, nick, created: NOW - i * 9 * 3600e3, device: ["pc", "web", "pc", "web", "pc"][i], v: "0.9.14", rating: [5, 4, null, 3, 5][i], view: ["coach", "home", "menu:laps", "community", "live"][i],
        text: ["The coach plan helped me at Spa, I found three tenths in two days.", "I would like to compare two laps of different sessions more easily.", "The relative overlay is great. Could it show the pace column by default?", "Le Mans Ultimate works, but the sectors took a lap to show up.", "Love the rev beep."][i] }));
      return { items, count: items.length, avg: 4.3 };
    }
    return undefined;
  }

  // ---------- a live race to look at (Live, overlays): 10 invented drivers at Spa, the player is car 3 ----------
  const LIVE = (() => {
    const c = COMBOS[0], tr = trace(c, c.lap, 1), n = tr.d.length, bin = tr.bin, L = n * bin, N = 10, ME = 3;
    const pace = Array.from({ length: N }, (_, i) => c.lap * (1 + (i - 3) * 0.0035)), off = Array.from({ length: N }, (_, i) => -i * 0.012);
    const times = tr.d.map((r) => r[5]), lapT = times[n - 1];
    // where a car is after `f` of its lap (by time): the row whose lap time matches
    const rowAt = (f) => { const t = f * lapT; let lo = 0, hi = n - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (times[m] < t) lo = m + 1; else hi = m; } return lo; };
    const yaml = () => {
      let y = `---\nWeekendInfo:\n TrackName: demospa\n TrackID: ${c.trackId}\n TrackLength: ${(c.len / 1000).toFixed(2)} km\n TrackDisplayName: ${c.track}\n TrackDisplayShortName: Spa\n TrackConfigName: ${c.cfg}\n TrackNumTurns: 19\n TrackSurfaceTemp: 27.80 C\n TrackAirTemp: 19.40 C\n SeriesID: 0\n SubSessionID: 0\n Official: 0\n EventType: Race\n Category: Road\n NumCarClasses: 1\nSessionInfo:\n CurrentSessionNum: 0\n Sessions:\n - SessionNum: 0\n   SessionLaps: 20\n   SessionTime: unlimited\n   SessionType: Race\n   SessionName: RACE\nDriverInfo:\n DriverCarIdx: ${ME}\n DriverCarIdleRPM: 1200.000\n DriverCarRedLine: 9200.000\n DriverCarFuelMaxLtr: 120.000\n DriverCarMaxFuelPct: 1.000\n DriverCarSLShiftRPM: 8800.000\n DriverCarEstLapTime: ${c.lap.toFixed(4)}\n DriverCarGearNumForward: 6\n Drivers:\n`;
      for (let i = 0; i < N; i++) y += ` - CarIdx: ${i}\n   UserName: ${NAMES[i]}\n   AbbrevName: ${NAMES[i]}\n   UserID: ${500000 + i}\n   CarNumber: "${10 + i}"\n   CarNumberRaw: ${10 + i}\n   CarClassID: 1\n   CarID: ${c.carId}\n   CarScreenName: ${c.car}\n   CarClassShortName: GT3\n   CarClassColor: 0xffda59\n   IRating: ${2600 - i * 90}\n   LicString: A ${(3.2 - i * 0.1).toFixed(2)}\n   FlairName: ${["Spain","Germany","Brazil","United States","Italy","France","United Kingdom","Netherlands","Portugal","Japan","Australia","Belgium"][i % 12]}\n   IsSpectator: 0\n   CarIsPaceCar: 0\n   CurDriverIncidentCount: ${i % 4}\n`;
      return y + "...\n";
    };
    const frame = (t) => {
      const prog = pace.map((p, i) => t / p + 1 + off[i]), order = prog.map((_, i) => i).sort((a, b) => prog[b] - prog[a]), pos = []; order.forEach((ci, k) => (pos[ci] = k + 1));
      const lead = prog[order[0]], A = (f) => Array.from({ length: 64 }, (_, i) => (i < N ? f(i) : -1));
      const mp = prog[ME], lapN = Math.floor(mp), frac = mp - lapN, ri = rowAt(frac), r = tr.d[ri], nx = tr.d[Math.min(n - 1, ri + 1)];
      const sp = r[0], yaw = Math.atan2(tr.y[Math.min(n - 1, ri + 1)] - tr.y[ri], tr.x[Math.min(n - 1, ri + 1)] - tr.x[ri]);
      const gear = Math.max(1, Math.min(6, r[3])), rpm = Math.min(9100, 3500 + (sp % 15) / 15 * 5400), fuel = Math.max(4, 110 - (mp - 1) * 2.9);
      const T = {
        SessionTime: t, SessionState: 4, SessionNum: 0, SessionFlags: 0, SessionLapsTotal: 20, SessionLapsRemainEx: Math.max(0, 20 - lapN), SessionTimeRemain: 604800,
        PlayerCarIdx: ME, PlayerCarPosition: pos[ME], PlayerCarClassPosition: pos[ME], IsOnTrack: 1, OnPitRoad: 0, PlayerTrackSurface: 3, CarLeftRight: 1,
        Speed: sp, RPM: rpm, Gear: gear, Throttle: r[1], Brake: r[2], Clutch: 1, SteeringWheelAngle: r[4], LongAccel: (nx[0] - sp) * 3,
        Lap: lapN, LapCompleted: lapN - 1, LapDist: frac * L, LapDistPct: frac, LapCurrentLapTime: r[5] * pace[ME] / lapT,
        LapLastLapTime: lapN > 1 ? pace[ME] + 0.21 * Math.sin(lapN) : -1, LapBestLapTime: lapN > 1 ? pace[ME] - 0.15 : -1,
        LapDeltaToBestLap: 0.25 * Math.sin(frac * 6.283 + lapN), LapDeltaToBestLap_OK: lapN > 1, LapDeltaToSessionBestLap: 0.6 + 0.25 * Math.sin(frac * 6.283), LapDeltaToSessionBestLap_OK: lapN > 1,
        LapDeltaToOptimalLap: 0.4 * Math.sin(frac * 6.283), LapDeltaToOptimalLap_OK: lapN > 1,
        FuelLevel: fuel, FuelLevelPct: fuel / 120, FuelUsePerHour: 75, FuelUsePerLap: 2.9, WaterTemp: 88, OilTemp: 102, OilPress: 5.1, Voltage: 13.8, AirTemp: 19.4, TrackTempCrew: 27.8,
        dcBrakeBias: 54.5, dcTractionControl: 3, dcTractionControlMax: 12, dcABS: 4, dcABSMax: 12, dcEngineMap: 1, dcEngineMapMax: 8,
        dcAntiRollFront: 3, dcAntiRollRear: 4, dcFuelMixture: 2, dcDiffEntry: 5, dcDiffMiddle: 3, dcDiffExit: 6, dcPitSpeedLimiterToggle: 0,
        WindVel: 3.5, WindDir: 0.8, Skies: 1, RelativeHumidity: 0.62, SessionTimeOfDay: 52320 + (t % 60), SolarAltitude: 0.7,
        FrameRate: 118 + 6 * Math.sin(t / 3), GpuUsage: 0.71 + 0.05 * Math.sin(t / 5), CpuUsageFG: 0.34, ChanLatency: 0.041, ChanQuality: 0.98,
        Yaw: yaw, YawNorth: yaw, VelocityX: sp, VelocityY: 0, PlayerCarMyIncidentCount: 2, PlayerCarDriverIncidentCount: 2, Precipitation: 0, TrackWetness: 1, PlayerTireCompound: 0,
        CarIdxLap: A((i) => Math.floor(prog[i])), CarIdxLapCompleted: A((i) => Math.floor(prog[i]) - 1), CarIdxLapDistPct: A((i) => prog[i] % 1),
        CarIdxPosition: A((i) => pos[i]), CarIdxClassPosition: A((i) => pos[i]), CarIdxEstTime: A((i) => (prog[i] % 1) * pace[i]), CarIdxF2Time: A((i) => (lead - prog[i]) * pace[i]),
        CarIdxLastLapTime: A((i) => (prog[i] > 2 ? pace[i] : -1)), CarIdxBestLapTime: A((i) => (prog[i] > 2 ? pace[i] - 0.1 : -1)), CarIdxOnPitRoad: A(() => 0), CarIdxTrackSurface: A(() => 3), CarIdxTireCompound: A(() => 0),
      };
      ["LF", "RF", "LR", "RR"].forEach((w, k) => { ["CL", "CM", "CR"].forEach((z, j) => (T[w + "temp" + z] = 82 + k * 3 + j * 2 + 4 * Math.sin(t / 9 + k))); ["L", "M", "R"].forEach((z, j) => (T[w + "wear" + z] = Math.max(0.6, 1 - (mp - 1) * 0.012 - j * 0.004))); T[w + "pressure"] = 172 + k; T[w + "coldPressure"] = 165; });
      return T;
    };
    // the track's outline for the Live map, so it shows at once instead of after a lap
    const shape = () => ({ x: tr.x.slice(), y: tr.y.slice(), len: L, trackId: c.trackId, name: c.track });
    return { yaml, frame, shape };
  })();


  // Team mode (docs/spec/team.md): a team of four with a long race at Spa going on (driver C in the car) and a practice at
  // Road Atlanta two days ago. Answers the Team screen's actions without the server; nothing is sent or kept.
  const TEAMD = (() => {
    const ids = ["demo-me", "demo-b", "demo-c", "demo-d"], names = NAMES.slice(0, 4), TID = "d3m0a1b2c3d4";
    const spa = COMBOS[0], rat = COMBOS[3], pace = [0.3, 0.9, 0, 1.4], LAP = spa.lap + 0.4;
    const raceStart = NOW - 2.4 * 3600e3, cStart = NOW - 41 * 60e3, cLap0 = 48;
    const lapsOf = (k, c, from, to, seed) => { const r = rng(seed), out = []; for (let n = from; n <= to; n++) { const first = n === from && n > 1; out.push({ n, t: +(c.lap + pace[k] + r.f(-0.35, 0.95) + (n === 1 ? 6 : 0) + (first ? 21 : 0)).toFixed(3), valid: r.f(0, 1) > 0.06 }); } return out; };
    const entry = (k, c, sid, kind, started, from, to, t0) => { const laps = lapsOf(k, c, from, to, hash(sid + k + from)), ok = laps.filter((l) => l.valid);
      return { account: ids[k], name: names[k], key: sid + ":" + t0, at: t0 + laps.length * c.lap * 1000,
        entry: { v: 1, driver: names[k], sid, game: "iracing", track: c.track, config: c.cfg, car: c.car, kind, started, stint: { from: t0, to: t0 + laps.length * c.lap * 1000, lapFrom: from, lapTo: to }, laps, best: ok.length ? Math.min(...ok.map((l) => l.t)) : 0, fuelPerLap: 2.9 } }; };
    const cNow = () => Math.max(0, Math.floor((Date.now() - cStart) / 1000 / LAP));
    const log = () => {
      const L = [entry(0, spa, "demo-spa-race", "Race", raceStart, 1, 23, raceStart), entry(1, spa, "demo-spa-race", "Race", raceStart, 24, 47, raceStart + 23 * LAP * 1000)];
      const n = cNow(); if (n > 0) L.push(entry(2, spa, "demo-spa-race", "Race", raceStart, cLap0, cLap0 + n - 1, cStart));
      const p0 = NOW - 2 * DAY - 3 * 3600e3; L.push(entry(0, rat, "demo-rat-prac", "Practice", p0, 1, 9, p0), entry(3, rat, "demo-rat-prac", "Practice", p0, 10, 22, p0 + 9 * rat.lap * 1000), entry(1, rat, "demo-rat-prac", "Practice", p0, 23, 31, p0 + 22 * rat.lap * 1000));
      return L.sort((a, b) => b.at - a.at);
    };
    const list = () => ({ teams: [{ id: TID, name: "Demo Endurance", role: "owner", owner: ids[0], invite: TID + ".DEMQ2W7RT8YK4HN6PXJ3", room: "0".repeat(32),
      members: ids.map((id, k) => ({ id, name: names[k], role: k ? "member" : "owner", joined: NOW - (40 - k * 3) * DAY })) }], active: TID });
    function team(op) {
      if (op === "list") return list();
      if (op === "log") return { log: log() };
      if (op === "create") return { id: TID, invite: TID + ".DEMQ2W7RT8YK4HN6PXJ3" };
      if (op === "join") return { id: TID, name: "Demo Endurance" };
      return { ok: true };
    }
    // the live "team" event of each PC: C in the car, A and B online
    function live() {
      const n = cNow(), lap = cLap0 + n, fuel = Math.max(3, 104 - n * 2.9 - ((Date.now() - cStart) / 1000 % LAP) / LAP * 2.9), at = Date.now(), base = { sid: "demo-spa-race", game: "iracing", track: spa.track, config: spa.cfg, car: spa.car, kind: "Race" };
      const ls = lapsOf(2, spa, cLap0, Math.max(cLap0, lap - 1), hash("demo-spa-race2" + cLap0)), ok = ls.filter((l) => l.valid);
      const ev = {
        [ids[2]]: { at, d: { ...base, driver: names[2], inCar: true, lap, stintStart: cStart, stintLaps: n, fuel, fuelPerLap: 2.9, lapsLeft: fuel / 2.9, pitLap: lap + Math.floor(fuel / 2.9), sessionLeft: Math.max(0, 6 * 3600 - (Date.now() - raceStart) / 1000), lastLap: n ? ls[ls.length - 1].t : -1, best: ok.length ? Math.min(...ok.map((l) => l.t)) : -1 } },
        [ids[0]]: { at, d: { ...base, driver: names[0], inCar: false } },
        [ids[1]]: { at, d: { ...base, driver: names[1], inCar: false } },
      };
      return { ev, pcs: [0, 1, 2].map((k) => ({ id: ids[k], name: names[k] })) };
    }
    return { team, live };
  })();

  window.PITLANE_DEMO = { get, liveSession: LIVE.yaml, liveFrame: LIVE.frame, liveShape: LIVE.shape, team: TEAMD.team, teamLive: TEAMD.live };
})();
