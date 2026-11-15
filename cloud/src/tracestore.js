// Where a lap's telemetry is kept. It was a column of the database (laps.trace, community_laps.trace): JSON text,
// sealed, as base64, 45 KB a lap, 95% of the whole database. Here it goes to its own bucket (R2, binding TRACES)
// gzipped and sealed (crypt.js packData, about a quarter of the size), and the column keeps "r2:" + the object's key.
// Every reader opens both through openData, and "trace IS NOT NULL" means what it always did.
//
// - Writing there is off until the database says so (app_state 'trace_store' = 'r2'): pitlanehq.app and the test
//   version share one database, so both must read the new form before either writes it. Off, or with no bucket, a
//   lap is sealed into the column as before.
// - An object belongs to one row and is never rewritten. A lap shared to the leaderboard gets its own copy
//   (ownTrace), so deleting a session never takes a leaderboard lap's telemetry with it.
// - Only a lap's own objects ("l/…") are deleted with their row (dropTraces). A leaderboard lap's ("c/…") stay: an
//   undone driver link puts rows back as they were (driverlinks.js), telemetry included.
// - moveTraces takes the laps of before into the bucket a few at a time (the timed job): each one is read back from
//   the bucket and must be the same text before its row changes, and the row changes only if it still holds what
//   was read.
import { sealData, openData, packData, unpackData, storedBytes } from "./crypt.js";

const isPtr = (v) => typeof v === "string" && v.startsWith("r2:");
const rand = () => { const b = crypto.getRandomValues(new Uint8Array(12)); let s = ""; for (const x of b) s += x.toString(16).padStart(2, "0"); return s; };
const newKey = (kind) => `${kind === "c" ? "c" : "l"}/${rand()}`;

let onCache = { at: 0, on: false, db: null };
/** Whether new telemetry goes to the bucket: the bucket is bound and the database says 'r2' (asked once a minute). */
export async function traceStoreOn(env) {
  if (!env.TRACES || !env.DB) return false;
  const now = Date.now();
  if (onCache.db === env.TRACES && now - onCache.at < 60000) return onCache.on;
  let on = false;
  try { const r = await env.DB.prepare("SELECT v FROM app_state WHERE k='trace_store'").first(); on = !!r && r.v === "r2"; } catch (e) { on = false; }
  onCache = { at: now, on, db: env.TRACES };
  return on;
}
export const forgetTraceStore = () => { onCache = { at: 0, on: false, db: null }; };

async function put(env, kind, plain) {
  const key = newKey(kind);
  await env.TRACES.put(key, await packData(env, plain));
  return "r2:" + key;
}

/** A lap's telemetry (JSON text) as its row keeps it: in the bucket when that is on, else sealed into the column. */
export async function sealTrace(env, plain, kind) {
  if (plain == null) return plain;
  if (await traceStoreOn(env)) return put(env, kind, plain);
  return sealData(env, plain);
}

/** What another row keeps of a trace it takes from a row (a lap shared to the leaderboard): its own object, never
 *  the same one. A trace sealed in the column stays as it is while the bucket is off. */
export async function ownTrace(env, value, kind) {
  if (value == null || value === "") return null;
  if (isPtr(value)) {
    const b = await storedBytes(env, value);
    if (!b) return null; // its telemetry is gone: the lap is kept without it
    const key = newKey(kind);
    await env.TRACES.put(key, b);
    return "r2:" + key;
  }
  if (!(await traceStoreOn(env))) return value;
  return put(env, kind, await openData(env, value));
}

/** The telemetry objects of rows that are gone or rewritten leave the bucket: a lap's own ("r2:l/…") only, and
 *  never an error for the caller (an object left behind costs nothing; a request that fails does). */
export async function dropTraces(env, values) {
  if (!env.TRACES) return 0;
  const keys = [...new Set((values || []).filter((v) => isPtr(v) && v.startsWith("r2:l/")).map((v) => v.slice(3)))];
  let n = 0;
  for (let i = 0; i < keys.length; i += 500) {
    try { await env.TRACES.delete(keys.slice(i, i + 500)); n += Math.min(500, keys.length - i); } catch (e) { /* stays */ }
  }
  return n;
}

/** The bucket objects of the laps a query is about to delete: `where` is a condition on laps (alias l). */
export async function lapTracePtrs(env, where, ...binds) {
  if (!env.TRACES) return [];
  try {
    const r = await env.DB.prepare(`SELECT l.trace FROM laps l WHERE substr(l.trace,1,5)='r2:l/' AND (${where})`).bind(...binds).all();
    return (r.results || []).map((x) => x.trace);
  } catch (e) { return []; }
}

// ---------- the laps of before go to the bucket ----------
const TABLES = { laps: "l", community_laps: "c" };
const stateOf = async (env) => { try { const r = await env.DB.prepare("SELECT v FROM app_state WHERE k='trace_move'").first(); return r && r.v ? JSON.parse(r.v) : {}; } catch (e) { return {}; } };
const saveState = (env, st) => env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('trace_move', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(JSON.stringify(st), Date.now()).run();

/** One lap's telemetry from its column into the bucket. "moved", "skip" (nothing to move, or its row changed
 *  meanwhile) or "bad" (it does not open, or did not come back the same: the row keeps what it has). */
export async function moveOne(env, table, row) {
  const kind = TABLES[table];
  if (!kind || row.trace == null || isPtr(row.trace)) return "skip";
  let plain;
  try { plain = await openData(env, row.trace); JSON.parse(plain); } catch (e) { return "bad"; }
  const ptr = await put(env, kind, plain);
  let same = false;
  try { const b = await storedBytes(env, ptr); same = !!b && (await unpackData(env, b)) === plain; } catch (e) { same = false; }
  if (!same) { await env.TRACES.delete(ptr.slice(3)).catch(() => {}); return "bad"; }
  // only the row that still holds exactly what was read (a repair or an edit meanwhile keeps its own)
  const r = await env.DB.prepare(`UPDATE ${table} SET trace=?2 WHERE rowid=?1 AND trace=?3`).bind(row.rid, ptr, row.trace).run();
  if (!(r && r.meta && r.meta.changes)) { await env.TRACES.delete(ptr.slice(3)).catch(() => {}); return "skip"; }
  return "moved";
}

/** A few laps of before into the bucket: at most `limit` rows looked at and `ms` spent, table by table, from where
 *  the last run stopped (app_state 'trace_move'). Once both tables are through, a pass a day looks for a lap that
 *  came in the old form since. Only while the bucket is on. */
export async function moveTraces(env, opts = {}) {
  if (!(await traceStoreOn(env))) return { on: false };
  const limit = opts.limit || 60, until = Date.now() + (opts.ms || 20000), now = opts.now || Date.now();
  const st = await stateOf(env);
  const out = { on: true, moved: 0, bad: 0, skipped: 0 };
  let left = limit, looked = false;
  for (const table of Object.keys(TABLES)) {
    const t = st[table] || (st[table] = { at: 0, moved: 0, bad: 0 });
    if (t.done && !(opts.daily && now - t.done > 20 * 3600e3)) continue;
    if (t.done) { t.done = 0; t.at = 0; }
    looked = true;
    while (left > 0 && Date.now() < until) {
      const n = Math.min(left, 10); // ten rows a read: an answer of half a megabyte at most
      const rows = (await env.DB.prepare(`SELECT rowid AS rid, trace FROM ${table} WHERE rowid>?1 AND trace IS NOT NULL AND substr(trace,1,3)<>'r2:' ORDER BY rowid LIMIT ?2`).bind(t.at, n).all()).results || [];
      if (!rows.length) { t.done = now; break; }
      for (const row of rows) {
        const r = await moveOne(env, table, row).catch(() => "bad");
        if (r === "moved") { out.moved++; t.moved++; } else if (r === "bad") { out.bad++; t.bad++; } else out.skipped++;
        t.at = row.rid; left--;
        if (Date.now() >= until) break;
      }
    }
    if (left <= 0 || Date.now() >= until) break;
  }
  if (looked) await saveState(env, st).catch(() => {}); // both tables through: nothing to write, run after run
  return out;
}
