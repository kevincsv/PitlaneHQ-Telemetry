# Windows app, installer, local mode, startup and updates

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- Microsoft Store version (beside the downloads page's installer, the driver picks either): an MSIX package
  (`msix/AppxManifest.xml`, `msix/Assets/`) of the same app folder, built by `windows.yml` as the run's
  `PitlaneHQ-Store` artifact when the secrets `STORE_IDENTITY_NAME`, `STORE_PUBLISHER` and `STORE_PUBLISHER_NAME`
  (Partner Center → Product identity) are set, version `appVersion` + ".0", uploaded to Partner Center by hand (the
  Store signs it); never on the downloads page or the release. Installed from there (`storeApp()` in store_windows.go,
  `Store.IsPackaged` in Store.cs: the process has a package), the app's updater is off (no checks, no banner, no
  Update now; Settings says "The Microsoft Store keeps Pitlane HQ up to date" and the window hides its Updates card),
  and Start with Windows is the package's startup task (`PitlaneHQStartup`, off until turned on): the agent writes no
  Run entry and the window turns the task on and off to follow the setting (when it changes in the window, at start
  and every 30 seconds); started by it, the window starts in the notification area as with `-minimized`. Windows puts
  the new files it writes in AppData in the package's own folder (MSIX redirection), removed with the app. One of
  the two on a PC: both at once would run two agents.
- Code signing: the Windows build signs PitlaneHQ.exe, PitlaneHQ.Desktop.exe and PitlaneHQ-Setup.exe with Azure
  Artifact Signing (formerly Trusted Signing, `azure/trusted-signing-action` in `windows.yml`, timestamped) when the
  secrets `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_SIGNING_ENDPOINT`, `AZURE_SIGNING_ACCOUNT`
  and `AZURE_SIGNING_PROFILE` are set, and checks the signatures; without them the build is unsigned as before. The
  updater's zip carries the signed programs. The .NET runtime's files keep Microsoft's signatures. SmartScreen
  reputation builds with downloads of signed files, so the warning can still show for the first days.
- The install folder is tidy: the window is one compressed single-file `PitlaneHQ.Desktop.exe` (`PublishSingleFile`,
  `EnableCompressionInSingleFile` in the .csproj: the .NET runtime, WPF, Windows Forms and WebView2's libraries
  inside) with only the native files WPF and WebView2 load beside it (`*_cor3.dll`, `WebView2Loader.dll`, never
  extracted to %TEMP%, no `runtimes\` folder; the window points WebView2 at its loader with `SetLoaderDllFolderPath`),
  then the agent, the EULA, the privacy notice, the notices and the uninstaller: about 13 files instead of ~260. The
  old loose files go with the installer's `[InstallDelete]` and, on a PC that updated by itself (the updater before
  only added files), with the agent's `cleanOldLayout` at start (`oldlayout.go`: only when `hostfxr.dll` is there and
  the window is a single-file bundle; removes the runtime's native files, the .NET assemblies, the deps/runtimeconfig
  json, `createdump.exe`, the WebView2 .xml and `runtimes\`, a file in use becomes .old and goes at the next start).
- One Windows app, "Pitlane HQ" (never "preview" or a second download): one installer (`installer/PitlaneHQ.iss`,
  `PitlaneHQ-Setup.exe`; `PitlaneHQ-Desktop-Setup.exe` is the same file for old links) puts the native window
  (`PitlaneHQ.Desktop.exe`, self-contained) and the agent next to it, and its shortcuts open the window, which runs the
  agent as its engine (`-engine`). PitlaneHQ.exe started by itself (old shortcuts, the Run entry, the updater) opens
  the window when it sits next to it (`openDesktop`, desktoplaunch*.go); it uninstalls the old preview install. The
  updater's zip is the whole app folder (`out-desktop`, sub-folders kept); in engine mode it installs by itself too
  and says `PITLANEHQ_RESTART=` so the window starts again on the new version (`-replace <pid>`, with `-minimized`
  when it was hidden in the notification area, so it comes back as it was). The window is one instance
  (`Local\PitlaneHQ.Desktop`): a second start brings it forward, hidden or minimised (it sets the event
  `Local\PitlaneHQ.Desktop.Show` the running window waits on), never when Windows started it. Pitlane HQ lives in
  Windows' notification area like Steam or Garage 61 (`Tray.cs`, the app's icon with "Open Pitlane HQ" and "Quit" in
  the app's language, a click opens the window, never a balloon or a toast): closing the window (the header's close,
  Alt+F4) hides it there while the engine, the overlays, the sync, the updates and the live link keep running, and only
  Quit on its icon (or Windows shutting down or signing out) stops everything. Settings → "Closing the window keeps
  Pitlane HQ in the notification area" (`trayOnClose` in the agent's settings, on by default, read by the window from
  `/api/now`; shown only in Pitlane HQ Desktop, `INFO.desktop`) turned off makes closing quit. A device that presses
  Connect while the window is hidden brings it to the taskbar minimised with its button flashing, and the icon's menu
  says "A device wants to watch your telemetry" until it is answered (`pwAttention` from `liveAskShow`); never in front
  of the game. The installer asks it to quit first (`Local\PitlaneHQ.Desktop.Quit`, `QuitPitlaneHQ` in the .iss) so no
  icon is left behind, taskkill only as the fallback.
- Local mode (the owner's development, `tools/local.cmd`, never a button in the app): the whole of Pitlane HQ on one PC
  without internet. The server (`cloud/`, the same code as pitlanehq.app) runs on the PC with `wrangler dev --local
  --var LOCAL:1 --test-scheduled` (database and files in `cloud/.wrangler`, `DATA_KEY` in `cloud/.dev.vars`; `LOCAL=1`:
  every account is an admin, sign-up needs no email, `/server.json` names the local server). `PitlaneHQ.exe -local`
  (or `-server URL`, or the `PITLANEHQ_SERVER`, `PITLANEHQ_DATA`, `PITLANEHQ_PORT` environment the native window's engine
  and the overlay windows inherit; `localmode.go`): `commBase()` is that server, its own data folder (`PitlaneHQ-local`,
  the script copies the normal one once without the sign-ins) and port (8585), the native window its own instance, no
  updates, and the PC calls the server's ten-minute job (`/__scheduled`, the models). Nothing leaves the PC: every HTTP
  client of the program dials through `localDialContext` (`tlsTransport`, the live relay, the default transport), which
  refuses any host but the PC itself, the page is served without its Google Fonts link (`localPage`), the local server
  listens on 127.0.0.1 only and never pings IndexNow. pitlanehq.app never hears of local mode, and local mode is the
  owner's alone (the script needs the repository and Node.js; the shipped flag does nothing without that server). The
  laps already on pitlanehq.app are not there: the local server gets the laps driven from then on.
- The app's page takes its fonts from the program first (`/fonts.css` and `/fonts/*` from the embedded `ovfonts/`,
  `registerLocalRoutes`; on the web `fonts.css` is empty) and Google Fonts after, so with internet nothing changes
  and without it the app looks the same.
- Started with Windows (the installer's or Settings' "PitlaneHQ" Run entry, one only), PitlaneHQ.exe starts Pitlane HQ
  in the notification area (the window with `-minimized`: hidden there, nothing in the taskbar, the engine running,
  never shown by itself) and never brings an already open window forward. Until it is opened the window stays
  off the screen and cloaked (`DWMWA_CLOAK`, `Cloak` in MainWindow.xaml.cs), so a slow start never leaves an unpainted
  black window on the screen; opening it uncloaks it and centres it.
- Uninstalling PitlaneHQ.exe removes everything it keeps on the PC (`[UninstallDelete]` in
  installer/PitlaneHQ.iss); nothing on the server is touched (the account, the leaderboards, the model).
- Once it is uninstalled (not a silent uninstall), the browser opens https://pitlanehq.app/uninstalled with the
  version and the uninstaller's language ("Why did you uninstall Pitlane HQ?", `CurUninstallStepChanged` in the
  .iss), see support-and-feedback.md. The phones have no such page (Android and iOS tell an app nothing when it is
  removed).
- Pitlane HQ never shows Windows notifications (nothing in the action centre; `notify` only logs, and the PC app
  schedules no browser notifications): what it has to say shows inside the app.
- PitlaneHQ.exe checks for updates every 10 minutes, and at once when the server's answer to its minute sync names a
  newer build (`X-Pitlane-Build`, from version.json; `updateNudge`), notifies once per build and installs by itself
  when no sim is connected (unless switched off in Settings → About). A required update (the PC's version is older
  than version.json's `min`, `appMinVersion`) installs as soon as the car is not on the track, whatever that switch,
  never while driving. The server never serves a `min` below `PC_MIN` (downloads.js, kept equal to `appMinVersion`;
  0.9.15 since 5 Nov 2026, the owner wanting every PC on it), so raising it there forces every older PC to update without a new Windows build. The client tag (`clientTag`, `X-Pitlane-Client`) carries the build, shown in Admin → Users → Online now.
- Crashes (reports.go): each long-lived part of the agent (the game reader, the recorder, the uploader, the watchers)
  runs under `keepAlive`, so a panic is logged, reported to the server (POST `/community/crash`, once per kind and run)
  and that part starts again (2 s, then longer, at most 20 times a run); the race summary's notices run under `safeGo`.
  A crash Go cannot catch goes to `crash.txt` in the data folder (`debug.SetCrashOutput`) and is reported at the next
  start. The page's own errors are reported the same way (`pwCrash` in index.html, the web's too).
- Home on the PC app shows what the driver should act on (GET `/api/health`, `healthWatcher`): laps waiting more than
  two minutes to upload with Retry (POST `/api/health/retry`), or a line asking to sign in when no account takes them,
  Le Mans Ultimate running for a minute while the agent cannot read it (its plugins off) with where to turn them
  on (`homeHealth`), and the overlays open for 20 s over a game in exclusive full screen, where no window can show
  (`gameFullscreen`: Windows' QUNS_RUNNING_D3D_FULL_SCREEN; borderless is not it), asking for Borderless or Windowed
  (`fullCallout`, on Home and at the top of the Overlays tab).
- Le Mans Ultimate's telemetry (PC app, 5 Nov 2026, the owner's choice): a window "Turn on telemetry in Le Mans
  Ultimate" (in the game Settings → Gameplay, turn on Enable Plugins, close the game and start it again) when the
  driver has chosen Le Mans Ultimate and this PC has never read it (`pw.lmu.read`), or when the game runs and the agent
  cannot read it (`/api/health` "lmuPlugins"); once per start of the app, checked every 5 s, and it closes by itself
  with "Pitlane HQ is reading Le Mans Ultimate" once the game is read (`LMUG` in index.html). `/api/health` also says
  `pref`, `reading`, `lmuOn`, `fullNow` and `overlays`. The welcome window on the PC says to start your game (any game).

## Test builds (every device)

Every version goes to the testers first and reaches everyone only after it passes (the owner's rule, 1 Nov 2026).
Testers are the Tester level (`isTester`, given in Admin → Users or in `TESTERS`) and the admins.

- The flow: work stays on the working branch; "build beta" runs `windows.yml`, `cloud.yml` and the phones'
  `android.yml` with channel `beta` (the default) on that branch; testers try it; once it passes and is on master,
  "promote" runs them on master with channel `production`, which builds nothing new: Windows and Android copy the
  test build's own files from `/dl/beta/` to `/dl/` (refusing when master's code differs from the commit testers ran,
  docs, workflows, the server and CHANGELOG.md aside), and the server deploys only when master's `cloud/` and `web/`
  are what the test version ran (`/dl/beta/cloud.json`). `skip_testing` publishes master without a test build: only for
  an urgent fix when the app is broken for people, and only when the owner says so.
- Windows: Settings → About → Test builds (testers and admins, `updPrefs.Beta`, POST `/api/update?action=beta`). On,
  the agent reads `/dl/beta/version.json` (channel `beta`) and installs `/dl/beta/PitlaneHQ-windows.zip`, and the
  server's `X-Pitlane-Build` nudge (everyone's build) is ignored. Off, or when the account is no longer a tester, it goes
  back to everyone's builds without installing an older version (`LeftBeta`, `heldBack`: held until everyone's
  version reaches the one it has). A promoted build keeps the test build's commit as its `build`, so a tester's PC is
  not updated again.
- The web and the server: `beta.pitlanehq.app` is the Worker `pitlanehq-beta` (`BETA = "1"`, `cloud/src/beta.js`) on the
  same database and files. Only testers and admins can sign in there: anyone else's sign-in or sign-up gets 403
  `beta_only` and its new session is removed at once (`betaSignIn`), and any other session of theirs is refused too; the public pages go
  to pitlanehq.app; `server.json` answers its own address; every answer is `noindex`; it runs no timed jobs, holds no
  webhooks or Discord commands, and its live room is its own (the PCs stay on pitlanehq.app's). It never changes the
  database: a branch with migrations production does not have stops unless `apply_migrations` is ticked (the owner's
  call; such a migration must keep pitlanehq.app working). The page shows a TEST VERSION bar (`betaBanner`).
- Android: each CI build has its own build number (`versionCode` = 1000 + the run's number). Testers' and admins'
  phones read `/dl/beta/phones.json` first and are offered a higher build from there; `phones.json` carries `code` and
  a phone is never offered a lower build (`Updates.pick`). Google Play installs keep Play's updates (internal testing
  track later). iOS: TestFlight once the Apple developer account exists; until then nothing changes there.
- The Microsoft Store package and Steam: their own flights and beta branch once they are listed.

## The web app offline

- On pitlanehq.app (and beta.), never on the PC app or in a frame, the page registers `web/dist/sw.js` (served from the
  root, `isAppFile` in worker.js). It keeps the app's own files (the page, `pitwall-*.js`, fonts, icons, the two news
  files) and asks the server first every time; when the answer takes over 3 s or the network is gone, the kept copy
  answers. Account, sync, community and live answers are never kept by it. A new `CACHE` name drops the old copies.

## The code that leaves for people's devices

- The repositories are private and keep the readable source. What the builds ship is minified, with the names inside
  the scripts renamed, no comments and a copyright line on top (`tools/protect-web.mjs`, terser in `cloud/`):
  `cloud.yml` protects every script of `web/dist` and the scripts inside `index.html` before the deploy (the web and
  the `pitwall-analysis.js` the phones download); `windows.yml` protects the scripts the agent embeds with
  `--no-html` (the agent reads `index.html` as text, TELN and LIVE_VARS). `pitwall-games.js` stays plain JSON (the agent
  reads it as data) and pdf.js (`pitwall-pdf*.js`) keeps its own licence. The protected `pitwall-analysis.js` still
  says `PW_ANALYSIS VERSION = n` on its first line, which the phones check before they keep a downloaded copy.
- The agent is built with `-s -w` (no symbols). garble was tried and dropped: its renaming breaks the JSON the agent
  reads and sends.
- The phones: R8 shrinks and renames the Android release (`proguard-rules.pro`), and both builds protect the scripts
  they carry (`tools/protect-js.sh` in PitlaneHQ-Mobile).
- The legal side: the EULA (`installer/EULA.txt`, EN/ES/PT) and the Terms' "Our work" (`cloud/src/legal.js`) forbid
  copying, decompiling and reverse engineering, and the public pages' footers carry "© year Pitlane HQ".
