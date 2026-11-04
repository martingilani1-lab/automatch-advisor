-- DPF / AdBlue for every remaining diesel engine (Martin, 2026-11-04), then switch the strict
-- diesel rule (catalog_engines_diesel_flags_check, added NOT VALID in 20261104210000) on for
-- every row. BLS was set separately (20261104220000).
--
-- Source: Martin's review of Claude's proposal, 2026-11-04.
--   * no DPF, no AdBlue: Euro 2/3 engines (before VAG's first DPFs) and the Euro 4 PD engines
--     sold without a factory filter -- BKD, BXE, BSW (BSW = the New Beetle's BXE-equivalent).
--   * DPF, no AdBlue: BMM, BMN (Euro 4 DPF PD); CAYC, CEGA, CFHC, CLHA (Euro 5 common rail).
--   * DPF, no AdBlue: early Euro 6 EA288 / 1.4 TDI with a NOx storage catalyst instead of SCR --
--     CRBC, CRKB, CUNA, CUSA, CUSB, CUTA, DCXA.
--   * DPF + AdBlue (SCR): every other Euro 6 / 6d / 6e engine, incl. DDYA, DGTE 85 kW (Touran),
--     the A4 B9 four- and six-cylinder TDIs, and the EA288 evo twin-dosing engines.
--   DGTE appears twice on purpose -- two engines with the same code (85 kW Touran, 70 kW Polo).
--
-- UPDATE of existing data: human-run only, in a FRESH SQL editor tab. Only rows still unset
-- are touched; rolls back unless exactly 47 change and no diesel is left unset.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  WITH v(code, power_kw, dpf, adblue) AS (VALUES
    ('AGP'::text, 50::integer, false::boolean, false::boolean),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('AGR', 66, false, false),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('AHF', 81, false, false),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('AJM', 85, false, false),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('ALH', 66, false, false),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('AQM', 50, false, false),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('ARL', 110, false, false),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('ASV', 81, false, false),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('ASZ', 96, false, false),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('ATD', 74, false, false),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('BKD', 103, false, false),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('BXE', 77, false, false),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('BSW', 77, false, false),  -- Euro 2/3, or Euro 4 PD without factory DPF
    ('BMM', 103, true, false),  -- factory DPF, no SCR (Euro 4 DPF PD / Euro 5 common rail)
    ('BMN', 125, true, false),  -- factory DPF, no SCR (Euro 4 DPF PD / Euro 5 common rail)
    ('CAYC', 77, true, false),  -- factory DPF, no SCR (Euro 4 DPF PD / Euro 5 common rail)
    ('CEGA', 125, true, false),  -- factory DPF, no SCR (Euro 4 DPF PD / Euro 5 common rail)
    ('CFHC', 103, true, false),  -- factory DPF, no SCR (Euro 4 DPF PD / Euro 5 common rail)
    ('CLHA', 77, true, false),  -- factory DPF, no SCR (Euro 4 DPF PD / Euro 5 common rail)
    ('CRBC', 110, true, false),  -- early Euro 6 EA288 / 1.4 TDI: NOx storage catalyst (LNT), no AdBlue
    ('CRKB', 81, true, false),  -- early Euro 6 EA288 / 1.4 TDI: NOx storage catalyst (LNT), no AdBlue
    ('CUNA', 135, true, false),  -- early Euro 6 EA288 / 1.4 TDI: NOx storage catalyst (LNT), no AdBlue
    ('CUSA', 55, true, false),  -- early Euro 6 EA288 / 1.4 TDI: NOx storage catalyst (LNT), no AdBlue
    ('CUSB', 66, true, false),  -- early Euro 6 EA288 / 1.4 TDI: NOx storage catalyst (LNT), no AdBlue
    ('CUTA', 77, true, false),  -- early Euro 6 EA288 / 1.4 TDI: NOx storage catalyst (LNT), no AdBlue
    ('DCXA', 88, true, false),  -- early Euro 6 EA288 / 1.4 TDI: NOx storage catalyst (LNT), no AdBlue
    ('DDYA', 85, true, true),  -- SCR + AdBlue
    ('DGTE', 85, true, true),  -- SCR + AdBlue
    ('CUAA', 176, true, true),  -- SCR + AdBlue
    ('DFGA', 110, true, true),  -- SCR + AdBlue
    ('DFEA', 140, true, true),  -- SCR + AdBlue
    ('DFHA', 140, true, true),  -- SCR + AdBlue
    ('DFGC', 85, true, true),  -- SCR + AdBlue
    ('DFFA', 110, true, true),  -- SCR + AdBlue
    ('DTRD', 85, true, true),  -- SCR + AdBlue
    ('DETA', 140, true, true),  -- SCR + AdBlue
    ('DEUA', 110, true, true),  -- SCR + AdBlue
    ('CRTC', 200, true, true),  -- SCR + AdBlue
    ('CSWB', 160, true, true),  -- SCR + AdBlue
    ('DGTD', 59, true, true),  -- SCR + AdBlue
    ('DGTE', 70, true, true),  -- SCR + AdBlue
    ('DEZE', 120, true, true),  -- SCR + AdBlue
    ('DTPA', 150, true, true),  -- SCR + AdBlue
    ('DEWA', 255, true, true),  -- SCR + AdBlue
    ('DTRE', 90, true, true),  -- SCR + AdBlue
    ('DTRF', 75, true, true),  -- SCR + AdBlue
    ('DXNM', 142, true, true)  -- SCR + AdBlue
  )
  UPDATE public.catalog_engines e
     SET has_dpf = v.dpf, has_adblue = v.adblue
    FROM v
   WHERE e.code = v.code AND e.power_kw = v.power_kw AND e.fuel_type = 'diesel'
     AND e.has_dpf IS NULL AND e.has_adblue IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 47 THEN RAISE EXCEPTION 'Expected 47 diesel engines to fill, updated % -- rolled back', n; END IF;

  IF EXISTS (SELECT 1 FROM public.catalog_engines
              WHERE fuel_type = 'diesel' AND (has_dpf IS NULL OR has_adblue IS NULL)) THEN
    RAISE EXCEPTION 'A diesel engine is still missing DPF / AdBlue -- rolled back';
  END IF;
END $$;

-- Every diesel row now satisfies the rule -> enforce it for all rows, not just new ones.
ALTER TABLE public.catalog_engines VALIDATE CONSTRAINT catalog_engines_diesel_flags_check;

COMMIT;
