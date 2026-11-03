-- Octavia II (1Z) 4x4: the 6-speed manual on the AWD cars is the VW MQ350 (02Q), not the MQ250
-- (Martin, 2026-11-03: "MQ350 for ... all 4x4 variants"). Two live rows carry MQ250:
--   * Facelift   1.6 TDI CR (CAYC) 77 kW · Estate · haldex_gen4
--   * Pre-facelift 1.9 TDI PD (BXE) 77 kW · Estate · haldex_gen2
--
-- UPDATE of existing data: human-run only, in a FRESH SQL editor tab. Guarded -- rolls back
-- unless exactly these 2 rows change.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  UPDATE public.catalog_vehicle_configurations c
     SET unit_id = (SELECT id FROM public.transmission_units WHERE code = 'VW MQ350')
    FROM public.catalog_phases p, public.catalog_models m, public.catalog_engines e, public.transmission_units t
   WHERE p.id = c.phase_id AND m.id = p.model_id AND e.id = c.engine_id AND t.id = c.unit_id
     AND m.name = 'Octavia' AND p.generation_code = '1Z'
     AND c.drivetrain_id IS NOT NULL
     AND t.code = 'VW MQ250'
     AND ((p.phase_label = 'Facelift' AND e.code = 'CAYC') OR (p.phase_label = 'Pre-facelift' AND e.code = 'BXE'));
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN
    RAISE EXCEPTION 'Expected 2 Octavia 1Z 4x4 rows on MQ250, updated % -- rolled back', n;
  END IF;
END $$;

COMMIT;
