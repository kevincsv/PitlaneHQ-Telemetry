# App screens: Home, Analysis, notes, navigation

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- The look (the Nov 2026 redesign, "Workspace", PC, web and Pitlane HQ Desktop; the phones later): one layer at the end
  of index.html (`<style id="look">`) over every older rule. Pitlane HQ's own palette stays (night blue `--bg #0b0e14`,
  `--surface #10141c`, the amber `#f5b43c`, purple for your best, the same light theme) and so does the logo with the
  name in capitals (Barlow Condensed), at the top of the sidebar, on the splash and on the account welcome. Dense like a
  timing screen: page titles in Barlow Condensed capitals, section labels and table heads in small spaced capitals,
  body text in IBM Plex Sans, numbers in JetBrains Mono, tight panels with 6 px corners, no accent bar before titles,
  no glows and no gradients. A chosen tab, segment or card is a raised surface; a chosen chart channel or map layer has
  a thin amber outline. On computers the main tabs are a 208 px sidebar with the logo and each tab's icon and word; on
  phones and narrow windows the bottom bar, and the header on one line (the version moves to Settings → About).
  The lap analyzer keeps its sections and their order; its summary is one strip with hairlines, and every chart
  (speed, delta, throttle, brake, gear, steering, line) is one stack on the same distance axis. From 1180 px wide it is
  one workspace: the track map, sectors and corner consistency on the left, the chart stack on the right with the
  braking points and recorded laps under it. The overlay windows (`html.ov`) keep their own designs.
- Your iRating and licence of every discipline (`ratings.go`, `ratings.json` in the account, `/api/ratings`; iRacing's
  sessions say "Formula" for the formula cars, `discipline`/`raceDisc`/`catOf` read it as Formula Car): the game
  only says the one of the session you are in, so the PC keeps the last seen of each (every session, and from the
  recorded races, ir + irChange); Home's "Licence summary" (PC, web, Pitlane HQ Desktop; the phones' Licence summary)
  shows them per discipline with Community's symbols and colours (`DISC_IC`, `.c-*`; `DiscIcons.cs` on the Desktop),
  centred in their cards, the licence as a pill in its colour, only as the game shows it in a session ("B 3.21"): a race
  gives none, so a discipline you have only raced shows no pill until a session (`licPill`, `LicBadge`, `licFull`),
  the change of the last races of each and one short line ("Updated when you join a session with iRacing and Pitlane HQ open"). Never one "current iRating" mixed
  from every discipline. The phones show the same five cards (`Licences`/`LicCard`, the symbols as path data in
  `DISC_PATHS`), and `/api/ratings` carries the change of the last five races of each (`chg`, `n`) for the Desktop.
- Wherever other drivers show (the relative and the standings in the overlays, the app and Pitlane HQ Desktop; the race
  summary on the PC, web and phones), the cars a lap or more up or down on you carry a red "+1L" pill (they lap you,
  or finished laps ahead) or a blue "−1L". The Community car list shows no counts.
- Analysis (lap analyzer and coach): "Choose a session" is a window (discipline, kind of session, car
  and track, a day you drove on the calendar, then the session) that opens by itself when you enter
  Analysis from another tab; the bars only show what is chosen; the car and the track are two
  filters. Clicking a session always opens it, the highlighted (current) one too: when its laps did not load (an error,
  or the laps were still going up), it is read again, never from the page's cache (an empty answer is never cached).
  The phone apps filter their session list the same way. Laps A and B are one choice for the
  lap analyzer and the coach (`ANASEL`, a lap known by itself, not by its place in a list), with the same
  default and the model's references as B in both, each once ("▲ Next level", "★ Record"); with
  "+ Session" lap B is only the laps of the other session (and the references). A community lap is compared only with
  your own laps of the same track: Compare in Community needs a session of yours there with a valid lap (else it says
  you have none, `sesOnTrack`/`uiNotice`) and opens the comparator filtered to that track on your newest session there;
  a community reference of another track never shows as lap B (`refFits`). The window's title
  and its × stay at the top while it scrolls. "MY BEST" goes after the time.
- Track notes (`notes.json` in the account, `/api/notes`, `NOTES`/`saveNotes` in index.html): your own notes on a track,
  a general note and notes per corner (`n`, `dist`, `name`, `note`). The track page shows them and writes the general
  note (`trackNotesBox` on the web and the PC; `TrackNotesPanel` on the phones, which write the account's bundle like
  driver notes), and the phones list them all in Account → Track notes.
- Driver notes (like RaceLab's): your own marks on other drivers, one tag (dangerous, careful, clean, friend, our own
  icons: a red triangle, an amber circle, a green tick, a blue star) and a note only you see (`drivers.json` in the
  account, `drivers.go`, `/api/drivers`). A driver is known by the community's opaque key (`driverKey`, the races keep
  it as `k`; never their iRacing id) or by name for older races. The icon shows before the name in the relative and the
  standings (native overlays, the app, Pitlane HQ Desktop) and in the race summary, where you mark them (✎; the phone
  apps tap the driver and write the account's bundle); Analysis → My races lists them.
- Driver profiles show the nickname only (never the iRacing name); anonymous laps open no profile and
  never show on one (admins see them). The supporter badge comes by itself with a Stripe donation (`docs/spec/pro.md`), to Patreon patrons with
  the same email (`/patreon/webhook`, secret PATREON_WEBHOOK_SECRET; Patreon is no longer linked from any app) or by hand from the admin
  profile (a manual one stays); a supporter can hide their own. Badges show wherever your name does.
  A main tab always opens on its first sub-tab. The main menu: Home, Analysis, Telemetry (was Live; the
  same name in the phone apps), Overlays (its own tab, only on the PC), Community (just before Account), Account and, on the web and the phone browser at any width or orientation (not the PC), the
  Planner last. No text calls the section
  "Live" any more ("Telemetry → …"). Telemetry → Phone & sharing on the PC: your phone or tablet (pitlanehq.app or
  the app, same account, Telemetry → Connect, accept on the PC; a QR to the web app and the Android download) and
  sharing with a code; no Wi-Fi addresses, PIN or local links (`renderPhoneHow`).
- The welcome window of a new account (the downloads) stays until the driver closes it (`uiPanel` sticky).
- Home, clean data (`homeCleanHTML`, signed in, the Pit Wall Workspace layout, `pw3-home` in index.html): the greeting
  and, while a session runs, the live bar under it (the PC's state and Open live telemetry), four numbers (the laps and
  the hours on track this month, from the account's sessions, the races this month and the best result), then two
  columns. On the left (sticky) the recent sessions as compact cards (the track's short name, best lap, car, laps, the
  kind Race, Qualifying, Practice, Test drive, vs AI or DRINKS, a race's place and iRating change, how long ago); a race
  opens its choice of summary or laps. On the right three equal boxes, the days you drove (the last 18 weeks with the
  months and weekdays, "N days in 4 months"), the licence summary as a table (Category, Licence, SR, iRating; a rated row
  draws its iRating over your races under it) and Your feedback (stars, a text box, Send to the feedback inbox, Chat
  with support, then the small Invite a friend with the code, Share and your invites), and under them the leagues
  (`leagues.md`). Pressing the days you drove (anywhere on the squares) opens them as a calendar on every device
  (`openDays`; the phones' Days you drove screen): one month in the same squares, bigger and numbered, brighter the more
  sessions that day, from six months back (or the first day driven) to this month with arrows or a swipe; the day pressed
  (else the last one driven) is outlined and its races and sessions are listed under the month, newest first, each
  opening its summary. Each block of Home and Community sits on a card (the downloads' surface and border) for depth.
  The four numbers (`/api/sessions/summary`, sessionsum.js) and the session list (`/api/sessions`) read only the
  account's sessions (index `sessions_uploader_started`) and never their laps: each session keeps its lap count, best,
  time on track and friends' names (`SESSION_SUMS` on every change, all of them again once a day, migration 0078),
  because every open app asks about once a minute and D1 limits the rows read per day.
- Analysis's sub-tabs: Laps, Coach, My sessions (`cloudlaps`, every session in the account) and My races (`races`, the
  race summaries with the driver notes); Home's "See all" opens My races. The phone apps have the same four (and
  Telemetry, Standings and Tyres under Telemetry). A finished race shows no notice on the PC
  (it appears in My races); only the phones tell you.
- The Pit Wall Workspace layout of these three (Nov 2026, `pw3-analysis` at the end of index.html; it lays out what the
  app's own render functions draw, so every button, vote and link stays). No subtitle under their titles. From 1180 px
  wide they are workspaces; under that one column.
  - Coach: lap A against lap B as one full-width strip on top, then three columns. Left and sticky, Your plan for the
    next session. In the middle the gap to the reference, Work on this first and Ask the coach as three cards, the
    corners that cost the most as cards with a mini speed trace of A and B through the corner, then your pace among the
    drivers known here. Right and sticky, the track map, Corner by corner, Sectors and Offs explained (the incidents and
    the offs leave the map's card for their own).
  - My sessions: the filters, then Best per car and track on the left (your best lap and laps of each car and track,
    newest first; a card opens that session) and My sessions and Race summaries side by side. The session pills
    (Race, Practice…) are all one width with the word centred, a star sits beside the fastest lap of each car and track,
    and every race summary row ends in an amber "Summary ›" and opens My races with that race.
  - My races: a strip of race cards (date, track, start → finish, iRating change and incidents) chooses the race shown
    under it, the newest by default. Then the race's header (start, finish, incidents, iRating, Full report › for the
    whole report with the results, the story, the braking, Discord and delete), Lap times, Race summary beside What went
    well (and Where you lost time), Driver notes, and the My races table (a row shows its summary on top).

- Home shows the track guide's brief (the three corners that matter most) while the agent sees a session on a track and
  car the model knows (`homeBriefHTML`); pressed, it opens the whole guide.
- The lap compare map (Analysis and the coach, every device) has "▶ Replay": A and B drive the map together on the same
  clock, four times as fast, with the gap in metres and seconds and a bar to scrub (`cmpReplay`; the phones' TrackMap).
- The race summary has "Race pace" against the cars around you (coach-and-model.md, `racePace`).

## Beyond one lap: corner consistency, offs explained, race fuel, more charts

- Under the lap comparison (Analysis → Laps on the PC and the web, `renderLapMore`; the phones' Laps) every device runs
  the same functions of `pitwall-analysis.js` over lap A's session: "Corner consistency" (`cornerSpread`: each corner's
  time from just before its braking point to 150 m after its slowest point on every clean lap, how much it changes lap to
  lap, the time lost a lap on average against your best there, best, worst and how much the slowest speed changes; the
  corners that cost most first, the top three in red), with the laps' spread over the session (`lapSpread`: valid laps of
  your own within 3 % of the best, five at least) and the "Most consistent session" of that car and track. The server
  keeps each session's spread (`sessions.cons`, the variance, from SESSION_SUMS; migration 0090 filled the old ones; the
  apps get its square root as `cons`), and the session with the smallest one of each car and track carries a "Most
  consistent" pill in My sessions (`consSessions`). No composite or optimal lap is ever made from the corners.
- "Offs explained" (`offsExplained`): every Off Track and Loss of Control of the session, on the lap it happened, with
  what that lap did just before it against your best clean lap there: braked harder than ever there (a lock-up; there
  is no wheel speed, so a brake peak of 90 % or more and a tenth above the best lap's), braked later, too fast at turn-in
  or on the throttle early (each scored by 10 m, 4 km/h, 15 m and a tenth of brake; the biggest over one wins), else the
  line took you off. It shows in the map's incident marks (their title and the map's reading) and as a list under the map.
- "Race fuel" (`fuelUse`, `fuelPlan`): fuel per lap and the most in a lap from the session's laps (not through the pits,
  within 7 % of the best), the laps a tank lasts, and for a race in laps or minutes (timed: the laps at your pace plus
  the one under way) the fuel it needs with one lap spare, the stops, the fuel to start with and to add at each stop
  (the same at every stop) and the stints. The tank comes from the session (`tank`, the agent's DriverCarFuelMaxLtr
  times DriverCarMaxFuelPct, `sessions.tank`), else what the driver typed for that car (`pw.tank.<car>`).
- "More charts" (a switch, off by default, `LAPV.more`; the phones the same): a G-G chart (`ggOf`: g along the car from
  how the speed changes over time, across it from the speed and how much the path bends; only laps with a path), the
  steering against the speed in the corners (`steerOf`) with one line on understeer (`understeer`: the wheel A needs per
  g of cornering against B's, 10 % apart or more), and the tyre temperatures lap by lap where the game gives them
  (`tyreLaps`: the agent records each tyre's carcass temperature left, middle and right, averaged over the lap, as the
  trace's `tt`) with lap A's three temperatures of each tyre.

## Pedal and wheel check (in development: testers, admins in admin mode)

- Home shows "Pedal and wheel check" (`pedalCheckHTML` in index.html, the phones' Home the same) when the last
  session's own laps (three or more, pedals not estimated) show the same hardware problem on every lap
  (`pedalCheck` in pitwall-analysis.js): the brake never past 60 %, the throttle never at 95 %, the throttle reading 3 %
  or more while braking, the brake reading 3 % or more on full throttle, the wheel 2.5° or more off centre on the
  straights. "Got it" hides those problems on that device (`pw.pedalSeen`).

## Goals for this session

- Home (and the phones' Home) shows "Goals for this session" during a session and for four hours after it, when the
  driver has an earlier session on the same car and track (`goalsHTML` in index.html, `sessionGoals` in
  pitwall-analysis.js): beat that session's best lap, five clean laps in a row, and the official turn where that
  session's best lap lost the most to its own best pass there (from 200 m before the turn to 120 m after). Each goal
  shows ✓ once a lap of this session reaches it.

## Race story

- A race's summary opens with "Race story" (`raceStoryHTML` in index.html, `raceStory` in pitwall-analysis.js; the
  phones' race page the same): the start and the places after lap 1, every lap that won or lost places, the pit stops,
  each incident with its points, its kind and where on the lap, and the finish against the start.

## Your week

- Home (and the phones' Home) shows "Your week" once the account drove since Monday (`homeWeekHTML`, GET
  `/api/sessions/summary?from=<Monday>&pbs=1`, which adds the cars and tracks whose best this week beats every one
  before, `pbsOf` in alertslib.js, the account's own only): sessions, laps, time on track, races, the new bests with
  what they gained, each with "Share card" (the lap card, `shareLapCard`, with "New personal best" and the gain where a
  leaderboard place would be). Share copies the week as text (the phone's share sheet on the web and the phones).

## Search, CSV and keys

- My sessions' search also finds the date ("26 October"). The lap analysis has "Export CSV" beside More charts
  (`lapCsv`): lap A every 5 m with distance, lap time, speed, throttle, brake, gear, steering and the height when the lap
  has it. On the lap screen of the PC app and the web, [ and ] go to the lap before and after, S swaps A and B and the
  space bar plays the map's replay.

