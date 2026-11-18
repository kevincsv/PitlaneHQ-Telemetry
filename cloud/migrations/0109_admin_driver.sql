-- The admin page's driver profile and Drivers list (driver.js, community.js /admin/users): an account's shared laps
-- and its payments are read by the account, so they come from an index instead of a scan of every lap or order.
CREATE INDEX IF NOT EXISTS community_laps_user ON community_laps(user_id);
CREATE INDEX IF NOT EXISTS pro_orders_account ON pro_orders(account_id, at);
