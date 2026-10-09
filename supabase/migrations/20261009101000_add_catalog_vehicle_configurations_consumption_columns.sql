-- Adds two new nullable consumption columns to catalog_vehicle_configurations, as asked.
--
-- Flagging rather than silently resolving (CLAUDE.md: never auto-correct a deliberate-
-- looking decision without being asked): this table already has `fuel_consumption_combined`
-- (added with the original catalog_vehicle_configurations table) and
-- `battery_capacity_net_kwh`/`ev_range_wltp_km` (EV range/battery, not a per-100km energy
-- figure). `fuel_consumption_l100km` and `energy_consumption_kwh100km` read like they could
-- overlap with the first and partially cover similar ground to the others -- if the intent
-- is for the existing `fuel_consumption_combined` to be deprecated/replaced by
-- `fuel_consumption_l100km`, that's a separate migration (a column rename or a backfill +
-- drop), not something assumed here. Added as two new, independent, currently-unused
-- nullable columns exactly as specified.
--
-- ALREADY LIVE -- confirmed via a direct column probe right before writing this file,
-- column-for-column identical to what's below. Not run by this session or anyone in this
-- conversation; most likely applied by the same parallel session that built app/catalog
-- the day before. Kept here, unmodified from its originally-intended design, as the
-- documented record of what's live -- do NOT run this file (it will error: the columns
-- already exist). The fuel_consumption_combined/battery_capacity_net_kwh overlap flagged
-- above still stands unresolved either way.

BEGIN;

ALTER TABLE catalog_vehicle_configurations
  ADD COLUMN fuel_consumption_l100km numeric,
  ADD COLUMN energy_consumption_kwh100km numeric;

COMMIT;
