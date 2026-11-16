# Lap paths, track layouts, turns, racing line and pit lane

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- The lap's path (Trace.x/y every 5 m) comes from the game's own position when it gives it (iRacing's Lat/Lon; AC and LMU
  make them from the car's position): exact, x east and y north of an origin `g` [lat, lon] (the first position seen on
  the track, rounded to 0.01°, one per track while the program runs; `place`/`geoBase` in cloud.go), carried as `Trace.g`.
  Without it, dead reckoning from the heading and speed as before (no `g`, the loop closed by spreading the drift). Two
  paths line up only in one frame (`sameFrame` on the web and the phones: both with `g`, B moved to A's origin, or both
  without); a layout from the game's position (`track_maps.geo`, migration 0052, `g` on `/community/trackmaps`) replaces
  one by dead reckoning whatever the lap time and is never replaced by one (the agent's `shareLayout`, the web's
  `shareTrackMap`). The layouts drawn by dead reckoning are rebuilt from a stored lap of the same game and track with the
  game's position (`cloud/src/trackmaps.js`, `rebuildTrackMaps`: a few tracks per ten-minute run, looked at again once a
  day, app_state `trackmaps_rebuild`; Admin → Server → "Rebuild the track maps" does them all, POST
  `/community/admin/trackmaps-rebuild`). A layout whose points are uneven (a game that gives its position slowly, Le
  Mans Ultimate: points on top of each other, then a gap of 15 m) is kept as the same path read at even steps
  (`evenPath`, the same number of points; when it is shared, when it is rebuilt, and the ones kept before once, twenty
  per ten-minute run, `evenTrackMaps`, app_state `trackmaps_even`, what was there under `trackmap_raw:<game>:<track>`,
  its edges measured again). And the PC replays the newest .ibt files of a track whose community map has no
  `g` to share its fastest valid lap with the game's position (`ibtTrackScan` in trackturns.go). A track's corners come
  from the geometry of its layout (`cloud/src/trackgeo.js`: a bend tighter than 300 m of radius for 20 m or more, bends
  the same way closer than 60 m are one corner, the apex where it bends most), fitted to the track's official number of
  turns when the game says it (iRacing's `WeekendInfo.TrackNumTurns`, `track_info` on the server, migration 0074, POST
  `/community/trackinfo` and `nturns` with every layout; the agent sends it once per track while it runs, for the session
  driven, `noteTrackTurns`, and for every track of the .ibt files on the PC, their header only, `ibtTrackScan`): more
  bends than turns join the closest neighbours bending the same way under 100 m apart, else the gentlest bend is no turn;
  fewer split a corner with two clear apexes (peaks 30 m or more apart, the bend easing under 60 % between them), then
  relax the radius limit step by step (400, 550, 750, 1000 m), never inventing a turn on a straight (`fitCount`). Served
  by `/community/turns` as `auto: true` (with `count` when known) until an admin places the official turns, which always
  win, so every device numbers the same corners. A circuit the turn reference knows never gets this far (see "The real
  turns of a circuit" below). The coach's corners (`cornerZones` in web/dist/pitwall-analysis.js, which the web, the PC app and the phones run,
  and in ovnative4.go; the phones' LapMath/Models keep a copy only for when their JavaScript engine cannot run) are the
  reference's braking zones named by those turns (two brake applications in one corner are one corner) plus the turns the
  reference takes without braking (a lift, from its last full throttle before the apex), whose tips never speak of braking.
- The racing line (`racingline.go`, `lineOffsets`/`cornerLine`/`lineTip` in pitwall-analysis.js; the phones' LapMath only as
  the fallback): both laps'
  paths (Trace.x/y, same frame) give how far A was to one side of B at every 5 m (drift out with a
  ±400 m moving average); the coach turns it into inside/outside at B's turn-in, apex and exit (1.5 m or more) and says
  it first when you brake at the reference's point on the wrong part of the track. The model's record and next levels
  carry their line (`idealXY`, ladder x/y, `lapPath` in model.js). The line is read in the coach's tips and the "Line"
  chart, and drawn on one map only: the lap compare's full-screen map (app-screens.md), where the road has its real width
  (the owner's choice 2026-11-15; the small maps never looked right with it). A lap with no path of its own (one taken
  from the standings, or recorded before paths were kept) has no line there, and its name in the map's header says
  "no racing line recorded". Every other map (analyzer, coach, race summary,
  track page, the live map, the Community board's map, the map overlay, phones) draws the track as a road with depth
  (shadow, rim, asphalt) from the community's generated layout (`trackMapFor`/`commTrackMap` on the web, `loadMap` in
  ovnative4.go, `trackLayout`, `layout` in the phones' `LapAnalysis`), never a lap's own path, no lap's line on it and no
  "Line A / B" switch; a lap's own path (or the live map's own laps) draws only the road's shape while the track has no
  layout. What goes on the road is placed by where on the lap it is: braking points, the coach's rings, incidents, the
  turns, the sectors, the gain and loss colours, the start/finish line, the direction arrow and the cars.
- Official turn numbers (`track_turns` on the server, `/community/turns`, `/api/turns`): an admin places T1 … Tn on a
  track's map in the race summary ("Official turns · Admin", clicks in order, saved for everyone, as fractions of the lap).
  The coach, the lap analyzer and the race summary (PC, web, phones: `turnNo`) give every corner the number of the
  official turn nearest its apex; a track without them keeps the corners counted from the laps.
- The pit lane (`pitlane.go`, `track_pits` on the server, `/community/pitlane`): every lap through the pits marks its
  points on the pit road (OnPitRoad); against a clean lap of the same track each becomes "metres to the left of the
  track at this 5 m point". The PC keeps learning it, but no map draws it for now (the owner's choice). Every map
  (analyzer, coach, race summary, phones, map overlay) draws the direction arrow beside the start/finish line.
- The coach's line: when the reference is a rival's lap (no path), the model's `lineXY` (the fastest lap of the car
  and track with a path) or, on the phones, your own best lap gives the line to compare with.

## The real turns of a circuit

- The geometry cannot know that a flat kink has no number (Spa's Kemmel kink took T5 and every turn after it was one
  late) or that a long corner counts twice (Pouhon is T10 and T11). So the circuits people know have their real turns
  written down: `tools/turns-ref/src.mjs` holds, per circuit layout, T1 … Tn in order with the way each one turns, the
  turns that share one bend, the numbered turns with no bend at all and the names (from the circuits' and the series'
  own maps and Wikipedia's track pages; `sure: false` where the numbering could not be checked). `node
  tools/turns-ref/build.mjs` places them on the first layout listed (fetched from the server) and writes
  `cloud/src/turnsref-data.js`: per layout its length, the games' track ids, the words of its name and each turn's
  metres from the line, direction, whether it is a clear corner or a light one, and its name. Change `src.mjs` and build
  again, never the data file; `--show` prints every layout placed again.
- `/community/turns` (`refTurns` in `cloud/src/turnsref.js`): turns an admin placed by hand win; else the reference's,
  placed on the track's own layout (`placeRef`), served with `auto: false`, their `names` and `ref` (the reference's
  key), so every device shows the numbers and the names with no change in the apps; else the geometry's (`auto: true`).
  Hand-placed turns without names take the reference's when it has as many turns (`refNames`).
- `placeRef` finds the reference's corners on whatever layout the track has (another game's, one drawn again, a line a
  little further on): the layout's bends (`bends`: stretches tighter than 900 m of radius, cut at a double apex), the
  clear corners (40° or more on the reference's layout) matched in order by direction and by the distances between
  them, two corners that one game draws as one long bend or a double apex drawn as two bends allowed, then the light
  turns between the clear ones as in the reference, moved to a bend of their direction within 40 m. A layout more than
  4 % longer or shorter, a clear corner missing or found over 150 m from where it should be, or the first one over
  400 m from the line: not that layout, and the track keeps the geometry's corners.
- A track takes its reference by the game's own id (`ids`), else by the circuit's name in the track's name together
  with the lap's length (`match`: how an ACC or AC track, or a new id, finds it; `NOT` lists the layouts of a known
  circuit that are another layout). A track of no reference (24 of the 117 the server had on 2026-11-15: the
  Nordschleife, VIR, the Charlotte Roval, Oschersleben, Navarra, Ledenon, Rudskogen, Winton, Oran Park, the smaller
  Oulton, Lime Rock, Hockenheim and Fuji layouts and the dirt tracks) stays as before; Admin → Tools → "Turns to check"
  says `ref` for the ones that have it. `cloud/test/turnsref.test.mjs` checks the data and the placing on real layouts.

## Corners from how drivers drive, edges and the wrong layout

- The automatic turns (`/community/turns` without official ones) also read where the fast drivers slow down: `slowsOf`
  (model.js) takes the braking zones of the models already built for the track's cars, and `cornersOf(x, y, 5, want,
  slows)` drops a bend nobody slows for first (a kink taken flat) and adds a corner wider than the radius limit that the
  drivers brake for. Admin → Tools → "Turns to check" (GET `/community/admin/turns-check`) lists the tracks with no
  official turns placed and the ones whose corners do not match the game's count.
- **Edges**: `rebuildEdges` (trackmaps.js, two tracks per ten-minute run, again after a week) puts up to 40 laps with the
  game's position beside the layout (`lateral`) and keeps the outermost 3 % at each point as the road's edges
  (`edgesOf`, table `track_edges`, migration 0085). `/community/trackmaps` serves them as `edges` {l, r, laps} when they
  were measured on the same layout. The coach's "Track left unused" reads them (coach-and-model.md).
- **The wrong track or layout**: a lap more than 6 % longer or shorter than its track's layout (`fitsLayout`, the trace's
  points times its bin against the layout's points every 5 m) never goes into that track's model (`learnNewLaps`) nor
  onto its leaderboard (`keepBestLap` with `len`).
- Turn names: an admin who placed a track's official turns can name them ("Turn names · Admin" beside "Official turns",
  POST `/community/turns` with `names` alone, `track_turns.names`, migration 0096; "" a turn without one). `/turns`
  serves them as `names` with official turns only, and the analysis heads a named turn's tips "T5 Tertre Rouge"
  (`turnLab` and `ctx.turnNames` in pitwall-analysis.js; the phones note them when they read the turns).

## Height

- iRacing laps carry the car's altitude every 25 m (`trace.z`, `Alt` in `lapVars`, `addAlt`/`altitude` in cloud.go;
  laps read again from a .ibt file get it too). The lap analysis's More charts has "Height" (`heightSVG`), from the
  lap's lowest point, and a corner of the coach braked 3 % or more downhill or uphill shows ↘/↗ with the slope
  (`slopePill`, `slopeOf` in pitwall-analysis.js; the phones the same). Flat 2D only.

