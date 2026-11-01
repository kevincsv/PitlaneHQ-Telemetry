# Pitlane HQ Pro

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- The subscription stays off (`license_plans.json` → `enforce: false`).
- Pitlane HQ Pro (`cloud/src/lemon.js`, migration 0043, `PRO`/`proGated`/`renderProCard` in index.html): everything is
  free during the beta; when it ends the admin switches Pro on (admin page → Pro, app_state `pro_gate`). Then without Pro
  the experimental overlays close (and never open by themselves) and only `freeApps` (3) of the programs the PC
  starts by itself (Settings → Programs, when Pitlane HQ opens or iRacing starts, `apps.go`) start; the overlays on Auto
  have no limit of their own; admins always have it. Pro is the
  lifetime offer (`lifetime` in license_plans.json: 12 € during the beta, 24 € after, paid once) bought with Stripe
  (Managed Payments, Stripe is the merchant of record; `cloud/src/stripe.js`): `lifetime.buy` is a Stripe Payment Link,
  which the apps open with `client_reference_id` (the account id) and `prefilled_email`; Stripe calls POST
  `/stripe/webhook` signed with STRIPE_WEBHOOK_SECRET (no Stripe API key on the server). A paid one-off payment is the
  lifetime and a full refund (`charge.refunded`) takes it away; a subscription gives Pro until its paid period ends plus
  3 days (`customer.subscription.*`, 35 days after the checkout until Stripe sends the period), and a cancelled one keeps
  it until then. A subscription or refund never takes away a lifetime or a Pro given by hand (`setPro` in prostore.js).
  Lemon Squeezy (`lemon.js`, POST `/lemonsqueezy/webhook`, LEMONSQUEEZY_WEBHOOK_SECRET) still works for what was bought
  there; `provider` in license_plans.json says which one the admin page checks. A buyer without an account gets Pro
  when they sign up with that email (pro_orders). Pro can also be given by hand on the admin page. Donations: Patreon, and a Stripe Support link beside it (`donate.buy` in license_plans.json, `donateUrl()` in index.html, on the About panel's Support box, the Account card and the inbox's Support item; PC and web only, since the phone stores do not allow outside payments). A Stripe donation (client_reference_id `support-<account id>`, or the session's payment_link equal to `donate.link`) gives the ♥ Supporter badge (supporter_src 'stripe'), never Pro, and a donor without an account gets it when they sign up. No Pro, subscription or lifetime is sold while Pitlane HQ is in beta (the owner's choice). The Account card is hidden for now
  (`PRO_CARD_ON` false in index.html) until the owner says otherwise.
  Pro limits only the PC (its experimental overlays and the programs it starts); the web and the phones only receive and always have
  everything. Pro lives on one PC at a time (`pcid.go`: a hash of Windows' MachineGuid, sent as `?pc=` on `/community/pro`
  and `/account/me`; `pro_pc` on the account, `proHere` in lemon.js): the first PC that asks takes it, another PC of the
  account is told where it is and offers "Move to this PC" (`/community/pro/pc`; the other PC goes back to free). The
  Auto list goes with the account and is never trimmed: the agent opens only what this PC may (`proAutoList`: the
  basic overlays; `proAppsAllowed`: the first 3 programs of the list), and the app asks for Pro on a fourth program.

- PRO badges (`proB()` in index.html, `ProBadge` on the phones): a small amber PRO on what will be part of Pro when the
  beta ends, while it is free for everyone: the coach plan chip on the map, "Compare with the community" (and the
  phones' next level, record and friend references), corner consistency, offs explained, race fuel, More charts, Ask
  the coach and the experimental overlays. Pressing one says it is free during the beta and part of Pro after it. The
  sign-up form, the Support box and its inbox item say Pitlane HQ is free while it is in beta; so does the Discord
  bot's /help, whose commands are all free, always.
