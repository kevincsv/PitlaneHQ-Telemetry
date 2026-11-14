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
  The lap analyzer (Pit Wall Workspace, `pw3-laps` in index.html): Lap A vs lap B across the top, then four numbers
  (A vs B, Costs the most, Furthest behind, Corners vs straights, and Gains most when A gains somewhere), then three
  columns. Left: Laps (My laps and Community with its PRO badge) and Sectors (a table, A, B and the gap). Middle: the
  charts in one panel, its Show chips (filled amber when on) and then one titled chart per channel on one distance axis
  (Speed, Gap to lap B, Throttle, Brake, Gear, Steering, Line), each with its legend and, on the right, the values at
  the point under the pointer or finger (the whole lap when nothing is touched), the turns as thin lines, Braking
  points, Corner consistency (with the race fuel and More charts), Recorded laps. Right: Track map, Corners, Offs
  explained and "Learn from this lap in the Coach". From 1101 px the side columns stay in view (their top just under the
  header and the demo banner; when a column is taller than the window, Laps keeps its top and its lap list scrolls inside,
  and the right column keeps the Track map whole while the panels under it scroll inside); narrower it is one column in that order. My laps lists
  every session in the list, each under a raised header (its kind, date and track, its laps), newest lap first, the
  fastest valid lap with a star and the others with their gap to it, each with A and B; A on a lap of another session
  makes that session session A. Community shows the community laps loaded as references and then the leaderboard of
  the car and track (loaded when the tab opens, the same laps as "Compare with the community"), each lap with its place,
  time, driver and gap to the record and a B button that loads it as lap B, and "Compare with the community". Recorded
  laps: pressing a row (or Enter on it) makes it lap A, the rows of A and B are marked, and each row ends with A and B.
  The Track map is the Coach's map (`renderCmpMap`, its colours, turn labels, legend and chips), plus a line under it
  with the distance, the corner, both speeds, the gap and how far B is ahead or behind, and a ring for lap B at the same
  moment of its lap. On computers (a fine pointer, from 1101 px) the whole Track map panel of Laps and of the Coach
  grows from its top right corner while the pointer is on it, above the page and as large as the window allows, without
  moving anything else; on phones and touch screens it does not grow. On the Coach (from 1101 px), what is left of
  the side columns once the middle column ends moves under the three columns at full width (`pw3CoachFlow`): Your
  plan's later steps, with their votes, "Was this plan useful?" and its button, in a wide Your plan, and the right
  column's panels that hang below the middle side by side. The Track map always stays at the top right and keeps its
  growing. It is worked out when the coach is drawn, the window resized or a panel fills in, never while scrolling. Pressing a turn (on the map or in Corners) pins
  the charts there and opens "T3 insight" under the map (the tip, the braking against B, the slowest speeds, the speed
  of both laps through it, "Work on T3 in the Coach"). The overlay windows (`html.ov`) keep their own designs.
- Overlays, Community, Leagues, My account and Settings in the Pit Wall Workspace look (`pw3-more` in index.html,
  PC, web and Pitlane HQ Desktop): the title and the page's own tabs on one row (the chosen tab amber), the disciplines
  as one row of cards under them where the page filters by discipline, then the content. Community's Summary is you in
  the community on the left, your numbers and leaderboards in the middle and the latest records on the right. Leagues
  has one filter bar (days, Looking for drivers as a switch, the order, the search), the leagues posted in Pitlane HQ
  and then the most active leagues. My account is the account card on the left, the ways to sign in, security, sync
  and devices, blocked drivers and Delete account in the middle, Pitlane HQ Pro and Admin on the right. Public name opens
  the name choice right there in the account card (Save name, Cancel), with no trip to Community. Settings is one
  page with its sections listed on the left (General, Game, PC and programs, VR, Ask the coach, About; a section shows
  only when it has something on that device, so the web keeps only General, Game and About). The Overlays editor keeps
  its list, screen and inspector, with the presets and actions in one card and the whole list of overlays shown.
  The pieces are the design's own (round 2): the page's tabs a dark well with the chosen one raised and underlined in
  amber, panels with Barlow capital titles, amber chips and segmented controls, switches for every on/off (checkboxes
  included). Every control looks the same everywhere (the owner's choice B, `pw3-contrast` in index.html):
  buttons and chips one step lighter than the card with a soft top light, boxes, fields and segmented wells sunk darker
  than the card, Community's "My leaderboards" a table (track and car, your best, place, record, gap, last sessions), a
  league a card with its initial, the week as seven letters, Start, Your time and Next race, Cars, the text, Join the
  Discord and when it was posted. On phones the overlays' screen and inspector come before their list, and My account
  shows the work first, then Pro and Admin, then the account card.
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
  default and the model's references as B in both, each once ("▲ Next level", "★ Record"); the
  lap analyzer's "Select sessions" ticks one or several sessions in the same window (once one is ticked, the list shows
  only the sessions of the same car, track, layout and game; the window fits the screen and only the list of sessions
  scrolls, the filters, the calendar and the buttons stay;
  "Compare N sessions"): the newest (or the current session A) is session A and the others' laps are loaded with the
  same cloud loading as "+ Session" (`CLOUD.lapsB`), so lap B can be any lap of them all (the best of the other sessions
  by default) and the coach gets them too. A community lap is compared only with
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
- The tour (PC app and web, not the phones; `atourStart` in index.html): six short steps over the real pages, the lap
  analyzer (lap A and B, then its charts, left out when no laps are recorded), the coach and telemetry, each one dimming
  the rest and outlining one part with a card (Skip, Back, Next; Esc and the arrows). Going to another page it first outlines the
  tab that opens it ("Opening Coach…"), presses it, lets the page fade in and then outlines the part, so each change is
  seen; while the page scrolls the outline and the card move with it at once and stay on their part. It starts by itself once per device
  the first time someone signed in opens the app with no window open (`pw.tourDone`), never in the overlay windows, keeps
  the analyzer's session picker closed while it runs and goes back to the page it started from. "Take the tour" in
  Settings → About and the quick search start it again. It is the one place where a text says what a page is for (the
  owner's choice, 2026-11-14).
- Home, clean data (`homeCleanHTML`, signed in, the Pit Wall Workspace layout, `pw3-home` in index.html): the greeting
  and, while a session runs, the live bar under it (the PC's state and Open live telemetry), four numbers (the laps and
  the hours on track this month, from the account's sessions, the races this month and the best result), then two
  columns. On the left (sticky) the recent sessions as compact cards (the track's short name, best lap, car, laps, the
  kind Race, Qualifying, Practice, Test drive, vs AI or DRINKS, a race's place and iRating change, how long ago; a race
  session with no race summary read near it shows as a session with its Race pill); a race opens its choice of summary
  or laps. On the right three equal boxes, the days you drove (the last 18 weeks with the
  months and weekdays, "N days in 4 months"), the licence summary as a table (Category, Licence, SR, iRating; a rated row
  draws its iRating over your races under it) and Your feedback (stars, a text box, Send to the feedback inbox, Chat
  with support, then the small Invite a friend with the code, Share and your invites, and while Pro has not started the line that the months earned start when it does), and
  under them the leagues (`leagues.md`; with demo data on, six invented leagues from `pitwall-demo.js`). Below 1100 px
  wide everything is one column. The look is the design's own (panels with Barlow Condensed titles, four separate number
  cards, outlined uppercase kind pills). Pressing the days you drove (anywhere on the squares) opens them as a calendar on every device
  (`openDays`; the phones' Days you drove screen): one month in the same squares, bigger and numbered, brighter the more
  sessions that day, from six months back (or the first day driven) to this month with arrows or a swipe; the day pressed
  (else the last one driven) is outlined and its races and sessions are listed under the month, newest first, each
  opening its summary. Each block of Home and Community sits on a card (the downloads' surface and border) for depth.
  The four numbers (`/api/sessions/summary`, sessionsum.js) and the session list (`/api/sessions`) read only the
  account's sessions (index `sessions_uploader_started`) and never their laps: each session keeps its lap count, best,
  time on track and friends' names (`SESSION_SUMS` on every change, all of them again once a day, migration 0078),
  because every open app asks about once a minute and D1 limits the rows read per day.
- Analysis's sub-tabs: Laps, Coach, My sessions (`cloudlaps`, every session in the account, the race summaries and the
  driver notes) and Statistics (`stats`). My races has no tab since Nov 2026 (the owner's choice): every link, hash or
  search that opened it (`races`, Home's "See all") opens My sessions, and a race summary's "Summary ›" opens the race's
  whole report in its window (`openRace`). The phone apps have the same four (and Telemetry, Standings and Tyres under
  Telemetry). A finished race shows no notice on the PC (it appears in My sessions' race summaries); only the phones tell
  you.
- The Pit Wall Workspace layout of these screens (Nov 2026, `pw3-analysis` at the end of index.html; it lays out what the
  app's own render functions draw, so every button, vote and link stays). No subtitle under their titles. They use the
  design's own components (panels with a #2a3140 edge, radius 8 and padding 10, titles in Barlow capitals, its pills,
  buttons, tables and corner cards). From 1100 px wide they are workspaces; under that one column (the right column
  last).
  - Coach: lap A against lap B as one full-width strip on top, then three columns. Left and sticky, Your plan for the
    next session. In the middle the gap to the reference, Work on this first and Ask the coach as three cards, the
    corners that cost the most as cards with a mini speed trace of A and B through the corner, then your pace among the
    drivers known here. Right and sticky, the track map, Corner by corner, Sectors and Offs explained (the incidents and
    the offs leave the map's card for their own). Coach has no title on computers (the sub-tab names it), the strip reads
    "Lap A · comparing" and "Lap B · reference", a plan step shows what you do and how to fix it (not the general why),
    a corner card reads turn, phase and loss, the tip and why, then Braking, Slowest and Brakes at (trail and coast in a
    line under them) with Practise and the votes at its foot. The sectors are a table (A, B, gap and the lap). With no
    other driver known, the pace card says "No other driver of this car and track is known yet. Your laps are compared
    with each other until community laps come in.".
  - Coach's left column starts with the Laps panel of the Lap analyzer (in place of the picker bar and the "Looking at"
    line). My laps lists the laps of the chosen sessions under a header per session (Select sessions picks them), A and B
    on each lap set the Coach's lap A and its reference, and a star marks the fastest valid lap. Community lists the
    model laps the Coach can compare with and then the same leaderboard of the car and track as Laps (place, time, driver,
    gap to the record), where B makes that community lap the Coach's reference, under "Compare with the community". Lap
    A against lap B stays on top.
  - My sessions: the filters, then Best per car and track on the left (your best lap and laps of each car and track,
    newest first; a card opens that session) and My sessions and Race summaries side by side. The session pills
    (Race, Practice…) are all one width with the word centred, a star sits beside the fastest lap of each car and track,
    and every race summary row ends in an amber "Summary ›" and opens that race's report.
  - My sessions ends with Driver notes (your marks on other drivers, with its search), in the design's panel.
  - Statistics (`renderStatsView`; `renderStats` is the live Stats widget's): the period (4 weeks, 3 months, 12 months,
    All) at the top right, then six numbers of the period with the change on the period before: Laps, Time on track,
    Sessions, Races, Personal bests (a session that beat every earlier best of its car and track) and Incidents per race
    (fewer is green). Three columns below (one under the other on a phone). Left, Personal bests: each new best of the
    period, newest first, with its date, track, car, time and the time it took off (a row opens that session). Middle,
    Best lap per week: chips of the period's cars and tracks (the most driven first), the best lap of each week, a
    bigger amber dot where it beat every earlier best, over the community of the same car and track as dashed lines
    (its record in blue, its median in grey, from the leaderboard Laps and the Coach show; it keeps each driver's best
    today and no history, so they are flat). The point under the pointer says your time against both and the gap; the
    line under the chart says where your best stands ("Top 13% of 48 drivers · 0.9 s off the community best"); Consistency per session (the server's `cons`, or worked out from
    the valid laps within 3 % of the best) beside Laps and hours per week (laps as bars, hours as a line); Time per
    corner: the best lap of the first and the latest week (the last 12 weeks at most) against your best lap of that car
    and track, corner by corner with the coach's comparison (`coachCompare`, braking zone to exit), the change in green
    (time gained) or red, a line of the last 8 weeks, and the whole lap last. Right, iRating after each race by
    discipline (Community's colours; not for Le Mans Ultimate), Safety rating (the licence the PC last saw for each
    discipline, or LMU's safety and driver rating: the game gives no history, so there is no chart), Incidents per race
    (bars) and Finishing positions (how many in P1, P2–3, P4–5, P6–10, P11–15, P16+, then the last six results with the
    incidents and the iRating change; a row opens the race). On the web, where races are only rebuilt from the
    sessions, the places come from your race sessions. Statistics reads up to 200 sessions of the game itself
    (`/api/sessions?limit=200`), more than My sessions keeps. Every chart reads the point under the pointer or the
    finger in the line under it. With no sessions it says one sentence. The demo (`pitwall-demo.js`) has four months
    of practice for four of its cars and tracks, 22 races, four Le Mans Ultimate sessions and 48 drivers on each
    community leaderboard.
  - Which game?: entering Analysis from another tab, and every "choose a session" (`openSessPicker`), first asks the
    game, every time: a card for iRacing and one for Le Mans Ultimate in the controls' look (its badge "iR" or "LMU", its
    name, how many sessions when known), one close button, the last one chosen with an amber edge and badge and a "Last
    time" pill (`pw.anGame`). The session window then opens on that game, its name in an
    amber pill beside the title.
    On My sessions and Statistics, entering Analysis asks only the game.

- Home shows the track guide's brief (the three corners that matter most) while the agent sees a session on a track and
  car the model knows (`homeBriefHTML`); pressed, it opens the whole guide.
- The lap compare map (Analysis and the coach, every device) has "▶ Replay": A and B drive the map together on the same
  clock, four times as fast, with the gap in metres and seconds and a bar to scrub (`cmpReplay`; the phones' TrackMap).
- The race summary has "Race pace" against the cars around you (coach-and-model.md, `racePace`).

## Beyond one lap: corner consistency, offs explained, race fuel, more charts

- Under the lap comparison (Analysis → Laps on the PC and the web, `renderLapMore`; the phones' Laps) every device runs
  the same functions of `pitwall-analysis.js` over lap A's session: "Corner consistency" (`cornerSpread`: each corner's
  time from just before its braking point to 150 m after its slowest point on every clean lap, how much it changes lap to
  lap, the time lost a lap on average against your best there (on the PC and the web a loss reads negative in red, "−1.22 s", a gain positive in green), best, worst and how much the slowest speed changes; the
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
  and the stints. A stop comes only between laps: a tank lasts its whole laps (the last stint also carries the spare
  lap), and the stops are the fewest that cover the race that way. The stints are as even as they can be (longer
  first), a race with a stop starts full, and every stop adds the same fuel when that works (else "Add at the stops"
  lists each one). The tank comes from the session (`tank`, the agent's DriverCarFuelMaxLtr
  times DriverCarMaxFuelPct, `sessions.tank`), else what the driver typed for that car (`pw.tank.<car>`), else the one
  most drivers of that car and track had.
- Race fuel learns from everyone (GET /community/fuel?game&trackId&carId, `cloud/src/fuel.js`): each session keeps the
  fuel its laps took (`sessions.fuel`, `fuel_n`, `fuel_t`, the same laps as `fuelUse`; migration 0102 filled the old
  ones, the daily pass at 03:00 keeps the last two days), and the answer is the median driver of that car and track over
  the last year (each driver once, their sessions' laps together), with three drivers at least, kept an hour in the
  server's cache. `fuelUse` (ctx.comm) uses it alone before the driver has two laps here, and mixes it with theirs as if
  it were three more laps after that, so a few laps of the driver's move it less than many. Per lap says where the figure
  comes from under it ("12 laps · 14 drivers", or "14 drivers"), and Most in a lap is "–" with no laps of their own.
  Every device does the same (`fuelComm` in index.html and on the phones). Never in demo data.
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

## Team (in development: testers, admins in admin mode)

- A "Team" sub-tab in Telemetry after Strategy (`v-team`, `renderTeam` in index.html; on the phones after Tyres in
  Live), with the "In development" pill. Everyone else sees the Team mode card there (`WIP.team`). What it shows and
  how it works is in `team.md`.

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

