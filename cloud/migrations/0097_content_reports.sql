-- Reporting and blocking what other drivers post (moderation.js): a report of a league post or a driver's public name
-- and profile, kept until an admin deals with it (deleting the post, resetting the name, or dismissing it), and the
-- drivers each driver blocked (their league posts and profile hidden from them, their name "Blocked driver" on the
-- leaderboards they read).
CREATE TABLE IF NOT EXISTS content_reports (
  id TEXT PRIMARY KEY,
  reporter TEXT NOT NULL,
  kind TEXT NOT NULL,
  target TEXT NOT NULL,
  owner TEXT,
  reason TEXT NOT NULL,
  note TEXT,
  snapshot TEXT,
  created INTEGER NOT NULL,
  done INTEGER,
  action TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS content_reports_once ON content_reports (reporter, kind, target);
CREATE INDEX IF NOT EXISTS content_reports_open ON content_reports (done, created);
CREATE TABLE IF NOT EXISTS blocks (
  account_id TEXT NOT NULL,
  blocked TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (account_id, blocked)
);
