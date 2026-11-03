-- Corrections of EXISTING values (Martin, 2026-11-03), found while completing the Octavia II (1Z)
-- Pre-facelift:
--   1. Three pre-facelift consumption figures that didn't fit Martin's official NEDC set:
--        1.9 TDI BXE Liftback DSG          5.4 -> 5.8
--        1.6 MPI BSE Liftback 09G automatic 8.2 -> 7.9 (below the Combi's 8.0)
--        2.0 TDI BKD Combi DSG              5.5 -> 6.0
--   2. CCZA maintenance_note: drop the "EA888 Gen 2" label (Martin: sources disagree on the EA888
--      generation split, so no engine text names a generation). Same content otherwise.
--
-- UPDATE of existing data: human-run only, in a FRESH SQL editor tab. Every change is guarded on
-- its old value; rolls back unless exactly 3 + 1 rows change.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  WITH v(engine_code, power_kw, body, unit_code, old_value, new_value) AS (VALUES
    ('BXE'::text,  77::integer, 'Liftback'::text, 'VW DQ250'::text,            5.4::numeric, 5.8::numeric),
    ('BSE',        75,          'Liftback',       'Aisin 09G (TF-60SN)',       8.2,          7.9),
    ('BKD',       103,          'Estate',         'VW DQ250',                  5.5,          6.0)
  )
  UPDATE public.catalog_vehicle_configurations c
     SET fuel_consumption_l100km = v.new_value
    FROM v, public.catalog_phases p, public.catalog_models m, public.catalog_engines e,
         public.catalog_body_types b, public.transmission_units t
   WHERE p.id = c.phase_id AND m.id = p.model_id AND e.id = c.engine_id AND b.id = c.body_type_id AND t.id = c.unit_id
     AND m.name = 'Octavia' AND p.generation_code = '1Z' AND p.phase_label = 'Pre-facelift'
     AND c.drivetrain_id IS NULL
     AND e.code = v.engine_code AND e.power_kw = v.power_kw AND b.name = v.body AND t.code = v.unit_code
     AND c.fuel_consumption_l100km = v.old_value;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'Expected 3 pre-facelift consumption corrections, updated % -- rolled back', n; END IF;

  UPDATE public.catalog_engines
     SET maintenance_note = replace(maintenance_note, 'the EA888 Gen 2 timing-chain tensioner', 'the EA888 timing-chain tensioner')
   WHERE code = 'CCZA' AND power_kw = 147
     AND maintenance_note LIKE '%the EA888 Gen 2 timing-chain tensioner%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 CCZA note to reword, updated % -- rolled back', n; END IF;
END $$;

COMMIT;
