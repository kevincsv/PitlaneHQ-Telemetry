// The overlay previews' sample from other drivers (docs/spec/overlays.md, "The preview's data"): a PC that has 20 s of
// its driver's own driving sends a copy with every name and id taken out (previewAnon in previewsample.go), at most once
// an hour; a PC with none of its own plays the newest one of its game. In R2 (DL) under preview-samples/<game>/<id>.json,
// one per driver, so a driver's new sample replaces their old one.
export const PREVIEW_MAX = 4 << 20, PREVIEW_FRAMES = 400, PREVIEW_EVERY = 3600e3, PREVIEW_KEEP = 30 * 864e5;
const GAMES = new Set(["iracing", "lmu"]);
const key = (game, uid) => `preview-samples/${game}/${String(uid).replace(/[^\w-]/g, "")}.json`;

// storeSample: checks the sample's shape and keeps it; {ok} or {error,status}
export async function storeSample(env, uid, s, now = Date.now()) {
  if (!env.DL) return { error: "no storage", status: 503 };
  if (!s || !GAMES.has(s.game)) return { error: "unknown game", status: 400 };
  const names = s.names, frames = s.frames;
  if (!Array.isArray(names) || !names.length || names.length > 2000 || names.some((n) => typeof n !== "string" || !/^\w{1,64}$/.test(n))) return { error: "bad names", status: 400 };
  if (!Array.isArray(frames) || frames.length < 50 || frames.length > PREVIEW_FRAMES || frames.some((f) => !f || !Array.isArray(f.v) || f.v.length !== names.length)) return { error: "bad frames", status: 400 };
  if (typeof s.session !== "string" || s.session.length > 1 << 20) return { error: "bad session", status: 400 };
  const body = JSON.stringify({ v: 1, game: s.game, at: now, hz: Math.max(1, Math.min(60, +s.hz || 10)), names, session: s.session, frames: frames.map((f) => ({ k: +f.k || 0, v: f.v })) });
  if (body.length > PREVIEW_MAX) return { error: "too big", status: 413 };
  const k = key(s.game, uid), old = await env.DL.head(k);
  if (old && now - (+(old.customMetadata || {}).at || 0) < PREVIEW_EVERY) return { ok: true, kept: false };
  await env.DL.put(k, body, { httpMetadata: { contentType: "application/json" }, customMetadata: { at: String(now) } });
  return { ok: true, kept: true };
}

// pickSample: the newest sample of the game (a month old at most), as its JSON text, or null
export async function pickSample(env, game, now = Date.now()) {
  if (!env.DL || !GAMES.has(game)) return null;
  let best = null, cursor;
  do {
    const l = await env.DL.list({ prefix: `preview-samples/${game}/`, cursor, include: ["customMetadata"] });
    for (const o of l.objects) {
      const at = +(o.customMetadata || {}).at || +new Date(o.uploaded) || 0;
      if (now - at < PREVIEW_KEEP && (!best || at > best.at)) best = { key: o.key, at };
    }
    cursor = l.truncated ? l.cursor : null;
  } while (cursor);
  if (!best) return null;
  const o = await env.DL.get(best.key);
  return o ? await o.text() : null;
}
