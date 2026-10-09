-- Extends catalog_component_faults from 2 levels (engine/transmission) to 4
-- (engine/transmission/drivetrain/vehicle), adding the FK columns and exactly-one-target
-- CHECK the 2 new levels need, plus a `category` column required for vehicle-level faults
-- only (frozen vocabulary, matching the same CHECK-constraint pattern as every other
-- enum-like catalog_ column -- see scripts/catalog-vocabularies.json and CLAUDE.md's
-- frozen-vocabulary rule).
--
-- Live state confirmed via the catalog_check_constraint_def RPC before writing this: the
-- CURRENT single combined CHECK constraint on this table (its name was never looked up --
-- it's found dynamically below, the same pattern used for catalog_engines.fuel_type in
-- 20261008150000) already does double duty as both the component_type vocabulary check AND
-- the exactly-one-FK check, in one expression:
--   CHECK (
--     (component_type = 'engine' AND engine_id IS NOT NULL AND unit_id IS NULL)
--     OR (component_type = 'transmission' AND unit_id IS NOT NULL AND engine_id IS NULL)
--   )
-- The 41 live rows (32 engine, 9 transmission) all already satisfy this -- the new 4-way
-- version is a strict superset (the engine/transmission branches are unchanged), so no
-- existing row needs touching, only the constraint itself needs replacing. Still guarded
-- with an explicit precondition count before dropping it, same discipline as every other
-- migration in this pipeline: never trust a stale report, verify live, right before acting.
--
-- ALREADY LIVE -- confirmed via the catalog_check_constraint_def RPC and a direct column
-- probe right before writing this file: drivetrain_id, phase_id, and category all exist,
-- and the live exactly-one-FK CHECK is already the 4-way version below, word-for-word.
-- Not run by this session or anyone in this conversation; most likely applied by the same
-- parallel session that built app/catalog the day before. Kept here, unmodified from its
-- originally-intended design, as the documented record of what's live -- do NOT run this
-- file (the ADD COLUMN statements will error: the columns already exist).

BEGIN;

-- ============================================================================
-- Precondition: exactly 41 rows, all component_type IN ('engine','transmission'), each
-- satisfying the OLD exactly-one-FK shape -- confirms live state hasn't drifted from what
-- this migration assumes before touching the constraint.
-- ============================================================================
DO $$
DECLARE
  total_n integer;
  valid_n integer;
BEGIN
  SELECT count(*) INTO total_n FROM catalog_component_faults;
  IF total_n <> 41 THEN
    RAISE EXCEPTION 'Expected exactly 41 catalog_component_faults rows, found % -- aborting, live state has drifted from what this migration assumes.', total_n;
  END IF;

  SELECT count(*) INTO valid_n
  FROM catalog_component_faults
  WHERE (component_type = 'engine' AND engine_id IS NOT NULL AND unit_id IS NULL)
     OR (component_type = 'transmission' AND unit_id IS NOT NULL AND engine_id IS NULL);
  IF valid_n <> 41 THEN
    RAISE EXCEPTION 'Expected all 41 rows to satisfy the existing engine/transmission exactly-one-FK shape, found % -- aborting.', valid_n;
  END IF;
END $$;

-- ============================================================================
-- New columns: drivetrain_id (FK drivetrain_systems) and phase_id (FK catalog_phases),
-- both nullable -- NULL on every existing row by construction (only a NEW drivetrain/
-- vehicle-level fault will ever set one).
-- ============================================================================
ALTER TABLE catalog_component_faults
  ADD COLUMN drivetrain_id uuid REFERENCES drivetrain_systems(id),
  ADD COLUMN phase_id uuid REFERENCES catalog_phases(id);

-- ============================================================================
-- Replace the old 2-way combined CHECK with the new 4-way one. Constraint name looked up
-- dynamically (never hardcoded -- it was never explicitly named, same situation as
-- catalog_engines.fuel_type in 20261008150000).
-- ============================================================================
DO $$
DECLARE
  cons_name text;
BEGIN
  SELECT con.conname INTO cons_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'catalog_component_faults'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%component_type%'
    AND pg_get_constraintdef(con.oid) ILIKE '%engine_id%';

  IF cons_name IS NULL THEN
    RAISE EXCEPTION 'Could not find catalog_component_faults'' existing component_type/exactly-one-FK CHECK constraint live by introspection -- aborting rather than guessing its name.';
  END IF;

  EXECUTE format('ALTER TABLE catalog_component_faults DROP CONSTRAINT %I', cons_name);
END $$;

ALTER TABLE catalog_component_faults
  ADD CONSTRAINT catalog_component_faults_type_exactly_one_check
  CHECK (
    (component_type = 'engine' AND engine_id IS NOT NULL AND unit_id IS NULL AND drivetrain_id IS NULL AND phase_id IS NULL)
    OR (component_type = 'transmission' AND unit_id IS NOT NULL AND engine_id IS NULL AND drivetrain_id IS NULL AND phase_id IS NULL)
    OR (component_type = 'drivetrain' AND drivetrain_id IS NOT NULL AND engine_id IS NULL AND unit_id IS NULL AND phase_id IS NULL)
    OR (component_type = 'vehicle' AND phase_id IS NOT NULL AND engine_id IS NULL AND unit_id IS NULL AND drivetrain_id IS NULL)
  );

-- ============================================================================
-- category: required for vehicle-level faults, NULL for every other level. Frozen
-- vocabulary -- if a genuinely new category is needed later, that's a real migration
-- (DROP/ADD CONSTRAINT), not a free-text column (CLAUDE.md's standing frozen-vocabulary
-- rule). Add to scripts/catalog-vocabularies.json in the same commit as any future change
-- to this list, same discipline as the other 8 vocab columns already tracked there.
-- ============================================================================
ALTER TABLE catalog_component_faults
  ADD COLUMN category text;

ALTER TABLE catalog_component_faults
  ADD CONSTRAINT catalog_component_faults_category_check
  CHECK (
    (component_type = 'vehicle' AND category IN ('electrical', 'body_rust', 'suspension', 'steering', 'brakes', 'climate', 'interior'))
    OR (component_type <> 'vehicle' AND category IS NULL)
  );

-- ============================================================================
-- Postcondition: the 41 existing rows are untouched and still valid under the NEW
-- constraint (they must be, since engine/transmission branches are unchanged -- this just
-- confirms the replace didn't silently corrupt anything).
-- ============================================================================
DO $$
DECLARE
  total_n integer;
  valid_n integer;
BEGIN
  SELECT count(*) INTO total_n FROM catalog_component_faults;
  IF total_n <> 41 THEN
    RAISE EXCEPTION 'Expected 41 catalog_component_faults rows after this migration, found %.', total_n;
  END IF;

  SELECT count(*) INTO valid_n
  FROM catalog_component_faults
  WHERE (component_type = 'engine' AND engine_id IS NOT NULL AND unit_id IS NULL AND drivetrain_id IS NULL AND phase_id IS NULL)
     OR (component_type = 'transmission' AND unit_id IS NOT NULL AND engine_id IS NULL AND drivetrain_id IS NULL AND phase_id IS NULL);
  IF valid_n <> 41 THEN
    RAISE EXCEPTION 'Expected all 41 existing rows to still satisfy the exactly-one-FK shape after extending to 4 levels, found %.', valid_n;
  END IF;
END $$;

COMMIT;
