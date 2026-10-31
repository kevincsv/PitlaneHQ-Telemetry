#!/usr/bin/env node
// Turns iRacing's quarterly season schedule PDF into the season the planner reads (the same shape the agent
// publishes from the Data API in companion.go publishSeason: seasons[] with schedules[] and race_time_descriptors,
// plus tracks, cars and classes), so the planner works without an iRacing API client.
//
//   node tools/season-import.mjs <schedule.pdf | schedule.txt> [--out season.json] [--check] [--publish]
//
// A .pdf goes through pdftotext (poppler) first; a .txt is that text already. --check prints the series whose race
// times were not understood (an admin reads them before publishing). --publish sends it to POST /community/season
// with the account token in PITLANE_TOKEN (an account listed in SEASON_UPLOADERS) on PITLANE_SERVER
// (https://pitlanehq.app by default).
//
// The PDF has no iRacing ids: tracks, cars, series and classes get stable ids made from their names, so a series
// keeps its id (and the drivers' favourites) from one season to the next.

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parseSchedule } from "../web/dist/pitwall-season-import.js";
export { parseSchedule, parseRaceTimes, seriesName, splitTrack, nameId } from "../web/dist/pitwall-season-import.js";

function pdftotext(file) {
  if (!/\.pdf$/i.test(file)) return readFileSync(file, "utf8");
  // a PDF that is really the text already (the schedule copied out of it)
  const raw = readFileSync(file);
  if (raw.subarray(0, 5).toString() !== "%PDF-") return raw.toString("utf8");
  try {
    return execFileSync("pdftotext", ["-enc", "UTF-8", file, "-"], { maxBuffer: 64 << 20 }).toString("utf8");
  } catch (e) {
    throw new Error("pdftotext (poppler-utils) is needed to read a PDF: " + e.message);
  }
}

async function main(argv) {
  const args = argv.slice(2), file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--out");
  if (!file) {
    console.error("usage: node tools/season-import.mjs <schedule.pdf|txt> [--out season.json] [--check] [--publish]");
    process.exit(2);
  }
  const { season, problems } = parseSchedule(pdftotext(file));
  const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
  const weeks = season.seasons.reduce((n, s) => n + s.schedules.length, 0);
  console.error(`${season.seasons.length} series, ${weeks} weeks, ${season.tracks.length} track layouts, ${season.cars.length} cars`);
  if (problems.length) {
    console.error(`${problems.length} series need a look:`);
    for (const p of problems) console.error(`  ${p.series}: ${p.why}${p.text ? ` ("${p.text}")` : ""}`);
  }
  if (out) writeFileSync(out, JSON.stringify(season));
  else if (!args.includes("--check") && !args.includes("--publish")) process.stdout.write(JSON.stringify(season, null, 1) + "\n");
  if (args.includes("--publish")) {
    const tok = process.env.PITLANE_TOKEN, srv = (process.env.PITLANE_SERVER || "https://pitlanehq.app").replace(/\/+$/, "");
    if (!tok) throw new Error("PITLANE_TOKEN (the uploader account's token) is needed to publish");
    const r = await fetch(srv + "/community/season", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + tok }, body: JSON.stringify({ season }) });
    console.error("publish:", r.status, await r.text());
    if (!r.ok) process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv).catch((e) => { console.error(e.message); process.exit(1); });
