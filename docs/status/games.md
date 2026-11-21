# Games

Status as of 2026-11-14. Behaviour is in `docs/spec/lmu.md` and `docs/spec/assetto-corsa.md`.

## Le Mans Ultimate

- Released to everyone. The "Beta" label is gone everywhere (the owner's choice, 2026-11-14). Every new sign-up since Nov 3 plays LMU.
- Shipped in 0.9.13: virtual energy, multiclass traffic, damage, pit stop cost per stint, hybrid battery, Discord bot
  LMU commands, league class tags, records by game version, admin-named official turns. 0.9.15 added the
  "Turn on telemetry" window.
- Open: the LMU crash (BugSplat, reported Oct 27) needs logs from a driver.
- LMU work may be built without asking, but never changes iRacing behaviour. Ideas list: project files
  `lmu-upgrade/lmu-gaps-and-ideas.md`.

## Assetto Corsa Competizione and Assetto Corsa

- In development (testers and admins only), labelled "Beta" where offered. One tester drives ACC daily since
  2026-11-13 (38 sessions in 10 days); Assetto Corsa was never tried with the real game.
- 2026-11-21, from that tester's laps: the out lap and the first timed lap were kept as one valid lap of twice the
  time (Monza, 229 to 250 s), and 45 of 160 laps were the 0 seconds from the box or the grid to the line. Fixed in
  0.10.2 (`earlyWaitS`, `minLapS` in cloud.go), in the test build for testers; production gets it with the next batch.
  Still open: on the Nürburgring 24h layout no lap of his ever closed (one of 2,311 s), not explained yet (it needs
  his log or a lap driven with the fix).
- ACC uses the broadcasting UDP API (`accbcast.go`). AC has an in-game app (`acapp/`) that the agent installs.
- Open: overlay-race feedback refuses ACC/AC (`ovfeedback.go`), and a leagues scan for ACC/AC (offered, not asked).

## iRacing

- The Planner waits for iRacing to switch its data API back on. The season comes from the schedule PDF the owner
  uploads in the admin Season tab each season, plus race starts the PCs report.

## Track maps (every game)

- 2026-11-15: the turns of 95 of the server's 117 track layouts come from a reference of the real turns (numbers and
  names), placed by the server; the phones get them with no change. Every list was compared turn by turn with the
  circuit's map on Wikipedia (61 maps, the file per layout is in `SOURCES` of `tools/turns-ref/src.mjs`); that changed
  Daytona road (12 turns), Bathurst, Oulton, Okayama, Zolder, Hockenheim, Miami, Mexico, St Petersburg, Algarve,
  Tsukuba, Interlagos, Sebring's Fangio turns, Mosport (10), Donington (11), Brands Indy (6) and many names. On the
  test channel, production waits for the 0.9.22 promotion.
- 2026-11-16: the 15 layouts Le Mans Ultimate and iRacing share are one list each (same numbers, names and places in
  both games). Daytona road, Algarve and Silverstone International had a list per game and now use Le Mans Ultimate's;
  Daytona's banking turns were 230 m apart between the games.
- No map with numbers found, so the numbering is not checked (`sure: false`): Le Mans (names only), Motegi, Zolder's
  T6 to T9, Snetterton 200, Okayama short, the Silverstone International and Nürburgring sprint layouts, the historic
  Spa, Barcelona and Mexico. Spa keeps the 19 turns in use since 2022 (Wikipedia's drawing counts 20 with two kinks).
  Watkins Glen's short circuit is numbered 1 to 7 (its map keeps the long circuit's 10 and 11).
- 22 layouts keep the geometry's corners: VIR (its own numbering skips 13 and has 5a, 6a, 14a, 17a), Charlotte Roval
  (Wikipedia shows the 2024 layout, the game has 2019), Oschersleben, Navarra, Lédenon (maps with names only), Rudskogen
  (no map), Oran Park, Winton Club, Oulton Island, Nordschleife, Lime Rock's other layouts, Hockenheim Outer, Fuji
  without chicane, the dirt and rallycross tracks. ACC and AC have no layouts on the server yet; they will take a
  circuit's reference by its name.
