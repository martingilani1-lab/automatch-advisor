-- Attribute pass for Škoda Octavia III (5E): fills phases/dimensions/engine attributes
-- deferred by the original structure-first seed, plus new trims/trim_features/faults data.
-- Source: scripts/cars/skoda-octavia-5e/{phases,dimensions,engines,trims,trim_features,
-- faults}.csv as filled this round. Same shape as
-- 20260930140000_golf_5g_attribute_pass.sql: catalog_phases/phase_body_dimensions rows
-- already exist live (structure-first seed) -- filling their attributes is an UPDATE of
-- existing hand-authored rows, not a fresh INSERT (CLAUDE.md rule 5: one transaction,
-- row-count guard on every UPDATE, human-run only). trims/trim_features/faults ARE fresh
-- rows -- ordinary WHERE NOT EXISTS-guarded INSERTs.
--
-- ENGINES: only CJSA's displacement_cc is touched here (1798, confirmed NULL live, verified
-- just now). The 10 REUSE engines (CJZB/CJZA/CYVB/CZDA/CLHA/CRKB/CRBC/CUNA/CHHB/CHHA) are the
-- Golf 5G dictionary rows -- their attributes were already filled by Golf 5G's own attribute
-- pass (20260930140000), confirmed matching live, not re-authored or re-UPDATEd here. This
-- migration does not touch them at all.
--
-- EXCLUDED, flagged not silently dropped: a supplied CRBC (110kW) fault ("Premature failure
-- of the variable water pump sleeve, causing the engine to overheat while the cabin heater
-- blows cold air."). CRBC already has a live, differently-worded water-pump fault from Golf
-- 5G's attribute pass ("EA288 water pump failure leading to slow coolant leaks; often
-- requires full timing belt kit replacement ahead of the 210000 km schedule."), confirmed via
-- a direct query just now. The two read as the same underlying EA288 water-pump design flaw
-- described two different ways, not two independently distinct failure modes -- but that's a
-- domain-knowledge call, not mine to make silently. NOT written anywhere in this file. The
-- CJSA fault (no existing overlap) IS included below.
--
-- Performance edition (RS) not in this pass -- per the standing rule applied to Golf 5G's
-- GTI/GTD/R, it's an engine + configuration, never a trim. Not supplied yet for this car.
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
  where cb.name = 'Škoda' and cm.name = 'Octavia' and cp.generation_code = '5E'
),
v (phase_label, safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct,
   ncap_safety_assist_pct, avg_market_price_eur, price_range_min_eur, price_range_max_eur,
   typical_mileage_range, resale_value_rating, towing_capacity_kg) as (
  values
    ('Pre-facelift'::text, 5::integer, 2013::integer, 93::integer, 86::integer, 66::integer, 66::integer,
     10500::integer, 6500::integer, 16000::integer, '160000 - 320000 km'::text, 'holds_well'::text, 1600::integer),
    ('Facelift'::text, 5::integer, 2013::integer, 93::integer, 86::integer, 66::integer, 66::integer,
     14500::integer, 10000::integer, 24000::integer, '90000 - 220000 km'::text, 'holds_well'::text, 1600::integer)
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
  where cb.name = 'Škoda' and cm.name = 'Octavia' and cp.generation_code = '5E'
    and cp.safety_rating is not null and cp.resale_value_rating = 'holds_well';
  if n <> 2 then
    raise exception 'Step 1 failed: expected 2 catalog_phases rows updated for Octavia 5E, found %.', n;
  end if;
end $$;

-- ============================================================================
-- 2. DIMENSIONS attributes (UPDATE, 4 existing rows)
-- ============================================================================
with phase_lookup as (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Škoda' and cm.name = 'Octavia' and cp.generation_code = '5E'
),
v (phase_label, body_type, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg,
   boot_capacity_liters, boot_max_liters, gross_vehicle_weight_kg, payload_kg,
   fuel_tank_capacity_liters, seats_count) as (
  values
    ('Pre-facelift'::text, 'Liftback'::text, 4659::integer, 1814::integer, 1461::integer, 140::integer, 1230::integer, 590::integer, 1580::integer, 1800::integer, 645::integer, 50::numeric, 5::integer),
    ('Pre-facelift'::text, 'Estate'::text,   4659::integer, 1814::integer, 1465::integer, 140::integer, 1250::integer, 610::integer, 1740::integer, 1820::integer, 645::integer, 50::numeric, 5::integer),
    ('Facelift'::text,     'Liftback'::text, 4670::integer, 1814::integer, 1461::integer, 140::integer, 1230::integer, 590::integer, 1580::integer, 1800::integer, 645::integer, 50::numeric, 5::integer),
    ('Facelift'::text,     'Estate'::text,   4667::integer, 1814::integer, 1465::integer, 140::integer, 1250::integer, 610::integer, 1740::integer, 1820::integer, 645::integer, 50::numeric, 5::integer)
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
  where cb.name = 'Škoda' and cm.name = 'Octavia' and cp.generation_code = '5E'
    and pbd.curb_weight_kg is not null;
  if n <> 4 then
    raise exception 'Step 2 failed: expected 4 phase_body_dimensions rows updated for Octavia 5E, found %.', n;
  end if;
end $$;

-- ============================================================================
-- 3. CJSA displacement_cc (UPDATE, 1 existing row). Matched by (code, power_kw). This is the
-- ONLY engine row this migration touches -- the other 10 belong to Golf 5G, already filled.
-- ============================================================================
update catalog_engines
set displacement_cc = 1798
where code = 'CJSA' and power_kw = 132;

do $$
declare n integer;
begin
  select count(*) into n from catalog_engines where code = 'CJSA' and power_kw = 132 and displacement_cc = 1798;
  if n <> 1 then
    raise exception 'Step 3 failed: expected 1 catalog_engines row (CJSA/132kW) updated, found %.', n;
  end if;
end $$;

-- ============================================================================
-- 4. TRIMS (INSERT, 8 new rows). Active/Ambition/L&K x 2 phases; Elegance (Pre-facelift
-- only) and Style (Facelift only, Elegance's successor) x 1 phase each -- not the same trim
-- under two names, per your own note that Style replaced Elegance with different equipment.
-- ============================================================================
with phase_lookup as (
  select cp.id, cp.phase_label
  from catalog_phases cp
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Škoda' and cm.name = 'Octavia' and cp.generation_code = '5E'
),
v (phase_label, name, tier) as (
  values
    ('Pre-facelift'::text, 'Active'::text, 1::integer),
    ('Facelift'::text,     'Active'::text, 1::integer),
    ('Pre-facelift'::text, 'Ambition'::text, 2::integer),
    ('Facelift'::text,     'Ambition'::text, 2::integer),
    ('Pre-facelift'::text, 'Elegance'::text, 3::integer),
    ('Facelift'::text,     'Style'::text, 3::integer),
    ('Pre-facelift'::text, 'Laurin & Klement (L&K)'::text, 4::integer),
    ('Facelift'::text,     'Laurin & Klement (L&K)'::text, 4::integer)
)
insert into catalog_trims (phase_id, name, tier)
select p.id, v.name, v.tier
from v
join phase_lookup p on p.phase_label = v.phase_label
where not exists (
  select 1 from catalog_trims ct where ct.phase_id = p.id and ct.name = v.name
);

-- ============================================================================
-- 5. TRIM FEATURES (INSERT, 30 new rows). All is_optional=false -- same convention as Golf
-- 5G. "Replaced Elegance trim" (descriptive metadata from Style's source text) is not written
-- as a feature.
-- ============================================================================
with trim_lookup as (
  select ct.id, cp.phase_label, ct.name
  from catalog_trims ct
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Škoda' and cm.name = 'Octavia' and cp.generation_code = '5E'
),
v (phase_label, trim_name, feature, is_optional) as (
  values
    ('Pre-facelift'::text, 'Active'::text, 'Steel wheels'::text, false),
    ('Facelift'::text,     'Active'::text, 'Steel wheels'::text, false),
    ('Pre-facelift'::text, 'Active'::text, 'Manual air conditioning'::text, false),
    ('Facelift'::text,     'Active'::text, 'Manual air conditioning'::text, false),
    ('Pre-facelift'::text, 'Active'::text, 'Standard halogen headlights'::text, false),
    ('Facelift'::text,     'Active'::text, 'Standard halogen headlights'::text, false),
    ('Pre-facelift'::text, 'Active'::text, 'Basic radio'::text, false),
    ('Facelift'::text,     'Active'::text, 'Basic radio'::text, false),
    ('Pre-facelift'::text, 'Ambition'::text, 'Alloy wheels'::text, false),
    ('Facelift'::text,     'Ambition'::text, 'Alloy wheels'::text, false),
    ('Pre-facelift'::text, 'Ambition'::text, 'Multi-function steering wheel'::text, false),
    ('Facelift'::text,     'Ambition'::text, 'Multi-function steering wheel'::text, false),
    ('Pre-facelift'::text, 'Ambition'::text, 'Front fog lights'::text, false),
    ('Facelift'::text,     'Ambition'::text, 'Front fog lights'::text, false),
    ('Pre-facelift'::text, 'Ambition'::text, 'Cruise control'::text, false),
    ('Facelift'::text,     'Ambition'::text, 'Cruise control'::text, false),
    ('Pre-facelift'::text, 'Elegance'::text, 'Automatic climate control (Climatronic)'::text, false),
    ('Pre-facelift'::text, 'Elegance'::text, 'Upgraded Bolero infotainment'::text, false),
    ('Pre-facelift'::text, 'Elegance'::text, 'Rear parking sensors'::text, false),
    ('Facelift'::text,     'Style'::text, 'Full LED headlights'::text, false),
    ('Facelift'::text,     'Style'::text, 'Larger glass infotainment screen'::text, false),
    ('Facelift'::text,     'Style'::text, 'Ambient interior lighting'::text, false),
    ('Pre-facelift'::text, 'Laurin & Klement (L&K)'::text, 'Canton premium sound system'::text, false),
    ('Facelift'::text,     'Laurin & Klement (L&K)'::text, 'Canton premium sound system'::text, false),
    ('Pre-facelift'::text, 'Laurin & Klement (L&K)'::text, 'Alcantara/leather interior'::text, false),
    ('Facelift'::text,     'Laurin & Klement (L&K)'::text, 'Alcantara/leather interior'::text, false),
    ('Pre-facelift'::text, 'Laurin & Klement (L&K)'::text, 'DCC adaptive chassis control'::text, false),
    ('Facelift'::text,     'Laurin & Klement (L&K)'::text, 'DCC adaptive chassis control'::text, false),
    ('Pre-facelift'::text, 'Laurin & Klement (L&K)'::text, 'Exclusive brown/beige interior accents'::text, false),
    ('Facelift'::text,     'Laurin & Klement (L&K)'::text, 'Exclusive brown/beige interior accents'::text, false)
)
insert into catalog_trim_features (trim_id, feature, is_optional)
select tl.id, v.feature, v.is_optional
from v
join trim_lookup tl on tl.phase_label = v.phase_label and tl.name = v.trim_name
where not exists (
  select 1 from catalog_trim_features ctf where ctf.trim_id = tl.id and ctf.feature = v.feature
);

-- ============================================================================
-- 6. COMPONENT FAULTS (INSERT, 1 new row) -- CJSA only. CRBC's supplied fault is
-- deliberately NOT here, see the file header.
-- ============================================================================
insert into catalog_component_faults (component_type, engine_id, fault, severity)
select 'engine', ce.id,
  'Thermostat housing and water pump module prone to cracking and coolant leaks, requiring replacement of the entire plastic assembly.',
  'moderate'
from catalog_engines ce
where ce.code = 'CJSA' and ce.power_kw = 132
  and not exists (
    select 1 from catalog_component_faults ccf
    where ccf.engine_id = ce.id
      and ccf.fault = 'Thermostat housing and water pump module prone to cracking and coolant leaks, requiring replacement of the entire plastic assembly.'
  );

do $$
declare trims_n integer; features_n integer; faults_n integer;
begin
  select count(*) into trims_n
  from catalog_trims ct
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Škoda' and cm.name = 'Octavia' and cp.generation_code = '5E';
  if trims_n <> 8 then
    raise exception 'Step 4 failed: expected 8 catalog_trims rows for Octavia 5E, found %.', trims_n;
  end if;

  select count(*) into features_n
  from catalog_trim_features ctf
  join catalog_trims ct on ct.id = ctf.trim_id
  join catalog_phases cp on cp.id = ct.phase_id
  join catalog_models cm on cm.id = cp.model_id
  join catalog_brands cb on cb.id = cm.brand_id
  where cb.name = 'Škoda' and cm.name = 'Octavia' and cp.generation_code = '5E';
  if features_n <> 30 then
    raise exception 'Step 5 failed: expected 30 catalog_trim_features rows for Octavia 5E, found %.', features_n;
  end if;

  select count(*) into faults_n
  from catalog_component_faults ccf
  join catalog_engines ce on ce.id = ccf.engine_id
  where ce.code = 'CJSA' and ce.power_kw = 132;
  if faults_n <> 1 then
    raise exception 'Step 6 failed: expected 1 CJSA catalog_component_faults row, found %.', faults_n;
  end if;
end $$;

COMMIT;
