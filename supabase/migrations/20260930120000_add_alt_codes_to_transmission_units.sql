-- Add alt_codes to transmission_units, mirroring the existing catalog_engines.alt_codes
-- pattern (same array-of-real-codes shape, same "reuse by real identity" purpose). This is
-- prep for consolidating catalog_transmissions into transmission_units: every catalog code
-- that currently identifies a physical gearbox (DQ200, 02E, MQ350, 02J, ...) needs a home on
-- the unit it really is, so the consolidation migration can join by code/alt_code instead of
-- re-deriving the mapping by hand.
--
-- Only units the catalog actually uses get alt_codes populated here -- the other ~50
-- transmission_units rows (Ford PowerShift, Nissan Xtronic, the various "generic:" buckets,
-- etc.) have no catalog_transmissions row referencing them and are left untouched.
--
-- NOT run. Review-only, per this repo's standing discipline. Run in a fresh SQL editor tab.

ALTER TABLE transmission_units ADD COLUMN alt_codes text[];

-- Straight 1:1 units -- alt_codes is just their own catalog code.
UPDATE transmission_units SET alt_codes = ARRAY['DQ200'] WHERE code = 'VW DQ200';
UPDATE transmission_units SET alt_codes = ARRAY['DQ381'] WHERE code = 'VW DQ381';
UPDATE transmission_units SET alt_codes = ARRAY['MQ200'] WHERE code = 'VW MQ200';
UPDATE transmission_units SET alt_codes = ARRAY['MQ250'] WHERE code = 'VW MQ250';
UPDATE transmission_units SET alt_codes = ARRAY['MQ350'] WHERE code = 'VW MQ350';
UPDATE transmission_units SET alt_codes = ARRAY['02J']   WHERE code = 'VW 02J';
UPDATE transmission_units SET alt_codes = ARRAY['02K']   WHERE code = 'VW 02K';
UPDATE transmission_units SET alt_codes = ARRAY['02M']   WHERE code = 'VW 02M';
UPDATE transmission_units SET alt_codes = ARRAY['01M']   WHERE code = 'VW 01M';
UPDATE transmission_units SET alt_codes = ARRAY['09A']   WHERE code = 'Jatco 09A (JF506E)';

-- Units the catalog reaches via more than one code (duplicate catalog rows for the same
-- physical gearbox -- 02E is the DQ250 family code; 09G and "Aisin 09G" are the same Aisin
-- TF-60SN under two different catalog spellings).
UPDATE transmission_units SET alt_codes = ARRAY['DQ250', '02E']        WHERE code = 'VW DQ250';
UPDATE transmission_units SET alt_codes = ARRAY['09G', 'Aisin 09G']    WHERE code = 'Aisin 09G (TF-60SN)';

-- Post-condition: exactly the 12 units above have alt_codes set, nothing else does.
do $$
declare
  found_n integer;
begin
  select count(*) into found_n from transmission_units where alt_codes is not null;
  if found_n <> 12 then
    raise exception 'Expected 12 transmission_units rows with alt_codes set, found %.', found_n;
  end if;
end $$;
