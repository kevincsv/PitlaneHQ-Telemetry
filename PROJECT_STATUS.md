# Project status

Short index, updated 2026-11-16. Open a detail file in `docs/status/` only when the task touches that area. When the
status changes, update the detail file and this index in the same commit. How features behave is in `docs/spec/`.

## Current goal

Get the phone apps through App Store review and the Google Play closed test. The Workspace redesign is live on PC and
web (0.9.19); a full-app bug sweep follows.

## In progress

- iOS App Store: answer Apple's 2.1 request (review video, resubmit). Waiting on the owner.
- Google Play: closed test needs 12 testers for 14 days. Waiting on the owner's tester list.
- Microsoft Store 0.10.0: submitted 2026-11-16, in certification (the 0.9.23 submission was cancelled for it).
- Phone repo: merge the App Store and Report/Block work with master's Google Play commits before the next release.
- Lap telemetry out of the database into R2, compressed: built on its branch, waits for the owner's push, then the switch (`docs/status/server-and-ops.md`).
- The track map inside Telemetry's Lap compare template: built and shown, waits for the owner's word for the next version (`docs/status/releases.md`).
- Team mode (beta, every tester and admin): in production code since 0.9.19 behind its beta gate (PC, web, Android beta). Not run on real hardware yet.

## Live now

Admin panel rebuild on pitlanehq.app since 2026-11-18 (7 tabs, one Drivers list, a profile for every driver, migration 0109).
PC and web 0.10.1 (2026-11-16: the simpler Telemetry menu with Standings in the Dashboard and its Customize, the race report, the coach judging the whole session, Setups for testers, official track turns, the Statistics fix). Before it 0.10.0 (2026-11-15, every PC must update to it: the full-screen track map with the chase view, Telemetry's Engineer view, the overlays' text size slider, trying the PC app without an account for 3 sessions, the fix for Telemetry's Full freezing, the Le Mans Ultimate lap times pages and the new landing), phones 0.9.14, Microsoft Store 0.9.15 (0.10.0 in certification). The phones have not had any of it (the owner said no phone work for now). Stay on 0.x until Steam is approved.

## Areas

| Area | Detail file |
| --- | --- |
| Versions, what is live where, branches, held work | `docs/status/releases.md` |
| PC and web UI redesign | `docs/status/ui-redesign.md` |
| App Store, TestFlight, Google Play, Microsoft Store, Steam | `docs/status/stores.md` |
| Coach, analysis, telemetry, engine rework | `docs/status/coach.md` |
| Le Mans Ultimate, ACC and AC, iRacing Planner | `docs/status/games.md` |
| Discord, leagues, Report and Block, rivals' privacy | `docs/status/community.md` |
| Sign-in, testers, secrets, donations and prices | `docs/status/accounts-and-money.md` |
| Builds, migrations, D1, what never ran on real hardware | `docs/status/server-and-ops.md` |
