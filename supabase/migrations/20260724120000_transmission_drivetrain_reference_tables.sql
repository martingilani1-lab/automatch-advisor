-- Step 4.5, part 2: reference tables for transmission/drivetrain hardware,
-- plus the FK that will let a transmission row be traced back to the engine
-- it's actually paired with. All new rows are left empty — this is schema
-- only, no data migration. All three new FK columns are nullable so nothing
-- currently reading `transmissions` or `engines` breaks.
--
-- transmissions.engine_id is the fix for the facet-leak documented in
-- app/lib/carFilters.ts (matchesTransmissionGroup): a flat, per-vehicle
-- transmissions list with no link to which engine a gearbox belongs to
-- lets e.g. "electric" + "manual" match a car whose manual only ever
-- paired with its petrol engine. Do not change any query/filter behaviour
-- as part of this migration — the column stays NULL until a follow-up
-- backfills it.

create extension if not exists pgcrypto;

create table transmission_units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,               -- e.g. DQ200, DQ250, ZF 8HP, SkyActiv-Drive, Hyundai 7DCT
  family text not null check (family in (
    'dct_dry', 'dct_wet', 'torque_converter', 'cvt', 'manual', 'amt', 'single_speed'
  )),
  maker text,
  speeds integer,
  reliability_note text,
  maintenance_note text
);

create table drivetrain_systems (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,               -- e.g. Haldex gen5, Torsen, quattro ultra, 4Matic
  type text not null check (type in (
    'haldex', 'torsen', 'permanent', 'on_demand', 'dual_motor'
  )),
  maker text,
  reliability_note text
);

alter table transmissions
  add column unit_id uuid references transmission_units(id),
  add column drivetrain_id uuid references drivetrain_systems(id),
  add column engine_id uuid references engines(id);

create index if not exists idx_transmissions_unit_id on transmissions(unit_id);
create index if not exists idx_transmissions_drivetrain_id on transmissions(drivetrain_id);
create index if not exists idx_transmissions_engine_id on transmissions(engine_id);
