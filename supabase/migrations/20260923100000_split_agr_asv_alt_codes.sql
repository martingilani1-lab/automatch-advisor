-- PART A of the Octavia I (1U) full-spec seed. DESTRUCTIVE (UPDATE against
-- existing hand-authored rows) — file-only per the Supabase/data-access
-- rules, run this yourself, do not ask the agent to apply it via MCP.
--
-- Splits two engine rows that were seeded as one primary code + one alt code
-- into two independent rows, because the "alt code" relationship assumed in
-- the original Octavia I seed was wrong: AGR/ALH and ASV/AHF are NOT the same
-- unit under two factory labels — they're distinct real engines used in
-- different 1U phases (Wastegate vs VNT turbo for the 66kW pair; Euro3 vs
-- Euro2 emissions spec for the 81kW pair).
--
-- Reconcile-verify (run live via MCP before writing this file):
--   - AGR (id 265e68ff-b786-4f33-b241-784f80179cad) is referenced by exactly
--     ONE existing config: Pre-facelift / Liftback / 02J / FWD. Stays on AGR
--     after the split — no re-pointing needed, that config is already correct.
--   - ASV (id 0baa490c-7061-4cec-9991-f0526bcb485d) is referenced by exactly
--     ONE existing config: Facelift / Liftback / 02J / FWD. Stays on ASV
--     after the split — no re-pointing needed either.
--   - Neither ALH nor AHF exists as its own row anywhere yet (only nested
--     inside AGR's/ASV's alt_codes, about to be removed below).
-- So this split does NOT require touching catalog_vehicle_configurations at
-- all — both existing configs already point at the correct post-split row.

-- Step 1: strip the alt_codes that are becoming independent rows.
update catalog_engines set alt_codes = '{}', display_name = '1.9 TDI 66kW (Wastegate)' where code = 'AGR';
update catalog_engines set alt_codes = '{}', display_name = '1.9 TDI 81kW (Euro3)' where code = 'ASV';

-- Step 2: create the two split-off rows as independent engines.
insert into catalog_engines (code, display_name, displacement_cc, power_kw, fuel_type, alt_codes)
values
  ('ALH', '1.9 TDI 66kW (VNT)', 1896, 66, 'diesel', '{}'),
  ('AHF', '1.9 TDI 81kW (Euro2)', 1896, 81, 'diesel', '{}')
on conflict (code, power_kw) do nothing;
