-- Octavia II (1Z) Facelift: combined fuel consumption (NEDC, l/100 km) for the configurations
-- seeded empty in 20261103100000 (Martin, 2026-11-03: "consumption for each configuration is
-- missing").
--
-- Sources (no official Škoda price list was reachable from here -- the MY2010 ceník PDFs on
-- skodaoctavia.cz block automated reading):
--   [A] auto-data.net, Octavia II (facelift 2009) + Octavia II Combi (facelift 2009) generation
--       pages -- covers both bodies. cartop.cz shows identical figures (same database, so NOT a
--       second independent source).
--   [C] cars-data.com, Octavia Combi Facelift 2009 -- lists CO2 next to every figure
--       (type-approval data); used only where [A] has no figure.
--   Where only the Combi figure exists, the Liftback gets the same value -- the same rule Martin
--   accepted for the new engines (NEDC figures of this car are body-independent in [A] for
--   every engine both bodies list).
--
--   [M] Martin, 2026-11-03 (official NEDC) -- the 17 rows no source separated: BXE vs BLS
--       (same figures for both codes), BMM, BKD 4x4, CDAA 4x4 DSG.
--
-- Body-specific corrections of existing values (Martin, 2026-11-03), part 2 below:
--   CCZA Combi manual 7.2 -> 7.5 (Liftback stays 7.2) · CEGA Combi manual 5.7 -> 5.9 (Liftback
--   stays 5.7) · CAYC Combi 4x4 5.3 -> 5.4. CGGA stays 6.4 for both bodies (the homologation
--   figure; [A]'s 7.0 is likely real-world).
--
-- UPDATE of existing rows: human-run only, in a FRESH SQL editor tab. Part 1 fills NULLs only
-- (exactly 47 rows); part 2 changes 3 values, each guarded on its old value (exactly 3 rows).
-- Afterwards every Octavia 1Z Facelift configuration has a figure -- checked at the end.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  WITH v(engine_code, power_kw, body, unit_code, drivetrain_code, consumption) AS (VALUES
    ('BSE'::text,   75::integer, 'Liftback'::text, 'VW MQ200'::text,            NULL::text,    7.4::numeric),  -- [A]
    ('BSE',         75,          'Estate',         'VW MQ200',                  NULL,          7.4),           -- [A][C]
    ('BSE',         75,          'Liftback',       'Aisin 09G (TF-60SN)',       NULL,          7.9),           -- [A]
    ('BSE',         75,          'Estate',         'Aisin 09G (TF-60SN)',       NULL,          7.9),           -- [A]
    ('CBZB',        77,          'Estate',         'VW MQ250',                  NULL,          5.7),           -- [A][C]
    ('CBZB',        77,          'Liftback',       'VW DQ200',                  NULL,          5.9),           -- [C] Combi figure
    ('CBZB',        77,          'Estate',         'VW DQ200',                  NULL,          5.9),           -- [C]
    ('CAXA',        90,          'Liftback',       'VW MQ250',                  NULL,          6.6),           -- [A]
    ('CAXA',        90,          'Estate',         'VW MQ250',                  NULL,          6.6),           -- [A][C]
    ('CAXA',        90,          'Estate',         'VW DQ200',                  NULL,          6.3),           -- [A][C]
    ('CDAA',       118,          'Liftback',       'VW MQ250',                  NULL,          7.0),           -- [A]
    ('CDAA',       118,          'Estate',         'VW MQ250',                  NULL,          7.0),           -- [A] ([C] 6.9)
    ('CDAA',       118,          'Liftback',       'VW DQ200',                  NULL,          6.8),           -- [A]
    ('CDAA',       118,          'Estate',         'VW DQ200',                  NULL,          6.8),           -- [A] ([C] 6.6)
    ('CDAA',       118,          'Estate',         'VW MQ350',                  'haldex_gen4', 7.7),           -- [A][C]
    ('CCZA',       147,          'Liftback',       'VW DQ250',                  NULL,          7.7),           -- [A]
    ('CCZA',       147,          'Estate',         'VW DQ250',                  NULL,          7.7),           -- [A][C]
    ('CAYC',        77,          'Estate',         'VW MQ200',                  NULL,          4.5),           -- [A][C]
    ('CAYC',        77,          'Estate',         'VW DQ200',                  NULL,          4.7),           -- [C]
    ('BKD',        103,          'Liftback',       'VW MQ350',                  NULL,          5.5),           -- [A] "2.0 TDI PD 16V"
    ('BKD',        103,          'Estate',         'VW MQ350',                  NULL,          5.5),           -- [A]
    ('BKD',        103,          'Liftback',       'VW DQ250',                  NULL,          6.0),           -- [A]
    ('BKD',        103,          'Estate',         'VW DQ250',                  NULL,          6.0),           -- [A]
    ('CFHC',       103,          'Liftback',       'VW MQ350',                  NULL,          5.7),           -- [A]
    ('CFHC',       103,          'Estate',         'VW MQ350',                  NULL,          5.7),           -- [A][C]
    ('CFHC',       103,          'Liftback',       'VW DQ250',                  NULL,          5.9),           -- [A]
    ('CFHC',       103,          'Estate',         'VW DQ250',                  NULL,          5.9),           -- [A][C]
    ('CFHC',       103,          'Estate',         'VW MQ350',                  'haldex_gen4', 6.3),           -- [A][C]
    ('CEGA',       125,          'Liftback',       'VW DQ250',                  NULL,          6.0),           -- [A]
    ('CEGA',       125,          'Estate',         'VW DQ250',                  NULL,          6.0),           -- [A][C]
    ('BXE',         77,          'Liftback',       'VW MQ200',                  NULL,          4.9),           -- [M]
    ('BXE',         77,          'Estate',         'VW MQ200',                  NULL,          5.1),           -- [M]
    ('BXE',         77,          'Liftback',       'VW DQ250',                  NULL,          5.8),           -- [M]
    ('BXE',         77,          'Estate',         'VW DQ250',                  NULL,          5.9),           -- [M]
    ('BXE',         77,          'Estate',         'VW MQ350',                  'haldex_gen4', 6.0),           -- [M]
    ('BLS',         77,          'Liftback',       'VW MQ200',                  NULL,          4.9),           -- [M]
    ('BLS',         77,          'Estate',         'VW MQ200',                  NULL,          5.1),           -- [M]
    ('BLS',         77,          'Liftback',       'VW DQ250',                  NULL,          5.8),           -- [M]
    ('BLS',         77,          'Estate',         'VW DQ250',                  NULL,          5.9),           -- [M]
    ('BLS',         77,          'Estate',         'VW MQ350',                  'haldex_gen4', 6.0),           -- [M]
    ('BMM',        103,          'Liftback',       'VW MQ350',                  NULL,          5.5),           -- [M]
    ('BMM',        103,          'Estate',         'VW MQ350',                  NULL,          5.5),           -- [M]
    ('BMM',        103,          'Liftback',       'VW DQ250',                  NULL,          6.0),           -- [M]
    ('BMM',        103,          'Estate',         'VW DQ250',                  NULL,          6.0),           -- [M]
    ('BMM',        103,          'Estate',         'VW MQ350',                  'haldex_gen4', 6.3),           -- [M]
    ('BKD',        103,          'Estate',         'VW MQ350',                  'haldex_gen4', 6.3),           -- [M]
    ('CDAA',       118,          'Estate',         'VW DQ250',                  'haldex_gen4', 7.7)            -- [M]
  )
  UPDATE public.catalog_vehicle_configurations c
     SET fuel_consumption_l100km = v.consumption
    FROM v, public.catalog_phases p, public.catalog_models m, public.catalog_engines e,
         public.catalog_body_types b, public.transmission_units t
   WHERE p.id = c.phase_id AND m.id = p.model_id AND e.id = c.engine_id AND b.id = c.body_type_id AND t.id = c.unit_id
     AND m.name = 'Octavia' AND p.generation_code = '1Z' AND p.phase_label = 'Facelift'
     AND e.code = v.engine_code AND e.power_kw = v.power_kw AND b.name = v.body AND t.code = v.unit_code
     AND c.drivetrain_id IS NOT DISTINCT FROM (SELECT d.id FROM public.drivetrain_systems d WHERE d.code = v.drivetrain_code)
     AND c.fuel_consumption_l100km IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 47 THEN RAISE EXCEPTION 'Expected 47 empty Octavia 1Z FL rows, updated % -- rolled back', n; END IF;

  -- Part 2: Combi-specific corrections, guarded on the old value.
  WITH v(engine_code, power_kw, unit_code, drivetrain_code, old_value, new_value) AS (VALUES
    ('CCZA'::text, 147::integer, 'VW MQ350'::text, NULL::text,    7.2::numeric, 7.5::numeric),
    ('CEGA',       125,          'VW MQ350',       NULL,          5.7,          5.9),
    ('CAYC',        77,          'VW MQ350',       'haldex_gen4', 5.3,          5.4)
  )
  UPDATE public.catalog_vehicle_configurations c
     SET fuel_consumption_l100km = v.new_value
    FROM v, public.catalog_phases p, public.catalog_models m, public.catalog_engines e,
         public.catalog_body_types b, public.transmission_units t
   WHERE p.id = c.phase_id AND m.id = p.model_id AND e.id = c.engine_id AND b.id = c.body_type_id AND t.id = c.unit_id
     AND m.name = 'Octavia' AND p.generation_code = '1Z' AND p.phase_label = 'Facelift'
     AND b.name = 'Estate'
     AND e.code = v.engine_code AND e.power_kw = v.power_kw AND t.code = v.unit_code
     AND c.drivetrain_id IS NOT DISTINCT FROM (SELECT d.id FROM public.drivetrain_systems d WHERE d.code = v.drivetrain_code)
     AND c.fuel_consumption_l100km = v.old_value;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'Expected 3 Combi corrections, updated % -- rolled back', n; END IF;

  -- Nothing left empty.
  SELECT count(*) INTO n
    FROM public.catalog_vehicle_configurations c
    JOIN public.catalog_phases p ON p.id = c.phase_id
    JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'Octavia' AND p.generation_code = '1Z' AND p.phase_label = 'Facelift'
     AND c.fuel_consumption_l100km IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION '% Octavia 1Z FL configurations still without consumption -- rolled back', n; END IF;
END $$;

COMMIT;
