-- When an answer of Share your feedback was posted in the Discord feedback forum, so the earlier answers are posted once.
ALTER TABLE feedback ADD COLUMN discord_at INTEGER;
