# UI redesign (PC and web)

Status as of 2026-11-07. The look is described in `docs/spec/app-screens.md` ("The look").

- Asked 2026-11-06 because people called the old look generic. Scope: PC app and web first, phones later.
- First restyle (graphite, one CSS layer) was rejected: the owner wanted new layouts, not only new colours.
- Prototypes: A https://claude.ai/artifact/SC4ArTdy9sU41oHfEwiwwY, B https://claude.ai/artifact/JpvtXU7NzV3K7haKu4yhw9,
  A2 https://claude.ai/artifact/EVMYHpVbVxqFU7372gBMgQ (copies in the project files, `ui-redesign/prototype/`).
- Chosen: A2 "Workspace" (lap list and map on the left, channels on the right), keeping today's analyzer and page
  structure, Pitlane HQ's colours (night blue #0b0e14, amber #f5b43c, purple for best) and the logo and wordmark.
  Never name another product as the inspiration in code, docs or texts.
- State: commit 06cb33a, live on beta only (cloud run 42233220551, Windows run 42233227054). On master but not
  promoted. Production waits for the owner's OK.
- Not done yet: the phones, the landing screenshots (`web/dist/landing/<lang>/*.jpg`), the public SEO pages (`cloud/src/seo.js`).

## Pit Wall Workspace (design 3), 2026-11-14

- Refined in the artifact https://claude.ai/artifact/Ns45NZTLYFetLpkNjsSS5F (source in the project files,
  `web-looks/redesigns/`), then ported into the real app on the working branch `claude/project-thread-757k7n`
  (not on master). Each part is its own block at the end of index.html (`pw3`, `pw3-home`, `pw3-laps`,
  `pw3-analysis`, `pw3-live`, `pw3-more`).
- Ported: the frame (icon rail, sub-tabs as a well), Home, Lap analyzer with Select sessions, Coach, My sessions,
  My races, Telemetry, Standings, Tyres, Overlays, Community, Leagues, My account, Settings.
- Beta only. Production waits for the owner's OK. The phones are not changed (their own Track First design), so
  "Only mine" in Community and the old layouts stay there until a follow-up in the phone repository.
- 2026-11-14 evening, round 2 (the owner said beta did not look exactly like the artifact): every screen rebuilt
  with the artifact's own CSS rules, the page tabs and game switch in the header row, card contour B (the owner's
  pick from https://claude.ai/artifact/6EeQx4An9ZRcxZag8JsurS), and the Select sessions window only lists the
  ticked session's car and track, fits the window and has bigger controls. Beta only.
- 2026-11-14: the first-run tour (analyzer, coach, telemetry; `docs/spec/app-screens.md`) is on the working branch for
  the next PC and web beta build. Not on the phones (the owner's choice).
