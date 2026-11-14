-- The admin page's Users → Activity (winback.js): when the "we miss you" email went to an account (it goes once), and
-- when a session last got a lap from the PC, so the list says who is on track now.
ALTER TABLE accounts ADD COLUMN winback_at INTEGER;
ALTER TABLE sessions ADD COLUMN up_at INTEGER;
