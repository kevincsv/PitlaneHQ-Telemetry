# Real data, demo data and the landing page

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- Real data by default: no demo races, sample drivers or made-up laps on the server. Invented data
  only behind Settings → About → Demo data, which only admins see (web/PC: pitwall-demo.js; phone
  apps: Settings → Admin), never uploaded, with a banner on every screen. The `-demo` flag of
  PitlaneHQ.exe is for development only and has no button in the app. The one exception is the web's visitor
  (`web/dist/pitwall-tour.js`, COMPANION and not signed in): the landing, the "Boxes" design 1 (the owner's choice,
  built exactly as its mockup). The app header carries real buttons (Pricing, which scrolls to the Pricing section, Records, Leagues, the language, Downloads in
  amber; at phone width only their icons, the version badge hidden). The hero is the tagline ("Telemetry, coach and
  overlays for your laps", the eyebrow "iRacing · Le Mans Ultimate (beta)"), one sentence, Create account, Download for
  Windows, Android, the Microsoft Store (a link to its listing, apps.microsoft.com/detail/9P3642QCS9ZG, `MS_STORE` in
  pitwall-tour.js, downloads.js and index.html, also on `/downloads` beside the Windows download and in the app's
  Download grid) and a Steam "Coming soon" badge that is not a link (no date) and "Run an iRacing or LMU league? Post it for free", beside the "me" view's own sign-in (or create
  account) panel moved there as a card (`#tour` after `#meBody`, mounted by `signWall` while the wall is up; its title
  and welcome hidden). Under it "See it from the inside": one app window in a Windows 11 frame (its icon and name,
  minimise, maximise, close; never a browser bar or an address) with tabs on its left that change what it shows (Coach,
  Analyzer, Races, Your laps and Leaderboards are screenshots, `landing/<lang>/*.jpg`; Live telemetry is a canvas that
  plays two real laps of the owner's account in a loop, `landing/live-lap.json` (Super Formula SF23 at Spa, lap 5 against
  the lap before, one row every 10 m), with the speed, pedals, wheel and G cards over the live lap comparison and no
  driver's name); "The most active leagues right now", the three first of `/community/leagues/found` (the section shows
  once they are there), with "See every league" and "Post your league for free"; "Over the game", the overlays as the
  agent draws them (`landing/<lang>/ov-*.png`: the default design's from `OV_LANG=<lang> OV_STYLE_DIR=dir go test -run
  'TestOverlayStylesDraw$' .`, the older ones from `ovSavePNG`) with four chips and one line naming the rest; "Pricing" (`#pricing`, "Free while it is in beta"), two cards modelled on a usual pricing page, Free ($0 forever, what is always free, Create account) and Pro ($0 during the beta with a "Free in beta" tag, what Pro will hold in `docs/spec/pro.md`, and "After the beta $6 a month or $59 a year"), and under them the Supporters card (the owner's offer for whoever supports during the beta: Pro at 50% for as long as they keep it, $3 a month or $29.50 a year, kept if they come back within two months of stopping, and the chance to buy Pro for life for $29.99 within two months of the beta ending, from $1) with the Stripe Support button (`donateUrl()`, not in the Steam app); "Three
  steps"; the footer. No community numbers on it (too few yet, the owner's choice). The screenshots are the app with
  its demo data, without the demo badge and with plausible names (never the owner's). "Create account" scrolls to the
  form at the top; a visitor never enters the app on invented data (`sampleOn()` is always false). Never on the PC app.
- The light landing (2026-11-15): a visitor's "/" (no query, or only utm_*, ref, fbclid, gclid, msclkid) is not the
  2 MB app but the same landing made light by the server (`cloud/src/landing.js`): `web/dist/landing.html` (made by
  `node tools/landing-build.js` from the app as a visitor sees it: the html/body attributes, the header, the donation
  bar's place and the sign-in panel in the three languages) filled with index.html's head, every style of the app and
  its <noscript>, `pitwall-landing.js` and `pitwall-tour.js`, so it always looks like the app it opens. Run the build
  again when the header or the sign-in panel change (the styles, head and tour follow by themselves).
  `pitwall-landing.js` gives the tour what it reads from the app (COMPANION, LANG, `donateUrl()`, the language window
  the first time and from the header) and draws the donation bar as the app does (pw.donHide). Anything that needs the
  app opens it at `/app` (index.html, the web app's address): a click or tap in the sign-in panel (its field or button
  then opens there, `pw.landAuth`, read by pitwall-tour.js), "Create account", "Post your league", "Send feedback".
  Someone signed in on that browser (pw.sec.account) or an address with a #section goes to `/app` before anything
  shows. "/" with the app's own parameters (a sign-in coming back, a league, ?embed) is still the app, and the
  service worker keeps the landing and the app apart (`sw.js`). Lighthouse on a phone, 62 → 98.
