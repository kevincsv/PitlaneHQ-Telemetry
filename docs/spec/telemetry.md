# Telemetry screen, rev beep, voice chat and live link

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- The rev beep (Telemetry → Car & tools → Rev beep, `v-revbeep`, `renderShiftPanel`/`shiftTick`, `pw.shift`;
  on Pitlane HQ Desktop the "REV BEEP" card at the top of Telemetry opens it): a beep to change up at the revs the driver chooses, kept per car: "Every gear
  at" one RPM, or one for each gear ("My RPM"), or iRacing's shift lights, or the estimate from their own flat-out laps;
  a moment early for the reaction time, pitch and volume, "Beeps in this screen" (the PC by default). No braking beeps
  any more (they did not work well): the Braking markers widget and overlay only show where to brake. There is no voice
  engineer, spotter, radio or audio packs anywhere any more (the owner's choice): the PC never speaks and the only
  sound it makes by itself is the rev beep. The one exception is the voice chat, for every driver signed in (the owner's choice, Oct 31) (`voice.go`, `VOICE`/
  `voiceIn` in index.html, `/voice/ice` in voiceice.js): a person talking to the driver, never a computer voice. A WebRTC
  call (Opus at 32 kbps at most, nothing sent while nobody talks (DTX, `voiceSdp`), no extra jitter buffer, echo and
  noise cancelled; TURN only when the two cannot reach each other directly) between the driver's PC (the app's page; it answers by
  itself, the driver is driving) and whoever watches it live (a device of the account the PC accepted, or anyone with its
  share code): "Talk to the driver" shows for them while the PC is live and signed in to any account (`voiceOn`), so anyone watching a driver live, with the driver's own devices or a share code, can talk to them. The call's
  messages go through the live room sealed like the telemetry (the agent passes them between the room and the page, and
  one window of the PC answers each call); the voice goes straight between the two. STUN by default, Cloudflare TURN
  when the server has TURN_KEY_ID and TURN_KEY_TOKEN; none in local mode. The bar (who, time, Mute, Hang up) stays above
  every window. Both PC windows let the app's own page use the microphone (Pitlane HQ Desktop's PermissionRequested for
  loopback; the agent's window through go-webview2, patched in vendor/ to read the permission's kind and allow the
  microphone: keep the patch if the library is vendored again). Settings → Phone & sharing has "Voice chat" with "Test the microphone"
  for every signed-in driver, and "Voice volume" and "Microphone" sliders, 0 to 300%, kept on each device (`VOICE_VOL`,
  `pw.voice`; the owner asked for more than 100% because the game can drown the voice). The call's bar has the same two
  behind its volume button, on both sides, and they change the call at once: up to 100% the <audio> plays the voice, above
  it Web Audio boosts it through a limiter (`voiceOutApply`); the microphone goes through a gain and a limiter whenever it
  is not at 100% (`voiceMicApply`, `replaceTrack`), and the microphone test shows it with that gain. A microphone that fails says why (`voiceMicError`: Windows' privacy switch, none found, in use). Web and PC only, phone browsers too (the owner's choice: the Android and iOS apps do not have it). Their braking
  points come from the model (the next level for your best lap of the session; your own best lap while the model has
  none or you are its fastest), each marker moves with your speed against that lap and with a car close ahead or
  alongside, and they name their corners by the official turns (`turnNo`, `turnName`), like the coach: "T7", never "C7".
- Telemetry's sub-tabs (the owner's choice 2026-11-16, design A, `renderSubtabs`): Dashboard, Lap compare, Standings,
  Team (Beta), Tyres, then one "Car & tools" menu (`TOOLS_V`, `stMenuOpen`: Rev beep, Setups when it exists, Phone &
  sharing on the PC) that names the tool open in it ("Car & tools · Rev beep"). Dashboard and Lap compare are both the
  Telemetry screen: Lap compare is `LIVE_MODE` "cmp", Dashboard brings back the view the driver had (`pw.liveDash`,
  `liveSetMode`). On the Dashboard the view switch is Essentials · Engineer · All panels (Basic, Engineer and Full in the
  code) with "Edit layout" beside it; Lap compare hides both.
- Telemetry has four modes (`LIVE_MODE`, `liveModeBar`): Basic (Essentials, below), Engineer (below), Full (All panels: every basic widget, the
  experimental ones too (not on a PC without Pro), and the lap's traces of speed, throttle/brake, delta and gear, `drawLiveTraces`)
  and Compare laps, live (`renderLiveCmp`/`tickLiveCmp`: the lap now against B, "My best" in purple, the last lap, other
  laps, and "▲ Next level" / "★ Record" only when the model has a full-telemetry lap of someone else, corner by corner by
  the official turns). A panel, Full's traces or Compare's chart scrolled out of sight is not drawn until it comes back
  (`LIVE_OFF`, `liveWatch`), and the charts read their size from a ResizeObserver (`cvSize`), never by laying the page out
  on each redraw: with every panel on, Full made the PC app freeze in a race (fixed in 0.9.24). Its chart and Full mode's traces (`drawLapRows`, the owner's design A) draw four rows, Delta (one
  line over its zero), Speed, Throttle · brake (throttle up and brake down from one axis) and Gear, B dashed, the corners
  as bands named T1… under the chart; on a wide screen a column on the left gives each row's name and its values at the
  cursor (A / B). A hole in B's telemetry (a lap may miss up to a tenth) is crossed in a straight line for the deltas
  (`lapTimed`), never with the time standing still, and the lap's clock now is the recorder's (`lapNowT`). The page's own lap recorder (`recordLap`, behind the traces and the compare) starts a lap where
  LapDistPct goes back to 0 and times it from SessionTime from there, like the agent's (`cloud.go`): iRacing counts the
  lap and restarts its lap clock a second or more after the line, so the first metres were missing and carried the lap
  before's clock (the delta jumped at the start). On the web, a hidden tab closes the live link (nobody watching), except
  with Telemetry open: the link stays so the laps driven meanwhile are recorded, and only the drawing waits for the tab. Standings: one panel titled Standings with the driver count, the class filter (only when several classes
  race) and gap to the leader or interval at its right, the session as cards over the table, and your position lap by
  lap under it (`renderStandings`, `drawPosHistory`); Tyres: one Tyres panel with the working window, the pit note and
  the four tyres side by side, Setup hints beside it, Balance as cards, Brake pressure · live and Pit readings, and they
  show their wear. The rev beep page is a list of cars
  and the chosen car's mode as three cards (iRacing lights, My laps, My RPM with one number or one per gear) and its
  sound (early, pitch, volume, test). Overlays is one list (`renderOverlaysTab`, `.ov-row`): every overlay always (no switch for the
  experimental ones, which keep their "Experimental" pill and ask for Pro on a PC without it), each with its games and its
  "when I get in the car" switch for each game, Open/Closed and Configure, the presets and the buttons on top, "Place on the screen" shows
  the screen editor. The PC app never zooms (Ctrl+wheel and Ctrl +/− blocked, `IsZoomControlEnabled` off).
- The Telemetry screen (Pit Wall Workspace, `pw3-live` in index.html) opens with the track's name big, the session
  under it, the modes and Layout at its right, then a status strip (`pw3Strip`: position, lap, delta, last lap, fuel,
  the cars ahead and behind, incidents and what is left). Its default arrangement is the Workspace desk on screens wider
  than 1100 px (`pw3Mason`): the Relative with the session as cards and the incident log at the left; the car strip
  (gear, speed, RPM and the car's controls), the four lap times, the delta bar, mini-sectors, Inputs, Fuel and Engine &
  track side by side, Tyres, the gap graph beside the pit calculator and the driving stats beside the braking markers in
  the middle; the map, the track position bar, the radar beside the g-force and the weather at the right. Panels keep
  their drag handles, height resize and Layout. Dragging a panel onto another column moves it there
  (`pw.liveWsCol`). A driver with a layout of their own from before (`pw.order`, `pw.sizes`, `pw.heights`) keeps the
  classic 12-column grid (`pw.liveWs` 0) until Layout's reset, which brings the desk back. Narrower screens stack the
  panels in the desk's order.
  The panels copy the design's own rules (10 px inside, a #2a3140 edge, 8 px corners, the titles in Barlow Condensed
  capitals, the drag handles showing on hover). The Relative shows its table, then the session as cards; its own dots
  bar is gone (the track position bar shows the same). The delta bar is one bar with its value in the middle. Fuel,
  Engine & track, the pit calculator and the weather show their values as cards. Tyres shows the four tyre cards
  (the three edges coloured by the working window, the wear and the pressures, `pw3TyreCards`). Lap comparison sits
  after the braking markers, and in Full the traces come under the desk.
- Standings (`#v-field`) is one panel: its title with To the leader / Interval at its right, the session's six cards
  in one row (session, laps left, SOF, position, iRating, incidents), the table, then Positions lap by lap. Tyres
  (`#v-tyres`) has Tyres beside Setup hints, then Balance and Brake pressure (as cards) beside each other and the pit
  readings under them, two thirds wide.
- Engineer (`"eng"`, between Basic and Full, the owner's ask 2026-11-15) shows what a race engineer watches: by default
  flags, the car strip, the lap times, the delta bar, mini-sectors, the relative, the standings, the gap graph, fuel, the
  pit stop calculator, tyres, engine & track, braking markers, the map, the track position bar, weather, the incident log
  and driving stats (`LIVE_ENG`). Its panels are its own, chosen in Layout like Basic's ("Layout · Engineer", its
  "★ Engineer's panels" puts the default back), kept as the panels it shows (`pw.engShown`, so a new panel stays out
  until added); order, widths and the desk's columns are shared with Basic. While it is on, `HIDDEN` is its set and
  `HID_BASIC` keeps Basic's (`liveHidSync`, `hidSave`; the swap waits for the start's layout updates, `LIVE_HID_OK`).
  In Engineer the Relative and the Standings add, after the name, each car's tyre compound (`tyre`) and its state
  (`state`, `carState`: PIT on the pit lane, OUT on the lap it left the pits on (`OUTL`), OFF off the track), and the
  gap (and the Standings' interval) when the driver's columns leave them out (`engCols`); the PIT tag beside the name
  is dropped there, the laps up or down (+1L) stay. Their Configure has "Tyres and pit in Engineer" (`engCols`, on) to
  keep the driver's own columns instead. `state` is never offered among the columns (the native overlays do not draw it).
- In Basic, the Telemetry screen shows only the essentials (`LIVE_ESSENTIAL`: flags, the car strip, the lap times, the
  delta bar, the relative, inputs, fuel, engine & track, tyres, the map and the track position bar); every other widget
  is one click away in Layout ("Essentials" puts them back). A Basic still on the old essentials moves to these once
  (`pw.liveV` 3); one the driver changed stays as it is. The live map is
  the coach maps' road with depth, its start/finish line, the direction arrow and the official turns; it has no
  "ideal" line.
- Telemetry's Layout window is the "Desk map" (`openLayout`, the `lya*` functions in index.html). It is always whole
  on the screen: a wide card in the middle on computers (1320 px at most, 16 px from every edge, under the DEMO or BETA
  banner) where nothing scrolls, and the whole screen on phones (820 px and narrower), which scrolls as one page. The
  title carries how many panels are shown ("11 / 27 shown"), with no line under it. On top are the presets: Essentials,
  Most used by the community, Hide all and Show all. At the bottom are Overlay settings and "Reset order and widths".
  - The desk is the Telemetry screen drawn small exactly as it lays out now. Each panel is a copy of the real panel
    with what it shows at that moment (its canvases copied as they are), refreshed every second while the window is
    open. In the Workspace desk the copy is the desk with Left, Middle and Right over its columns. In the 12-column
    grid (a layout of the driver's own, or a screen 1100 px or narrower) it is that grid. Flags are a strip on top, an
    empty frame while no flag is out. The copies use the panels' own rules (copied once, with `#v-live`, `#liveGrid`
    and the panels' ids turned into classes and `data-pvid` with the same weight, `lyaCss`) and are scaled to fit.
    Phones show it at half the screen's width or more, under the card. With no data the copies are the panels'
    empty frames. Demo data shows only under Demo data, like the screen itself.
  - Tapping a panel opens it in the card beside the desk (above it on phones, which scroll to it): a bigger copy that
    keeps refreshing, the name and the Shown switch, the games it works in, then the one setting that applies where
    it sits. In the Workspace desk that is Column (Left, Middle, Right, `pw.liveWsCol`). In the grid it is Width (S, M,
    L, XL, Full, the width it has on the screen now marked). Configure is there for the panels that have it.
  - Dragging a panel onto another column of the desk moves it there. On the grid, dropping it on another panel puts it
    before or after it (`pw.order`). Dropping it on Hidden panels hides it. A hidden panel dragged onto the desk is
    shown there.
  - Hidden panels are chips under the card. Hovering (or focusing) one shows its copy beside it, and picking one shows
    it in the card. To have something to copy, a hidden panel the window shows is laid out unseen outside the desk
    while it is shown there (`lyaPeek`). The usage counter and the desk's own layout leave it out.
  - Most used by the community shows the panels at least half of the drivers who used Telemetry in the last 30 days
    show (GET `/community/live/popular`, `cloud/src/livepopular.js`: distinct accounts from the `live:` usage keys,
    admin.md; at least 20 accounts, cached six hours) plus the flags. Until then it is off, and its tooltip says not
    enough drivers have used it yet.
- Live in the web and phone apps: Connect/Disconnect for your own PC (presence only until Connect),
  and watching someone else with a share code made on the PC (Settings → Phone) or from the phone.
  The room is one hash of the code and the key a PBKDF2 of it, so the server never reads the
  telemetry; code viewers only watch (no DRINKS, no race summaries). Connect asks the PC first: a
  window there accepts or declines the device (by its name) and nothing is sent to it before you
  accept; an accepted device is remembered while Pitlane HQ runs. A declined device is not asked again by its automatic
  retries for two minutes, but pressing Connect again always asks the PC again (`again` in the hello). No Wi-Fi pairing panel and no
  encryption wording on the Live card. The Live page is: your PC, watch another driver (the code gets
  its dashes as you type), then the download, with the same gap between the boxes. While a device watches live (your PC or a code), a
  "Watching your PC" / "Watching · code" line with Disconnect stays beside the sub-tabs of Telemetry, Standings, Tyres and
  the rest (`liveOffUI`; on the phones under the status above the sub-tabs), since the Live page is not reachable while the
  telemetry shows. It does what the Live page's Disconnect does (`liveStop`).
