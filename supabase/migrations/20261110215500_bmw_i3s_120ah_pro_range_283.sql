-- BMW i3s (120 Ah): the engine pro still quoted the old range ("270 km WLTP") after
-- 20261110203000 corrected the configuration to 283 km (ADAC). Found by the first local
-- research-car verification run (Martin, 2026-11-10). Text-only change, guarded on the old text.
-- UPDATE: human-run, FRESH SQL editor tab.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  UPDATE public.catalog_engines
     SET pros = array_replace(pros, '37.9 kWh net: 270 km WLTP', '37.9 kWh net: 283 km WLTP')
   WHERE code = 'i3s-120Ah' AND fuel_type = 'electric'
     AND '37.9 kWh net: 270 km WLTP' = ANY (pros);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 i3s 120 Ah engine with the old range text, updated % -- rolled back', n; END IF;
END $$;

COMMIT;
