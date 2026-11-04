-- Fix the vocabulary drift check's constraint lookup (found 2026-11-04 while verifying the
-- import check after the dilemma-schema migrations).
--
-- catalog_check_constraint_def(table, column) returned the FIRST CHECK constraint on the table
-- whose text merely mentions the column (ILIKE '%column%', LIMIT 1, no order). Since
-- 20261104210000 added catalog_engines_diesel_flags_check -- "fuel_type <> 'diesel' OR (has_dpf
-- ...)" -- a lookup for catalog_engines.fuel_type now returns THAT constraint instead of
-- catalog_engines_fuel_type_check. validate-template.mjs then reads the live vocabulary as just
-- 'diesel' and reports a false drift ERROR on every car import. Checked live: that is the only
-- one of the 14 vocabulary keys affected today, but any future multi-column CHECK could hit
-- the same thing.
--
-- New order of preference, deterministic:
--   1. the constraint named <table>_<column>_check (the naming convention every vocabulary
--      CHECK in this schema follows);
--   2. otherwise one whose text contains "<column> = ANY (ARRAY[" -- a real vocabulary list;
--   3. otherwise the old behaviour (any CHECK mentioning the column), by name for stability.
--
-- CREATE OR REPLACE keeps the function's existing grants (EXECUTE revoked from PUBLIC / anon /
-- authenticated in 20261008170000) -- re-stated below anyway, per CLAUDE.md's rule for every
-- public function migration. Schema change: human-run only, in a FRESH SQL editor tab.

BEGIN;

CREATE OR REPLACE FUNCTION public.catalog_check_constraint_def(p_table text, p_column text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  SELECT pg_get_constraintdef(con.oid)
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = p_table
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%' || p_column || '%'
  ORDER BY
    (con.conname = p_table || '_' || p_column || '_check') DESC,
    (pg_get_constraintdef(con.oid) ILIKE '%' || p_column || ' = ANY (ARRAY[%') DESC,
    con.conname
  LIMIT 1;
$function$;

REVOKE EXECUTE ON FUNCTION public.catalog_check_constraint_def(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_check_constraint_def(text, text) TO service_role;

-- The case that broke must now resolve to the real vocabulary constraint.
DO $$
BEGIN
  IF public.catalog_check_constraint_def('catalog_engines', 'fuel_type') NOT LIKE '%ARRAY[%''cng''%' THEN
    RAISE EXCEPTION 'catalog_engines.fuel_type still resolves to the wrong constraint -- rolled back';
  END IF;
END $$;

COMMIT;
