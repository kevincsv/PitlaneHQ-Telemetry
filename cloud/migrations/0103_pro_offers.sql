-- Pitlane HQ Pro's offers, ready for the day Pro is switched on (docs/spec/pro.md):
-- founder: the founding supporter offer (Pro at half price, and Pro for life in the first two months): whoever
--   supported Pitlane HQ during the beta with founding.min dollars or more in all (license_plans.json). Everyone who
--   already has the Supporter badge today keeps the offer they were told about.
-- trial_until: the end of the new account's days of Pro (trialDays), given to accounts made once Pro is on.
ALTER TABLE accounts ADD COLUMN founder INTEGER NOT NULL DEFAULT 0;
UPDATE accounts SET founder=1 WHERE supporter=1;
ALTER TABLE accounts ADD COLUMN trial_until INTEGER NOT NULL DEFAULT 0;
-- one trial per PC (the agent's ?pc=, a hash of Windows' id): the account whose trial this PC ran
CREATE TABLE IF NOT EXISTS trial_pcs (
  pc TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  at INTEGER NOT NULL
);
