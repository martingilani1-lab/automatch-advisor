-- Adds catalog_phases.platform_code: the underlying VAG-style platform (PQ34, PQ35,
-- MQB, ...), so technically identical cars across models/brands can be
-- cross-referenced (e.g. Octavia II 1Z shares PQ35 with Golf V/VI — the old vehicles
-- row's general_pros already says "PQ35 platform shared with Golf V/VI").
--
-- Nullable, free text on purpose: not every car has a known/meaningful platform, and
-- NULL must read as "unknown", never as a platform. Deliberately NOT a CHECK/frozen
-- vocabulary — the platform list is open-ended across 40+ brands; add a dictionary
-- table later if cross-referencing needs real joins.
--
-- Backfill: the 4 existing phases. Octavia I (1U), both phases -> 'PQ34'; Octavia II
-- (1Z), both phases -> 'PQ35' (1Z = PQ35 confirmed against the old vehicles row).
--
-- Schema change + UPDATE of existing rows: review-only, NOT executed. Purely additive
-- ALTER; the UPDATE only fills rows whose platform_code is still NULL and aborts
-- unless it touches exactly the 4 expected phases.

alter table catalog_phases
  add column platform_code text;

do $$
declare
  n integer;
begin
  update catalog_phases cp
  set platform_code = case cp.generation_code when '1U' then 'PQ34' when '1Z' then 'PQ35' end
  from catalog_models cm
  join catalog_brands cb on cb.id = cm.brand_id
  where cm.id = cp.model_id
    and cb.name = 'Škoda' and cm.name = 'Octavia'
    and cp.generation_code in ('1U', '1Z')
    and cp.platform_code is null;
  get diagnostics n = row_count;
  if n <> 4 then
    raise exception 'Expected exactly 4 Octavia phases (1U x2, 1Z x2) backfilled with platform_code, % affected — aborting.', n;
  end if;
end $$;
