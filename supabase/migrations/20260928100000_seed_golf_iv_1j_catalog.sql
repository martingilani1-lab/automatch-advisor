-- Golf IV (Volkswagen, 1J) seed: full car import into the catalog_ schema, generated
-- from the filled intake template at scripts/new-car-template/ (car.csv, phases.csv,
-- dimensions.csv, engines.csv, transmissions.csv, configs-Pre-facelift.csv,
-- configs-Facelift.csv, trims.csv, faults.csv), per the import-car skill.
--
-- REUSE/CREATE summary (reconciled live before writing this file):
--   engines: 16 REUSE, 7 NEW
--   transmissions: 4 REUSE, 2 NEW
--   drivetrain: haldex_gen1 REUSE (no new drivetrain system)
--   body types: Estate REUSE; 'Hatchback 3-door', 'Hatchback 5-door' NEW
--   brand/model: Volkswagen / Golf are both NEW (this schema currently only has Škoda/Octavia)
--
-- Configs: 122 total (49 Pre-facelift + 73 Facelift), one row per
-- 'x' cell in the two filled config grids — every FK below resolves by code/name via a
-- CTE, never a hand-typed UUID.
--
-- Exception configs are ABSENT by construction (no VALUES row was ever generated for
-- them, not filtered out after the fact): no GTI (AGU/AUQ/ARL) or R32 (BFH) Estate
-- configs; no BFQ configs on any gearbox except 01M.
--
-- TYPE CASTS: every WITH ... AS (VALUES ...) SELECT ... INSERT block below explicitly
-- casts each literal (::integer / ::numeric / ::text). Reason: Postgres resolves a
-- VALUES-CTE column's type from the literals actually present in that column,
-- independent of the eventual INSERT target — NOT from the target column the way a
-- direct INSERT ... VALUES (...) does. Golf's NCAP percentages are NULL on every
-- phase row (no NCAP data exists for this generation), so that column had zero typed
-- literals anywhere to infer integer from, defaulted to unknown/text, and the
-- phases INSERT failed with "column ncap_adult_pct is of type integer but expression
-- is of type text". Fixed by casting explicitly rather than relying on inference.
--
-- DESTRUCTIVE STEP (separate, at the end): AXP.alt_codes gets 'AHW' added to its
-- existing {BCA} — an UPDATE of existing data, file-only, human-run, guarded.
--
-- Review-only. NOT executed. Additive INSERT sections may run via MCP once reviewed;
-- the AXP alias UPDATE stays file-only regardless.

do $$
begin
  if to_regclass('public.catalog_brands') is null then
    raise exception 'catalog_brands does not exist — run the catalog_ schema migration first.';
  end if;
  if not exists (select 1 from drivetrain_systems where code = 'haldex_gen1') then
    raise exception 'drivetrain_systems.haldex_gen1 is missing — needed for the AWD/4motion configs.';
  end if;
  if not exists (select 1 from catalog_body_types where name = 'Estate') then
    raise exception 'catalog_body_types.Estate is missing — run the Combi->Estate rename (20260926110000) first.';
  end if;
  if (select count(*) from catalog_engines where (code, power_kw) in (
    ('AGU', 110), ('AUQ', 132), ('AXP', 55), ('AGN', 92), ('AKL', 74), ('APK', 85), ('AGP', 50), ('AGR', 66), ('AHF', 81), ('ALH', 66), ('ASV', 81), ('AQM', 50), ('AZH', 85), ('ATD', 74), ('ASZ', 96), ('BFQ', 75)
  )) <> 16 then
    raise exception 'One or more REUSE engines are missing live — reconcile is stale, re-check before running.';
  end if;
  if (select count(*) from catalog_transmissions where code in (
    '02J', '02K', '01M', '02M'
  )) <> 4 then
    raise exception 'One or more REUSE transmissions are missing live — reconcile is stale, re-check before running.';
  end if;
end $$;

-- ════════════════════════════════════════════════════════════
-- 1. BRAND
-- ════════════════════════════════════════════════════════════

insert into catalog_brands (name, country)
values ('Volkswagen', 'Germany')
on conflict (name) do nothing;

-- ════════════════════════════════════════════════════════════
-- 2. MODEL
-- ════════════════════════════════════════════════════════════

insert into catalog_models (brand_id, name, segment, origin_country)
select id, 'Golf', 'C', 'german'
from catalog_brands where name = 'Volkswagen'
on conflict (brand_id, name) do nothing;

-- ════════════════════════════════════════════════════════════
-- 3. PHASES — every column explicitly cast (see TYPE CASTS note above; this is the
--    section that actually failed without the casts).
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
    ('1J'::text, 'Pre-facelift'::text, 1997::integer, 2000::integer, 'Golf IV Pre-facelift'::text, 'PQ34'::text, 4::integer, 1998::integer, null::integer, null::integer, null::integer, null::integer, 1500::integer, 700::integer, 3000::integer, '280000-450000 km'::text, 'depreciates_fast'::text, 5::integer, 1300::integer),
    ('1J'::text, 'Facelift'::text, 2000::integer, 2006::integer, 'Golf IV Facelift'::text, 'PQ34'::text, 4::integer, 1998::integer, null::integer, null::integer, null::integer, null::integer, 2500::integer, 1000::integer, 5000::integer, '220000-380000 km'::text, 'average'::text, 5::integer, 1300::integer)
) as v(generation_code, phase_label, year_from, year_to, display_name, platform_code,
  safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,
  avg_market_price_eur, price_range_min_eur, price_range_max_eur, typical_mileage_range,
  resale_value_rating, seats_count, towing_capacity_kg)
join catalog_models m on m.name = 'Golf'
join catalog_brands cb on cb.id = m.brand_id and cb.name = 'Volkswagen'
where not exists (
  select 1 from catalog_phases cp where cp.model_id = m.id and cp.phase_label = v.phase_label
);

-- ════════════════════════════════════════════════════════════
-- 4. BODY TYPES — new only ('Estate' already exists, reused)
-- ════════════════════════════════════════════════════════════

insert into catalog_body_types (name)
values ('Hatchback 3-door'), ('Hatchback 5-door')
on conflict (name) do nothing;

-- ════════════════════════════════════════════════════════════
-- 5. ENGINES — 7 NEW rows. 16 REUSE engines are untouched (resolved by
--    code+power_kw at config-insert time, not re-created here). Plain
--    INSERT ... VALUES (not a VALUES-CTE), so no casting issue here — Postgres
--    takes column types directly from catalog_engines for a bare VALUES insert.
-- ════════════════════════════════════════════════════════════

insert into catalog_engines (code, alt_codes, display_name, power_kw, fuel_type, torque_nm, cylinders, emission_standard, timing_type, engine_oil_capacity_liters, timing_replacement_km)
values
  ('AUS', '{AZD}', '1.6 16V (AUS)', 77, 'petrol', 148, 'L4', 'Euro 4', 'belt', 3.2, 90000),
  ('AGZ', '{}', '2.3 V5 (AGZ)', 110, 'petrol', 205, 'V5', 'Euro 2', 'chain', 4.6, null),
  ('AQN', '{}', '2.3 V5 (AQN)', 125, 'petrol', 220, 'V5', 'Euro 3', 'chain', 4.6, null),
  ('AUE', '{BDE}', '2.8 V6 (AUE)', 150, 'petrol', 270, 'V6', 'Euro 3', 'chain', 5.5, null),
  ('BFH', '{}', '3.2 VR6 R32 (BFH)', 177, 'petrol', 320, 'VR6', 'Euro 4', 'chain', 5.5, null),
  ('AJM', '{}', '1.9 TDI PD (AJM)', 85, 'diesel', 285, 'L4', 'Euro 3', 'belt', 4.3, 90000),
  ('ARL', '{}', '1.9 TDI PD (ARL)', 110, 'diesel', 320, 'L4', 'Euro 3', 'belt', 4.3, 90000)
on conflict (code, power_kw) do nothing;

-- ════════════════════════════════════════════════════════════
-- 6. TRANSMISSIONS — 2 NEW rows. 4 REUSE transmissions are untouched. Plain
--    INSERT ... VALUES, same reasoning as section 5 — no casting issue.
-- ════════════════════════════════════════════════════════════

insert into catalog_transmissions (code, type, speeds)
values
  ('09A', 'torque_converter', 5),
  ('02E', 'dct_wet', 6)
on conflict (code) do nothing;

-- ════════════════════════════════════════════════════════════
-- 7. PHASE_BODY_DIMENSIONS — per (phase x body). No column is NULL on any row for
--    this car (checked), so this section could not have hit the phases bug — casts
--    added anyway, defensively, since it's the same WITH...VALUES...SELECT shape.
-- ════════════════════════════════════════════════════════════

with dim_values (phase_label, body_type, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg, boot_capacity_liters, boot_max_liters, gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters) as (
  values
    ('Pre-facelift'::text, 'Hatchback 3-door'::text, 4149::integer, 1735::integer, 1439::integer, 130::integer, 1175::integer, 330::integer, 1184::integer, 1710::integer, 535::integer, 55::numeric),
    ('Pre-facelift'::text, 'Hatchback 5-door'::text, 4149::integer, 1735::integer, 1439::integer, 130::integer, 1175::integer, 330::integer, 1184::integer, 1710::integer, 535::integer, 55::numeric),
    ('Pre-facelift'::text, 'Estate'::text, 4397::integer, 1735::integer, 1485::integer, 130::integer, 1275::integer, 460::integer, 1470::integer, 1810::integer, 535::integer, 55::numeric),
    ('Facelift'::text, 'Hatchback 3-door'::text, 4149::integer, 1735::integer, 1439::integer, 130::integer, 1175::integer, 330::integer, 1184::integer, 1710::integer, 535::integer, 55::numeric),
    ('Facelift'::text, 'Hatchback 5-door'::text, 4149::integer, 1735::integer, 1439::integer, 130::integer, 1175::integer, 330::integer, 1184::integer, 1710::integer, 535::integer, 55::numeric),
    ('Facelift'::text, 'Estate'::text, 4397::integer, 1735::integer, 1485::integer, 130::integer, 1275::integer, 460::integer, 1470::integer, 1810::integer, 535::integer, 55::numeric)
),
phase_lookup as (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '1J'
)
insert into phase_body_dimensions (phase_id, body_type_id, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg, boot_capacity_liters, boot_max_liters, gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters)
select p.id, bt.id, v.length_mm, v.width_mm, v.height_mm, v.ground_clearance_mm, v.curb_weight_kg, v.boot_capacity_liters, v.boot_max_liters, v.gross_vehicle_weight_kg, v.payload_kg, v.fuel_tank_capacity_liters
from dim_values v
join phase_lookup p on p.phase_label = v.phase_label
join catalog_body_types bt on bt.name = v.body_type
on conflict (phase_id, body_type_id) do nothing;

-- ════════════════════════════════════════════════════════════
-- 8. VEHICLE CONFIGURATIONS — 122 rows (49 Pre-facelift + 73 Facelift), one per
--    marked 'x' cell in configs-Pre-facelift.csv / configs-Facelift.csv. dt = 'FWD' below
--    means no AWD system (drivetrain_id stays null via the left join); only real
--    drivetrain_systems codes (haldex_gen1) resolve to a non-null id. dt_code is cast
--    ::text defensively (not currently all-null in any column here, but same shape as
--    the phases bug, so cast explicitly rather than rely on inference).
-- ════════════════════════════════════════════════════════════

with
  phase_lookup as (
    select cp.id, cp.phase_label
    from catalog_phases cp
    join catalog_models cm on cm.id = cp.model_id
    join catalog_brands cb on cb.id = cm.brand_id
    where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '1J'
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
  dt_lookup as (
    select id, code from drivetrain_systems where code = 'haldex_gen1'
  ),
  configs (phase_label, body_name, engine_code, engine_power_kw, trans_code, dt_code) as (
    values
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AXP'::text, 55::integer, '02K'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AXP'::text, 55::integer, '02K'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AXP'::text, 55::integer, '02K'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AKL'::text, 74::integer, '02K'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AKL'::text, 74::integer, '02K'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AKL'::text, 74::integer, '02K'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AKL'::text, 74::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AKL'::text, 74::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AKL'::text, 74::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGN'::text, 92::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGN'::text, 92::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AGN'::text, 92::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGN'::text, 92::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGN'::text, 92::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AGN'::text, 92::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'APK'::text, 85::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'APK'::text, 85::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'APK'::text, 85::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGP'::text, 50::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGP'::text, 50::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AGP'::text, 50::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGR'::text, 66::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGR'::text, 66::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AGR'::text, 66::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGR'::text, 66::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGR'::text, 66::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AGR'::text, 66::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGR'::text, 66::integer, '02M'::text, 'haldex_gen1'::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGR'::text, 66::integer, '02M'::text, 'haldex_gen1'::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AGR'::text, 66::integer, '02M'::text, 'haldex_gen1'::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AHF'::text, 81::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AHF'::text, 81::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AHF'::text, 81::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AHF'::text, 81::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AHF'::text, 81::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AHF'::text, 81::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGU'::text, 110::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGU'::text, 110::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AUQ'::text, 132::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AUQ'::text, 132::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGZ'::text, 110::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGZ'::text, 110::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AGZ'::text, 110::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGZ'::text, 110::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGZ'::text, 110::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AGZ'::text, 110::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGZ'::text, 110::integer, '02M'::text, 'haldex_gen1'::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGZ'::text, 110::integer, '02M'::text, 'haldex_gen1'::text),
      ('Pre-facelift'::text, 'Estate'::text, 'AGZ'::text, 110::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AXP'::text, 55::integer, '02K'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AXP'::text, 55::integer, '02K'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'AXP'::text, 55::integer, '02K'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AUS'::text, 77::integer, '02K'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AUS'::text, 77::integer, '02K'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'AUS'::text, 77::integer, '02K'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'BFQ'::text, 75::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'BFQ'::text, 75::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'BFQ'::text, 75::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AZH'::text, 85::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AZH'::text, 85::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'AZH'::text, 85::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AZH'::text, 85::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AZH'::text, 85::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'AZH'::text, 85::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AQM'::text, 50::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AQM'::text, 50::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'AQM'::text, 50::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ALH'::text, 66::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ALH'::text, 66::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'ALH'::text, 66::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ALH'::text, 66::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ALH'::text, 66::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'ALH'::text, 66::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ASV'::text, 81::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ASV'::text, 81::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'ASV'::text, 81::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ASV'::text, 81::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ASV'::text, 81::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'ASV'::text, 81::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ATD'::text, 74::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ATD'::text, 74::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'ATD'::text, 74::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ATD'::text, 74::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ATD'::text, 74::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Estate'::text, 'ATD'::text, 74::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ATD'::text, 74::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ATD'::text, 74::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'ATD'::text, 74::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AJM'::text, 85::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AJM'::text, 85::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Estate'::text, 'AJM'::text, 85::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AJM'::text, 85::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AJM'::text, 85::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'AJM'::text, 85::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ASZ'::text, 96::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ASZ'::text, 96::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Estate'::text, 'ASZ'::text, 96::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ASZ'::text, 96::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ASZ'::text, 96::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'ASZ'::text, 96::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ASZ'::text, 96::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ASZ'::text, 96::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'ASZ'::text, 96::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AQN'::text, 125::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AQN'::text, 125::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'AQN'::text, 125::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AGU'::text, 110::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AGU'::text, 110::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AGU'::text, 110::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AGU'::text, 110::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Estate'::text, 'AGU'::text, 110::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AUQ'::text, 132::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AUQ'::text, 132::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ARL'::text, 110::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ARL'::text, 110::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AUE'::text, 150::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AUE'::text, 150::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Estate'::text, 'AUE'::text, 150::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'BFH'::text, 177::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'BFH'::text, 177::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'BFH'::text, 177::integer, '02E'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'BFH'::text, 177::integer, '02E'::text, 'haldex_gen1'::text)
  )
insert into catalog_vehicle_configurations (phase_id, body_type_id, engine_id, transmission_id, drivetrain_id)
select p.id, b.id, e.id, t.id, d.id
from configs c
join phase_lookup p on p.phase_label = c.phase_label
join body_lookup b on b.name = c.body_name
join engine_lookup e on e.code = c.engine_code and e.power_kw = c.engine_power_kw
join trans_lookup t on t.code = c.trans_code
left join dt_lookup d on d.code = c.dt_code
on conflict (
  phase_id, body_type_id, engine_id, transmission_id,
  coalesce(drivetrain_id, '00000000-0000-0000-0000-000000000000'::uuid)
) do nothing;

-- ════════════════════════════════════════════════════════════
-- 9. TRIMS — 8 rows (4 per phase). No trim_features supplied yet.
--    No NULLs in this VALUES list, but cast explicitly anyway for consistency.
-- ════════════════════════════════════════════════════════════

insert into catalog_trims (phase_id, name, tier)
select p.id, v.name, v.tier
from (
  values
    ('Pre-facelift'::text, 'Basis'::text, 1::integer),
    ('Pre-facelift'::text, 'Trendline'::text, 2::integer),
    ('Pre-facelift'::text, 'Comfortline'::text, 3::integer),
    ('Pre-facelift'::text, 'Highline'::text, 4::integer),
    ('Facelift'::text, 'Basis'::text, 1::integer),
    ('Facelift'::text, 'Trendline'::text, 2::integer),
    ('Facelift'::text, 'Comfortline'::text, 3::integer),
    ('Facelift'::text, 'Highline'::text, 4::integer)
) as v(phase_label, name, tier)
join (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '1J'
) as p on p.phase_label = v.phase_label
where not exists (
  select 1 from catalog_trims ct where ct.phase_id = p.id and ct.name = v.name
);

-- ════════════════════════════════════════════════════════════
-- 10. COMPONENT FAULTS — 4 rows. The V5-chain fault is one text attached to
--     BOTH AGZ and AQN as two separate rows (each engine's fault list is independent).
-- ════════════════════════════════════════════════════════════

with
  engine_lookup as (
    select id, code, power_kw from catalog_engines
    where (code, power_kw) in (('AXP', 55), ('AGZ', 110), ('AQN', 125))
  ),
  engine_faults (target_code, target_power_kw, fault, severity) as (
    values
      ('AXP'::text, 55::integer, 'Piston ring wear leading to high oil consumption, and fatal engine freezing in winter due to crankcase breather condensation.'::text, 'critical'::text),
      ('AGZ'::text, 110::integer, 'Timing chain stretch and tensioner failure requiring complex engine removal to service.'::text, 'critical'::text),
      ('AQN'::text, 125::integer, 'Timing chain stretch and tensioner failure requiring complex engine removal to service.'::text, 'critical'::text)
  )
insert into catalog_component_faults (component_type, engine_id, fault, severity)
select 'engine', e.id, f.fault, f.severity
from engine_faults f
join engine_lookup e on e.code = f.target_code and e.power_kw = f.target_power_kw
where not exists (
  select 1 from catalog_component_faults ccf where ccf.engine_id = e.id and ccf.fault = f.fault
);

with
  trans_lookup as (
    select id, code from catalog_transmissions where code in ('09A')
  ),
  trans_faults (target_code, fault, severity) as (
    values
      ('09A'::text, 'Failure of solenoid valves (N88, N89, N92) causing harsh shifting, missing gears, or complete loss of reverse. Reverse piston cracking is also common.'::text, 'critical'::text)
  )
insert into catalog_component_faults (component_type, transmission_id, fault, severity)
select 'transmission', t.id, f.fault, f.severity
from trans_faults f
join trans_lookup t on t.code = f.target_code
where not exists (
  select 1 from catalog_component_faults ccf where ccf.transmission_id = t.id and ccf.fault = f.fault
);

-- ════════════════════════════════════════════════════════════
-- 11. DESTRUCTIVE — AXP.alt_codes: add 'AHW' to the existing {BCA}.
--     UPDATE of existing data: stays file-only, human-run, NOT executed here.
--     One transaction; guard aborts unless the row's alt_codes is exactly {BCA} today
--     and exactly 1 row is affected — so a drifted live state can't silently overwrite
--     something already changed. Plain UPDATE, no VALUES-CTE, no casting issue.
-- ════════════════════════════════════════════════════════════

begin;

do $$
declare
  n integer;
begin
  update catalog_engines
  set alt_codes = '{BCA,AHW}'
  where code = 'AXP' and power_kw = 55 and alt_codes = '{BCA}';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Expected AXP (55kW) alt_codes to be exactly {BCA} and updated once, % affected — aborting.', n;
  end if;
end $$;

commit;
