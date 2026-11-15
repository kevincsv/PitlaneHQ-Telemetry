# Project status

Short index, updated 2026-11-15. Open a detail file in `docs/status/` only when the task touches that area. When the
status changes, update the detail file and this index in the same commit. How features behave is in `docs/spec/`.

## Current goal

Get the phone apps through App Store review and the Google Play closed test. The Workspace redesign is live on PC and
web (0.9.19); a full-app bug sweep follows.

## In progress

- iOS App Store: answer Apple's 2.1 request (review video, resubmit). Waiting on the owner.
- Google Play: closed test needs 12 testers for 14 days. Waiting on the owner's tester list.
- Microsoft Store 0.9.23: submitted 2026-11-15, in certification.
- Phone repo: merge the App Store and Report/Block work with master's Google Play commits before the next release.
- Lap telemetry out of the database into R2, compressed: built on its branch, waits for the owner's push, then the switch (`docs/status/server-and-ops.md`).
- Telemetry's Engineer view, the Team screen's Engineer and the full-screen track map: on the beta channel from `claude/project-thread-om4yc5` (2026-11-15), not on master (`docs/status/releases.md`).
- Trying the PC app without an account for 3 sessions: on the beta channel from `claude/project-thread-v307wb` (2026-11-15), not on master (`docs/status/releases.md`).
- 0.9.24 on the beta channel (PC and web): the fix for Telemetry's Full freezing the PC app in a session. Promote once it passes.
- Full-screen track map in the lap comparison (zoom, both racing lines, braking points, turns, replay): built on its branch, waits for the owner's push (`docs/status/releases.md`).
- Team mode (beta, every tester and admin): in production code since 0.9.19 behind its beta gate (PC, web, Android beta). Not run on real hardware yet.

## Live now

PC and web 0.9.23 (2026-11-15: the race summary opens after a race, time to beat and last week on Home, real track turns, a PC without an account teaches the coach, Start with Windows by default, the admin Analytics revamp, Pro offers built and switched off, lap telemetry storage ready for its own bucket and not switched on; on the server only, Payments in admin Analytics and a thank-you email for donations; 0.9.19 brought the Workspace look), phones 0.9.14, Microsoft Store 0.9.15 (0.9.23 in certification). The phones have not had any of it (the owner said no phone work for now). Stay on 0.9.x until Steam is approved.

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
