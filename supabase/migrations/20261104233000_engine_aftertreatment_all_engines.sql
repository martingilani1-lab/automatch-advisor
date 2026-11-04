-- After-treatment written out for EVERY engine, not just diesels (Martin, 2026-11-04: "if it
-- doesn't have a DPF, write it for each engine" + "did you also check the petrol particulate
-- filter?"). After this, has_dpf / has_adblue / has_gpf are a definite true/false on every
-- engine except the one petrol GPF still to confirm (CHYB 59 kW, below).
--
-- Certain by engine type (no per-engine judgement involved):
--   * every petrol / LPG engine: has_dpf = false, has_adblue = false -- a diesel particulate
--     filter and SCR/AdBlue are diesel-only systems.
--   * every diesel engine: has_gpf = false -- a GPF is the petrol counterpart of the DPF.
--
-- Petrol particulate filter (GPF / OPF), per engine code (Claude's proposal, Martin to review):
--   * true  -- the 28 Euro 6d / 6e direct-injection TSI / TFSI codes (incl. the eTSI MHEVs and
--     the 1.4 eHybrid PHEV): VAG fitted a GPF to its direct-injection petrols for Euro 6c /
--     6d-TEMP (from 2017-18), and these codes are the GPF-era ones.
--   * false -- every Euro 2-5 petrol and the LPG engine (years before the first VAG GPF in
--     2017), and the plain Euro 6 codes: when VAG added the GPF it issued NEW engine codes
--     (e.g. 1.0 TSI CHZD -> DKRF, 2.0 TSI CHHB -> DKZA), so these codes themselves never had
--     one. Plus ARY (1.8T, 1998-2006, emission standard not recorded).
--   * NULL (left unknown) -- CHYB 59 kW, the Fabia IV's 1.0 MPI (Euro 6d, port injection):
--     port-injected petrols often met Euro 6d without a GPF, but not confirmed for this code.
--
-- UPDATE of existing data: human-run only, in a FRESH SQL editor tab. Touches only NULL cells;
-- every step is count-guarded.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  -- 1. Non-diesels: no DPF, no AdBlue.
  UPDATE public.catalog_engines SET has_dpf = false, has_adblue = false
   WHERE fuel_type <> 'diesel' AND has_dpf IS NULL AND has_adblue IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 95 THEN RAISE EXCEPTION 'Expected 95 petrol/LPG engines (no DPF/AdBlue), updated % -- rolled back', n; END IF;

  -- 2. Diesels: no GPF.
  UPDATE public.catalog_engines SET has_gpf = false WHERE fuel_type = 'diesel' AND has_gpf IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 48 THEN RAISE EXCEPTION 'Expected 48 diesel engines (no GPF), updated % -- rolled back', n; END IF;

  -- 3. Petrol GPF fitted: the 28 Euro 6d/6e direct-injection codes.
  WITH y(code, power_kw) AS (VALUES
    ('DADA'::text, 110::integer), ('DFYA', 110), ('DGEA', 110), ('DKNA', 180), ('DKTB', 180),
    ('DKZA', 140), ('DKZA', 150), ('DLAA', 81), ('DLAB', 81), ('DLVB', 110), ('DMSA', 150),
    ('DNFB', 228), ('DNFB', 245), ('DNFC', 221), ('DNFC', 228), ('DNFC', 245), ('DNFG', 235),
    ('DNND', 152), ('DNPA', 180), ('DNPA', 195), ('DNPA', 150), ('DNUA', 200), ('DNWB', 287),
    ('DNWC', 294), ('DPBC', 100), ('DPBE', 84), ('DNFE', 195), ('DXDB', 110)
  )
  UPDATE public.catalog_engines e SET has_gpf = true
    FROM y
   WHERE e.code = y.code AND e.power_kw = y.power_kw AND e.fuel_type = 'petrol' AND e.has_gpf IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 28 THEN RAISE EXCEPTION 'Expected 28 petrol engines with a GPF, updated % -- rolled back', n; END IF;

  -- 4. Every other petrol / LPG engine: no GPF -- except CHYB 59 kW, left unknown.
  UPDATE public.catalog_engines SET has_gpf = false
   WHERE fuel_type <> 'diesel' AND has_gpf IS NULL AND NOT (code = 'CHYB' AND power_kw = 59);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 66 THEN RAISE EXCEPTION 'Expected 66 petrol/LPG engines without a GPF, updated % -- rolled back', n; END IF;

  -- Only CHYB 59 kW may still be open.
  SELECT count(*) INTO n FROM public.catalog_engines
   WHERE has_dpf IS NULL OR has_adblue IS NULL OR has_gpf IS NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected exactly 1 engine still open (CHYB 59 kW), found % -- rolled back', n; END IF;
END $$;

COMMIT;
