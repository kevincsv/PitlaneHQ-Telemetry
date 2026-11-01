# Discord bot

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- The Discord bot (`cloud/src/discord.js`, commands in `discord-commands.js`, registered by the deploy with
  `discord-register.mjs`, migrations 0040 to 0042): slash commands (their names in English only, one per command; the
  descriptions in each language) answered by the Worker at `/discord/interactions`
  (Ed25519, DISCORD_PUBLIC_KEY), lap alerts posted with DISCORD_BOT_TOKEN. In English, Spanish and Portuguese: the
  language each user chose with /language (`discord_users`), else their Discord app's; the alerts in the language
  chosen in /alerts or /setup, else the server's. /setup (the server's managers) is a panel of Discord's own pickers: the
  channels the bot answers in (`cmd_channels`: the public commands only there, private answers anywhere), the channel
  of new best laps, the channel of new records (else the best laps' one) and the alerts' language. Account → Discord
  (PC, web, Pitlane HQ Desktop, phones; `/account/discord`, actions `discord*` in /api/sync) links the Discord account
  with Discord's sign-in (`/discord/oauth`, DISCORD_APP_ID + DISCORD_CLIENT_SECRET, only "identify") and shows it on the
  public profile only when the driver says (`shown`, off by default), so other drivers can find them there (the
  profile's "Discord: @handle", /driver too). Every command is free for everyone, always (the owner's choice; `discordPro` in license_plans.json is empty and
  `isPro` says yes): /record, /driver, /link, /unlink, /download, /help, /language, /setup, /coach, /compare, /board (the server's ranking), /alerts (a channel for the
  server's new best laps and records, `discordLapAlert` from autoShare, `/laps` and `reshareSession`). /link gives a
  one-use button to pitlanehq.app (`?discord=`) where the signed-in web app confirms (`discordLinkAsk`). It shows
  what the public pages show: nicknames; race rivals, anonymous laps and accounts as
  "Anonymous"; an anonymous account's answers only to itself; the Windows app is "Pitlane HQ for Windows", as on the downloads page.
- /recent (free, only to you): the account's last 8 sessions (date, track, car, Race/Qualifying/Practice with the place,
  laps, best lap, LMU marked) with "Open Pitlane HQ". /track (free, public): a track's record on each of its 10 most
  driven cars with how many drivers, and your three best places there (not for an anonymous account); the track picked
  from a list as you type (`tracks`).
- /league (the server's managers): links the server to its league in the leagues hub (picked as you type; empty
  unlinks). The league's invite must lead to that server (the bot asks Discord where it goes, `inviteGuild`), so nobody
  takes another server's league. A linked league shows "Pitlane HQ bot" in the hub (`bot` on GET /community/leagues;
  migration 0080 `discord_guilds.league_id`).
- The weekly post (`discordWeekly`, Monday from 09:00 UTC, up to 20 servers each hourly run, each once a week,
  `week_at`): every server with alerts on gets "The week's best laps" in its alerts channel (with its league's name when
  linked), each of its drivers' laps of the last seven days with the place on the leaderboard, the best places first,
  at most 10. Nothing is posted in a week without laps.
- The community server (admin page → Server → Discord server, `discordserver.js` + `discordserverlib.js`,
  `/community/admin/discord-server`): lists the servers the bot is in and whether it has Administrator there, and builds the
  Pitlane HQ server with the bot's own token. Roles Admin, Tester, ♥ Supporter, Driver, iRacing, Le Mans Ultimate;
  categories START HERE (welcome, rules, announcements, changelog, read-only), LANGUAGES (#español, #português; the rules point there), PITLANE HQ (general, support, the
  bug-reports and feedback forums with tags, laps-and-records for the bot, bot-commands), SIM RACING, SUPPORTERS and
  TESTERS (hidden from others), STAFF, VOICE; Community on, onboarding "What do you drive?" giving Driver and the game's
  role; the bot posts the welcome, the rules and the newest whats-new.json notes once, and a later Build brings its welcome and rules posts up to date. Preview lists the changes; Build
  runs three steps (roles, channels, then Community, forums, posts and onboarding), each its own request. Nothing is ever
  deleted: channels and roles of the same name are reused. After it, /setup in the server and Administrator taken off the bot.
- Two settings per server, only on the admin page (Server → Discord server; the servers' own /setup never shows them):
  "Every driver's best laps and records" (`discord_guilds.everyone`, migration 0091) makes `discordLapAlert` post every
  driver's new best iRacing laps and records in that server's /setup channels, not only its members' (never anonymous
  accounts, race rivals or laps against the AI; the name the leaderboard shows; no Pro needed). "The apps' feedback in
  its feedback forum" (`feedback_channel`, migration 0092, the server's channel named feedback, a forum first) makes every
  Share your feedback answer a post there (`discordFeedback`, from POST /community/feedback): the text, the stars, the
  device, the version and the overlay design, never the driver's name; the forum's tags of the device and Overlays.
- /pro (only to who asked): everything is free during the beta, the list of what will be part of Pitlane HQ Pro when it
  ends (the apps' PRO badges, without what is still in development) and what stays free, every command of the bot too.
- The lap alerts take Le Mans Ultimate laps too (their place among the same car's laps, the title saying the game, the
  LMU record page). The servers set to get every driver's laps also get each new version's notes (whats-new.json) in
  their channel named changelog, once per version from the scheduled run (`discordChangelog`, app_state
  discord_changelog), and the admin page's "Post the current records" posts every current record there (`discordRecords`,
  10 to a message, the oldest first).
