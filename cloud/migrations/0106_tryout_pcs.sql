-- Trying Pitlane HQ without an account (docs/spec/sync-and-accounts.md): the sessions a PC nobody is signed in on
-- used, by the agent's ?pc= (a hash of Windows' own machine id), so reinstalling does not start the count again
CREATE TABLE IF NOT EXISTS tryout_pcs (
  pc TEXT NOT NULL,
  session TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (pc, session)
);
