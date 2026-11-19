-- VW ID.3 (E1): bring four fault costs to Martin's INDEPENDENT-SHOP prices (source M, "use independent shop",
-- 2026-11-18). Source: docs/intake/research/vw-id3-e1-completion.md, decision X8.
--
-- Why this file: 20261118220000 (dealer-topped ranges) was run on 2026-11-18 although it had been marked superseded;
-- its replacement 20261118223000 then rolled back on its 456/456 guard and changed nothing. This file starts from the
-- live state read via MCP on 2026-11-19 and only moves what still differs:
--   12 V battery (both phases) ..... 160 / 456 -> 160 / 250
--   charging-flap actuator ......... 110 / 227 -> 80 / 180
--   rear drive shaft ............... 150 / 280 -> 150 / 300
--   brakes ......................... 120 / 760 + sticking-drum text -- already as intended, not touched.
--
-- UPDATE of existing rows: MARTIN RUNS THIS FILE (not the agent). Fresh SQL editor tab, whole file at once (rule 6).

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
     SET estimated_cost_eur_max = 250
   WHERE component_type = 'vehicle' AND phase_id IN (pre, fl) AND fault LIKE '12 V battery%'
     AND estimated_cost_eur_min = 160 AND estimated_cost_eur_max = 456;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION '12 V battery: expected 2 rows at 160/456, updated % -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET estimated_cost_eur_min = 80, estimated_cost_eur_max = 180
   WHERE component_type = 'vehicle' AND phase_id = pre AND fault LIKE 'Charging-flap actuator%'
     AND estimated_cost_eur_min = 110 AND estimated_cost_eur_max = 227;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Charging flap: expected 1 row at 110/227, updated % -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET estimated_cost_eur_max = 300
   WHERE component_type = 'vehicle' AND phase_id = pre AND fault LIKE 'Rear drive shaft clicks%'
     AND estimated_cost_eur_min = 150 AND estimated_cost_eur_max = 280;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Rear drive shaft: expected 1 row at 150/280, updated % -- rolled back', n; END IF;

  SELECT count(*) INTO n FROM public.catalog_component_faults
   WHERE component_type = 'vehicle' AND phase_id = pre AND fault LIKE 'Brakes corrode%VW''s TPI adds a seal%'
     AND estimated_cost_eur_min = 120 AND estimated_cost_eur_max = 760;
  IF n <> 1 THEN RAISE EXCEPTION 'Brakes row is not in the expected state (120/760, TPI text) -- rolled back'; END IF;
END $$;

COMMIT;
