# Setups

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- In the beta: the Setups tab (Telemetry's sub-tabs, after Rev beep) is only for the testers and the admins with admin
  mode on (`setupsOk()` = `wipOk()` in index.html, `show()` sends everyone else to Telemetry), with a "Beta" pill. The
  screen is `web/dist/pitwall-setups.js`, for iRacing and Le Mans Ultimate (its own game switch; it starts on the game
  being driven). Not on the phones yet.
- "For this car": the free setups for the car being driven (or the car chosen in the list), by track (the track being
  driven is chosen when there are setups for it). Two sources, nothing else:
  - The free setups library: setups whose authors publish them under a licence that lets anyone share them (CC0, MIT).
    `tools/setups-library.mjs <folder with the clones>` builds `web/dist/_setups` (each file named by its checksum,
    `index.json` with car, track, author, licence, year and source, the licence texts in `licenses/`). The folder starts
    with "_" so PitlaneHQ.exe does not carry it (go:embed skips it); the server hands it out at `/setups-library/`
    (worker.js). Each row says the author and links its licence text on pitlanehq.app (never to GitHub). Today: OSW Sim
    Sports' Ford Mustang LMGT3 setups for LMU (CC0) and Pavlo Ivanichenko's iRacing GT3, GTE and P217 setups (MIT,
    2023). Setups from paid sites, or posted without a licence, never go in; estimates of other drivers' setups are never
    shown (the owner's choice).
  - Setups the drivers share (`community_setups`, by game).
- Apply (the PC app only; the web says to open the agent): the agent downloads the file, checks it against its checksum
  and writes it where the game reads setups. iRacing: `Documents\iRacing\setups\<car folder>\Pitlane Community\<name>
  (<author>).sto`; the driver picks it in the garage and presses Load (iRacing has no way for an app to load it).
  LMU: `<Steam library>\steamapps\common\Le Mans Ultimate\UserData\player\Settings\<track folder>\<name> (<author>).svm`
  (`lmusetups.go`: the libraries from Steam's `libraryfolders.vdf` and the usual SteamLibrary folders; a track folder
  that is there in another spelling is used); the driver picks it in the garage. LMU's own `/rest/garage/loadSetup`
  could load it with one click but has not been tried, and the agent never calls the game's garage paths
  (`lmuAPIPathOK`). Only .sto/.svm files, only inside those folders; nothing is run; the same file twice is kept once.
- "My setups" (the PC app): the setups on this PC (iRacing by car folder, LMU by track folder with the car read from the
  file's `VehicleClassSetting`), with notes and tags, the best valid lap with each one at each track (iRacing, the
  session's `DriverSetupName`), Share, Notes and Show. A setup saved in the last 14 days that is not shared yet is offered
  at the top ("Share your new setup with other drivers?" with Share and Not now); sharing or Not now is remembered per
  file (`setups.json`: `shared`, `dismissed`; LMU's keys start with `lmu:`). An LMU setup is shared with its car from the
  file and its track folder, so it installs into the same folder on another PC.
- Agent API: `GET /api/setups?game=iracing|lmu` (root, groups, the car and track being driven, `trackFolder` for LMU),
  `POST /api/setups` (`note`, `dismiss`, `show`, `folder`, with `game`), `GET /api/setups-library` (the server's
  index), `POST /api/community/setups` (`share` with `game`, `install` for a driver's setup, `library` for the library's).
- Server: `GET /community/setups/<id>` also says the setup's `game`. Tests: `cloud/test/setups-library.test.mjs`,
  `lmusetups_test.go`.
