-- Add 'DQ500' as an alt_code on the existing 'VW DQ500' transmission_units row, so it
-- resolves by its bare factory code (same as every other VW DSG unit in this table) instead
-- of only its full 'VW DQ500' display form. Confirmed live just now: alt_codes is currently
-- NULL on this row, and 'DQ500' collides with neither another unit's primary code nor any
-- other unit's alt_codes.
--
-- Unblocks Audi A3 (8V)'s DAZA (2.5 TFSI RS3) engine/configs, which are the only consumer of
-- DQ500 so far -- deferred in 20261001073015_seed_audi_a3_8v.sql specifically because this
-- alt_code didn't exist. No other car or table is touched by this file.
--
-- NOT run. Review-only, per this repo's standing discipline. Run in a fresh SQL editor tab.

do $$
declare
  current_alt text[];
begin
  select alt_codes into current_alt from transmission_units where code = 'VW DQ500';
  if current_alt is not null then
    raise exception 'Expected VW DQ500.alt_codes to be NULL before this migration, found %. Live state has drifted since this was written -- re-check before running.', current_alt;
  end if;
end $$;

update transmission_units
set alt_codes = array['DQ500']
where code = 'VW DQ500' and alt_codes is null;

do $$
declare
  n integer;
begin
  select count(*) into n from transmission_units where code = 'VW DQ500' and alt_codes = array['DQ500'];
  if n <> 1 then
    raise exception 'Expected exactly 1 transmission_units row (VW DQ500) updated with alt_codes = {DQ500}, found %.', n;
  end if;
end $$;
