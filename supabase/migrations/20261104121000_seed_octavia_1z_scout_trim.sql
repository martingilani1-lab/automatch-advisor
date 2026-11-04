-- "Scout" trim for both Octavia II (1Z) phases + its equipment (Martin, 2026-11-04).
-- Run AFTER 20261104120500 (Scout configurations) -- not technically required (trims hang off the
-- phase, not off configurations), but it keeps the Scout landing in one piece.
--
-- Tier 4 -- PROPOSED, Martin to confirm: trim equipment is shown by inheritance (app/catalog/lib/
-- trimsDisplay.ts: a trim inherits every trim at a strictly LOWER tier). Tier 4 puts the Scout on
-- top of Elegance (tier 3: Climatronic, cruise control, rear electric windows ...) -- i.e. "Elegance
-- equipment + Scout extras". Facelift: a sibling of Laurin & Klement (also tier 4); same-tier trims
-- never inherit from each other, so the Scout does NOT pick up L&K's leather/xenon. If the Scout
-- sat on Ambiente / Ambition level instead, change both tiers to '3'.
--
-- feature_group -- the slot a feature occupies; a later feature in the same group replaces the
-- inherited one. NULL = a stand-alone extra that replaces nothing (419 live rows already use NULL;
-- the CHECK list is unchanged, no migration needed):
--   wheels         17" "Proteus" alloys
--   bumpers        protective cladding on bumpers, fenders and sills
--   seats          Scout upholstery (fabric / Alcantara)
--   interior_trim  aluminium pedals
--   NULL           rough-road package, dual tailpipes, passenger grab handle -- no fitting group
-- All standard (is_optional false). safety_feature_slug NULL (none is a safety feature).
--
-- Additive INSERTs (trim ON CONFLICT (phase_id, name), features ON CONFLICT (trim_id, feature)).
-- Review-only until Martin signs off.

BEGIN;

INSERT INTO public.catalog_trims (phase_id, name, tier)
SELECT p.id, 'Scout', '4'
FROM public.catalog_phases p
WHERE p.generation_code = '1Z' AND p.phase_label IN ('Pre-facelift', 'Facelift')
  AND p.model_id = (SELECT m.id FROM public.catalog_models m JOIN public.catalog_brands br ON br.id = m.brand_id
                    WHERE m.name = 'Octavia' AND br.name = 'Škoda')
ON CONFLICT (phase_id, name) DO NOTHING;

WITH f(feature, feature_group) AS (VALUES
  ('Rough-road package: reinforced underbody and engine protection'::text,          NULL::text),
  ('Unpainted protective plastic cladding on bumpers, fenders and sills',            'bumpers'),
  ('17" "Proteus" alloy wheels',                                                     'wheels'),
  ('Dual exhaust tailpipes',                                                         NULL),
  ('Passenger grab handle on the dashboard',                                         NULL),
  ('Scout upholstery (fabric / Alcantara)',                                          'seats'),
  ('Aluminium pedals',                                                               'interior_trim')
)
INSERT INTO public.catalog_trim_features (trim_id, feature, is_optional, feature_group)
SELECT t.id, f.feature, false, f.feature_group
FROM f
CROSS JOIN public.catalog_trims t
JOIN public.catalog_phases p ON p.id = t.phase_id
WHERE t.name = 'Scout' AND p.generation_code = '1Z'
  AND p.model_id = (SELECT m.id FROM public.catalog_models m JOIN public.catalog_brands br ON br.id = m.brand_id
                    WHERE m.name = 'Octavia' AND br.name = 'Škoda')
ON CONFLICT (trim_id, feature) DO NOTHING;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.catalog_trims t JOIN public.catalog_phases p ON p.id = t.phase_id
   WHERE t.name = 'Scout' AND p.generation_code = '1Z';
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 Scout trims, found % -- rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_trim_features f JOIN public.catalog_trims t ON t.id = f.trim_id
    JOIN public.catalog_phases p ON p.id = t.phase_id
   WHERE t.name = 'Scout' AND p.generation_code = '1Z';
  IF n <> 14 THEN RAISE EXCEPTION 'Expected 14 Scout features (7 x 2 phases), found % -- rolled back', n; END IF;
END $$;

COMMIT;
