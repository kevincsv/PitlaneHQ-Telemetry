# Releases and versions

Status as of 2026-11-07. Rules for releasing are in CLAUDE.md and `docs/spec/pc-app.md` ("Test builds").

## What is live

| Where | Version | Notes |
| --- | --- | --- |
| PC agent + web (production) | 0.9.15 | Promoted 2026-11-05 from master 9ed8a90. `PC_MIN`/`appMinVersion` 0.9.15 (0615d40), so older PCs update when the car is off track. |
| Beta (beta.pitlanehq.app, PC Test builds) | 0.9.15 + Workspace look | Cloud and Windows beta builds of 06cb33a, 2026-11-06. See `ui-redesign.md`. |
| Android | 0.9.14 | Production APK from /dl. Google Play: internal testing build 1291 (see `stores.md`). |
| iOS | 0.9.14 | TestFlight build 392. App Store review not passed yet (see `stores.md`). |
| Microsoft Store | 0.9.14 | 0.9.15 submission prepared, the owner submits it in Partner Center (see `stores.md`). |

## Branches (2026-11-07)

- Pitwall-test: master and `claude/elegant-babbage-rubcma` are the same commit (0dd334b). Master holds the Workspace
  look (06cb33a) and the Discord server removal (0dd334b), but neither is promoted to production.
- PitlaneHQ-Mobile: the working branch has 10 commits master lacks (App Store page workflow, Report/Block 86b1836);
  master has the Google Play commits (play.yml) the working branch lacks. Merge them before the next phone release.

## On master, not deployed or built yet

- Where agent sign-ups come from (2026-11-14): the installer download keeps the visitor's source and the agent's
  account takes it, Store installs show as Microsoft Store. Server part works after a cloud deploy (migration 0098);
  the Store part needs a Windows build. See `docs/spec/admin.md`.

- 0.9.17 (2026-11-14): the engine rework the owner approved (off-track time in seconds, laps up to 30 km, close
  corners split, no crash on odd laps). PC and web bumped; the phones' analysis copy is on mobile master for the next
  phone release. Not built yet.

## Held until the owner says

- Watch in replay and the pedal and wheel check stay testers-only, also in production.
- Version 1.0 waits for the Steam version to be approved by Valve. Stay on 0.9.x.

## Version history (short)

- 0.9.15 (Nov 5): LMU "Turn on telemetry" window, full-screen overlay warning, uninstall page counts once.
- 0.9.14 (Nov 2): anti-copying (minified scripts, Android R8, Terms "Our work", EULA), admin Analytics per game.
- 0.9.13 (Nov 1): the Nov 1 ideas batch and the LMU batches.
- 0.9.12 (Nov 1): LMU energy, pricing and supporters page, Ask to test, single-file install folder, AC/ACC in development.
- 0.9.11 (Nov 1): the beta channel (Test builds).
- 0.9.0 to 0.9.10 (Oct 31 to Nov 1): see CHANGELOG.md.
