# Admin mode, admin panel and usage analytics

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- The admin panel is its own page, only for admins (pitlanehq.app/admin → `/app#admin`, `v-admin`), reached from the
  header's Admin button with admin mode on (Account shows its button only then).
- Admin mode (the owner's choice): an admin sees Pitlane HQ exactly as everyone does by default, on every device. The
  header's Admin button (`#viewTg`, a shield, only for admins; `renderViewToggle`) turns admin mode on for that device
  (`pw.adminMode` in localStorage, `adminMode()`/`setAdminMode` in index.html; `isAdmin()` = an admin's account and admin
  mode on, `realAdmin()` the account alone) and opens the admin page; with it on, the button opens a small menu (Open the
  admin page, Turn admin mode off) and everything for admins and in development shows. Opening /admin with it off turns
  it on. The PC's agent follows the page (POST `/api/adminmode`, `adminmode.go`, `admin-mode.json` in the data folder,
  never synced): `wipAllowed()` is an admin's account and admin mode on, while what is not "in development" keeps
  reading the account (`realAdminSigned`: DRINKS, the LMU data capture). About also has the
  switch. The phones have their own admin mode (off by default) in Settings.
- Testers (the Tester level): the accounts an admin made testers in the admin page's Users list ("Make a tester" /
  "Remove the tester level", POST /community/admin/tester, `accounts.tester` from migration 0086) and the account ids in
  `TESTERS` (cloud/wrangler.toml, like `ADMINS`; those cannot be removed from the page) use everything in
  development on every device (the planner, the games and modes still being made),
  always, with no admin mode and none of the admins' tools (the admin page, demo data, the .ibt import, deleting or
  editing others' things). The server says `tester` in /account/me and every sign-in (`isTester` in accounts.js); the
  page's `isTester()`/`wipOk()`, the agent's `plAcc.Tester`/`testerSigned()`/`wipOpen()`, and the
  phones' `tester` follow it. The admin page's Users list marks them "Tester". A driver made a tester gets an alert of
  kind "tester" (`testerAlert` in alertslib.js, never an email): the phones show it as a notification, and every device
  shows "You are now a Pitlane HQ tester" in its inbox once (until dismissed), with a button to the support chat for
  their feedback.
- Admins: the admin page (on the PC, the web and the phones; `admSecs`/`admParts`/`wireAdminProfile` in index.html) is
  sections as tabs, each with its line of explanation: Summary (the key numbers, then the analytics), Users (every
  account with what it uses in the last 30 days, its devices and when it was seen, a name opening its detail,
  `admUserDetail`; member since set by hand, the supporter badge, its profile, delete; per account: confirm its email,
  turn off its two-step sign-in, sign it out everywhere, rename it, join a DRINKS driver to it or undo it, unlink its
  game drivers; `/admin/guests` lists every DRINKS driver on the platform for the chooser; and Online now), Feedback
  (every answer of "Share your feedback", the newest first), Content (the shared items, the leagues and the newest
  records, a record's lap deleted by hand), Sessions (the latest sessions of any driver, a private one too: an admin
  opens every account's profile from the leaderboards, and the profile lists its sessions for admins; "See the laps"
  opens its laps one by one with their top speed and sectors, and an admin marks a lap not valid or valid again:
  `admSessionLaps`, `/api/laps/:id/valid`; the session's best, the driver's share and the model follow), Coach (the
  coach's buckets) and Server (the server's emails and the domain's records, the tools: rebuild the coach models, the
  blocked sign-ins one by one, by email or all, the .ibt import, demo data, admin mode; Pro; and the Discord server, see discord.md) and Health (below). Networks are only ever a
  hash of their address.
- What the drivers use (`cloud/src/usage.js`, the pure part in `usagelib.js`, migration 0070 `usage_days`): every app
  counts the views it opens (`view:<name>`), its notable actions (`act:<name>`: race summary opened, plan to the coach
  overlay, track page, leaderboard, overlay opened, profile, coach report, feedback sent…) and the game it drives
  (`game:iracing`, `game:lmu`, once when the car goes on track in a new session; the game read, `STATUS.source`, never the
  Settings choice "auto", and the server keeps only real games, `USAGE_GAMES`, and leaves the old `game:auto` rows out of
  the analytics) and sends them as POST `/community/usage`
  {device: web|pc|android|ios, v, counts, ms} every 5 minutes and when the page goes to the background (fetch with
  keepalive; `USAGE`/`usageCount`/`usageFlush` in index.html, through the agent's `/api/sync/get` on the PC); never in
  demo data, never for a visitor (dropped unsent), never from an overlay window, never while an admin has admin mode on.
  The server keeps keys matching `^(view|act|game):[a-z0-9_.-]{1,40}$` only, 100 a batch, 1000 per key, added into one row
  per day, account, device and key (rows over 400 days go, hourly). `ms` (how long the page was on the screen, 10 minutes
  a batch at most) adds to the account's use for the feedback window. One use of the same action with the same thing within a
  minute counts once (a screen that opens itself again when a setting changes in it, like the overlay settings, is one use).
- Where the drivers come from (`cloud/src/sourceslib.js`, migration 0089 `visits_days` and `accounts.src/src_page/country`):
  the landing, the web app (`index.html`, after its `<noscript>`) and every public page (`seo.js`, `/downloads`) run the
  same lines (`VISIT_JS`): once per browser session they send POST `/community/visit` {ref (document.referrer), page,
  us (utm_source or ?ref=), um, uc} with sendBeacon (text/plain, no sign-in), and keep the browser's first visit in
  localStorage `pw.src0`, only on pitlanehq.app. The server drops robots (`isBot`) and moves inside Pitlane HQ, names the
  site (`siteOf`: google, reddit, discord, iracing (its forums), chatgpt…, the host for any other site, "direct" without
  one; a campaign tag wins over the referrer, `visitOf`), takes the country from Cloudflare (`countryOf`, XX when
  unknown) and the page (`pageOf`: landing, app or the path), and adds one into the row of the day, source, country and
  page (no address, no account). Every sign-up (`/account/register`, the form and the quick Steam, Discord and Google one)
  sends `src: pw.src0`, and the account keeps its source, page and country once (`signupSrc`); an account made without one
  is pc-app, android-app, ios-app (from X-Pitlane-Client) or unknown. Rows over 400 days go with the usage.
- GET `/community/admin/analytics?days=N` (admins, 1 to 90 days, the same days before them for the changes) answers, from
  grouped reads of usage_days, sessions (accounts' uploads), accounts, visits_days and presence, never a query per
  account: {days, top [{key, n, users}], byDevice [{device, users, n}], games, versions [{device, v, devices}], users [{id,
  nick, lastSeen, devices, n, top}] (the Users tab), active / activeApp / drove [{day, users}] (active = opened an app or
  drove that day), signupsPerDay [{day, n}], totals {active, newAccounts, accounts, drove, sessions, races, laps, secs,
  returning (2 days or more), multiDevice}, prev {active, newAccounts, sessions, drove, secs}, funnel of the period's new
  accounts {accounts, opened, drove, laps (Laps, Telemetry, My sessions, a race summary or compare), coach (the coach
  screen, a report, a lap sent to it, its plan)}, comeback {d1, d23, d4}, driven [{game, drivers, sessions, races, laps,
  secs}], sources {visits, prevVisits, signups, prevSignups, bySource [{src, kind, name, kindName, visits, prevVisits,
  signups, prevSignups}], byCountry, byPage}, highlights [{k, tone, a, text [en, es, pt]}], areas [{k, name, rows [{key,
  name, what, users, n}]}]} (`analyticsOf`, `analyticsMore`, `sourcesOf`, `highlightsOf` in usagelib.js; the names and
  sentences in the three languages in `usagenames.js`, so the phones show the same).
- The Summary's analytics (`admAnalyticsHTML`, the owner's approved design): 7, 30 or 90 days with "Changes are against
  the N days before", What stands out (the server's sentences: active drivers against before, the biggest drop of the new
  accounts, the coach used by few, where most accounts or visits came from, sessions a driver per game, a phone with no
  one, devices not on the newest version), the key numbers as tiles with their change (active drivers, new accounts,
  drove with the agent, time driven, came back), drivers per day (drove in amber from the sessions, opened an app in
  blue, new accounts under them), From sign-up to the coach (the funnel with the red line of who stops at each step),
  Do drivers come back (1 day, 2 or 3, 4 or more, more than one device), Where drivers come from (visits, sign-ups,
  the table of sources with kind, visits, change and sign-ups, countries, pages they landed on), Games (drivers,
  sessions, races, laps, hours, sessions a driver), What drivers use (by area, the share of the active drivers and the
  uses, what each counts on hover), Devices (drivers) and Up to date (devices on each app's newest version, the older ones
  on hover). Users merges the answer into every account.
- The admin page's look (Nov 2026): the sections as a dark well with the chosen one raised, every part a card with its
  title in the display font, the key numbers as tiles, the rows as cards (`#v-admin` rules and `.an-*` in index.html).
- Health (`cloud/src/reports.js`, the pure part in `reportslib.js`, migration 0079): Crashes and errors lists every kind
  of error the agent, the web and the phones sent in the last 7 days (POST `/community/crash` {app pc|web|android|ios, v,
  os, where, msg, stack}, signed in or not; one row per kind, `crashSig`: the app, the part and the message with its
  numbers left out and the top frames; how many times, the newest version, the last account), with its stack and
  Fixed (DELETE `/community/admin/crashes/:sig`, it comes back if it happens again); kinds not seen for 30 days go.
  Database reads shows the rows read and written per day and per route (`d1_usage`): every request's `env.DB` is wrapped
  (`countingDB`, the route is the method and the path with ids left out, `routeKey`; the cron runs count as "cron 10
  min", "cron hourly" and "cron daily"), `first()` reads through `all()` to get D1's meta, and each Worker instance writes
  its counts about once a minute (`flushUsage`), so counting costs one write per route and minute.

## Season

The admin page's Season publishes the iRacing season the planner shows, from the schedule PDF iRacing posts each
season (or its text). It reads the file in the browser (pdf.js in `pitwall-pdf.js`, the parser in
`pitwall-season-import.js`, the same one `tools/season-import.mjs` uses), shows how many series, weeks, tracks and
cars it found and the series whose race times it could not read, and Publish for everyone sends it to
`POST /community/admin/season` (admins and `SEASON_UPLOADERS`). The race times are then corrected by the official
races the PCs report (`seasonseen.js`). The PC app passes that post through `/api/sync/get` with a 16 MB limit.

- Tools → "Turns to check": the tracks with no official turns placed and the ones whose corners (from the layout and how
  the drivers slow down) do not match the game's count, with the layout's length (GET `/community/admin/turns-check`).
- Coach → "The coach on real laps": how often each tip and plan step fires on the busiest cars and tracks' model laps
  (GET `/community/admin/coach/calibrate`).
