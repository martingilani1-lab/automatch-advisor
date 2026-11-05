-- EV / hybrid powertrain data on catalog_engines, plus injection type and wet-belt flag
-- (Martin, 2026-11-05 -- city-commuter batch: budget, modern, EV / hybrid).
--
-- WHERE the EV data lives: on the ENGINE row, as asked. In this catalog an electrified "engine"
-- row is the whole powertrain variant -- motor + battery (e.g. "Enyaq 80, 150 kW") -- so battery
-- size, charging power and battery cooling are properties of that row, the same way a hybrid's
-- battery belongs to its engine. What stays per CONFIGURATION is what changes with body / wheels:
-- energy_consumption_kwh100km and ev_range_wltp_km.
--
-- catalog_engines
--   battery_kwh -> battery_capacity_net_kwh   RENAMED, not duplicated: same meaning (now stated:
--                                             NET usable capacity), 0 rows filled (checked live).
--   max_ac_charging_kw          onboard charger, kW (numeric: 7.2 / 11 / 22)
--   max_dc_charging_kw          peak DC fast-charge, kW
--   battery_thermal_management  active_liquid | active_air | passive  (Nissan Leaf / e-Golf =
--                               passive -- the battery-ageing fact buyers of used EVs need)
--   heat_pump                   yes | no | optional  (text, not boolean: "optional" is the common
--                               case and a boolean could only say yes/no)
--   injection_type              port | direct | dual | common_rail | pump_injector |
--                               distributor_pump -- carbon build-up (direct), PD vs CR diesels
--   timing_belt_in_oil          true = wet belt running in engine oil (PSA 1.2 PureTech, Ford 1.0
--                               EcoBoost); false = ordinary dry belt. A separate, well-known failure
--                               class (belt shedding into the oil pickup), so it can't be folded
--                               into timing_type; NULL for chain / gear engines and until checked
-- Values are lowercase snake_case like every other frozen vocabulary here ('active_liquid' for
-- "Active liquid", 'yes' / 'no' / 'optional' for Yes / No / Optional).
--
-- catalog_vehicle_configurations -- DROPPED, all 0 % filled (checked live 2026-11-05), so no
-- data is lost; the block below rolls back if any row has a value by the time this runs:
--   battery_capacity_net_kwh, max_charging_kw_ac, max_charging_kw_dc, has_heat_pump
--   -> now on catalog_engines (above). Keeping both would leave two places for the same fact.
--   The app code was changed to read the engine columns BEFORE this file runs (commit with this
--   file) -- deploy that first, then run this.
--
-- transmission_units.family += 'power_split'  -- Toyota / Lexus / Ford / Hyundai power-split
--   hybrid transmissions (marketed "e-CVT"): planetary gearset, no belt or cone, so filing them
--   under 'cvt' would give them the belt-CVT reliability reputation they don't have.
--
-- CHECKs named <table>_<column>_check, mirrored in scripts/catalog-vocabularies.json (same
-- commit). Schema change + guarded drop: human-run only, in a FRESH SQL editor tab.

BEGIN;

-- ---- Guard: the 4 configuration columns being dropped must still be empty ----------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.catalog_vehicle_configurations
              WHERE battery_capacity_net_kwh IS NOT NULL OR max_charging_kw_ac IS NOT NULL
                 OR max_charging_kw_dc IS NOT NULL OR has_heat_pump IS NOT NULL) THEN
    RAISE EXCEPTION 'A configuration already holds EV data -- move it to catalog_engines first; rolled back';
  END IF;
  IF EXISTS (SELECT 1 FROM public.catalog_engines WHERE battery_kwh IS NOT NULL) THEN
    RAISE EXCEPTION 'catalog_engines.battery_kwh holds data -- check it is NET capacity before renaming; rolled back';
  END IF;
END $$;

-- ---- catalog_engines -----------------------------------------------------------------------
ALTER TABLE public.catalog_engines RENAME COLUMN battery_kwh TO battery_capacity_net_kwh;

ALTER TABLE public.catalog_engines
  ADD COLUMN max_ac_charging_kw numeric,
  ADD COLUMN max_dc_charging_kw numeric,
  ADD COLUMN battery_thermal_management text,
  ADD COLUMN heat_pump text,
  ADD COLUMN injection_type text,
  ADD COLUMN timing_belt_in_oil boolean;

ALTER TABLE public.catalog_engines
  ADD CONSTRAINT catalog_engines_battery_capacity_net_kwh_range_check
    CHECK (battery_capacity_net_kwh IS NULL OR battery_capacity_net_kwh > 0 AND battery_capacity_net_kwh <= 200),
  ADD CONSTRAINT catalog_engines_max_ac_charging_kw_range_check
    CHECK (max_ac_charging_kw IS NULL OR max_ac_charging_kw > 0 AND max_ac_charging_kw <= 43),
  ADD CONSTRAINT catalog_engines_max_dc_charging_kw_range_check
    CHECK (max_dc_charging_kw IS NULL OR max_dc_charging_kw > 0 AND max_dc_charging_kw <= 500),
  ADD CONSTRAINT catalog_engines_battery_thermal_management_check
    CHECK (battery_thermal_management IS NULL OR battery_thermal_management IN ('active_liquid', 'active_air', 'passive')),
  ADD CONSTRAINT catalog_engines_heat_pump_check
    CHECK (heat_pump IS NULL OR heat_pump IN ('yes', 'no', 'optional')),
  ADD CONSTRAINT catalog_engines_injection_type_check
    CHECK (injection_type IS NULL OR injection_type IN ('port', 'direct', 'dual', 'common_rail', 'pump_injector', 'distributor_pump')),
  -- A wet belt is still a belt.
  ADD CONSTRAINT catalog_engines_belt_in_oil_needs_belt_check
    CHECK (timing_belt_in_oil IS NOT TRUE OR timing_type = 'belt');

-- ---- catalog_vehicle_configurations: drop the now-duplicate, never-filled EV columns -----------
ALTER TABLE public.catalog_vehicle_configurations
  DROP COLUMN battery_capacity_net_kwh,
  DROP COLUMN max_charging_kw_ac,
  DROP COLUMN max_charging_kw_dc,
  DROP COLUMN has_heat_pump;

-- ---- transmission_units.family: power-split hybrid transmissions ---------------------------
ALTER TABLE public.transmission_units DROP CONSTRAINT transmission_units_family_check;
ALTER TABLE public.transmission_units ADD CONSTRAINT transmission_units_family_check
  CHECK (family IN ('dct_dry', 'dct_wet', 'dct', 'torque_converter', 'cvt', 'power_split', 'manual', 'amt', 'single_speed'));

COMMIT;
