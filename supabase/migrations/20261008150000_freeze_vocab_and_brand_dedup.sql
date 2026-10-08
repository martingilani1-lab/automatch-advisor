-- Part 3 of the duplicate-prevention plan: freezes the three remaining open-text vocabulary
-- columns the Part 1 reference-data audit confirmed are already clean (no spelling/format
-- variants live, same audit that caught emission_standard's 'Euro 6d'/'Euro6d' drift and led
-- to 20261006140000_normalize_emission_standard.sql -- this is that fix generalized to the
-- columns still open), plus a case/diacritic-insensitive uniqueness guard on catalog_brands
-- so a future 'Skoda' can't be entered alongside the live 'Škoda' (Part 1 confirmed 0 live
-- brand/model collisions today -- this guards against a NEW one, not a cleanup of an
-- existing one).
--
-- No UPDATE/normalization statements here (unlike 20261006140000) -- Part 1's vocabulary
-- snapshot (2026-10-08) showed every live value already fits the lists below:
--   severity:  critical (17), moderate (24)                    -- no 'minor' rows yet
--   cylinders: L4 (105), V5 (2), L5 (3), L3 (12), V6 (7), VR6 (1)
--   segment:   C (17), S (1), B (10), D (7)
-- Each ADD CONSTRAINT is still preceded by a live precondition check (not re-derived from
-- that snapshot) in case live state has drifted since -- same discipline as every other
-- migration in this pipeline: never trust a stale report, verify live, right before acting.
--
-- Schema-level ALTER TABLE / CREATE EXTENSION / CREATE UNIQUE INDEX: file-only, human-run,
-- NOT executed here.
--
-- Extended before being run (still not run) with 5 more items, re-verified live
-- 2026-10-08 right before writing this:
--   0. (comment only, no DDL) transmission_units_family_check is live with 8 values
--      including a plain 'dct' (widened ad hoc from a scripts/ file outside this
--      migrations/ directory, per that file's own header and CLAUDE.md's "transmission_units
--      includes a third dct state" note) -- 3 live rows currently use family='dct':
--      'generic:7-speed dct', 'generic:6-speed dct', 'generic:8-speed dct'.
--   5. catalog_engines.fuel_type -- 0 live rows use 'hybrid'/'phev' (both values exist only
--      as a historical placeholder in the original CHECK list, never actually seeded --
--      real hybrids/PHEVs in this catalog are plain 'petrol'/'diesel' + a separate
--      `hybrid_type` column). Narrows the CHECK to the 4 values actually in use
--      ('petrol','diesel','electric','lpg') -- but only if that's still true when this runs
--      (re-checked live inside the DO block below, not just at authoring time); if a
--      hybrid/phev row has appeared since, this step lists it and leaves the CHECK
--      unchanged rather than aborting the whole migration over it.
--   6. catalog_phases: unique (model_id, generation_code, phase_label) -- 0 live duplicate
--      groups found (88 rows checked).
--   7. catalog_trims: unique (phase_id, name); catalog_trim_features: unique
--      (trim_id, feature) -- 0 live duplicate groups found on either (297 trims / 957
--      trim_features checked).
--   8. catalog_phases: CHECK (year_to IS NULL OR year_to >= year_from) -- 0 live violations
--      found (88 rows checked).

BEGIN;

-- ============================================================================
-- 1. catalog_component_faults.severity -- freeze to critical/moderate/minor (the vocabulary
--    validate-template.mjs's check 4 already enforces at author-time, now backed by the DB).
-- ============================================================================
DO $$
DECLARE
  bad_n integer;
BEGIN
  SELECT count(*) INTO bad_n
  FROM catalog_component_faults
  WHERE severity IS NOT NULL AND severity NOT IN ('critical', 'moderate', 'minor');
  IF bad_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 catalog_component_faults rows with a severity outside (critical,moderate,minor), found % -- aborting, live state has drifted from what this migration assumes. Normalize those rows in a separate migration before re-running this one.', bad_n;
  END IF;
END $$;

ALTER TABLE catalog_component_faults
  ADD CONSTRAINT catalog_component_faults_severity_check
  CHECK (severity IS NULL OR severity IN ('critical', 'moderate', 'minor'));

-- ============================================================================
-- 2. catalog_engines.cylinders -- freeze to the real cylinder-layout codes seen across this
--    catalog plus a few genuinely-real layouts not yet seeded (so a correct future value
--    isn't blocked by a list sized only to today's data).
-- ============================================================================
DO $$
DECLARE
  bad_n integer;
  allowed text[] := ARRAY['L2','L3','L4','L5','L6','V5','VR6','V6','V8','V10','V12','W12','B4','B6'];
BEGIN
  SELECT count(*) INTO bad_n
  FROM catalog_engines
  WHERE cylinders IS NOT NULL AND NOT (cylinders = ANY(allowed));
  IF bad_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 catalog_engines rows with a cylinders value outside the allowed list, found % -- aborting, live state has drifted from what this migration assumes.', bad_n;
  END IF;
END $$;

ALTER TABLE catalog_engines
  ADD CONSTRAINT catalog_engines_cylinders_check
  CHECK (cylinders IS NULL OR cylinders IN (
    'L2','L3','L4','L5','L6','V5','VR6','V6','V8','V10','V12','W12','B4','B6'
  ));

-- ============================================================================
-- 3. catalog_models.segment -- freeze to the standard EU car-segment letters.
-- ============================================================================
DO $$
DECLARE
  bad_n integer;
  allowed text[] := ARRAY['A','B','C','D','E','F','J','M','S'];
BEGIN
  SELECT count(*) INTO bad_n
  FROM catalog_models
  WHERE segment IS NOT NULL AND NOT (segment = ANY(allowed));
  IF bad_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 catalog_models rows with a segment value outside the allowed list, found % -- aborting, live state has drifted from what this migration assumes.', bad_n;
  END IF;
END $$;

ALTER TABLE catalog_models
  ADD CONSTRAINT catalog_models_segment_check
  CHECK (segment IS NULL OR segment IN ('A','B','C','D','E','F','J','M','S'));

-- ============================================================================
-- 4. catalog_brands -- case/diacritic/whitespace-insensitive uniqueness, so 'Skoda' can't
--    be added next to the live 'Škoda' (Part 1 confirmed 0 live collisions under this
--    normalization -- this is a forward-looking guard, not a cleanup).
--    Requires the unaccent contrib extension (standard on Supabase/Postgres). unaccent()
--    itself is only STABLE, not IMMUTABLE (it depends on the current text search
--    configuration), so Postgres refuses to use it directly in an index expression --
--    wrapped in a trivial IMMUTABLE SQL function instead, the standard workaround. The
--    JS-side normalizeName() helper in scripts/audit-reference-duplicates.mjs/
--    validate-template.mjs/intake-to-template.mjs and this SQL expression must stay in
--    agreement -- both are lowercase + diacritic-strip + whitespace-strip.
--
--    Three failed live attempts before this version (all rolled back in full, confirmed
--    live -- this file's BEGIN/COMMIT wrapping means a failure anywhere undoes everything,
--    not just the failing step):
--      1. unaccent() called before CREATE EXTENSION ran -- fixed by ordering the extension
--         first.
--      2. The two-arg unaccent(regdictionary, text) form called with a bare 'unaccent'
--         dictionary name -- failed ("text search dictionary \"unaccent\" does not exist")
--         because Supabase installs contrib extensions into their own `extensions` schema,
--         not `public`, and an unqualified dictionary name doesn't resolve across schemas.
--      3. Delegating to the plain one-arg unaccent(text) instead -- failed the same way
--         once schema-qualification was tightened, for the same underlying reason.
--    Fixed for real by installing the extension into an explicit schema and fully
--    schema-qualifying BOTH the function call and the dictionary name literal, matching
--    Supabase's own documented pattern for this exact problem.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

DO $$
DECLARE
  dup_n integer;
BEGIN
  SELECT count(*) INTO dup_n
  FROM (
    SELECT lower(regexp_replace(extensions.unaccent(name), '\s+', '', 'g')) AS norm
    FROM catalog_brands
    GROUP BY norm
    HAVING count(*) > 1
  ) collisions;
  IF dup_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 catalog_brands groups colliding under normalized name, found % -- aborting, live state has drifted (new brand added since Part 1''s audit?); resolve the collision before re-running this one.', dup_n;
  END IF;
END $$;

-- SET search_path = '' forces every reference inside the function body to be fully
-- schema-qualified (no implicit resolution against whatever search_path the caller
-- happens to have) -- both belt-and-suspenders safety and the reason the dictionary name
-- argument has to be the schema-qualified text 'extensions.unaccent', not bare 'unaccent'.
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE PARALLEL SAFE STRICT
  SET search_path = ''
  AS $$
    SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1)
  $$;

CREATE UNIQUE INDEX catalog_brands_normalized_name_key
  ON catalog_brands (lower(regexp_replace(public.immutable_unaccent(name), '\s+', '', 'g')));

-- ============================================================================
-- 5. catalog_engines.fuel_type -- narrow the CHECK to the 4 values actually in use, IF
--    still true live. 'hybrid'/'phev' were allowed from this table's original creation but
--    never actually used -- a real hybrid/PHEV engine in this catalog is 'petrol'/'diesel'
--    + a separate hybrid_type column, not its own fuel_type. Conditional, not an abort: if
--    a hybrid/phev row exists when this runs, this step lists it (RAISE NOTICE) and leaves
--    the live CHECK exactly as-is, rather than failing the whole migration over one step
--    that was always optional. The constraint's live name is looked up dynamically (via
--    pg_constraint), never hardcoded -- it was defined inline in the original CREATE TABLE
--    with no explicit name, so Postgres auto-named it, and that name was never independently
--    confirmed (this migration has no way to run an arbitrary SQL lookup before being
--    executed -- the lookup has to happen here, at actual run time).
-- ============================================================================
DO $$
DECLARE
  bad_n integer;
  bad_rows text;
  cons_name text;
BEGIN
  SELECT count(*), string_agg(code || '@' || power_kw || 'kW:' || fuel_type, ', ')
    INTO bad_n, bad_rows
  FROM catalog_engines
  WHERE fuel_type IN ('hybrid', 'phev');

  IF bad_n <> 0 THEN
    RAISE NOTICE 'catalog_engines.fuel_type: % row(s) use hybrid/phev (%) -- leaving the live CHECK unchanged, not narrowing it.', bad_n, bad_rows;
  ELSE
    SELECT con.conname INTO cons_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'catalog_engines'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%fuel_type%';

    IF cons_name IS NULL THEN
      RAISE EXCEPTION 'Could not find catalog_engines fuel_type CHECK constraint live by introspection -- aborting rather than guessing its name.';
    END IF;

    EXECUTE format('ALTER TABLE catalog_engines DROP CONSTRAINT %I', cons_name);
    ALTER TABLE catalog_engines
      ADD CONSTRAINT catalog_engines_fuel_type_check
      CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'lpg'));
  END IF;
END $$;

-- ============================================================================
-- 6. catalog_phases: a model/generation/phase combination should exist at most once.
-- ============================================================================
DO $$
DECLARE
  dup_n integer;
BEGIN
  SELECT count(*) INTO dup_n
  FROM (
    SELECT model_id, generation_code, phase_label
    FROM catalog_phases
    GROUP BY model_id, generation_code, phase_label
    HAVING count(*) > 1
  ) collisions;
  IF dup_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 catalog_phases groups duplicating (model_id,generation_code,phase_label), found % -- aborting, resolve the duplicate(s) before re-running this.', dup_n;
  END IF;
END $$;

ALTER TABLE catalog_phases
  ADD CONSTRAINT catalog_phases_model_generation_phase_key
  UNIQUE (model_id, generation_code, phase_label);

-- ============================================================================
-- 7. catalog_trims / catalog_trim_features -- a trim name should exist at most once per
--    phase, and a feature line at most once per trim.
-- ============================================================================
DO $$
DECLARE
  dup_n integer;
BEGIN
  SELECT count(*) INTO dup_n
  FROM (
    SELECT phase_id, name
    FROM catalog_trims
    GROUP BY phase_id, name
    HAVING count(*) > 1
  ) collisions;
  IF dup_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 catalog_trims groups duplicating (phase_id,name), found % -- aborting, resolve the duplicate(s) before re-running this.', dup_n;
  END IF;
END $$;

ALTER TABLE catalog_trims
  ADD CONSTRAINT catalog_trims_phase_id_name_key
  UNIQUE (phase_id, name);

DO $$
DECLARE
  dup_n integer;
BEGIN
  SELECT count(*) INTO dup_n
  FROM (
    SELECT trim_id, feature
    FROM catalog_trim_features
    GROUP BY trim_id, feature
    HAVING count(*) > 1
  ) collisions;
  IF dup_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 catalog_trim_features groups duplicating (trim_id,feature), found % -- aborting, resolve the duplicate(s) before re-running this.', dup_n;
  END IF;
END $$;

ALTER TABLE catalog_trim_features
  ADD CONSTRAINT catalog_trim_features_trim_id_feature_key
  UNIQUE (trim_id, feature);

-- ============================================================================
-- 8. catalog_phases -- a phase's end year, if given, can't be before its start year.
-- ============================================================================
DO $$
DECLARE
  bad_n integer;
BEGIN
  SELECT count(*) INTO bad_n
  FROM catalog_phases
  WHERE year_to IS NOT NULL AND year_from IS NOT NULL AND year_to < year_from;
  IF bad_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 catalog_phases rows with year_to < year_from, found % -- aborting, this CHECK would reject live data.', bad_n;
  END IF;
END $$;

ALTER TABLE catalog_phases
  ADD CONSTRAINT catalog_phases_year_range_check
  CHECK (year_to IS NULL OR year_from IS NULL OR year_to >= year_from);

COMMIT;
