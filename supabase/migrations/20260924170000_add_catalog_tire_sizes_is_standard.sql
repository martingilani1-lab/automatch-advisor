-- Adds is_standard to catalog_tire_sizes: true = factory-standard size, false =
-- optional upgrade. Follow-up to 20260924160000 (already applied without this column),
-- so it is a separate ALTER rather than an edit to that file.
--
-- NOT NULL DEFAULT false: existing rows (if any) become false, so no size is claimed
-- as standard unless explicitly authored that way. Postgres fills the default
-- without a table rewrite issue at this size, and the add cannot fail on existing rows.
--
-- Additive schema change: review-only, NOT executed.

alter table catalog_tire_sizes
  add column is_standard boolean not null default false;
