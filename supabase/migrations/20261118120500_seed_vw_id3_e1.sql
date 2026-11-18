-- Volkswagen ID.3 (E1), Pre-facelift (2020-2022) and Facelift (2023-2026): seed written by the import-car
-- skill from docs/intake/research/vw-id3-e1.md (passes 1-5; Martin approved V1-V8 and W1-W12 on 2026-11-18).
-- The second facelift (ID.3 Neo, from 07/2026) is deliberately NOT here (V1: no used market yet).
--
-- REQUIRES 20261118120000_transmission_units_vw_id3_meb.sql to have run first (the two gearbox rows).
--
-- REUSE / CREATE (live DB read via MCP 2026-11-18):
--   brand Volkswagen, body type Hatchback 5-door .................. REUSE
--   model ID.3 (segment C, german) .................................. NEW (V7)
--   phases Pre-facelift / Facelift (generation E1, platform MEB) ..... NEW (2)
--   phase x body dimensions ......................................... NEW (2)
--   engines (ADAC 3-letter motor code + battery, pack rule 7; V3) .... NEW (9):
--     EBJ-45kWh@110, EBJ-58kWh@107, EBJ-58kWh@150, EBJ-77kWh@150 (APP310 motor, 2020-05/2024);
--     EDC-52kWh@125, EDC-59kWh@150, EDC-77kWh@170, EDF-79kWh@210, EEW-79kWh@240 (05/2024-04/2026).
--     displacement_cc NULL on all (EV), so the near-duplicate check (rule 1c) does not apply.
--     EBJ-58kWh@150 and EBJ-77kWh@150 are shared by both phases (V8): every fault on them carries build years.
--   gearboxes VW 0MH (EBJ cars) / generic:Single-speed EV (MEB 2024) . REUSE (live after 20261118120000)
--   drivetrain ...................................................... none (rear-wheel drive, driven_axle 'rear')
--   configurations .................................................. NEW (4 + 7), approved list P1-P4 / F1-F7
--   trims: Pre-facelift Easy (SK 10/2022); Facelift Pure / Pro / Pro S / GTX (CZ 11/2024) .. NEW
--   faults: 14 engine (2 battery recalls x 7 motors), 5 vehicle ...... NEW (19)
--
-- Decisions (Martin, 2026-11-18): dimensions 4261/1809/1568 and 4265/1809/1552 (W1); configuration weights ADAC EU
-- (W2); body curb / GVW / payload 1772/2240/468 and 1787/2260/473 (W3); towing 0, roof load 0 (W4); Euro NCAP 2020
-- 5 stars 87/89/71/88 on both phases (W5); motors rated 4, gearboxes 5 (W6); heat pump optional on EBJ + EDC-52,
-- standard on EDC-59/77, EDF, EEW (W7); battery active_liquid (W8); Pro S pre-facelift 05/21 5-seat facts (W9);
-- market Pre-facelift SK 17 490 / 19 990 / 22 490, 50,629 - 157,000 km; Facelift CZ 25 554 / 28 701 / 32 765,
-- 10,000 - 45,000 km (W10); resale average (W11); 12 V battery wear 0.2 cost NULL, software 0.02 cost NULL (W12).
-- Pure EV: yearly_maintenance N/A (NULL), no oil / timing / plug columns.
--
-- Additive INSERTs only. May run via the Supabase MCP after Martin's review.

BEGIN;

DO $$
DECLARE n int; brand uuid; mid uuid; pre uuid; fl uuid; bid uuid; u0mh uuid; u24 uuid;
BEGIN
  SELECT id INTO brand FROM public.catalog_brands WHERE name = 'Volkswagen';
  SELECT id INTO bid FROM public.catalog_body_types WHERE name = 'Hatchback 5-door';
  SELECT id INTO u0mh FROM public.transmission_units WHERE code = 'VW 0MH';
  SELECT id INTO u24 FROM public.transmission_units WHERE code = 'generic:Single-speed EV (MEB 2024)';
  IF brand IS NULL OR bid IS NULL THEN RAISE EXCEPTION 'Brand Volkswagen or body Hatchback 5-door missing -- rolled back'; END IF;
  IF u0mh IS NULL OR u24 IS NULL THEN RAISE EXCEPTION 'Run 20261118120000 first: ID.3 gearbox rows missing -- rolled back'; END IF;

  SELECT count(*) INTO n FROM public.catalog_models
   WHERE brand_id = brand AND lower(replace(replace(name, '.', ''), ' ', '')) = 'id3';
  IF n <> 0 THEN RAISE EXCEPTION 'A Volkswagen ID.3 model already exists -- rolled back'; END IF;
  SELECT count(*) INTO n FROM public.catalog_engines WHERE code LIKE 'EBJ-%' OR code LIKE 'EDC-%' OR code LIKE 'EDF-%' OR code LIKE 'EEW-%';
  IF n <> 0 THEN RAISE EXCEPTION 'Found % ID.3 engine codes already live -- rolled back', n; END IF;

  -- Model.
  INSERT INTO public.catalog_models (brand_id, name, segment, origin_country)
  VALUES (brand, 'ID.3', 'C', 'german') RETURNING id INTO mid;

  -- Phases.
  INSERT INTO public.catalog_phases
    (model_id, generation_code, phase_label, year_from, year_to, display_name, platform_code, chassis_type,
     safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,
     towing_capacity_kg, price_range_min_eur, avg_market_price_eur, price_range_max_eur,
     typical_mileage_range, resale_value_rating)
  VALUES
    (mid, 'E1', 'Pre-facelift', 2020, 2022, 'ID.3 (E1) Pre-facelift', 'MEB', 'monocoque',
     5, 2020, 87, 89, 71, 88,
     0, 17490, 19990, 22490,
     '50,629 - 157,000 km', 'average')
  RETURNING id INTO pre;
  INSERT INTO public.catalog_phases
    (model_id, generation_code, phase_label, year_from, year_to, display_name, platform_code, chassis_type,
     safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,
     towing_capacity_kg, price_range_min_eur, avg_market_price_eur, price_range_max_eur,
     typical_mileage_range, resale_value_rating)
  VALUES
    (mid, 'E1', 'Facelift', 2023, 2026, 'ID.3 (E1) Facelift', 'MEB', 'monocoque',
     5, 2020, 87, 89, 71, 88,
     0, 25554, 28701, 32765,
     '10,000 - 45,000 km', 'average')
  RETURNING id INTO fl;

  -- Bodies (ground clearance not found: NULL).
  INSERT INTO public.phase_body_dimensions
    (phase_id, body_type_id, length_mm, width_mm, height_mm, curb_weight_kg, boot_capacity_liters, boot_max_liters,
     gross_vehicle_weight_kg, payload_kg, seats_count, isofix_count, isofix_front_passenger, roof_load_kg)
  VALUES
    (pre, bid, 4261, 1809, 1568, 1772, 385, 1267, 2240, 468, 5, 3, true, 0),
    (fl,  bid, 4265, 1809, 1552, 1787, 385, 1267, 2260, 473, 5, 3, true, 0);

  -- Engines.
  WITH v(code, display_name, power_kw, torque_nm, battery, ac_kw, dc_kw, heat_pump, pros, cons) AS (VALUES
    ('EBJ-45kWh'::text, 'Pure Performance 45 kWh, 110kW'::text, 110::integer, 310::integer, 45::numeric, 7.2::numeric, 100::numeric, 'optional'::text,
     ARRAY['310 Nm from the rear motor: 0-100 km/h in 8.9 s',
           'Lightest ID.3 (1 772 kg)']::text[],
     ARRAY['45 kWh usable battery: 351 km WLTP, about 250-350 km in real use (VW)',
           'AC charging 7.2 kW only; DC 50 kW standard, 100 kW optional',
           'Built only in 2021']::text[]),
    ('EBJ-58kWh', 'Pro 58 kWh, 107kW', 107, 275, 58, 11, 120,  'optional',
     ARRAY['58 kWh usable battery: 426 km WLTP',
           '11 kW three-phase AC charging'],
     ARRAY['Weakest motor tune: 0-100 km/h in 9.6 s',
           'DC charging 100 kW on early cars (120 kW from 05/2021)']),
    ('EBJ-58kWh', 'Pro Performance 58 kWh, 150kW', 150, 310, 58, 11, 120, 'optional',
     ARRAY['150 kW / 310 Nm: 0-100 km/h in 7.3 s',
           '58 kWh usable battery: 426-435 km WLTP',
           'Most common ID.3 on the SK / CZ used market'],
     ARRAY['DC charging 100 kW on early cars (120 kW from 05/2021)',
           'Cars built 2022-2024 are in the 2026 battery-module recall -- check it was done']),
    ('EBJ-77kWh', 'Pro S 77 kWh, 150kW', 150, 310, 77, 11, 170, 'optional',
     ARRAY['77 kWh usable battery: 549-575 km WLTP',
           'DC charging up to 170 kW (125 kW on cars built before 05/2021)',
           'ADAC 100 000 km test: 93 % battery capacity left'],
     ARRAY['4-seat on many cars (all until 05/2021, again in the facelift until 05/2024) -- check the seat count',
           'Payload only about 340-370 kg']),
    ('EDC-52kWh', 'Pure 52 kWh, 125kW', 125, 310, 52, 7.2, 145, 'optional',
     ARRAY['DC charging up to 145 kW',
           '52 kWh usable battery: 388 km WLTP'],
     ARRAY['AC charging 7.2 kW only (two-phase)',
           'Heat pump optional, often not fitted']),
    ('EDC-59kWh', 'Pro 59 kWh, 150kW', 150, 310, 59, 11, 165, 'standard',
     ARRAY['DC charging up to 165 kW',
           'Heat pump standard (CZ price list 11/2024)',
           '59 kWh usable battery: 433 km WLTP'],
     ARRAY['Little long-term data yet (built from 05/2024)']),
    ('EDC-77kWh', 'Pro S 77 kWh, 170kW', 170, 310, 77, 11, 175, 'standard',
     ARRAY['170 kW: 0-100 km/h in 7.1 s',
           '77 kWh usable battery: 554-567 km WLTP',
           'DC charging up to 175 kW, 5 seats'],
     ARRAY['Little long-term data yet (built from 05/2024)']),
    ('EDF-79kWh', 'GTX 79 kWh, 210kW', 210, 545, 79, 11, 185, 'standard',
     ARRAY['210 kW / 545 Nm: 0-100 km/h in 5.9 s',
           '79 kWh usable battery: 605 km WLTP, about 530 km in the ADAC Ecotest',
           'DC charging up to 185 kW'],
     ARRAY['Rear-wheel drive only, despite the GTX name',
           'Little long-term data yet (built from 05/2024)']),
    ('EEW-79kWh', 'GTX Performance 79 kWh, 240kW', 240, 545, 79, 11, 185, 'standard',
     ARRAY['240 kW / 545 Nm: 0-100 km/h in 5.7 s, 200 km/h',
           '79 kWh usable battery: 604 km WLTP',
           'DC charging up to 185 kW'],
     ARRAY['Rear-wheel drive only',
           'Little long-term data yet (built from 08/2024)'])
  )
  INSERT INTO public.catalog_engines
    (code, display_name, power_kw, fuel_type, torque_nm, battery_capacity_net_kwh, max_ac_charging_kw,
     max_dc_charging_kw, battery_thermal_management, heat_pump, has_dpf, has_gpf, has_adblue,
     reliability_rating, maintenance_note, pros, cons)
  SELECT v.code, v.display_name, v.power_kw, 'electric', v.torque_nm, v.battery, v.ac_kw,
         v.dc_kw, 'active_liquid', v.heat_pump, false, false, false,
         4,
         'Volkswagen ID. service: when the service display asks, at the latest every 2 years with no km limit -- brake fluid and cabin filter are changed (volkswagen.at). No oil, timing belt or spark plugs. The 12 V battery ages like on any car (early ID.3s got a new one free in the 2022 campaign).',
         v.pros, v.cons
    FROM v;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 9 THEN RAISE EXCEPTION 'Expected 9 engines, inserted % -- rolled back', n; END IF;

  -- Configurations (P1-P4, F1-F7). ADAC EU weight, WLTP, base wheels.
  WITH v(phase, code, kw, unit, kwh100, range_km, acc, vmax, curb) AS (VALUES
    ('pre'::text, 'EBJ-45kWh'::text, 110::integer, '0MH'::text, 14.9::numeric, 351::integer, 8.9::numeric, 160::integer, 1772::integer),
    ('pre', 'EBJ-58kWh', 107, '0MH', 15.4, 426, 9.6, 160, 1805),
    ('pre', 'EBJ-58kWh', 150, '0MH', 15.4, 426, 7.3, 160, 1805),
    ('pre', 'EBJ-77kWh', 150, '0MH', 15.4, 556, 7.9, 160, 1928),
    ('fl',  'EBJ-58kWh', 150, '0MH', 14.9, 435, 7.4, 160, 1821),
    ('fl',  'EBJ-77kWh', 150, '0MH', 14.9, 575, 7.9, 160, 1951),
    ('fl',  'EDC-52kWh', 125, '24',  15.2, 388, 8.2, 160, 1787),
    ('fl',  'EDC-59kWh', 150, '24',  15.3, 433, 7.6, 160, 1822),
    ('fl',  'EDC-77kWh', 170, '24',  15.6, 567, 7.1, 160, 1957),
    ('fl',  'EDF-79kWh', 210, '24',  14.5, 605, 5.9, 180, 1981),
    ('fl',  'EEW-79kWh', 240, '24',  14.6, 604, 5.7, 200, 1993)
  )
  INSERT INTO public.catalog_vehicle_configurations
    (phase_id, body_type_id, engine_id, unit_id, drivetrain_id, driven_axle,
     energy_consumption_kwh100km, consumption_cycle, ev_range_km, acceleration_0_100, top_speed_kmh, curb_weight_kg)
  SELECT CASE v.phase WHEN 'pre' THEN pre ELSE fl END, bid, e.id,
         CASE v.unit WHEN '0MH' THEN u0mh ELSE u24 END, NULL, 'rear',
         v.kwh100, 'WLTP', v.range_km, v.acc, v.vmax, v.curb
    FROM v JOIN public.catalog_engines e ON e.code = v.code AND e.power_kw = v.kw;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 11 THEN RAISE EXCEPTION 'Expected 11 configurations, inserted % -- rolled back', n; END IF;

  -- Trims. Pre-facelift: "Easy" (VW configuration for Slovenská sporiteľňa, 13.10.2022).
  -- Facelift: Pure / Pro / Pro S / GTX (Volkswagen ČR price list valid from 13.11.2024); later tiers list only what they add.
  INSERT INTO public.catalog_trims (phase_id, name, tier)
  VALUES (pre, 'Easy', '1'), (fl, 'Pure', '1'), (fl, 'Pro', '2'), (fl, 'Pro S', '3'), (fl, 'GTX', '4');

  WITH v(phase, trim_name, feature, is_optional, feature_group, safety_feature_slug) AS (VALUES
    ('pre'::text, 'Easy'::text, 'Front and side airbags, head airbags front and rear, front centre airbag; passenger airbag can be switched off'::text, false, 'airbags'::text, 'airbags'::text),
    ('pre', 'Easy', 'ESC stability control, ABS, ASR', false, NULL, 'esc'),
    ('pre', 'Easy', 'Adaptive cruise control (ACC) with predictive function', false, 'cruise', 'adaptive_cruise_control'),
    ('pre', 'Easy', 'Front Assist with City Brake and pedestrian / cyclist recognition', false, NULL, 'aeb'),
    ('pre', 'Easy', 'Lane Assist', false, NULL, 'emergency_lane_keeping'),
    ('pre', 'Easy', 'Driver drowsiness detection', false, NULL, 'driver_drowsiness_attention_warning'),
    ('pre', 'Easy', 'Traffic-sign recognition', false, 'instruments', NULL),
    ('pre', 'Easy', 'Tyre pressure monitoring (via ABS sensors)', false, NULL, 'tyre_pressure_monitoring'),
    ('pre', 'Easy', 'Park Assist with front and rear parking sensors', false, 'parking', 'parking_assist'),
    ('pre', 'Easy', 'Rear Assist reversing camera', false, 'parking', 'reversing_detection'),
    ('pre', 'Easy', 'LED headlights (low and high beam), LED tail lights', false, 'headlights', NULL),
    ('pre', 'Easy', 'Climatronic automatic climate control', false, 'climate', NULL),
    ('pre', 'Easy', 'Discover Pro navigation, 10-inch touchscreen, DAB+, voice control', false, 'infotainment', NULL),
    ('pre', 'Easy', 'App-Connect wireless: Apple CarPlay and Android Auto standard', false, 'smartphone', NULL),
    ('pre', 'Easy', 'Wireless phone charging', false, 'smartphone', NULL),
    ('pre', 'Easy', 'Heated front seats', false, 'seat_comfort', NULL),
    ('pre', 'Easy', 'Heated leather multifunction steering wheel', false, 'steering_wheel', NULL),
    ('pre', 'Easy', 'Keyless Advanced entry and Keyless Start, alarm', false, 'locking', NULL),
    ('pre', 'Easy', 'Ambient lighting, 30 colours', false, 'ambient_lighting', NULL),
    ('pre', 'Easy', 'Electric front and rear windows; tinted windows from the B-pillar', false, 'windows', NULL),
    ('pre', 'Easy', 'Electrically folding, adjustable, heated mirrors', false, 'mirrors', NULL),
    ('pre', 'Easy', 'Rain sensor', false, 'light_rain_sensors', NULL),
    ('pre', 'Easy', 'ISOFIX with Top Tether on the rear outer seats and the front passenger seat', false, 'seats', NULL),
    ('pre', 'Easy', '18-inch steel wheels, 215/55 R18', false, 'wheels', NULL),
    ('fl', 'Pure', 'Driver and passenger airbags (passenger can be switched off), front side airbags, head airbags, front centre airbag', false, 'airbags', 'airbags'),
    ('fl', 'Pure', 'Adaptive cruise control (ACC) with stop & go and predictive function', false, 'cruise', 'adaptive_cruise_control'),
    ('fl', 'Pure', 'Front Assist with pedestrian and cyclist detection; turn assist at junctions', false, NULL, 'aeb'),
    ('fl', 'Pure', 'Lane Assist', false, NULL, 'emergency_lane_keeping'),
    ('fl', 'Pure', 'Traffic-sign recognition', false, 'instruments', NULL),
    ('fl', 'Pure', 'Indirect tyre pressure monitoring', false, NULL, 'tyre_pressure_monitoring'),
    ('fl', 'Pure', 'Park Pilot front and rear parking sensors', false, 'parking', 'parking_assist'),
    ('fl', 'Pure', 'LED headlights with automatic high beam, LED tail lights', false, 'headlights', NULL),
    ('fl', 'Pure', 'Single-zone air conditioning', false, 'climate', NULL),
    ('fl', 'Pure', 'Radio "Ready 2 Discover Max", DAB+, voice control, 4+1 speakers', false, 'infotainment', NULL),
    ('fl', 'Pure', 'App-Connect wireless: Apple CarPlay and Android Auto standard', false, 'smartphone', NULL),
    ('fl', 'Pure', 'Keyless Start', false, 'locking', NULL),
    ('fl', 'Pure', 'Ambient lighting, 10 colours', false, 'ambient_lighting', NULL),
    ('fl', 'Pure', 'Electrically adjustable, folding, heated mirrors with memory and kerb tilt', false, 'mirrors', NULL),
    ('fl', 'Pure', 'Rain sensor; auto-dimming interior mirror', false, 'light_rain_sensors', NULL),
    ('fl', 'Pure', 'Height-adjustable front seats, front armrests', false, 'seat_adjustment', NULL),
    ('fl', 'Pure', 'ISOFIX on the front passenger seat and the rear outer seats', false, 'seats', NULL),
    ('fl', 'Pure', '18-inch steel wheels, 215/55 R18', false, 'wheels', NULL),
    ('fl', 'Pro', 'Heat pump', false, 'climate', NULL),
    ('fl', 'Pro', 'Boot floor adjustable to two heights', false, 'interior_trim', NULL),
    ('fl', 'Pro', 'Stainless-steel pedals "Play" / "Pause"', false, 'interior_trim', NULL),
    ('fl', 'Pro S', '20-inch alloy wheels "Sanya", 215/45 R20', false, 'wheels', NULL),
    ('fl', 'GTX', '20-inch alloy wheels "Skagen", 215/45 R20', false, 'wheels', NULL),
    ('fl', 'GTX', 'IQ.Light LED matrix headlights with welcome light', false, 'headlights', 'adaptive_matrix_headlights'),
    ('fl', 'GTX', 'Animated 3D LED tail lights and illuminated light strip between the headlights', false, 'headlights', NULL),
    ('fl', 'GTX', 'Tinted rear side windows and tailgate window (65 %)', false, 'windows', NULL)
  )
  INSERT INTO public.catalog_trim_features (trim_id, feature, is_optional, feature_group, safety_feature_slug)
  SELECT t.id, v.feature, v.is_optional::boolean, v.feature_group::text, v.safety_feature_slug::text
    FROM v JOIN public.catalog_trims t
      ON t.phase_id = CASE v.phase WHEN 'pre' THEN pre ELSE fl END AND t.name = v.trim_name;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 50 THEN RAISE EXCEPTION 'Expected 50 trim features, inserted % -- rolled back', n; END IF;

  -- Engine faults: the two battery recall campaigns, on every motor built in their windows
  -- (not EBJ-45kWh, built 2021 only, nor EBJ-58kWh@107, built to 01/2022). Fixed recalls: cost / probability N/A.
  INSERT INTO public.catalog_component_faults
    (component_type, engine_id, fault, severity, affected_year_from, affected_year_to, pre_purchase_check)
  SELECT 'engine', e.id, f.fault, 'critical', f.y_from, f.y_to, f.check_text
    FROM public.catalog_engines e
   CROSS JOIN (VALUES
     ('Recall: ID.3 built 02/2022–08/2024 (ADAC, 03/2026; UK R/2026/397) — high-voltage battery modules out of specification can lose range and light the yellow warning lamp, with a fire risk; software update, modules checked and replaced where needed. Until the repair VW asks owners to charge to 80 % only.'::text,
      2022::smallint, 2024::smallint,
      'Ask a Volkswagen dealer to confirm the battery-module campaign is closed for this VIN; check no yellow battery warning is shown.'::text),
     ('Recall: ID.3 built 10/2022–04/2025 (UK R/2026/150) — battery cells with raised self-discharge can light the yellow warning lamps; modules checked and replaced, charge outdoors and to 80 % until done.',
      2022, 2025,
      'Ask a Volkswagen dealer to confirm the battery-check campaign is closed for this VIN.')
   ) AS f(fault, y_from, y_to, check_text)
   WHERE (e.code, e.power_kw) IN (('EBJ-58kWh', 150), ('EBJ-77kWh', 150), ('EDC-52kWh', 125), ('EDC-59kWh', 150),
                                  ('EDC-77kWh', 170), ('EDF-79kWh', 210), ('EEW-79kWh', 240));
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 14 THEN RAISE EXCEPTION 'Expected 14 engine faults, inserted % -- rolled back', n; END IF;

  -- Vehicle faults.
  INSERT INTO public.catalog_component_faults
    (component_type, phase_id, category, fault, severity, annual_probability, affected_year_from, affected_year_to, pre_purchase_check)
  VALUES
    ('vehicle', pre, 'electrical',
     '12 V battery drains or weakens — the car won''t wake up or shows a string of error messages although the traction battery is charged. All early ID.3s got a new 12 V battery and software 2.4 free in the 2022 service campaign.',
     'minor', 0.2, 2020, 2022, 'Ask whether the 2022 12 V battery / software 2.4 campaign was done; check the software version in the infotainment.'),
    ('vehicle', pre, 'electrical',
     'Software faults on early cars — the driver display or infotainment freezes or keeps rebooting and assistants drop out; fixed by later ID. software updates (free at the dealer).',
     'minor', 0.02, 2020, 2021, 'Check the ID. software version is current (3.x or later) and the screens start without errors.'),
    ('vehicle', pre, 'interior',
     'Recall: ID.3 built 05/2020–01/2021 (ADAC, 11/2021) — the interior light can come out of its mounting in a crash; the light is replaced.',
     'moderate', NULL, 2020, 2021, 'Ask a Volkswagen dealer to confirm the interior-light campaign is closed for this VIN.'),
    ('vehicle', pre, 'interior',
     'Recall: ID.3 built 04/2021–12/2022 (UK R/2023/072) — the front passenger airbag may not be bolted securely; it is to be switched off until inspected and refitted.',
     'critical', NULL, 2021, 2022, 'Ask a Volkswagen dealer to confirm the passenger-airbag campaign is closed for this VIN.'),
    ('vehicle', fl, 'electrical',
     '12 V battery wears with age — the car won''t wake up or shows error messages although the traction battery is charged.',
     'minor', 0.2, NULL, NULL, NULL);

  -- Post-checks.
  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations WHERE phase_id IN (pre, fl);
  IF n <> 11 THEN RAISE EXCEPTION 'Post-check: expected 11 ID.3 configurations, found % -- rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_component_faults f
   WHERE f.phase_id IN (pre, fl)
      OR f.engine_id IN (SELECT id FROM public.catalog_engines WHERE code LIKE 'EBJ-%' OR code LIKE 'EDC-%' OR code LIKE 'EDF-%' OR code LIKE 'EEW-%');
  IF n <> 19 THEN RAISE EXCEPTION 'Post-check: expected 19 ID.3 faults, found % -- rolled back', n; END IF;
END $$;

COMMIT;
