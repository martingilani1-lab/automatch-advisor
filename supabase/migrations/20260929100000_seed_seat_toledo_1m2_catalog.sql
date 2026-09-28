-- SEAT Toledo Mk2 (1M2) seed: full car import into the catalog_ schema, generated from the
-- filled intake template at scripts/cars/toledo-1m/ (the disposable per-car working copy —
-- scripts/new-car-template/ itself was never touched), per the import-car skill.
--
-- REUSE/CREATE summary (reconciled live before writing this file):
--   engines: 13 REUSE, 1 NEW (APG)
--   transmissions: 4 REUSE, 0 NEW
--   body types: 'Sedan 4-door' NEW — Toledo Mk2 was strictly a 3-box saloon (unlike Mk1's
--     liftback), not present in catalog_body_types today.
--   brand: SEAT REUSE (already exists from the León seed). model: Toledo NEW.
--
-- APG note: NOT an alt_code of AGN. Martin confirmed it's a genuine Euro 2 (AGN, cable
-- throttle) / Euro 3 (APG, drive-by-wire + twin lambda) hardware split, same pattern as
-- AGR/ALH and AHF/ASV — distinct primary engine row, phase-isolated: AGN pre-facelift only,
-- APG facelift only (see the config VALUES below — neither engine has a row in the other
-- phase).
--
-- Configs: 22 total (11 Pre-facelift + 11 Facelift), one row per 'x' cell
-- in the two filled config grids — every FK below resolves by code/name via a CTE, never a
-- hand-typed UUID. Single body (Sedan 4-door) throughout — Toledo Mk2 had no body variants.
--
-- No component faults for this car (Martin: inherits existing shared-engine/transmission
-- faults already recorded against AUQ, 02M, etc. — nothing new to insert).
--
-- TYPE CASTS: every WITH ... AS (VALUES ...) SELECT ... INSERT block explicitly casts each
-- literal (::integer / ::numeric / ::text) — same fix baked into the import-car skill after
-- the Golf IV / León all-NULL-NCAP-column bug. Toledo's NCAP percentages are NULL on every
-- phase row too.
--
-- Review-only. NOT executed. No destructive step in this file — everything here is
-- additive INSERT, so it all may run via MCP once reviewed.

do $$
begin
  if to_regclass('public.catalog_brands') is null then
    raise exception 'catalog_brands does not exist — run the catalog_ schema migration first.';
  end if;
  if not exists (select 1 from catalog_brands where name = 'SEAT') then
    raise exception 'catalog_brands.SEAT is missing — expected to exist from the León seed; reconcile is stale.';
  end if;
  if (select count(*) from catalog_engines where (code, power_kw) in (
    ('AXP', 55), ('AKL', 74), ('AUS', 77), ('AGN', 92), ('AGZ', 110), ('AQN', 125), ('AUQ', 132), ('AGR', 66), ('ALH', 66), ('AHF', 81), ('ASV', 81), ('ASZ', 96), ('ARL', 110)
  )) <> 13 then
    raise exception 'One or more REUSE engines are missing live — reconcile is stale, re-check before running.';
  end if;
  if exists (select 1 from catalog_engines where code = 'APG') then
    raise exception 'catalog_engines.APG already exists — reconcile is stale (was this already seeded?), re-check before running.';
  end if;
  if (select count(*) from catalog_transmissions where code in (
    '02J', '02K', '01M', '02M'
  )) <> 4 then
    raise exception 'One or more REUSE transmissions are missing live — reconcile is stale, re-check before running.';
  end if;
end $$;

-- ════════════════════════════════════════════════════════════
-- 1. BRAND (REUSE — already exists from the León seed; ON CONFLICT makes this a no-op)
-- ════════════════════════════════════════════════════════════

insert into catalog_brands (name, country)
values ('SEAT', 'Spain')
on conflict (name) do nothing;

-- ════════════════════════════════════════════════════════════
-- 2. MODEL
-- ════════════════════════════════════════════════════════════

insert into catalog_models (brand_id, name, segment, origin_country)
select id, 'Toledo', 'C', 'spanish'
from catalog_brands where name = 'SEAT'
on conflict (brand_id, name) do nothing;

-- ════════════════════════════════════════════════════════════
-- 3. PHASES — every column explicitly cast.
-- ════════════════════════════════════════════════════════════

insert into catalog_phases (
  model_id, generation_code, phase_label, year_from, year_to, display_name, platform_code,
  safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,
  avg_market_price_eur, price_range_min_eur, price_range_max_eur, typical_mileage_range,
  resale_value_rating, seats_count, towing_capacity_kg
)
select m.id, v.generation_code, v.phase_label, v.year_from, v.year_to, v.display_name, v.platform_code,
  v.safety_rating, v.ncap_year, v.ncap_adult_pct, v.ncap_child_pct, v.ncap_pedestrian_pct, v.ncap_safety_assist_pct,
  v.avg_market_price_eur, v.price_range_min_eur, v.price_range_max_eur, v.typical_mileage_range,
  v.resale_value_rating, v.seats_count, v.towing_capacity_kg
from (
  values
    ('1M2'::text, 'Pre-facelift'::text, 1998::integer, 2003::integer, 'Toledo Mk2 Pre-facelift'::text, 'PQ34'::text, 4::integer, 2001::integer, null::integer, null::integer, null::integer, null::integer, 1200::integer, 600::integer, 2200::integer, '280000-450000 km'::text, 'depreciates_fast'::text, 5::integer, 1400::integer),
    ('1M2'::text, 'Facelift'::text, 2003::integer, 2004::integer, 'Toledo Mk2 Facelift'::text, 'PQ34'::text, 4::integer, 2001::integer, null::integer, null::integer, null::integer, null::integer, 1800::integer, 1000::integer, 2800::integer, '250000-380000 km'::text, 'average'::text, 5::integer, 1400::integer)
) as v(generation_code, phase_label, year_from, year_to, display_name, platform_code,
  safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,
  avg_market_price_eur, price_range_min_eur, price_range_max_eur, typical_mileage_range,
  resale_value_rating, seats_count, towing_capacity_kg)
join catalog_models m on m.name = 'Toledo'
join catalog_brands cb on cb.id = m.brand_id and cb.name = 'SEAT'
where not exists (
  select 1 from catalog_phases cp where cp.model_id = m.id and cp.phase_label = v.phase_label
);

-- ════════════════════════════════════════════════════════════
-- 4. BODY TYPES — 'Sedan 4-door' NEW
-- ════════════════════════════════════════════════════════════

insert into catalog_body_types (name)
values ('Sedan 4-door')
on conflict (name) do nothing;

-- ════════════════════════════════════════════════════════════
-- 5. ENGINES — 1 NEW row (APG). Plain INSERT ... VALUES, no casting issue.
-- ════════════════════════════════════════════════════════════

insert into catalog_engines (code, alt_codes, display_name, power_kw, fuel_type, torque_nm, cylinders, emission_standard, timing_type, engine_oil_capacity_liters, timing_replacement_km)
values
  ('APG', '{}', '1.8 20V (APG)', 92, 'petrol', 170, 'L4', 'Euro 3', 'belt', 4.5, 120000)
on conflict (code, power_kw) do nothing;

-- ════════════════════════════════════════════════════════════
-- 6. TRANSMISSIONS — none. All 4 (02J, 02K, 01M, 02M) are REUSE.
-- ════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════
-- 7. PHASE_BODY_DIMENSIONS — one row per phase (single body: Sedan 4-door).
-- ════════════════════════════════════════════════════════════

with dim_values (phase_label, body_type, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg, boot_capacity_liters, boot_max_liters, gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters) as (
  values
    ('Pre-facelift'::text, 'Sedan 4-door'::text, 4443::integer, 1742::integer, 1436::integer, 130::integer, 1250::integer, 500::integer, 830::integer, 1740::integer, 490::integer, 55::numeric),
    ('Facelift'::text, 'Sedan 4-door'::text, 4443::integer, 1742::integer, 1436::integer, 130::integer, 1250::integer, 500::integer, 830::integer, 1740::integer, 490::integer, 55::numeric)
),
phase_lookup as (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'SEAT' and cm.name = 'Toledo' and cp.generation_code = '1M2'
)
insert into phase_body_dimensions (phase_id, body_type_id, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg, boot_capacity_liters, boot_max_liters, gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters)
select p.id, bt.id, v.length_mm, v.width_mm, v.height_mm, v.ground_clearance_mm, v.curb_weight_kg, v.boot_capacity_liters, v.boot_max_liters, v.gross_vehicle_weight_kg, v.payload_kg, v.fuel_tank_capacity_liters
from dim_values v
join phase_lookup p on p.phase_label = v.phase_label
join catalog_body_types bt on bt.name = v.body_type
on conflict (phase_id, body_type_id) do nothing;
-- ════════════════════════════════════════════════════════════
-- 8. VEHICLE CONFIGURATIONS — 22 rows (11 Pre-facelift + 11 Facelift), one per
--    marked 'x' cell in configs-Pre-facelift.csv / configs-Facelift.csv. No drivetrain
--    system anywhere — Toledo Mk2 had no AWD/4motion option, so dt_code is always NULL.
-- ════════════════════════════════════════════════════════════

with
  phase_lookup as (
    select cp.id, cp.phase_label
    from catalog_phases cp
    join catalog_models cm on cm.id = cp.model_id
    join catalog_brands cb on cb.id = cm.brand_id
    where cb.name = 'SEAT' and cm.name = 'Toledo' and cp.generation_code = '1M2'
  ),
  body_lookup as (
    select id, name from catalog_body_types
  ),
  engine_lookup as (
    select id, code, power_kw from catalog_engines
  ),
  trans_lookup as (
    select id, code from catalog_transmissions
  ),
  configs (phase_label, body_name, engine_code, engine_power_kw, trans_code) as (
    values
      ('Pre-facelift'::text, 'Sedan 4-door'::text, 'AXP'::text, 55::integer, '02K'::text),
      ('Pre-facelift'::text, 'Sedan 4-door'::text, 'AKL'::text, 74::integer, '02K'::text),
      ('Pre-facelift'::text, 'Sedan 4-door'::text, 'AKL'::text, 74::integer, '01M'::text),
      ('Pre-facelift'::text, 'Sedan 4-door'::text, 'AUS'::text, 77::integer, '02K'::text),
      ('Pre-facelift'::text, 'Sedan 4-door'::text, 'AGN'::text, 92::integer, '02J'::text),
      ('Pre-facelift'::text, 'Sedan 4-door'::text, 'AGN'::text, 92::integer, '01M'::text),
      ('Pre-facelift'::text, 'Sedan 4-door'::text, 'AGZ'::text, 110::integer, '02J'::text),
      ('Pre-facelift'::text, 'Sedan 4-door'::text, 'AGZ'::text, 110::integer, '01M'::text),
      ('Pre-facelift'::text, 'Sedan 4-door'::text, 'AGR'::text, 66::integer, '02J'::text),
      ('Pre-facelift'::text, 'Sedan 4-door'::text, 'AHF'::text, 81::integer, '02J'::text),
      ('Pre-facelift'::text, 'Sedan 4-door'::text, 'ARL'::text, 110::integer, '02M'::text),
      ('Facelift'::text, 'Sedan 4-door'::text, 'AUS'::text, 77::integer, '02K'::text),
      ('Facelift'::text, 'Sedan 4-door'::text, 'APG'::text, 92::integer, '02J'::text),
      ('Facelift'::text, 'Sedan 4-door'::text, 'APG'::text, 92::integer, '01M'::text),
      ('Facelift'::text, 'Sedan 4-door'::text, 'AQN'::text, 125::integer, '02J'::text),
      ('Facelift'::text, 'Sedan 4-door'::text, 'AQN'::text, 125::integer, '02M'::text),
      ('Facelift'::text, 'Sedan 4-door'::text, 'AUQ'::text, 132::integer, '02J'::text),
      ('Facelift'::text, 'Sedan 4-door'::text, 'AUQ'::text, 132::integer, '02M'::text),
      ('Facelift'::text, 'Sedan 4-door'::text, 'ALH'::text, 66::integer, '02J'::text),
      ('Facelift'::text, 'Sedan 4-door'::text, 'ASV'::text, 81::integer, '02J'::text),
      ('Facelift'::text, 'Sedan 4-door'::text, 'ASZ'::text, 96::integer, '02M'::text),
      ('Facelift'::text, 'Sedan 4-door'::text, 'ARL'::text, 110::integer, '02M'::text)
  )
insert into catalog_vehicle_configurations (phase_id, body_type_id, engine_id, transmission_id, drivetrain_id)
select p.id, b.id, e.id, t.id, null
from configs c
join phase_lookup p on p.phase_label = c.phase_label
join body_lookup b on b.name = c.body_name
join engine_lookup e on e.code = c.engine_code and e.power_kw = c.engine_power_kw
join trans_lookup t on t.code = c.trans_code
on conflict (
  phase_id, body_type_id, engine_id, transmission_id,
  coalesce(drivetrain_id, '00000000-0000-0000-0000-000000000000'::uuid)
) do nothing;

-- ════════════════════════════════════════════════════════════
-- 9. TRIMS — 8 rows (4 per phase). No trim_features supplied yet.
-- ════════════════════════════════════════════════════════════

insert into catalog_trims (phase_id, name, tier)
select p.id, v.name, v.tier
from (
  values
    ('Pre-facelift'::text, 'Stella'::text, 1::integer),
    ('Pre-facelift'::text, 'Signo'::text, 2::integer),
    ('Pre-facelift'::text, 'Executive'::text, 3::integer),
    ('Pre-facelift'::text, 'Sport'::text, 4::integer),
    ('Facelift'::text, 'Stella'::text, 1::integer),
    ('Facelift'::text, 'Signo'::text, 2::integer),
    ('Facelift'::text, 'Executive'::text, 3::integer),
    ('Facelift'::text, 'FR'::text, 4::integer)
) as v(phase_label, name, tier)
join (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'SEAT' and cm.name = 'Toledo' and cp.generation_code = '1M2'
) as p on p.phase_label = v.phase_label
where not exists (
  select 1 from catalog_trims ct where ct.phase_id = p.id and ct.name = v.name
);
