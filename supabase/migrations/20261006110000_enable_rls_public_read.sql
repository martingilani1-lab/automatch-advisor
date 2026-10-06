-- Enables RLS on the 17 tables the Supabase advisor flagged as fully exposed (anon key
-- can currently read AND write every row). Confirmed before writing this file: every
-- route handler and script in this repo instantiates its Supabase client with
-- SUPABASE_SERVICE_ROLE_KEY, never the anon key (grepped app/, scripts/, and every
-- 'use client' component -- zero NEXT_PUBLIC_SUPABASE_ANON_KEY usage anywhere, zero
-- .insert/.update/.delete/.upsert calls outside this migration itself). The service role
-- bypasses RLS entirely, so this changes nothing for the app -- it only closes the hole
-- for anyone hitting these tables directly with the public anon key.
--
-- Read-only policy, deliberately: `for select to anon, authenticated using (true)` makes
-- the catalog as publicly readable as it already effectively was (this is a car-buying
-- advisor's public catalog data, not user data), while removing the ability to
-- insert/update/delete through the anon key, which is the actual vulnerability. No
-- write policy is added for any role -- a write still requires the service-role key,
-- which already bypasses RLS and needs no policy.
--
-- The old flat vehicles/engines/transmissions tables are NOT in this list -- they
-- already have RLS enabled (confirmed live) and were not part of the advisor's flagged
-- set, so this migration doesn't touch them.
--
-- One transaction, so a failure partway through (e.g. a table already has RLS enabled,
-- or a policy with this name already exists) rolls back cleanly instead of leaving half
-- the catalog covered.

begin;

alter table public.transmission_units enable row level security;
alter table public.drivetrain_systems enable row level security;
alter table public.safety_features enable row level security;
alter table public.vehicle_safety_features enable row level security;
alter table public.transmissions_faults_backup enable row level security;
alter table public.catalog_brands enable row level security;
alter table public.catalog_models enable row level security;
alter table public.catalog_phases enable row level security;
alter table public.catalog_body_types enable row level security;
alter table public.catalog_engines enable row level security;
alter table public.catalog_trims enable row level security;
alter table public.catalog_trim_features enable row level security;
alter table public.catalog_vehicle_configurations enable row level security;
alter table public.catalog_component_faults enable row level security;
alter table public.catalog_tire_sizes enable row level security;
alter table public.catalog_media enable row level security;
alter table public.phase_body_dimensions enable row level security;

create policy "transmission_units_public_read" on public.transmission_units for select to anon, authenticated using (true);
create policy "drivetrain_systems_public_read" on public.drivetrain_systems for select to anon, authenticated using (true);
create policy "safety_features_public_read" on public.safety_features for select to anon, authenticated using (true);
create policy "vehicle_safety_features_public_read" on public.vehicle_safety_features for select to anon, authenticated using (true);
create policy "transmissions_faults_backup_public_read" on public.transmissions_faults_backup for select to anon, authenticated using (true);
create policy "catalog_brands_public_read" on public.catalog_brands for select to anon, authenticated using (true);
create policy "catalog_models_public_read" on public.catalog_models for select to anon, authenticated using (true);
create policy "catalog_phases_public_read" on public.catalog_phases for select to anon, authenticated using (true);
create policy "catalog_body_types_public_read" on public.catalog_body_types for select to anon, authenticated using (true);
create policy "catalog_engines_public_read" on public.catalog_engines for select to anon, authenticated using (true);
create policy "catalog_trims_public_read" on public.catalog_trims for select to anon, authenticated using (true);
create policy "catalog_trim_features_public_read" on public.catalog_trim_features for select to anon, authenticated using (true);
create policy "catalog_vehicle_configurations_public_read" on public.catalog_vehicle_configurations for select to anon, authenticated using (true);
create policy "catalog_component_faults_public_read" on public.catalog_component_faults for select to anon, authenticated using (true);
create policy "catalog_tire_sizes_public_read" on public.catalog_tire_sizes for select to anon, authenticated using (true);
create policy "catalog_media_public_read" on public.catalog_media for select to anon, authenticated using (true);
create policy "phase_body_dimensions_public_read" on public.phase_body_dimensions for select to anon, authenticated using (true);

-- Post-condition: all 17 tables now have RLS enabled, and exactly 17 new
-- "..._public_read" select policies exist (one per table, no more, no less).
do $$
declare
  rls_off_n integer;
  policy_n integer;
begin
  select count(*) into rls_off_n
  from pg_tables t
  join pg_class c on c.relname = t.tablename and c.relnamespace = (select oid from pg_namespace where nspname = 'public')
  where t.schemaname = 'public'
    and t.tablename in (
      'transmission_units', 'drivetrain_systems', 'safety_features', 'vehicle_safety_features',
      'transmissions_faults_backup', 'catalog_brands', 'catalog_models', 'catalog_phases',
      'catalog_body_types', 'catalog_engines', 'catalog_trims', 'catalog_trim_features',
      'catalog_vehicle_configurations', 'catalog_component_faults', 'catalog_tire_sizes',
      'catalog_media', 'phase_body_dimensions'
    )
    and c.relrowsecurity is not true;
  if rls_off_n <> 0 then
    raise exception 'Expected 0 of the 17 target tables with RLS still off, found %.', rls_off_n;
  end if;

  select count(*) into policy_n
  from pg_policies
  where schemaname = 'public' and policyname like '%_public_read';
  if policy_n <> 17 then
    raise exception 'Expected exactly 17 "..._public_read" select policies, found %.', policy_n;
  end if;
end $$;

commit;
