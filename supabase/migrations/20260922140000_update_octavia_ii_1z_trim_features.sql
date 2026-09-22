-- Replaces the placeholder catalog_trim_features rows on the 7 existing Octavia II
-- (1Z) catalog_trims (seeded by 20260922100000_seed_octavia_ii_1z_catalog.sql, section
-- 8) with real feature lists in English, matching the app's display language. Does NOT
-- touch catalog_trims itself — all 7 trim rows already exist and are matched here by
-- (phase display_name, trim name), never re-created.
--
-- English, not the Slovak-market originals: this file replaces the earlier version of
-- itself (Slovak strings) before that version was ever run against the DB — no data
-- migration needed, this is the file's only real revision.
--
-- "Elegance" exists in BOTH phases (Pre-facelift and Facelift) with DIFFERENT feature
-- lists, so every match below goes through catalog_trims -> catalog_phases ->
-- catalog_models -> catalog_brands and is keyed on (phase display_name, trim name)
-- together, never trim name alone — matching by name alone would cross-wire the two
-- Elegance rows' features.
--
-- DESTRUCTIVE (contains a DELETE): per CLAUDE.md's Supabase/data-access rules, this
-- file is for REVIEW ONLY and has NOT been executed against Supabase. The DELETE is
-- scoped to exactly the 7 trim_ids resolved by the target_trims CTE below — never a
-- bare `DELETE FROM catalog_trim_features`. Run manually once reviewed.
--
-- is_optional: false for every feature marked (std) below, true for every (opt).

do $$
declare
  matched_count integer;
begin
  if to_regclass('public.catalog_trim_features') is null then
    raise exception 'catalog_trim_features does not exist — run 20260921120000_add_catalog_dictionaries_schema.sql first.';
  end if;

  select count(*) into matched_count
  from catalog_trims ct
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Škoda' and cm.name = 'Octavia'
    and (cp.display_name, ct.name) in (
      ('Octavia II (1Z) Pre-facelift', 'Classic'),
      ('Octavia II (1Z) Pre-facelift', 'Ambiente'),
      ('Octavia II (1Z) Pre-facelift', 'Elegance'),
      ('Octavia II (1Z) Facelift',     'Active'),
      ('Octavia II (1Z) Facelift',     'Ambition'),
      ('Octavia II (1Z) Facelift',     'Elegance'),
      ('Octavia II (1Z) Facelift',     'Laurin & Klement')
    );

  if matched_count <> 7 then
    raise exception 'expected exactly 7 Octavia II (1Z) trims, found % — run 20260922100000_seed_octavia_ii_1z_catalog.sql first, or the trim set has changed since this file was written.', matched_count;
  end if;
end $$;

-- ════════════════════════════════════════════════════════════
-- 1. DELETE — clear placeholder features on exactly these 7 trims
-- ════════════════════════════════════════════════════════════
-- Scope: trim_id IN (the 7 ids resolved below). Nothing outside this set of
-- (phase display_name, trim name) pairs is touched.

with
  target_trims (phase_display_name, trim_name) as (
    values
      ('Octavia II (1Z) Pre-facelift', 'Classic'),
      ('Octavia II (1Z) Pre-facelift', 'Ambiente'),
      ('Octavia II (1Z) Pre-facelift', 'Elegance'),
      ('Octavia II (1Z) Facelift',     'Active'),
      ('Octavia II (1Z) Facelift',     'Ambition'),
      ('Octavia II (1Z) Facelift',     'Elegance'),
      ('Octavia II (1Z) Facelift',     'Laurin & Klement')
  ),
  trim_ids as (
    select ct.id
    from catalog_trims ct
    join catalog_phases cp on cp.id = ct.phase_id
    join catalog_models cm on cm.id = cp.model_id
    join catalog_brands cb on cb.id = cm.brand_id
    join target_trims tt
      on tt.phase_display_name = cp.display_name and tt.trim_name = ct.name
    where cb.name = 'Škoda' and cm.name = 'Octavia'
  )
delete from catalog_trim_features
where trim_id in (select id from trim_ids);

-- ════════════════════════════════════════════════════════════
-- 2. INSERT — English feature lists (32 rows across 7 trims)
-- ════════════════════════════════════════════════════════════

with
  new_features (phase_display_name, trim_name, feature, is_optional) as (
    values
      -- PRE-FACELIFT — Classic (3)
      ('Octavia II (1Z) Pre-facelift', 'Classic', 'Central locking (without remote)', false),
      ('Octavia II (1Z) Pre-facelift', 'Classic', 'Front electric windows', false),
      ('Octavia II (1Z) Pre-facelift', 'Classic', 'Manual air conditioning', true),

      -- PRE-FACELIFT — Ambiente (5)
      ('Octavia II (1Z) Pre-facelift', 'Ambiente', 'Manual air conditioning (Climatic)', false),
      ('Octavia II (1Z) Pre-facelift', 'Ambiente', 'Remote central locking', false),
      ('Octavia II (1Z) Pre-facelift', 'Ambiente', 'Electrically adjustable and heated mirrors', false),
      ('Octavia II (1Z) Pre-facelift', 'Ambiente', 'Trip computer (MFA)', false),
      ('Octavia II (1Z) Pre-facelift', 'Ambiente', 'Front armrest', false),

      -- PRE-FACELIFT — Elegance (7)
      ('Octavia II (1Z) Pre-facelift', 'Elegance', 'Automatic dual-zone air conditioning (Climatronic)', false),
      ('Octavia II (1Z) Pre-facelift', 'Elegance', 'Front and rear electric windows', false),
      ('Octavia II (1Z) Pre-facelift', 'Elegance', 'Cruise control', false),
      ('Octavia II (1Z) Pre-facelift', 'Elegance', 'Maxi-DOT display', false),
      ('Octavia II (1Z) Pre-facelift', 'Elegance', 'Front fog lights', false),
      ('Octavia II (1Z) Pre-facelift', 'Elegance', 'Xenon headlights', true),
      ('Octavia II (1Z) Pre-facelift', 'Elegance', 'Heated front seats', true),

      -- FACELIFT — Active (3)
      ('Octavia II (1Z) Facelift', 'Active', 'ESP', false),
      ('Octavia II (1Z) Facelift', 'Active', 'Front electric windows', false),
      ('Octavia II (1Z) Facelift', 'Active', 'Manual air conditioning', true),

      -- FACELIFT — Ambition (4)
      ('Octavia II (1Z) Facelift', 'Ambition', 'Manual air conditioning', false),
      ('Octavia II (1Z) Facelift', 'Ambition', 'Remote central locking', false),
      ('Octavia II (1Z) Facelift', 'Ambition', 'Front armrest', false),
      ('Octavia II (1Z) Facelift', 'Ambition', 'Fog lights with daytime running lights', false),

      -- FACELIFT — Elegance (5)
      ('Octavia II (1Z) Facelift', 'Elegance', 'Automatic dual-zone air conditioning (Climatronic)', false),
      ('Octavia II (1Z) Facelift', 'Elegance', 'Front and rear electric windows', false),
      ('Octavia II (1Z) Facelift', 'Elegance', 'Cruise control', false),
      ('Octavia II (1Z) Facelift', 'Elegance', 'Multifunction leather steering wheel', false),
      ('Octavia II (1Z) Facelift', 'Elegance', 'Rear parking sensors', false),

      -- FACELIFT — Laurin & Klement (5)
      ('Octavia II (1Z) Facelift', 'Laurin & Klement', 'Bi-Xenon headlights with cornering (AFS)', false),
      ('Octavia II (1Z) Facelift', 'Laurin & Klement', 'Leather / Alcantara interior combination', false),
      ('Octavia II (1Z) Facelift', 'Laurin & Klement', 'Heated front and rear seats', false),
      ('Octavia II (1Z) Facelift', 'Laurin & Klement', 'Electrically adjustable driver seat with memory', false),
      ('Octavia II (1Z) Facelift', 'Laurin & Klement', 'Premium audio (Sound System)', false)
  ),
  trim_lookup as (
    select ct.id, cp.display_name as phase_display_name, ct.name as trim_name
    from catalog_trims ct
    join catalog_phases cp on cp.id = ct.phase_id
    join catalog_models cm on cm.id = cp.model_id
    join catalog_brands cb on cb.id = cm.brand_id
    where cb.name = 'Škoda' and cm.name = 'Octavia'
  )
insert into catalog_trim_features (trim_id, feature, is_optional)
select tl.id, nf.feature, nf.is_optional
from new_features nf
join trim_lookup tl
  on tl.phase_display_name = nf.phase_display_name and tl.trim_name = nf.trim_name;
