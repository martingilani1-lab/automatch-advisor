-- VW ID.3 (E1) completion, pass 4: corrected battery-recall texts and the 12 V battery cost.
-- Source: docs/intake/research/vw-id3-e1-completion.md, section 3b, decisions X2 and X3.
--
-- UPDATE of existing rows: MARTIN RUNS THIS FILE (not the agent). Run it in a FRESH SQL editor tab (rule 6).
-- Written against the live rows of 2026-11-18. If it waits more than a day, re-check the guards first (rule 6b).
--
-- X2: the live engine recall rows mix two VW campaigns.
--   93MI (KBA 16271R, EU Safety Gate SR/00953/26, 04/2026): built 17.02.2022-23.08.2024, modules out of spec --
--        range loss, yellow lamp, overheating while charging; software update + module check / replacement.
--   93MF (EU Safety Gate SR/03126/26, 11/2026; UK R/2026/397): built 13.07.2022-06.06.2025, cells overheat at a high
--        state of charge; charge limited to 80 % until repaired.
--   The live "02/2022-08/2024" row cited UK R/2026/397 and the 80 % advice, which belong to 93MF; the live
--   "10/2022-04/2025 (UK R/2026/150)" row described only the UK self-discharge check. Years are NOT changed
--   (2022-2024 and 2022-2025 already cover both campaigns); 7 motors each, as before.
-- X3: 12 V battery replacement 456 EUR (ADAC long-term test 2026, German VW dealer, fitted) on both 12 V rows.

BEGIN;

DO $$
DECLARE n int; pre uuid; fl uuid;
BEGIN
  SELECT p.id INTO pre FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'ID.3' AND p.phase_label = 'Pre-facelift' AND p.generation_code = 'E1';
  SELECT p.id INTO fl FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'ID.3' AND p.phase_label = 'Facelift' AND p.generation_code = 'E1';
  IF pre IS NULL OR fl IS NULL THEN RAISE EXCEPTION 'ID.3 (E1) phases not found -- rolled back'; END IF;

  -- 93MI row (7 motors).
  UPDATE public.catalog_component_faults f
     SET fault = 'Recall: ID.3 built 02/2022–08/2024 (VW campaign 93MI, KBA 16271R; EU Safety Gate SR/00953/26, 04/2026) — high-voltage battery modules out of specification can lose range, light the yellow warning lamp and overheat while charging, with a fire risk; software update, modules checked and replaced where needed.',
         pre_purchase_check = 'Ask a Volkswagen dealer to confirm campaign 93MI is closed for this VIN; check no yellow battery warning is shown.'
    FROM public.catalog_engines e
   WHERE e.id = f.engine_id AND f.component_type = 'engine'
     AND e.code ~ '^(EBJ|EDC|EDF|EEW)-'
     AND f.fault LIKE 'Recall: ID.3 built 02/2022–08/2024 (ADAC, 03/2026; UK R/2026/397)%'
     AND f.affected_year_from = 2022 AND f.affected_year_to = 2024;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 7 THEN RAISE EXCEPTION '93MI: expected 7 rows, updated % -- rolled back (live text changed? re-check)', n; END IF;

  -- 93MF row (7 motors).
  UPDATE public.catalog_component_faults f
     SET fault = 'Recall: ID.3 built 07/2022–06/2025 (VW campaign 93MF; EU Safety Gate SR/03126/26, 11/2026; UK R/2026/397) — battery cells can overheat at a high state of charge, with a fire risk; charging is limited to 80 % until the battery is checked and repaired. In the UK, cars built 10/2022–04/2025 also had a battery check for cells with raised self-discharge (R/2026/150).',
         pre_purchase_check = 'Ask a Volkswagen dealer to confirm campaign 93MF is closed for this VIN; a car still limited to 80 % charge has not been repaired.'
    FROM public.catalog_engines e
   WHERE e.id = f.engine_id AND f.component_type = 'engine'
     AND e.code ~ '^(EBJ|EDC|EDF|EEW)-'
     AND f.fault LIKE 'Recall: ID.3 built 10/2022–04/2025 (UK R/2026/150)%'
     AND f.affected_year_from = 2022 AND f.affected_year_to = 2025;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 7 THEN RAISE EXCEPTION '93MF: expected 7 rows, updated % -- rolled back (live text changed? re-check)', n; END IF;

  -- 12 V battery cost (X3), one row per phase, only while still NULL.
  UPDATE public.catalog_component_faults
     SET estimated_cost_eur_min = 456, estimated_cost_eur_max = 456
   WHERE component_type = 'vehicle' AND phase_id IN (pre, fl)
     AND fault LIKE '12 V battery%'
     AND estimated_cost_eur_min IS NULL AND estimated_cost_eur_max IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION '12 V cost: expected 2 rows, updated % -- rolled back', n; END IF;

  -- Post-checks.
  SELECT count(*) INTO n FROM public.catalog_component_faults f JOIN public.catalog_engines e ON e.id = f.engine_id
   WHERE e.code ~ '^(EBJ|EDC|EDF|EEW)-' AND (f.fault LIKE '%93MI%' OR f.fault LIKE '%93MF%');
  IF n <> 14 THEN RAISE EXCEPTION 'Post-check: expected 14 recall rows with a campaign code, found % -- rolled back', n; END IF;
END $$;

COMMIT;
