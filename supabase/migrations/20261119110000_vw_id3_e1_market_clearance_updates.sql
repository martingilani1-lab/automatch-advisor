-- VW ID.3 (E1): market re-check of 2026-11-19 and the facelift ground clearance.
-- Source: docs/intake/research/vw-id3-e1-completion.md, section 12 (decisions X11, X12).
--
-- Market (asking prices, listings read 2026-11-19, CZK at the ECB rate of 2026-11-18, 24.386; ~10 % cut at each end):
--   Pre-facelift, SK (bazos.sk + autobazar.eu, 42 unique ads):  17 490 / 19 990 / 22 490 -> 17 000 / 19 990 / 22 490;
--     mileage '50,629 - 157,000 km' -> '27,000 - 172,000 km' (kept listings, the 5 500 km car left out of the mileage
--     range as with the Zoe, D5).
--   Facelift, CZ (sauto.cz + bazos.cz, 20 unique ads):  25 554 / 28 701 / 32 765 -> 26 040 / 28 701 / 32 765;
--     mileage '10,000 - 45,000 km' unchanged.
-- Ground clearance: Facelift body NULL -> 150 mm (VW Norway technical data 2024, "Bakkeklaring, cm 15" -- X11);
--   Pre-facelift stays NULL (no manufacturer figure).
--
-- UPDATE: MARTIN RUNS THIS FILE (not the agent). Fresh SQL editor tab, whole file at once (rule 6). Written against the
-- live rows of 2026-11-19; re-check the guards if it waits more than a day (rule 6b). Prices go stale -- re-run the
-- market pass if this waits more than a few weeks.

BEGIN;

DO $$
DECLARE n int; pre uuid; fl uuid;
BEGIN
  SELECT p.id INTO pre FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'ID.3' AND p.phase_label = 'Pre-facelift' AND p.generation_code = 'E1';
  SELECT p.id INTO fl FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'ID.3' AND p.phase_label = 'Facelift' AND p.generation_code = 'E1';
  IF pre IS NULL OR fl IS NULL THEN RAISE EXCEPTION 'ID.3 (E1) phases not found -- rolled back'; END IF;

  UPDATE public.catalog_phases
     SET price_range_min_eur = 17000, typical_mileage_range = '27,000 - 172,000 km'
   WHERE id = pre AND price_range_min_eur = 17490 AND avg_market_price_eur = 19990 AND price_range_max_eur = 22490
     AND typical_mileage_range = '50,629 - 157,000 km';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Pre-facelift market: live values changed (updated %) -- rolled back', n; END IF;

  UPDATE public.catalog_phases
     SET price_range_min_eur = 26040
   WHERE id = fl AND price_range_min_eur = 25554 AND avg_market_price_eur = 28701 AND price_range_max_eur = 32765
     AND typical_mileage_range = '10,000 - 45,000 km';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Facelift market: live values changed (updated %) -- rolled back', n; END IF;

  UPDATE public.phase_body_dimensions
     SET ground_clearance_mm = 150
   WHERE phase_id = fl AND ground_clearance_mm IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Facelift body: expected 1 row with NULL ground clearance, updated % -- rolled back', n; END IF;
END $$;

COMMIT;
