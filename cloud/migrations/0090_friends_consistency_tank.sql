-- Friends: the drivers an account follows (Community → Friends, the profile's Follow), by their account id. Only a
-- driver with a public profile can be followed, and only their laps that are not anonymous ever show to a follower.
CREATE TABLE IF NOT EXISTS follows (
  account_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (account_id, driver_id)
);
CREATE INDEX IF NOT EXISTS follows_driver ON follows(driver_id);
-- each session's lap time spread (the variance of its valid laps within 3 % of its best, five at least; SESSION_SUMS):
-- the "Most consistent session" of every car and track. The daily ALL_SESSION_SUMS fills the old sessions.
ALTER TABLE sessions ADD COLUMN cons REAL;
-- the litres the car's tank takes in the session (the agent's tank): the race fuel helper
ALTER TABLE sessions ADD COLUMN tank REAL;
UPDATE sessions SET cons=(SELECT CASE WHEN COUNT(*)>=5 THEN MAX(0, AVG(c.time*c.time)-AVG(c.time)*AVG(c.time)) END FROM laps c
  WHERE c.session_id=sessions.id AND c.valid=1 AND c.drv IS NULL AND c.time>0 AND c.time<3600
    AND c.time<=1.03*(SELECT MIN(m.time) FROM laps m WHERE m.session_id=sessions.id AND m.valid=1 AND m.drv IS NULL AND m.time>0 AND m.time<3600));
