-- Race fuel learns from everyone: each session keeps the fuel its laps took (fuel: the mean of its laps with fuel used
-- within 7 % of the session's best, the same laps as the analysis module's fuelUse; fuel_n how many, fuel_t their mean
-- time), with two such laps at least. GET /community/fuel takes the drivers' figures of a car and track from here
-- (cloud/src/fuel.js), never from the laps. The daily pass keeps the sessions of the last two days; this fills the old ones.
ALTER TABLE sessions ADD COLUMN fuel REAL;
ALTER TABLE sessions ADD COLUMN fuel_n INTEGER;
ALTER TABLE sessions ADD COLUMN fuel_t REAL;
UPDATE sessions SET (fuel, fuel_n, fuel_t)=(SELECT CASE WHEN COUNT(*)>=2 THEN AVG(f.fuel) END, CASE WHEN COUNT(*)>=2 THEN COUNT(*) END, CASE WHEN COUNT(*)>=2 THEN AVG(f.time) END
  FROM laps f WHERE f.session_id=sessions.id AND f.fuel>0 AND f.fuel<100 AND f.time>0 AND f.time<3600
    AND f.time<=1.07*(SELECT MIN(m.time) FROM laps m WHERE m.session_id=sessions.id AND m.fuel>0 AND m.fuel<100 AND m.time>0 AND m.time<3600))
WHERE laps>=2;
