-- New catalog_tire_sizes table: the factory tire size(s) fitted to a vehicle
-- configuration. One configuration can list several sizes (base wheels vs. larger
-- optional wheels), hence a child table rather than a single column on
-- catalog_vehicle_configurations.
--
-- tire_size is free text as written on the sidewall ('195/65 R15') — not parsed into
-- width/aspect/rim, since nothing filters on those parts yet.
--
-- No unique constraint on (configuration_id, tire_size), matching the other catalog_
-- child tables that hang off a parent without one (e.g. catalog_trims,
-- catalog_component_faults); seeds guard with WHERE NOT EXISTS instead. Add one
-- later if duplicate rows become a problem.
--
-- Additive: new table only, references existing configurations, changes nothing else.
-- Schema change: review-only, NOT executed.

create table catalog_tire_sizes (
  id uuid primary key default gen_random_uuid(),
  configuration_id uuid not null references catalog_vehicle_configurations(id),
  tire_size text not null
);

create index if not exists idx_catalog_tire_sizes_configuration_id
  on catalog_tire_sizes(configuration_id);
