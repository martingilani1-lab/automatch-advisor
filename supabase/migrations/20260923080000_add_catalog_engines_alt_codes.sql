-- Adds alt_codes to catalog_engines — an engine's secondary factory codes
-- (e.g. AGR primary + ALH alt, both real-world codes for the same 1.9 TDI
-- 66kW unit). Surfaced by the Octavia I (1U) reconcile: every engine in that
-- spec has two valid codes, but catalog_engines' unique key is a single
-- `code` column with no way to record the other one — without this, a
-- future car seeded under an engine's ALT code (e.g. ALH) would silently
-- fail to match the existing row (created under AGR) during Step 1 dictionary
-- reconcile and get duplicated instead of reused.
--
-- Nullable/defaulted to '{}', not part of uniqueness — (code, power_kw) stays
-- the sole unique key exactly as before. alt_codes is additional/searchable
-- data only, so this can't retroactively invalidate any existing row.

alter table catalog_engines
  add column alt_codes text[] default '{}';
