-- head_turner moves from model level to configuration level (Martin, 2026-11-20, tag rules round 4).
--
-- Why: whether a car turns heads depends on the body, not the whole phase -- a T-Roc or A3 has a
-- Cabriolet that does and an SUV / hatch that doesn't, but the phase-level rule could only tag a
-- phase sold ONLY as coupe / cabrio / roadster (TT, New Beetle). The new rule
-- (20261120140500_seed_tag_rules_round4.sql) tags each configuration with a coupe / cabrio /
-- roadster body, or any segment-S car: 105 configurations. The New Beetle 3-door hatch is no longer
-- tagged (it isn't a coupe); its cabrio is.
--
-- This file: (1) catalog_tags.tier 'model' -> 'configuration' for head_turner (the tier trigger then
-- allows configuration rows and refuses new phase rows), (2) deletes the 6 phase rows (New Beetle 9C
-- x2, TT 8N x2, TT 8S x2). Mirrors app/catalog/lib/tags.ts (TAG_DEFINITIONS + the tier type unions),
-- changed in the same commit.
--
-- Order: run this BEFORE or AFTER the round-4 seed -- the seed only inserts head_turner rows once
-- the tier allows them, so if this runs second, re-run the seed afterwards.
--
-- UPDATE + DELETE: Martin runs this himself, in a FRESH SQL editor tab. One transaction, guarded.

BEGIN;

DO $$
DECLARE n integer; cur text;
BEGIN
  SELECT tier INTO cur FROM public.catalog_tags WHERE slug = 'head_turner';
  IF cur IS DISTINCT FROM 'model' THEN
    RAISE EXCEPTION 'head_turner tier is %, expected model -- already moved? Rolled back', cur;
  END IF;
  SELECT count(*) INTO n FROM public.catalog_phase_tags WHERE tag_slug = 'head_turner';
  IF n <> 6 THEN
    RAISE EXCEPTION 'Expected 6 head_turner phase rows, found % -- re-check before running. Rolled back', n;
  END IF;

  UPDATE public.catalog_tags SET tier = 'configuration' WHERE slug = 'head_turner';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Tier update touched % rows, expected 1 -- rolled back', n; END IF;

  DELETE FROM public.catalog_phase_tags WHERE tag_slug = 'head_turner';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'Deleted % phase rows, expected 6 -- rolled back', n; END IF;

  RAISE NOTICE 'head_turner is now configuration-level; 6 phase rows removed';
END $$;

COMMIT;
