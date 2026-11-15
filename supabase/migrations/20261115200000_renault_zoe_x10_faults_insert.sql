-- Renault Zoe (X10) Phase 2 completion, part 1 of 2: NEW fault rows only (additive INSERT).
-- Research + Martin's decisions (2026-11-15): docs/intake/research/renault-zoe-x10-completion.md,
-- section 4 (F2, F4-F7, R1-R5) and section 0 (D8 costs, D9 frequency: occasional = 0.02,
-- 12 V wear = 1/4 = 0.25, fixed recalls = cost / probability N/A -> NULL).
--
-- 14 rows:
--   engine (R110@80 and R135@100, both Phase 2-only engines):
--     F2  12 V battery drain on R135 (R110 already has it) .................. 1
--     F4  drive-motor bearing wear .......................................... 2
--     R1  recall 0DA5 (battery, built 23.9.-18.12.2019) ..................... 2
--     R2  recall 0DKQ (52 kWh battery module, built 3.1.-22.2.2021) ......... 2
--     R3  recall 0EBN (HV battery, Flins, built 1.-28.9.2023) ............... 2
--   vehicle (Phase 2):
--     F5  A/C compressor, F6 front suspension, F7 rusting brake discs ...... 3
--     R4  recall 0D9V (steering column motor, built 04-10/2019) ............ 1
--     R5  recall 0E1E (rear seat backrest, built 14.11.-3.12.2022) ......... 1
--
-- Costs are German dealer / forum estimates (no SK / CZ price exists), approved by Martin as D8;
-- NULL where no figure was found. Recalls are dated campaigns, so their build years go in
-- affected_year_from / _to (FIELD-LEVELS: conditional).
--
-- Pure INSERT, no existing row touched. Re-run safe: aborts if any of these texts already exists.
-- May be executed via the Supabase MCP after Martin has reviewed this file (CLAUDE.md).

BEGIN;

DO $$
DECLARE n int; pid uuid; r110 uuid; r135 uuid;
BEGIN
  SELECT p.id INTO pid
    FROM public.catalog_phases p
    JOIN public.catalog_models m ON m.id = p.model_id
    JOIN public.catalog_brands b ON b.id = m.brand_id
   WHERE b.name = 'Renault' AND m.name = 'Zoe' AND p.generation_code = 'X10' AND p.phase_label = 'Phase 2';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 Zoe X10 Phase 2, found % -- rolled back', n; END IF;

  SELECT id INTO r110 FROM public.catalog_engines WHERE code = 'R110' AND power_kw = 80 AND fuel_type = 'electric';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 engine R110@80, found % -- rolled back', n; END IF;
  SELECT id INTO r135 FROM public.catalog_engines WHERE code = 'R135' AND power_kw = 100 AND fuel_type = 'electric';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 engine R135@100, found % -- rolled back', n; END IF;

  -- Re-run guard.
  SELECT count(*) INTO n FROM public.catalog_component_faults
   WHERE (engine_id IN (r110, r135) OR phase_id = pid)
     AND (fault LIKE 'Drive-motor rotor bearings%' OR fault LIKE 'Recall:%' OR fault LIKE 'A/C compressor failure%'
          OR fault LIKE 'Front suspension wears%' OR fault LIKE 'Brake discs rust%');
  IF n <> 0 THEN RAISE EXCEPTION 'Found % Zoe fault rows from this file already -- rolled back', n; END IF;

  SELECT count(*) INTO n FROM public.catalog_component_faults WHERE engine_id = r135 AND fault LIKE '12 V battery drain%';
  IF n <> 0 THEN RAISE EXCEPTION 'R135 already has a 12 V fault -- rolled back'; END IF;

  -- Engine faults.
  WITH v(eng, fault, severity, cost_min, cost_max, prob, y_from, y_to, check_text) AS (VALUES
    ('R135'::text,
     '12 V battery drain — the car won''t wake up although the traction battery is full.'::text,
     'minor'::text, NULL::integer, NULL::integer, 0.25::numeric, NULL::integer, NULL::integer, NULL::text),
    ('R110', 'Drive-motor rotor bearings wear — a hum or whine that rises with speed; a Renault dealer replaces the whole motor, independent EV specialists replace only the bearings.',
     'moderate', 2500, 3500, 0.02, NULL, NULL,
     'Listen for a speed-dependent hum or whine at 30-80 km/h on the test drive.'),
    ('R135', 'Drive-motor rotor bearings wear — a hum or whine that rises with speed; a Renault dealer replaces the whole motor, independent EV specialists replace only the bearings.',
     'moderate', 2500, 3500, 0.02, NULL, NULL,
     'Listen for a speed-dependent hum or whine at 30-80 km/h on the test drive.'),
    ('R110', 'Recall: Zoe built 23.9.–18.12.2019 (Renault campaign 0DA5) — a production defect in the traction battery may cause a short circuit and fire. Fixed under the recall campaign.',
     'critical', NULL, NULL, NULL, 2019, 2019,
     'Ask a Renault dealer to confirm campaign 0DA5 is closed for this VIN.'),
    ('R135', 'Recall: Zoe built 23.9.–18.12.2019 (Renault campaign 0DA5) — a production defect in the traction battery may cause a short circuit and fire. Fixed under the recall campaign.',
     'critical', NULL, NULL, NULL, 2019, 2019,
     'Ask a Renault dealer to confirm campaign 0DA5 is closed for this VIN.'),
    ('R110', 'Recall: Zoe built 3.1.–22.2.2021 with the 52 kWh battery (Renault campaign 0DKQ) — a battery-module defect may cause an internal short circuit and fire; the battery is checked and the module replaced if needed.',
     'critical', NULL, NULL, NULL, 2021, 2021,
     'Ask a Renault dealer to confirm campaign 0DKQ is closed for this VIN.'),
    ('R135', 'Recall: Zoe built 3.1.–22.2.2021 with the 52 kWh battery (Renault campaign 0DKQ) — a battery-module defect may cause an internal short circuit and fire; the battery is checked and the module replaced if needed.',
     'critical', NULL, NULL, NULL, 2021, 2021,
     'Ask a Renault dealer to confirm campaign 0DKQ is closed for this VIN.'),
    ('R110', 'Recall: Zoe built at Flins 1.–28.9.2023 (Renault campaign 0EBN) — a manufacturing issue may cause a short circuit in the high-voltage battery and fire.',
     'critical', NULL, NULL, NULL, 2023, 2023,
     'Ask a Renault dealer to confirm campaign 0EBN is closed for this VIN.'),
    ('R135', 'Recall: Zoe built at Flins 1.–28.9.2023 (Renault campaign 0EBN) — a manufacturing issue may cause a short circuit in the high-voltage battery and fire.',
     'critical', NULL, NULL, NULL, 2023, 2023,
     'Ask a Renault dealer to confirm campaign 0EBN is closed for this VIN.')
  )
  INSERT INTO public.catalog_component_faults
    (component_type, engine_id, fault, severity, estimated_cost_eur_min, estimated_cost_eur_max,
     annual_probability, affected_year_from, affected_year_to, pre_purchase_check)
  SELECT 'engine', CASE v.eng WHEN 'R110' THEN r110 ELSE r135 END, v.fault, v.severity,
         v.cost_min, v.cost_max, v.prob, v.y_from, v.y_to, v.check_text
    FROM v;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 9 THEN RAISE EXCEPTION 'Expected 9 engine faults, inserted % -- rolled back', n; END IF;

  -- Vehicle faults (Phase 2).
  WITH v(category, fault, severity, cost_min, cost_max, prob, y_from, y_to, check_text) AS (VALUES
    ('climate'::text,
     'A/C compressor failure — no cooling and, with the heat pump, weak heating.'::text,
     'moderate'::text, 1900::integer, 2200::integer, 0.02::numeric, NULL::integer, NULL::integer,
     'Check that the A/C blows cold and the heating works on the test drive.'::text),
    ('suspension', 'Front suspension wears early (control-arm bushes) — knocking over bumps.',
     'moderate', NULL, NULL, 0.02, NULL, NULL,
     'Have the front control-arm bushes checked on a lift.'),
    ('brakes', 'Brake discs rust because regenerative braking leaves them little work — grinding, uneven braking, inspection findings.',
     'minor', NULL, NULL, 0.02, NULL, NULL,
     'Look at the disc surfaces; rusty, scored discs need replacing.'),
    ('steering', 'Recall: Zoe (X10) built 04–10/2019 (Renault campaign 0D9V) — the steering-column motor control may fail, with loss of power steering.',
     'critical', NULL, NULL, NULL, 2019, 2019,
     'Ask a Renault dealer to confirm campaign 0D9V is closed for this VIN.'),
    ('interior', 'Recall: Zoe built 14.11.–3.12.2022 (Renault campaign 0E1E) — the rear seat backrest may not lock; passengers and luggage can be thrown forward in a crash.',
     'moderate', NULL, NULL, NULL, 2022, 2022,
     'Check that the rear backrest locks, and that campaign 0E1E is closed for this VIN.')
  )
  INSERT INTO public.catalog_component_faults
    (component_type, phase_id, category, fault, severity, estimated_cost_eur_min, estimated_cost_eur_max,
     annual_probability, affected_year_from, affected_year_to, pre_purchase_check)
  SELECT 'vehicle', pid, v.category, v.fault, v.severity, v.cost_min, v.cost_max, v.prob, v.y_from, v.y_to, v.check_text
    FROM v;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 5 THEN RAISE EXCEPTION 'Expected 5 vehicle faults, inserted % -- rolled back', n; END IF;

  -- Post-check: 4 old + 14 new.
  SELECT count(*) INTO n FROM public.catalog_component_faults WHERE engine_id IN (r110, r135) OR phase_id = pid;
  IF n <> 18 THEN RAISE EXCEPTION 'Post-check: expected 18 Zoe Phase 2 fault rows, found % -- rolled back', n; END IF;
END $$;

COMMIT;
