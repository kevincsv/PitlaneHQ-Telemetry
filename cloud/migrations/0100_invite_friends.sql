-- "Invite a friend" (referrals.js): a driver's friend who signs up with their link (or types their code in the first
-- 14 days) and then uses Pitlane HQ for a week gives both of them a month of Pro. Invites count from now; a month earned while
-- everything is free (the beta) is kept and starts when Pro is switched on.
-- invitee: the new account; inviter: whose link or code it was; state: waiting, given, refused (the same PC or
-- connection as the inviter), expired (no week of use within 60 days); done: when it was settled (ms)
CREATE TABLE IF NOT EXISTS referrals (
  invitee TEXT PRIMARY KEY,
  inviter TEXT NOT NULL,
  created INTEGER NOT NULL,
  via TEXT NOT NULL DEFAULT 'link',   -- link (the invite link) or code (typed in the app)
  state TEXT NOT NULL DEFAULT 'waiting',
  why TEXT,
  done INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS referrals_inviter ON referrals(inviter, state);
CREATE INDEX IF NOT EXISTS referrals_state ON referrals(state, created);
-- the PCs, installs and connections both sides of a waiting invite were seen on, as hashes with the server's secret
-- (never the address): a friend on the same PC or connection as their inviter is the inviter themselves
CREATE TABLE IF NOT EXISTS referral_marks (
  account_id TEXT NOT NULL,
  h TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (account_id, h)
);
CREATE INDEX IF NOT EXISTS referral_marks_h ON referral_marks(h);
-- the account's short invite code (made the first time it is asked for), the end of the Pro its invites gave, and
-- whether it is part of a waiting invite (its PCs and connections are noted then)
ALTER TABLE accounts ADD COLUMN invite_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_invite_code ON accounts(invite_code);
ALTER TABLE accounts ADD COLUMN ref_pro_until INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN ref_watch INTEGER NOT NULL DEFAULT 0;
-- the months of Pro earned while Pro is still off (the beta): they start when the admin switches Pro on
ALTER TABLE accounts ADD COLUMN ref_months INTEGER NOT NULL DEFAULT 0;
