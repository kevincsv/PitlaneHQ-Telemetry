# Releases and versions

Status as of 2026-11-14. Rules for releasing are in CLAUDE.md and `docs/spec/pc-app.md` ("Test builds").

## What is live

| Where | Version | Notes |
| --- | --- | --- |
| PC agent + web (production) | 0.9.20 | 2026-11-15: the bug sweep's fixes (one look for both game questions, a close button on every window) and the donation bar every day, on top of 0.9.19 (the Workspace batch). |
| Beta (beta.pitlanehq.app, PC Test builds) | 0.9.20 | Same commit as production, 2026-11-15. |
| Android | 0.9.14 | Production APK from /dl. Google Play: internal testing build 1291 (see `stores.md`). |
| iOS | 0.9.14 | TestFlight build 392. App Store review not passed yet (see `stores.md`). |
| Microsoft Store | 0.9.14 | 0.9.15 submission prepared, the owner submits it in Partner Center (see `stores.md`). |

## Branches (2026-11-14)

- Pitwall-test: master and `claude/project-thread-757k7n` are the same commit (7ea9ccb, then the status docs).
- PitlaneHQ-Mobile: the working branch has 10 commits master lacks (App Store page workflow, Report/Block 86b1836);
  master has the Google Play commits (play.yml) the working branch lacks. Merge them before the next phone release.

## Held until the owner says

- Watch in replay and the pedal and wheel check stay testers-only, also in production.
- Version 1.0 waits for the Steam version to be approved by Valve. Stay on 0.9.x.
- Which overlays are used (2026-11-15, branch `claude/project-thread-vql2gc`, not on master): the agent's minutes per
  overlay, the server keeping each race report's overlays, the admin Analytics' Overlays card. Waits on "sube" (server)
  and a Windows build (agent). The phones' admin panel does not show it yet.

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
