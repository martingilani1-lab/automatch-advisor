-- Adds hand-assigned lifestyle tags, distinct from the derived body-shape
-- `categories`/`primary_body` fields (app/api/cars/route.ts, BODY_TILE_MAP).
-- categories/primary_body answer "what shape is this car" (computed from
-- body_type); tags answer "who is this car for" (hand-curated, no formula
-- derives it). A car may carry 0..8 tags. This migration is schema only —
-- every row starts at '{}', nothing is populated here. Tagging happens by
-- hand afterward via the CSV template + apply script generated alongside
-- this migration (Track A, Step 1).
--
-- FROZEN VOCABULARY — exactly these 8 slugs, do not add/rename without also
-- updating the check constraint below and app/lib/tags.ts (the single
-- shared source of truth both this constraint and the UI must agree with):
--   family, city, travel, luxury, work, budget, offroad, driving_fun

alter table vehicles
  add column tags text[] default '{}' check (
    tags <@ array['family','city','travel','luxury','work','budget','offroad','driving_fun']::text[]
  );

comment on column vehicles.tags is 'Hand-assigned lifestyle tags (0..8), distinct from the derived body-shape categories/primary_body fields. Allowed slugs: family, city, travel, luxury, work, budget, offroad, driving_fun.';
