# Accounts, testers and money

Status as of 2026-11-07. Behaviour is in `docs/spec/sync-and-accounts.md`, `admin.md` and `pro.md`.

## Accounts and testers

- Steam and Discord one-tap sign-up work. Google sign-in is switched off (server answers 503 without `GOOGLE_ON`).
  Bring it back only if a support@pitlanehq.app Google account exists.
- Tester level: `TESTERS` in `cloud/wrangler.toml` plus the admin Users list. Drivers can "Ask to test".
- Secrets: `DATA_KEY` is set on the Worker and must never change. `EMAIL_PEPPER` must stay unset (it would lock out
  every existing account).
- Not done: "add an email and password later" for no-password accounts. Delete account untested on a real iPhone.

## Money

- The subscription stays off (`enforce: false`). During the beta there are only donations through Stripe ($1 minimum),
  which give the Supporter badge, never Pro. Patreon links are gone, the webhook still gives patrons the badge.
- Prices after the beta: Pro $6 a month or $59 a year. Beta supporters get 50% off forever (kept if they come back
  within 2 months of stopping), plus a $29.99 lifetime offer in the first 2 months after release. The discount is not
  built yet. RevenueCat for the phones later.
- The phones show no donation link (store rules).
- Invite a friend (2026-11-14, on master, live after the next cloud and Windows build): a friend's week of use gives both a month of
  Pro, counted from now and saved until Pro is switched on. Needs migration 0100 and a Windows build for the agent to
  pass the code box through (older agents show the card without it).
- Invite code on the PC and web sign-up form (2026-11-15, committed on the working branch, waiting for "sube"; the
  phones are left as they are for now, the owner's choice). Needs the cloud deploy and, for the agent, a Windows build.
- Owner's to-do: upload the square icon in Stripe Branding.
