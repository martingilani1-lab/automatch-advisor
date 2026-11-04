-- has_scr -> has_adblue, and strict DPF / AdBlue flags on diesel engines (Martin, 2026-11-04).
--
-- Why:
--   * "AdBlue" is the word a buyer (and the TCO calculator) works with; SCR is the system name.
--     Renamed, not duplicated: 20261104202000 added has_scr only hours ago and nothing has filled
--     it yet (0 non-NULL rows, checked live).
--   * For a diesel, DPF and AdBlue must always be a definite Yes or No: a diesel WITHOUT a DPF is
--     a selling point, so "No" is valuable data -- and both flags will drive TCO later (low-SAPS
--     oil pricing, AdBlue cost, city-driving DPF risk). A NULL there would make the calculator
--     guess.
--
-- How "strict" is enforced without inventing data: the 48 live diesel engines have no recorded
-- value yet, and defaulting them to false would falsely claim "no DPF" on Euro 5/6 engines that
-- certainly have one. So the CHECK is added NOT VALID:
--   * every NEW diesel engine, and every UPDATE of an existing diesel row, must set both flags;
--   * the 48 existing rows are left as they are until they are filled;
--   * once they are, run   ALTER TABLE public.catalog_engines VALIDATE CONSTRAINT
--     catalog_engines_diesel_flags_check;   and the rule then holds for every row.
-- Side effect to know about: an UPDATE of an existing diesel engine (e.g. a maintenance fill)
-- fails until that engine's DPF / AdBlue flags are set in the same UPDATE.
-- has_gpf stays nullable -- petrol engines show it only when it is true.
--
-- ALTER: human-run only, in a FRESH SQL editor tab.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.catalog_engines WHERE has_scr IS NOT NULL) THEN
    RAISE EXCEPTION 'has_scr already holds data -- review before renaming; rolled back';
  END IF;
END $$;

ALTER TABLE public.catalog_engines RENAME COLUMN has_scr TO has_adblue;

ALTER TABLE public.catalog_engines
  ADD CONSTRAINT catalog_engines_diesel_flags_check
  CHECK (fuel_type <> 'diesel' OR (has_dpf IS NOT NULL AND has_adblue IS NOT NULL)) NOT VALID;

COMMIT;
