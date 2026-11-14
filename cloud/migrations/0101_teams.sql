-- Team mode (team.js, docs/spec/team.md): a small group of accounts (up to 12) that watch each other's live telemetry
-- and keep a shared log of their stints. The team's secret is made by the device that creates it and never reaches the
-- server: the server keeps the room (a hash of the secret, the live room's name), a hash of the join proof, and each
-- member's copy of the secret sealed with that member's own data key.
-- id: 12 lowercase hex characters made by the server; owner: the account that manages it; join_hash: SHA-256 of the
-- join proof the invite gives
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  room TEXT NOT NULL UNIQUE,
  join_hash TEXT NOT NULL,
  created INTEGER NOT NULL
);
-- role: owner or member; sealed: the team's secret sealed with the member's data key; joined: when (ms)
CREATE TABLE IF NOT EXISTS team_members (
  team TEXT NOT NULL,
  account TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  sealed TEXT NOT NULL,
  joined INTEGER NOT NULL,
  PRIMARY KEY (team, account)
);
CREATE INDEX IF NOT EXISTS team_members_account ON team_members(account);
-- the team's log: one entry per member and key (a stint), sealed with the team key; the last 30 days, at most 300 a team
CREATE TABLE IF NOT EXISTS team_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team TEXT NOT NULL,
  account TEXT NOT NULL,
  key TEXT NOT NULL,
  at INTEGER NOT NULL,
  sealed TEXT NOT NULL,
  UNIQUE (team, account, key)
);
CREATE INDEX IF NOT EXISTS team_log_team_at ON team_log(team, at);
CREATE INDEX IF NOT EXISTS team_log_account ON team_log(account);
-- the drivers the owner removed: they cannot join again with the invite link they still have
CREATE TABLE IF NOT EXISTS team_bans (
  team TEXT NOT NULL,
  account TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (team, account)
);
