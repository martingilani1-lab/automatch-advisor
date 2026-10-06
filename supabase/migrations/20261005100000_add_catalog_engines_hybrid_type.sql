-- Adds hybrid_type to catalog_engines: NULL (default, non-hybrid), 'MHEV' (mild hybrid,
-- e.g. 1.5 eTSI / e-TEC), or 'PHEV' (plug-in hybrid, e.g. eHybrid / iV). A SEPARATE column
-- from fuel_type, not a reuse of fuel_type's existing (unused) 'hybrid'/'phev' CHECK
-- values -- an eHybrid/eTSI engine still burns petrol, so "what fuel" and "how
-- electrified" are two orthogonal facts. Folding them into one column (e.g.
-- 'petrol_mhev') would make "all petrol engines" a 4-way OR instead of one equality,
-- and isn't needed: fuel_type is a plain CHECK-constrained text column here, not a
-- true Postgres enum, so adding a column is no harder than extending the CHECK would
-- have been -- there's no structural reason to pick the messier option.
--
-- Nullable: every one of the 111 existing engine rows is non-hybrid and gets NULL --
-- "addressed, not necessarily filled" per the import-car skill; NULL means "not a
-- hybrid", never "unknown".
--
-- Purely additive schema change: review-only, NOT executed.

alter table catalog_engines
  add column hybrid_type text;

alter table catalog_engines
  add constraint catalog_engines_hybrid_type_check
  check (hybrid_type is null or hybrid_type in ('MHEV', 'PHEV'));
