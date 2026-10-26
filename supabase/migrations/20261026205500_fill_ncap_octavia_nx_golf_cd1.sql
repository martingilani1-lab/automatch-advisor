-- Fills the missing Euro NCAP percentage scores for the 3 modern phases that had stars but no
-- percentages (so the Adult/Child/Pedestrian/Safety Assist bars were empty), from Martin 2026-10-26.
-- Both cars were RE-RATED by Euro NCAP in 2022 under the tougher protocol (the original 2019 tests
-- scored higher: Octavia 92/88/-/79, Golf 95/89/76/78) -- the 2022 re-rating is the current one, so
-- that's what goes in:
--   Škoda Octavia NX  Pre-facelift          2022  5*  AOP 86  COP 84  VRU 68  SA 81
--   VW Golf CD1       Pre-facelift+Facelift 2022  5*  AOP 88  COP 87  VRU 74  SA 82
-- Cross-checked 2026-10-26: Golf against Euro NCAP's own 2022 datasheet (all four match); Octavia
-- against Škoda's 2022 press release (AOP/COP/SA match; VRU 68 not stated there, taken from Martin).
-- The Golf CD1 facelift shares the 2022 rating (no separate facelift test).
-- Guarded: only touches rows whose percentages are still NULL, and expects exactly 3.
-- UPDATE of existing data: review-only, NOT run by this session. Run in a FRESH Supabase SQL tab.

BEGIN;

UPDATE catalog_phases p SET ncap_year = v.yr, safety_rating = v.stars,
  ncap_adult_pct = v.a, ncap_child_pct = v.c, ncap_pedestrian_pct = v.pe, ncap_safety_assist_pct = v.sa
FROM (VALUES
  ('Octavia', 'NX',  'Pre-facelift', 2022, 5, 86, 84, 68, 81),
  ('Golf',    'CD1', 'Pre-facelift', 2022, 5, 88, 87, 74, 82),
  ('Golf',    'CD1', 'Facelift',     2022, 5, 88, 87, 74, 82)
) AS v(model, gen, phase, yr, stars, a, c, pe, sa), catalog_models m
WHERE m.name = v.model AND p.model_id = m.id AND p.generation_code = v.gen AND p.phase_label = v.phase
  AND p.ncap_adult_pct IS NULL;

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM catalog_phases p JOIN catalog_models m ON m.id = p.model_id
  WHERE ((m.name = 'Octavia' AND p.generation_code = 'NX') OR (m.name = 'Golf' AND p.generation_code = 'CD1'))
    AND p.ncap_year = 2022 AND p.ncap_safety_assist_pct IS NOT NULL;
  IF n <> 3 THEN RAISE EXCEPTION 'Expected 3 phases updated, found %', n; END IF;
END $$;

COMMIT;
