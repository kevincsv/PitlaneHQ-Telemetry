# App stores and distribution

Status as of 2026-11-07.

## Apple App Store and TestFlight

- TestFlight works: `ios.yml` on macos-26 with Xcode 26, archive unsigned, signed at export with the App Store Connect
  API key (secrets in PitlaneHQ-Mobile). Build number = 100 + run number. Bundle com.pitlanehq.ios.
- 0.9.14 was submitted Nov 3. Apple answered Nov 4 with 2.1 Information Needed (a recording and notes). Report/Block
  was built (server `cloud/src/moderation.js`, migration 0097, admin Content → Reports, phones too), server live Nov 4.
  iOS build 392 is on TestFlight with the review notes (`ios/fastlane/review_notes.txt`).
- Waiting on the owner: post a league on production, record the review video (shot list in the project files,
  `app-store/review-recording-shots.md`), attach it and resubmit. Listing doc: `app-store/app-store-listing.md`.
- Review account review@pitlanehq.app (a plain driver, no laps), shared with Google Play.
- Risk: the "beta" wording (guideline 2.2). If Apple rejects for it, make App Store copy without it.
- Android Report/Block is not released yet, and the PC agent's Report/Block needs the next agent build (`placcount.go`).

## Google Play

- Package com.pitlanehq.android, "Pitlane HQ - Live Telemetry", default language en-GB. Spec: PitlaneHQ-Mobile
  `docs/spec/google-play.md`. Release keystore and `PLAY_SERVICE_ACCOUNT_JSON` secrets are set; `play.yml` is on master.
- Build 1291 on internal testing. App content and store listing (EN/ES/PT) done. Closed test (Alpha) set up.
- Waiting on the owner: 12 testers' Gmail addresses, then 12 testers for 14 days before production can be requested.
- People with the old debug-signed APK must uninstall once.
- Instant push is off until `GOOGLE_SERVICES_JSON` and `FCM_SERVICE_ACCOUNT` are set.

## Microsoft Store

- Live since 2026-11-01, Store ID 9P3642QCS9ZG, publisher "Pitlane HQ". Store on 0.9.15.
- 0.9.23 submitted 2026-11-15 (Submission 5, "In certification", publishes by itself when it passes): steps and What's
  new in project files `ms-store/store-update-0.9.23.md`. GitHub's artifact storage is full, so the MSIX comes from
  `/dl/beta/PitlaneHQ-Store-<version>.msix` (a test build puts it there). A Remote Control session never clicks submit
  unless the owner says so in that session.
- IARC Global Rating ID de9e8fc9-f15c-8181-8fe0-3fb852eb6bc1 (reusable on other IARC stores).

## Website installer and Steam

- The website installer stays unsigned: the owner will not pay for signing. Do not suggest it again.
- Steam shows "coming soon" on the downloads page. 1.0 waits for Valve's approval.
