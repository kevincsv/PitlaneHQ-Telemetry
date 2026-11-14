# Coach, analysis and telemetry

Status as of 2026-11-07. Behaviour is in `docs/spec/coach-and-model.md` and `docs/spec/telemetry.md`.

- Shipped: coach plan on the map (0.9.5), the 17 coach and recording items (0.9.6), coach learns faster and by
  discipline (0.9.7), oval coach (0.9.4), corner practise, height chart (0.9.13).
- Ask the coach (AI chat with the driver's own Claude, OpenAI or Gemini key): testers and admins only (`wipOk`).
  The key is sealed on every device (DPAPI, WebCrypto non-extractable key, Keystore, Keychain).
- Engine rework (recorder fixes, golden tests, brake zones) approved 2026-11-14, on master as 0.9.17 in both
  repos. `MODEL_VERSION` not bumped. Next ideas: the algorithms review (Claude Doc "Coach and analysis algorithms:
  what to improve").
- Thresholds that are guesses, never checked on real laps: oval kinds (short < 1450 m, mile < 2100 m), plan step
  thresholds, plan vote weights.
- Telemetry is read at 60 Hz (iRacing's max); phones get 10 Hz.
- Not built: the phones' Home brief, picking traffic laps as lap A on superspeedways.
- Dropped by the owner: 3D track views, voice engineer and voice packs. Rev beep and braking markers stay.
