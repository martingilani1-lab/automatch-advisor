-- Škoda CITIGOe iV (AA-iV): pass-4 fault top-up for the e iV phase (docs/intake/research/skoda-citigo.md, section 37).
-- The CITIGOe iV is the same car as the VW e-up! (2020+, 32.3 kWh) and SEAT Mii electric (ADAC: "Geschwistermodelle
-- von Seat und Skoda als Elektrovarianten mit identischer Technik"), so their owner patterns and ADAC data count.
--
-- Live before this file (read via MCP 2026-11-20): AA-iV phase 1 vehicle fault (Recall 93J5), EBM-32kWh@61 1 engine
-- fault (J497). This file adds 6 rows:
--   engine EBM-32kWh@61: AC on-board charger fails (GoingElectric, 2 owners)                            0.005, cost NULL
--   vehicle AA-iV: 12 V battery drained / car won't wake (GoingElectric, 2 CITIGOe owners; VW update 90R4) 0.2, cost NULL
--   vehicle AA-iV: front discs / pads corrode from little use (regen) (GoingElectric 300+ posts; ADAC)      0.2, 140-245 proposed
--   vehicle AA-iV: rear drum brakes wear / stick (ADAC e-up! breakdown items)                              0.2, 100-160 proposed
--   vehicle AA-iV: mechanical parking brake fails (ADAC e-up! breakdown items)                             0.02, 70-150 proposed
--   vehicle AA-iV: driver's seat heater element fails (GoingElectric, CITIGOe / Mii / e-up! owners)       0.005, cost NULL
-- Brake costs are Martin's Citigo petrol figures (same brake parts family on skoda-parts.com), PROPOSED for the e iV --
-- confirm. Other costs NULL: ask Martin (independent SK / CZ). Probabilities on the live scale (R4), all proposed.
--
-- Additive INSERT only. May run via the Supabase MCP after Martin's review (CLAUDE.md); nothing executed by Claude.

BEGIN;

DO $$
DECLARE n int; iv uuid; ebm uuid;
BEGIN
  SELECT p.id INTO iv FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'Citigo' AND p.generation_code = 'AA-iV' AND p.phase_label = 'Facelift';
  SELECT id INTO ebm FROM public.catalog_engines WHERE code = 'EBM-32kWh' AND power_kw = 61;
  IF iv IS NULL OR ebm IS NULL THEN RAISE EXCEPTION 'CITIGOe iV phase or EBM-32kWh@61 missing -- rolled back'; END IF;

  -- Guards: the live state this file was written against.
  SELECT count(*) INTO n FROM public.catalog_component_faults WHERE phase_id = iv;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 live e iV vehicle fault (93J5), found % -- re-read; rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_component_faults WHERE engine_id = ebm;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 live EBM-32kWh fault (J497), found % -- re-read; rolled back', n; END IF;

  INSERT INTO public.catalog_component_faults
    (component_type, engine_id, fault, severity, annual_probability, estimated_cost_eur_min, estimated_cost_eur_max,
     affected_year_from, affected_year_to, pre_purchase_check)
  VALUES ('engine', ebm,
          'AC on-board charger (high-voltage charger) fails -- the car refuses AC charging at wallboxes and public AC posts while CCS (DC) still works; charger replaced (e-up! owners 2021, GoingElectric).',
          'moderate', 0.005, NULL, NULL, 2020, 2020,
          'Test AC charging at a wallbox or public AC post (not only DC); read the charger fault memory.');
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'Engine insert hit % rows -- rolled back', n; END IF;

  INSERT INTO public.catalog_component_faults
    (component_type, phase_id, category, fault, severity, annual_probability, estimated_cost_eur_min, estimated_cost_eur_max,
     affected_year_from, affected_year_to, pre_purchase_check)
  VALUES
    ('vehicle', iv, 'electrical',
     '12 V battery drained -- after a few days or weeks parked the car will not wake up ("Bordelektronik sprang nicht an"), with 12 V / recuperation warnings, although the HV battery is charged. VW software update 90R4 reduces the standby drain; worn 12 V batteries are replaced (CITIGOe iV owners, GoingElectric).',
     'minor', 0.2, NULL, NULL, 2020, 2020,
     'Ask whether update 90R4 was done; check the 12 V battery age and that the car wakes normally.'),
    ('vehicle', iv, 'brakes',
     'Front brake discs and pads corrode because regenerative braking leaves them nearly unused -- uneven pad contact, rust rings, noise; discs and pads replaced (e-up! owners, GoingElectric; ADAC: most e-up! breakdowns come from the brakes).',
     'minor', 0.2, 140, 245, NULL, NULL,
     'Look at both disc faces for rust rings and a partial contact pattern; brake firmly on the test drive.'),
    ('vehicle', iv, 'brakes',
     'Rear drum brakes wear or stick (ADAC e-up! breakdown items: brake drums front / rear); shoes and wheel cylinders replaced.',
     'minor', 0.2, 100, 160, NULL, NULL,
     'Check the last brake service; listen for scraping from the rear wheels.'),
    ('vehicle', iv, 'brakes',
     'Mechanical parking brake fails -- cables or mechanism (ADAC e-up! breakdown items); cables replaced.',
     'minor', 0.02, 70, 150, NULL, NULL,
     'Check the handbrake holds on a slope.'),
    ('vehicle', iv, 'interior',
     'Driver''s seat heater stops working -- the button lights briefly and goes out; heating element replaced (CITIGOe iV, Mii electric and e-up! owners, GoingElectric).',
     'minor', 0.005, NULL, NULL, 2020, 2020,
     'Switch on both seat heaters and check both get warm.');
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 5 THEN RAISE EXCEPTION 'Vehicle inserts hit % rows -- rolled back', n; END IF;
END $$;

COMMIT;
