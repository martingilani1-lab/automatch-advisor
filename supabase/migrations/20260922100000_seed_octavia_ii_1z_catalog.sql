-- Škoda Octavia II (1Z) pilot seed for the catalog_ schema (facelift-split pilot).
-- Hand-authored from Martin's spec, not generated from a CSV — every FK below
-- resolves by code/name via a subquery or CTE, never a hand-typed UUID, so this
-- is correct regardless of what ids gen_random_uuid() actually produces.
--
-- Writes ONLY into catalog_* tables — vehicles/engines/transmissions (the old
-- flat tables the Octavia II (1Z) row d17bdd2f-... already lives in) are never
-- read or touched by this file.
--
-- PREREQUISITE, CONFIRMED NOT YET MET: as of generating this file, NONE of the
-- 10 catalog_* tables exist in the live DB (probed all 10 directly — every one
-- errors "could not find the table in the schema cache"). The schema migration
-- (20260921120000_add_catalog_dictionaries_schema.sql) that creates them has
-- not been run yet. This file will fail outright until that one runs first —
-- the preflight check immediately below turns that into a clear message
-- instead of a bare "relation does not exist" on the first INSERT.
--
-- Idempotency: ON CONFLICT DO NOTHING wherever the target table has a real
-- unique constraint to conflict on (catalog_brands.name, catalog_models
-- (brand_id,name), catalog_body_types.name, catalog_engines(code,power_kw),
-- catalog_vehicle_configurations' unique index). catalog_phases,
-- catalog_transmissions, catalog_trims, catalog_trim_features, and
-- catalog_component_faults declare NO unique constraint at all (confirmed by
-- reading 20260921120000's CREATE TABLE statements) — ON CONFLICT there would
-- itself error ("no unique or exclusion constraint matching..."), so those
-- sections use INSERT ... SELECT ... WHERE NOT EXISTS instead. Re-running
-- this whole file is safe either way.
--
-- Review before running. NOT executed against Supabase.

do $$
begin
  if to_regclass('public.catalog_brands') is null then
    raise exception 'catalog_brands does not exist — run supabase/migrations/20260921120000_add_catalog_dictionaries_schema.sql first. Confirmed at generation time: none of the 10 catalog_ tables exist yet.';
  end if;
  if not exists (select 1 from drivetrain_systems where code = 'haldex_gen2') then
    raise exception 'drivetrain_systems.haldex_gen2 is missing — section 7 needs it for the pre-facelift Combi 4x4 config. (It existed when this file was generated; re-check if this fires.)';
  end if;
  if not exists (select 1 from drivetrain_systems where code = 'haldex_gen4') then
    raise exception 'drivetrain_systems.haldex_gen4 is missing — section 7 needs it for the facelift Combi 4x4 configs.';
  end if;
end $$;

-- ════════════════════════════════════════════════════════════
-- 1. BRAND
-- ════════════════════════════════════════════════════════════

insert into catalog_brands (name, country)
values ('Škoda', 'Czech Republic')
on conflict (name) do nothing;

-- ════════════════════════════════════════════════════════════
-- 2. MODEL
-- ════════════════════════════════════════════════════════════

insert into catalog_models (brand_id, name)
select (select id from catalog_brands where name = 'Škoda'), 'Octavia'
on conflict (brand_id, name) do nothing;

-- ════════════════════════════════════════════════════════════
-- 3. PHASES — both generation_code '1Z'
-- ════════════════════════════════════════════════════════════

insert into catalog_phases (model_id, generation_code, phase_label, year_from, year_to, display_name)
select m.id, v.generation_code, v.phase_label, v.year_from, v.year_to, v.display_name
from (
  values
    ('1Z', 'Pre-facelift', 2004, 2008, 'Octavia II (1Z) Pre-facelift'),
    ('1Z', 'Facelift',     2009, 2013, 'Octavia II (1Z) Facelift')
) as v(generation_code, phase_label, year_from, year_to, display_name)
cross join (
  select cm.id from catalog_models cm
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Škoda' and cm.name = 'Octavia'
) as m
where not exists (
  select 1 from catalog_phases cp where cp.model_id = m.id and cp.phase_label = v.phase_label
);

-- ════════════════════════════════════════════════════════════
-- 4. BODY TYPES
-- ════════════════════════════════════════════════════════════

insert into catalog_body_types (name)
values ('Liftback'), ('Combi')
on conflict (name) do nothing;

-- ════════════════════════════════════════════════════════════
-- 5. ENGINES
-- ════════════════════════════════════════════════════════════

insert into catalog_engines (code, display_name, displacement_cc, power_kw, fuel_type)
values
  ('BSE',  '1.6 MPI (BSE) — 75 kW',      1595, 75,  'petrol'),
  ('BXE',  '1.9 TDI PD (BXE) — 77 kW',   1896, 77,  'diesel'),
  ('BKD',  '2.0 TDI PD (BKD) — 103 kW',  1968, 103, 'diesel'),
  ('CBZB', '1.2 TSI (CBZB) — 77 kW',     1197, 77,  'petrol'),
  ('CAXA', '1.4 TSI (CAXA) — 90 kW',     1390, 90,  'petrol'),
  ('CDAA', '1.8 TSI (CDAA) — 118 kW',    1798, 118, 'petrol'),
  ('CAYC', '1.6 TDI CR (CAYC) — 77 kW',  1598, 77,  'diesel'),
  ('CFHC', '2.0 TDI CR (CFHC) — 103 kW', 1968, 103, 'diesel')
on conflict (code, power_kw) do nothing;

-- ════════════════════════════════════════════════════════════
-- 6. TRANSMISSIONS — unit_id left NULL for now, per spec
-- ════════════════════════════════════════════════════════════
-- NOTE: these codes (MQ200/MQ250/DQ250/DQ200) are bare, distinct from
-- transmission_units.code's existing "VW MQ200"/"VW MQ250"/"VW DQ250" rows —
-- not resolved/linked here since unit_id is explicitly NULL for this pass.

insert into catalog_transmissions (code, type, speeds)
select v.code, v.type, v.speeds
from (
  values
    ('MQ200',     'manual',           5),
    ('MQ250',     'manual',           6),
    ('Aisin 09G', 'torque_converter', 6),
    ('DQ250',     'dct_wet',          6),
    ('DQ200',     'dct_dry',          7)
) as v(code, type, speeds)
where not exists (select 1 from catalog_transmissions ct where ct.code = v.code);

-- ════════════════════════════════════════════════════════════
-- 7. VEHICLE CONFIGURATIONS
-- ════════════════════════════════════════════════════════════
-- dt_code NULL in the values list below -> drivetrain_id NULL (FWD/unpaired).
-- The "Liftback + 1.9 TDI PD + DQ250" pre-facelift row is unusual (DSG on a
-- pre-facelift PD-diesel Octavia is a rare spec) but Martin confirmed it's
-- valid — kept as specified, not second-guessed here.

with
  phase_lookup as (
    select cp.id, cp.phase_label
    from catalog_phases cp
    join catalog_models cm on cm.id = cp.model_id
    join catalog_brands cb on cb.id = cm.brand_id
    where cb.name = 'Škoda' and cm.name = 'Octavia' and cp.generation_code = '1Z'
  ),
  body_lookup as (
    select id, name from catalog_body_types where name in ('Liftback', 'Combi')
  ),
  engine_lookup as (
    -- keyed by code alone: each code appears exactly once in this seed's
    -- section 5, so it's unambiguous here even though the table's real
    -- unique key is (code, power_kw).
    select id, code from catalog_engines
    where code in ('BSE','BXE','BKD','CBZB','CAXA','CDAA','CAYC','CFHC')
  ),
  trans_lookup as (
    select id, code from catalog_transmissions
    where code in ('MQ200','MQ250','Aisin 09G','DQ250','DQ200')
  ),
  dt_lookup as (
    select id, code from drivetrain_systems where code in ('haldex_gen2','haldex_gen4')
  ),
  configs (phase_label, body_name, engine_code, trans_code, dt_code) as (
    values
      -- PRE-FACELIFT
      ('Pre-facelift', 'Liftback', 'BSE', 'MQ200',      null),
      ('Pre-facelift', 'Liftback', 'BSE', 'Aisin 09G',  null),
      ('Pre-facelift', 'Liftback', 'BXE', 'MQ200',      null),
      ('Pre-facelift', 'Liftback', 'BXE', 'DQ250',      null),
      ('Pre-facelift', 'Combi',    'BXE', 'MQ250',      'haldex_gen2'),
      ('Pre-facelift', 'Combi',    'BKD', 'DQ250',      null),
      -- FACELIFT
      ('Facelift',     'Liftback', 'CBZB', 'MQ250',     null),
      ('Facelift',     'Liftback', 'CAXA', 'DQ200',     null),
      ('Facelift',     'Liftback', 'CAYC', 'MQ200',     null),
      ('Facelift',     'Liftback', 'CAYC', 'DQ200',     null),
      ('Facelift',     'Combi',    'CAYC', 'MQ250',     'haldex_gen4'),
      ('Facelift',     'Combi',    'CFHC', 'DQ250',     'haldex_gen4')
  )
insert into catalog_vehicle_configurations (phase_id, body_type_id, engine_id, transmission_id, drivetrain_id)
select p.id, b.id, e.id, t.id, d.id
from configs c
join phase_lookup p on p.phase_label = c.phase_label
join body_lookup b on b.name = c.body_name
join engine_lookup e on e.code = c.engine_code
join trans_lookup t on t.code = c.trans_code
left join dt_lookup d on d.code = c.dt_code
on conflict (
  phase_id, body_type_id, engine_id, transmission_id,
  coalesce(drivetrain_id, '00000000-0000-0000-0000-000000000000'::uuid)
) do nothing;

-- ════════════════════════════════════════════════════════════
-- 8. TRIMS + trim features (Elegance x2, both phases)
-- ════════════════════════════════════════════════════════════

insert into catalog_trims (phase_id, name, tier)
select p.id, v.name, v.tier
from (
  values
    ('Pre-facelift', 'Classic',            1),
    ('Pre-facelift', 'Ambiente',           2),
    ('Pre-facelift', 'Elegance',           3),
    ('Facelift',     'Active',             1),
    ('Facelift',     'Ambition',           2),
    ('Facelift',     'Elegance',           3),
    ('Facelift',     'Laurin & Klement',   4)
) as v(phase_label, name, tier)
join (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Škoda' and cm.name = 'Octavia' and cp.generation_code = '1Z'
) as p on p.phase_label = v.phase_label
where not exists (
  select 1 from catalog_trims ct where ct.phase_id = p.id and ct.name = v.name
);

-- Features on BOTH Elegance trims (pre-facelift and facelift) — demonstrates
-- the relation; not an exhaustive equipment list.
with elegance_trims as (
  select ct.id, cp.phase_label
  from catalog_trims ct
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Škoda' and cm.name = 'Octavia' and cp.generation_code = '1Z' and ct.name = 'Elegance'
),
features (feature, is_optional) as (
  values
    ('Bi-Xenon Headlights', false),
    ('Heated Front Seats',  false),
    ('Dual-zone Climate',   false)
)
insert into catalog_trim_features (trim_id, feature, is_optional)
select et.id, f.feature, f.is_optional
from elegance_trims et
cross join features f
where not exists (
  select 1 from catalog_trim_features ctf
  where ctf.trim_id = et.id and ctf.feature = f.feature
);

-- ════════════════════════════════════════════════════════════
-- 9. COMPONENT FAULTS — 5 engine + 2 transmission (all 7 originally specified)
-- ════════════════════════════════════════════════════════════

with
  engine_lookup as (
    select id, code from catalog_engines
    where code in ('CBZB','CDAA','CAYC','BKD','BXE')
  ),
  engine_faults (engine_code, fault, severity) as (
    values
      ('CBZB', 'Timing chain stretching and jumping (esp. 2010-2011).',        'critical'),
      ('CDAA', 'High oil consumption from faulty piston rings (EA888 gen).',   'critical'),
      ('CAYC', 'EGR valve and injector (Siemens/Continental) failure.',        'moderate'),
      ('BKD',  'Cylinder head cracking causing coolant leaks.',                'critical'),
      ('BXE',  'Connecting rod bearing wear leading to rod failure.',          'critical')
  )
insert into catalog_component_faults (component_type, engine_id, fault, severity)
select 'engine', e.id, f.fault, f.severity
from engine_faults f
join engine_lookup e on e.code = f.engine_code
where not exists (
  select 1 from catalog_component_faults ccf
  where ccf.engine_id = e.id and ccf.fault = f.fault
);

with
  trans_lookup as (
    select id, code from catalog_transmissions
    where code in ('DQ200','DQ250')
  ),
  trans_faults (trans_code, fault, severity) as (
    values
      ('DQ200', 'Rapid dry-clutch wear and mechatronics failure.',                              'critical'),
      ('DQ250', 'Mechatronics failure if the 60,000 km oil-change interval is neglected.',       'moderate')
  )
insert into catalog_component_faults (component_type, transmission_id, fault, severity)
select 'transmission', t.id, f.fault, f.severity
from trans_faults f
join trans_lookup t on t.code = f.trans_code
where not exists (
  select 1 from catalog_component_faults ccf
  where ccf.transmission_id = t.id and ccf.fault = f.fault
);
