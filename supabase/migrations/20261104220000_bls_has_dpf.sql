-- 1.9 TDI PD BLS 77 kW: factory DPF (Martin, 2026-11-04) -- the very thing that separates it
-- from the BXE (see 20261103100000's near-duplicate reason).
--
-- has_adblue is set in the same UPDATE because catalog_engines_diesel_flags_check
-- (20261104210000, live) rejects any update of a diesel row that leaves either flag NULL.
-- false = a known fact: BLS is a Euro 4 pump-injector diesel, and SCR / AdBlue only arrived on
-- VAG passenger diesels with Euro 6 common-rail engines.
--
-- UPDATE of existing data: human-run only, in a FRESH SQL editor tab. Guarded to exactly 1 row
-- that is still unset.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  UPDATE public.catalog_engines
     SET has_dpf = true, has_adblue = false
   WHERE code = 'BLS' AND power_kw = 77 AND fuel_type = 'diesel'
     AND has_dpf IS NULL AND has_adblue IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 unset BLS row, updated % -- rolled back', n; END IF;
END $$;

COMMIT;
