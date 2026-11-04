-- Dilemma-driven schema gaps, group 2: towing and curb weight per CONFIGURATION (Martin,
-- 2026-11-04). Heavy-towing dilemma: catalog_phases.towing_capacity_kg is one number per phase,
-- but the real limit depends on engine + gearbox (+ AWD): a 1.0 TSI and a 2.0 TDI 4x4 of the
-- same car can differ by 1 000 kg. That is also why the Heavy tower tag was never automated.
-- Same for curb weight: the Octavia Scout showed 1530 vs 1605 kg by engine, but
-- phase_body_dimensions holds one weight per phase x body.
--
--   catalog_vehicle_configurations
--     towing_braked_kg     trailer WITH its own brakes, homologated maximum
--     towing_unbraked_kg   trailer WITHOUT brakes
--     curb_weight_kg       this configuration's own weight; phase_body_dimensions.curb_weight_kg
--                          stays as the body's base (lightest) weight for the overview
--   phase_body_dimensions
--     nose_weight_kg       max vertical load on the tow ball (bike carriers, caravans)
--     roof_load_kg         max roof load (roof box, roof tent)
--
-- catalog_phases.towing_capacity_kg is KEPT: it stays the phase's best-case figure for the
-- overview; the per-configuration value wins wherever it is set.
--
-- Backfill: the Octavia II Scout per-engine weights Martin gave on 2026-11-04 (BVY 1530, BMM 1605
-- pre-facelift; CDAA 1520, CFHC 1570 facelift). The facelift BMM Scout had no figure -> NULL.
--
-- ALTER + UPDATE: human-run only, in a FRESH SQL editor tab. One transaction.

BEGIN;

ALTER TABLE public.catalog_vehicle_configurations
  ADD COLUMN towing_braked_kg integer,
  ADD COLUMN towing_unbraked_kg integer,
  ADD COLUMN curb_weight_kg integer;

ALTER TABLE public.catalog_vehicle_configurations
  ADD CONSTRAINT catalog_vehicle_configurations_towing_braked_range_check
    CHECK (towing_braked_kg IS NULL OR towing_braked_kg BETWEEN 0 AND 4500),
  ADD CONSTRAINT catalog_vehicle_configurations_towing_unbraked_range_check
    CHECK (towing_unbraked_kg IS NULL OR towing_unbraked_kg BETWEEN 0 AND 1000),
  -- Unbraked can never exceed braked when both are known.
  ADD CONSTRAINT catalog_vehicle_configurations_towing_order_check
    CHECK (towing_braked_kg IS NULL OR towing_unbraked_kg IS NULL OR towing_unbraked_kg <= towing_braked_kg),
  ADD CONSTRAINT catalog_vehicle_configurations_curb_weight_range_check
    CHECK (curb_weight_kg IS NULL OR curb_weight_kg BETWEEN 500 AND 4000);

ALTER TABLE public.phase_body_dimensions
  ADD COLUMN nose_weight_kg integer,
  ADD COLUMN roof_load_kg integer;

ALTER TABLE public.phase_body_dimensions
  ADD CONSTRAINT phase_body_dimensions_nose_weight_range_check
    CHECK (nose_weight_kg IS NULL OR nose_weight_kg BETWEEN 0 AND 300),
  ADD CONSTRAINT phase_body_dimensions_roof_load_range_check
    CHECK (roof_load_kg IS NULL OR roof_load_kg BETWEEN 0 AND 300);

-- Backfill: Octavia II Scout per-engine curb weights.
DO $$
DECLARE n int;
BEGIN
  WITH v(phase_label, engine_code, power_kw, weight) AS (VALUES
    ('Pre-facelift'::text, 'BVY'::text,  110::integer, 1530::integer),
    ('Pre-facelift',       'BMM',        103,          1605),
    ('Facelift',           'CDAA',       118,          1520),
    ('Facelift',           'CFHC',       103,          1570)
  )
  UPDATE public.catalog_vehicle_configurations c
     SET curb_weight_kg = v.weight
    FROM v, public.catalog_phases p, public.catalog_engines e, public.catalog_body_types b
   WHERE p.id = c.phase_id AND e.id = c.engine_id AND b.id = c.body_type_id
     AND p.generation_code = '1Z' AND p.phase_label = v.phase_label
     AND e.code = v.engine_code AND e.power_kw = v.power_kw AND b.name = 'Estate Cross';
  GET DIAGNOSTICS n = ROW_COUNT;
  -- BVY 1 + BMM 1 (pre-facelift) + CDAA 2 + CFHC 2 (facelift, manual + DSG) = 6.
  IF n <> 6 THEN RAISE EXCEPTION 'Expected 6 Octavia II Scout weights, set % -- rolled back', n; END IF;
END $$;

COMMIT;
