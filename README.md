# Pitlane HQ

Lap analysis, a coach and overlays for sim racing. Download it at https://pitlanehq.app.

This repository holds the Pitlane HQ Agent for Windows, the web app and the server behind pitlanehq.app. The Android
and iOS apps live in their own repository.

| Folder | What it is |
| --- | --- |
| root `*.go` | The Pitlane HQ Agent (game readers, lap recorder, overlays, sync) |
| `web/dist/` | The app, shown by the agent's window and served at pitlanehq.app/app |
| `cloud/` | The Cloudflare Worker behind pitlanehq.app, its migrations and tests |
| `desktop/` | The Windows main window (WPF and WebView2) |
| `installer/`, `msix/` | The Windows installer and the Microsoft Store package |
| `docs/spec/` | How each feature behaves |

Tests: `go test -mod=vendor ./...` and `node cloud/test/<name>.test.mjs`. Builds run only by hand from the Actions tab.
