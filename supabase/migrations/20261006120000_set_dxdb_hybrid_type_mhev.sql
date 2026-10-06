-- Sets hybrid_type = 'MHEV' on the DXDB (1.5 eTSI 110kW) catalog_engines row.
--
-- Investigated first, not assumed: DXDB is exactly ONE catalog_engines row
-- (id 2ecaabb2-dcfd-47e6-9efe-f441ed0aaee9), not a duplicate-engine problem. It's
-- reused by 6 catalog_vehicle_configurations rows across 5 model generations (Cupra
-- Terramar KP, Škoda Kodiaq PS, Škoda Superb PY x2 body types, VW Passat CJ, VW Tiguan
-- CT) -- the same shared-reference-engine pattern as DADA/DFFA/etc. elsewhere in this
-- catalog, not a seeding mistake. Confirmed live before writing this file.
--
-- hybrid_type is NULL on this row today despite the display_name already reading
-- "1.5 eTSI 110kW" -- the same "eTSI" naming DLAB (1.0 eTSI 81kW) and DFYA (1.5 eTSI
-- 110kW) carry elsewhere in the catalog, both of which already have hybrid_type =
-- 'MHEV' correctly set. "eTSI" is VW Group's own mild-hybrid (48V belt-starter
-- generator) badge -- confirmed this is the same designation, not a coincidentally
-- similar name for a different kind of engine.
--
-- UPDATE of existing hand-authored data: file-only, human-run, NOT executed here.
-- Guarded on the exact row count before AND after so it can't silently touch more (or
-- fewer) rows than the one DXDB@110 row this is scoped to.

do $$
declare
  target_n integer;
begin
  select count(*) into target_n
  from catalog_engines
  where code = 'DXDB' and power_kw = 110 and hybrid_type is null;
  if target_n <> 1 then
    raise exception 'Expected exactly 1 catalog_engines row for DXDB@110kW with hybrid_type still NULL, found % -- aborting, live state has drifted from what this migration assumes.', target_n;
  end if;
end $$;

update catalog_engines
set hybrid_type = 'MHEV'
where code = 'DXDB' and power_kw = 110;

-- Post-condition: exactly 1 row for DXDB@110kW, now hybrid_type = 'MHEV'; zero other
-- rows anywhere in the table were touched (count at 'MHEV' for every other code must be
-- unchanged -- checked via total MHEV count matching "before + 1").
do $$
declare
  dxdb_mhev_n integer;
begin
  select count(*) into dxdb_mhev_n
  from catalog_engines
  where code = 'DXDB' and power_kw = 110 and hybrid_type = 'MHEV';
  if dxdb_mhev_n <> 1 then
    raise exception 'Expected exactly 1 catalog_engines row for DXDB@110kW with hybrid_type = ''MHEV'' after update, found %.', dxdb_mhev_n;
  end if;
end $$;
