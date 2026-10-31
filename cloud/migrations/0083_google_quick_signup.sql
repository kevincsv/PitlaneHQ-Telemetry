-- "Continue with Google" (Google's OAuth2 with OpenID, /google/oauth) and accounts made straight from Steam, Discord or
-- Google with no password (auth_hash ''): the server makes their data key and keeps it sealed (escrow).
-- a Google account linked to a Pitlane HQ account, one each way (sub is Google's own id of the person)
CREATE TABLE IF NOT EXISTS google_links (
  sub TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
  created INTEGER NOT NULL
);
-- one state per attempt for 10 minutes, as a hash, with the hash of the code only the app that started knows; port when
-- the PC started, app when a phone did
CREATE TABLE IF NOT EXISTS google_oauth (
  state_hash TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  device TEXT,
  port INTEGER,
  app INTEGER NOT NULL DEFAULT 0,
  expires INTEGER NOT NULL
);
-- what Google's answer proved, handed to the app once, as a hash, good only with its code: a sign-in grant (5 minutes) or
-- a sign-up grant (30 minutes). The email (only when Google says it is verified) is kept as its hash and sealed with
-- DATA_KEY, never in the clear
CREATE TABLE IF NOT EXISTS google_grants (
  grant_hash TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  sub TEXT NOT NULL,
  email_hash TEXT,
  email TEXT,
  name TEXT,
  device TEXT,
  kind TEXT NOT NULL,
  expires INTEGER NOT NULL
);
-- a session given before the email is confirmed (the form's sign-up and sign-in of the new apps, gate): it only reads the
-- account (/account/me), sends the link again, signs out or deletes the account until the email is confirmed
ALTER TABLE account_sessions ADD COLUMN gated INTEGER NOT NULL DEFAULT 0;
