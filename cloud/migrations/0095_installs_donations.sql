-- The admin Analytics' installs and uninstalls (pcstats.js): per day, how many times the Windows installer was
-- downloaded (kind 'download', v 'beta' for the test builds) and how many times the page the uninstaller opens was
-- shown (kind 'uninstall', v the version uninstalled). Counts only, no address or account.
CREATE TABLE IF NOT EXISTS pc_days (
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  v TEXT NOT NULL DEFAULT '',
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind, v)
);
-- a Stripe donation's amount (smallest unit of its currency) and currency, and its payment, so a refund finds it
ALTER TABLE pro_orders ADD COLUMN amount INTEGER;
ALTER TABLE pro_orders ADD COLUMN currency TEXT;
ALTER TABLE pro_orders ADD COLUMN ref TEXT;
CREATE INDEX IF NOT EXISTS pro_orders_kind_at ON pro_orders (kind, at);
