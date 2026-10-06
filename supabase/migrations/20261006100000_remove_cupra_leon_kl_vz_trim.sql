-- Removes the 'VZ' trim (and its trim_features) from Cupra León (KL), both phases.
-- Performance editions are configs (engine + gearbox + drivetrain), not trims -- 'VZ' was
-- seeded as a trim row by mistake. Confirmed live before writing this file: exactly 2
-- 'VZ' trim rows (one per phase, tier 2), each with exactly 3 trim_features (19-inch
-- machined copper wheels, DCC adaptive chassis control, Sports steering wheel with
-- engine start & Cupra mode buttons) -- 6 feature rows total.
--
-- DESTRUCTIVE (DELETE on existing hand-authored data): file-only, human-run, NOT
-- executed here. One transaction; features deleted before trims (no FK cascade assumed);
-- guarded on the exact row counts before AND after, scoped by brand + model +
-- generation_code so it can't drift onto an unrelated row.
--
-- The VZ equipment itself is not discarded -- moved to this car's PENDING-ATTRIBUTES.md
-- as "performance-edition equipment: needs config-scoped design" for a later pass.

begin;

do $$
declare
  trim_n integer;
  feature_n integer;
begin
  select count(*) into trim_n
  from catalog_trims ct
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Cupra' and cm.name = 'León' and cp.generation_code = 'KL' and ct.name = 'VZ';
  if trim_n <> 2 then
    raise exception 'Expected exactly 2 ''VZ'' trims for Cupra León (KL), found % -- aborting, live state has drifted from what this migration assumes.', trim_n;
  end if;

  select count(*) into feature_n
  from catalog_trim_features ctf
  join catalog_trims ct on ct.id = ctf.trim_id
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Cupra' and cm.name = 'León' and cp.generation_code = 'KL' and ct.name = 'VZ';
  if feature_n <> 6 then
    raise exception 'Expected exactly 6 trim_features on the ''VZ'' trims, found % -- aborting.', feature_n;
  end if;
end $$;

delete from catalog_trim_features
where trim_id in (
  select ct.id
  from catalog_trims ct
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Cupra' and cm.name = 'León' and cp.generation_code = 'KL' and ct.name = 'VZ'
);

delete from catalog_trims
where id in (
  select ct.id
  from catalog_trims ct
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Cupra' and cm.name = 'León' and cp.generation_code = 'KL' and ct.name = 'VZ'
);

-- Post-condition: zero 'VZ' trims and zero of their features remain for Cupra León (KL).
do $$
declare
  remaining_trim_n integer;
  remaining_feature_n integer;
begin
  select count(*) into remaining_trim_n
  from catalog_trims ct
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Cupra' and cm.name = 'León' and cp.generation_code = 'KL' and ct.name = 'VZ';
  if remaining_trim_n <> 0 then
    raise exception 'Expected 0 ''VZ'' trims remaining, found %.', remaining_trim_n;
  end if;

  select count(*) into remaining_feature_n
  from catalog_trim_features ctf
  join catalog_trims ct on ct.id = ctf.trim_id
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Cupra' and cm.name = 'León' and cp.generation_code = 'KL' and ct.name = 'VZ';
  if remaining_feature_n <> 0 then
    raise exception 'Expected 0 features on ''VZ'' trims remaining, found %.', remaining_feature_n;
  end if;
end $$;

commit;
