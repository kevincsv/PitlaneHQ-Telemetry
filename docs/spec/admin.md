# Admin mode, admin panel and usage analytics

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- The admin panel is its own page, only for admins (pitlanehq.app/admin → `/app#admin`, `v-admin`), reached from the
  header's Admin button with admin mode on (Account shows its button only then).
  Its code is its own file, `web/dist/pitwall-admin.js` (`admSecs`, `wireAdminProfile`, `admUserDetail`…), loaded the
  first time the page opens (`admJs`, `renderAdminPage` in index.html), so drivers never download it.
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
  `TESTERS` (cloud/wrangler.toml, like `ADMINS`; the page's "Remove the tester level" works for those too, it stores `tester=0`, which wins over `TESTERS`) use everything in
  development on every device (the planner, the games and modes still being made),
  always, with no admin mode and none of the admins' tools (the admin page, demo data, the .ibt import, deleting or
  editing others' things). The server says `tester` in /account/me and every sign-in (`isTester` in accounts.js); the
  page's `isTester()`/`wipOk()`, the agent's `plAcc.Tester`/`testerSigned()`/`wipOpen()`, and the
  phones' `tester` follow it. The admin page's Users list marks them "Tester". A driver made a tester gets an alert of
  kind "tester" (`testerAlert` in alertslib.js, never an email): the phones show it as a notification, and every device
  shows "You are now a Pitlane HQ tester" in its inbox once (until dismissed), with a button to the support chat for
  their feedback.
- Asking to test (`testask.js`, migration 0094 `accounts.test_ask`/`test_ask_what`): a signed-in driver who is not a
  tester sees "Ask to test" where something In development shows (the In development cards, under the game switch while
  ACC and Assetto Corsa are locked, the Leagues card on the phones) and "Ask to be a tester" on their account card (PC
  and web Settings, the phones' account screen). One tap sends POST /community/tester/ask {what}; the button then reads
  "Request sent" (GET /community/tester/ask says `asked`). Every admin gets an alert of kind "test_ask" (`testAskAlert`,
  a phone notification only with admin mode on), and the admin page's Users list shows "Asking to test" first, with
  where they asked and when: "Yes, make a tester" (POST /community/admin/test-asks {id, yes: true}, the tester level
  and its "tester" alert) or "No" (closed for good: the driver is not asked again and still reads "Request sent"). The
  admins' inbox has "Drivers ask to test" while any wait (`pending` in GET /community/tester/ask). Making a tester from
  the list answers a request too. The PC agent passes POST /community/tester/ask to the server (placcount.go).
- Admins: the admin page (on the PC, the web and the phones; `admSecs`/`admParts`/`wireAdminProfile` in index.html) is
  sections as tabs, each with its line of explanation: Summary (the key numbers, then the analytics), Users (every
  account with what it uses in the last 30 days, its devices and when it was seen, a name opening its detail,
  `admUserDetail`; member since set by hand, the supporter badge, its profile, delete; per account: confirm its email,
  turn off its two-step sign-in, sign it out everywhere, rename it, join a DRINKS driver to it or undo it, unlink its
  game drivers; `/admin/guests` lists every DRINKS driver on the platform for the chooser; Activity; and Online now), Feedback
  (every answer of "Share your feedback", the newest first), Content (the reports of posts and names, the shared items, the leagues and the newest
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
  Telemetry also counts, once a day each and after 20 seconds on the screen, the panels it shows (`live:<panel>`) and its
  mode (`live:mode.basic|full|cmp`) for Layout's "Most used by the community" (telemetry.md); those keys stay out of
  the admin page's features and users and make the Analytics' Telemetry panels card (`live` in the answer [{w, users,
  days}], `admLiveHTML`).
  Which overlays are used: the agent (`ovusage.go`) counts, once a minute while the driver is in the car in a real
  session, each native overlay open (`ov:<overlay>`, minutes) and sends them with the same POST `/community/usage`
  (device pc) every ten minutes, never in demo data, never for an admin, dropped when signed out. The race report the PC
  already sends for the overlay feedback window (POST `/community/feedback/ovrace`, iRacing and LMU races) also adds
  `ovrace:<overlay>` for each overlay open in it, once per race (a session told again counts once); a batch can never
  bring `ovrace:` keys. Both stay out of the features, devices and users and make the Analytics' Overlays card
  (`overlays` in the answer, `overlaysOf` in usagelib.js, `admOverlaysHTML` in pitwall-admin.js): drivers, time open and
  races per overlay, the most drivers first. Counting began with the server and agent of 2026-11-15 (before it only "an
  overlay was opened from the app" was counted, without which one). The phones' admin panel does not show it yet.
  The server keeps keys matching `^(view|act|game|live|ov|run|set|pro_use):[a-z0-9_.-]{1,40}$` only (`run:agent` the agent ran that day,
  `set:autostart.on|off` a setting as it stands once a day, `pro_use:<feature>` a Pro feature used: the three only feed
  the weekly numbers below, never the features, devices or users), 100 a batch, 1000 per key, added into one row
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
  sends `src: pw.src0`, and the account keeps its source, page and country once (`signupSrc`).
- Sign-ups in the PC agent (it has no browser history): a click on a link to `PitlaneHQ-Setup.exe` on pitlanehq.app adds
  the browser's first visit to the link (`VISIT_JS`: fr, fu, fc, fp), and each download of the installer keeps that source
  (or, for a link from elsewhere, its utm_source / ?ref= and the Referer, page "dl"; `downloadVisit`) in `dl_src` (migration
  0098) under `dlKey`, a hash of the address with the server's secret, for 14 days (`DL_DAYS`, the hourly job drops older
  rows). An account the agent makes (X-Pitlane-Client pc/ or desktop/) from the same connection in that time takes the
  newest download's source and page; else an agent the Microsoft Store installed (it sends X-Pitlane-Install: store) is
  msstore ("Microsoft Store", kind store); else pc-app (`appSignupSrc`). An account made without a first visit in the
  phones is android-app or ios-app, anything else unknown. Rows over 400 days go with the usage.
- GET `/community/admin/analytics?days=N` (admins, 1 to 90 days, the same days before them for the changes) answers, from
  grouped reads of usage_days, sessions (accounts' uploads), accounts, visits_days and presence, never a query per
  account: {days, top [{key, n, users}], byDevice [{device, users, n}], games, versions [{device, v, devices}], users [{id,
  nick, lastSeen, devices, n, top}] (the Users tab), active / activeApp / drove [{day, users}] (active = opened an app or
  drove that day), signupsPerDay [{day, n}], installs {downloads, prevDownloads, downloadsBeta, uninstalls,
  prevUninstalls, answered, prevAnswered, perDay, byVersion, reasons [{k, n, name}], said [{at, v, text}]}, supporters
  {total, stripe, manual, patreon, patrons, donations, prevDonations, amounts [{currency, amount}], prevAmounts, waiting,
  refunded, recent [{at, amount, currency, name, id}]} (`pcstats.js`), totals {active, newAccounts, accounts, drove, sessions, races, laps, secs,
  returning (2 days or more), multiDevice}, prev {active, newAccounts, sessions, drove, secs}, funnel of the period's new
  accounts {accounts, opened, drove, laps (Laps, Telemetry, My sessions, a race summary or compare), coach (the coach
  screen, a report, a lap sent to it, its plan)}, comeback {d1, d23, d4}, driven [{game, drivers, sessions, races, laps,
  secs, prevDrivers, prevSessions, prevSecs, newDrivers (their first session of that game in these days), prevNew, appDrivers
  (accounts whose app counted `game:<g>`), perDay [{day, users}], tracks and cars [{name, sessions, drivers}] (6 most
  driven)}] for every game Pitlane HQ reads (iRacing, Le Mans Ultimate, ACC, Assetto Corsa), one nobody drove too (`gamesOf`), sources {visits, prevVisits, signups, prevSignups, bySource [{src, kind, name, kindName, visits, prevVisits,
  signups, prevSignups}], byCountry, byPage}, highlights [{k, tone, a, text [en, es, pt]}], areas [{k, name, rows [{key,
  name, what, users, n}]}]} (`analyticsOf`, `analyticsMore`, `sourcesOf`, `highlightsOf` in usagelib.js; the names and
  sentences in the three languages in `usagenames.js`, so the phones show the same).
- The answer of `/community/admin/analytics` is kept ten minutes (`adminCache` in metrics.js, a key nobody can open).
- The weekly numbers (the admin page's Analytics section; `cloud/src/metrics.js`, the job in `metricsjob.js`, the pure
  part in `metricslib.js`, migration 0105 `metrics_weeks`, `cohort_weeks`, `links`, `events`). The words mean one thing
  everywhere: a week is Monday to Sunday, UTC; used it is opening a screen of an app that day (a usage row that is not
  the agent's own `ov:`, `ovrace:`, `run:`, `set:`); drove is uploading a session that day and raced one of them being a
  race; a weekly user used it or drove (the agent running in the background, `run:agent`, is `users_bg` and `agent`,
  apart); the drivers are every account but the admins and the testers (`aud` 0, the default; 1 counts everyone); a new
  account is kept ("still using it a week later") when it is active on any of days 7 to 13 after the day it was
  created, counted only once it is 14 days old; activated is a session uploaded on its day or the next.
  The daily job (03:00 UTC, `weeklyMetrics`, under "cron daily" in Database reads) reads the usage, the sessions, the
  accounts, the visits, the installer's counts, the paid donations, the invites, the server's events and the sessions
  of PCs with no account (`uploader LIKE 'dev:%'`) of the last 15 weeks (`JOB_WEEKS`), adds them up (`buildMetrics`)
  and writes only the rows that changed, so a quiet night writes nothing; a number that is gone goes back to zero. Per
  week: users, used (and per device), drove (and per game), raced, sessions, races, new (and per source), visits (and
  per source), downloads, uninstalls, donations and what they raised per currency, invited, invite_given, `e:<event>`,
  anon_pcs, anon_sessions, the sales counters (`k:<key>` drivers and `kn:<key>` uses of `act:pro_*`, `act:donate_*`,
  `act:invite_*`, `act:trial_*`, `act:checkout_*`, `act:pricing_*`, `act:share_card`, `pro_use:*`) and the supporters as
  they stand (only the week it is: earlier weeks keep what was counted then). Per sign-up week, for all, per source and
  per first game: `c:n`, `c:open7`, `c:up2`, `c:up7`, `c:mature`, `c:kept`, `c:med_h` (the median hours from the account
  to its first session); the steps reached the same day, within 2 days and within 7 (`s:<step>:1|2|7`: opened, drove,
  laps, raced, coach, overlay, community, second device) and, for the accounts already 14 days old, what they did in
  their first two days against being kept (`b:<behaviour>:n|kept`). `cohort_weeks` has, per sign-up week and split, each
  week after (wk 0 is the account's first seven days, up to 12) with its size, how many were active, drove and raced,
  and `ripe`, the accounts whose week is already over.
  GET `/community/admin/metrics?weeks=4|8|12|26&aud=0|1` (admins, kept ten minutes) answers {weeks, days, monday (the
  seven numbers: users, new, kept, up7, raced with its share of who drove, visits_day, supporters, each with its list
  per week and its two targets), targets, series (every number as a list per week), cohorts, stay, stayAll, sources
  (each source and tagged link: visits, accounts, up2, mature, kept, the ones whose drivers stayed first), steps, job,
  links}; POST `/community/admin/metrics/run` {all} runs the job now (all: from the first day there is, the backfill);
  POST `/community/admin/metrics/targets` {d1, d2, t} saves the targets (app_state `metrics_targets`; the defaults are
  the growth plan's, 20 Dec 2026 and 31 Jan 2027); GET `/community/admin/metrics/health` answers every counter family
  and device with the last day it sent anything in 30 days (`healthOf`: ok, quiet after 3 days of silence, never), the
  versions seen, the job's last run and the rows the Analytics and the daily job cost in 7 days; GET
  `/community/admin/metrics/account?id=` one account's steps with their days and where it came from (`timelineOf`), shown
  under the account's detail in Users; GET/POST `/community/admin/links` and DELETE `/community/admin/links/<tag>` the
  tagged links (`pitlanehq.app/?ref=<tag>`: a visit and a sign-up from one carry the tag as their source).
  The server's own events (`eventslib.js`, `logEvent(env, name, accountId, info)`: trial_started, trial_ended, pro_paid,
  pro_renewed, pro_cancelled, pro_refunded, thanks_month, email_sent, email_click) go to `events` and are counted per
  week; deleting an account deletes its events. Nothing writes one yet: the Pro trial and the payments will.
  The Analytics section (`admMetrics` in pitwall-admin.js, parts `m_*`): Monday (the seven numbers as cards with the
  week that just ended, the change, the line of the weeks, the week so far and the targets, green once reached; week by
  week; the targets' form), Growth (from the visit to staying per source and link, the tagged links' form, week by
  week), Activation (the steps the same day, within 2 and within 7 days, and by sign-up week), Retention (each sign-up
  week over time with Active, Drove or Raced and a split by game or source; what goes with staying), Sales (PRO badge
  presses by feature, the PRO window, pricing, the donation bar shown, pressed and refused, donations and what they
  raised, invites, the PCs with no account) and Data (is every counter arriving, the job with Add up now and Add up
  everything, the weeks as CSV, what it costs, what each word means). 4, 8, 12 or 26 weeks; Drivers or With admins and
  testers. A share over fewer than 20 accounts is grey, and a week still running is lighter. The phones' admin panel
  does not have it yet.
  The page counts for it: a PRO badge pressed (`act:pro_badge.<feature>`, `proB("<feature>")`), the PRO window
  (`act:pro_info`), See pricing in it (`act:pricing_open`), Support in it (`act:donate_pro`), Support offered in it
  (`act:donate_shown`), the donation bar shown once a day (`act:donate_bar_shown`), the invite code copied and the link shared (`act:invite_copy`, `act:invite_share`).
  The server keeps its own events for the Sales tab (`events`, `logEvent` in eventslib.js): `trial_started` (a new
  account's days of Pro), `thanks_month` (the day Pro is switched on), `pro_paid`, `pro_refunded` and `pro_cancelled`
  (lemon.js); a payment notice sent twice is kept once.
  `cloud/test/metrics.test.mjs` also checks that every action counted by wrapping a function (`USE_LAST` in index.html)
  is still a function of the page, so a renamed one cannot stop counting unseen.
- The Summary's analytics (`admAnalyticsHTML`, the owner's approved design): 7, 30 or 90 days with "Changes are against
  the N days before", What stands out (the server's sentences: active drivers against before, the biggest drop of the new
  accounts, the coach used by few, where most accounts or visits came from, sessions a driver per game, a phone with no
  one, devices not on the newest version), the key numbers as tiles with their change (active drivers, new accounts,
  drove with the agent, time driven, came back), drivers per day (drove in amber from the sessions, opened an app in
  blue, new accounts under them), From sign-up to the coach (the funnel with the red line of who stops at each step),
  Do drivers come back (1 day, 2 or 3, 4 or more, more than one device), Where drivers come from (visits, sign-ups,
  the table of sources with kind, visits, change and sign-ups, countries, pages they landed on), Installs and uninstalls (installer
  downloads, uninstalls with their change in red when it grows, said why, the reasons, the version uninstalled and what
  they wrote), Supporters (Stripe donations and what they raised, supporters from Stripe and by hand, the latest
  donations, Patreon apart as legacy with its badges and active patrons), Games (every game, one
  nobody drove greyed: drivers and sessions with their change, new to the game, races, laps, hours, sessions a driver;
  then a chooser of the game (`admGameHTML`, `ADM.game`, no new request) with its tiles (drivers and new to it, sessions
  and races, time driven and laps, counted by the apps), its drivers per day and the tracks and cars driven most), What drivers use (by area, the share of the active drivers and the
  uses, what each counts on hover), Overlays (each overlay's drivers, time open while driving and races), Telemetry panels (each panel's drivers and days, and the modes), Devices (drivers) and Up to date (devices on each app's newest version, the older ones
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
- Installs and uninstalls (`cloud/src/pcstats.js`, migration 0095 `pc_days`): the server counts per day, with no address
  or account, every download of PitlaneHQ-Setup.exe (`downloads.js`, not a resumed piece, not robots, v "beta" for the
  test builds; the updater takes the zip, so updates are not counted) and every time the page the uninstaller opens is
  shown (`uninstall.js`, by the version removed; a silent uninstall opens nothing). The page counts itself from its
  own script (POST `/community/feedback/uninstall/shown`, once per browser tab), so reloading it or a link checker
  fetching it is not another uninstall (until 5 Nov 2026 every fetch of the page counted). An uninstall is a page shown, or on a
  day with more answers than pages (before they were counted) the answers. The reasons and what drivers wrote come from
  the uninstall answers (feedback of kind "uninstall"). What stands out says how many uninstalls and the main reason, and
  how many donations came in.
- Supporters: the accounts with the badge by `supporter_src` (stripe, manual, patreon), and the Stripe donations
  (`pro_orders` kind "supporter", with their amount, currency and payment since migration 0095; a refunded donation is
  marked "refunded" and no longer counts, the badge stays). Patreon is no longer offered (0.9.8), so the Summary and the
  Analytics show it as "Patreon (legacy)".
- Users → Activity (`winback.js`, `winbacklib.js`, GET /community/admin/activity): every account, the most active first
  (days used in the last 30, then hours on track, then laps), with when it last used Pitlane HQ (the latest of its
  sign-ins, its devices seen, its usage counts and its sessions; an account never used counts from its creation), its
  devices, its email when the server keeps one (the escrow), Online (seen in 3 minutes) and On track (a lap came up in
  the last 10 minutes: `sessions.up_at`, migration 0099, set by every upload with laps). Filters Everyone, Online or on
  track, Used it this week and Away N+ days (7, 14 by default, 30, 60, 90); sorts Most active, Least active, Away
  longest, Newest accounts. Under Away, the "We miss you" email (English, Spanish or Portuguese from the driver's
  support chat language, else English) with a button to `/app?feedback=1`, which opens the feedback window once signed
  in: Preview, Send me a test, Copy their emails, and Send it to the checked drivers after a confirmation. It goes once
  per account (`accounts.winback_at`), never to an admin or someone online, 20 a request (the page asks again), and
  only when an admin presses it.
