# Community, leaderboards, rivals and car families

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- Race rivals named after the fact: the PC sends its race history's rivals once (`nameOldRivals`, `/rival-names`:
  matched by car, track and best lap; Anonymous or "Juan M." rivals this account shared take their whole name, which only admins see).
- One car under several badges is one car (`cloud/src/carfamily.js`, `CAR_FAMILIES` by the car's name: the Super
  Formula SF23, NASCAR's Cup Next Gen, Gen 6, Xfinity, Truck and ARCA, the Supercars Gen3, Gen2 and V8): they share one
  leaderboard, record, track page row, public page, Discord board and coach model under the first badge the server saw
  (`car_families`, migration 0045; the SF23 under 171 by 0044). A new badge joins by itself the first time a session or
  a lap brings it (`noteCar`), its laps going under the family's number, each driver keeping their faster lap; the
  sessions keep their real car but every list of cars (the session picker's filter) shows the family without the brand
  (`carFam`/`CAR_FAMS` in index.html, the same as `CAR_FAMILIES`), and a board lists its badges (`ids` in /combos, `onBoard` in index.html). Different
  layouts of a track (Spa's Grand Prix and Historic Grand Prix) stay apart. A new family is one line in `CAR_FAMILIES`.
- Leaderboards are by lap time, per discipline (Oval, Sports Car, Formula Car, Dirt Oval, Dirt Road),
  without license classes. The fastest lap of each car and track in an account is shared by itself
  (no "share" button), under the public name or as Anonymous. The discipline symbols are our own
  (`DISC_IC`), never copied; the same discipline cards are in Community and in "Choose a session".
  Sharing is never optional (no switches to keep the times, the traces, the rivals' laps or the live link to
  yourself): only the public name and Anonymous are chosen. Community on the web and the PC is four parts (`CMV`, `cl-*` in index.html, the "clean data" design): Summary
  (your numbers, your leaderboards with the record of each and how your best came down over your last sessions:
  `rec` and `trend` on /profile?me=1; the latest records; you in the community), Leaderboards (the table with the
  sectors, 20 drivers in view and the rest scrolling inside under its header, and the track map coloured by sector against your lap, or the record when you have none: the shape and
  where each sector ends from a lap of the board with its telemetry, `commMapGeo`; a press on it opens the full-screen
  map of app-screens.md with the driver chosen as lap A against your lap, or the record, as lap B, when the board has a
  lap with its telemetry, `commFullMap`) and Recent records. The discipline
  cards sit above Leaderboards and Recent records and filter both; Leaderboards has no "Only mine" switch. On a phone
  (520 px or less) the cards are one per line with the count on the right, the track and car pickers stack, and the table
  is Pos, Driver, Time and Gap (the sectors are on wider screens), the name cut short with "…" when it does not fit.
  A Le Mans Ultimate leaderboard has "This car / Whole class" (`CMF.whole`, `COMM_CLS` in index.html; the phones the
  same): every LMU class mixes many car models, so the class view is each driver's best lap of any car of that class on
  the track, one per driver, with their car (`community_laps.cls`, migration 0071, `cloud/src/lmuclass.js`: GET
  `/laps?cls=` for game lmu, indexed by game, track, class and time; the PC sends the game's CarClassShortName as `cls`
  for its own laps and its rivals', `lapClass`; a lap without it, and the laps of before, take it from the car's name).
  The per-car boards stay, and the coach and the reference laps are per car, never a class. iRacing has no class view.
  A leaderboard, record or track page row whose lap was driven in the rain or on a wet or damp track says so beside the
  time (`wetTag`; "Rain"/"Lluvia"/"Chuva", "Wet"/"Mojada"/"Molhada", "Damp"/"Húmeda"/"Úmida"; Rain goes with Wet or
  Damp), in every game: the trace's flags "rain" (Precipitation over 0 or WeatherDeclaredWet at any point), "wet"
  (TrackWetness 4 or more at any point) and "damp" (its highest 2 or 3, never 4), own laps in cloud.go and rivals in
  field.go (LMU makes them from its rain and path wetness), become `community_laps.wet` (bits: 2 wet, 4 damp, 1 rain)
  on POST /laps. "damp" and "rain" are notes only: they never keep a lap from the model nor from the coach's default
  lap A (only "wet" does).
  Community's "Recent records" (PC, web, Pitlane HQ Desktop, phones; `/community/records`): the fastest lap of every
  car and track, the newest first, with the lap it beat ("beat Juan by 0.312 s", or "the first lap here"), filtered
  by the discipline chosen (the server reads them from the database once a minute for everyone who sees the same names,
  `minuteCache`, to stay under D1's daily reads); a record opens as lap B (Compare), its leaderboard (`commGoBoard`) or its track page. Every
  record, track page row, profile lap and admin record says its game (`gameChip`, `game` on each record; the admin's
  newest records are every game's, `/records?game=all`), and a lap, board, record or session of a game opens in that
  game (`toGame`: Analysis looks for your sessions of that game on that track).
  The track page (`/community/track`, `openTrackPage` on the web, `TrackPageScreen`/`TrackPageView` on the phones):
  the map with the official turns and the direction arrow, how many drivers and laps the track has and the record of
  every car on it. It opens from the leaderboard's "Track page" chip and from every record; on Pitlane HQ Desktop
  it is the "Track page" button beside the car (`TrackPage.cs`), a row opening that car's leaderboard.
- Rivals of practice and qualifying: the PC shares the other real drivers' best laps of every session that is not a
  race nor a test drive, as it does a race's (`fieldpractice.go`: every 3 minutes while the session runs and when it
  ends or the PC leaves the game, before the field watcher forgets it; a driver goes again only when faster). They are
  race rivals like any other (below). Every rival's best lap is on the leaderboard, slower than you or not, with its trace
  or without (the server ignores the agent's `hidden`; `shown` 'model' is no longer written for rivals), and a faster lap of
  theirs replaces it.
  A shared lap that comes without sectors (a rival's lap the PC saw whole but did not time third by third) takes them
  from its trace (`lapsectors.js`, thirds of the distance from the trace's lap time), on upload and, for the laps of
  before, a hundred an hour from the cron. A lap with no trace keeps none. Every driver has 1500 uploads a day (`countUpload`), the rivals' laps included.
- Race rivals (the other real drivers of your races, whose best laps your PC shares, in iRacing and in Le Mans Ultimate (LMU gives no driver id: `lmuDriverID`, a stable hash of the name the game shows, far above iRacing's ids, is the driver's `UserID` in the synthesized YAML); AI drivers and the pace car never,
  `CarIsAI`/`CarIsPaceCar`, `ai` in journal.go) show on the leaderboards as Anonymous,
  with no "rival" tag beside them, on the public pages too: they did not join Pitlane HQ, so they never agreed to be
  there by name. Everywhere (leaderboards, records and "beat … by", track pages, the coach's fastest shared lap, public
  pages, Discord, a shared race analysis's other drivers) their laps are anonymous (`community_laps.anon` 1 for every
  `o:…` driver, migration 0076; an admin's undo of a driver link gives them back anonymous too). Their whole name as the
  game shows it is still kept (`driverName`; rivals named "Juan M." before take it from the PC's race history,
  `rivalnames.v2`), and only an admin with admin mode on sees it: the web, the agent and the phones send
  `X-Pitlane-Admin: 1` then, and the server shows it only to an admin's account (`seesRivals`/`shownName` in
  community.js). When a driver's own signed-in PC sees them at the wheel
  in iRacing or Le Mans Ultimate, what was shared of them as a rival in that game goes to their account, and so does what
  comes later (`/link-driver` with the game, `driver_links` per game, migration 0067: one driver of each game per account
  and one account per driver of each game; `linkOwnDriver`/`ownLinkKey`: iRacing by the driver's own id, LMU by
  `lmuDriverID` of the player's own name, never a profile's default name such as "Player" nor one of a letter or two),
  so a driver with an account shows once on the LMU boards; admins undo one game's link (`unlink-driver` with the game,
  `driverGames` in the accounts list: "Unlink its iRacing driver", "Unlink its Le Mans Ultimate driver" on the web, the
  PC and the phones). An LMU name is one anyone can type, so in every game but iRacing (`cloud/src/driverlinks.js`,
  `linkDriver`/`unlinkDriver`) the link waits until the account's own PC saw that name at the wheel on three different
  days (`driver_link_seen`, `LINK_DAYS`; the PC asks again some hours later, `linkAgain`), keeps what it moved
  (`driver_link_moves`: the laps taken and dropped, the rival, the model's memory), and the admin's undo gives all of it
  back to the rival (a lap the account improved since stays the account's) and is never linked again by itself
  ("undone"). An iRacing undo leaves the laps where they are, as before.
- "Share my lap" (the leaderboard's title, when the driver is on that board, never in demo data): a 1200×630 picture
  drawn on the device (`lapCardCanvas`/`shareLapCard` in index.html: the dark card with the amber edge, Pitlane HQ and
  the game, the track, the car, the time, "P3 of 42 on the leaderboard", wet when it was, pitlanehq.app). The share
  sheet when the device has one (phones, most browsers), else the picture is saved. Counted `act:share_card`. The phones
  draw the same picture natively.
- Alerts (`cloud/src/alerts.js`, the pure part in `alertslib.js`, migration 0081): when a driver keeps a lap faster than
  another driver's record of that car and track (`recordBeaten`, called by `keepBestLap` before it keeps the lap; never
  for beating your own, a DRINKS driver of the same account, or the model's laps), the account that had it gets a
  `record_beaten` alert {track, car, time, was, by} (`by` empty for an anonymous driver; a DRINKS driver's record goes
  to the account it is joined to). On Monday from 07:00 UTC the accounts with notifications on in a phone (`alert_subs`,
  GET/POST `/community/alerts/on` {on, lang}) get a `week` alert {title, text} in their language (sessions, laps, time on
  track, races and top 5s, new personal bests; nothing for a week without driving). GET `/community/alerts?since=` gives
  the newest 20 of the last 30 days; they are deleted after 30 days and with the account. The phones read them in the
  background and show a notification (only with Account → Notifications on); the PC app and the web show the newest
  beaten record of the last 7 days on Home ("Your record at Spa was beaten", the time, the car and the gap,
  Leaderboard and OK; `homeAlerts`), never as a Windows notification. Nothing goes by email.
- Instant notifications (`cloud/src/pushlib.js`, migration 0082 `push_tokens`): a phone turning notifications on sends
  its Firebase Cloud Messaging token with POST `/community/alerts/on` {on, lang, push: {token, platform}}; off forgets
  that phone's token. Each new alert (a beaten record, the week's summary) sends every phone of the account a data
  message {kind: "alerts"} through FCM HTTP v1 (a JWT of the FCM_SERVICE_ACCOUNT secret, Google's access token kept for
  the hour), never the alert's text; the phone then reads GET `/community/alerts`. A token Firebase no longer knows is
  deleted, an unused one after 270 days (daily), all of them with the account. Without the secret nothing is sent and the
  phones' background check finds the alerts as before.

- A driver's profile (`openProfile`; the phones' profile screen) shows their 3 latest races under Recent races and
  a "Show more (N)" button that opens the rest in place.

## Friends

- "Invite a friend" at the top of Friends (every device) shares or copies the account's link,
  `https://pitlanehq.app/?ref=invite-<account id>` (`invite` in GET /community/friends). That first visit is one source,
  "invite", in the admin Analytics (`visitOf` keeps the inviter); an account made in that browser and the inviter
  follow each other (`inviteFollow` in accounts.js, both sign-up paths).

- Head to head: each friend's lap row shows your best on that car and track (your sessions' bests, `myBestOn`) with
  the gap, and the friend's card "You 3–2", the tracks where you are faster against those where you are not (`h2hPill`).
  The phones' Friends tab the same.

- Follow drivers (`cloud/src/friends.js`, table `follows`, migration 0090): "Follow" on a driver's public profile
  (`canFollow`, `following` on /community/profile; never on an anonymous one, never yourself, 200 at most). Community's
  fourth part, Friends (`drawFriends`; the phones' Community → Friends), lists the drivers you follow with their newest
  laps of the chosen game that are not anonymous, each with Compare (the community lap as lap B against your own session
  on that track, `loadCommLap`) and Leaderboard, and Profile (a friend's profile opens by their id, which the server
  allows only to their followers and the admins). The comparator's community laps (`pickCommLap*`) list every friend's
  lap on that car and track first, marked ★, wherever it sits on the board (`/community/friends/laps`), then the fastest
  fifteen. A friend who goes anonymous drops out of the list; only their laps that are not anonymous ever show.
- Le Mans Ultimate's game version: every LMU record (`/community/records`) and board lap (`/community/laps`, class boards
  too) carries `ver`, the version the admins' PCs had first seen last before the lap was set (`lmuVersions`/`verAt` in
  lmuclass.js, from `lmu_api`; "1.2-fc78d7e6" reads "1.2"), shown as "v1.2" beside the lap on every device, since BoP
  and physics change with the version.

## Report and Block

- What one driver posts that others see (a league post, a driver's public name and their Discord name on the profile) has
  Report and Block on every device (the App Store asks for both). They show on someone else's league post and profile,
  for a signed-in driver.
- Report asks for a reason (Spam, Offensive, Harassment, Other) and an optional note, once per driver and post or
  driver. It is emailed to support@ and waits on the admin page (Content → Reports), where an admin deletes the post,
  resets the driver's name to "Driver" (and takes their Discord name off the profile) or dismisses it, within 24 hours.
- Block hides the driver's league posts and profile from the one who blocked them, and their name reads "Blocked
  driver" on the leaderboards, the records, the track pages and the race analyses they read (`maskBlocked`). Their
  profile then only offers Unblock. Account (Settings) lists the blocked drivers with Unblock, shown when there is one.
- Server: `cloud/src/moderation.js`, migration 0097, `cloud/test/moderation.test.mjs`. The agent lets the page reach
  `/community/report` and `/community/blocks` (`placcount.go`).
