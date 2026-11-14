// Race fuel learns from everyone (GET /community/fuel?game&trackId&carId): what a lap of this car and track takes for
// the drivers who drove it, so the Race fuel panel of every device has a figure before the driver's own laps and a
// steadier one with few of them (the analysis module's fuelUse mixes it in, ctx.comm).
//   Each session keeps its own figure (sessions.fuel, fuel_n, fuel_t: FUEL_SUMS below, migration 0101), so this reads
//   one row per session of the combination, never a lap. Each driver counts once (their sessions' laps together), the
//   answer is the median driver, and it shows only with three drivers at least (fewer: {drivers} alone).
// → { drivers, laps, perLap, lapTime, tank } (litres, seconds; tank the one most sessions had, else null)

export const MIN_DRIVERS = 3;
const DAY = 864e5;

// a session's fuel a lap from its laps: those with fuel used within 7 % of its best of them, two at least
const FUEL_OF = (sid) => `(SELECT CASE WHEN COUNT(*)>=2 THEN AVG(f.fuel) END, CASE WHEN COUNT(*)>=2 THEN COUNT(*) END, CASE WHEN COUNT(*)>=2 THEN AVG(f.time) END
  FROM laps f WHERE f.session_id=${sid} AND f.fuel>0 AND f.fuel<100 AND f.time>0 AND f.time<3600
    AND f.time<=1.07*(SELECT MIN(m.time) FROM laps m WHERE m.session_id=${sid} AND m.fuel>0 AND m.fuel<100 AND m.time>0 AND m.time<3600))`;
// the daily pass: the sessions started since ?1 (the last two days), from the sessions_started index
export const FUEL_SUMS = `UPDATE sessions SET (fuel, fuel_n, fuel_t)=${FUEL_OF("sessions.id")} WHERE started>=?1`;
export const fuelSince = (now) => now - 2 * DAY;

const med = (a) => { const b = a.slice().sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[n >> 1] : (b[n / 2 - 1] + b[n / 2]) / 2) : null; };
const r3 = (x) => Math.round(x * 1000) / 1000;

// the drivers' figures out of the sessions' rows {uploader, fuel, fuel_n, fuel_t, tank}
export function fuelOf(rows) {
  const by = new Map(), tanks = new Map();
  for (const r of rows || []) {
    if (!(r.fuel > 0) || !(r.fuel_n > 0) || !r.uploader) continue;
    const d = by.get(r.uploader) || { f: 0, t: 0, n: 0, nt: 0 };
    d.f += r.fuel * r.fuel_n; d.n += r.fuel_n;
    if (r.fuel_t > 0) { d.t += r.fuel_t * r.fuel_n; d.nt += r.fuel_n; }
    by.set(r.uploader, d);
    if (r.tank > 0) { const k = Math.round(r.tank * 10) / 10; tanks.set(k, (tanks.get(k) || 0) + 1); }
  }
  const ds = [...by.values()];
  if (ds.length < MIN_DRIVERS) return { drivers: ds.length };
  const tank = [...tanks.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  const lt = ds.filter((d) => d.nt > 0).map((d) => d.t / d.nt);
  return { drivers: ds.length, laps: ds.reduce((a, d) => a + d.n, 0), perLap: r3(med(ds.map((d) => d.f / d.n))), lapTime: lt.length ? r3(med(lt)) : null, tank: tank ? tank[0] : null };
}

// kept an hour in the server's cache (the same for everyone who asks): one combination's figure moves slowly
async function hourCache(env, k, fn) {
  const cache = env.LOCAL !== "1" && typeof caches !== "undefined" && caches.default ? caches.default : null;
  const key = new Request("https://db.cache/fuel/" + k);
  if (cache) { const hit = await cache.match(key).catch(() => null); if (hit) { try { return await hit.json(); } catch (e) {} } }
  const r = await fn();
  if (cache) await cache.put(key, new Response(JSON.stringify(r), { headers: { "content-type": "application/json", "cache-control": "max-age=3600" } })).catch(() => {});
  return r;
}

// the sessions of the last year on this car and track (the iRacing ids, or the other games' own), from sessions_combo_ids
export async function communityFuel(env, game, trackId, carId, now = Date.now()) {
  return hourCache(env, `${game}/${trackId}/${carId}`, async () => {
    const { results } = await env.DB.prepare(
      "SELECT uploader, fuel, fuel_n, fuel_t, tank FROM sessions WHERE track_id=?1 AND car_id=?2 AND game=?3 AND fuel>0 AND started>=?4 LIMIT 5000"
    ).bind(trackId, carId, game, now - 365 * DAY).all();
    return fuelOf(results);
  });
}
