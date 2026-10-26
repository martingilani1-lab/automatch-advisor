-- Adds "ABS" (safety_feature_slug 'abs') to the base trim of every phase where ESP is standard on that
-- base trim but ABS isn't listed anywhere -- 68 phases, found 2026-10-26 after Martin noticed ABS missing
-- on most models. Not an inference about the car: ESC physically cannot work without ABS -- it uses the
-- ABS hydraulic unit and wheel-speed sensors to brake individual wheels -- so "ESP standard" already means
-- "ABS standard"; the fill list simply didn't repeat it. (ABS has also been standard on every new car in
-- the EU since the 2004 ACEA commitment, which covers every phase here: the earliest is 2009.)
-- Placed on the base trim (first trim of the lowest tier), where ESP is; higher trims inherit it.
-- Deliberately untouched: Octavia 1U Pre-facelift (ABS optional on LX, standard from GLX, as Martin
-- specified) and every phase that already lists ABS.
-- Additive INSERT only. Guarded: exactly 68 rows, none already present.

BEGIN;

CREATE TEMP TABLE _abs ON COMMIT DROP AS
SELECT DISTINCT ON (p.id) p.id AS phase_id, t.id AS trim_id
FROM catalog_phases p
JOIN catalog_trims t ON t.phase_id = p.id
ORDER BY p.id, t.tier::int, t.name;

DELETE FROM _abs a
WHERE NOT EXISTS (SELECT 1 FROM catalog_trim_features f
                  WHERE f.trim_id = a.trim_id AND f.safety_feature_slug = 'esc' AND NOT f.is_optional)
   OR EXISTS (SELECT 1 FROM catalog_trims t JOIN catalog_trim_features f ON f.trim_id = t.id
              WHERE t.phase_id = a.phase_id AND f.safety_feature_slug = 'abs');

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM _abs;
  IF n <> 68 THEN RAISE EXCEPTION 'Expected 68 base trims to get ABS, found %', n; END IF;
END $$;

INSERT INTO catalog_trim_features (trim_id, feature, is_optional, feature_group, safety_feature_slug)
SELECT trim_id, 'ABS', false, NULL, 'abs' FROM _abs;

COMMIT;
