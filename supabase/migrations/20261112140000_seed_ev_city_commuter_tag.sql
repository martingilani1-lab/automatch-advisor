-- EV branch for the city_commuter configuration tag (Martin, 2026-11-12).
--
-- Why: the original rule in 20261103090000_seed_rule_based_tags.sql caps city_commuter at
-- <= 81 kW. That cap is a sensible proxy for a combustion city car, but an EV's motor power says
-- nothing about whether it's a city car -- the BMW i3 (125 / 135 kW) is the textbook city EV and was
-- shut out by the kW cap alone, not by its fuel or body. Martin's decision: every electric
-- configuration of an A- or B-segment model is a city commuter, whatever its power. It covers the
-- i3 and Zoe today and every small EV imported later, with no per-model tagging.
--
-- Rule (configuration level): engine fuel_type = 'electric' AND model segment IN ('A', 'B').
-- Plug-in hybrids are NOT included (fuel_type is petrol/diesel, hybrid_type 'PHEV').
--
-- Expected today (live check 2026-11-12): 8 rows -- BMW i3 6 configurations, Renault Zoe 2.
-- The Zoe R110 (80 kW) already qualifies under the old rule; it is untagged only because
-- 20261103090000 hasn't been re-run since the Zoe import. ON CONFLICT DO NOTHING makes the overlap
-- harmless either way.
--
-- Additive INSERT only, ON CONFLICT DO NOTHING -> safe to re-run after every car import, like the
-- other tag-rule migrations (see docs/intake/RESEARCH-PROCESS.md, "Tags").
-- Review-only until Martin signs off.

BEGIN;

INSERT INTO public.catalog_configuration_tags (configuration_id, tag_slug)
SELECT c.id, 'city_commuter'
FROM public.catalog_vehicle_configurations c
JOIN public.catalog_engines e ON e.id = c.engine_id
JOIN public.catalog_phases p ON p.id = c.phase_id
JOIN public.catalog_models m ON m.id = p.model_id
WHERE e.fuel_type = 'electric'
  AND m.segment IN ('A', 'B')
ON CONFLICT DO NOTHING;

-- Post-condition: every electric A/B configuration now carries the tag.
DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing
  FROM public.catalog_vehicle_configurations c
  JOIN public.catalog_engines e ON e.id = c.engine_id
  JOIN public.catalog_phases p ON p.id = c.phase_id
  JOIN public.catalog_models m ON m.id = p.model_id
  WHERE e.fuel_type = 'electric' AND m.segment IN ('A', 'B')
    AND NOT EXISTS (SELECT 1 FROM public.catalog_configuration_tags t
                     WHERE t.configuration_id = c.id AND t.tag_slug = 'city_commuter');
  IF missing > 0 THEN
    RAISE EXCEPTION 'city_commuter missing on % electric A/B configurations', missing;
  END IF;
END $$;

COMMIT;
