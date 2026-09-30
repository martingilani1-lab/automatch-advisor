-- Attribute pass for Volkswagen Golf VII (5G): fills phases/dimensions/engines attributes
-- deferred by the original structure-first seed (20260930101847_seed_volkswagen_golf_5g.sql,
-- see its PENDING-ATTRIBUTES.md), plus new trims/trim_features/faults data. Source:
-- scripts/cars/vw-golf-5g/{phases,dimensions,engines,trims,trim_features,faults}.csv as
-- filled this round.
--
-- catalog_phases, phase_body_dimensions, and catalog_engines rows for this car ALREADY EXIST
-- live (inserted NULL-attribute by the structure-first seed) -- filling their attribute
-- columns is an UPDATE of existing hand-authored rows, not a fresh INSERT, so it follows
-- CLAUDE.md rule 5: one transaction, verify (row-count guard) on every UPDATE, human-run only.
-- trims/trim_features/faults ARE fresh rows -- ordinary WHERE NOT EXISTS-guarded INSERTs.
--
-- EXCLUDED, flagged not silently dropped: a supplied MIB1/MIB2 infotainment-display fault.
-- catalog_component_faults has no body/electronics component_type (only engine/transmission),
-- and its severity ("low") isn't in the critical/moderate/minor vocabulary. Not written
-- anywhere in this file -- raise this separately if it needs a home.
--
-- Also fixed as a side effect of this pass: generate-seed.mjs's ENGINES_COLS/INSERT was
-- missing displacement_cc entirely (a real live column, confirmed), so no NEW engine's
-- displacement_cc was ever written by that script even when supplied. Checked every car
-- folder's engines.csv in this repo -- none of them ever actually supplied a NEW engine's
-- displacement_cc, so no data was silently lost historically; this was a latent bug, not an
-- active one. Fixed in scripts/generate-seed.mjs directly (separate from this migration).
--
-- NOT run. Review-only, per this repo's standing discipline. Run in a fresh SQL editor tab.

BEGIN;

-- ============================================================================
-- 1. PHASES attributes (UPDATE, 2 existing rows)
-- ============================================================================
with phase_lookup as (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '5G'
),
v (phase_label, safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct,
   ncap_safety_assist_pct, avg_market_price_eur, price_range_min_eur, price_range_max_eur,
   typical_mileage_range, resale_value_rating, towing_capacity_kg) as (
  values
    ('Pre-facelift'::text, 5::integer, 2012::integer, 94::integer, 89::integer, 65::integer, 71::integer,
     9500::integer, 6000::integer, 18000::integer, '150k-300k'::text, 'holds_well'::text, 1500::integer),
    ('Facelift'::text, 5::integer, 2012::integer, 94::integer, 89::integer, 65::integer, 71::integer,
     15000::integer, 10000::integer, 28000::integer, '80k-180k'::text, 'holds_well'::text, 1500::integer)
)
update catalog_phases cp
set safety_rating = v.safety_rating,
    ncap_year = v.ncap_year,
    ncap_adult_pct = v.ncap_adult_pct,
    ncap_child_pct = v.ncap_child_pct,
    ncap_pedestrian_pct = v.ncap_pedestrian_pct,
    ncap_safety_assist_pct = v.ncap_safety_assist_pct,
    avg_market_price_eur = v.avg_market_price_eur,
    price_range_min_eur = v.price_range_min_eur,
    price_range_max_eur = v.price_range_max_eur,
    typical_mileage_range = v.typical_mileage_range,
    resale_value_rating = v.resale_value_rating,
    towing_capacity_kg = v.towing_capacity_kg
from v
join phase_lookup pl on pl.phase_label = v.phase_label
where cp.id = pl.id;

do $$
declare n integer;
begin
  select count(*) into n
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '5G'
    and cp.safety_rating is not null and cp.resale_value_rating = 'holds_well';
  if n <> 2 then
    raise exception 'Step 1 failed: expected 2 catalog_phases rows updated for Golf 5G, found %.', n;
  end if;
end $$;

-- ============================================================================
-- 2. DIMENSIONS attributes (UPDATE, 6 existing rows)
-- ============================================================================
with phase_lookup as (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '5G'
),
v (phase_label, body_type, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg,
   boot_capacity_liters, boot_max_liters, gross_vehicle_weight_kg, payload_kg,
   fuel_tank_capacity_liters, seats_count) as (
  values
    ('Pre-facelift'::text, 'Hatchback 3-door'::text, 4255::integer, 1799::integer, 1452::integer, 142::integer, 1205::integer, 380::integer, 1270::integer, 1730::integer, 500::integer, 50::numeric, 5::integer),
    ('Pre-facelift'::text, 'Hatchback 5-door'::text, 4255::integer, 1799::integer, 1452::integer, 142::integer, 1225::integer, 380::integer, 1270::integer, 1750::integer, 500::integer, 50::numeric, 5::integer),
    ('Pre-facelift'::text, 'Estate'::text,           4562::integer, 1799::integer, 1481::integer, 142::integer, 1320::integer, 605::integer, 1620::integer, 1880::integer, 580::integer, 50::numeric, 5::integer),
    ('Facelift'::text,     'Hatchback 3-door'::text, 4258::integer, 1799::integer, 1492::integer, 142::integer, 1205::integer, 380::integer, 1270::integer, 1730::integer, 500::integer, 50::numeric, 5::integer),
    ('Facelift'::text,     'Hatchback 5-door'::text, 4258::integer, 1799::integer, 1492::integer, 142::integer, 1225::integer, 380::integer, 1270::integer, 1750::integer, 500::integer, 50::numeric, 5::integer),
    ('Facelift'::text,     'Estate'::text,           4567::integer, 1799::integer, 1515::integer, 142::integer, 1320::integer, 605::integer, 1620::integer, 1880::integer, 580::integer, 50::numeric, 5::integer)
)
update phase_body_dimensions pbd
set length_mm = v.length_mm,
    width_mm = v.width_mm,
    height_mm = v.height_mm,
    ground_clearance_mm = v.ground_clearance_mm,
    curb_weight_kg = v.curb_weight_kg,
    boot_capacity_liters = v.boot_capacity_liters,
    boot_max_liters = v.boot_max_liters,
    gross_vehicle_weight_kg = v.gross_vehicle_weight_kg,
    payload_kg = v.payload_kg,
    fuel_tank_capacity_liters = v.fuel_tank_capacity_liters,
    seats_count = v.seats_count
from v
join phase_lookup pl on pl.phase_label = v.phase_label
join catalog_body_types bt on bt.name = v.body_type
where pbd.phase_id = pl.id and pbd.body_type_id = bt.id;

do $$
declare n integer;
begin
  select count(*) into n
  from phase_body_dimensions pbd
  join catalog_phases cp on cp.id = pbd.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '5G'
    and pbd.curb_weight_kg is not null;
  if n <> 6 then
    raise exception 'Step 2 failed: expected 6 phase_body_dimensions rows updated for Golf 5G, found %.', n;
  end if;
end $$;

-- ============================================================================
-- 3. ENGINES attributes (UPDATE, 13 existing rows) -- displacement_cc, torque_nm,
-- timing_replacement_km. Matched by (code, power_kw), the real engine key -- never by code
-- alone (CHHB/CHHA/CJXC share nothing but a code prefix at different power).
-- ============================================================================
with v (code, power_kw, displacement_cc, torque_nm, timing_replacement_km) as (
  values
    ('CJZB'::text, 63::integer,  1197::integer, 160::integer, 120000::integer),
    ('CJZA'::text, 77::integer,  1197::integer, 175::integer, 120000::integer),
    ('CYVB'::text, 81::integer,  1197::integer, 175::integer, 120000::integer),
    ('CZCA'::text, 92::integer,  1395::integer, 200::integer, 120000::integer),
    ('CHPA'::text, 103::integer, 1395::integer, 250::integer, 120000::integer),
    ('CZDA'::text, 110::integer, 1395::integer, 250::integer, 120000::integer),
    ('CHHB'::text, 162::integer, 1984::integer, 350::integer, null::integer),
    ('CHHA'::text, 169::integer, 1984::integer, 350::integer, null::integer),
    ('CJXC'::text, 221::integer, 1984::integer, 380::integer, null::integer),
    ('CLHA'::text, 77::integer,  1598::integer, 250::integer, 210000::integer),
    ('CRKB'::text, 81::integer,  1598::integer, 250::integer, 210000::integer),
    ('CRBC'::text, 110::integer, 1968::integer, 320::integer, 210000::integer),
    ('CUNA'::text, 135::integer, 1968::integer, 380::integer, 210000::integer)
)
update catalog_engines ce
set displacement_cc = v.displacement_cc,
    torque_nm = v.torque_nm,
    timing_replacement_km = v.timing_replacement_km
from v
where ce.code = v.code and ce.power_kw = v.power_kw;

do $$
declare n integer;
begin
  select count(*) into n from catalog_engines
  where code in ('CJZB','CJZA','CYVB','CZCA','CHPA','CZDA','CHHB','CHHA','CJXC','CLHA','CRKB','CRBC','CUNA')
    and displacement_cc is not null and torque_nm is not null;
  if n <> 13 then
    raise exception 'Step 3 failed: expected 13 catalog_engines rows updated, found %.', n;
  end if;
end $$;

-- ============================================================================
-- 4. TRIMS (INSERT, 14 new rows: 7 trims x 2 phases). "GTI/GTD/R" as supplied was split into
-- 3 real distinct trims (GTI, GTD, R) -- flagged for confirmation, not silently collapsed.
-- ============================================================================
with phase_lookup as (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '5G'
),
v (phase_label, name, tier) as (
  values
    ('Pre-facelift'::text, 'Trendline'::text, 1::integer),
    ('Facelift'::text,     'Trendline'::text, 1::integer),
    ('Pre-facelift'::text, 'Comfortline'::text, 2::integer),
    ('Facelift'::text,     'Comfortline'::text, 2::integer),
    ('Pre-facelift'::text, 'Highline'::text, 3::integer),
    ('Facelift'::text,     'Highline'::text, 3::integer),
    ('Pre-facelift'::text, 'R-Line'::text, 3::integer),
    ('Facelift'::text,     'R-Line'::text, 3::integer),
    ('Pre-facelift'::text, 'GTI'::text, 4::integer),
    ('Facelift'::text,     'GTI'::text, 4::integer),
    ('Pre-facelift'::text, 'GTD'::text, 4::integer),
    ('Facelift'::text,     'GTD'::text, 4::integer),
    ('Pre-facelift'::text, 'R'::text, 4::integer),
    ('Facelift'::text,     'R'::text, 4::integer)
)
insert into catalog_trims (phase_id, name, tier)
select p.id, v.name, v.tier
from v
join phase_lookup p on p.phase_label = v.phase_label
where not exists (
  select 1 from catalog_trims ct where ct.phase_id = p.id and ct.name = v.name
);

-- ============================================================================
-- 5. TRIM FEATURES (INSERT, 48 new rows). All is_optional=false -- the source text read as
-- "this trim comes with X", not a standard/optional breakdown; "Tartan seats" is present
-- only for GTI/GTD (never for R), per the supplied text's own "(GTI/GTD)" scoping.
-- ============================================================================
with trim_lookup as (
  select ct.id, cp.phase_label, ct.name
  from catalog_trims ct
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '5G'
),
v (phase_label, trim_name, feature, is_optional) as (
  values
    ('Pre-facelift'::text, 'Trendline'::text, 'Steel wheels'::text, false),
    ('Facelift'::text,     'Trendline'::text, 'Steel wheels'::text, false),
    ('Pre-facelift'::text, 'Trendline'::text, 'Manual air conditioning'::text, false),
    ('Facelift'::text,     'Trendline'::text, 'Manual air conditioning'::text, false),
    ('Pre-facelift'::text, 'Trendline'::text, 'Basic infotainment display (monochrome/small colour)'::text, false),
    ('Facelift'::text,     'Trendline'::text, 'Basic infotainment display (monochrome/small colour)'::text, false),
    ('Pre-facelift'::text, 'Comfortline'::text, 'Alloy wheels'::text, false),
    ('Facelift'::text,     'Comfortline'::text, 'Alloy wheels'::text, false),
    ('Pre-facelift'::text, 'Comfortline'::text, 'Multi-function leather steering wheel'::text, false),
    ('Facelift'::text,     'Comfortline'::text, 'Multi-function leather steering wheel'::text, false),
    ('Pre-facelift'::text, 'Comfortline'::text, 'Automatic climate control (Climatronic)'::text, false),
    ('Facelift'::text,     'Comfortline'::text, 'Automatic climate control (Climatronic)'::text, false),
    ('Pre-facelift'::text, 'Highline'::text, 'Sport seats (alcantara/cloth mix)'::text, false),
    ('Facelift'::text,     'Highline'::text, 'Sport seats (alcantara/cloth mix)'::text, false),
    ('Pre-facelift'::text, 'Highline'::text, 'LED/Xenon ambient interior lighting'::text, false),
    ('Facelift'::text,     'Highline'::text, 'LED/Xenon ambient interior lighting'::text, false),
    ('Pre-facelift'::text, 'Highline'::text, 'Premium infotainment system'::text, false),
    ('Facelift'::text,     'Highline'::text, 'Premium infotainment system'::text, false),
    ('Pre-facelift'::text, 'R-Line'::text, 'Sport exterior bumpers'::text, false),
    ('Facelift'::text,     'R-Line'::text, 'Sport exterior bumpers'::text, false),
    ('Pre-facelift'::text, 'R-Line'::text, 'Larger alloy wheels'::text, false),
    ('Facelift'::text,     'R-Line'::text, 'Larger alloy wheels'::text, false),
    ('Pre-facelift'::text, 'R-Line'::text, 'Sport steering wheel'::text, false),
    ('Facelift'::text,     'R-Line'::text, 'Sport steering wheel'::text, false),
    ('Pre-facelift'::text, 'R-Line'::text, 'Black headliner'::text, false),
    ('Facelift'::text,     'R-Line'::text, 'Black headliner'::text, false),
    ('Pre-facelift'::text, 'GTI'::text, 'Upgraded brakes'::text, false),
    ('Facelift'::text,     'GTI'::text, 'Upgraded brakes'::text, false),
    ('Pre-facelift'::text, 'GTI'::text, 'Active suspension (DCC)'::text, false),
    ('Facelift'::text,     'GTI'::text, 'Active suspension (DCC)'::text, false),
    ('Pre-facelift'::text, 'GTI'::text, 'Tartan seats'::text, false),
    ('Facelift'::text,     'GTI'::text, 'Tartan seats'::text, false),
    ('Pre-facelift'::text, 'GTI'::text, 'Distinct aggressive aero styling'::text, false),
    ('Facelift'::text,     'GTI'::text, 'Distinct aggressive aero styling'::text, false),
    ('Pre-facelift'::text, 'GTD'::text, 'Upgraded brakes'::text, false),
    ('Facelift'::text,     'GTD'::text, 'Upgraded brakes'::text, false),
    ('Pre-facelift'::text, 'GTD'::text, 'Active suspension (DCC)'::text, false),
    ('Facelift'::text,     'GTD'::text, 'Active suspension (DCC)'::text, false),
    ('Pre-facelift'::text, 'GTD'::text, 'Tartan seats'::text, false),
    ('Facelift'::text,     'GTD'::text, 'Tartan seats'::text, false),
    ('Pre-facelift'::text, 'GTD'::text, 'Distinct aggressive aero styling'::text, false),
    ('Facelift'::text,     'GTD'::text, 'Distinct aggressive aero styling'::text, false),
    ('Pre-facelift'::text, 'R'::text, 'Upgraded brakes'::text, false),
    ('Facelift'::text,     'R'::text, 'Upgraded brakes'::text, false),
    ('Pre-facelift'::text, 'R'::text, 'Active suspension (DCC)'::text, false),
    ('Facelift'::text,     'R'::text, 'Active suspension (DCC)'::text, false),
    ('Pre-facelift'::text, 'R'::text, 'Distinct aggressive aero styling'::text, false),
    ('Facelift'::text,     'R'::text, 'Distinct aggressive aero styling'::text, false)
)
insert into catalog_trim_features (trim_id, feature, is_optional)
select tl.id, v.feature, v.is_optional
from v
join trim_lookup tl on tl.phase_label = v.phase_label and tl.name = v.trim_name
where not exists (
  select 1 from catalog_trim_features ctf where ctf.trim_id = tl.id and ctf.feature = v.feature
);

-- ============================================================================
-- 6. COMPONENT FAULTS (INSERT, 10 new rows) -- expanded from two family-level descriptions
-- (EA288 = 1.6/2.0 TDI, EA211 = 1.2/1.4 TSI) into one row per matching engine (code,
-- power_kw); faults.csv has no "engine family" concept. EA211 correctly excludes
-- CHHB/CHHA/CJXC (EA888 2.0 TSI, a different family).
-- ============================================================================
with engine_lookup as (
  select id, code, power_kw from catalog_engines
  where (code, power_kw) in (
    ('CLHA', 77), ('CRKB', 81), ('CRBC', 110), ('CUNA', 135),
    ('CJZB', 63), ('CJZA', 77), ('CYVB', 81), ('CZCA', 92), ('CHPA', 103), ('CZDA', 110)
  )
),
engine_faults (target_code, target_power_kw, fault, severity) as (
  values
    ('CLHA'::text, 77::integer,  'EA288 water pump failure leading to slow coolant leaks; often requires full timing belt kit replacement ahead of the 210000 km schedule.'::text, 'moderate'::text),
    ('CRKB'::text, 81::integer,  'EA288 water pump failure leading to slow coolant leaks; often requires full timing belt kit replacement ahead of the 210000 km schedule.'::text, 'moderate'::text),
    ('CRBC'::text, 110::integer, 'EA288 water pump failure leading to slow coolant leaks; often requires full timing belt kit replacement ahead of the 210000 km schedule.'::text, 'moderate'::text),
    ('CUNA'::text, 135::integer, 'EA288 water pump failure leading to slow coolant leaks; often requires full timing belt kit replacement ahead of the 210000 km schedule.'::text, 'moderate'::text),
    ('CJZB'::text, 63::integer,  'EA211 rattling or seizing turbocharger wastegate actuator rod, leading to EPC light and limp mode.'::text, 'moderate'::text),
    ('CJZA'::text, 77::integer,  'EA211 rattling or seizing turbocharger wastegate actuator rod, leading to EPC light and limp mode.'::text, 'moderate'::text),
    ('CYVB'::text, 81::integer,  'EA211 rattling or seizing turbocharger wastegate actuator rod, leading to EPC light and limp mode.'::text, 'moderate'::text),
    ('CZCA'::text, 92::integer,  'EA211 rattling or seizing turbocharger wastegate actuator rod, leading to EPC light and limp mode.'::text, 'moderate'::text),
    ('CHPA'::text, 103::integer, 'EA211 rattling or seizing turbocharger wastegate actuator rod, leading to EPC light and limp mode.'::text, 'moderate'::text),
    ('CZDA'::text, 110::integer, 'EA211 rattling or seizing turbocharger wastegate actuator rod, leading to EPC light and limp mode.'::text, 'moderate'::text)
)
insert into catalog_component_faults (component_type, engine_id, fault, severity)
select 'engine', e.id, f.fault, f.severity
from engine_faults f
join engine_lookup e on e.code = f.target_code and e.power_kw = f.target_power_kw
where not exists (
  select 1 from catalog_component_faults ccf where ccf.engine_id = e.id and ccf.fault = f.fault
);

do $$
declare trims_n integer; features_n integer; faults_n integer;
begin
  select count(*) into trims_n
  from catalog_trims ct
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '5G';
  if trims_n <> 14 then
    raise exception 'Step 4 failed: expected 14 catalog_trims rows for Golf 5G, found %.', trims_n;
  end if;

  select count(*) into features_n
  from catalog_trim_features ctf
  join catalog_trims ct on ct.id = ctf.trim_id
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Volkswagen' and cm.name = 'Golf' and cp.generation_code = '5G';
  if features_n <> 48 then
    raise exception 'Step 5 failed: expected 48 catalog_trim_features rows for Golf 5G, found %.', features_n;
  end if;

  select count(*) into faults_n
  from catalog_component_faults ccf
  where ccf.engine_id in (
    select id from catalog_engines where (code, power_kw) in (
      ('CLHA', 77), ('CRKB', 81), ('CRBC', 110), ('CUNA', 135),
      ('CJZB', 63), ('CJZA', 77), ('CYVB', 81), ('CZCA', 92), ('CHPA', 103), ('CZDA', 110)
    )
  ) and ccf.fault ilike 'EA2%';
  if faults_n <> 10 then
    raise exception 'Step 6 failed: expected 10 EA288/EA211 catalog_component_faults rows, found %.', faults_n;
  end if;
end $$;

COMMIT;
