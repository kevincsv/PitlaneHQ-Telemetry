/* Which game each overlay (and Telemetry widget), relative and standings column and header or footer item works with:
   what each game does not send ("lacks") against what each thing needs ("needs"). One table, read by the app
   (index.html: the game badges, the Auto switch per game, the columns offered) and by the agent (gamesupport.go: the
   overlays it opens by itself, the columns it draws). "games" are the ones out for everyone; ACC and Assetto Corsa are in
   development (GAME_WIP in index.html, gameWIP in games.go). ACC's names, laps and times come from its broadcasting
   API (accbcast.go), Assetto Corsa's from Pitlane HQ's in-game app (acapp.go); Assetto Corsa has no engine temperatures. Keep it plain JSON
   between the braces. */
window.PW_GAMES={
  "games": ["iracing", "lmu"],
  "lacks": {
    "iracing": [],
    "lmu": ["ir", "lic", "inc"],
    "acc": ["ir", "lic", "inc"],
    "ac": ["ir", "lic", "inc", "engine"]
  },
  "needs": {
    "widgets": {"radar": ["others"], "relative": ["others"], "standings": ["others", "names"], "gaps": ["others", "names"], "incidents": ["inc"], "trackbar": ["others"], "engine": ["engine"]},
    "columns": {"ir": ["ir"], "irc": ["ir"], "lic": ["lic"], "inc": ["inc"], "laps": ["names"], "last": ["names"], "best": ["names"], "pit": ["names"]},
    "items": {"sof": ["ir"], "irc": ["ir"], "inc": ["inc"], "traffic": ["others", "names"]}
  }
};
