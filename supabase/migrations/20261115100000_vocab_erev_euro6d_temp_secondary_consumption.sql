-- Vocabulary changes for range-extended EVs (BMW i3 REx first), decided by Martin 2026-11-15.
-- REVIEW-ONLY: written for Martin to run in a fresh SQL editor tab. Not executed by Claude.
--
-- Why each change (docs/intake/research/bmw-i3-i01-rex.md, section 3 + decisions):
--
-- 1. catalog_engines.hybrid_type gains 'EREV' (schema option C). A range extender is a series
--    hybrid: the petrol engine only drives a generator and never the wheels. Storing it as
--    'PHEV' would mislead buyers and push it out of the EV rules; leaving hybrid_type NULL on an
--    electric engine (option A) would make "range extender" something every query must infer
--    from displacement_cc. The engine row stays fuel_type = 'electric', so the Costs tab and
--    the EV tag rules treat it as the EV it is. Upper-case acronym to match MHEV / HEV / PHEV
--    (Martin wrote "range_extender (or erev)"; 'EREV' follows the existing casing).
--
-- 2. catalog_engines.emission_standard gains 'Euro6d-TEMP'. The i3 REx facelift changed from
--    Euro 6c (11/2017-03/2018) to Euro 6d-TEMP (04/2018-09/2018, ADAC Autokatalog 288848 /
--    288849). 'Euro6d' is a later, different stage, so mapping 6d-TEMP onto it would be wrong;
--    many 2018-2020 cars will need the value too. Spelling follows the existing no-space style
--    ('Euro6c', 'Euro6d').
--
-- 3. secondary_consumption_l100km lower bound 1 -> 0.1. A range extender's official petrol
--    figure is below 1 l/100 km (i3 REx NEDC 0.6 / 0.7, BMW technical data 07/2016 and 11/2017),
--    and Martin chose to store it as secondary_fuel_type = 'petrol' + this column. This WIDENS
--    the range on purpose (an explicit decision, not loosening to make an insert pass): every
--    existing row still passes, and nonsense values (0, negatives, > 30) are still rejected.
--    Note: the column was introduced for factory LPG / CNG bi-fuel cars
--    (20261104200000_catalog_fuel_axle_cycle.sql); its FIELD-LEVELS condition ("factory LPG /
--    CNG bi-fuel") needs "or EREV" added in scripts/catalog-field-levels.json (follow-up).
--
-- Nothing here rejects an existing row: (1) and (2) only add values, (3) only lowers a bound.
-- scripts/catalog-vocabularies.json is updated in the SAME commit (CLAUDE.md rule) --
-- validate-template.mjs reports a vocabulary/constraint mismatch until this has run.

begin;

-- 1. hybrid_type + 'EREV'
alter table public.catalog_engines drop constraint catalog_engines_hybrid_type_check;
alter table public.catalog_engines add constraint catalog_engines_hybrid_type_check
  check (hybrid_type is null or hybrid_type in ('MHEV', 'HEV', 'PHEV', 'EREV'));

-- 2. emission_standard + 'Euro6d-TEMP'
alter table public.catalog_engines drop constraint catalog_engines_emission_standard_check;
alter table public.catalog_engines add constraint catalog_engines_emission_standard_check
  check (emission_standard is null or emission_standard in
    ('Euro1', 'Euro2', 'Euro3', 'Euro4', 'Euro5', 'Euro6', 'Euro6c', 'Euro6d-TEMP', 'Euro6d', 'Euro6e'));

-- 3. secondary consumption 0.1-30 l/100 km. The live constraint name is truncated to Postgres'
--    63-character identifier limit ("..._range_chec"), so it is named exactly as it exists.
alter table public.catalog_vehicle_configurations
  drop constraint catalog_vehicle_configurations_secondary_consumption_range_chec;
alter table public.catalog_vehicle_configurations
  add constraint catalog_vehicle_configurations_secondary_consumption_range_chec
  check (secondary_consumption_l100km is null or secondary_consumption_l100km between 0.1 and 30);

-- Verify before commit: all three constraints exist with the new definitions.
do $$
declare n int;
begin
  select count(*) into n from pg_constraint
   where conname in ('catalog_engines_hybrid_type_check',
                     'catalog_engines_emission_standard_check',
                     'catalog_vehicle_configurations_secondary_consumption_range_chec')
     and (pg_get_constraintdef(oid) like '%EREV%'
       or pg_get_constraintdef(oid) like '%Euro6d-TEMP%'
       or pg_get_constraintdef(oid) like '%0.1%');
  if n <> 3 then
    raise exception 'Expected 3 updated constraints, found % -- rolling back.', n;
  end if;
end $$;

commit;
