-- The edges of a track: how far to the left and to the right of its layout (track_maps) the drivers' cars have been, at
-- every point of it (5 m), from many laps whose path came from the game's position (trackmaps.js rebuildEdges). The coach
-- says where a lap leaves track unused on a corner's exit, and /community/trackmap serves them with the layout.
CREATE TABLE IF NOT EXISTS track_edges (
  game TEXT NOT NULL DEFAULT 'iracing',
  track_id INTEGER NOT NULL,
  n INTEGER NOT NULL,        -- the layout's points when they were measured (another layout: measured again)
  laps INTEGER NOT NULL,     -- how many laps they come from
  data TEXT NOT NULL,        -- JSON {l: [...], r: [...]}: metres to the left (l, positive) and to the right (r, negative)
  updated INTEGER NOT NULL,
  PRIMARY KEY (game, track_id)
);
