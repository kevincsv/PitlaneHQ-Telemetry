-- The names of a track's official turns (an admin types them beside the turns they placed, "Tertre Rouge"), in the
-- order T1 … Tn as a JSON array of strings ("" for a turn without a name). The tips head a named turn "T5 Tertre Rouge".
ALTER TABLE track_turns ADD COLUMN names TEXT;
