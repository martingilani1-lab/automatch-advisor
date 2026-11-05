-- EV vocabulary follow-up to 20261105150000 (Martin, 2026-11-05).
--
-- 1. battery_thermal_management += 'active_refrigerant'
--    Battery cooled directly by the A/C refrigerant circuit (BMW i3, also the i3-era BMW / MINI
--    EVs). It is active cooling, but neither a liquid-coolant loop nor cabin air, so filing it under
--    'active_liquid' would be wrong. Found while writing the BMW i3 (I01) intake document.
--
-- 2. heat_pump: 'yes' / 'no' / 'optional'  ->  'standard' / 'optional' / 'none'
--    The words now say what a buyer needs: standard on every car, an option some cars have, or not
--    offered. 'yes' read as "this car has one", which is wrong when it was only an option.
--
-- Martin's draft targeted the legacy `engines` table and a `vehicle_configs` table. Those columns
-- already exist on `catalog_engines` (added by 20261105150000, live), and `ev_range_wltp_km` is
-- already on `catalog_vehicle_configurations`. `vehicle_configs` does not exist. So this file only
-- changes the two CHECK constraints on `catalog_engines`, keeping the `<table>_<column>_check` names
-- that `scripts/catalog-vocabularies.json` is checked against (updated in the same commit).
--
-- Both columns are empty live (0 rows checked 2026-11-05); the guard rolls back if that changed, so
-- no value is ever left outside the new list. Human-run, FRESH SQL editor tab.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.catalog_engines WHERE heat_pump IS NOT NULL OR battery_thermal_management IS NOT NULL) THEN
    RAISE EXCEPTION 'catalog_engines already has heat_pump / battery_thermal_management values -- map them to the new words first; rolled back';
  END IF;
END $$;

ALTER TABLE public.catalog_engines DROP CONSTRAINT catalog_engines_battery_thermal_management_check;
ALTER TABLE public.catalog_engines ADD CONSTRAINT catalog_engines_battery_thermal_management_check
  CHECK (battery_thermal_management IS NULL OR battery_thermal_management IN ('active_liquid', 'active_air', 'active_refrigerant', 'passive'));

ALTER TABLE public.catalog_engines DROP CONSTRAINT catalog_engines_heat_pump_check;
ALTER TABLE public.catalog_engines ADD CONSTRAINT catalog_engines_heat_pump_check
  CHECK (heat_pump IS NULL OR heat_pump IN ('standard', 'optional', 'none'));

COMMIT;
