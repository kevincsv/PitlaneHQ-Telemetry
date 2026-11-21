# Releases and versions

Status as of 2026-11-15. Rules for releasing are in CLAUDE.md and `docs/spec/pc-app.md` ("Test builds").

## What is live

| Where | Version | Notes |
| --- | --- | --- |
| PC agent + web (production) | 0.10.3 | 2026-11-21, at the owner's word ("haz todo y sube a live"): the track map inside Live lap compare, Ask the coach for everyone, the plan's thumbs easier to see. No forced update. Before it: 0.10.2, 2026-11-21 14:46 UTC, build bb6ae4b, fixes only at the owner's word ("todo a live"): the lap recorder's uncounted line crossings (ACC) and laps under 5 seconds, the uninstall count on the server. No forced update, no release notes. Before it: 0.10.1, 2026-11-16 ~15:30 UTC, build cc16c34, one release of the combined beta: the simpler Telemetry menu (Dashboard, Live lap compare, Team, Car & tools), Standings as a Dashboard view with Customize, the race report, the whole-session coach (Turn by turn, Watch it, this session against the last), Setups for testers and admins, official track turns, the Statistics crash fix and the coach tips server fix. No forced update (min stays 0.10.0). Before it: 0.10.0, 2026-11-15 22:12 UTC (PC) and 23:36 UTC (web and server), build ddfe657, one release of everything that was on the beta channel, and every PC must update to it (`appMinVersion` and `PC_MIN` 0.10.0, the owner's choice). It brings the full-screen track map (lap comparison, coach and leaderboards, with the chase view), Telemetry's Engineer view and the Team screen's Engineer, the overlays' text size slider, the fix for Telemetry's Full freezing the PC app, the profile crash fix, trying the PC app without an account for 3 sessions, the Le Mans Ultimate lap times pages and the new landing, uneven track maps evened on the server, the uninstall page's "Something else" box and the telemetry move on its own every-minute job. Before it: 0.9.23 (15:50 UTC, build c9439cc). |
| Beta (beta.pitlanehq.app, PC Test builds) | 0.10.3 | 2026-11-21: the same build as production. |
| Android | 0.9.14 | Production APK from /dl. Google Play: internal testing build 1291 (see `stores.md`). |
| iOS | 0.9.14 | TestFlight build 392. App Store review not passed yet (see `stores.md`). |
| Microsoft Store | 0.10.0 | Live since 2026-11-16 21:41 UTC (see `stores.md`). |

## Branches (2026-11-14)

- Pitwall-test: master and `claude/project-thread-757k7n` are the same commit (7ea9ccb, then the status docs).
- PitlaneHQ-Mobile: the working branch has 10 commits master lacks (App Store page workflow, Report/Block 86b1836);
  master has the Google Play commits (play.yml) the working branch lacks. Merge them before the next phone release.

## Held until the owner says

- Watch in replay and the pedal and wheel check stay testers-only, also in production.
- Version 1.0 waits for the Steam version to be approved by Valve. Stay on 0.9.x.

## Version history (short)

- 0.10.0 (Nov 15): the full-screen track map with the chase view, the Engineer view, the overlays' text size
  slider, the three-session trial without an account, the LMU lap times pages. Every PC must update to it.
- 0.9.19 (Nov 14): Pit Wall Workspace look on PC and web, Statistics, Which game?, short tour, community race fuel,
  public name in My account, the engine rework (0.9.17), invite a friend, LMU without "Beta", sign-up sources. Team
  mode stays beta-gated.
- 0.9.15 (Nov 5): LMU "Turn on telemetry" window, full-screen overlay warning, uninstall page counts once.
- 0.9.14 (Nov 2): anti-copying (minified scripts, Android R8, Terms "Our work", EULA), admin Analytics per game.
- 0.9.13 (Nov 1): the Nov 1 ideas batch and the LMU batches.
- 0.9.12 (Nov 1): LMU energy, pricing and supporters page, Ask to test, single-file install folder, AC/ACC in development.
- 0.9.11 (Nov 1): the beta channel (Test builds).
- 0.9.0 to 0.9.10 (Oct 31 to Nov 1): see CHANGELOG.md.
