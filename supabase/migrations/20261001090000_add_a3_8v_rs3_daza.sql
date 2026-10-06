-- RS3 addendum for Audi A3 (8V): adds the DAZA engine (2.5 TFSI, 294kW) and its 2 Facelift
-- configs, deferred from 20261001073015_seed_audi_a3_8v.sql because DQ500 didn't resolve at
-- the time. Confirmed live just now: 20261001073015 has already run (96 configs live, CJXC's
-- CJXF alias present), and 20261001080000_add_dq500_alt_code.sql has also already run
-- (VW DQ500.alt_codes = {DQ500}) -- both prerequisites are satisfied, so this is a standalone
-- addendum rather than a full regeneration of the original (already-applied) seed file.
--
-- NOT run. Review-only, per this repo's standing discipline. Run in a fresh SQL editor tab,
-- after confirming both files above are live (they are, per the checks in this comment).

do $$
begin
  if exists (select 1 from catalog_engines where code = 'DAZA') then
    raise exception 'catalog_engines.DAZA already exists — was this already seeded? Re-check before running.';
  end if;
  if not exists (select 1 from transmission_units where code = 'DQ500' or 'DQ500' = any(alt_codes)) then
    raise exception 'No transmission_units row matches unit_code ''DQ500'' — the prerequisite migration (20261001080000) must be run first.';
  end if;
end $$;

-- ════════════════════════════════════════════════════════════
-- 1. ENGINE
-- ════════════════════════════════════════════════════════════

insert into catalog_engines (code, alt_codes, display_name, displacement_cc, power_kw, fuel_type, torque_nm, cylinders, emission_standard, timing_type, engine_oil_capacity_liters, timing_replacement_km)
values
  ('DAZA', '{DNWA}', '2.5 TFSI RS3 294kW', 2480, 294, 'petrol', 480, 'L5', 'Euro6', 'chain', 7.1, null)
on conflict (code, power_kw) do nothing;

-- ════════════════════════════════════════════════════════════
-- 2. VEHICLE CONFIGURATIONS (2 rows: Facelift, DAZA + DQ500 + haldex_gen5, Hatchback 5-door
-- and Sedan 4-door)
-- ════════════════════════════════════════════════════════════

with
  phase_lookup as (
    select cp.id
    from catalog_phases cp
    join catalog_models cm on cm.id = cp.model_id
    join catalog_brands cb on cb.id = cm.brand_id
    where cb.name = 'Audi' and cm.name = 'A3' and cp.generation_code = '8V' and cp.phase_label = 'Facelift'
  ),
  body_lookup as (
    select id, name from catalog_body_types where name in ('Hatchback 5-door', 'Sedan 4-door')
  ),
  engine_lookup as (
    select id from catalog_engines where code = 'DAZA' and power_kw = 294
  ),
  unit_lookup as (
    select id from transmission_units where code = 'DQ500' or 'DQ500' = any(alt_codes)
  ),
  dt_lookup as (
    select id from drivetrain_systems where code = 'haldex_gen5'
  )
insert into catalog_vehicle_configurations (phase_id, body_type_id, engine_id, unit_id, drivetrain_id)
select p.id, b.id, e.id, u.id, d.id
from phase_lookup p
cross join body_lookup b
cross join engine_lookup e
cross join unit_lookup u
cross join dt_lookup d
on conflict (
  phase_id, body_type_id, engine_id, unit_id,
  coalesce(drivetrain_id, '00000000-0000-0000-0000-000000000000'::uuid)
) do nothing;

-- ════════════════════════════════════════════════════════════
-- 3. POST-CONDITION ASSERTIONS
-- ════════════════════════════════════════════════════════════

do $$
declare
  config_n integer;
begin
  select count(*) into config_n
  from catalog_vehicle_configurations cvc
  join catalog_phases cp on cp.id = cvc.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Audi' and cm.name = 'A3' and cp.generation_code = '8V';
  if config_n <> 98 then
    raise exception 'Expected 98 config(s) for Audi A3 (8V) after this addendum (96 original + 2 DAZA), found %.', config_n;
  end if;
end $$;
