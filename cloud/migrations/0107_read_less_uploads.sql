-- The database's reads (docs/status/server-and-ops.md, the server audit of 2026-11-15):
-- every lap upload looked for a car's provisional id in every session and every shared lap (reconcileIds, model.js),
-- and the admin's Users list counted each account's Drinks drivers by reading every community user.
CREATE INDEX IF NOT EXISTS sessions_car ON sessions(car_id, game);
CREATE INDEX IF NOT EXISTS community_laps_car ON community_laps(car_id, game);
CREATE INDEX IF NOT EXISTS community_reports_car ON community_reports(car_id, game);
CREATE INDEX IF NOT EXISTS community_users_owner ON community_users(owner);
