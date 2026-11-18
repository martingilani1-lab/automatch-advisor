-- VW ID.3 (E1) completion: fault costs at INDEPENDENT-SHOP prices from Martin's own figures (source M, confirmed
-- 2026-11-18: "use independent shop") and the sticking-rear-drum wording on the brakes fault.
-- REPLACES 20261118220000_vw_id3_e1_fault_costs_m.sql (never run; marked SUPERSEDED).
-- Source: docs/intake/research/vw-id3-e1-completion.md, section 4b and decision X8.
--
-- UPDATE of existing rows: MARTIN RUNS THIS FILE (not the agent). Run it in a FRESH SQL editor tab (rule 6) and run
-- the whole file at once. Written against the live rows of 2026-11-18; if it waits more than a day, re-check the guards
-- first (rule 6b).
--
--   12 V battery (both phases) ..... 456 / 456 -> 160 / 250   (M, independent shop; ADAC's 456 was a German dealer)
--   charging-flap actuator ......... 227 / 227 -> 80 / 180    (M, independent shop; ADAC's 227 was a German dealer)
--   rear drive shaft (splines) ..... NULL      -> 150 / 300   (M, independent shop)
--   brakes ......................... 760 / 760 -> 120 / 760   (M 120-350 rear drums at an independent shop; front discs
--                                                               + pads stay ADAC 760 -- no independent figure for them)
--     + text names the sticking rear drums and VW's TPI drum seal (meinid.com thread 6388, E35).
-- Not changed: CO2 A/C / heat pump 250 / 2 000 (M's independent 350-900 covers leaks only; for a failed compressor M
-- gives only part / dealer prices, and the live range is sourced, E23). Front wishbone bushes stay NULL (no figure).

BEGIN;

DO $$
DECLARE n int; pre uuid; fl uuid;
BEGIN
  SELECT p.id INTO pre FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'ID.3' AND p.phase_label = 'Pre-facelift' AND p.generation_code = 'E1';
  SELECT p.id INTO fl FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'ID.3' AND p.phase_label = 'Facelift' AND p.generation_code = 'E1';
  IF pre IS NULL OR fl IS NULL THEN RAISE EXCEPTION 'ID.3 (E1) phases not found -- rolled back'; END IF;

  UPDATE public.catalog_component_faults
     SET estimated_cost_eur_min = 160, estimated_cost_eur_max = 250
   WHERE component_type = 'vehicle' AND phase_id IN (pre, fl) AND fault LIKE '12 V battery%'
     AND estimated_cost_eur_min = 456 AND estimated_cost_eur_max = 456;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION '12 V battery: expected 2 rows at 456/456, updated % -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET estimated_cost_eur_min = 80, estimated_cost_eur_max = 180
   WHERE component_type = 'vehicle' AND phase_id = pre AND fault LIKE 'Charging-flap actuator%'
     AND estimated_cost_eur_min = 227 AND estimated_cost_eur_max = 227;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Charging flap: expected 1 row at 227/227, updated % -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET estimated_cost_eur_min = 150, estimated_cost_eur_max = 300
   WHERE component_type = 'vehicle' AND phase_id = pre AND fault LIKE 'Rear drive shaft clicks%'
     AND estimated_cost_eur_min IS NULL AND estimated_cost_eur_max IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Rear drive shaft: expected 1 row with NULL cost, updated % -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET fault = 'Brakes corrode because regenerative braking leaves them little work — front discs rust and the rear drums brake unevenly or stick after the car stands in rain or frost (the car jumps or won''t move off); a common reason for failing the first HU even at low mileage. VW''s TPI adds a seal to the rear drums. Cost: rear drums cleaned or shoes replaced from about 120 €; front discs and pads 760 €.',
         pre_purchase_check = 'Look at the front discs for rust ridges; ask for the last HU report and its brake-test values per axle; ask whether the rear brakes stick after standing and whether the drum-seal TPI was done.',
         estimated_cost_eur_min = 120
   WHERE component_type = 'vehicle' AND phase_id = pre AND fault LIKE 'Brakes corrode because regenerative braking%'
     AND estimated_cost_eur_min = 760 AND estimated_cost_eur_max = 760;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Brakes: expected 1 row at 760/760, updated % -- rolled back', n; END IF;
END $$;

COMMIT;
