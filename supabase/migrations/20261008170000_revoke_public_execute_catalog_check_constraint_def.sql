-- Locks down public.catalog_check_constraint_def (added in 20261008160000) to
-- service_role only. Postgres grants EXECUTE on a newly created function to PUBLIC by
-- default -- 20261008160000's own GRANT ... TO service_role added the access the
-- validate-template.mjs drift check actually needs, but never revoked that default PUBLIC
-- grant alongside it, leaving the function callable via PostgREST by anon/authenticated
-- too. Not a data leak (it only reads pg_catalog metadata -- a CHECK constraint's
-- definition text, not table rows), but schema introspection has no reason to be reachable
-- by anyone but the one service-role script that's its only real caller, and leaving a
-- default-PUBLIC grant unrevoked is exactly the kind of gap a future, more sensitive
-- function could repeat without this precedent on record (see the new CLAUDE.md rule this
-- incident produced).
--
-- ALREADY APPLIED by Martin and confirmed live 2026-10-08 -- re-verified via RPC calls
-- this session: the service-role key gets the real constraint definition back, and the
-- anon key gets "permission denied for function catalog_check_constraint_def" (42501).
-- Recorded here for the migration history, matching this repo's own standing discipline
-- of giving every run migration a file, even when the human ran the statements directly
-- rather than from a pre-written one. Do not re-run blindly -- it's idempotent (a REVOKE
-- of an already-revoked grant is a no-op, same for the GRANT), but there's no reason to.

REVOKE EXECUTE ON FUNCTION public.catalog_check_constraint_def(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_check_constraint_def(text, text) TO service_role;
