-- Asking to test (testask.js): when a driver asked to test what is in development (ms), cleared when an admin makes them
-- a tester, the time with a minus sign when an admin said no (they are not asked again). test_ask_what is where they
-- asked from (a view or a game of the apps).
ALTER TABLE accounts ADD COLUMN test_ask INTEGER;
ALTER TABLE accounts ADD COLUMN test_ask_what TEXT;
