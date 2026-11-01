# Sync, accounts and encryption

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- What is encrypted how (for us, never said in the apps): the account (settings, race summaries, notes, ratings) is
  end-to-end encrypted with the password's key, except that the server keeps a copy of the data key (and the account's
  email) sealed with its own secret (DATA_KEY, `escrow` on the account, migration 0064, `cloud/src/escrow.js`) so Steam and
  Discord sign in without the password (the owner's choice). Every device (web, PC agent,
  phones) uploads it once after a sync that opened the account (POST /account/escrow, `cpEscrow`, `plEscrowUp`,
  `escrowUp`) while the server says it has none (`escrow` on the sign-in and /account/me); a Steam or Discord sign-in (and
  its 2FA step) answers `dataKey` and `email`, and only without a copy (`needKey`), or when the copy does not open the
  account, the password is asked once as before and that key goes up instead. A password reset with a new key clears the
  copy, a password change keeps it, deleting the account deletes it; the laps' telemetry is stored sealed on the
  server (DATA_KEY), which opens it to teach the model and share the fastest laps; live telemetry with a code is
  end-to-end. The analysis of your laps runs on your device.
- Signing in with an email that has no account says so and offers to create it (`no_account`).
- Steam, Discord and Google (the owner's choice, Oct 31): "Continue with …" on the sign-in screen of every device, and above the "Create an account" form of the web and the PC (the phones send "Create an account" to the web). When
  that Steam, Discord or Google account has no Pitlane HQ account yet, it is made at once with no form (`quick` on POST
  /account/register, `quickRegister` in `accounts.js`): no password (`auth_hash` ''), the public name the sign-in gave
  (made free with a number, `freeName`), the server makes the data key and keeps it sealed (escrow, so DATA_KEY is
  needed; without it the server answers `no_quick` and the form shows), and Google's verified email is the account's
  email (Steam and Discord give none). Such an account (`noPassword`) signs in only with them: the email sign-in answers
  `social_only`, Account shows no password or two-step card, deleting it and linking or unlinking Steam or Discord take
  a yes instead of the password, and the last way it signs in with cannot be unlinked (`last_way`). "Continue with
  Google" (`cloud/src/google.js`, migration 0083; secrets GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, redirect
  https://pitlanehq.app/google/oauth) also signs in to the account whose email is that Google's verified email, links
  it and counts the email as confirmed.
  Google is switched off for now (the owner's choice, Oct 31, so the owner's email is not on Google's sign-in screen):
  no Google button on any device (`GOOG_OFF` in index.html, `GOOGLE_ON` in the phones' code) and the server answers 503
  unless the worker has GOOGLE_ON="1". Steam and Discord one-tap accounts stay.
- Confirm your email (the owner's choice, Oct 31, design A): an account made with the form is signed in at once, but
  every device shows only the "Confirm your email" screen (`emailGate` in index.html; the phones' own) until the link is
  opened: Open Gmail (or the mail of that address), Send it again once a minute, Wrong email? (that account is deleted
  and the form comes back), Sign out, and it goes on by itself (it asks every few seconds). The server gives these apps
  (`gate` on the sign-up and sign-ins) a gated session that only reads /account/me, sends the link again, signs out or
  deletes the account; elsewhere it stands for nobody, and the PC uploads nothing, until the email is confirmed. Older
  apps keep the old answer (confirm first, then sign in).
- Sync is automatic and covers everything in the account: every app reads the account when it starts,
  when it comes back to the screen and every minute (the PC also a few seconds after any change), and
  changes from several devices are merged (`syncmerge.go`), never a "which copy" question. The moment any device
  uploads the account (`/sync` PUT), the server nudges the account's live room (`{ctl:"sync", version}` to the PC
  and the screens in it, `live.js`): the PC syncs at once (`kickSyncFrom`, never for its own upload), the web
  companion reads the account again (`CP.refresh`) and so do the phones, which keep the live room open as presence
  (the `idle` role, nothing sent) on every screen while the app is on the screen (`startPresence`/`syncNudges` on
  Android, `Live.startPresence`/`Account.nudged` on iOS; Telemetry takes the link over while it is on screen), so a
  change on any device is on every other one in seconds. When the server
  answers "signed out" to the PC's token (`plSessionEnded`), the PC signs out by itself keeping the email and
  shows the sign-in screen with a note; a wrong password never signs it out. My account has "Sign out on this
  PC" and says when the PC could not sync; it shows no sync card (no last sync, no version) on any device (the PC's
  "My laps" has only "See my laps on the web" and the note that every lap is uploaded by itself). Nobody syncs by hand: no "Sync now" button and no switch to turn the sync
  or the lap upload off anywhere (PC, web, Pitlane HQ Desktop, phones); the sync and the laps always go up while signed in. The old
  "Keep my laps in my account" switch is gone: a PC that had it off uploads again (its `noLaps` is ignored and the synced prefs always say
  `lapsToAccount: true`, so an older PC that reads them turns its switch back on). One
  public name per account: changing it anywhere changes it everywhere, shared laps included.
- Deleting your own account never deletes what the leaderboard shows or what the model learns from:
  those laps stay as an anonymous driver (`deleteAccount` in `cloud/src/accounts.js`); everything
  else of the account goes (its alerts, notification settings and phone tokens too). Only an admin removing an account (abuse) removes its shares (`purgeAccount`).
