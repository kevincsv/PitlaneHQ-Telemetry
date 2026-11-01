# Assetto Corsa Competizione and Assetto Corsa

Both games are in development (CLAUDE.md, "Feature status"): the agent reads them, and the app offers them, only to
the admins with admin mode on and to the testers (`gameWIP`/`gameLocked` in games.go, `GAME_WIP`/`wipOk()` in
index.html). Nothing to set up for either.

## How the agent reads them

- Shared memory, both games (`ac.go`, layout `ac_layout.go`): `Local\acpmf_physics`, `acpmf_graphics`,
  `acpmf_static`, written into the same iRacing-style image LMU uses. Both games use the same names: the running
  program tells them apart (`runningAC`). The session type comes from the game (`accSessionType`): practice, qualify or
  race, never a fixed "Race".
- ACC's broadcasting API (`accbcast.go`): a UDP connection to the game on 127.0.0.1 with the port and password of
  `Documents\Assetto Corsa Competizione\Config\broadcasting.json` (UTF-16, kept as it is). A file with no port (0)
  gets 9000 (and the password "asd" when it has none); ACC reads the file only when it starts, so the agent tells the
  app (`status.bcast` = "restart") and the Settings → Game note and the dimmed Relative, Standings and Gaps say to
  restart the game. It gives, for every car, the driver, team, race number, car model (`accModels`: name and class
  GT3, GT4, GT2, CUP, ST, CHL, TCX, with a colour per class), position, laps, last and best lap, the place on the lap
  and the pit lane. The car index is the shared memory's carID. Without it (an old file, a wrong password) the other
  cars are still on the radar, relative and map from the shared memory, as "Car 2", "Car 3".
- The first Assetto Corsa's shared memory has only your own car (and no engine temperatures). The other cars come from
  Pitlane HQ's own in-game app (`acapp/PitlaneHQ/PitlaneHQ.py`, `acapp.go`, the owner's choice): a Python app of the
  game that draws nothing and writes every car (driver, car, place, laps, place on the lap, last and best lap, pit
  lane, position) ten times a second to `apps\python\PitlaneHQ\field.txt` in the game's folder. The agent installs it
  there (the folder of the running acs.exe) and switches it on in `Documents\Assetto Corsa\cfg\python.ini`
  (`[PITLANEHQ] ACTIVE=1`) when Assetto Corsa runs, and reads the file into the same field ACC's API fills. The game
  loads its apps when it starts: while the file is not being written, the app's note and the dimmed Relative,
  Standings, Radar, Gap graph and Track position bar say to restart the game (`status.bcast`).

## What works where (`web/dist/pitwall-games.js`)

| | ACC | Assetto Corsa |
| --- | --- | --- |
| Lacks | iRating, licences, incidents | iRating, licences, incidents, engine temperatures |
| Overlays that do not work (dimmed, struck-through badge, never opened by Auto) | Incident log | Incident log, Engine |
| Relative and Standings columns left out | iRating, iRating change, licence, incidents | iRating, iRating change, licence, incidents |

## Pages

- Home, Analysis, Coach, Sessions, Races and Community show the game like the others (the game switch, with
  "Beta" like Le Mans Ultimate, the owner's choice; still only for admins in admin mode and testers). Home's Licence summary is dimmed with "… has no
  licences or ratings".
- Leagues: the hub has iRacing and Le Mans Ultimate leagues only (`LEAGUE_GAMES` on the server); for ACC and Assetto
  Corsa the page says leagues are not available yet and Home has no leagues card.
- Public pages, records pages and the Discord bot stay iRacing and Le Mans Ultimate.
