-- STATUS: already APPLIED to the live DB (recorded here so the migration files
-- stay a truthful rebuild source). Do not re-run against live. On a fresh
-- rebuild, it must run after 20260923150000 (needs AQM to exist).
--
-- Part B of the Octavia I (1U) SDI phase-split fix. DESTRUCTIVE (UPDATE
-- against existing hand-authored rows) — file-only per the Supabase/
-- data-access rules, run this yourself, SECOND, after Part A
-- (20260923150000_add_aqm_sdi_engine.sql) has created AQM.
--
-- Reconcile-verify (live DB via MCP, read-only, before writing this file)
-- found exactly 4 configs on engine AGP, 2 per phase:
--   Facelift:     d35dd5cf-bf43-4d62-893d-5fffb7c1f043 (Combi, 02J)
--                 3dd70688-03f8-4400-b493-07d9ff00a7e9 (Liftback, 02J)
--   Pre-facelift: 24f4b114-8906-4c9b-a6ff-3c6d23dd198a (Combi, 02J)
--                 f46d3979-68e6-4bb0-9658-6298cc50dc95 (Liftback, 02J)
-- Only the two Facelift rows should move to AQM. The WHERE clause below
-- scopes on engine_id = AGP AND phase_id = the 1U Facelift phase
-- specifically (not just "Facelift" by label — that label also exists on
-- the unrelated Octavia II 1Z phases, scoped out via generation_code='1U')
-- so it structurally cannot touch the 2 Pre-facelift AGP rows.
--
-- Wrapped in a DO block with an explicit row-count guard: if the live data
-- has drifted since the reconcile above (anything other than exactly 2 rows
-- matching), the whole update aborts with an error instead of silently
-- re-pointing the wrong number of configs.

do $$
declare
  affected_rows integer;
begin
  update catalog_vehicle_configurations
  set engine_id = (select id from catalog_engines where code = 'AQM' and power_kw = 50)
  where engine_id = (select id from catalog_engines where code = 'AGP' and power_kw = 50)
    and phase_id = (
      select id from catalog_phases
      where model_id = '39d151a4-599a-456b-84bf-daf7d4a459ec'
        and generation_code = '1U'
        and phase_label = 'Facelift'
    );

  get diagnostics affected_rows = row_count;
  if affected_rows <> 2 then
    raise exception 'Expected exactly 2 facelift AGP configs to be re-pointed to AQM, but % were affected — aborting, nothing committed.', affected_rows;
  end if;
end $$;
