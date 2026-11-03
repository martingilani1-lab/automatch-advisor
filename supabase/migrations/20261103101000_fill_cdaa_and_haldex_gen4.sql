-- Fill the empty columns of two EXISTING reference rows (Martin, 2026-11-03), found missing
-- during the Octavia 1Z Facelift import:
--   * CDAA 1.8 TSI 118 kW -- had only oil capacity (4.6 l, matches Martin's figure) and 1 fault.
--     Its 2 new faults are additive and live in 20261103100000.
--   * haldex_gen4 -- had no service cost.
--
-- Only NULL columns are filled; nothing hand-authored is overwritten (each SET is guarded by
-- the row still being empty, and the block rolls back unless exactly 1 row per table changes).
--
-- OPEN -- interval: Martin gives the Haldex Gen 4 fluid change as every 60 000 km / 3 years;
-- the live row says 40 000 km and its maintenance_note says "~40-50k km". The interval line is
-- commented out until Martin decides which stands (60k is the VAG schedule; 40-50k is the
-- enthusiast advice already in the note).
--
-- UPDATE of existing data: human-run only, in a FRESH SQL editor tab.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  UPDATE public.catalog_engines
     SET reliability_rating         = 2,
         oil_change_interval_km     = 15000,
         yearly_maintenance_eur_min = 400,
         yearly_maintenance_eur_max = 700,
         pros = ARRAY['Smooth power delivery', 'Quiet operation']::text[],
         cons = ARRAY['Design flaws in piston rings and timing chain tensioner']::text[]
   WHERE code = 'CDAA' AND power_kw = 118
     AND reliability_rating IS NULL AND oil_change_interval_km IS NULL
     AND yearly_maintenance_eur_min IS NULL AND pros IS NULL AND cons IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 empty CDAA row, updated % -- rolled back', n; END IF;

  UPDATE public.drivetrain_systems
     SET service_cost_eur_min   = 100,
         service_cost_eur_max   = 100,
         service_interval_years = 3
         -- , service_interval_km = 60000   -- OPEN, see header
   WHERE code = 'haldex_gen4'
     AND service_cost_eur_min IS NULL AND service_cost_eur_max IS NULL AND service_interval_years IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 empty haldex_gen4 row, updated % -- rolled back', n; END IF;
END $$;

COMMIT;
