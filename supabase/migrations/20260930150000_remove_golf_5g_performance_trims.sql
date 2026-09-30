-- Remove the GTI/GTD/R trims (and their features) from Golf VII (5G). These were authored
-- as phase-level trims in 20260930140000_golf_5g_attribute_pass.sql, which already ran and is
-- committed live -- that migration is NOT edited here, per standing discipline. This is a
-- correction migration on top of it: a performance edition (GTI/GTD/R) is an engine +
-- configuration, never a trim -- a phase-level trim attaches to every config in the phase,
-- which is wrong for something that only ever existed on one specific engine/gearbox/
-- drivetrain combination. Their equipment (tartan seats, upgraded brakes, active suspension/
-- DCC, aggressive aero styling) stays recorded in
-- scripts/cars/vw-golf-5g/PENDING-ATTRIBUTES.md under "Performance-edition equipment: needs a
-- config-scoped design" -- not lost, just not seeded until that design exists.
--
-- Scoped by model AND generation_code = '5G' throughout -- catalog_models is one row per
-- brand+model shared across ALL generations (the same root cause as the phases-guard bug
-- fixed earlier this session), so an unscoped "name in ('GTI','GTD','R')" delete could just
-- as easily hit Golf IV (1J)'s own trims if it has any live under those names. Every query
-- below joins through catalog_phases.generation_code = '5G' -- Golf IV is never touched.
--
-- ONE transaction: delete catalog_trim_features first (FK dependency on catalog_trims),
-- then the 6 trims themselves with a row-count guard, then a post-condition asserting
-- exactly 8 trims remain for Golf 5G.
--
-- NOT run. Review-only, per this repo's standing discipline. Run in a fresh SQL editor tab,
-- after confirming 20260930140000 has already been applied (it has).

BEGIN;

-- 1. Delete trim_features belonging to GTI/GTD/R for Golf 5G specifically (FK dependency,
-- must go before the trims themselves).
delete from catalog_trim_features
where trim_id in (
  select ct.id
  from catalog_trims ct
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '5G'
    and ct.name in ('GTI', 'GTD', 'R')
);

-- 2. Delete the trims themselves (GTI, GTD, R x 2 phases = 6 rows), guarded on exactly 6.
do $$
declare n integer;
begin
  delete from catalog_trims
  where id in (
    select ct.id
    from catalog_trims ct
    join catalog_phases cp on cp.id = ct.phase_id
    join catalog_models cm on cm.id = cp.model_id
    join catalog_brands cb on cb.id = cm.brand_id
    where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '5G'
      and ct.name in ('GTI', 'GTD', 'R')
  );
  get diagnostics n = row_count;
  if n <> 6 then
    raise exception 'Expected exactly 6 trims deleted (GTI/GTD/R x 2 phases) for Golf 5G, got %.', n;
  end if;
end $$;

-- 3. Post-condition: exactly 8 trims remain for Golf 5G (Trendline/Comfortline/Highline/
-- R-Line x 2 phases). Explicitly re-scoped to generation_code = '5G' -- if this ever found
-- rows belonging to Golf IV (1J) it would mean step 1/2 leaked across generations, and this
-- assertion would catch it before COMMIT.
do $$
declare n integer;
begin
  select count(*) into n
  from catalog_trims ct
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '5G';
  if n <> 8 then
    raise exception 'Expected exactly 8 catalog_trims rows remaining for Golf 5G, found %.', n;
  end if;
end $$;

COMMIT;
