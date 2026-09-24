-- STATUS: already APPLIED to the live DB (recorded here so the migration files
-- stay a truthful rebuild source). Do not re-run against live.
--
-- Part A of the Octavia I (1U) SDI phase-split fix. Additive INSERT only —
-- reviewable, then runnable via MCP once reviewed, per the Supabase/
-- data-access rules.
--
-- The 1.9 SDI was wrongly seeded as a single engine (AGP) covering both 1U
-- phases. Real-world: AGP is the pre-facelift Euro2 spec, AQM is the
-- facelift Euro3 revision of the same displacement/power — two distinct
-- engine codes, not one code with a phase-agnostic reuse. AGP stays exactly
-- as-is (still correctly used by the 2 pre-facelift configs); this file
-- only adds AQM as its own row. The facelift AGP configs get re-pointed to
-- AQM in Part B (20260923150500), a separate destructive file.
--
-- Reconcile-verify (live DB via MCP, read-only, before writing this file):
-- AQM does not exist under any code/alt_code today — genuine CREATE.

insert into catalog_engines (code, display_name, displacement_cc, power_kw, fuel_type, alt_codes)
values ('AQM', '1.9 SDI 50kW (Euro3)', 1896, 50, 'diesel', '{}')
on conflict (code, power_kw) do nothing;
