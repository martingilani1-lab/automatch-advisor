-- Adds VW DQ400e to transmission_units: the PHEV-specific 6-speed wet-clutch DCT used
-- behind the eHybrid/iV engines (e.g. Golf VIII 1.4 eHybrid, Octavia IV 1.4 TSI iV).
-- Confirmed absent live under any code or alt_code before writing this file.
--
-- PREREQUISITE migration, per CLAUDE.md "Adding a new car / model — RULES" rule 2b: a
-- gearbox with no matching transmission_units row stops the import; there is no CREATE
-- path for transmissions inside a car seed. This file is its own reviewed migration,
-- to be run and confirmed BEFORE the Golf VIII (CD1) and Octavia IV (NX) seeds that
-- reference 'DQ400e' as a unit_code.
--
-- reliability_note/maintenance_note left NULL -- not supplied yet, same as the MQ281
-- precedent (added NULL, filled in later via its own reviewed migration once supplied;
-- batch-verify.mjs will correctly flag this as a gap until then, not silently pass it).
--
-- Additive INSERT: review-only, may run via MCP once reviewed (per Supabase/data-access
-- rules) -- not executed here.

insert into transmission_units (code, family, speeds, alt_codes)
values ('DQ400e', 'dct_wet', 6, '{}')
on conflict (code) do nothing;
