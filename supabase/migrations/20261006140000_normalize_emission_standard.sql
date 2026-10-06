-- Normalizes catalog_engines.emission_standard to a single spaceless spelling
-- ('Euro 6d' -> 'Euro6d', etc.) and freezes the vocabulary with a CHECK constraint.
--
-- Two spellings of the same standard have been drifting into this column since the
-- first MQB batch (some seeds wrote 'Euro 6d', others 'Euro6d') -- this collapses them
-- to one canonical no-space form so the column stops silently fragmenting into
-- duplicate-meaning values. Only `catalog_engines` is touched; the old flat `engines`
-- table is never referenced by this file.
--
-- Precondition count verified live before writing this file (NOT the number first
-- proposed -- that assumed 20261006130000 added 4 new space-containing rows on top of
-- a 54-row baseline, i.e. 58 total; live state showed the real baseline was 50, so
-- 50 + 4 = 54, not 58. Confirmed via a live breakdown: 'Euro 2'=9, 'Euro 3'=17,
-- 'Euro 4'=13, 'Euro 5'=5, 'Euro 6d'=10, summing to 54): expect exactly 54 rows with a
-- space right now.
--
-- UPDATE of existing hand-authored data, plus a schema-level CHECK constraint: both
-- file-only, human-run, NOT executed here.

BEGIN;

-- ============================================================================
-- PRECONDITION: exactly 54 rows have a space in emission_standard right now.
-- ============================================================================
DO $$
DECLARE
  space_n integer;
BEGIN
  SELECT count(*) INTO space_n FROM catalog_engines WHERE emission_standard ~ ' ';
  IF space_n <> 54 THEN
    RAISE EXCEPTION 'Expected exactly 54 catalog_engines rows with a space in emission_standard, found % -- aborting, live state has drifted from what this migration assumes.', space_n;
  END IF;
END $$;

-- ============================================================================
-- NORMALIZE: strip the space from each of the 5 spaced spellings in use.
-- ============================================================================
UPDATE catalog_engines SET emission_standard = 'Euro2'  WHERE emission_standard = 'Euro 2';
UPDATE catalog_engines SET emission_standard = 'Euro3'  WHERE emission_standard = 'Euro 3';
UPDATE catalog_engines SET emission_standard = 'Euro4'  WHERE emission_standard = 'Euro 4';
UPDATE catalog_engines SET emission_standard = 'Euro5'  WHERE emission_standard = 'Euro 5';
UPDATE catalog_engines SET emission_standard = 'Euro6d' WHERE emission_standard = 'Euro 6d';

-- ============================================================================
-- POSTCONDITION: 0 rows with a space remain.
-- ============================================================================
DO $$
DECLARE
  space_n integer;
BEGIN
  SELECT count(*) INTO space_n FROM catalog_engines WHERE emission_standard ~ ' ';
  IF space_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 catalog_engines rows with a space in emission_standard after normalization, found %.', space_n;
  END IF;
END $$;

-- ============================================================================
-- FREEZE THE VOCABULARY: a real schema-level CHECK, same frozen-vocabulary pattern
-- as transmission_units.family / safety_features.category / drivetrain_systems.type.
-- Includes every spelling actually seen live ('Euro6'/'Euro6c'/'Euro6e' already exist
-- unspaced) plus the now-normalized 'Euro1'..'Euro5'/'Euro6d' -- 'Euro1' has no live
-- rows yet but is included since it's a real, valid standard this column could see.
-- ============================================================================
ALTER TABLE catalog_engines
  ADD CONSTRAINT catalog_engines_emission_standard_check
  CHECK (
    emission_standard IS NULL
    OR emission_standard IN ('Euro1','Euro2','Euro3','Euro4','Euro5','Euro6','Euro6c','Euro6d','Euro6e')
  );

COMMIT;
