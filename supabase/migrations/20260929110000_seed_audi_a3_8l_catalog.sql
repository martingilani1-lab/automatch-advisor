-- Audi A3 (8L) seed: full car import into the catalog_ schema, generated from the filled
-- intake template at scripts/cars/audi-a3-8l/ (disposable per-car working copy —
-- scripts/new-car-template/ itself was never touched), per the import-car skill.
--
-- REUSE/CREATE summary (reconciled live before writing this file):
--   engines: 14 REUSE, 1 NEW (APY)
--   transmissions: 5 REUSE, 0 NEW
--   drivetrain: haldex_gen1 REUSE (A3 8L 'quattro' is physically a transverse Haldex clutch
--     — mapped to haldex_gen1, not a separate quattro drivetrain row, per Martin's rule 1).
--   body types: 'Hatchback 3-door' and 'Hatchback 5-door' REUSE (both from the Golf IV seed).
--   brand/model: Audi / A3 are both NEW.
--
-- APY note: a distinct primary engine row, NOT an alt_code of AMK. Both are nominally
-- 154kW 1.8T S3 units, but APY (Euro 2) predates AMK (Euro 3, León's seed) — same
-- Euro-generation-split pattern as AGN/APG (Toledo) and AGR/ALH, AHF/ASV. Phase-isolated:
-- APY appears only in the Pre-facelift config rows below, AMK/BAM only in Facelift.
--
-- Configs: 63 total (23 Pre-facelift + 40 Facelift), one row per 'x' cell
-- in the two filled config grids — every FK below resolves by code/name via a CTE, never a
-- hand-typed UUID. The 3 S3 engines (APY, AMK, BAM) are STRICTLY 3-door — confirmed by grep
-- against the generated SQL before this file was finalized, not just by construction.
--
-- No component faults for this car (Martin: the S3 inherits the transverse 1.8T oil-sludge
-- fault already mapped to its engine block — nothing new to insert).
--
-- TYPE CASTS: every WITH ... AS (VALUES ...) SELECT ... INSERT block explicitly casts each
-- literal (::integer / ::numeric / ::text) — the standing rule since the Golf IV/León/Toledo
-- all-NULL-NCAP-column bug. A3's NCAP percentages are NULL on every phase row too.
--
-- Review-only. NOT executed. No destructive step in this file — everything here is
-- additive INSERT, so it all may run via MCP once reviewed.

do $$
begin
  if to_regclass('public.catalog_brands') is null then
    raise exception 'catalog_brands does not exist — run the catalog_ schema migration first.';
  end if;
  if not exists (select 1 from drivetrain_systems where code = 'haldex_gen1') then
    raise exception 'drivetrain_systems.haldex_gen1 is missing — needed for the quattro configs.';
  end if;
  if not exists (select 1 from catalog_body_types where name = 'Hatchback 3-door')
     or not exists (select 1 from catalog_body_types where name = 'Hatchback 5-door') then
    raise exception 'catalog_body_types Hatchback 3-door/5-door missing — run the Golf IV seed (20260928100000) first.';
  end if;
  if (select count(*) from catalog_engines where (code, power_kw) in (
    ('AKL', 74), ('BFQ', 75), ('AGN', 92), ('APG', 92), ('AGU', 110), ('AUQ', 132), ('AMK', 154), ('BAM', 165), ('AGR', 66), ('ALH', 66), ('AHF', 81), ('ASV', 81), ('ATD', 74), ('ASZ', 96)
  )) <> 14 then
    raise exception 'One or more REUSE engines are missing live — reconcile is stale, re-check before running.';
  end if;
  if exists (select 1 from catalog_engines where code = 'APY') then
    raise exception 'catalog_engines.APY already exists — reconcile is stale (was this already seeded?), re-check before running.';
  end if;
  if (select count(*) from catalog_transmissions where code in (
    '02J', '02K', '01M', '02M', '09A'
  )) <> 5 then
    raise exception 'One or more REUSE transmissions are missing live — reconcile is stale, re-check before running.';
  end if;
end $$;

-- ════════════════════════════════════════════════════════════
-- 1. BRAND
-- ════════════════════════════════════════════════════════════

insert into catalog_brands (name, country)
values ('Audi', 'Germany')
on conflict (name) do nothing;

-- ════════════════════════════════════════════════════════════
-- 2. MODEL
-- ════════════════════════════════════════════════════════════

insert into catalog_models (brand_id, name, segment, origin_country)
select id, 'A3', 'C', 'german'
from catalog_brands where name = 'Audi'
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
    ('8L'::text, 'Pre-facelift'::text, 1996::integer, 2000::integer, 'A3 (8L) Pre-facelift'::text, 'PQ34'::text, 4::integer, 1998::integer, null::integer, null::integer, null::integer, null::integer, 1800::integer, 1000::integer, 3000::integer, '250000-400000 km'::text, 'holds_well'::text, 5::integer, 1400::integer),
    ('8L'::text, 'Facelift'::text, 2000::integer, 2003::integer, 'A3 (8L) Facelift'::text, 'PQ34'::text, 4::integer, 1998::integer, null::integer, null::integer, null::integer, null::integer, 3500::integer, 2000::integer, 5000::integer, '200000-350000 km'::text, 'holds_well'::text, 5::integer, 1400::integer)
) as v(generation_code, phase_label, year_from, year_to, display_name, platform_code,
  safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,
  avg_market_price_eur, price_range_min_eur, price_range_max_eur, typical_mileage_range,
  resale_value_rating, seats_count, towing_capacity_kg)
join catalog_models m on m.name = 'A3'
join catalog_brands cb on cb.id = m.brand_id and cb.name = 'Audi'
where not exists (
  select 1 from catalog_phases cp where cp.model_id = m.id and cp.phase_label = v.phase_label
);

-- ════════════════════════════════════════════════════════════
-- 4. ENGINES — 1 NEW row (APY). Plain INSERT ... VALUES, no casting issue.
-- ════════════════════════════════════════════════════════════

insert into catalog_engines (code, alt_codes, display_name, power_kw, fuel_type, torque_nm, cylinders, emission_standard, timing_type, engine_oil_capacity_liters, timing_replacement_km)
values
  ('APY', '{}', '1.8T S3 (APY)', 154, 'petrol', 270, 'L4', 'Euro 2', 'belt', 4.5, 120000)
on conflict (code, power_kw) do nothing;

-- ════════════════════════════════════════════════════════════
-- 5. TRANSMISSIONS — none. All 5 (02J, 02K, 01M, 02M, 09A) are REUSE.
-- ════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════
-- 6. PHASE_BODY_DIMENSIONS — one row per (phase x body), 4 total.
-- ════════════════════════════════════════════════════════════

with dim_values (phase_label, body_type, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg, boot_capacity_liters, boot_max_liters, gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters) as (
  values
    ('Pre-facelift'::text, 'Hatchback 3-door'::text, 4152::integer, 1735::integer, 1427::integer, 110::integer, 1200::integer, 350::integer, 1100::integer, 1700::integer, 500::integer, 55::numeric),
    ('Pre-facelift'::text, 'Hatchback 5-door'::text, 4152::integer, 1735::integer, 1427::integer, 110::integer, 1200::integer, 350::integer, 1100::integer, 1700::integer, 500::integer, 55::numeric),
    ('Facelift'::text, 'Hatchback 3-door'::text, 4152::integer, 1735::integer, 1427::integer, 110::integer, 1200::integer, 350::integer, 1100::integer, 1700::integer, 500::integer, 55::numeric),
    ('Facelift'::text, 'Hatchback 5-door'::text, 4152::integer, 1735::integer, 1427::integer, 110::integer, 1200::integer, 350::integer, 1100::integer, 1700::integer, 500::integer, 55::numeric)
),
phase_lookup as (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Audi' and cm.name = 'A3' and cp.generation_code = '8L'
)
insert into phase_body_dimensions (phase_id, body_type_id, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg, boot_capacity_liters, boot_max_liters, gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters)
select p.id, bt.id, v.length_mm, v.width_mm, v.height_mm, v.ground_clearance_mm, v.curb_weight_kg, v.boot_capacity_liters, v.boot_max_liters, v.gross_vehicle_weight_kg, v.payload_kg, v.fuel_tank_capacity_liters
from dim_values v
join phase_lookup p on p.phase_label = v.phase_label
join catalog_body_types bt on bt.name = v.body_type
on conflict (phase_id, body_type_id) do nothing;
-- ════════════════════════════════════════════════════════════
-- 7. VEHICLE CONFIGURATIONS — 63 rows (23 Pre-facelift + 40 Facelift), one per
--    marked 'x' cell in configs-Pre-facelift.csv / configs-Facelift.csv. dt = 'FWD' below
--    means no AWD system; only 'haldex_gen1' resolves to a non-null drivetrain_id (this IS
--    quattro on the 8L — see the header note).
-- ════════════════════════════════════════════════════════════

with
  phase_lookup as (
    select cp.id, cp.phase_label
    from catalog_phases cp
    join catalog_models cm on cm.id = cp.model_id
    join catalog_brands cb on cb.id = cm.brand_id
    where cb.name = 'Audi' and cm.name = 'A3' and cp.generation_code = '8L'
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
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AKL'::text, 74::integer, '02K'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AKL'::text, 74::integer, '02K'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AKL'::text, 74::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AKL'::text, 74::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGN'::text, 92::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGN'::text, 92::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGN'::text, 92::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGN'::text, 92::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGU'::text, 110::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGU'::text, 110::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGU'::text, 110::integer, '02J'::text, 'haldex_gen1'::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGU'::text, 110::integer, '02J'::text, 'haldex_gen1'::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGU'::text, 110::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGU'::text, 110::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'APY'::text, 154::integer, '02M'::text, 'haldex_gen1'::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGR'::text, 66::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGR'::text, 66::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AGR'::text, 66::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGR'::text, 66::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AHF'::text, 81::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AHF'::text, 81::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 3-door'::text, 'AHF'::text, 81::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AHF'::text, 81::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'BFQ'::text, 75::integer, '02K'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'BFQ'::text, 75::integer, '02K'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'BFQ'::text, 75::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'BFQ'::text, 75::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'APG'::text, 92::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'APG'::text, 92::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'APG'::text, 92::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'APG'::text, 92::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AGU'::text, 110::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AGU'::text, 110::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AGU'::text, 110::integer, '02J'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AGU'::text, 110::integer, '02J'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AGU'::text, 110::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AGU'::text, 110::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AUQ'::text, 132::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AUQ'::text, 132::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AUQ'::text, 132::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AUQ'::text, 132::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AUQ'::text, 132::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AUQ'::text, 132::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'AMK'::text, 154::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'BAM'::text, 165::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ALH'::text, 66::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ALH'::text, 66::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ALH'::text, 66::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ALH'::text, 66::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ASV'::text, 81::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ASV'::text, 81::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ASV'::text, 81::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ASV'::text, 81::integer, '01M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ATD'::text, 74::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ATD'::text, 74::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ATD'::text, 74::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ATD'::text, 74::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ASZ'::text, 96::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ASZ'::text, 96::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ASZ'::text, 96::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ASZ'::text, 96::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 3-door'::text, 'ASZ'::text, 96::integer, '09A'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ASZ'::text, 96::integer, '09A'::text, null::text)
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
-- 8. TRIMS — 7 rows. No trim_features supplied yet.
-- ════════════════════════════════════════════════════════════

insert into catalog_trims (phase_id, name, tier)
select p.id, v.name, v.tier
from (
  values
    ('Pre-facelift'::text, 'Attraction'::text, 1::integer),
    ('Pre-facelift'::text, 'Ambition'::text, 2::integer),
    ('Pre-facelift'::text, 'Ambiente'::text, 3::integer),
    ('Facelift'::text, 'Attraction'::text, 1::integer),
    ('Facelift'::text, 'Ambition'::text, 2::integer),
    ('Facelift'::text, 'Ambiente'::text, 3::integer),
    ('Facelift'::text, 'S line'::text, 4::integer)
) as v(phase_label, name, tier)
join (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Audi' and cm.name = 'A3' and cp.generation_code = '8L'
) as p on p.phase_label = v.phase_label
where not exists (
  select 1 from catalog_trims ct where ct.phase_id = p.id and ct.name = v.name
);
