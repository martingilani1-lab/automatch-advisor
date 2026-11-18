-- VW ID.3 (E1) completion, pass 4: six new vehicle faults on the Pre-facelift phase.
-- Source: docs/intake/research/vw-id3-e1-completion.md, section 3a (N1-N6), decision X1.
--
-- N1 CO2 A/C / heat-pump circuit (meinid.com thread 1725, VW field actions 87H2 / 87H3) .... climate, moderate
-- N2 brakes corrode from little use, front discs / rear drums at the HU (ADAC GW-Info, meinid) brakes, minor
-- N3 front wishbone bushes / axle mounts (TÜV via ADAC GW-Info, ADAC long-term test) ........ suspension, moderate
-- N4 rear drive shaft clicks on load change (ADAC long-term test: "bei VW nicht unbekannt") .. suspension, minor
-- N5 charging-flap actuator fails (ADAC long-term test 227 EUR, meinid thread 4742) ......... electrical, minor
-- N6 Recall 93J9: charger protective-earth conductor, built 13.10.-6.11.2020 (Safety Gate) .. electrical, critical
--
-- Vehicle rows (phase_id), so no build years except on the recall: every pattern was documented on 2020-2022 cars
-- only (decision X5: not copied onto the Facelift). Frequency "occasional" = 0.02 (RESEARCH-PROCESS.md word classes);
-- recall: cost / probability N/A. Costs are German dealer / workshop figures (no SK / CZ price found); NULL = no price
-- found in any source (decision X4 -- Martin may supply one).
--
-- Additive INSERT only. May run via the Supabase MCP after Martin has reviewed this file.

BEGIN;

DO $$
DECLARE n int; pre uuid;
BEGIN
  SELECT p.id INTO pre
    FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'ID.3' AND p.phase_label = 'Pre-facelift' AND p.generation_code = 'E1';
  IF pre IS NULL THEN RAISE EXCEPTION 'ID.3 (E1) Pre-facelift phase not found -- rolled back'; END IF;

  SELECT count(*) INTO n FROM public.catalog_component_faults WHERE phase_id = pre;
  IF n <> 4 THEN RAISE EXCEPTION 'Expected 4 live Pre-facelift vehicle faults, found % -- re-check before running', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_component_faults
   WHERE phase_id = pre AND (fault LIKE 'CO2 (R744)%' OR fault LIKE 'Brakes corrode%' OR fault LIKE 'Front suspension wears%'
                             OR fault LIKE 'Rear drive shaft clicks%' OR fault LIKE 'Charging-flap actuator%' OR fault LIKE '%93J9%');
  IF n <> 0 THEN RAISE EXCEPTION 'Found % of these faults already live -- rolled back', n; END IF;

  INSERT INTO public.catalog_component_faults
    (component_type, phase_id, category, fault, severity, estimated_cost_eur_min, estimated_cost_eur_max,
     annual_probability, affected_year_from, affected_year_to, pre_purchase_check)
  VALUES
    ('vehicle', pre, 'climate',
     'CO2 (R744) air-conditioning / heat-pump circuit loses refrigerant or the compressor fails — no cooling (and weak heating with the heat pump), message "air conditioning not working properly". VW replaced refrigerant lines (field action 87H2) and compressors (87H3) on early cars; a refill costs about 250 €, chafed lines about 2 000 €.',
     'moderate', 250, 2000, 0.02, NULL, NULL,
     'Run MAX A/C on the test drive: the vents must blow clearly cold within a few minutes. Ask whether VW field actions 87H2 / 87H3 were done.'),
    ('vehicle', pre, 'brakes',
     'Brakes corrode because regenerative braking leaves them little work — front discs rust and the rear drums brake unevenly, a common reason for failing the first HU even at low mileage. Cost: front discs and pads.',
     'minor', 760, 760, 0.02, NULL, NULL,
     'Look at the front discs for rust ridges; ask for the last HU report and its brake-test values per axle.'),
    ('vehicle', pre, 'suspension',
     'Front suspension wears — the wishbone rubber bushes get play; TÜV names the axle mounts as the ID.3''s main HU finding.',
     'moderate', NULL, NULL, 0.02, NULL, NULL,
     'Check the front wishbone bushes for play on a lift; listen for knocks over bumps.'),
    ('vehicle', pre, 'suspension',
     'Rear drive shaft clicks when the load changes (pulling away, manoeuvring), usually rear right; VW knows the problem — the shaft is repaired or replaced, sometimes more than once.',
     'minor', NULL, NULL, 0.02, NULL, NULL,
     'Manoeuvre slowly forward and back with the window open and listen for a click from the rear.'),
    ('vehicle', pre, 'electrical',
     'Charging-flap actuator fails — the flap no longer opens or closes and its plastic can crack; the flap with its actuator is replaced.',
     'minor', 227, 227, 0.02, NULL, NULL,
     'Open and close the charging flap a few times with the key or the app.'),
    ('vehicle', pre, 'electrical',
     'Recall: ID.3 built 13.10.–6.11.2020 (VW campaign 93J9, EU Safety Gate INFO/00079/21) — the protective earth conductor on the charger may come loose, with a risk of electric shock; fixed in the campaign.',
     'critical', NULL, NULL, NULL, 2020, 2020,
     'Ask a Volkswagen dealer to confirm campaign 93J9 is closed for this VIN.');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'Expected 6 new faults, inserted % -- rolled back', n; END IF;

  SELECT count(*) INTO n FROM public.catalog_component_faults WHERE phase_id = pre;
  IF n <> 10 THEN RAISE EXCEPTION 'Post-check: expected 10 Pre-facelift vehicle faults, found % -- rolled back', n; END IF;
END $$;

COMMIT;
