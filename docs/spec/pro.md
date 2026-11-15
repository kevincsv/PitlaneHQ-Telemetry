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
  when they sign up with that email (pro_orders). Pro can also be given by hand on the admin page. Donations: a Stripe Support link, $1 or more (`donate.buy` in license_plans.json, `DONATE_URL`/`donateUrl()` in index.html, on the About panel's Support box, the Account card, the leagues form and the inbox's Support item; PC and web only, since the phone stores do not allow outside payments, and never in the Steam app). Patreon is no longer linked anywhere (the owner's choice), but its webhook still gives the badge to anyone who joins there. A Stripe donation (client_reference_id `support-<account id>`, or the session's payment_link equal to `donate.link`) gives the ♥ Supporter badge (supporter_src 'stripe'), never Pro, and a donor without an account gets it when they sign up. No Pro, subscription or lifetime is sold while Pitlane HQ is in beta (the owner's choice). The Account card is hidden for now
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
  the coach and the experimental overlays. Pressing one opens a small window (`proInfo()`) saying it is free during the beta and part of Pro after it ($6 a month or $59 a year), with See pricing (the public `/pricing` page) and, where donations are offered, the supporters' offer and Support Pitlane HQ (a supporter reads that their 50% is locked in instead). The phones keep their own note without the offer (store rules). The
  sign-up form, the Support box and its inbox item say Pitlane HQ is free while it is in beta; so does the Discord
  bot's /help, whose commands are all free, always.

- Prices after the beta and the supporters' offer (the owner's choice, Nov 1 2026; shown on the landing's Pricing section,
  the public `/pricing` page in `cloud/src/seo.js`, the PRO window, the Support box and the inbox's Support item): Pro $6 a
  month or $59 a year. Whoever supports Pitlane HQ during the beta (the ♥ Supporter badge) keeps Pro at 50% for as long as
  they keep it ($3 a month or $29.50 a year), still if they come back within two months of stopping, and can buy Pro for
  life for $29.99 within two months of the beta ending. A supporter's own profile says "You are a founding supporter. Your
  50% off Pro is locked in." (PC, web and phones). None of it is built into the payments yet.
- The offers for the day Pro is switched on (the owner's choice, Nov 15 2026; `license_plans.json`, `cloud/src/lemon.js`,
  migration 0103; all of it does nothing while the gate is off):
  - Founding supporter needs $3 or more in donations in all (the owner's choice, Nov 15 2026) (`founding.min`, `foundingCheck` adds up the account's
    `pro_orders` of kind 'supporter'; `accounts.founder`). A smaller gift keeps the ♥ Supporter badge without the
    offer. Whoever was a supporter before migration 0103, and Patreon's patrons, are founders. The 50% and the Pro for
    life offer are the founders' (`isFounder()` in index.html, `founder` on /account/me and the sign-in).
  - A new account gets 14 days of Pro (`trialDays`, `trialOnRegister`, `accounts.trial_until`, `proSrc` "trial"), only
    when it is made with Pro switched on, and once per PC (`trial_pcs`: the second account that reports the same PC
    reads `trialUsed` and has no Pro from it). A purchase always wins over the trial. The PRO window says the days left.
  - Switching Pro on gives every account made before that day one month of Pro (`launch.thanksMonths`, `proLaunch`,
    once, app_state `pro_launch`): it goes to the account's banked months (`ref_months`), which start that hour like
    the invites' months.
  - The admin page's Pro panel shows the prices, the trial days, the thanks month, and counts founders and trials.
  - Comparing with the next driver up stays free; the rest of "Compare with the community" is Pro.

- Invite a friend (`cloud/src/referrals.js`, migration 0100, `invite` in license_plans.json, the card at the top of
  Community → Friends on every device, `inviteHTML()` in index.html). Every account has a short code (8 letters and
  digits without 0/O/1/I/L, shown in capitals) and the link https://pitlanehq.app/?ref=invite-<code> (the older links
  with the account id still work). A friend is an invite when they make their account from the link (the first visit
  of that browser, `inviteFollow` in accounts.js), type it in "Invite code (optional)" on the PC and web sign-up form
  (filled in already when the browser came from a link; a code that is nobody's stops the sign-up with "This invite code
  is not valid."; the typed code wins over the link's), or type the code on the card in their account's first 14 days (POST
  `/community/invite/claim`; the PC agent and the phones, where no link was opened); either way the two follow each
  other. Once the friend has used Pitlane HQ on 7 different days (any device, `usage_days` and the sessions they drove)
  with at least one session driven, within 60 days of signing up, and their email is confirmed, both get a month of
  Pro (the hourly job, `refCheck`). Invites count from today, during the beta too: a month earned while everything is
  free is kept (`ref_months`) and starts when the admin switches Pro on; with Pro on it goes on top of the invite Pro
  running (`ref_pro_until`, its own column, so a purchase or a refund never touches it; `proOf` gives proSrc
  "invite"). Abuse: never one's own code, never two drivers inviting each other, only a new account types a code, and
  a friend seen on the same PC (the agent's `?pc=`), install or connection as their inviter (`referral_marks`, hashes
  with the server's secret, kept 90 days) is refused. The card always says so, with Contact support for two people in the same house: Support checks it and an
  admin approves it on the admin page's Pro part (Approve on each refused invite, POST `/community/admin/invites/approve`),
  which gives both their month. An inviter earns at most 12 months a year; their friend still
  gets theirs. The card shows the code, Share your link and Copy code, how many were invited, are in their first week
  and the months earned, each friend's days so far ("4 of 7 days", Month earned, Not counted, Expired), who invited
  you, and the months saved or "Pro until" a date; during the beta it says the months start when Pro launches. The
  admin page's Pro part counts them. Deleting an account removes its waiting invites; a given one stays, under no
  name, for the yearly limit.
