-- Adds battery capacity (for hybrid/EV engines) and authored reliability/pros/cons content
-- to catalog_engines -- the same per-engine detail Browse & Compare already shows from the
-- legacy engines table (reliability_rating, general_pros/general_cons at the vehicle level
-- there), now modeled per-engine on the catalog_ side since reliability genuinely varies by
-- engine, not just by car.
--
-- All 4 columns nullable, no backfill -- NULL over invention (CLAUDE.md rule 7). Existing
-- rows are unaffected; this only adds columns.
--
-- ALREADY LIVE -- confirmed via the catalog_check_constraint_def RPC and a direct column
-- probe right before writing this file, column-for-column and constraint-for-constraint
-- identical to what's below. Not run by this session or anyone in this conversation; most
-- likely applied by the same parallel session that built app/catalog the day before. Kept
-- here, unmodified from its originally-intended design, as the documented record of what's
-- live -- do NOT run this file (it will error: the columns already exist).

BEGIN;

ALTER TABLE catalog_engines
  ADD COLUMN battery_kwh numeric,
  ADD COLUMN reliability_rating smallint,
  ADD COLUMN pros text[],
  ADD COLUMN cons text[];

-- "usable/net" capacity -- same convention as the existing battery_capacity_net_kwh column
-- on catalog_vehicle_configurations (that one's per-configuration; this one's per-engine,
-- for a hybrid/EV engine's own spec sheet figure independent of which body it's fitted to).
COMMENT ON COLUMN catalog_engines.battery_kwh IS 'Usable/net battery capacity in kWh, for hybrid/EV engines. NULL for conventional engines.';

ALTER TABLE catalog_engines
  ADD CONSTRAINT catalog_engines_reliability_rating_check
  CHECK (reliability_rating IS NULL OR reliability_rating BETWEEN 1 AND 5);

COMMIT;
