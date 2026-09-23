-- Part A addition to the Octavia I (1U) full-spec seed. DESTRUCTIVE (UPDATE
-- against an existing hand-authored row) — file-only per the Supabase/
-- data-access rules, run this yourself.
--
-- PREREQUISITE: run 20260923110000_octavia_i_1u_remaining_engines_and_faults.sql
-- FIRST — ARX doesn't exist yet on the live DB (confirmed via MCP: only that
-- file creates it). Running this before it would resolve the ARX subquery to
-- NULL and fail on catalog_vehicle_configurations.engine_id's NOT NULL
-- constraint (a safe hard failure, not silent corruption, but still needs
-- the right order).
--
-- Re-points the existing Facelift/Combi/02M/haldex_gen1 config from AGU to
-- ARX. Ruling: AGU never had a factory 4x4 — the 1U's 1.8T 4x4 variant was
-- specifically ARX. AGU stays a valid FWD-only engine (gets its own new
-- FWD configs in the Part B file).
--
-- Reconcile-verify (live DB via MCP, read-only, before writing this file):
-- exactly ONE existing config references AGU — id ec78eff7-091a-4bb7-b5b2-
-- da880827a392 (Facelift / Combi / 02M / haldex_gen1). No other config
-- touches AGU, so this UPDATE affects exactly one row.

update catalog_vehicle_configurations
set engine_id = (select id from catalog_engines where code = 'ARX' and power_kw = 110)
where id = 'ec78eff7-091a-4bb7-b5b2-da880827a392';
