-- Correct platform_code from 'MQB' to 'MQB Evo' for SEAT León (KL), Cupra León (KL), and
-- Cupra Formentor (KM7). These three were seeded earlier this session as plain 'MQB' --
-- confirmed stale per your audit correction. This is an UPDATE of existing hand-authored
-- data, so per the standing rule it stays file-only, never auto-executed; the human runs
-- this.
--
-- Guarded on exact row count per generation (2 phases each, confirmed live before writing
-- this file), scoped by brand + model + generation_code so it can't drift onto an
-- unrelated row -- same discipline as every other destructive/UPDATE migration this
-- session (verify-before-write, never a bare UPDATE with no guard).

do $$
declare
  seat_leon_n integer;
  cupra_leon_n integer;
  formentor_n integer;
begin
  select count(*) into seat_leon_n
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'SEAT' and cm.name = 'León' and cp.generation_code = 'KL' and cp.platform_code = 'MQB';
  if seat_leon_n <> 2 then
    raise exception 'Expected 2 SEAT León (KL) phases currently at platform_code=''MQB'', found % -- aborting, live state has drifted from what this migration assumes.', seat_leon_n;
  end if;

  select count(*) into cupra_leon_n
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Cupra' and cm.name = 'León' and cp.generation_code = 'KL' and cp.platform_code = 'MQB';
  if cupra_leon_n <> 2 then
    raise exception 'Expected 2 Cupra León (KL) phases currently at platform_code=''MQB'', found % -- aborting, live state has drifted from what this migration assumes.', cupra_leon_n;
  end if;

  select count(*) into formentor_n
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Cupra' and cm.name = 'Formentor' and cp.generation_code = 'KM7' and cp.platform_code = 'MQB';
  if formentor_n <> 2 then
    raise exception 'Expected 2 Cupra Formentor (KM7) phases currently at platform_code=''MQB'', found % -- aborting, live state has drifted from what this migration assumes.', formentor_n;
  end if;
end $$;

update catalog_phases cp
set platform_code = 'MQB Evo'
from catalog_models cm, catalog_brands cb
where cp.model_id = cm.id
  and cm.brand_id = cb.id
  and (
    (cb.name = 'SEAT' and cm.name = 'León' and cp.generation_code = 'KL')
    or (cb.name = 'Cupra' and cm.name = 'León' and cp.generation_code = 'KL')
    or (cb.name = 'Cupra' and cm.name = 'Formentor' and cp.generation_code = 'KM7')
  )
  and cp.platform_code = 'MQB';

-- Post-condition: exactly 6 rows now at 'MQB Evo' across the three generations, zero
-- remaining at the stale 'MQB' value for these specific generations.
do $$
declare
  updated_n integer;
  remaining_old_n integer;
begin
  select count(*) into updated_n
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cp.platform_code = 'MQB Evo'
    and (
      (cb.name = 'SEAT' and cm.name = 'León' and cp.generation_code = 'KL')
      or (cb.name = 'Cupra' and cm.name = 'León' and cp.generation_code = 'KL')
      or (cb.name = 'Cupra' and cm.name = 'Formentor' and cp.generation_code = 'KM7')
    );
  if updated_n <> 6 then
    raise exception 'Expected 6 phases at platform_code=''MQB Evo'' after update, found %.', updated_n;
  end if;

  select count(*) into remaining_old_n
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cp.platform_code = 'MQB'
    and (
      (cb.name = 'SEAT' and cm.name = 'León' and cp.generation_code = 'KL')
      or (cb.name = 'Cupra' and cm.name = 'León' and cp.generation_code = 'KL')
      or (cb.name = 'Cupra' and cm.name = 'Formentor' and cp.generation_code = 'KM7')
    );
  if remaining_old_n <> 0 then
    raise exception 'Expected 0 phases still at platform_code=''MQB'' for these 3 generations, found %.', remaining_old_n;
  end if;
end $$;
