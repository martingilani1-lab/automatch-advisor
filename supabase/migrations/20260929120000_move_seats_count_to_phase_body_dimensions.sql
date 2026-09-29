-- Moves seats_count from catalog_phases (one value per phase) to
-- phase_body_dimensions (one value per phase x body) — seat count genuinely varies by
-- body, not just by phase: the Audi TT (8N) Coupe seats 4 (2+2), the Roadster seats 2, and
-- the current phase-level column can't represent both. Surfaced while seeding the TT.
--
-- DESTRUCTIVE (column move against existing data) — file-only, human-run, NOT executed
-- here. One transaction, verify-before-drop: the migrate step (2) runs and is checked (3)
-- BEFORE the drop (4) — if verification fails, the raise aborts the whole transaction and
-- catalog_phases.seats_count is never touched.
--
-- Every phase currently seeded has exactly one seats_count value that's the same across
-- all its bodies (this move doesn't retroactively fix any car's data — the Coupe/Roadster
-- 4-vs-2 split for the TT is a NEW capability this enables, applied to the TT's own seed
-- separately, not backfilled here for other cars). Step 2 duplicates each phase's current
-- value down to every one of its phase_body_dimensions rows, same pattern already used
-- when dimensions themselves were originally moved to phase_body_dimensions.

begin;

-- 1. Add the new column, nullable (matches every other phase_body_dimensions column).
alter table phase_body_dimensions add column seats_count integer;

-- 2. Migrate: copy each phase's current seats_count into every one of its dimension rows.
update phase_body_dimensions pbd
set seats_count = cp.seats_count
from catalog_phases cp
where cp.id = pbd.phase_id;

-- 3. Verify BEFORE dropping — abort the whole transaction on either failure mode.
do $$
declare
  mismatch_count integer;
  orphan_phase_count integer;
begin
  -- Every phase_body_dimensions row's seats_count must now match its phase's value exactly.
  select count(*) into mismatch_count
  from phase_body_dimensions pbd
  join catalog_phases cp on cp.id = pbd.phase_id
  where pbd.seats_count is distinct from cp.seats_count;

  if mismatch_count > 0 then
    raise exception 'seats_count migration verify failed: % phase_body_dimensions row(s) do not match their phase''s seats_count — aborting before drop.', mismatch_count;
  end if;

  -- A phase with a real seats_count but NO phase_body_dimensions row at all would lose that
  -- data entirely the moment catalog_phases.seats_count is dropped — must not exist.
  select count(*) into orphan_phase_count
  from catalog_phases cp
  where cp.seats_count is not null
    and not exists (select 1 from phase_body_dimensions pbd where pbd.phase_id = cp.id);

  if orphan_phase_count > 0 then
    raise exception 'seats_count migration verify failed: % phase(s) have a seats_count but no phase_body_dimensions row to carry it — aborting before drop.', orphan_phase_count;
  end if;
end $$;

-- 4. Only reached if step 3 didn't raise — safe to drop.
alter table catalog_phases drop column seats_count;

commit;
