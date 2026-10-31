// iRacing's quarterly season schedule PDF → the season the planner reads (the same shape the agent published from the
// Data API in companion.go publishSeason: seasons[] with schedules[] and race_time_descriptors, plus tracks, cars and
// classes), so the planner works without an iRacing API client. One parser for the admin page (the PDF read in the
// browser by pdf.js, pdfText below) and for tools/season-import.mjs (the PDF read by pdftotext).
//
// The PDF has no iRacing ids: tracks, cars, series and classes get stable ids made from their names, so a series
// keeps its id (and the drivers' favourites) from one season to the next.

const DAY = 864e5;
const CATS = { OVAL: "oval", "SPORTS CAR": "sports_car", "FORMULA CAR": "formula_car", "DIRT OVAL": "dirt_oval", "DIRT ROAD": "dirt_road", UNRANKED: "" };
const LIC = { rookie: 1, d: 2, c: 3, b: 4, a: 5, pro: 6 };
const DAYS = [
  [/^sun/i, 0], [/^mon/i, 1], [/^tue/i, 2], [/^wed/i, 3], [/^thu/i, 4], [/^fri/i, 5], [/^sat/i, 6],
];
const DAY_RE = /\b(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/gi;

// a stable positive id for a name (FNV-1a, kept above the ids iRacing uses)
export function nameId(s) {
  let h = 0x811c9dc5;
  for (const c of String(s).toLowerCase().replace(/\s+/g, " ").trim()) h = Math.imul(h ^ c.codePointAt(0), 0x01000193) >>> 0;
  return 1000000 + (h % 900000000);
}

// "Mini Stock Rookie Series by Thrustmaster - 2026 Season 4" → "Mini Stock Rookie Series by Thrustmaster"
export function seriesName(title) {
  const t = title.replace(/\s*-?\s*\b20\d\d Season(?: \d)?\b/, "").replace(/\s+-\s*$/, "").trim();
  const parts = t.split(" - ").map((x) => x.trim()).filter(Boolean);
  let n = parts.filter((x, i) => parts.indexOf(x) === i).join(" - ");
  // "… - Fixed Fixed" or "… - Fixed - 2026 Season 4 Fixed": one "Fixed"
  while (/\bFixed\b.*\bFixed$/.test(n)) n = n.replace(/\s*-?\s*Fixed$/, "");
  return n;
}

// "Charlotte Motor Speedway - Oval" → ["Charlotte Motor Speedway", "Oval"]
export function splitTrack(t) {
  const i = t.indexOf(" - ");
  if (i < 0) return [t.trim(), ""];
  // (some layouts come doubled: "Iowa Speedway - Oval - 2011 - Oval - 2011")
  let c = t.slice(i + 3).trim();
  const h = (c.length - 3) / 2;
  if (c.slice(h, h + 3) === " - " && c.slice(0, h) === c.slice(h + 3)) c = c.slice(0, h);
  return [t.slice(0, i).trim(), c];
}

// the minutes east of GMT a clock time in New York has on that day (for "8pm ET")
function etOffset(ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - ms) / 60e3;
}

// "Races every 2 hours at :15 past" → { repeating, first_session_time, repeat_minutes }
// "Races Fri & Sun at 10, 19 GMT & Sat & Mon at 1, 4 GMT" → { slots: [{ day, h, m, tz }] }
// anything else (e.g. "4 Timeslots Per Week") → null: the planner then shows no times for it
export function parseRaceTimes(line) {
  let s = String(line || "").split("|")[0].trim();
  const r = s.match(/\bRaces?\b(.*)$/i);
  if (r) s = r[1];
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return null;
  DAY_RE.lastIndex = 0;
  if (DAY_RE.test(s)) {
    const tz = /\bET\b|eastern/i.test(s) ? "ET" : "GMT";
    const groups = [];
    let g = null;
    for (const tok of s.matchAll(/\b(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*\b|\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi)) {
      if (tok[1] === undefined) {
        const day = DAYS.find(([re]) => re.test(tok[0]))[1];
        if (!g || g.times.length) groups.push((g = { days: [], times: [] }));
        g.days.push(day);
      } else if (g) {
        let h = +tok[1];
        const m = tok[2] ? +tok[2] : 0, ap = (tok[3] || "").toLowerCase();
        if (ap === "pm" && h < 12) h += 12;
        if (ap === "am" && h === 12) h = 0;
        if (h < 24 && m < 60) g.times.push([h, m]);
      }
    }
    const slots = groups.flatMap((x) => x.days.flatMap((day) => x.times.map(([h, m]) => ({ day, h, m, tz }))));
    return slots.length ? { slots } : null;
  }
  const low = s.toLowerCase();
  let every = null;
  let m;
  if ((m = low.match(/every (\d+) min/))) every = +m[1];
  else if (/every thirty min/.test(low)) every = 30;
  else if ((m = low.match(/every (?:odd |even |other )?(\d+) hours?/))) every = +m[1] * 60;
  else if (/every hour|hourly|every other hour/.test(low)) every = /every other hour/.test(low) ? 120 : 60;
  const offs = [];
  for (const x of low.matchAll(/:(\d{1,2})\b/g)) offs.push(+x[1]);
  for (const x of low.matchAll(/(?:^|[^:\d])(\d{1,2}) (?:past|after)\b/g)) offs.push(+x[1]);
  for (const x of low.matchAll(/(?:&|and) (\d{2})\b/g)) offs.push(+x[1]);
  if (/half past/.test(low)) offs.push(30);
  if (/on the hour|top of the hour|on the 00\b/.test(low)) offs.push(0);
  const uniq = [...new Set(offs.filter((x) => x < 60))].sort((a, b) => a - b);
  if (every == null) {
    if (uniq.length < 2) return null;
    every = 60 / uniq.length;
  } else if (every === 60 && uniq.length > 1) every = 60 / uniq.length;
  if (!(every > 0) || every > 24 * 60) return null;
  let first = uniq.length ? uniq[0] : 0;
  if (/\bodd\b/.test(low) && every >= 120) first += 60;
  const hh = String(Math.floor(first / 60)).padStart(2, "0"), mm = String(first % 60).padStart(2, "0");
  return { repeating: true, first_session_time: `${hh}:${mm}:00`, repeat_minutes: every };
}

// the session start times of the slots inside one week, as ISO strings
function slotTimes(slots, from, to) {
  const out = [];
  for (let d = from - DAY; d < to; d += DAY) {
    const wd = new Date(d).getUTCDay();
    for (const s of slots) {
      if (s.day !== wd) continue;
      let t = d + (s.h * 60 + s.m) * 60e3;
      if (s.tz === "ET") t -= etOffset(t) * 60e3;
      if (t >= from && t < to) out.push(t);
    }
  }
  return [...new Set(out)].sort((a, b) => a - b).map((t) => new Date(t).toISOString().replace(".000Z", "Z"));
}

const isNum = (l) => /^\d+$/.test(l);

// the schedule's text (pdftotext's default output) → the planner's season
export function parseSchedule(text) {
  // (pdftotext writes some hyphens as \x02)
  const lines = text.replace(/\r/g, "").replace(/\x02/g, "-").split("\n").map((l) => l.replace(/\s+/g, " ").trim());
  // the contents at the start list every series ("Name . . . . .") under its category and licence class: they say
  // where each series starts in the pages after (the headings at the top of those pages can be a page late)
  const toc = new Map();
  let i = 0, cat = "", lic = 1;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (!/ \. \. \./.test(l)) {
      if (toc.size && CATS[l] !== undefined) break;
      continue;
    }
    const t = l.replace(/( \.)+\s*\d*$/, "").trim();
    const cm = t.match(/^([RDCBA]) Class Series \((.+)\)$/);
    if (CATS[t] !== undefined) cat = CATS[t];
    else if (cm) lic = { R: 1, D: 2, C: 3, B: 4, A: 5 }[cm[1]];
    else toc.set(t, { cat, lic });
  }
  const series = [];
  let cur = null;
  const isLen = (x) => /^(laps?|mins?|minutes)$/i.test(x || "");
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (!l || l === "Current iRacing Race Schedule" || CATS[l] !== undefined || /^[RDCBA] Class Series \(.+\)$/.test(l)) continue;
    // a page number: alone, before an empty line (a year or a race length broken over two lines is not)
    if (isNum(l) && !lines[i + 1]) continue;
    const two = l + " " + (lines[i + 1] || "");
    const title = toc.has(l) ? l : toc.has(two) ? two : null;
    if (title) {
      if (title === two) i++;
      cur = { title, ...toc.get(title), cars: [], timeLines: [], weeks: [], info: [], state: "cars" };
      series.push(cur);
      continue;
    }
    if (!cur) continue;
    if (cur.state === "cars") {
      if (/ --> /.test(l)) {
        const lm = l.match(/^(?:Class )?(Rookie|Pro|[DCBA])\b/i);
        // the licence a driver needs ("Class B 4.0 --> Pro/WC 4.0"), what the planner checks; else the contents' class
        if (lm) cur.lic = LIC[lm[1].toLowerCase()] || cur.lic;
        cur.state = "times";
      } else cur.cars.push(l);
      continue;
    }
    if (cur.state === "times") {
      if (/^Min entries/i.test(l)) { cur.info.push(l); cur.state = "info"; } else cur.timeLines.push(l);
      continue;
    }
    const wm = l.match(/^Week (\d+) \((\d{4}-\d{2}-\d{2})\) (.+)$/);
    if (wm) {
      cur.weeks.push({ n: +wm[1], date: wm[2], track: wm[3], cars: [], text: [], laps: null, mins: null, simDate: false });
      cur.state = "week";
      continue;
    }
    if (cur.state === "info") { cur.info.push(l); continue; }
    const w = cur.weeks.at(-1);
    if (!w.simDate) {
      // the lines between the week and the sim's date: the week's cars, or the end of a long track name
      if (/^\(\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}/.test(l)) w.simDate = true;
      else if (/see race week/i.test(cur.cars.join(" "))) w.cars.push(l);
      else w.track += " " + l;
      continue;
    }
    let len = l.match(/^(\d+) (laps?|mins?|minutes)$/i);
    if (!len && isNum(l) && isLen(lines[i + 1])) len = [l, l, lines[++i]];
    if (len) {
      if (/^lap/i.test(len[2])) w.laps = +len[1];
      else w.mins = +len[1];
      continue;
    }
    w.text.push(l);
  }
  const { season, problems } = build(series);
  const found = new Set(series.map((x) => x.title));
  for (const t of toc.keys()) if (!found.has(t)) problems.push({ series: t, why: "listed in the contents but not found in the pages" });
  return { season, problems };
}

function build(list) {
  const problems = [];
  const tracks = new Map(), cars = new Map(), seasons = [], classes = [];
  const carId = (name) => {
    const n = name.trim();
    const id = nameId("car:" + n);
    if (!cars.has(id)) cars.set(id, { car_id: id, car_name: n, car_name_abbreviated: "", package_id: null, free_with_subscription: false });
    return id;
  };
  const splitCars = (t) => t.split(/,\s+/).map((x) => x.trim()).filter((x) => x && !/^see race week/i.test(x));
  for (const s of list) {
    if (!s.weeks.length) { problems.push({ series: s.title, why: "no weeks" }); continue; }
    const name = seriesName(s.title), sid = nameId("series:" + name);
    const timeLine = s.timeLines.join(" ");
    const rt = parseRaceTimes(timeLine);
    if (!rt) problems.push({ series: name, why: "race times not understood", text: timeLine });
    const seriesCars = splitCars(s.cars.join(" ")).map(carId);
    const weekCars = s.weeks.map((w) => splitCars(w.cars.join(" ")).map(carId));
    const allCars = [...new Set([...seriesCars, ...weekCars.flat()])];
    const classId = nameId("class:" + name);
    classes.push({ car_class_id: classId, cars_in_class: allCars.map((car_id) => ({ car_id })) });
    const info = s.info.join(" ");
    const dq = info.match(/DQ at (\d+) incidents/i), drops = info.match(/Drops: (\d+)/i);
    const isMulti = s.weeks.some((w) => /grid by class/i.test(w.text.join(" ")));
    const schedules = s.weeks.map((w, k) => {
      const [tn, cfg] = splitTrack(w.track), tid = nameId("track:" + tn + (cfg ? " - " + cfg : ""));
      if (!tracks.has(tid)) tracks.set(tid, { track_id: tid, track_name: tn, config_name: cfg, package_id: null, free_with_subscription: false, category: s.cat || guessCat(w.track) });
      const start = Date.parse(w.date + "T00:00:00Z"), next = s.weeks[k + 1];
      const end = next ? Date.parse(next.date + "T00:00:00Z") : start + 7 * DAY;
      const t = w.text.join(" ");
      const tm = t.match(/(-?\d+)°F/), rain = t.match(/Rain chance (\d+)%/i);
      const rtd = !rt ? { repeating: false, session_times: [] }
        : rt.slots ? { repeating: false, session_times: slotTimes(rt.slots, start, end) }
        : { ...rt, start_date: w.date };
      if (rtd.session_minutes == null && w.mins) rtd.session_minutes = w.mins;
      return {
        season_id: sid, series_id: sid, series_name: name, race_week_num: w.n - 1, start_date: w.date,
        week_end_time: new Date(end).toISOString().replace(".000Z", "Z"), category: s.cat || guessCat(w.track),
        track: { track_id: tid, track_name: tn, config_name: cfg },
        race_week_cars: weekCars[k].map((car_id) => ({ car_id })),
        race_lap_limit: w.laps, race_time_limit: w.mins, race_time_descriptors: [rtd],
        weather: { weather_summary: { temp_high: tm ? +tm[1] : null, temp_low: tm ? +tm[1] : null, temp_units: 0, precip_chance: rain ? +rain[1] : 0 } },
      };
    });
    seasons.push({
      season_id: sid, series_id: sid, season_name: s.title, series_name: name, license_group: s.lic,
      fixed_setup: /\bfixed\b/i.test(s.title), official: true, multiclass: isMulti, schedule_description: timeLine,
      car_class_ids: [classId], max_weeks: s.weeks.length, drops: drops ? +drops[1] : null, incident_limit: dq ? +dq[1] : null,
      active: true, complete: false, schedules,
    });
  }
  return { season: { seasons, tracks: [...tracks.values()], cars: [...cars.values()], classes, guide: null, trackAssets: null, carAssets: null, source: "schedule-pdf" }, problems };
}

// the unranked series have no category in the PDF: the track says it
function guessCat(track) {
  return /oval|speedway|superspeedway/i.test(track) && !/road course|roval/i.test(track) ? "oval" : "sports_car";
}

// pdfText: the PDF's text as pdftotext writes it (one line per line of the page, an empty line where a gap is, the
// pages one after the other), from pdf.js (pitwall-pdf.js) in the browser
export async function pdfText(pdfjs, data) {
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise, out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p), tc = await page.getTextContent();
    const items = tc.items.filter((x) => typeof x.str === "string" && (x.str.trim() || x.hasEOL)).map((x) => ({ s: x.str, x: x.transform[4], y: x.transform[5], w: x.width, h: Math.abs(x.transform[3]) || x.height || 10 }));
    // the lines of the page: items at the same height (to a third of the text's size), top to bottom, left to right
    const rows = [];
    for (const it of items.filter((x) => x.s.trim()).sort((a, b) => b.y - a.y || a.x - b.x)) {
      const r = rows.find((r) => Math.abs(r.y - it.y) < Math.min(r.h, it.h) / 3);
      if (r) r.items.push(it); else rows.push({ y: it.y, h: it.h, items: [it] });
    }
    rows.sort((a, b) => b.y - a.y);
    // an empty line where the gap is clearly wider than the page's usual line spacing
    const gaps = rows.slice(1).map((r, k) => rows[k].y - r.y).sort((a, b) => a - b), step = gaps.length ? gaps[gaps.length >> 1] : 12;
    let last = null;
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      let line = "", end = null;
      for (const it of r.items) {
        if (end !== null && it.x - end > it.h * 0.15 && !line.endsWith(" ")) line += " ";
        line += it.s;
        end = it.x + it.w;
      }
      if (last && last.y - r.y > step * 1.6) out.push("");
      out.push(line.trim());
      last = r;
    }
    out.push("", "\f");
  }
  return out.join("\n").replace(/\n\f/g, "");
}
