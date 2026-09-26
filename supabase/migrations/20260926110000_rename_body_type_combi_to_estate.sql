-- Renames the catalog body type 'Combi' to 'Estate'. 'Combi' is Škoda's term; 'Estate'
-- is the brand-neutral name for the same wagon body style, shared across brands (VW
-- calls it Variant, etc.) so the catalog keeps ONE row per body style instead of one
-- per brand's marketing word.
--
-- Label change only: the row's id is unchanged, so every catalog_vehicle_configurations,
-- phase_body_dimensions and catalog_media row referencing that body_type_id is
-- unaffected — they simply read 'Estate' from now on.
--
-- ORDERING NOTE for rebuilds: earlier migrations resolve this body type by the name
-- 'Combi' (Octavia seeds, refine_phase_body_dimensions, ...). This file must run AFTER
-- all of them; anything written after it must use 'Estate'.
--
-- UPDATE of existing data: review-only, NOT executed. ONE transaction; guards raise ->
-- rollback: no 'Estate' row may already exist (catalog_body_types.name is unique, so
-- that would collide), and exactly 1 row is renamed.

begin;

do $$
declare
  n integer;
begin
  if exists (select 1 from catalog_body_types where name = 'Estate') then
    raise exception 'A body type named ''Estate'' already exists — renaming Combi would collide. Aborting.';
  end if;

  update catalog_body_types set name = 'Estate' where name = 'Combi';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Expected exactly 1 body type renamed Combi -> Estate, % affected — aborting.', n;
  end if;
end $$;

commit;
