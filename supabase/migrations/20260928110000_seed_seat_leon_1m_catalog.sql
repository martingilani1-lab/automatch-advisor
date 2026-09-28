-- SEAT León Mk1 (1M) seed: full car import into the catalog_ schema, generated from the
-- filled intake template at scripts/new-car-template/ (car.csv, phases.csv, dimensions.csv,
-- engines.csv, transmissions.csv, configs-Pre-facelift.csv, configs-Facelift.csv, trims.csv,
-- faults.csv), per the import-car skill.
--
-- REUSE/CREATE summary (reconciled live before writing this file):
--   engines: 13 REUSE, 2 NEW (AMK, BAM)
--   transmissions: 4 REUSE, 0 NEW — no transmission section needed
--   drivetrain: haldex_gen1 REUSE (no new drivetrain system)
--   body types: 'Hatchback 5-door' REUSE (from the Golf IV seed) — León Mk1 was 5-door only,
--     so no new body type and no body dimension in the config grid.
--   brand/model: SEAT / León are both NEW
--
-- Configs: 28 total (17 Pre-facelift + 11 Facelift), one row per 'x' cell
-- in the two filled config grids — every FK below resolves by code/name via a CTE, never a
-- hand-typed UUID.
--
-- BCB note: the facelift AUS config (02K/FWD) is the one Martin flagged as the "(BCB)" badge
-- — it is NOT a separate engine row. It resolves to the same catalog_engines AUS/77kW row as
-- every other AUS config; BCB only shows up as one of the three values added to
-- AUS.alt_codes in section 9 below.
--
-- TYPE CASTS: every WITH ... AS (VALUES ...) SELECT ... INSERT block explicitly casts each
-- literal (::integer / ::numeric / ::text) — same fix as the Golf IV seed, where an all-NULL
-- VALUES column (there, NCAP percentages) defaulted to unknown/text and broke the INSERT.
-- León's NCAP percentages are NULL on every phase row too, so the same cast is required here.
--
-- DESTRUCTIVE STEP (separate, at the end): AUS.alt_codes gets 'BCB' and 'ATN' added to its
-- existing {AZD} — an UPDATE of existing data, file-only, human-run, guarded.
--
-- Review-only. NOT executed. Additive INSERT sections may run via MCP once reviewed; the
-- AUS alias UPDATE stays file-only regardless.

do $$
begin
  if to_regclass('public.catalog_brands') is null then
    raise exception 'catalog_brands does not exist — run the catalog_ schema migration first.';
  end if;
  if not exists (select 1 from drivetrain_systems where code = 'haldex_gen1') then
    raise exception 'drivetrain_systems.haldex_gen1 is missing — needed for the AWD/4motion configs.';
  end if;
  if not exists (select 1 from catalog_body_types where name = 'Hatchback 5-door') then
    raise exception 'catalog_body_types.''Hatchback 5-door'' is missing — run the Golf IV seed (20260928100000) first.';
  end if;
  if not exists (select 1 from catalog_engines where code = 'AUS' and power_kw = 77 and alt_codes = '{AZD}') then
    raise exception 'catalog_engines AUS (77kW) is missing or its alt_codes has already drifted from {AZD} — reconcile is stale, re-check before running.';
  end if;
  if (select count(*) from catalog_engines where (code, power_kw) in (
    ('AXP', 55), ('AKL', 74), ('AGN', 92), ('AUQ', 132), ('AUE', 150), ('AQM', 50), ('AGR', 66), ('ALH', 66), ('AHF', 81), ('ASV', 81), ('ASZ', 96), ('ARL', 110), ('AUS', 77)
  )) <> 13 then
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
values ('SEAT', 'Spain')
on conflict (name) do nothing;

-- ════════════════════════════════════════════════════════════
-- 2. MODEL
-- ════════════════════════════════════════════════════════════

insert into catalog_models (brand_id, name, segment, origin_country)
select id, 'León', 'C', 'spanish'
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
    ('1M'::text, 'Pre-facelift'::text, 1999::integer, 2003::integer, 'León Mk1 Pre-facelift'::text, 'PQ34'::text, 4::integer, 2001::integer, null::integer, null::integer, null::integer, null::integer, 1300::integer, 700::integer, 2500::integer, '280000-450000 km'::text, 'average'::text, 5::integer, 1400::integer),
    ('1M'::text, 'Facelift'::text, 2003::integer, 2006::integer, 'León Mk1 Facelift'::text, 'PQ34'::text, 4::integer, 2001::integer, null::integer, null::integer, null::integer, null::integer, 2500::integer, 1200::integer, 4500::integer, '220000-350000 km'::text, 'holds_well'::text, 5::integer, 1400::integer)
) as v(generation_code, phase_label, year_from, year_to, display_name, platform_code,
  safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,
  avg_market_price_eur, price_range_min_eur, price_range_max_eur, typical_mileage_range,
  resale_value_rating, seats_count, towing_capacity_kg)
join catalog_models m on m.name = 'León'
join catalog_brands cb on cb.id = m.brand_id and cb.name = 'SEAT'
where not exists (
  select 1 from catalog_phases cp where cp.model_id = m.id and cp.phase_label = v.phase_label
);

-- ════════════════════════════════════════════════════════════
-- 4. ENGINES — 2 NEW rows (AMK, BAM). 13 REUSE engines untouched. Plain INSERT ... VALUES
--    (not a VALUES-CTE), so no casting issue — Postgres takes types from catalog_engines
--    directly for a bare VALUES insert.
-- ════════════════════════════════════════════════════════════

insert into catalog_engines (code, alt_codes, display_name, power_kw, fuel_type, torque_nm, cylinders, emission_standard, timing_type, engine_oil_capacity_liters, timing_replacement_km)
values
  ('AMK', '{}', '1.8T Cupra R (AMK)', 154, 'petrol', 270, 'L4', 'Euro 3', 'belt', 4.5, 120000),
  ('BAM', '{}', '1.8T Cupra R (BAM)', 165, 'petrol', 280, 'L4', 'Euro 3', 'belt', 4.5, 120000)
on conflict (code, power_kw) do nothing;

-- ════════════════════════════════════════════════════════════
-- 5. TRANSMISSIONS — none. All 4 (02J, 02K, 01M, 02M) are REUSE, resolved by code at
--    config-insert time. No transmissions section needed.
-- ════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════
-- 6. PHASE_BODY_DIMENSIONS — one row per phase (single body: Hatchback 5-door).
-- ════════════════════════════════════════════════════════════

with dim_values (phase_label, body_type, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg, boot_capacity_liters, boot_max_liters, gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters) as (
  values
    ('Pre-facelift'::text, 'Hatchback 5-door'::text, 4184::integer, 1742::integer, 1439::integer, 130::integer, 1250::integer, 340::integer, 1166::integer, 1740::integer, 490::integer, 55::numeric),
    ('Facelift'::text, 'Hatchback 5-door'::text, 4184::integer, 1742::integer, 1439::integer, 130::integer, 1250::integer, 340::integer, 1166::integer, 1740::integer, 490::integer, 55::numeric)
),
phase_lookup as (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'SEAT' and cm.name = 'León' and cp.generation_code = '1M'
)
insert into phase_body_dimensions (phase_id, body_type_id, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg, boot_capacity_liters, boot_max_liters, gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters)
select p.id, bt.id, v.length_mm, v.width_mm, v.height_mm, v.ground_clearance_mm, v.curb_weight_kg, v.boot_capacity_liters, v.boot_max_liters, v.gross_vehicle_weight_kg, v.payload_kg, v.fuel_tank_capacity_liters
from dim_values v
join phase_lookup p on p.phase_label = v.phase_label
join catalog_body_types bt on bt.name = v.body_type
on conflict (phase_id, body_type_id) do nothing;
-- ════════════════════════════════════════════════════════════
-- 7. VEHICLE CONFIGURATIONS — 28 rows (17 Pre-facelift + 11 Facelift), one per
--    marked 'x' cell in configs-Pre-facelift.csv / configs-Facelift.csv. dt = 'FWD' below
--    means no AWD system; only 'haldex_gen1' resolves to a non-null drivetrain_id.
-- ════════════════════════════════════════════════════════════

with
  phase_lookup as (
    select cp.id, cp.phase_label
    from catalog_phases cp
    join catalog_models cm on cm.id = cp.model_id
    join catalog_brands cb on cb.id = cm.brand_id
    where cb.name = 'SEAT' and cm.name = 'León' and cp.generation_code = '1M'
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
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AXP'::text, 55::integer, '02K'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AKL'::text, 74::integer, '02K'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AKL'::text, 74::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AUS'::text, 77::integer, '02K'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGN'::text, 92::integer, '01M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGN'::text, 92::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AUQ'::text, 132::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AUQ'::text, 132::integer, '02M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AUQ'::text, 132::integer, '02M'::text, 'haldex_gen1'::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AMK'::text, 154::integer, '02M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AUE'::text, 150::integer, '02M'::text, 'haldex_gen1'::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AQM'::text, 50::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AGR'::text, 66::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'AHF'::text, 81::integer, '02J'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'ASZ'::text, 96::integer, '02M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'ARL'::text, 110::integer, '02M'::text, null::text),
      ('Pre-facelift'::text, 'Hatchback 5-door'::text, 'ARL'::text, 110::integer, '02M'::text, 'haldex_gen1'::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AXP'::text, 55::integer, '02K'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AUS'::text, 77::integer, '02K'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AUQ'::text, 132::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AUQ'::text, 132::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'BAM'::text, 165::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'AQM'::text, 50::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ALH'::text, 66::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ASV'::text, 81::integer, '02J'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ASZ'::text, 96::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ARL'::text, 110::integer, '02M'::text, null::text),
      ('Facelift'::text, 'Hatchback 5-door'::text, 'ARL'::text, 110::integer, '02M'::text, 'haldex_gen1'::text)
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
-- 8. TRIMS — 8 rows (4 per phase, phase-linked).
-- ════════════════════════════════════════════════════════════

insert into catalog_trims (phase_id, name, tier)
select p.id, v.name, v.tier
from (
  values
    ('Pre-facelift'::text, 'Stella'::text, 1::integer),
    ('Pre-facelift'::text, 'Signo'::text, 2::integer),
    ('Pre-facelift'::text, 'Sport'::text, 3::integer),
    ('Pre-facelift'::text, 'Top Sport'::text, 4::integer),
    ('Facelift'::text, 'Stella'::text, 1::integer),
    ('Facelift'::text, 'Signo'::text, 2::integer),
    ('Facelift'::text, 'Sport'::text, 3::integer),
    ('Facelift'::text, 'FR'::text, 4::integer)
) as v(phase_label, name, tier)
join (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'SEAT' and cm.name = 'León' and cp.generation_code = '1M'
) as p on p.phase_label = v.phase_label
where not exists (
  select 1 from catalog_trims ct where ct.phase_id = p.id and ct.name = v.name
);

-- ════════════════════════════════════════════════════════════
-- 9. COMPONENT FAULTS — 4 rows. The sludge/oil-starvation fault is one text
--    attached to AMK, BAM, AND the already-live AUQ (3 independent rows).
-- ════════════════════════════════════════════════════════════

with
  engine_lookup as (
    select id, code, power_kw from catalog_engines
    where (code, power_kw) in (('AMK', 154), ('BAM', 165), ('AUQ', 132))
  ),
  engine_faults (target_code, target_power_kw, fault, severity) as (
    values
      ('AMK'::text, 154::integer, 'Sludge buildup in the oil sump leading to a blocked oil pickup tube and catastrophic oil starvation if LongLife intervals were used.'::text, 'critical'::text),
      ('BAM'::text, 165::integer, 'Sludge buildup in the oil sump leading to a blocked oil pickup tube and catastrophic oil starvation if LongLife intervals were used.'::text, 'critical'::text),
      ('AUQ'::text, 132::integer, 'Sludge buildup in the oil sump leading to a blocked oil pickup tube and catastrophic oil starvation if LongLife intervals were used.'::text, 'critical'::text)
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
    select id, code from catalog_transmissions where code in ('02M')
  ),
  trans_faults (target_code, fault, severity) as (
    values
      ('02M'::text, 'Dual-mass flywheel (DMF) failure under high torque loads (especially mapped ARL/BAM engines), causing excessive vibration, rattling at idle, and potential transmission case damage if ignored.'::text, 'moderate'::text)
  )
insert into catalog_component_faults (component_type, transmission_id, fault, severity)
select 'transmission', t.id, f.fault, f.severity
from trans_faults f
join trans_lookup t on t.code = f.target_code
where not exists (
  select 1 from catalog_component_faults ccf where ccf.transmission_id = t.id and ccf.fault = f.fault
);

-- ════════════════════════════════════════════════════════════
-- 10. DESTRUCTIVE — AUS.alt_codes: add 'BCB' and 'ATN' to the existing {AZD}, giving
--     {AZD,BCB,ATN}. UPDATE of existing data: stays file-only, human-run, NOT executed here.
--     One transaction; guard aborts unless the row's alt_codes is exactly {AZD} today and
--     exactly 1 row is affected — so a drifted live state can't silently overwrite something
--     already changed. Plain UPDATE, no VALUES-CTE, no casting issue.
-- ════════════════════════════════════════════════════════════

begin;

do $$
declare
  n integer;
begin
  update catalog_engines
  set alt_codes = '{AZD,BCB,ATN}'
  where code = 'AUS' and power_kw = 77 and alt_codes = '{AZD}';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Expected AUS (77kW) alt_codes to be exactly {AZD} and updated once, % affected — aborting.', n;
  end if;
end $$;

commit;
