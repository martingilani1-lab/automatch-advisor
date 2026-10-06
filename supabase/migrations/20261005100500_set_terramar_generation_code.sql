-- Sets Cupra Terramar's generation_code to 'KP' (supplied by Martin). Terramar currently
-- has exactly 1 phase live (Pre-facelift) -- confirmed live before writing this file; it
-- is NOT yet a 2-phase car like its MQB Evo siblings, so this patch touches that 1 row
-- only. platform_code is already correctly 'MQB Evo' and is untouched here.
--
-- Guarded: aborts unless exactly 1 Cupra Terramar phase is currently generation_code
-- IS NULL (so it can't silently clobber a code set by another path), and unless 'KP'
-- doesn't already collide with another model's generation_code (checked live: it
-- doesn't, but the guard re-checks at run time in case that's changed).
--
-- UPDATE of existing data: review-only, NOT executed.

do $$
declare
  target_n integer;
  collision_n integer;
begin
  select count(*) into collision_n
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  where cp.generation_code = 'KP' and cm.name <> 'Terramar';
  if collision_n <> 0 then
    raise exception '''KP'' is already used as a generation_code by % other model phase(s) -- aborting, pick a different code or confirm the collision is intentional.', collision_n;
  end if;

  select count(*) into target_n
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Cupra' and cm.name = 'Terramar' and cp.generation_code is null;
  if target_n <> 1 then
    raise exception 'Expected exactly 1 Cupra Terramar phase with generation_code NULL, found % -- aborting, live state has drifted from what this migration assumes.', target_n;
  end if;
end $$;

update catalog_phases cp
set generation_code = 'KP'
from catalog_models cm, catalog_brands cb
where cp.model_id = cm.id
  and cm.brand_id = cb.id
  and cb.name = 'Cupra' and cm.name = 'Terramar'
  and cp.generation_code is null;

-- Post-condition: exactly 1 Terramar phase now at 'KP', zero still NULL.
do $$
declare
  updated_n integer;
  remaining_null_n integer;
begin
  select count(*) into updated_n
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Cupra' and cm.name = 'Terramar' and cp.generation_code = 'KP';
  if updated_n <> 1 then
    raise exception 'Expected 1 Terramar phase at generation_code=''KP'' after update, found %.', updated_n;
  end if;

  select count(*) into remaining_null_n
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Cupra' and cm.name = 'Terramar' and cp.generation_code is null;
  if remaining_null_n <> 0 then
    raise exception 'Expected 0 Terramar phases still NULL, found %.', remaining_null_n;
  end if;
end $$;
