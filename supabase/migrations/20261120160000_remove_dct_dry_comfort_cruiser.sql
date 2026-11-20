-- comfort_cruiser no longer counts a dry dual-clutch gearbox as an automatic (Martin, 2026-11-20).
--
-- Why: checking the Superb 3V 1.4 TSI 110 kW -- a DQ200 (family 'dct_dry', reliability 2) is not
-- "premium comfort". The rule in 20261120120000_seed_tag_rules_round3.sql now excludes 'dct_dry'
-- (same exclusion as heavy_tower). This file removes the 12 live rows it no longer gives:
-- Passat 3G 1.4 / 1.5 / 1.8 TSI DQ200 (estate, sedan), Superb 3V 1.4 / 1.8 TSI DQ200 ...
--
-- Knock-on: 4 of those (the D-segment 1.8 TSI 132 kW DQ200 cars) then qualify for highway_cruiser's
-- petrol-automatic branch -- re-running round 3 adds them. Either order works: if round 3 is re-run
-- first those 4 briefly carry both cruiser tags, and this file's final check confirms the overlap is
-- 0 once the comfort rows are gone.
--
-- DESTRUCTIVE -- Martin runs this himself, in a FRESH SQL editor tab. One transaction, guarded; the
-- expected count is the live preview of 2026-11-20 (rule 6b: if it changed, re-check and rewrite).

BEGIN;

DO $$
DECLARE n integer; overlap integer;
BEGIN
  SELECT count(*) INTO n
  FROM public.catalog_configuration_tags ct
  JOIN public.catalog_vehicle_configurations vc ON vc.id = ct.configuration_id
  JOIN public.transmission_units t ON t.id = vc.unit_id
  WHERE ct.tag_slug = 'comfort_cruiser' AND t.family = 'dct_dry';
  IF n <> 12 THEN
    RAISE EXCEPTION 'Expected 12 comfort_cruiser rows on a dry DCT, found % -- re-check and rewrite this file. Rolled back', n;
  END IF;

  DELETE FROM public.catalog_configuration_tags ct
  USING public.catalog_vehicle_configurations vc, public.transmission_units t
  WHERE vc.id = ct.configuration_id AND t.id = vc.unit_id
    AND ct.tag_slug = 'comfort_cruiser' AND t.family = 'dct_dry';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 12 THEN RAISE EXCEPTION 'Deleted % rows, expected 12 -- rolled back', n; END IF;

  SELECT count(*) INTO overlap
  FROM public.catalog_configuration_tags a
  JOIN public.catalog_configuration_tags b ON b.configuration_id = a.configuration_id
  WHERE a.tag_slug = 'highway_cruiser' AND b.tag_slug = 'comfort_cruiser';
  IF overlap <> 0 THEN
    RAISE EXCEPTION '% configurations carry both cruiser tags -- rolled back', overlap;
  END IF;

  RAISE NOTICE 'Removed 12 comfort_cruiser rows on dry-DCT configurations';
END $$;

COMMIT;
