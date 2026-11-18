# Server and operations

Status as of 2026-11-07. Server layout is in CLAUDE.md ("Where things are").

- Builds run only by hand (Actions → Run workflow). The beta channel goes first, production promotes the tested build.
- Highest migration: 0097 (content reports). D1 is on the free plan; reads were cut in Oct (migration 0078). D1 MCP
  queries return `meta.rows_read`, useful to measure a query.
- Analytics revamp (2026-11-15, branch `claude/project-thread-jy09k6`, not pushed): migration 0105 (`metrics_weeks`,
  `cohort_weeks`, `links`, `events`), a daily job at 03:00 UTC (`weeklyMetrics`) and the admin page's Analytics section.
  After the cloud deploy with the migration: admin → Analytics → Data → Add up everything, once, for the weeks since
  Oct 28. The counters for PRO badges, the donation bar shown and invites need the web and PC build. Not built yet: the
  Monday message to Discord, the agent's `run:agent` and `set:autostart.*` (the growth and sales thread sends them), the
  phones' admin tabs. Migrations 0103 and 0104 belong to the growth and sales thread.
- Database size (2026-11-15): 1.43 GB, 95% of it lap telemetry in `laps.trace` and `community_laps.trace`. D1 is on the
  paid plan (5 GB included, 10 GB the limit of one database). Built, not deployed: telemetry in the R2 bucket
  `pitlanehq-telemetry`, gzipped (`docs/spec/sync-and-accounts.md`). After it is live on the test version and on
  pitlanehq.app, the owner's yes sets `app_state` `trace_store` = `r2` (new laps go to the bucket and the old ones
  move over in about two days). The database's file may keep its size until Cloudflare gives the freed pages back.
- Server audit (2026-11-15, report https://claude.ai/artifact/VJM2eT1boSnpkwYPR4SomF): the $5 a month is the Workers
  Paid plan, used at about 3% of its database reads (22 million rows a day of 25 billion a month). Fixed 2026-11-16
  (migration 0107, `cloud/test/read-less-uploads.test.mjs`): a lap upload read every session and shared lap
  (`reconcileIds`), every public page read every LMU leaderboard lap (`readHas`'s memo never held), the admin's Users
  list read every community user per account. Still open from the report: the coach learning jobs reread every session
  and tip each 10 minutes, a model is rebuilt per uploaded lap, the coach's weights add up all of `coach_tips` per call,
  and `candidates` and `buildCarCard` load every lap of the memory before picking (fine until about 3,000 laps a pair).
  Never filter on `laps.trace` over the whole table by hand while laps keep telemetry in the row: it holds the database.
- Admin panel rebuild (2026-11-18, live on pitlanehq.app the same day, master 56c38fb; the audit is the Claude Doc
  "Admin panel audit"): 7 tabs instead of 10, one Drivers list (it no longer reads /admin/users, about 396k rows an
  open), the driver profile (GET /community/admin/driver), sign-ins kept as `signin` events, Patreon gone from the page.
  Migration 0109 (two indexes) applied. The phones' admin panel is unchanged.
- Both repositories are private. Pitwall-test is named kevincsv/PitlaneHQ-Telemetry on GitHub (the old name redirects).
- `windows.yml` builds the agent in the desktop job and uploads artifacts with continue-on-error (GitHub artifact
  storage was full).
- The admin "Web 0.7.x" rows are stale presence rows, not real old clients.
- SEO: owner steps pending for Google Search Console and Bing Webmaster verification and the sitemap.
- SEO pass 2026-11-15 (live): a crawl of all 1,377 public addresses went from 36-54% clean to 97.7% (99.9% with no errors);
  record and league pages no longer answer 404 when D1 is busy (retries, then 503). Lighthouse "/" performance is still
  52-66 (the 2 MB app page draws the landing); a light standalone landing is offered to the owner as a follow-up.
- LMU-first SEO (2026-11-15, branch claude/project-thread-dbjmh4, waits for the owner's push and a cloud deploy): LMU lap times by track and class (an index and 20 track pages from real laps), a "Garage 61 for LMU?" guide and a multiclass guide, "/" and llms.txt lead with Le Mans Ultimate (SEO_VER 19).

## Never run on real hardware

- Windows: the single-file install folder, overlay preview, per-overlay frame rate, first-open positions. Testers
  follow `docs/testing/windows-beta-checklist.md`.
- iOS: home screen widget (needs an App Group). Android: compiled in CI, rarely on a phone.
