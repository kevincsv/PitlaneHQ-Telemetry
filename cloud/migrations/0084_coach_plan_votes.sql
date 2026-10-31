-- The drivers' 👍/👎 on the coach's plan for the next session: one vote per step of the plan (its id, the kind of step and
-- the corners it is about) or on the whole plan (step 'plan'), kept with the account. From enough votes a kind of step the
-- drivers find useful comes earlier in everyone's plan (coachtips.js, /coach/weights plan); the admin panel's Coach tab
-- shows the counts.
CREATE TABLE IF NOT EXISTS coach_plan_votes (
  account TEXT NOT NULL,
  game TEXT NOT NULL DEFAULT 'iracing',
  track_id INTEGER NOT NULL,
  car_id INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  started INTEGER NOT NULL,
  step TEXT NOT NULL,             -- the step as the app keys it: its id and its corners ("corner:brake_later@3"), or 'plan'
  sid TEXT NOT NULL,              -- the step's id ("corner:brake_later", "trail", "phase:exit"), or 'plan'
  k TEXT NOT NULL,                -- the kind of step (corner, phase, trail, rotate, tyres…), or 'plan'
  kind TEXT NOT NULL DEFAULT '',  -- the tip's kind on a corner's step
  turns TEXT,                     -- the corners, "3,7"
  up INTEGER NOT NULL,            -- 1 thumbs up, -1 thumbs down
  created INTEGER NOT NULL,
  PRIMARY KEY (account, session_id, step)
);
CREATE INDEX IF NOT EXISTS coach_plan_votes_sid ON coach_plan_votes(sid);
