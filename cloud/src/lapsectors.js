// A shared lap's sectors from its trace, when the lap came without them: thirds of the lap distance, as the agent
// times every lap (cloud.go, field.go), from the lap time the trace keeps at each point (its sixth column). A race
// rival's lap the PC did not time sector by sector (it saw the lap whole, not each third's line) gets them this way.
import { openData } from "./crypt.js";

export function traceSectors(tr, time) {
  const d = tr && Array.isArray(tr.d) ? tr.d : null;
  if (!d || d.length < 60 || !(time > 10)) return null;
  const at = (i) => (Array.isArray(d[i]) ? Number(d[i][5]) : NaN);
  const t1 = at(Math.floor(d.length / 3)), t2 = at(Math.floor((2 * d.length) / 3));
  if (!(t1 > 0 && t2 > t1 && time > t2)) return null;
  const r = (v) => Math.round(v * 1000) / 1000;
  const s1 = r(t1), s2 = r(t2 - t1), s3 = r(time - r(t1) - s2);
  // each third takes between a tenth and two thirds of the lap, or the trace's times are not this lap's
  if ([s1, s2, s3].some((s) => !(s > 0.1 * time && s < 0.67 * time))) return null;
  return [s1, s2, s3];
}

// the sectors of a sealed (or plain) trace as the JSON the table keeps, or null
export async function sealedSectors(env, trace, time) {
  if (!trace) return null;
  try {
    const s = traceSectors(JSON.parse(await openData(env, trace)), time);
    return s ? JSON.stringify(s) : null;
  } catch {
    return null;
  }
}

// the laps shared before without sectors that have a trace: a few each hour (an empty list marks one whose trace
// gives none, so it is read once)
export async function fillSectors(env, limit = 100) {
  const rows = (await env.DB.prepare("SELECT id, time, trace FROM community_laps WHERE sectors IS NULL AND trace IS NOT NULL LIMIT ?1").bind(limit).all()).results || [];
  for (const x of rows) {
    const s = await sealedSectors(env, x.trace, x.time);
    await env.DB.prepare("UPDATE community_laps SET sectors=?2 WHERE id=?1 AND sectors IS NULL").bind(x.id, s || "[]").run();
  }
  return rows.length;
}
