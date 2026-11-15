-- !!! SUPERSEDED -- DO NOT RUN. Never run live; replaced on 2026-11-15 by
-- !!! 20261115180000_bmw_i3_facelift_trims_range_market.sql, which does this AND the trim / range /
-- !!! market changes of 20261110233000 against the live state of 2026-11-15. Kept for the record.
--
-- BMW i3 (I01) Facelift: the "i3s" trim row is not a trim, so drop it and record the Sportpaket
-- as an option on the four real interior lines instead.
--
-- Why: the BMW Austria price list (November 2018) gives the i3s its own price line (model code
-- 8P61), so it's a separate model, not an interior line. Its sporty kit is the Sportpaket (SA 330,
-- EUR 1,175): "20" Leichtmetallräder Styling 431 … Fahrzeugverbreiterung … 10mm Tieferlegung mit
-- sportlicher Fahrwerksabstimmung … Im Modell BMW i3s enthalten." Storing the i3s as tier 3
-- next to Lodge suggested it was an interior choice. See docs/intake/research/bmw-i3-i01-facelift.md
-- (section R, source E7).
--
-- Nothing is lost:
--   * "135 kW motor": already on the i3s-94Ah / i3s-120Ah engine rows.
--   * 20" wheels / -10 mm / wider track: now the optional Sportpaket feature below. On the i3s
--     itself it is standard; that's a model fact, which trim features can't express.
--   * "Sport driving mode": no source in the price list, so dropped.
--
-- DELETE + INSERT: human-run, FRESH SQL editor tab. Count-guarded throughout.

BEGIN;

DO $$
DECLARE n int; tid uuid;
BEGIN
  SELECT t.id INTO tid
    FROM public.catalog_trims t
    JOIN public.catalog_phases p ON p.id = t.phase_id
    JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'i3' AND p.generation_code = 'I01' AND p.phase_label = 'Facelift'
     AND t.name = 'i3s';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 i3s trim on the i3 Facelift, found % -- rolled back', n; END IF;

  DELETE FROM public.catalog_trim_features WHERE trim_id = tid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 5 THEN RAISE EXCEPTION 'Expected 5 features on the i3s trim, deleted % -- rolled back', n; END IF;

  DELETE FROM public.catalog_trims WHERE id = tid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected to delete 1 i3s trim, deleted % -- rolled back', n; END IF;

  INSERT INTO public.catalog_trim_features (trim_id, feature, is_optional, feature_group)
  SELECT t.id,
         'Sportpaket: 20-inch alloy wheels, wheel-arch widening, 10 mm lower sport suspension (standard on i3s)',
         true, 'suspension'
    FROM public.catalog_trims t
    JOIN public.catalog_phases p ON p.id = t.phase_id
    JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'i3' AND p.generation_code = 'I01' AND p.phase_label = 'Facelift'
     AND t.name IN ('Atelier', 'Loft', 'Lodge', 'Suite')
     AND NOT EXISTS (SELECT 1 FROM public.catalog_trim_features x
                      WHERE x.trim_id = t.id AND x.feature LIKE 'Sportpaket:%');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN RAISE EXCEPTION 'Expected the Sportpaket on 4 Facelift lines, inserted % -- rolled back', n; END IF;

  -- Post-check: exactly the four interior lines remain on the Facelift.
  SELECT count(*) INTO n
    FROM public.catalog_trims t
    JOIN public.catalog_phases p ON p.id = t.phase_id
    JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'i3' AND p.generation_code = 'I01' AND p.phase_label = 'Facelift';
  IF n <> 4 THEN RAISE EXCEPTION 'Post-check: expected 4 Facelift trims, found % -- rolled back', n; END IF;
END $$;

COMMIT;
