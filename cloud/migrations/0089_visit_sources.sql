-- Where the drivers come from (the admin page's Analytics, sources.js): the visits to the landing, the web app and the
-- public pages, counted once per browser session, as one row per day, source (google, reddit, direct…), country and
-- page, added up; rows older than 400 days go (the hourly job). No address, no account, nothing that names a person.
CREATE TABLE IF NOT EXISTS visits_days (
  day TEXT NOT NULL,          -- 'YYYY-MM-DD' (UTC)
  src TEXT NOT NULL,          -- google, reddit, discord, direct, a site's host…
  country TEXT NOT NULL,      -- two letters from Cloudflare, XX when unknown
  page TEXT NOT NULL,         -- landing, app, or the public page's path
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, src, country, page)
);

-- where each new account came from: the first visit of the browser it signed up in (or the app it was made in), and
-- the country of the sign-up
ALTER TABLE accounts ADD COLUMN src TEXT;
ALTER TABLE accounts ADD COLUMN src_page TEXT;
ALTER TABLE accounts ADD COLUMN country TEXT;
CREATE INDEX IF NOT EXISTS accounts_created ON accounts(created);
