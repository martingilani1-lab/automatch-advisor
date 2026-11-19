-- VW ID.3 (E1) Facelift, trim Pure: the "Park Pilot front and rear parking sensors" feature carries the safety slug
-- 'parking_assist' (a system that steers the car into the space). Park Pilot is sensors only, so the right slug is
-- 'reversing_detection' (GSR2 reversing detection) -- the same mapping the Pre-facelift CZ 2021 trims use
-- (20261119100000) and the Zoe uses for its rear sensors. Source: docs/intake/research/vw-id3-e1-completion.md, section 11.
-- Checked 2026-11-19: this is the only catalog row where 'parking_assist' sits on plain sensors; the other five
-- (Multivan, Passat, T-Roc, Tiguan "Park Assist (Plus)", Zoe "Easy Park Assist") are real steering systems, not touched.
--
-- UPDATE: MARTIN RUNS THIS FILE (not the agent). Fresh SQL editor tab, whole file at once (rule 6).

BEGIN;

DO $$
DECLARE n int; fl uuid;
BEGIN
  SELECT p.id INTO fl FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'ID.3' AND p.phase_label = 'Facelift' AND p.generation_code = 'E1';
  IF fl IS NULL THEN RAISE EXCEPTION 'ID.3 (E1) Facelift phase not found -- rolled back'; END IF;

  UPDATE public.catalog_trim_features f
     SET safety_feature_slug = 'reversing_detection'
    FROM public.catalog_trims t
   WHERE t.id = f.trim_id AND t.phase_id = fl AND t.name = 'Pure'
     AND f.feature = 'Park Pilot front and rear parking sensors'
     AND f.safety_feature_slug = 'parking_assist';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 Park Pilot row with parking_assist, updated % -- rolled back', n; END IF;
END $$;

COMMIT;
