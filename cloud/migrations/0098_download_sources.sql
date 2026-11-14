-- Where the drivers who sign up in the PC agent came from (the admin page's Analytics, sourceslib.js): each download of
-- the installer keeps the first visit of the browser that downloaded it (or the link's own source), under a hash of the
-- connection's address with the server's secret (never the address), for 14 days (the hourly job drops older rows). An
-- account the agent makes from the same connection in that time takes that source instead of "the PC agent".
CREATE TABLE IF NOT EXISTS dl_src (
  ip TEXT NOT NULL,           -- dlKey: hash of the address and the server's secret
  created INTEGER NOT NULL,   -- ms
  src TEXT NOT NULL,          -- google, reddit, direct, a site's host…
  page TEXT,                  -- the page of that first visit
  campaign TEXT
);
CREATE INDEX IF NOT EXISTS dl_src_ip ON dl_src(ip, created);
