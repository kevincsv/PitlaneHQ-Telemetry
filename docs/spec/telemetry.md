# Telemetry screen, rev beep, voice chat and live link

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.

- The rev beep (Telemetry → Rev beep, its own sub-tab after Tyres, `v-revbeep`, `renderShiftPanel`/`shiftTick`, `pw.shift`;
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
- Telemetry has three modes (`LIVE_MODE`, `liveModeBar`): Basic (the essentials below), Full (every basic widget, the
  experimental ones too (not on a PC without Pro), and the lap's traces of speed, throttle/brake, delta and gear, `drawLiveTraces`)
  and Compare laps, live (`renderLiveCmp`/`tickLiveCmp`: the lap now against B, "My best" in purple, the last lap, other
  laps, and "▲ Next level" / "★ Record" only when the model has a full-telemetry lap of someone else, corner by corner by
  the official turns). Its chart and Full mode's traces (`drawLapRows`, the owner's design A) draw four rows, Delta (one
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
- In Basic, the Telemetry screen shows only the essentials (`LIVE_ESSENTIAL`: flags, the car strip, the lap times, the
  delta bar, the relative, inputs, fuel, engine & track, tyres, the map and the track position bar); every other widget
  is one click away in Layout ("Essentials" puts them back). A Basic still on the old essentials moves to these once
  (`pw.liveV` 3); one the driver changed stays as it is. The live map is
  the coach maps' road with depth, its start/finish line, the direction arrow and the official turns; it has no
  "ideal" line.
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
