# Project status

Short index, updated 2026-11-07. Open a detail file in `docs/status/` only when the task touches that area. When the
status changes, update the detail file and this index in the same commit. How features behave is in `docs/spec/`.

## Current goal

Get the Workspace redesign approved and promoted to production, and get the phone apps through App Store review and
the Google Play closed test.

## In progress

- Workspace look for the PC and web: live on beta only, waiting for the owner's OK to promote.
- iOS App Store: answer Apple's 2.1 request (review video, resubmit). Waiting on the owner.
- Google Play: closed test needs 12 testers for 14 days. Waiting on the owner's tester list.
- Microsoft Store 0.9.15 submission: prepared, the owner submits.
- Phone repo: merge the App Store and Report/Block work with master's Google Play commits before the next release.
- Agent sign-up sources: on master (2026-11-14), live after the next cloud deploy and Windows build.
- Held until the owner says: the telemetry and coach engine rework (its own branch).

## Live now

PC and web 0.9.15, phones 0.9.14, Microsoft Store 0.9.14. Stay on 0.9.x until Steam is approved.

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
