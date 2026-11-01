-- The coach learns apart by discipline (coachtips.js): ovals, dirt ovals, dirt roads, and road racing (sports and formula
-- cars). Every tip and every vote on the plan keeps its group; the weights of a group count once it has enough cases of
-- its own, else everyone's together. Older rows get theirs from the season and the session's category (fillCats, hourly).
ALTER TABLE coach_tips ADD COLUMN cat TEXT;
ALTER TABLE coach_plan_votes ADD COLUMN cat TEXT;
CREATE INDEX IF NOT EXISTS coach_tips_cat ON coach_tips(cat, kind, cls);
CREATE INDEX IF NOT EXISTS coach_tips_nocat ON coach_tips(session_id) WHERE cat IS NULL;
CREATE INDEX IF NOT EXISTS coach_plan_votes_nocat ON coach_plan_votes(session_id) WHERE cat IS NULL;
