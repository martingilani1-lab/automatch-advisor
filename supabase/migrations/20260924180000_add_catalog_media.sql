-- New catalog_media table: images for a phase, per body type (a Combi and a Liftback
-- of the same phase look different, so media hangs off phase + body, not the phase
-- alone).
--
-- view_angle is a frozen vocabulary via CHECK, not a Postgres enum (easier to alter
-- later with DROP/ADD CONSTRAINT, matches this repo's pattern). 'side' is included on
-- top of front/rear/interior/dashboard — a side profile is the most common
-- catalogue shot and cheap to allow now versus a later constraint migration.
-- Nullable: an image with no known angle reads as "unknown".
--
-- is_main marks the hero image. Not enforced unique per (phase, body) — same
-- no-unique convention as other catalog_ child tables; seeds/app pick the main one.
--
-- Additive: new table only, references existing phases and body types.
-- Schema change: review-only, NOT executed.

create table catalog_media (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references catalog_phases(id),
  body_type_id uuid not null references catalog_body_types(id),
  image_url text not null,
  view_angle text check (view_angle in ('front', 'rear', 'side', 'interior', 'dashboard')),
  is_main boolean not null default false
);

create index if not exists idx_catalog_media_phase_id
  on catalog_media(phase_id);

create index if not exists idx_catalog_media_phase_id_body_type_id
  on catalog_media(phase_id, body_type_id);
