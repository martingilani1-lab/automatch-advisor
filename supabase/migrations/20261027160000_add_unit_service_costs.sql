-- Structured service interval + cost for gearboxes and AWD systems (Martin, 2026-10-27), so the
-- per-configuration Cost of ownership calculator can add the gearbox/drivetrain service to the
-- engine's own servicing. Same idea as the engine maintenance columns (20261027140000): the
-- free-text maintenance_note stays as the explanation; these are the numbers behind it.
--
-- One scheduled fluid service per unit (gearbox oil / ATF / DSG fluid+filter / Haldex oil+filter /
-- Torsen centre+diff oil). Clutch, DMF and mechatronic are NOT a scheduled service -- they're wear
-- or failure items and are covered by the calculator's repair reserve, not here.
--
-- PRICE BASIS: EUR, parts + labour, independent workshop in SK/CZ, typical range (min/max).
-- service_interval_years: only where a time limit applies alongside the km one (e.g. Haldex Gen 6
-- "60k km or 3 years"); NULL = km-only.
-- NULL = not known yet (never invented).
--
-- Schema change: review-only, NOT run by this session. Run in a FRESH Supabase SQL editor tab.
-- The calculator reads these columns through a separate query that degrades to "no data" while
-- they don't exist, so the page works before and after this runs.

BEGIN;

ALTER TABLE transmission_units
  ADD COLUMN service_interval_km     integer  CHECK (service_interval_km > 0),
  ADD COLUMN service_interval_years  smallint CHECK (service_interval_years > 0),
  ADD COLUMN service_cost_eur_min    integer  CHECK (service_cost_eur_min > 0),
  ADD COLUMN service_cost_eur_max    integer  CHECK (service_cost_eur_max > 0),
  ADD CONSTRAINT transmission_units_service_cost_range_check CHECK (service_cost_eur_min <= service_cost_eur_max);

ALTER TABLE drivetrain_systems
  ADD COLUMN service_interval_km     integer  CHECK (service_interval_km > 0),
  ADD COLUMN service_interval_years  smallint CHECK (service_interval_years > 0),
  ADD COLUMN service_cost_eur_min    integer  CHECK (service_cost_eur_min > 0),
  ADD COLUMN service_cost_eur_max    integer  CHECK (service_cost_eur_max > 0),
  ADD CONSTRAINT drivetrain_systems_service_cost_range_check CHECK (service_cost_eur_min <= service_cost_eur_max);

COMMIT;
