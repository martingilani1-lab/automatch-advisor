-- Fill the empty columns of two EXISTING reference rows (Martin, 2026-11-03), found missing
-- during the Octavia 1Z Facelift import:
--   * CDAA 1.8 TSI 118 kW -- had only oil capacity (4.6 l, matches Martin's figure) and 1 fault.
--     Its 2 new faults are additive and live in 20261103100000.
--   * haldex_gen4 -- had no service cost.
--   * BSE 1.6 MPI -- gains alt code BSF; reliability and yearly max per Martin (see below).
--     Unlike the other two, this one DOES change hand-authored values (4 -> 5, 220 -> 250).
--
-- Only NULL columns are filled; nothing hand-authored is overwritten (each SET is guarded by
-- the row still being empty, and the block rolls back unless exactly 1 row per table changes).
--
-- Interval deliberately stays 40 000 km (Martin, 2026-11-03): VAG's official 60 000 km / 3 years
-- is too long -- the Gen 4 pump's small mesh strainer clogs with clutch friction material, and
-- stretched fluid changes are a primary cause of premature pump death. 3 years is kept as the
-- time limit.
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

  -- BSE <- BSF (Martin, 2026-11-03): BSF is the same 1.6 MPI without the secondary-air pump --
  -- an alternate code of the same unit (CLAUDE.md rule 3), so alt_codes, not a new engine.
  -- Martin's call on the merged row: reliability 4 -> 5, yearly max EUR 220 -> 250 (current parts
  -- prices on an ageing engine). BSE is used only by Octavia 1Z today. Guarded on the old values
  -- so a row edited since is not overwritten.
  UPDATE public.catalog_engines
     SET alt_codes = array_append(coalesce(alt_codes, '{}'::text[]), 'BSF'),
         reliability_rating = 5,
         yearly_maintenance_eur_max = 250
   WHERE code = 'BSE' AND power_kw = 75
     AND NOT ('BSF' = ANY (coalesce(alt_codes, '{}'::text[])))
     AND reliability_rating = 4 AND yearly_maintenance_eur_min = 150 AND yearly_maintenance_eur_max = 220;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 BSE row with the old values, updated % -- rolled back', n; END IF;

  UPDATE public.drivetrain_systems
     SET service_cost_eur_min   = 100,
         service_cost_eur_max   = 100,
         service_interval_years = 3   -- service_interval_km stays 40000, see header
   WHERE code = 'haldex_gen4'
     AND service_cost_eur_min IS NULL AND service_cost_eur_max IS NULL AND service_interval_years IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 empty haldex_gen4 row, updated % -- rolled back', n; END IF;
END $$;

COMMIT;
