-- Add the VW MQ281 6-speed manual to transmission_units -- a real gearbox surfaced by the
-- Škoda Scala (NW1) / Kamiq (NW4) intake (paired with the 1.6 TDI 85kW DDYA engine), with
-- no matching row under any existing code or alt_code (confirmed live, both by direct query
-- and reconcile.mjs's MISSING/STOP check). Per CLAUDE.md rule 2b, there is no CREATE path
-- for transmissions the way there is for engines -- this is its own reviewed migration,
-- a prerequisite to seeding Scala/Kamiq, not something generate-seed.mjs can insert inline.
--
-- code follows the established "VW <unit_code>" convention (see VW MQ200/MQ250/MQ350,
-- VW DQ200/DQ250/DQ381/DQ500); alt_codes carries the bare 'MQ281' so generate-seed.mjs's
-- unit_lookup (code = unit_code OR unit_code = any(alt_codes)) resolves it the same way
-- every other car's transmissions.csv already does.
--
-- maker left NULL, matching the dominant convention for MQ/DQ-prefixed units (MQ200,
-- MQ250, MQ350, DQ250, DQ381, DQ500 are all maker=NULL; only DQ200 is an outlier with
-- 'Volkswagen Group' set) -- MQ281 is a direct sibling of the other MQ units, not the
-- older 02J/02K/01M-style codes that do carry a maker value.
--
-- reliability_note / maintenance_note left NULL -- not supplied by the user's spec (unit_code,
-- family, speeds, max_torque_nm only), and per the NULL-over-invention rule this is not
-- content to author/guess. No fault/maintenance authoring was requested for this unit.
--
-- max_torque_nm from the user's spec (340 Nm) is NOT stored here -- transmission_units has
-- no such column (confirmed live schema: id, code, family, maker, speeds, reliability_note,
-- maintenance_note, alt_codes). Noting it here only so the figure isn't silently dropped;
-- flag if a torque-rating column should be added to this table as a separate migration.

do $$
begin
  if exists (select 1 from transmission_units where code = 'VW MQ281' or 'MQ281' = any(alt_codes)) then
    raise exception 'transmission_units already has VW MQ281 (or an alt_code match) -- aborting, nothing inserted.';
  end if;
end $$;

insert into transmission_units (code, family, maker, speeds, alt_codes)
values (
  'VW MQ281',
  'manual',
  null,
  6,
  array['MQ281']
);

-- Post-condition: exactly one new row, resolvable by its alt_code the same way
-- generate-seed.mjs/reconcile.mjs will look it up.
do $$
declare
  found_n integer;
begin
  select count(*) into found_n
  from transmission_units
  where code = 'VW MQ281' and 'MQ281' = any(alt_codes);

  if found_n <> 1 then
    raise exception 'Expected 1 new transmission_units row (VW MQ281), found %.', found_n;
  end if;
end $$;
