# SEO and public pages

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- SEO: index.html has the title, a short plain description (both naming iRacing and Le Mans Ultimate), Open Graph/Twitter
  cards (`og.png`, and `og-es.png`/`og-pt.png` for the Spanish and Portuguese public pages) and JSON-LD (SoftwareApplication,
  WebSite and Organization, never a rating); robots.txt is in web/dist (it lets robots read `/community/leagues/found`,
  which the landing shows). Descriptions are short and plain, never hype. The public pages (`cloud/src/seo.js`, plain HTML,
  English, Spanish and Portuguese, each naming the other two with hreflang (`pt-BR`) and x-default): for iRacing
  /iracing-telemetry, /es/telemetria-iracing and /pt/telemetria-iracing and the overlays (/iracing-overlays,
  /es/overlays-iracing, /pt/overlays-iracing); for Le Mans Ultimate /le-mans-ultimate-telemetry,
  /es/telemetria-le-mans-ultimate, /pt/telemetria-le-mans-ultimate and /le-mans-ultimate-overlays,
  /es/overlays-le-mans-ultimate, /pt/overlays-le-mans-ultimate (short addresses such as /lmu, /lmu-telemetry,
  /lmu-overlays, /lmu-coach go there with 301); the guides (`seo-topics.js`, one page per thing people search for or ask an assistant, such as "Free telemetry for Le Mans Ultimate" and "Where do I lose time in iRacing?", each in
  the three languages, linked at the foot of every public page and in the app's <noscript>: the coach, comparing laps,
  braking points, the racing line, the iRating, the shift beep, telemetry on the phone, free telemetry, the fuel
  calculator /iracing-fuel-calculator (the fuel overlay, which measures each lap; never a form to fill in), and for Le
  Mans Ultimate the coach /le-mans-ultimate-coach, comparing laps /le-mans-ultimate-lap-comparison, braking points
  /le-mans-ultimate-braking-points and virtual energy /le-mans-ultimate-virtual-energy (energy and fuel measured per lap, never
  a form to fill in); the iRacing guides that work in Le Mans Ultimate say so and link its page (its
  guide, its telemetry page or its overlays page), the iRating one stays iRacing only); the overlays pages name the six
  looks and the per-overlay settings; /records, /es/records and /pt/records, one page per car and track (BreadcrumbList; the
  records index an ItemList and a FAQPage; the landings WebSite, Organization, SoftwareApplication and FAQPage; every
  guide and overlays page a SoftwareApplication with its screenshots); Le Mans Ultimate's records
  (/le-mans-ultimate-records, /es/records-le-mans-ultimate, /pt/recordes-le-mans-ultimate, its cars and tracks under
  /records/lmu/<track>-<car>/<slug>, never mixed with iRacing's ids) and leagues (/le-mans-ultimate-leagues,
  /es/ligas-le-mans-ultimate, /pt/ligas-le-mans-ultimate) exist only while there is something to show: else a real 404,
  no link to them and nothing in the sitemap. A league discipline page with fewer than 3 leagues (`LG_MIN`) is shown but
  noindex and left out of the sitemap; league pages carry no ItemList (their leagues are not pages of the site) and the
  app's links from them are nofollow. The pages show the app's screenshots (`landing/<lang>/`, with width and height,
  lazy), keep their whole style inline, load the fonts without blocking (`media="print"` swapped on load), and are
  kept at the edge (Cache API) for their max-age with an ETag (304); the landing's pictures and the og images are cached
  a day. No text on them joins two phrases with a colon, and titles stay near 60 characters, each its own (a record
  page names the game in full, then as "LMU", then not at all while its car and track do not fit, `recTitle`; one
  driver's record says it is the only lap). A Le Mans Ultimate page promises only what the game gives (no pit lane
  limit, the rivals' positions about five times a second), the Le Mans Ultimate pages name the shared guides without
  "iRacing" (`LMU_TOO_H`: the phone, free and shift beep guides), the league pages say their leagues are found on Reddit, and the 404 page has no canonical.
  `cloud/test/seo.test.mjs` draws every page in the three languages and checks the titles, descriptions, canonical,
  hreflang, JSON-LD, links, sitemap and index.html's head and <noscript>. The sitemap carries every language
  (xhtml:link) and a lastmod everywhere (`SEO_DATE` for the pages without data); IndexNow sends every page again when
  SEO_VER changes; the app's "/" has its doctype, no hreflang of its own (it is the brand's page; the landings carry the
  language set) and a <noscript> with crawlable links after an explicit `</head><body>` (never before the head's tags, never
  inside the head, where a browser reads it as text) (one canonical address, 301 for any other such as /index.html, a real
  404 page for any address that does not exist, never the app or the lap viewer with 200; the viewer is noindex), the
  sitemap made by the server, IndexNow once a day. A database read that fails while a public page or the sitemap is
  drawn is tried twice more; if it still fails the answer is a 503 with Retry-After (never cached), never a 404 or a page
  missing its data, so search engines keep the page and come back (`watchDb`, `busy` in seo.js). Record pages whose title
  does not fit 60 characters fall back to one under 70 (`recTitle`), and a description over 160 keeps its first sentence. www.pitlanehq.app is a custom domain of the Worker
  (made by the deploy) that answers 301 to pitlanehq.app.
  AI assistants and AI search: robots.txt shuts no robot out of the public pages (AI crawlers such as GPTBot, ClaudeBot or
  PerplexityBot read them like search engines; the test checks there is never a `Disallow: /`). `/llms.txt` (llmstxt.org,
  Markdown as plain text, noindex) says in plain facts what Pitlane HQ is and lists every English public page with its
  description (Le Mans Ultimate's leagues and records only while they exist), the downloads, the other languages'
  landings and `/llms-full.txt`, every English page's own texts whole; both open with what Pitlane HQ is (`WHAT`) and its
  "Key facts" (`FACTS`: price, games, devices, telemetry, overlays, coach, lap analyzer, races, history, community,
  languages), only what exists and is open to everyone (never anything scrapped, secret, in development or about the
  server), and free only as "free during the beta" beyond what is free now; both are made from the pages' texts, so they never
  say anything the pages do not. No page, JSON-LD or llms.txt names or links the Pitlane HQ Discord community server (the owner's choice, Nov 2026). Every indexed page ends with "What is Pitlane HQ" (`WHAT`, three short paragraphs in its language, the same text
  as the app's <noscript>), and every indexed page carries a WebPage node (its address, name, language and
  `dateModified`, `SEO_DATE` or a record's newest lap); the two landings show "How to start" (four steps, `START`) and carry
  them as HowTo, never on a page where the steps do not show; the SoftwareApplication says `downloadUrl`, the Microsoft Store listing as `installUrl` and `sameAs` (`MS_STORE`
  in `cloud/src/downloads.js`, also linked in every public page's footer, the "What is Pitlane HQ" text, the "How to start"
  steps, "/"'s <noscript> and llms.txt) and
  `isAccessibleForFree`, and index.html's says `softwareVersion` (equal to `appVersion`, checked by `webversion_test.go`), and on the landings its `featureList` is their cards' titles. The robots noted for the admins
  (`noteBot`, `bot_<name>` in app_state) include the AI crawlers.
  Titles, descriptions and texts name the brand as people search it (Pitlane HQ, PitlaneHQ; `alternateName` in the
  JSON-LD) and what it is (iRacing and Le Mans Ultimate telemetry, sim racing telemetry, lap analysis, overlays), plainly,
  never stuffed, never claiming an iPhone app before it is on the App Store; competitors' names only in a question, never a
  claim about them.
  They show the accounts' nicknames (never their iRacing names), or Anonymous (race rivals always).
  A car and track page with fewer than 3 drivers (`REC_MIN`) is shown but noindex and left out of the sitemap; every
  record page shows its drivers, the gap from the record to P10 (or the last place) and its newest lap, and links the
  other cars driven at that track (those with 3 drivers or more). The web's landing shows its screenshots as WebP
  (`landing/<lang>/<name>-1440.webp` and the full size by srcset; the overlays' `ov-*.webp` with their sizes), and
  "/" is the light landing for a visitor (`cloud/src/landing.js`, `docs/spec/landing-and-demo.md`), with index.html's
  own head, JSON-LD and <noscript>, and the web app is at /app (canonical "/"); "/" loads Google Fonts without holding up the first paint (`media="print"`, swapped on load).
  Every file in `web/dist` (the landing's screenshots and laps, the drivers' flags) is one the worker serves (`isAppFile`;
  `seo.test.mjs` checks it), and the landing's header links keep their names on a phone, where only their icons show.
- Le Mans Ultimate first (the owner's choice, Nov 15 2026: more drivers race it, and it is the market to win). "/"'s title,
  description, JSON-LD and <noscript>, `WHAT`, llms.txt and llms-full.txt name Le Mans Ultimate before iRacing; the LMU
  landing's title says "(LMU)" and its FAQ answers lap times by track, an app like Garage 61 (the other app named only in
  the question, the answer only about Pitlane HQ) and setups ("not for now"). Two more LMU guides (`seo-topics.js`): "Is
  there a Garage 61 for Le Mans Ultimate?" (/garage-61-for-le-mans-ultimate, /es/garage-61-para-le-mans-ultimate,
  /pt/garage-61-para-le-mans-ultimate) and multiclass traffic (/le-mans-ultimate-multiclass, /es/multiclase-le-mans-ultimate,
  /pt/multiclasse-le-mans-ultimate).
- Le Mans Ultimate lap times (`lapTimesIndex`, `lapTimesTrack` in seo.js): /le-mans-ultimate-lap-times,
  /es/tiempos-le-mans-ultimate, /pt/tempos-le-mans-ultimate (aliases /lmu-lap-times, /le-mans-ultimate-tracks, /lmu-tracks…)
  list every track with the record of each class (Hypercar, LMP2, LMP3, LMGTE, LMGT3) and its drivers (ItemList, FAQPage);
  each track has `<index>/<track id>-<name>` under the name people search it by (`LT_NAME`: Le Mans, Spa-Francorchamps,
  Portimão…, a second layout of one name keeps the game's name), with each class's top 10 (one lap per driver, race rivals
  Anonymous), the gap to P10, every car (linked to its record page when it has 3 drivers), its corners from the turns
  reference the coach uses (`refFor`, T1… with name, direction and metres from the line) and a FAQ built from the data
  that names only the classes with `REC_MIN` drivers (the record of each, a good lap as P10, how to get your own laps).
  A track with fewer than `REC_MIN` drivers is shown but noindex and left out of the sitemap; the pages exist and are
  linked (footer, the LMU landing's "lap times" table, llms.txt with each track's class records) only while Le Mans
  Ultimate has laps, like its records. IndexNow sends the index and the tracks with new laps.
- `/privacy` (the privacy policy), `/terms` (the terms of service, linked from Google's sign-in screen) and `/delete-account` (how to delete an account, from the app, the web or by email),
  `cloud/src/legal.js`, the addresses Google Play and the App Store ask for: English, Spanish or Portuguese by `?lang=` or
  the browser's language, each with its meta description (its first lines); what is kept, why and for how long, never how it is stored or protected
  (`cloud/test/legal.test.mjs`).

- `/downloads` and `/changelog` (`cloud/src/downloads.js`) carry a full head (canonical, Open Graph and Twitter cards);
  `/downloads` also carries the SoftwareApplication with the version the PCs have now (`version.json`) and the Store
  listing. Steam shows "Coming soon" there and is named only as coming in llms.txt.

- Pricing (`/pricing`, `/es/precios`, `/pt/precos`, aliases `/pro` and `/prices`): Free and Pro, the supporters' offer with the Stripe Support link, FAQ with FAQPage JSON-LD; in the sitemap, IndexNow, llms.txt, every public page's footer and `/downloads`.
