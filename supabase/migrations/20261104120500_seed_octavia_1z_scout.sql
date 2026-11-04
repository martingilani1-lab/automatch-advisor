-- Škoda Octavia II (1Z) Scout -- body type "Estate Cross" (Martin, 2026-11-04).
-- REQUIRES 20261104120000 (body type "Estate Cross") to have run first.
--
-- The plain Combi 4x4 rows ("Estate" + haldex) stay untouched: the Combi 4x4 was sold alongside
-- the Scout. The "(incl. Scout)" comments in 20261103100000 / 20261103120500 are superseded by this
-- file -- from here on the Scout has its own rows.
--
-- Dimensions (Martin): length 4581 mm, height 1533 mm, ground clearance 179 mm, boot 580 / 1620 l,
-- same for both phases.
-- Curb weight: phase_body_dimensions holds ONE weight per phase x body, but Martin's figures are
-- per engine -- pre-facelift 1530 kg (2.0 FSI) / 1605 kg (2.0 TDI), facelift 1520 kg (1.8 TSI) /
-- 1570 kg (2.0 TDI CR). Stored: the lightest (1530 / 1520), the same base-weight convention the
-- other rows use (Octavia Estate 1310 = lightest version). The per-engine figures live only here.
-- width, gross weight, payload, fuel tank, seats: not supplied -> NULL.
--
-- Configurations + official NEDC consumption (Martin). 4x4 = VW MQ350 manual or VW DQ250 DSG;
-- Haldex Gen 2 pre-facelift, Gen 4 facelift (as the Combi 4x4 rows of each phase).
--   Pre-facelift: BVY 2.0 FSI manual 8.7 · BMM 2.0 TDI PD manual 6.4
--   Facelift:     CDAA 1.8 TSI manual 7.8 / DSG 7.9 · BMM manual 6.4 (early facelift) ·
--                 CFHC 2.0 TDI CR manual 6.2 / DSG 6.2
-- Every engine, gearbox and drivetrain reused (checked live); nothing new besides these rows.
--
-- Additive INSERTs only (dimensions ON CONFLICT (phase_id, body_type_id) DO NOTHING; configurations
-- WHERE NOT EXISTS). Review-only until Martin signs off. Scout trim + equipment: a separate file.

BEGIN;

-- ---- Dimensions ----------------------------------------------------------------------------
INSERT INTO public.phase_body_dimensions
  (phase_id, body_type_id, length_mm, height_mm, ground_clearance_mm, curb_weight_kg, boot_capacity_liters, boot_max_liters)
SELECT p.id, b.id, 4581, 1533, 179, v.curb_weight_kg, 580, 1620
FROM (VALUES ('Pre-facelift'::text, 1530::integer), ('Facelift', 1520)) AS v(phase_label, curb_weight_kg)
JOIN public.catalog_phases p
  ON p.generation_code = '1Z' AND p.phase_label = v.phase_label
 AND p.model_id = (SELECT m.id FROM public.catalog_models m JOIN public.catalog_brands br ON br.id = m.brand_id
                   WHERE m.name = 'Octavia' AND br.name = 'Škoda')
JOIN public.catalog_body_types b ON b.name = 'Estate Cross'
ON CONFLICT (phase_id, body_type_id) DO NOTHING;

-- ---- Configurations ------------------------------------------------------------------------
WITH v(phase_label, engine_code, power_kw, unit_code, drivetrain_code, consumption) AS (VALUES
  ('Pre-facelift'::text, 'BVY'::text,  110::integer, 'VW MQ350'::text, 'haldex_gen2'::text, 8.7::numeric),
  ('Pre-facelift',       'BMM',        103,          'VW MQ350',       'haldex_gen2',       6.4),
  ('Facelift',           'CDAA',       118,          'VW MQ350',       'haldex_gen4',       7.8),
  ('Facelift',           'CDAA',       118,          'VW DQ250',       'haldex_gen4',       7.9),
  ('Facelift',           'BMM',        103,          'VW MQ350',       'haldex_gen4',       6.4),
  ('Facelift',           'CFHC',       103,          'VW MQ350',       'haldex_gen4',       6.2),
  ('Facelift',           'CFHC',       103,          'VW DQ250',       'haldex_gen4',       6.2)
),
r AS (
  SELECT p.id AS phase_id, b.id AS body_type_id, e.id AS engine_id, t.id AS unit_id, d.id AS drivetrain_id, v.consumption
  FROM v
  JOIN public.catalog_phases p
    ON p.generation_code = '1Z' AND p.phase_label = v.phase_label
   AND p.model_id = (SELECT m.id FROM public.catalog_models m JOIN public.catalog_brands br ON br.id = m.brand_id
                     WHERE m.name = 'Octavia' AND br.name = 'Škoda')
  JOIN public.catalog_body_types b ON b.name = 'Estate Cross'
  JOIN public.catalog_engines e ON e.code = v.engine_code AND e.power_kw = v.power_kw
  JOIN public.transmission_units t ON t.code = v.unit_code
  JOIN public.drivetrain_systems d ON d.code = v.drivetrain_code
)
INSERT INTO public.catalog_vehicle_configurations (phase_id, body_type_id, engine_id, unit_id, drivetrain_id, fuel_consumption_l100km)
SELECT r.phase_id, r.body_type_id, r.engine_id, r.unit_id, r.drivetrain_id, r.consumption
FROM r
WHERE NOT EXISTS (
  SELECT 1 FROM public.catalog_vehicle_configurations c
  WHERE c.phase_id = r.phase_id AND c.body_type_id = r.body_type_id AND c.engine_id = r.engine_id
    AND c.unit_id = r.unit_id AND c.drivetrain_id IS NOT DISTINCT FROM r.drivetrain_id
);

-- Guards: 2 dimension rows, 2 + 5 Scout configurations, and the Combi phases unchanged (47 / 61
-- before this file -> 49 / 66 after).
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.phase_body_dimensions d
    JOIN public.catalog_phases p ON p.id = d.phase_id JOIN public.catalog_body_types b ON b.id = d.body_type_id
   WHERE p.generation_code = '1Z' AND b.name = 'Estate Cross';
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 Estate Cross dimension rows, found % -- rolled back', n; END IF;

  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations c
    JOIN public.catalog_phases p ON p.id = c.phase_id JOIN public.catalog_body_types b ON b.id = c.body_type_id
   WHERE p.generation_code = '1Z' AND p.phase_label = 'Pre-facelift' AND b.name = 'Estate Cross';
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 pre-facelift Scout configurations, found % -- rolled back', n; END IF;

  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations c
    JOIN public.catalog_phases p ON p.id = c.phase_id JOIN public.catalog_body_types b ON b.id = c.body_type_id
   WHERE p.generation_code = '1Z' AND p.phase_label = 'Facelift' AND b.name = 'Estate Cross';
  IF n <> 5 THEN RAISE EXCEPTION 'Expected 5 facelift Scout configurations, found % -- rolled back', n; END IF;

  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations c
    JOIN public.catalog_phases p ON p.id = c.phase_id
    JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'Octavia' AND p.generation_code = '1Z';
  IF n <> 115 THEN RAISE EXCEPTION 'Octavia 1Z should have 115 configurations (47 + 2 + 61 + 5), has % -- rolled back', n; END IF;
END $$;

COMMIT;
