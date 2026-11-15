# Emails and logo

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- Emails go through Resend only (domain pitlanehq.app, its records on `send.` and `resend._domainkey`, secret
  RESEND_API_KEY; no SMTP or Proton any more). What people write to support@ (the Reply-To of every email) arrives by
  Cloudflare Email Routing (its MX). Admin → Server shows the last emails (Resend's delivery state) and checks the
  domain's Resend DKIM, send. records, SPF (one, no Proton), the Email Routing MX, DMARC and BIMI
  (`web/dist/bimi.svg`, the logo in SVG Tiny PS, needs DMARC at quarantine).
- After every paid donation (not an admin's test) the donor gets a thank-you email (`thanksMail`/`sendThanks` in
  email.js, sent by stripe.js): thanks, the ♥ Supporter badge (or, without an account yet, that it comes when they sign
  up with that email), and the founding supporter offer when the account has it, or that $3 or more in all gives it.
  English, Spanish or Portuguese, from the language they last wrote to support in, else their card's country.
- The logo is the rev gauge with a kerb in the rev limit (`assets/logo.svg`, the master; `web/dist/logo.svg`).
  Its PNGs and ICOs (web/dist icons, assets/pitlanehq.ico and -1024.png, the phone apps' launcher icons)
  are rendered from it; the phone icons are the full square (no transparent corners).
- Emails look like the app (`mailHTML` in email.js: the logo from pitlanehq.app/icon-192.png, the dark
  card, the amber button), tables and inline styles only.
- No reminder or summary ever goes by email (the owner's choice): they are the phones' notifications, only when the
  driver turns them on (`docs/spec/community.md`, Alerts).
