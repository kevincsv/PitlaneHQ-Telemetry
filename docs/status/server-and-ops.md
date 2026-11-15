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
- Both repositories are private. Pitwall-test is named kevincsv/PitlaneHQ-Telemetry on GitHub (the old name redirects).
- `windows.yml` builds the agent in the desktop job and uploads artifacts with continue-on-error (GitHub artifact
  storage was full).
- The admin "Web 0.7.x" rows are stale presence rows, not real old clients.
- SEO: owner steps pending for Google Search Console and Bing Webmaster verification and the sitemap.
- SEO pass 2026-11-15 (live): a crawl of all 1,377 public addresses went from 36-54% clean to 97.7% (99.9% with no errors);
  record and league pages no longer answer 404 when D1 is busy (retries, then 503). Lighthouse "/" performance is still
  52-66 (the 2 MB app page draws the landing); a light standalone landing is offered to the owner as a follow-up.

## Never run on real hardware

- Windows: the single-file install folder, overlay preview, per-overlay frame rate, first-open positions. Testers
  follow `docs/testing/windows-beta-checklist.md`.
- iOS: home screen widget (needs an App Group). Android: compiled in CI, rarely on a phone.
