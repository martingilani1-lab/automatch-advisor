-- Exposes a live CHECK constraint's raw definition text via RPC, so a service-role Node
-- script (validate-template.mjs) can detect drift between its hardcoded vocabulary list
-- (scripts/catalog-vocabularies.json) and the actual DB constraint -- the exact failure
-- mode that let emission_standard silently drift into two spellings ('Euro 6d' vs
-- 'Euro6d') before 20261006140000 caught and froze it, and nearly happened again with
-- fuel_type during the Part 3 migration (20261008150000) that just ran.
--
-- PostgREST only exposes ordinary tables/views in its configured schema -- pg_catalog
-- (where pg_constraint lives) isn't reachable through the REST API at all, confirmed this
-- session (querying "information_schema.table_constraints" through supabase-js returned
-- PGRST205 "could not find the table"). This RPC is the only way a service-role script can
-- read a live constraint's definition without a direct Postgres connection.
--
-- Deliberately returns the RAW definition text (e.g.
-- "CHECK ((fuel_type)::text = ANY (ARRAY['petrol'::text, 'diesel'::text, ...]))") rather
-- than trying to parse out the value list in SQL -- regex-splitting a CHECK clause's
-- quoted literals reliably is straightforward in JS (scripts/validate-template.mjs just
-- matches /'([^']*)'/g against it) and not worth re-implementing in PL/pgSQL.
--
-- STABLE, no SECURITY DEFINER (reads only pg_catalog metadata, not table data -- no
-- privilege escalation needed), granted to service_role only -- this app never reads with
-- any other role (see CLAUDE.md: every route handler uses the service-role key).
--
-- Schema-level CREATE FUNCTION: file-only, human-run, NOT executed here.

CREATE OR REPLACE FUNCTION public.catalog_check_constraint_def(p_table text, p_column text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT pg_get_constraintdef(con.oid)
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = p_table
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%' || p_column || '%'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.catalog_check_constraint_def(text, text) TO service_role;
