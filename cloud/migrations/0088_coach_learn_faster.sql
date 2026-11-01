-- The coach learns from every session (cloud/src/coachlearn.js), not only the ones a driver opens it on: the server
-- runs the coach itself over the best lap of every session of an account and keeps what it would have said, and it
-- answers every tip from the driver's next session on its own.
-- src: 'app' a tip the driver saw (the apps' POST /community/coach/tips), 'auto' what the server's coach would have said
-- on a session nobody opened the coach on; the two together say how much a tip really helps beyond the time the
-- drivers find anyway.
ALTER TABLE coach_tips ADD COLUMN src TEXT NOT NULL DEFAULT 'app';
-- when the server last looked for the next session that answers this tip (ms): once a day at most
ALTER TABLE coach_tips ADD COLUMN looked INTEGER;
CREATE INDEX IF NOT EXISTS coach_tips_open ON coach_tips(outcome, looked);
CREATE INDEX IF NOT EXISTS coach_tips_acc_combo ON coach_tips(account, track_id, car_id, game, started);
-- the sessions the server's coach already went over (tips kept: n, -1 when it had nothing to go on)
CREATE TABLE IF NOT EXISTS coach_shadow (
  session_id TEXT PRIMARY KEY,
  at INTEGER NOT NULL,
  n INTEGER NOT NULL DEFAULT 0
);
