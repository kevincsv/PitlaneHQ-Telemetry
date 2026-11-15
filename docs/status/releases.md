# Releases and versions

Status as of 2026-11-14. Rules for releasing are in CLAUDE.md and `docs/spec/pc-app.md` ("Test builds").

## What is live

| Where | Version | Notes |
| --- | --- | --- |
| PC agent + web (production) | 0.9.23 | 2026-11-15 15:50 UTC, build c9439cc: Statistics is part of Pro (its PRO badge, its line on /pricing and the Pro lists; unlocked while the subscription is off) and the payments work. Before, 14:30 UTC, build a374514: 0.9.22 plus the feedback button's menu (with Invite a friend) for admins in admin mode. 0.9.22 (14:12 UTC, d324f77): the race summary opens after a race with the leaderboard place and Compare with the next driver up, Time to beat and Last week on Home, real track turns, a PC without an account teaches the coach, Start with Windows by default, uninstalling asks why, the admin Analytics revamp, Pro offers switched off (founding from $3), two new guides. Migrations 0103 and 0105 applied. Lap telemetry storage in its own bucket is deployed and not switched on (the database thread sets `trace_store`). After this: admin → Analytics → Data → Add up everything, once. |
| Beta (beta.pitlanehq.app, PC Test builds) | 0.9.24 | 2026-11-15: Telemetry's Full no longer freezes the PC app in a session (panels out of sight are not drawn, charts no longer lay the page out on each redraw). Promoted to production once it passes. |
| Android | 0.9.14 | Production APK from /dl. Google Play: internal testing build 1291 (see `stores.md`). |
| iOS | 0.9.14 | TestFlight build 392. App Store review not passed yet (see `stores.md`). |
| Microsoft Store | 0.9.15 | 0.9.23 submitted 2026-11-15, in certification (see `stores.md`). |

## Branches (2026-11-14)

- Pitwall-test: master and `claude/project-thread-757k7n` are the same commit (7ea9ccb, then the status docs).
- PitlaneHQ-Mobile: the working branch has 10 commits master lacks (App Store page workflow, Report/Block 86b1836);
  master has the Google Play commits (play.yml) the working branch lacks. Merge them before the next phone release.

## Held until the owner says

- Full-screen track map of the lap comparison (0.9.24, PC and web, a user's review): on `claude/project-thread-mewaaa`
  on top of the 0.9.24 fixes, not pushed to master, no build. Waits for the owner's "sube". Phones not done (no phone work).

- Watch in replay and the pedal and wheel check stay testers-only, also in production.
- Version 1.0 waits for the Steam version to be approved by Valve. Stay on 0.9.x.

## Version history (short)

- 0.9.19 (Nov 14): Pit Wall Workspace look on PC and web, Statistics, Which game?, short tour, community race fuel,
  public name in My account, the engine rework (0.9.17), invite a friend, LMU without "Beta", sign-up sources. Team
  mode stays beta-gated.
- 0.9.15 (Nov 5): LMU "Turn on telemetry" window, full-screen overlay warning, uninstall page counts once.
- 0.9.14 (Nov 2): anti-copying (minified scripts, Android R8, Terms "Our work", EULA), admin Analytics per game.
- 0.9.13 (Nov 1): the Nov 1 ideas batch and the LMU batches.
- 0.9.12 (Nov 1): LMU energy, pricing and supporters page, Ask to test, single-file install folder, AC/ACC in development.
- 0.9.11 (Nov 1): the beta channel (Test builds).
- 0.9.0 to 0.9.10 (Oct 31 to Nov 1): see CHANGELOG.md.
