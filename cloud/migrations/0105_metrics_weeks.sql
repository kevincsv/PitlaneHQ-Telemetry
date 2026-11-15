-- The admin Analytics' weekly numbers (metrics.js, the pure part in metricslib.js). The daily job adds the usage, the
-- sessions, the accounts and the visits up into one row per week, number and split, so the page reads a few hundred rows
-- whatever the number of drivers, and a week keeps its numbers after the raw usage is gone (400 days).
-- week: the Monday of the week (UTC, 'YYYY-MM-DD'). aud: 0 the drivers (no admins, no testers), 1 everyone.
-- metric: users, used, drove, raced, new, visits… and the sign-up week's own numbers (c:…, s:…, b:…); split: '' for
-- all, or game:<id>, src:<source>, dev:<device>.
CREATE TABLE IF NOT EXISTS metrics_weeks (
  week TEXT NOT NULL,
  aud INTEGER NOT NULL DEFAULT 0,
  metric TEXT NOT NULL,
  split TEXT NOT NULL DEFAULT '',
  value REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (week, aud, metric, split)
);
-- Do the drivers stay: the accounts of each sign-up week, and how many of them were active, drove and raced in each
-- week after (wk 0 is their first seven days, counted from each account's own day). ripe: the accounts whose week wk
-- is already over, so a week still running is not read as a drop.
CREATE TABLE IF NOT EXISTS cohort_weeks (
  week TEXT NOT NULL,
  aud INTEGER NOT NULL DEFAULT 0,
  split TEXT NOT NULL DEFAULT '',
  wk INTEGER NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  ripe INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 0,
  drove INTEGER NOT NULL DEFAULT 0,
  raced INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (week, aud, split, wk)
);
-- The links the admin tags to post somewhere (pitlanehq.app/?ref=<tag>): a visit and a sign-up from one carry the tag
-- as their source (sourceslib.js), so each link has its own row in the Analytics.
CREATE TABLE IF NOT EXISTS links (
  tag TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  place TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL
);
-- What the server itself does to an account and when (eventslib.js): a trial started or ended, a payment, a month of
-- Pro given, an email sent or its link opened. info: a small JSON with the plan, the amount or the kind of email.
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  at INTEGER NOT NULL,
  account_id TEXT,
  name TEXT NOT NULL,
  info TEXT
);
CREATE INDEX IF NOT EXISTS events_name_at ON events(name, at);
CREATE INDEX IF NOT EXISTS events_account ON events(account_id, at);
