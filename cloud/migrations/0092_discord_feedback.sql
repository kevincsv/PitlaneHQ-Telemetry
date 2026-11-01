-- The Discord channel (the feedback forum of the Pitlane HQ community server) where the apps' feedback is posted, set
-- only from the admin page (Server → Discord server).
ALTER TABLE discord_guilds ADD COLUMN feedback_channel TEXT;
