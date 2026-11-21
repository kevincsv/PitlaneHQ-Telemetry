# Admin mode, admin panel and usage analytics

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- The admin panel is its own page, only for admins (pitlanehq.app/admin → `/app#admin`, `v-admin`), reached from the
  header's Admin button with admin mode on (Account shows its button only then).
  Its code is its own file, `web/dist/pitwall-admin.js` (`admSecs`, `wireAdminProfile`, `admDriver`…), loaded the
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
- Testers (the Tester level): the accounts an admin made testers in the admin page's Drivers list ("Make a tester" /
  "Remove the tester level", POST /community/admin/tester, `accounts.tester` from migration 0086) and the account ids in
  `TESTERS` (cloud/wrangler.toml, like `ADMINS`; the page's "Remove the tester level" works for those too, it stores `tester=0`, which wins over `TESTERS`) use everything in
  development on every device (the planner, the games and modes still being made),
  always, with no admin mode and none of the admins' tools (the admin page, demo data, the .ibt import, deleting or
  editing others' things). The server says `tester` in /account/me and every sign-in (`isTester` in accounts.js); the
  page's `isTester()`/`wipOk()`, the agent's `plAcc.Tester`/`testerSigned()`/`wipOpen()`, and the
  phones' `tester` follow it. The admin page's Drivers list marks them "Tester". A driver made a tester gets an alert of
  kind "tester" (`testerAlert` in alertslib.js, never an email): the phones show it as a notification, and every device
  shows "You are now a Pitlane HQ tester" in its inbox once (until dismissed), with a button to the support chat for
  their feedback.
- Asking to test (`testask.js`, migration 0094 `accounts.test_ask`/`test_ask_what`): a signed-in driver who is not a
  tester sees "Ask to test" where something In development shows (the In development cards, under the game switch while
  ACC and Assetto Corsa are locked, the Leagues card on the phones) and "Ask to be a tester" on their account card (PC
  and web Settings, the phones' account screen). One tap sends POST /community/tester/ask {what}; the button then reads
  "Request sent" (GET /community/tester/ask says `asked`). Every admin gets an alert of kind "test_ask" (`testAskAlert`,
  a phone notification only with admin mode on), and the admin page's Drivers list shows "Asking to test" first, with
  where they asked and when: "Yes, make a tester" (POST /community/admin/test-asks {id, yes: true}, the tester level
  and its "tester" alert) or "No" (closed for good: the driver is not asked again and still reads "Request sent"). The
  admins' inbox has "Drivers ask to test" while any wait (`pending` in GET /community/tester/ask). Making a tester from
  the list answers a request too. The PC agent passes POST /community/tester/ask to the server (placcount.go).
- Admins: the admin page (PC and web; `admSecs`/`admParts`/`wireAdminProfile` in pitwall-admin.js) is six tabs, each
  answering one question in one bold line under the tabs (the clearer layout of 2026-11-20, after the owner found the
  rebuild of 2026-11-18 still confusing): every part keeps a line of its own, its first sentence shown and the rest folded
  under "How this is counted" (`pline`). Each number lives in one place (Weekly numbers being the one scorecard of numbers
  shown elsewhere too), and every driver's name opens their profile. The tabs and their parts (sub-tabs):
  Today (`today`, the first tab: "In one look", the server's sentences with the good ones first, each marked Good, Note or
  Look; four cards that each open their tab: Driving (drivers who drove with the change, on track right now with their
  names, sessions, races, hours, opened an app without driving, not driven in 14 days or more), New sign-ups (new
  accounts with the change, how many already drove, the three sources that brought most, PCs trying without an account,
  accounts in total, the newest three by name), Money (raised in the period from the paid donations, the last 30 days,
  since the start, supporters with the badge, people who paid, the latest payment) and Problems (the same count as the
  Problems tab, then each kind); then the Overview's parts on the same period: drivers per day, On track now, Games,
  What drivers use, Overlays, Telemetry panels, Devices and Up to date; `admTodayHTML`),
  Drivers (`drivers`, `sessions`, `tryouts`, below, unchanged; the tab shows a blue count while drivers ask to test),
  Sign-ups (`m_monday` Weekly numbers, `m_growth` Where they come from, `m_activation` First days, `m_retention` Do they
  stay, below),
  Money (`m_money` Payments and supporters, `pro` the beta switch and the store),
  Problems (`problems` Everything waiting: one list, the newest first, of the errors of the last 7 days with Fixed, the
  feedback of 1 or 2 stars of the last 7 days, the reports to answer, the drivers asking to test and the counters that
  stopped, `admProblemsHTML`; `crashes` Errors; `feedback`; `uninstalls` the installer downloads and uninstalls of the
  period with the reasons and what drivers wrote; `creports` Reports; `counters` the counters, the weekly job, the CSV
  and the words; the tab shows a red count of everything Everything waiting lists, `admProbCount`/`admProbSet`) and
  Tools (`uploads` Shared laps, `leagues`, `coach`, `server` Emails and tools, `discord`, `season`, `d1` Database).
  The period chooser (`admPerHTML`, `ADM.wk`, kept in localStorage `pw.admWk`) sits under the sub-tabs of every part that
  has a period (`ADM_PER`): This week, 4, 12 or 26 weeks, each from a Monday (UTC) to today, against the same number of
  days just before, with the days written out and "Admins left out, testers counted". Today, Problems and Uninstalls ask
  GET /community/admin/analytics?weeks=N; the Sign-ups and Money parts show the last max(4, N) weeks of the weekly
  numbers (`admMW`). "What the words mean" at the top of the page (`admWordsHTML`) opens the words and their one meaning:
  driver (uploaded a session; the page no longer says active), opened an app, new account, week, who is counted, still
  driving a week later, supporter, on track. The parts of the Overview of 2026-11-18 not listed above (the funnel, come
  back, sources, installs and tryouts) live in Sign-ups, Problems and Drivers.
  Drivers → Sessions: the latest sessions of any driver, "See the laps" opens them one by one with their top speed and
  sectors and an admin marks a lap not valid or valid again (`admSessionLaps`, `/api/laps/:id/valid`). Drivers → Without
  an account: Tried without an account with its own 7, 30 or 90 days, Signed up opening the account the PC made
  (`account` in `tryoutsOf`). Feedback: every answer of "Share your feedback", the newest first, the name opening the
  profile. Reports: the reports of posts and names, the reported owner and the reporter opening their profiles. Shared
  laps: every shared lap and race analysis with the name it shows and who really uploaded it, with Profile for the
  account behind it (`accountId` in /admin/uploads: the uploader's, or the PC owner's for a DRINKS driver or rival), and a
  Records chip that lists the newest records of every car and track, a record's lap deleted by hand. Coach: the coach's
  buckets. Emails and tools: Set up (the data key and email pepper, the admins, who can post leagues, wrong passwords in 15
  minutes, this app's version), the server's emails and the domain's records, and the tools: rebuild the coach models and
  the track maps, turns to check, the blocked sign-ins one by one, by email or all, the .ibt import, demo data (admin mode
  is the button at the top of the page). Pro: the beta switch and the store, Pro by hand being in the profile. Discord: see
  discord.md. Networks are only ever a hash of their address.
- The driver profile (`admDriver(id)` in pitwall-admin.js, `admDriverOpen(id)` in index.html for the support inbox's
  Profile and the public profile's "Admin profile" button; GET /community/admin/driver?id=, `driver.js` and the pure
  `driverlib.js`, admins only, 400 for a bad id and 404 for an unknown one): a window that opens over any part of the
  page. Its header has the name, the pills (Admin, Tester, ♥ and its source, PRO, Founder, Anonymous), on track or
  online now or when it was last seen, and the id. Then the key numbers (signed up with its source, page and country,
  last drove, sessions with races, laps, hours on track, days driven in the last 30), Driving (per game: sessions,
  races, laps, hours, first and last; the 8 tracks and 8 cars driven most per game; the days driven in the last 26 weeks
  as the Home calendar, `calGrid`; every session 30 at a time, the newest first, with "Show more" through GET
  /community/admin/driver/sessions?id=&before= and See the laps), In the app (days it opened an app in the last 30 per
  device, devices signed in, last seen; its sign-ins with how and on what, kept from 2026-11-18; the sign-ins open now;
  its devices with the app, name and version; what it uses most in 30 days, never the agent's own counters; its first
  steps, `timelineOf`), Money (Pro and its source, the supporter badge, who invited it and the friends it invited with
  their profiles, its invite code, its payments), Contact (its email when the server keeps one, confirmed and 2FA, the
  We miss you email sent, the support chat with Open the support chat, its game drivers, Steam, Discord and Google
  links, what it shared, its last 10 feedback answers) and Actions: in Pitlane HQ since (POST /community/admin/since),
  tester and supporter (POST /community/admin/tester, /supporter), Pro by hand (POST /community/admin/pro-user {id,
  on}; hidden when its Pro was bought), its public profile, confirm the email, turn off two-step sign-in, sign out
  everywhere, rename, unlink a game driver, link or unlink a DRINKS driver (POST /community/admin/users/:id/<action>),
  unblock its sign-in (POST /community/admin/unlock {account}) and delete it (DELETE /community/admin/users/:id, never
  an admin). Each action reloads the profile. Every read is by the account's id, so a profile costs about that driver's
  own rows (migration 0109 adds the indexes on `community_laps.user_id` and `pro_orders.account_id`).
- Sign-ins are kept (from 2026-11-18): every new session of an account (`newSession` in accounts.js) logs the event
  `signin` {device, how: signup, password, 2fa, steam, discord, google, or signup:<provider> for the quick sign-up}.
  The Money tab's events table leaves it out.
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
- GET `/community/admin/analytics?days=N` (admins, 1 to 190 days, the same days before them for the changes; or `weeks=1|4|12|26`, from the Monday N-1 weeks before this one, UTC, to today, `weekDays` in usagelib.js, the answer then also carrying `weeks` and `from`) answers, from
  grouped reads of usage_days, sessions (accounts' uploads), accounts, visits_days and presence, never a query per
  account, every number without the admins and with the testers (`withoutAdmins` in usagelib.js, the same rule as the
  Analytics tab): {days, top [{key, n, users}], byDevice [{device, users, n}], games, versions [{device, v, devices}], users [{id,
  nick, lastSeen, devices, n, top}] (the phones' Users tab), active / activeApp / drove [{day, users}] (active = opened an app or
  drove that day), signupsPerDay [{day, n}], installs {downloads, prevDownloads, downloadsBeta, uninstalls,
  prevUninstalls, answered, prevAnswered, perDay, byVersion, reasons [{k, n, name}], said [{at, v, text}]}, supporters
  {total, stripe, manual, patreon, patrons, donations, prevDonations, amounts [{currency, amount}], prevAmounts, waiting,
  refunded, recent [{at, amount, currency, name, id}]} (`pcstats.js`), tryouts {pcs, hit, signedUp, laps, limit, list [{pc (6
  characters of its hash), used, first, last, hit, signedUp, laps, games, sessions [{at, game, track, car, laps}]}]} (the PCs
  that drove without an account and last did in these days, `tryoutsOf` in tryout.js: tryout_pcs joined to the sessions
  the PC uploaded with its own token, `dev_<install>:<session>`; signed up = anonAdopt moved them to an account), totals {active, newAccounts, accounts, drove, sessions, races, laps, secs,
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
  race; active means drove (the owner's choice, 2026-11-15: what matters is that the app is used to drive, not that it
  was opened), so the weekly drivers (`users`) are the accounts that uploaded a session, and opening an app (`opened`,
  used it or drove) is a second, smaller number under it (the agent running in the background, `run:agent`, is
  `users_bg` and `agent`, apart); the drivers are every account but the admins (`aud` 0, the default; 1 counts everyone); the testers are unpaid drivers who race like everyone, so they count in every number (the owner's choice, 2026-11-20); a new
  account is kept ("still driving a week later") when it uploads a session on any of days 7 to 13 after the day it was
  created (`c:kept_open` counts opening an app too, shown beside it), and Retention opens on Drove, with Raced and
  Opened the app as the other two; kept is counted only once it is 14 days old; activated is a session uploaded on its day or the next.
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
  `/community/admin/metrics/account?id=` one account's steps with their days and where it came from (`timelineOf`, the
  phones'; the web's driver profile has them in its own answer); GET/POST `/community/admin/links` and DELETE `/community/admin/links/<tag>` the
  tagged links (`pitlanehq.app/?ref=<tag>`: a visit and a sign-up from one carry the tag as their source).
  The server's own events (`eventslib.js`, `logEvent(env, name, accountId, info)`: trial_started, trial_ended, pro_paid,
  pro_renewed, pro_cancelled, pro_refunded, thanks_month, email_sent, email_click, signin) go to `events` and are counted
  per week; deleting an account deletes its events.
  The Sign-ups and Money tabs (`admMetrics` in pitwall-admin.js, parts `m_*`): Weekly numbers (the seven numbers as cards, every one on last week, Monday to Sunday, under its heading "Last week, Mon … to Sun …", only Still driving a week later on the newest week whose accounts are 14 days old, saying so, and Supporters as they stand now, with the
  week that just ended, the change, the line of the weeks, the week so far and the targets, green once reached; week by
  week; the targets' form), Growth (from the visit to staying per source and link, the tagged links' form, week by
  week), Activation (the steps the same day, within 2 and within 7 days, and by sign-up week), Retention (each sign-up
  week over time with Active, Drove or Raced and a split by game or source; what goes with staying), Money (Payments first: every payment and donation with who, the amount, when, what
  it was, its source with a link to it in Stripe, the donate button the account pressed that day, what it unlocked (the ♥
  Supporter badge with the first donation, the founding offer with the one that reached `founding.min`) and its status;
  totals in all, in 30 and 7 days, people who paid and supporters; totals by month and by week; the supporters with their
  badge's source, the founding offer, what they gave, their payments and when they were last in the app; Send the thank-you on a paid
  donation sends the thank-you email by hand once the admin types the donor's email, which must match the donation's or
  its account's (`POST /community/admin/metrics/payments/thanks`); admin test
  donations are never part of it; `GET /community/admin/metrics/payments`, `paymentslib.js`; then PRO badge
  presses by feature, the PRO window, pricing, the donation bar shown, pressed and refused, donations and what they
  raised, invites and sharing, then the invites as they stand: the totals, who brought the most friends and the ones
  refused for the same PC or connection with Approve, POST /community/admin/invites/approve). Growth also has, from the
  analytics answer over the same days (at most 90), where visitors are (countries with their sign-ups, pages they
  landed on) and Installs and uninstalls, and its week by week has the PCs driving without an account and their
  sessions. Is every counter arriving, the job with Add up now and Add up everything, the weeks as CSV and what each
  word means are in Problems, Counters. The period chooser's 4, 12 or 26 weeks (at least 4); Drivers or With
  admins. A share over fewer than 20 accounts is grey, and a week still running is lighter. The phones' admin panel
  does not have it yet.
  The page counts for it: a PRO badge pressed (`act:pro_badge.<feature>`, `proB("<feature>")`), the PRO window
  (`act:pro_info`), See pricing in it (`act:pricing_open`), Support in it (`act:donate_pro`), Support offered in it
  (`act:donate_shown`), the donation bar shown once a day (`act:donate_bar_shown`), the invite code copied and the link shared (`act:invite_copy`, `act:invite_share`).
  The server keeps its own events for the Money tab (`events`, `logEvent` in eventslib.js): `trial_started` (a new
  account's days of Pro), `thanks_month` (the day Pro is switched on), `pro_paid`, `pro_refunded` and `pro_cancelled`
  (lemon.js); a payment notice sent twice is kept once.
  `cloud/test/metrics.test.mjs` also checks that every action counted by wrapping a function (`USE_LAST` in index.html)
  is still a function of the page, so a renamed one cannot stop counting unseen.
- The Overview (`admAnalyticsHTML`, the owner's approved design; since 2026-11-20 its parts are the lower half of Today, `admAnalyticsHTML(r, true)` leaving out its own period buttons, What stands out and the three tiles): 7, 30 or 90 days with "Changes are against
  the N days before", What stands out (the server's sentences: the drivers who drove against before (until 2026-11-20 it counted who opened an app or drove), the biggest drop of the new
  accounts, the coach used by few, where most accounts or visits came from, sessions a driver per game, a phone with no
  one, devices not on the newest version), three tiles with their change (drivers who drove, with how many opened an app
  or drove under it; new accounts; time driven with its sessions, races and laps), drivers per day (drove in amber from
  the sessions, opened an app in blue, new accounts under them), On track now (each name opens the profile), then
  until 2026-11-18 also From sign-up to the coach (the funnel with the red line of who stops at each step),
  Do drivers come back (1 day, 2 or 3, 4 or more, more than one device), Where drivers come from (visits, sign-ups,
  the table of sources with kind, visits, change and sign-ups, countries, pages they landed on), Installs and uninstalls (installer
  downloads, uninstalls with their change in red when it grows, said why, the reasons, the version uninstalled and what
  they wrote), Supporters (Stripe donations and what they raised, supporters from Stripe and by hand, the latest
  donations), Tried without an account (PCs, used all the
  sessions, signed up after, then each PC with its sessions out of the limit, every session's time, game, track, car and
  laps, and Trying, Used them all or Signed up; `admTryoutsHTML`; now its own part of Drivers, and the others moved to
  Growth, Money and Activation), Games (every game, one
  nobody drove greyed: drivers and sessions with their change, new to the game, races, laps, hours, sessions a driver;
  then a chooser of the game (`admGameHTML`, `ADM.game`, no new request) with its tiles (drivers and new to it, sessions
  and races, time driven and laps, counted by the apps), its drivers per day and the tracks and cars driven most), What drivers use (by area, the share of the active drivers and the
  uses, what each counts on hover), Overlays (each overlay's drivers, time open while driving and races), Telemetry panels (each panel's drivers and days, and the modes), Devices (drivers) and Up to date (devices on each app's newest version, the older ones
  on hover).
- The admin page's look (Nov 2026): the sections as a dark well with the chosen one raised, every part a card with its
  title in the display font, the key numbers as tiles, the rows as cards (`#v-admin` rules and `.an-*` in index.html).
- Health (until 2026-11-20 Server → Health; now Problems → Errors, Problems → Counters and Tools → Database;
  `cloud/src/reports.js`, the pure part in `reportslib.js`, migration 0079): Errors in the apps lists every kind
  of error the agent, the web and the phones sent in the last 7 days (POST `/community/crash` {app pc|web|android|ios, v,
  os, where, msg, stack}, signed in or not; one row per kind, `crashSig`: the app, the part and the message with its
  numbers left out and the top frames; how many times, the newest version, the last account, whose name opens the
  profile), with its stack and
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
  fetching it is not another uninstall (until 5 Nov 2026 every fetch of the page counted). Only one post per network and day
  counts (the day's hash of the network, never the address, kept in `pc_days` as kind "unseen"), and only with a real
  version ("0.10.1", `isVersion`) counts, and rows or answers with another text as the version (a scanner trying the
  address) are left out of the admin page. An uninstall is a page shown, or on a
  day with more answers than pages (before they were counted) the answers. The reasons and what drivers wrote come from
  the uninstall answers (feedback of kind "uninstall"). What stands out says how many uninstalls and the main reason, and
  how many donations came in.
- Supporters: the accounts with the badge by `supporter_src` (stripe, manual; the old patreon ones keep the badge), and
  the Stripe donations (`pro_orders` kind "supporter", with their amount, currency and payment since migration 0095; a
  refunded donation is marked "refunded" and no longer counts, the badge stays). They are shown in Money only (and summed on Today's Money card).
  Patreon is no longer offered (0.9.8) and the admin page no longer shows it.
- Drivers → Drivers (`winback.js`, `winbacklib.js`, GET /community/admin/activity), one list instead of the old
  Accounts, Activity and Online now: the drivers asking to test first (Yes, make a tester or No), a search by name,
  email or id, filters with their counts (Everyone, On track or online, Drove this week, Not driven in N+ days with 7,
  14 by default, 30, 60 or 90, New this week, Testers, Supporters) and sorts (Most active: days driven in the last 30,
  then hours on track, then laps; Least active; Away longest, by the last session; Newest). Active means drove (the
  owner's rule): each row has the driver with their pills and On track (a lap came up in the last 10 minutes,
  `sessions.up_at`, migration 0099), Online (seen in 3 minutes) or Not driven in N days, when they last drove, days
  driven, hours and laps in 30 days, sessions in all, devices and when they signed up. A name opens the profile. Under
  Not driven, the "We miss you" email (English, Spanish or Portuguese from the driver's support chat language, else
  English) with a button to `/app?feedback=1`, which opens the feedback window once signed in: Preview, Send me a test,
  Copy their emails, and Send it to the checked drivers after a confirmation. It goes once per account
  (`accounts.winback_at`) to accounts with an email that have not driven in the days chosen (one that never drove
  counts from its creation), never to an admin or someone online, 20 a request (the page asks again), and only when an
  admin presses it. GET /community/admin/activity?now=1 is the light read of who is on track or online now (recent
  presence and sessions only, no email) for the Overview.
- GET /community/admin/users stays for the phones' admin panel with the same answer, read with one query per table
  grouped by account (it read every lap once per account before, about 396k rows each time). The web page no longer
  calls it.
