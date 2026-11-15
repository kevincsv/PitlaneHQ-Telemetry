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

- In development (testers and admins only), labelled "Beta" where offered. Never tried with the real games.
- ACC uses the broadcasting UDP API (`accbcast.go`). AC has an in-game app (`acapp/`) that the agent installs.
- Open: overlay-race feedback refuses ACC/AC (`ovfeedback.go`), and a leagues scan for ACC/AC (offered, not asked).

## iRacing

- The Planner waits for iRacing to switch its data API back on. The season comes from the schedule PDF the owner
  uploads in the admin Season tab each season, plus race starts the PCs report.

## Track maps (every game)

- 2026-11-15: the turns of 93 of the server's 117 track layouts come from a reference of the real turns (numbers and
  names), placed by the server; the phones get them with no change. Not checked against an official map (`sure: false`
  in `tools/turns-ref/src.mjs`): Le Mans, Daytona road, Bathurst, Oulton International, Okayama, Phillip Island, Zolder,
  Hockenheim, Miami, Mexico, St Petersburg, Algarve, Bahrain Outer, Tsukuba, Summit Point, the Silverstone
  International and Nürburgring sprint layouts. 24 layouts have no reference yet (listed in
  `docs/spec/tracks-and-maps.md`). ACC and AC have no layouts on the server yet; they will take a circuit's reference
  by its name.
