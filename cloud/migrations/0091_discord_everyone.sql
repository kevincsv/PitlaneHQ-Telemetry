-- A Discord server that gets every driver's new best laps and records (the Pitlane HQ community server), set only
-- from the admin page (Server → Discord server); other servers keep getting only their own drivers' laps.
ALTER TABLE discord_guilds ADD COLUMN everyone INTEGER;
