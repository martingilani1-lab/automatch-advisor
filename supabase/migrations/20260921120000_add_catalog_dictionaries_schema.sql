-- Catalog-dictionaries schema: a normalized brand/model/phase/trim/
-- configuration structure, PARALLEL to the existing flat vehicles/engines/
-- transmissions tables. Schema only — no data migration, no backfill, and
-- nothing in vehicles/engines/transmissions is read, altered, or dropped.
--
-- All 10 new tables are prefixed catalog_ — two of the names requested for
-- this schema (engines, transmissions) collide with the existing tables of
-- the same name, which would make `create table engines (...)` fail outright
-- ("relation already exists"). Confirmed with the user: prefix ALL 10 new
-- tables consistently (not just the 2 colliding ones), so the whole schema
-- reads as one namespace rather than 8 bare names + 2 renamed-for-collision
-- ones.
--
-- drivetrain_systems is NOT recreated here — catalog_vehicle_configurations
-- references the existing table directly (see below).

create extension if not exists pgcrypto;

-- ════════════════════════════════════════════════════════════
-- Brand / model / phase hierarchy
-- ════════════════════════════════════════════════════════════

create table catalog_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  country text
);

create table catalog_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references catalog_brands(id),
  name text not null,
  unique (brand_id, name)
);

create index if not exists idx_catalog_models_brand_id on catalog_models(brand_id);

-- A "phase" is one generation/facelift of a model (e.g. "Mk8 pre-facelift"),
-- the level everything else (trims, configurations) actually hangs off —
-- mirrors why the existing vehicles table is itself one row per generation,
-- not per model.
create table catalog_phases (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references catalog_models(id),
  generation_code text,
  phase_label text,
  year_from integer,
  year_to integer,
  display_name text
);

create index if not exists idx_catalog_phases_model_id on catalog_phases(model_id);

-- ════════════════════════════════════════════════════════════
-- Body types
-- ════════════════════════════════════════════════════════════

create table catalog_body_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- ════════════════════════════════════════════════════════════
-- Engines
-- ════════════════════════════════════════════════════════════

-- fuel_type vocabulary: the OLD engines.fuel_type has no DB-level CHECK to
-- reuse (confirmed — it's not among the codebase's three existing frozen-
-- vocabulary columns: transmission_units.family, safety_features.category,
-- drivetrain_systems.type). Sourced instead from the app-level canonical set
-- (FUEL_LABELS, app/lib/carFields.ts) — the fullest known vocabulary actually
-- in use across the app, though FUEL_OPTIONS (the filter UI) only surfaces 5
-- of these 6, omitting lpg. This migration is the first place this
-- vocabulary becomes DB-enforced.
create table catalog_engines (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  display_name text,
  displacement_cc integer,
  power_kw integer not null,
  fuel_type text not null check (fuel_type in (
    'petrol', 'diesel', 'electric', 'hybrid', 'phev', 'lpg'
  )),
  unique (code, power_kw)
);

-- ════════════════════════════════════════════════════════════
-- Transmissions
-- ════════════════════════════════════════════════════════════

-- type vocabulary: reuses transmission_units.family's actual DB-level CHECK
-- verbatim (per scripts/alter-transmission-units-family-constraint.sql, the
-- most recent authoritative version — dct split into dry/wet plus a plain
-- 'dct' for unidentified units) rather than the coarser 6-value app-level
-- TRANSMISSION_TYPES grouping (app/lib/carFilters.ts, no dry/wet split) used
-- for filter-UI display only. Chosen because this table also carries a
-- nullable unit_id straight into transmission_units, so its own type should
-- speak that table's vocabulary, not a display-only grouping of it.
create table catalog_transmissions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  type text not null check (type in (
    'dct_dry', 'dct_wet', 'dct', 'torque_converter', 'cvt', 'manual', 'amt', 'single_speed'
  )),
  speeds integer,
  -- Nullable per spec: not every catalog transmission maps to an identified
  -- real-world unit.
  unit_id uuid references transmission_units(id)
);

create index if not exists idx_catalog_transmissions_unit_id on catalog_transmissions(unit_id);

-- ════════════════════════════════════════════════════════════
-- Trims
-- ════════════════════════════════════════════════════════════

create table catalog_trims (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references catalog_phases(id),
  name text not null,
  tier text
);

create index if not exists idx_catalog_trims_phase_id on catalog_trims(phase_id);

create table catalog_trim_features (
  id uuid primary key default gen_random_uuid(),
  trim_id uuid not null references catalog_trims(id),
  feature text not null,
  is_optional boolean not null default false
);

create index if not exists idx_catalog_trim_features_trim_id on catalog_trim_features(trim_id);

-- ════════════════════════════════════════════════════════════
-- Vehicle configurations — the join of phase x body x engine x transmission
-- x drivetrain that actually defines one buildable car.
-- ════════════════════════════════════════════════════════════

create table catalog_vehicle_configurations (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references catalog_phases(id),
  body_type_id uuid not null references catalog_body_types(id),
  engine_id uuid not null references catalog_engines(id),
  transmission_id uuid not null references catalog_transmissions(id),
  -- Nullable per spec: not every configuration has an identified AWD/4WD
  -- system (2WD configurations, or ones not yet paired) — references the
  -- EXISTING drivetrain_systems table directly, not recreated here.
  drivetrain_id uuid references drivetrain_systems(id)
);

create index if not exists idx_catalog_vehicle_configurations_phase_id on catalog_vehicle_configurations(phase_id);
create index if not exists idx_catalog_vehicle_configurations_body_type_id on catalog_vehicle_configurations(body_type_id);
create index if not exists idx_catalog_vehicle_configurations_engine_id on catalog_vehicle_configurations(engine_id);
create index if not exists idx_catalog_vehicle_configurations_transmission_id on catalog_vehicle_configurations(transmission_id);
create index if not exists idx_catalog_vehicle_configurations_drivetrain_id on catalog_vehicle_configurations(drivetrain_id);

-- A plain UNIQUE(..., drivetrain_id) would NOT catch duplicate rows where
-- drivetrain_id is NULL on both sides — Postgres treats NULL <> NULL in
-- unique constraints, so it's not a "value" the constraint can compare. Most
-- configurations HAVE a null drivetrain_id (FWD-only, or an AWD config not
-- yet paired), so that hole would cover the majority of this table's data,
-- not an edge case. Coalescing to a sentinel UUID folds every NULL into one
-- comparable value, so two otherwise-identical FWD configs are correctly
-- rejected as duplicates. The all-zero sentinel can never collide with a
-- real gen_random_uuid() drivetrain_systems.id.
create unique index idx_catalog_vehicle_configurations_unique
  on catalog_vehicle_configurations (
    phase_id, body_type_id, engine_id, transmission_id,
    coalesce(drivetrain_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- ════════════════════════════════════════════════════════════
-- Component faults
-- ════════════════════════════════════════════════════════════

create table catalog_component_faults (
  id uuid primary key default gen_random_uuid(),
  component_type text not null check (component_type in ('engine', 'transmission')),
  engine_id uuid references catalog_engines(id),
  transmission_id uuid references catalog_transmissions(id),
  fault text not null,
  severity text,
  -- Exactly one of engine_id/transmission_id must be set, matching
  -- component_type — never both, never neither.
  check (
    (component_type = 'engine' and engine_id is not null and transmission_id is null)
    or
    (component_type = 'transmission' and transmission_id is not null and engine_id is null)
  )
);

create index if not exists idx_catalog_component_faults_engine_id on catalog_component_faults(engine_id);
create index if not exists idx_catalog_component_faults_transmission_id on catalog_component_faults(transmission_id);
