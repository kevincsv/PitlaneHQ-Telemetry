-- Laps of a PC nobody was signed in on (docs/spec/sync-and-accounts.md): on the leaderboards as Anonymous until someone
-- signs in there (POST /community/adopt gives them the account's public name). The ones shared before showed "Driver".
UPDATE community_laps SET anon = 1
WHERE anon = 0
  AND user_id NOT LIKE 'o:%' AND user_id NOT LIKE 'guest-%'
  AND user_id NOT IN (SELECT id FROM accounts)
  AND user_id IN (SELECT id FROM community_users);
