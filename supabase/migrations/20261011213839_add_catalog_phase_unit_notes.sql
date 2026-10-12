-- New table: catalog_phase_unit_notes -- a per-(phase, gearbox unit) authored note, shown as
-- "In this car" under the gearbox widget when the selected phase+unit combination has one
-- (e.g. "For FWD petrol. Same DQ200 risk." on Audi A3 (8Y) specifically, distinct from
-- transmission_units.reliability_note's general-purpose-unit-wide text). unique(phase_id,
-- unit_id): at most one note per phase+unit pair, matching how the old transmissions table's
-- per-vehicle `notes` column worked (one note per car+gearbox combination) -- this is its
-- catalog_ equivalent, additive only, no data migrated by this file.
--
-- RLS + public-read policy, same pattern as every other catalog_ table (see
-- 20261006110000_enable_rls_public_read.sql) -- this is public catalog data, not user data;
-- a write still requires the service-role key, which bypasses RLS and needs no policy.
--
-- No function is created by this migration, so CLAUDE.md's "every new public function
-- migration must REVOKE EXECUTE FROM PUBLIC/anon/authenticated" rule doesn't apply here --
-- noted for the record, not skipped.
--
-- Additive only: new table, references existing catalog_phases/transmission_units. Review-only,
-- NOT run by this session.

begin;

create table catalog_phase_unit_notes (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references catalog_phases(id),

  
  unit_id uuid not null references transmission_units(id),
  note text not null,
  unique (phase_id, unit_id)
);

create index if not exists idx_catalog_phase_unit_notes_phase_id on catalog_phase_unit_notes(phase_id);
create index if not exists idx_catalog_phase_unit_notes_unit_id on catalog_phase_unit_notes(unit_id);

alter table catalog_phase_unit_notes enable row level security;

create policy "catalog_phase_unit_notes_public_read" on catalog_phase_unit_notes
  for select to anon, authenticated using (true);

-- Post-condition: the table exists, RLS is on, and exactly one "_public_read" select policy
-- exists for it.
do $$
declare
  rls_on boolean;
  policy_n integer;
begin
  select c.relrowsecurity into rls_on
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'catalog_phase_unit_notes';

  if rls_on is not true then
    raise exception 'Expected catalog_phase_unit_notes to have RLS enabled, found %.', rls_on;
  end if;

  select count(*) into policy_n
  from pg_policies
  where schemaname = 'public' and tablename = 'catalog_phase_unit_notes' and policyname = 'catalog_phase_unit_notes_public_read';
  if policy_n <> 1 then
    raise exception 'Expected exactly 1 catalog_phase_unit_notes_public_read policy, found %.', policy_n;
  end if;
end $$;

commit;
