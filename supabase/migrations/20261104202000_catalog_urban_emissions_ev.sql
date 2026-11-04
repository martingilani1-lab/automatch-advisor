-- Dilemma-driven schema gaps, group 5: city vs. highway consumption, after-treatment, EV
-- charging (Martin, 2026-11-04).
--
--   catalog_vehicle_configurations
--     fuel_consumption_urban_l100km /       City vs. Highway dilemma itself: a hybrid wins in
--     fuel_consumption_extra_urban_l100km   town, a diesel on the motorway -- the combined
--                                           figure hides exactly that. Same test cycle as
--                                           consumption_cycle (NEDC urban/extra-urban; for WLTP
--                                           use low+medium as urban, high+extra-high as
--                                           extra-urban).
--     max_charging_kw_ac                    home / wallbox charging (DC already exists)
--     has_heat_pump                         winter EV range; NULL = unknown
--   catalog_engines
--     has_dpf / has_gpf / has_scr           diesel particulate filter, petrol particulate
--                                           filter, SCR (AdBlue). Until now these lived only in
--                                           maintenance_note text -- as flags they drive the
--                                           "DPF diesel + short trips" warning and AdBlue cost.
--
-- No backfill: guessing a DPF from the emission standard would be wrong for the 2006-2010
-- crossover (BXE vs. BLS is exactly that case). NULL = unknown, set per engine.
--
-- ALTER only: human-run, in a FRESH SQL editor tab.

BEGIN;

ALTER TABLE public.catalog_vehicle_configurations
  ADD COLUMN fuel_consumption_urban_l100km numeric,
  ADD COLUMN fuel_consumption_extra_urban_l100km numeric,
  ADD COLUMN max_charging_kw_ac numeric,
  ADD COLUMN has_heat_pump boolean;

ALTER TABLE public.catalog_vehicle_configurations
  ADD CONSTRAINT catalog_vehicle_configurations_urban_range_check
    CHECK (fuel_consumption_urban_l100km IS NULL OR fuel_consumption_urban_l100km BETWEEN 1 AND 30),
  ADD CONSTRAINT catalog_vehicle_configurations_extra_urban_range_check
    CHECK (fuel_consumption_extra_urban_l100km IS NULL OR fuel_consumption_extra_urban_l100km BETWEEN 1 AND 30),
  ADD CONSTRAINT catalog_vehicle_configurations_ac_charging_range_check
    CHECK (max_charging_kw_ac IS NULL OR max_charging_kw_ac BETWEEN 1 AND 43);

ALTER TABLE public.catalog_engines
  ADD COLUMN has_dpf boolean,
  ADD COLUMN has_gpf boolean,
  ADD COLUMN has_scr boolean;

COMMIT;
