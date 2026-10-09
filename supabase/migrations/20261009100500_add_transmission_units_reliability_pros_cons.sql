-- Adds authored reliability/pros/cons content to transmission_units, mirroring
-- catalog_engines' own reliability_rating/pros/cons columns added in the sibling migration
-- 20261009100000 -- transmission_units already has free-text reliability_note/
-- maintenance_note; this adds the same structured 1-5 rating + pros/cons shape the engine
-- side just got, so both can be displayed consistently (e.g. "N missing" gaps-mode parity).
--
-- All 3 columns nullable, no backfill -- NULL over invention (CLAUDE.md rule 7).
--
-- ALREADY LIVE -- confirmed via the catalog_check_constraint_def RPC and a direct column
-- probe right before writing this file, column-for-column and constraint-for-constraint
-- identical to what's below. Not run by this session or anyone in this conversation; most
-- likely applied by the same parallel session that built app/catalog the day before. Kept
-- here, unmodified from its originally-intended design, as the documented record of what's
-- live -- do NOT run this file (it will error: the columns already exist).

BEGIN;

ALTER TABLE transmission_units
  ADD COLUMN reliability_rating smallint,
  ADD COLUMN pros text[],
  ADD COLUMN cons text[];

ALTER TABLE transmission_units
  ADD CONSTRAINT transmission_units_reliability_rating_check
  CHECK (reliability_rating IS NULL OR reliability_rating BETWEEN 1 AND 5);

COMMIT;
