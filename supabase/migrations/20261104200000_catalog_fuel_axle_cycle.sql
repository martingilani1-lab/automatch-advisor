-- Dilemma-driven schema gaps, group 1: fuel types, driven axle, bi-fuel, test cycle
-- (Martin, 2026-11-04 -- "stress-test the schema with contrasting dilemmas before scaling").
-- Each change unblocks a dilemma the catalog could not store honestly before:
--
--   1. catalog_engines.fuel_type += 'cng'   City: Octavia G-TEC, Fabia/Polo TGI. The cost
--      calculator already prices CNG; the engine table could not hold one.
--   2. catalog_engines.hybrid_type += 'HEV' City: full (self-charging) hybrid -- Yaris Hybrid,
--      Corolla. Neither 'MHEV' (no electric driving) nor 'PHEV' (plug-in, green zone) is true
--      for it.
--   3. catalog_vehicle_configurations.driven_axle (front | rear | all)   Highway: drivetrain_id
--      NULL only meant "2WD" -- a BMW 320d (RWD) and a Superb (FWD) were indistinguishable.
--   4. secondary_fuel_type + secondary_consumption_l100km   City: bi-fuel cars run on two fuels.
--      fuel_consumption_l100km stays the PRIMARY fuel (= engine fuel_type: LPG/CNG figure for a
--      factory LPG/CNG car -- what the cost calculator multiplies); the secondary is the petrol
--      figure. Both set or both NULL.
--   5. consumption_cycle (NEDC | WLTP)   all: WLTP reads ~15-25 % higher than NEDC for the same
--      car, so comparing an Octavia II (NEDC) with an Octavia IV (WLTP) mixed unlike figures.
--
-- Backfills (facts, not guesses -- each one says why):
--   * driven_axle = 'all' wherever drivetrain_id is set (an AWD system row = all-wheel drive).
--   * driven_axle = 'front' for every 2WD row on the platforms live today: VAG transverse
--     (PQ26, PQ34, PQ35, MQB, MQB-A0, MQB Evo) and MLB Evo -- none of them has a 2WD version that
--     drives the rear axle. Checked live 2026-11-04: those are the only platforms with 2WD rows.
--     Any other platform stays NULL until set per car.
--   * consumption_cycle = 'NEDC' for phases that ended by 2017 (WLTP did not exist yet);
--     'WLTP' for phases that started in 2019 or later (mandatory for all new registrations from
--     Sept 2018). Phases spanning 2017-2019 (25 phases, 500 configs) stay NULL: their figure could
--     be either -- Martin to decide per phase.
--   * Octavia II CHGA (factory LPG): secondary petrol 7.2 l (Martin, 2026-11-03).
--
-- CHECK constraints are named <table>_<column>_check and mirrored in
-- scripts/catalog-vocabularies.json in the same commit (drift check, validate-template.mjs).
--
-- ALTER + UPDATE: human-run only, in a FRESH SQL editor tab. One transaction.

BEGIN;

-- 1 + 2: widen two frozen vocabularies (no existing row can fail -- values only added).
ALTER TABLE public.catalog_engines DROP CONSTRAINT catalog_engines_fuel_type_check;
ALTER TABLE public.catalog_engines ADD CONSTRAINT catalog_engines_fuel_type_check
  CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'lpg', 'cng'));

ALTER TABLE public.catalog_engines DROP CONSTRAINT catalog_engines_hybrid_type_check;
ALTER TABLE public.catalog_engines ADD CONSTRAINT catalog_engines_hybrid_type_check
  CHECK (hybrid_type IS NULL OR hybrid_type IN ('MHEV', 'HEV', 'PHEV'));

-- 3-5: new configuration columns.
ALTER TABLE public.catalog_vehicle_configurations
  ADD COLUMN driven_axle text,
  ADD COLUMN secondary_fuel_type text,
  ADD COLUMN secondary_consumption_l100km numeric,
  ADD COLUMN consumption_cycle text;

ALTER TABLE public.catalog_vehicle_configurations
  ADD CONSTRAINT catalog_vehicle_configurations_driven_axle_check
    CHECK (driven_axle IS NULL OR driven_axle IN ('front', 'rear', 'all')),
  ADD CONSTRAINT catalog_vehicle_configurations_secondary_fuel_type_check
    CHECK (secondary_fuel_type IS NULL OR secondary_fuel_type IN ('petrol', 'lpg', 'cng')),
  ADD CONSTRAINT catalog_vehicle_configurations_consumption_cycle_check
    CHECK (consumption_cycle IS NULL OR consumption_cycle IN ('NEDC', 'WLTP')),
  -- A secondary fuel without its figure (or the reverse) is half a fact.
  ADD CONSTRAINT catalog_vehicle_configurations_secondary_pair_check
    CHECK ((secondary_fuel_type IS NULL) = (secondary_consumption_l100km IS NULL)),
  ADD CONSTRAINT catalog_vehicle_configurations_secondary_consumption_range_check
    CHECK (secondary_consumption_l100km IS NULL OR secondary_consumption_l100km BETWEEN 1 AND 30);

-- Backfills.
UPDATE public.catalog_vehicle_configurations SET driven_axle = 'all' WHERE drivetrain_id IS NOT NULL;

UPDATE public.catalog_vehicle_configurations c SET driven_axle = 'front'
  FROM public.catalog_phases p
 WHERE p.id = c.phase_id AND c.drivetrain_id IS NULL
   AND p.platform_code IN ('PQ26', 'PQ34', 'PQ35', 'MQB', 'MQB-A0', 'MQB Evo', 'MLB Evo');

UPDATE public.catalog_vehicle_configurations c SET consumption_cycle = 'NEDC'
  FROM public.catalog_phases p WHERE p.id = c.phase_id AND p.year_to <= 2017;
UPDATE public.catalog_vehicle_configurations c SET consumption_cycle = 'WLTP'
  FROM public.catalog_phases p WHERE p.id = c.phase_id AND p.year_from >= 2019;

UPDATE public.catalog_vehicle_configurations c
   SET secondary_fuel_type = 'petrol', secondary_consumption_l100km = 7.2
  FROM public.catalog_engines e, public.catalog_phases p
 WHERE e.id = c.engine_id AND p.id = c.phase_id
   AND e.code = 'CHGA' AND e.power_kw = 75 AND p.generation_code = '1Z' AND p.phase_label = 'Facelift';

DO $$
DECLARE n int;
BEGIN
  -- Every AWD row and every 2WD row of a listed platform must have an axle now.
  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations c JOIN public.catalog_phases p ON p.id = c.phase_id
   WHERE c.driven_axle IS NULL
     AND (c.drivetrain_id IS NOT NULL OR p.platform_code IN ('PQ26', 'PQ34', 'PQ35', 'MQB', 'MQB-A0', 'MQB Evo', 'MLB Evo'));
  IF n <> 0 THEN RAISE EXCEPTION '% configurations still without driven_axle -- rolled back', n; END IF;

  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations WHERE secondary_fuel_type IS NOT NULL;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 bi-fuel rows (Octavia II CHGA), found % -- rolled back', n; END IF;
END $$;

COMMIT;
