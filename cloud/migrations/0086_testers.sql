-- Testers given in the admin page (community.js POST /admin/tester): 1 when an admin made the account a tester. The
-- TESTERS setting in wrangler.toml still counts too (isTester in accounts.js reads both).
ALTER TABLE accounts ADD COLUMN tester INTEGER;
