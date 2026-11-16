# Coach, analysis and telemetry

Status as of 2026-11-16. Behaviour is in `docs/spec/coach-and-model.md` and `docs/spec/telemetry.md`.

- Shipped: coach plan on the map (0.9.5), the 17 coach and recording items (0.9.6), coach learns faster and by
  discipline (0.9.7), oval coach (0.9.4), corner practise, height chart (0.9.13).
- 2026-11-16, from what drivers ask for online (plan: Claude Doc "Coach improvements from driver feedback"): the coach
  judges every corner over the whole session ("On 7 of 9 laps", the usual lap's step), the lap analyzer's "Turn by turn"
  table, "Watch it" (the chase view at a corner) and "This session against the last one". On the branch
  `claude/project-thread-a1y2ch`, beta only until the owner says it goes live. Next: a coach for Le Mans Ultimate
  (multiclass traffic, virtual energy, tyre drop per stint).
- Real data (2026-11-16): every tip the server holds is the server's own coach (`src` auto, 2,769 rows, 48 drivers, LMU
  33 of them); none came from the apps' coach (`src` app 0, no 👍/👎, no plan votes), so "what a tip is worth" has no
  baseline yet. Why the apps' POST /coach/tips never lands is open. About 2 in 3 answered tips gained time next session
  for every kind, so no threshold stands out to retune yet.
- Ask the coach (AI chat with the driver's own Claude, OpenAI or Gemini key): testers and admins only (`wipOk`).
  The key is sealed on every device (DPAPI, WebCrypto non-extractable key, Keystore, Keychain).
- Engine rework (recorder fixes, golden tests, brake zones) approved 2026-11-14, on master as 0.9.17 in both
  repos. `MODEL_VERSION` not bumped. Next ideas: the algorithms review (Claude Doc "Coach and analysis algorithms:
  what to improve").
- Thresholds that are guesses, never checked on real laps: oval kinds (short < 1450 m, mile < 2100 m), plan step
  thresholds, plan vote weights.
- Race fuel (2026-11-14): the stop count by whole laps is a fix on master (0.9.19, also on this branch); learning
  from everyone (`/community/fuel`, migration 0102, every device) is on the working branch only, waiting for "sube".
  Not built: needs a cloud deploy (the migration) and the phones' next release.
- Telemetry is read at 60 Hz (iRacing's max); phones get 10 Hz.
- Not built: the phones' Home brief, picking traffic laps as lap A on superspeedways.
- Dropped by the owner: 3D track views, voice engineer and voice packs. Rev beep and braking markers stay.
