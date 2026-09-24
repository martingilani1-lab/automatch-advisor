-- Moves per-phase dimension/weight/boot columns off catalog_phases into a new
-- phase_body_dimensions table keyed by (phase, body type), because these values are
-- really per-body (a Combi and a Liftback of the same phase differ in length, height,
-- weight and boot). Also adds three new per-body columns (gross vehicle weight,
-- payload, fuel tank).
--
-- DESTRUCTIVE: step 4 DROPs 7 populated columns from catalog_phases. Review-only,
-- NOT executed. The whole file runs in ONE transaction, and the migrate step (2) and
-- verify step (3) come BEFORE the drop, so any failure aborts and rolls everything
-- back — the drop can never run on data that didn't migrate.
--
-- Sequence:
--   1. create phase_body_dimensions
--   2. copy each phase's current 7 values into one row per body type that ACTUALLY
--      appears in that phase's configs (distinct catalog_vehicle_configurations
--      (phase_id, body_type_id) — never a cross join of all body types). The phase's
--      single representative value is duplicated onto every one of its body rows, as
--      decided (e.g. 1Z Combi and Liftback both get 4572 mm until re-authored per body).
--      New columns (gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters)
--      stay NULL.
--   3. verify: every phase with any non-null moved value has >=1 phase_body_dimensions
--      row, every phase x body pair in configs has a row, and no row disagrees with its
--      phase's values. Any failure raises -> whole transaction rolls back.
--   4. drop ONLY the 7 moved columns from catalog_phases. NCAP, prices, seats, towing,
--      mileage, resale, platform_code etc. stay on catalog_phases.
--
-- Expected: 8 phase_body_dimensions rows at time of writing (4 phases x {Liftback,
-- Combi}, from 64 configs) — re-checked by the verify step, not hard-coded.
--
-- Anything reading catalog_phases.length_mm/... (queries, views, app code) breaks
-- after step 4; check before running.

begin;

-- ════════════════════════════════════════════════════════════
-- 1. CREATE
-- ════════════════════════════════════════════════════════════

create table phase_body_dimensions (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references catalog_phases(id),
  body_type_id uuid not null references catalog_body_types(id),
  length_mm integer,
  width_mm integer,
  height_mm integer,
  ground_clearance_mm integer,
  curb_weight_kg integer,
  boot_capacity_liters integer,
  boot_max_liters integer,
  gross_vehicle_weight_kg integer,
  payload_kg integer,
  fuel_tank_capacity_liters numeric,
  unique (phase_id, body_type_id)
);

create index if not exists idx_phase_body_dimensions_phase_id
  on phase_body_dimensions(phase_id);

-- ════════════════════════════════════════════════════════════
-- 2. MIGRATE existing values (before anything is dropped)
-- ════════════════════════════════════════════════════════════

insert into phase_body_dimensions (
  phase_id, body_type_id,
  length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg,
  boot_capacity_liters, boot_max_liters
)
select
  cp.id, b.body_type_id,
  cp.length_mm, cp.width_mm, cp.height_mm, cp.ground_clearance_mm, cp.curb_weight_kg,
  cp.boot_capacity_liters, cp.boot_max_liters
from catalog_phases cp
join (
  select distinct phase_id, body_type_id from catalog_vehicle_configurations
) b on b.phase_id = cp.id
on conflict (phase_id, body_type_id) do nothing;

-- ════════════════════════════════════════════════════════════
-- 3. VERIFY — abort (roll back) unless everything migrated
-- ════════════════════════════════════════════════════════════

do $$
declare
  unmigrated integer;
  missing_pairs integer;
  mismatched integer;
begin
  -- phases with real moved values but no destination row (would lose data on drop)
  select count(*) into unmigrated
  from catalog_phases cp
  where (cp.length_mm is not null or cp.width_mm is not null or cp.height_mm is not null
      or cp.ground_clearance_mm is not null or cp.curb_weight_kg is not null
      or cp.boot_capacity_liters is not null or cp.boot_max_liters is not null)
    and not exists (select 1 from phase_body_dimensions d where d.phase_id = cp.id);
  if unmigrated <> 0 then
    raise exception '% phase(s) have dimension values but no phase_body_dimensions row (no configs?) — aborting before drop.', unmigrated;
  end if;

  -- every real phase x body pair in configs has a row
  select count(*) into missing_pairs
  from (select distinct phase_id, body_type_id from catalog_vehicle_configurations) c
  where not exists (
    select 1 from phase_body_dimensions d
    where d.phase_id = c.phase_id and d.body_type_id = c.body_type_id
  );
  if missing_pairs <> 0 then
    raise exception '% phase x body pair(s) from configs have no phase_body_dimensions row — aborting before drop.', missing_pairs;
  end if;

  -- copied values must equal the phase's current values
  select count(*) into mismatched
  from phase_body_dimensions d
  join catalog_phases cp on cp.id = d.phase_id
  where d.length_mm            is distinct from cp.length_mm
     or d.width_mm             is distinct from cp.width_mm
     or d.height_mm            is distinct from cp.height_mm
     or d.ground_clearance_mm  is distinct from cp.ground_clearance_mm
     or d.curb_weight_kg       is distinct from cp.curb_weight_kg
     or d.boot_capacity_liters is distinct from cp.boot_capacity_liters
     or d.boot_max_liters      is distinct from cp.boot_max_liters;
  if mismatched <> 0 then
    raise exception '% phase_body_dimensions row(s) do not match their phase values — aborting before drop.', mismatched;
  end if;
end $$;

-- ════════════════════════════════════════════════════════════
-- 4. DROP the 7 moved columns (only these 7)
-- ════════════════════════════════════════════════════════════

alter table catalog_phases
  drop column length_mm,
  drop column width_mm,
  drop column height_mm,
  drop column ground_clearance_mm,
  drop column curb_weight_kg,
  drop column boot_capacity_liters,
  drop column boot_max_liters;

commit;
