-- New configuration-level tag: camper (Martin, 2026-11-20).
--
-- Definition: camper = a car you can sleep in or build a camper from -- an MPV / van body with a
-- maximum load space (boot_max_liters) of at least 3 000 l. Meant for Multivan / Caravelle /
-- California-type cars, not estates (an estate is "Road trip", roadtrip_camper).
--
-- Today: Volkswagen Multivan T7, all 3 configurations (1.5 TSI 100 kW, 2.0 TDI 110 kW, 2.0 TSI 150 kW;
-- 3 672 l) -- 0.2 % of configurations. The Caddy SB (2 556 l) and Touran (1 980 l) don't qualify.
-- The catalog has no separate van body type yet; 'MPV 5-door' is the only one. Add a van body here
-- when one exists.
--
-- This file owns the camper rule (docs/intake/RESEARCH-PROCESS.md, "Tags"). Vocabulary row: tier
-- 'configuration', colour category 'utility', sort 35 (between Road trip 30 and Winter ready 40).
-- Mirrors app/catalog/lib/tags.ts (TAG_DEFINITIONS + ConfigurationOnlyTagSlug), same commit.
--
-- Additive INSERT only, ON CONFLICT DO NOTHING -> re-runnable after every import, like the other
-- tag-rule files. May run via the Supabase MCP after Martin's review.

BEGIN;

INSERT INTO public.catalog_tags (slug, label, tier, color_category, sort_order)
VALUES ('camper', 'Camper', 'configuration', 'utility', 35)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.catalog_configuration_tags (configuration_id, tag_slug)
SELECT vc.id, 'camper'
FROM public.catalog_vehicle_configurations vc
JOIN public.catalog_body_types b ON b.id = vc.body_type_id
JOIN public.phase_body_dimensions d ON d.phase_id = vc.phase_id AND d.body_type_id = vc.body_type_id
WHERE b.name IN ('MPV 5-door') AND d.boot_max_liters >= 3000
ON CONFLICT DO NOTHING;

-- ---- Post-condition: coverage cap (NOTICE only, same check as rounds 3 / 4) -----------------
DO $$
DECLARE total integer; r record; over text := '';
BEGIN
  SELECT count(*) INTO total FROM public.catalog_vehicle_configurations;
  FOR r IN SELECT tag_slug, count(*) AS n FROM public.catalog_configuration_tags GROUP BY tag_slug LOOP
    IF r.n > total * 0.25 THEN
      over := over || format(' %s %s/%s (%s %%);', r.tag_slug, r.n, total, round(100.0 * r.n / total, 1));
    END IF;
  END LOOP;
  IF over <> '' THEN
    RAISE NOTICE 'Tag coverage cap (25 %%) exceeded:%', over;
  ELSE
    RAISE NOTICE 'Tag coverage cap (25 %%): no tag above it (% configurations)', total;
  END IF;
END $$;

COMMIT;
