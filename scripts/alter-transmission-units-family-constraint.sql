-- Adds 'dct' to transmission_units.family's allowed values — meaning "dual-clutch,
-- dry/wet unspecified", for the 3 generic-DCT groups (generic:7-speed dct,
-- generic:6-speed dct, generic:8-speed dct — 36 cars) whose specific unit isn't
-- identifiable in the source data, so dry-vs-wet genuinely isn't known. Not a guess
-- at either value — 'dct' is an honest third state, not a stand-in for one of them.
--
-- Checked: this exact constraint (dct_dry/dct_wet/torque_converter/cvt/manual/amt/
-- single_speed) is defined ONLY on transmission_units.family — grepped every
-- migration for those value strings, no other table/constraint reuses this list
-- (drivetrain_systems.type is a separate, differently-valued CHECK). Nothing else
-- to touch.
--
-- Constraint name assumed: Postgres auto-names an unnamed column-level CHECK as
-- <table>_<column>_check, so this should be transmission_units_family_check — the
-- original migration (20260724120000_transmission_drivetrain_reference_tables.sql)
-- didn't give it an explicit name. I can't query pg_constraint directly from here
-- (no direct Postgres connection, only the Supabase REST/PostgREST client) to
-- confirm this — verify the actual name (e.g. via the Supabase table editor's
-- constraints view, or \d transmission_units in psql/SQL editor) before running;
-- if it differs, swap the name in the DROP CONSTRAINT line below.
--
-- Review before running. NOT executed against Supabase.

alter table transmission_units drop constraint transmission_units_family_check;

alter table transmission_units add constraint transmission_units_family_check
  check (family in (
    'dct_dry', 'dct_wet', 'dct', 'torque_converter', 'cvt', 'manual', 'amt', 'single_speed'
  ));
