# Coach, lap analyzer and the model

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- One model per car and track (`cloud/src/model.js`, fed to the coach and the lap analyzer by
  `web/dist/pitwall-model.js`): it learns from every real lap it knows (the accounts' laps, shared
  or not; shared laps; the laps of the rivals of your races) and its references are real laps,
  never composites: the record (the fastest lap really driven) and, for your pace, the lap of the
  driver just ahead. It has no panel of its own: the coach shows the record, the next level and
  your pace among the drivers known there, and both views offer its references as lap B; the lap
  list is coloured by it. No second "ideal" or theoretical lap anywhere (the Mini-sectors widget and overlay show the
  current lap against your best only, never a lap made of the best pieces).
  Test drives never teach the model nor go to the leaderboards; the model learns only from practice,
  qualifying and race laps of official series and of sessions against iRacing's AI, whose people are real drivers
  (`ai` on the session and the lap, `hasAI` in journal.go, migration 0035; the bots' laps never go up); hosted and
  league laps still show on the boards.
  The car card (`car_cards`, one per car, `buildCarCard` in model.js, `/community/car`): what a car
  does on every track it was driven on (hardest braking, the speeds the fast drivers shift up at, top
  speed and where), from the model's memory. The coach shows it against lap A only when nobody known
  is ahead on that car and track; the phone apps show it in the lap analysis. It is a hint of what the
  car can do, never a reference lap. The ten-minute job (`rebuildDirty`) builds only what the uploads marked
  (`markModel`, `markCar`); the sweep that adds every car and track with laps but no model runs once a day (03:00 UTC),
  and a car card row is never left dirty after a try (a family badge is built under its family's id).
- The coach and the lap analyzer stay short: the coach is the gap, what to work on first, the plan,
  the map, the sectors and the corners that cost the most; the analyzer is the gap with its three
  key facts (plus the corners against the straights), every corner as a small bar you can press to pin the charts
  and the map at it (`la-corners`; `CornerStrip` on the phones, where a corner is "T3" too), the charts with the reference's corners as bands labelled by the official turns
  (`cmpCornerBands`), the "Line" chart (how far A was to one side of B, + left, `LAPCH.line`), the map, the sectors,
  the lap list and the braking points. On a wide screen the panels sit in columns that each flow on their own, never in rows, so
  a short panel leaves no empty space under it: the coach's corners, map and plan columns (`co-main`, `co-side`, `co-c3`; at two
  columns the pace and plan go under the shorter one, `coachBalance`), and the analyzer's corner consistency, race fuel and more
  charts go one by one under the shorter column (`lapMoreBalance`, `#lapMore` and `#lapMore2`; last on a phone), and the
  charts of a row are as tall as each other. The lap list has a column per sector (S1, S2, S3…: the game's official sectors that add
  up to the lap's time, `lapSecCols`; a session without them has no sector columns, on the phones neither), purple the
  session's best of each among the valid laps, green a valid lap's one better than your best lap's. The braking points are a table of lap A against lap B per corner of
  `coachCompare` in pitwall-analysis.js (`renderBrakeTable`): the turn ("T7"), where A and B brake, Δ m (+ A later; red when A brakes 3 m or more
  before B, muted otherwise), the speed at each apex, the gear at the apex ("3 / 4" when they differ), the time lost and what
  to do (the tip of the phase that loses the most in a few words, without the line tip added after it, `tipMain`/`tipShort` in pitwall-analysis.js, `todo` on the corners the phones get;
  a line tip that replaced a generic one stays); a row pins the charts and the map like the corner bars. The phones' lap
  list and lap analysis show the same. "Take the plan to the coach overlay" takes the turns of the plan's first four steps
  (`turns` on each step of `coachPlan`, `planTurns`), on the phones too when they run the module.
  The corner tips (`coachCompare` in pitwall-analysis.js wherever the app or the phones analyse a lap, `compareLaps` in
  ovnative4.go for the coach overlay; the phones' `corners` in LapMath/Models only as the fallback):
  the phase that loses the most says the tip, and every tip follows the measured facts, never against them: braking
  later than the reference and arriving slower at the apex is one mistake whatever phase pays for it ("brake a little
  earlier and carry the speed"); with the same braking point the tip is about the brake (harder at first, trail, or
  "brake hard at once, then release progressively"), never "brake later"; an apex reached as fast as the reference's
  says the time goes before it (entry) or in a longer slow part (apex); a throttle picked up earlier than the
  reference's but a slower apex says to carry the speed, never "full throttle sooner". A generic tip gives way to
  what the data shows plainly, in this order: the line (inside/outside), the gear at the apex against the reference's,
  throttle lifts after the apex (exit), steering corrections in the corner (wherever both laps carry steering, the phones
  too since they run the same module; never against a model reference, whose points have none). The plan's habit advice (`coachPlan`) takes its direction from the averages over the corners: where
  you brake against the reference, how fast you reach the apex and when you pick up the throttle. The PC's coach overlay
  measures the last lap against the model's next level when it is faster than the session's best, else the best.
- The lap analysis and the coach are one file, `web/dist/pitwall-analysis.js` (`PW_ANALYSIS`, pure JavaScript: no page, no
  storage, no network), run by the web and the PC app (index.html loads it with a relative script tag before its own script
  and calls it through thin wrappers, `anaCtx` hands it the language, units, official turns, `COACH_W`/`COACH_ME` and the
  model's corner cards) and by the phones (Android's JavaScriptSandbox, iOS's JavaScriptCore; they download
  pitlanehq.app/pitwall-analysis.js, served with `no-cache` and its ETag like every app file, keep it on disk and carry a
  copy in the app used until a download succeeds; the mobile repository's `tools/sync-analysis.sh` refreshes that copy). It has the corners and their tips, the plan, the sectors, the line, how
  the lap is driven, the analyzer's key facts and the next level's step (`stepText`), and what the coach learnt
  (`coachOf`: the plan's weights, the metres a braking tip asks for, the kinds turned off); `analyse(A, B, ctx)` gives all
  of it as plain JSON (`v`, the shape's version, 1: the phones run only the version they were built for, and a newer
  shape raises it) with the session's laps in `ctx.laps` for how steady each corner is, so the phones' plan is the PC's. Its
  texts are in English, Spanish and Portuguese (a corner's `tip` is [en, es, pt], `tipTx` on the web). A change there is
  a change on every device at once: `cloud/test/analysis.test.mjs` runs index.html's own functions and the module over
  realistic laps and keeps every answer as it was (`analysis.fixture.json`; a change meant to change them writes it again
  with `--capture web/dist/index.html` and says why in the commit). The Go copies (`compareLaps`, `cornerZones` in
  ovnative4.go, racingline.go) still serve the overlays. `cloud/test/recorded.test.mjs` runs the module over laps the agent's own
  recorder made (`testdata/laprec/laps.json`, written by `TestLapRecorderGolden`) and over laps it may meet in the wild
  (no trace, holes, NaN, null laps in the session, no reference: none may throw; a missing lap is compared with the
  other one). A braking zone (`brakeZones`, the same in pitwall-analysis.js, ovnative4.go and model.js's corner cards)
  ends when the throttle is back over 60 % or when, the brake released, the car gains 2 m/s on its slowest and brakes
  again: two corners close together with a part throttle between them are two corners, never one zone of up to 600 m.
- Ovals get their own coach (`ovalOf`, `liftZones`, the oval tips and `ovalStep` in pitwall-analysis.js; `ovalKind`,
  `liftZones`, `ovalTip` in ovoval.go for the coach overlay). The kind of oval comes from iRacing's
  category (`cat` on the laps and `ctx.track`, which the web takes from the session or, for a lap recorded live, from the
  session the agent reads with its TrackType and length; the phones from their session), never a road layout (Road
  Course, Roval, Infield): "superspeedway" (Daytona, Talladega, or a long oval of 3 km or more the reference takes flat out
  97 % of the lap), "short" (under 1450 m), "mile" (under 2100 m), "intermediate" (the rest) and "dirt" (Dirt
  Oval, or a dirt car on a track with no category). On an oval the corners are the braking zones and the lifts (the
  throttle under 90 % without the brake and the car slowing more than 1.5 m/s), and a corner where lap A lifts and the
  reference stays flat out is a corner too (`flatB`). A corner the reference takes with a lift says what the lift does,
  in this order: "stay flat out" (`oval_flat`), "lift instead of braking" (`oval_no_brake`), lift later (`oval_lift_later`,
  10 m or more before the reference), lift a touch earlier when lifting later costs the middle of the corner
  (`oval_lift_early`), a lighter lift (`oval_lift_less`, 15 points of throttle), back to flat out sooner
  (`oval_back_flat`, 15 m), more speed through the middle of the corner (`oval_center`), and a road tip about the brake
  or the apex becomes "one smooth, lighter lift" (`oval_roll`); a braking corner (short tracks, the miles) keeps the road's
  tips. On dirt the steering corrections are never a tip (the wheel catches the slide) and the line is the groove the
  reference runs through the middle of the corner (`dirt_groove`); on a superspeedway there is no line tip (the pack
  decides it). The plan starts (after a habit) with the oval's own step: its kind with what the lap did against the
  reference (how much flat out, its lifts and braking zones) and how that kind of oval is driven; on a superspeedway
  where both laps are flat out all lap it says the gap is the draft. The habit advice of the entry, the apex and the
  exit and the time outside the corners speak of the lift, the middle of the corner and the run to the wall.
- The plan for the next session (`coachPlan`, the first five steps on every device, `PLAN_SHOW` on the web, the phones the
  same) explains every step in three parts: what happened, measured and where (`what`: the time lost and in which phase,
  where you brake or lift against the reference, the speeds at the slowest point, the throttle, the gear), why it costs
  time (`cost`, said once per family of tip, `COST`/`FAMILY`, with the oval's own for lifts) and what to do instead (`how`,
  with this corner's numbers, `howOf`); `why` is what and cost together for the phones of before. Every step carries its
  points on the map (`marks`, metres from the line: `a` where you brake or lift, `b` the reference's, `apex`, `thr`/`thra`
  where the reference and you pick up the throttle, `str` a straight) and the stretches it is about (`spans`). The coach's
  map (`renderCmpMap(A, B, box, {plan})`, `drawPlanLayer`; `TrackMap` on Android, `TrackMapView` on iOS) shows every
  step's number where it happens and, for the step chosen (the first with points, or the one pressed in the list or on
  the map, "Show on the map"), its stretch, A, B, its corners and the throttle points; the "Plan" switch hides it (and the
  coach rings give way to it). Besides the corners, the phase that repeats, the straights (now named, the two that cost
  the most, "after T4"), the corners taken differently every lap, the habit and the oval's step, the plan has steps about
  the whole lap and the session (`lapSteps`): trail braking over two or more braking corners (`trail`), a car that pushes
  wide (more wheel than the reference and still slower at the apex, `rotate`) or steps out on exit (`loose`), each with
  the setup that helps when it does it everywhere (wedge on an oval), the gears (`gears`), tyres that fade over a run (8
  laps of lap A's session or more, the median of laps 2-4 against the last three, `tyres`) and the usual lap against the
  best (5 laps or more, `pace`, how races are won and how to pass). Dirt has no rotate or loose step and a superspeedway
  no trail step. Every step and the whole plan take 👍/👎 (web, PC and phones; POST `/community/coach/planrate`,
  migration 0084 `coach_plan_votes`, keyed by the step's id and its corners, `planKey`/`PlanItem.key`); from 15 votes a
  step's id, else its kind, weighs 0.8 to 1.2 in everyone's plan (`plan` in GET `/community/coach/weights`,
  `cloud/src/coachplan.js`, `coachOf(ctx).plan`), and the admin panel's Coach tab lists the votes (`stepName`).
- The coach learns from what happens after its tips (`cloud/src/coachtips.js`, migration 0051 `coach_tips`; never an LLM
  and never an outside API). Every tip has a kind (`kind` in `coachCompare`, the same names as the phones' `tip_*` keys:
  brake_later, trail, coast, apex_speed, line_apex…) and every corner a speed class (`cls`: slow, medium, fast at the
  reference's slowest point). When the coach shows a lap (web and PC, `coachReport`), its tips go to the account once per
  lap and reference (POST `/community/coach/tips`) with the time the session's best lap spent in every corner (`tbest`);
  the driver's next session on that car and track answers them (`outcome`, seconds gained in the same corner, matched by
  its slowest point within 60 m). Every tip card has 👍/👎 (the vote you gave shows green, or red for 👎; web, PC and phones, POST `/community/coach/rate`, `TIPRATE` on
  the web, `tipRatings` on the phones). The drivers see none of the counts. The admin panel's Coach tab shows the buckets
  (kind × speed, cases, how many gained, the thumbs). From 30 answered cases a bucket's share of gains reorders the plan
  (`w` from GET `/community/coach/weights`, `coachOf` in pitwall-analysis.js, 0.7 to 1.3, and 15 % less for a kind the drivers
  mostly thumb down); the tips' texts never change by themselves and no lap is made of this. The corner card
  (`cornerCard` in model.js, `corners` in the model, MODEL_VERSION 8 and up): for every braking zone of the record lap, the range
  of braking points and of speeds at the slowest point among the fastest drivers here (one lap each, the fastest 30 %, 3 to
  12), shown under the tip as one line ("The fast drivers here brake between 312 and 328 m and pass the apex at
  112–118 km/h (6 drivers)", `cornerHint` in pitwall-model.js, `CornerCard` on the phones): a hint, never a reference lap.
  How the coach keeps learning (migration 0053), all of it counts over real laps, never an LLM: the metres a braking tip
  asks for are what the drivers who gained really moved their braking by (`dd`/`ddn` on the tips, `ask` per bucket from 10
  gains, `coachOf` in pitwall-analysis.js, never more than the gap seen); the driver's own memory (`/community/coach/me`: the kinds that
  repeat on 3 or more of their tracks are habits, shown first in the plan and on the phones, and their own buckets weigh
  from 10 cases, `COACH_ME`); the step to the next level (`levelStep` in model.js, `step` on every ladder entry: the
  corners where the laps just slower than that reference lose to it, "the drivers at your pace make the step in T4 and
  T9" under the Next level card); each corner's difficulty (`spread` of the drivers' corner times, weighing the plan with
  `dif`); laps in traffic (a car within a second ahead for a fifth of the lap, `traffic` in `Trace.f`, the agent checks
  twice a second), on cold tyres (the first lap of a run, `cold`) or on a wet track (`wet`, TrackWetness at 4 or more,
  lightly wet on iRacing's scale, at any point of the lap, "wet track" on the web) are tagged on the web (`lapOptText`;
  a damp track, `damp`, says "damp track" and a lap in the rain, `rain`, "rain", and neither is a disturbance),
  never the coach's default lap A (`lapClean`) and, traffic and wet, never the model's (`goodLap`; a cold lap is the
  driver's own); the tyre compound travels as `cmp:<n>` in `Trace.f` when the car has several (PlayerTireCompound over
  0, the value at the lap's end), shown nowhere and no disturbance for the coach's default lap; a corner taken
  differently every lap (its spread over twice its loss) hears
  "the same braking point every lap" first (kind `cons`); the corner card by track temperature band (cold under 25 °C,
  hot over 35, `bands`, `model_laps.temp`) when a band has enough laps, and the fast drivers' line at the apex against
  the record's (`lineRanges`, `line` on the corner, a range never a composite); a tip may say how many drivers it helped
  on corners like it only when the admin turns it on (Coach tab, `coach_confidence`); an admin turns a kind off for
  corners of one speed (`coach_off`, `off` in /coach/weights: web, PC and phones say the phase's plain tip instead).
- The model (`cloud/src/model.js`, see `MODEL_VERSION` there) learns clean traces only (a speed jump over 10 m/s between two
  points is a glitch), never a lap in traffic or on a wet track (`goodLap`: a wet lap teaches braking points of another
  track state) and marks a rival's lap (`field`: pedals and gears estimated from its speed against what that car really does at each speed, full-throttle acceleration, slowing with no pedal and full-brake deceleration learnt from the real laps of the car on any track, `pedals` in the car card, `cloud/src/pedals.js`, partial throttle and brake, never only 0 or 100 %; served that way by the model and `/community/laps/:id`); the next level prefers a
  lap with real pedals, and `idealField` says when the record is a rival's. A rival's lap whose pedals the game itself
  gave (Le Mans Ultimate's telemetry of the other cars, `Trace.src` "real" from field.go, kept as such by POST `/laps`)
  is a real lap: the model and `/community/laps/:id` estimate pedals only over src "field". It is "real" only when its
  pedals move (the throttle to half and the brake to a fifth at least; still or missing pedals are estimated), it keeps
  its src in `model_laps` and it never teaches the car card what the car does at each speed (`rival` in `goodLap`: no
  pedals' envelope, no shift speeds), its speed coming from its position. A rival's lap on a wet track carries `wet` too.
  Tyre compounds are never mixed in a reference: the memory keeps every lap's compound (`model_laps.cmp`, migration
  0066, `lapCompound`: the lap's `cmp:<n>`, 0 for an account's lap without it, -1 for a rival's whose tyres nobody
  knows), and when a car and track have laps on several compounds each one with 5 laps or more from 3 drivers or more
  (`CMP_MIN`, `CMP_DRIVERS`) gets its own record,
  next levels and corner card (`byCmp`, `compoundsOf`, `refsOf`); the model of every lap stays the default. A client
  asks for the compound of its lap A (`cmp` on `/community/model`, `forCompound`; `cmpOf` in pitwall-model.js, the
  phones' `Trace.cmp`, the PC's coach and braking overlays and the app's live compare and Braking markers widget by
  PlayerTireCompound, `liveCmp`, which the laps recorded live keep as `cmp`) and gets that compound's references
  when the model has them, else every lap's; `cmps` lists the compounds it has apart. The pace among the drivers
  (`times`) is every lap's.

- **By discipline.** What the coach learns across tracks is kept apart by discipline (`groupOf`/`groupFor` in
  categories.js, `catGroup` in pitwall-analysis.js, migration 0087 `cat` on `coach_tips` and `coach_plan_votes`): oval,
  dirt oval, dirt road, and road (sports and formula cars together, every other game road). The apps send the group of
  their laps (`cat` on POST `/coach/tips`, `/coach/rate`, `/coach/planrate`; the web's `coachCat`, the phones' `coachCat`
  from the session's category) and ask for it (`?cat=` on GET `/coach/weights` and `/coach/me`). A tip's bucket weighs by
  the group's own cases once it has `MIN_CASES` (its thumbs from `MIN_RATINGS`, a braking tip's metres from `MIN_ASK`
  gains), else by every group's together (`cat` on the bucket says which); a plan step's votes the same from
  `MIN_PLAN_VOTES` (`planWeightsFor`). The driver's habits are the group's when they have some (`cat` on the habit), else
  the habits of every track that are about the pedals and the speed (`TRANSFER`: braking, trail, coasting, the throttle,
  the speeds); their own weights and corner types (`byCls`) the group's, else every track's. An app of before asks
  without `cat` and gets every group together. Older rows get their group from the season and their session's category
  (`fillCats`, hourly). The model, the corner cards and the track guide were always one car and track (iRacing's oval and
  road layouts of a track are two tracks).
- **From other tracks** (`likeOf`/`likeSteps` in pitwall-analysis.js, GET `/community/like`, `likeFor` in model.js): a
  corner of lap A with no corner card of its own (the track has fewer than 3 fast drivers of this car, or none) hears what
  the fast drivers of this car do in corners like it on its other tracks of the same surface (dirt or not). The car card
  keeps them (CARD_VERSION 3, `cz` from `cornerSamples`: every braking zone and lift of the laps within 3 % of each
  track's fastest, its speed in, slowest speed, metres to the slowest point, gear and most steering; never sent with
  `/model` or `/car`). The same speed in and the same slowest speed (6 %) say the metres of braking they need ("brake
  later and harder" when lap A takes 25 % and 12 m more) and their gear there; the same speed in and the same steering
  (20 %) say how fast they go through ("carry more speed" from 4 km/h, only when those corners agree within 15 %). Four
  corners from two tracks at least. On an oval the car's own ovals of that kind (`ot`, `ovalProfile`: the share of the lap
  flat out and of the turns taken with a lift) say how much of the lap they are flat out and whether they lift where lap
  A braked; a car that never drove that kind of oval gets every car's (`buildOvalKinds`, daily, `app_state` coach_ovals,
  3 car-tracks from 2 cars). So the first driver on an oval still gets a plan. The coach shows them as "From other
  tracks" (a section on the web and PC, the phones' notes) and as plan steps (`like:brake`, `like:apex`, `like:gear`,
  `like:oval`, two corners at most); once the track has its own corner cards those corners speak instead. Hints, never a
  reference lap.

## How the coach learns from every session (coachlearn.js, migration 0088)

- **The server's own coach** (`shadowRun`, every ten minutes, newest sessions first and back through 180 days): for every
  session of an account or of a PC without one (`dev:` sessions, `docs/spec/sync-and-accounts.md`; official or against the AI, never a test drive) nobody opened the coach on, it runs the module's
  `coachCompare` over the session's best whole lap against the model's next level for that time (else the record) and keeps
  what it would have said (`coach_tips` with `src` 'auto'; `coach_shadow` marks the sessions gone over). Those tips are never
  shown and never answer `/coach/last`; when the driver opens the coach on that session, what they saw replaces them
  (`src` 'app').
- **Every tip answered by the server** (`answerRun`): the driver's next session on that car and track (60 days at most) with a
  whole lap answers every tip without an outcome, the same stretch (50 m before the reference's braking point to 150 m after
  its slowest point, `winTime`) of its best lap against the session's best (`tbest`). A tip with no later session yet is looked
  at again a day later (`looked`). The apps' own answer (POST `/coach/tips`) still comes first when they get there first.
- **What a tip is worth** (`upliftOf`): the share of a corner's lost time won back next time (`recOf`, -1 to 1.5) after the tip
  the driver saw, against the share won back where only the server's coach spoke (the same kind on corners of that speed,
  towards every kind there while it has few cases). `weightOf(b, ratings, prior)` (coachlearn.js, re-exported by
  coachtips.js): 1 + that difference (±0.3), moved towards from the prior (1, or a wider group's weight) as the cases come,
  half way at `SHRINK` (15) cases, 0.7 to 1.3; without a baseline, the share of drivers who gained. A driver's own bucket
  weighs from their third case, against everyone's weight as its prior. The plan's votes the same way (`planWeights(votes,
  prior)`, half way at `PLAN_SHRINK` 8 votes, a step's id starting from its kind's weight). The admin's Coach tab shows the
  tips the server's coach found, "Beyond the baseline" per bucket and every weight. `MIN_CASES` (30) is only when a tip may
  say how many drivers it helped.
- **Your corners over time** (GET `/community/coach/progress?trackId&carId&before`, `progressRoute`): the best whole lap of the
  driver's last 8 sessions here (test drives too: it is their own progress) measured in the stretches of the newest session's
  corners (`progressOf`: `better`/`worse` from 0.05 s, `stuck` after 3 sessions or more no faster while the corner still
  loses to the reference), and the tips they saw here with what came of each (`tried`). The module's `progressLines` makes
  "Your corners over time" (the worse and stuck first, six at most; `progress` in `analyse` and its notes), shown in the
  coach on every device.
- **Another approach** (`failedOf` in the module, `ctx.progress.tried`): when the two latest times the driver saw a kind of
  tip in a corner (within 60 m) gained nothing, `coachCompare` gives the tip of the next phase that loses time there (0.02 s or
  more) instead, and the corner carries `alt` (the kind it replaced). Without `ctx.progress` nothing changes.

## Beyond one lap against another

- **Track guide** (`trackGuide` in pitwall-analysis.js, from the model): every corner with where the fast drivers brake
  (`b0`–`b1`), the gear they take the apex in (the corner card's `g`, real laps only), the apex speed, how hard it is
  (its `spread` against the hardest corner), the most common tip there (`mistake`, set in `buildModel` from `coach_tips`
  when 3 accounts or more got it) and what the drivers who improved found there (`improve`). `brief` is the three corners
  that matter most. It needs no lap of the driver's own: the coach shows it under the plan, the track page has a "Track
  guide" button per car (the phones' car and track board too), Home shows the brief while the agent sees a session
  (`homeBriefHTML`), and the coach overlay calls it on the first laps (overlays.md).
- **Your last session's plan** (`followUp`): GET `/community/coach/last` gives the tips of the driver's last session on
  this car and track before this one; each corner that lost time then says whether this lap is faster there than that
  session's best lap (✓), slower (✗) or the same, and what it still loses to the reference.
- **Strengths and weaknesses**: `cornerRanks` places lap A's time in every corner among every driver the model knows
  (`ranks`, `cornerRanksOf`: "top 20 %"), and `clsLines` the driver's slow, medium and fast corners across their tracks
  (`byCls` of `/community/coach/me`, 5 corners or more).
- **Drivers who improved** (`progressPairs`, `improveSteps`): the same driver's two laps here at least 0.3 % apart, compared
  corner by corner; where 3 drivers or more found time is the model's `improve`.
- **Conditions**: the model keeps a ladder per track-temperature band (`bandsOf`, `byBand`, 5 laps from 3 drivers per band)
  and `/community/model?temp=` picks the band of the session's track temperature (`forCompound`).
- **Estimated pedals**: when lap B's pedals are estimated from its speed (a rival's lap, `est`/`field`, or `ctx.estB`),
  `coachCompare` never says brake-shape, trail, coasting, throttle or gear tips (`estOf`): `brake_speed` says the speed
  instead, and the plan's steps follow.
- **Track left unused** (`edgeUse`): on each corner's exit (30 to 150 m after the apex) how far lap A stayed from the
  outside edge the drivers' laps give (`/community/trackmaps` `edges`, tracks-and-maps.md); 1.5 m or more is said, three
  corners at most. Both laps need the game's position.
- **Race pace** (`racePace`): a race report's laps against the cars that finished up to 3 places either side (their `pace`,
  every lap the agent saw them time, field.go `fieldPace`). Clean laps only (not the first, pits, off track, or 3 % over
  the median), each car's average, spread and gap a lap over the race and its second half, and the lines that matter
  (who was faster in the second half, your pace dropping more than theirs, your spread). The race summary shows it on
  every device.
- **The phones** read all of it from the module's `notes` (`notesOf`: the last session's plan, strengths and weaknesses,
  the track left unused, the track guide as plain titled lists) and call `racePace` and `trackGuide` (`guideItems`) the
  same way.
- **The thresholds on real laps**: Admin → Coach → "The coach on real laps" (GET `/community/admin/coach/calibrate`,
  coachcalib.js) runs the coach over the busiest cars and tracks' model laps and shows how often each tip and step fires.
  On a superspeedway a race lap in traffic can be lap A by default.
- **Ask the coach** (in development: testers, and admins with admin mode on, every device): an AI chat about the lap
  pair on screen with the driver's own API key, Anthropic (Claude Haiku 5.5 by default, Sonnet 5.5, Opus 5.5), OpenAI or
  Google Gemini. `web/dist/pitwall-aicoach.js` (`PW_AICOACH`, pure like the analysis module; the phones carry a copy beside
  `pitwall-analysis.js`, `tools/sync-analysis.sh`) builds everything sent and reads the answers: `context` (the gap,
  sectors, every corner with its tip, the plan, phases, how the lap is driven, the session's lap times), `system` (the
  instructions in the app's language, then the laps), `question` (the driver's words, then the raw traces every 10 m of
  the corners the question names, `turnsIn`, "T3", "turn 3", "curva 3"; on the first question the two that cost the most:
  speed, throttle, brake, gear for A and B and the time gained or lost), `request`/`parse` per provider, `modelsRequest`/
  `parseModels` for the Test button. Who is who: the driver's own name (the account's public name, never when Anonymous),
  lap B as what it is (your lap N, the record P1, the next level, a community lap as its position, Px of the drivers known),
  never another driver's name. The newest 12 turns go; Anthropic gets effort low and the system prompt cached.
  - The key never reaches the Pitlane HQ server nor the account's sync. PC app: the agent keeps it (`aicoach.go`,
    ai-coach.json in the data folder sealed with DPAPI, only the last four characters handed back) and makes the
    request (`/api/aicoach/config`, `/api/aicoach/send`, this PC's page only: loopback, JSON, no other site's Origin; only
    the three providers' addresses). Web: this browser only, sealed with AES-GCM under a non-extractable
    CryptoKey the browser made (IndexedDB `pwai`, `aiKeyGet`/`aiKeySet`); never in localStorage or sessionStorage (an older
    plain copy there is sealed and removed); without "Remember on this browser" (or without WebCrypto) it lives in the
    page's memory only. The request goes straight to the provider. Every device says under the key "Set a monthly spend
    limit on your AI account." Phones: Android Keystore (`pitlane-ai`
    preferences) and the iOS Keychain (`com.pitlanehq.ai`), the request from the phone.
  - Where: web and PC, under the coach's gap ("Ask the coach", chips, a box, New chat) and Settings → General → AI coach
    (provider, key, model, Test lists the models the key can use, Remove key, Get a key). Phones: under the coach's gap
    and Account → AI coach. No key: "Add your API key" opens the settings. The coach's learning never reads the AI's
    answers.

## Watch in replay (in development: testers, admins in admin mode)

- Every live iRacing lap carries the session time it started at (`trace.st`, `startS` in cloud.go). The coach's corners
  and the offs explained get "▶ Replay" (`replayBtn`/`replayGo` in index.html) while iRacing runs on the PC (GET
  `/api/replay`, replay.go): it asks iRacing to seek its replay to 3 s before that moment of the lap and play it
  (`irBroadcast`, ReplaySearchSessionTime then ReplaySetPlaySpeed, replay_windows.go). From the web or a phone it goes
  to the PC through the live link ("replay", liverelay.go). The session number is the end of the session id
  (`ir-…-2`). It works while the session is open in iRacing or its saved replay is loaded; laps recorded before have
  no start time and no button.

