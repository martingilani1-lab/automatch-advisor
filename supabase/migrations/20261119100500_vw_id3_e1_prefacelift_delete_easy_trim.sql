-- VW ID.3 (E1) Pre-facelift: remove the trim "Easy" (24 features) -- decision X9 (Martin 2026-11-19: "CZ lines, drop
-- Easy"). "Easy" came from one Slovenská sporiteľňa fleet configuration of 13.10.2022 (options included) and is not
-- additive with the VW ČR 07/2021 lines Pure / Pro / Pro S that replace it (20261119100000).
--
-- DELETE: MARTIN RUNS THIS FILE (not the agent), AFTER 20261119100000 is live. Fresh SQL editor tab, whole file at once.
-- catalog_trim_features.trim_id has no ON DELETE CASCADE, so the features go first. Guards: Easy has exactly 24
-- features, and the replacement trims are already live (the phase is never left without trims).

BEGIN;

DO $$
DECLARE n int; pre uuid; easy uuid;
BEGIN
  SELECT p.id INTO pre FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'ID.3' AND p.phase_label = 'Pre-facelift' AND p.generation_code = 'E1';
  IF pre IS NULL THEN RAISE EXCEPTION 'ID.3 (E1) Pre-facelift phase not found -- rolled back'; END IF;

  SELECT count(*) INTO n FROM public.catalog_trims t
   WHERE t.phase_id = pre AND t.name IN ('Pure', 'Pro', 'Pro S');
  IF n <> 3 THEN RAISE EXCEPTION 'Run 20261119100000 first: found % of the 3 CZ trims -- rolled back', n; END IF;

  SELECT id INTO easy FROM public.catalog_trims WHERE phase_id = pre AND name = 'Easy';
  IF easy IS NULL THEN RAISE EXCEPTION 'Trim Easy not found (already deleted?) -- rolled back'; END IF;

  DELETE FROM public.catalog_trim_features WHERE trim_id = easy;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 24 THEN RAISE EXCEPTION 'Expected 24 Easy features, deleted % -- rolled back', n; END IF;

  DELETE FROM public.catalog_trims WHERE id = easy;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected to delete 1 trim, deleted % -- rolled back', n; END IF;

  SELECT count(*) INTO n FROM public.catalog_trims WHERE phase_id = pre;
  IF n <> 3 THEN RAISE EXCEPTION 'Post-check: expected 3 Pre-facelift trims, found % -- rolled back', n; END IF;
END $$;

COMMIT;
