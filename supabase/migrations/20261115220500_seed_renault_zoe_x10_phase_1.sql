-- Renault Zoe (X10) Phase 1 (2013-2019): seed written by the import-car skill from
-- docs/intake/research/renault-zoe-x10-phase-1.md (passes 1-5, Martin's decisions 2026-11-15).
--
-- REQUIRES 20261115220000_transmission_unit_zoe_ph1.sql to have run first (the new gearbox row).
--
-- REUSE / CREATE:
--   brand Renault, model Zoe, body type Hatchback 5-door ......... REUSE
--   phase 'Phase 1' ............................................... NEW (1)
--   phase x body dimensions ....................................... NEW (1)
--   engines Q210@65, R240@65, R90-22kWh@68, R90-41kWh@68, Q90@65,
--     R110-41kWh@80 ............................................... NEW (6). displacement_cc is NULL on
--     all (EV), so the near-duplicate check (rule 1c) does not apply. The live 'R110@80' is the
--     Phase 2 52 kWh motor and is NOT reused: the 41 kWh R110 gets its own code (pack rule 7).
--   gearbox generic:Single-speed EV (Zoe Ph1) ...................... REUSE (live after 20261115220000)
--   drivetrain ..................................................... none (FWD, driven_axle 'front')
--   configurations ................................................. NEW (6), approved list G1-G6
--   trims Life / Intens + 23 features (Renault Slovensko 12/2016) ... NEW
--   faults: 18 engine, 2 gearbox, 6 vehicle ........................ NEW (26)
--
-- Decisions (Martin, 2026-11-15): all 6 configurations incl. the import-only Q210 / R240 (P1); codes
-- (P2); new gearbox row (P3); years 2013-2019 (P4); battery rental = con + check (P5); weights ADAC EU
-- 1 547 / 1 555 / 1 575, Q90 1 555 source M, body 1 547 / GVW 1 965 / payload 463 (Renault SK);
-- market from the CZ column 7 165 / 8 167 / 9 659, mileage 42,000 - 144,524 km; motors rated 3,
-- gearbox 5; bearing cost 2 500-3 500 on Renault R-motors only, charger cost NULL; battery cooling
-- 'active_air' as Phase 2 (unverified medium); towing 0 (Renault SK "Nepovolený", Renault NL
-- "niet toegestaan"); NCAP 2013 5 stars 89 / 80 / 66 / 85.
--
-- Additive INSERTs only. May run via the Supabase MCP after Martin's review.

BEGIN;

DO $$
DECLARE n int; mid uuid; pid uuid; bid uuid; uid uuid;
BEGIN
  SELECT m.id INTO mid FROM public.catalog_models m JOIN public.catalog_brands b ON b.id = m.brand_id
   WHERE b.name = 'Renault' AND m.name = 'Zoe';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 model Renault Zoe, found % -- rolled back', n; END IF;

  SELECT id INTO bid FROM public.catalog_body_types WHERE name = 'Hatchback 5-door';
  SELECT id INTO uid FROM public.transmission_units WHERE code = 'generic:Single-speed EV (Zoe Ph1)';
  IF bid IS NULL THEN RAISE EXCEPTION 'Body type Hatchback 5-door missing -- rolled back'; END IF;
  IF uid IS NULL THEN RAISE EXCEPTION 'Run 20261115220000 first: gearbox row missing -- rolled back'; END IF;

  SELECT count(*) INTO n FROM public.catalog_phases WHERE model_id = mid AND phase_label = 'Phase 1';
  IF n <> 0 THEN RAISE EXCEPTION 'Zoe Phase 1 already exists -- rolled back'; END IF;
  SELECT count(*) INTO n FROM public.catalog_engines
   WHERE code IN ('Q210', 'R240', 'R90-22kWh', 'R90-41kWh', 'Q90', 'R110-41kWh');
  IF n <> 0 THEN RAISE EXCEPTION 'Found % Phase 1 engine codes already live -- rolled back', n; END IF;

  -- Phase.
  INSERT INTO public.catalog_phases
    (model_id, generation_code, phase_label, year_from, year_to, display_name, platform_code, chassis_type,
     safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,
     towing_capacity_kg, price_range_min_eur, avg_market_price_eur, price_range_max_eur,
     typical_mileage_range, resale_value_rating)
  VALUES
    (mid, 'X10', 'Phase 1', 2013, 2019, 'Zoe (X10) Phase 1', 'Renault-Nissan B (Zoe)', 'monocoque',
     5, 2013, 89, 80, 66, 85,
     0, 7165, 8167, 9659,
     '42,000 - 144,524 km', 'depreciates_fast')
  RETURNING id INTO pid;

  -- Body.
  INSERT INTO public.phase_body_dimensions
    (phase_id, body_type_id, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg,
     boot_capacity_liters, boot_max_liters, boot_sill_height_mm, gross_vehicle_weight_kg, payload_kg,
     seats_count, isofix_count, isofix_front_passenger)
  VALUES
    (pid, bid, 4084, 1730, 1562, 120, 1547,
     338, 1225, 724, 1965, 463,
     5, 3, true);

  -- Engines.
  WITH v(code, display_name, power_kw, torque_nm, battery, ac_kw, pros, cons) AS (VALUES
    ('Q210'::text, 'Q210 22 kWh, 65kW'::text, 65::integer, 220::integer, 22::numeric, 43::numeric,
     ARRAY['43 kW AC charging (Caméléon) -- about 80 % in under 30 minutes at a 43 kW AC station',
           'Heat pump standard']::text[],
     ARRAY['22 kWh battery: 210 km NEDC',
           'On-board charger failures are most common on the Q-motor cars',
           'Sold in Germany only with a rented battery -- check the battery is owned or the rental contract transfers',
           'No DC (CCS) socket']::text[]),
    ('R240', 'R240 22 kWh, 65kW', 65, 220, 22, 22,
     ARRAY['Renault''s own motor: 240 km NEDC from the 22 kWh battery',
           'Heat pump standard'],
     ARRAY['22 kWh battery: about 115-170 km in real use',
           'AC charging up to 22 kW only, no DC (CCS) socket',
           'Many cars were sold with a rented battery -- check it is owned']),
    ('R90-22kWh', 'R90 22 kWh, 68kW', 68, 220, 22, 22,
     ARRAY['22 kW three-phase AC charging -- about 1 h 45 min on a 22 kW wallbox',
           'Heat pump standard'],
     ARRAY['22 kWh battery: 240 km NEDC, about 115-170 km in real use',
           'No DC (CCS) socket',
           'Many cars were sold with a rented battery -- check it is owned']),
    ('R90-41kWh', 'R90 Z.E. 40, 68kW', 68, 220, 41, 22,
     ARRAY['41 kWh usable battery: 403 km NEDC, about 200-300 km in real use',
           '22 kW three-phase AC charging -- about 2 h 40 min on a 22 kW wallbox',
           'Heat pump standard',
           'Asks more on the used market than the 22 kWh cars (CZ / DE listings, 2026-11)'],
     ARRAY['No DC (CCS) socket',
           '68 kW: 0-100 km/h in 13.2 s',
           'Many cars were sold with a rented battery -- check it is owned']),
    ('Q90', 'Q90 Z.E. 40, 65kW', 65, 220, 41, 43,
     ARRAY['43 kW AC charging -- 80 % in about 65 minutes at a 43 kW AC station',
           '41 kWh usable battery: 370 km NEDC',
           'Asks more on the used market than the 22 kWh cars (CZ / DE listings, 2026-11)'],
     ARRAY['On-board charger failures are most common on the Q-motor cars',
           'No DC (CCS) socket',
           'Many cars were sold with a rented battery -- check it is owned']),
    ('R110-41kWh', 'R110 Z.E. 40, 80kW', 80, 225, 41, 22,
     ARRAY['80 kW / 225 Nm: 0-100 km/h in 11.4 s',
           '41 kWh usable battery: 316 km WLTP',
           'Asks more on the used market than the 22 kWh cars (CZ / DE listings, 2026-11)'],
     ARRAY['No DC (CCS) socket',
           'Many cars were sold with a rented battery -- check it is owned'])
  )
  INSERT INTO public.catalog_engines
    (code, display_name, power_kw, fuel_type, torque_nm, battery_capacity_net_kwh, max_ac_charging_kw,
     max_dc_charging_kw, battery_thermal_management, heat_pump, has_dpf, has_gpf, has_adblue,
     reliability_rating, maintenance_note, pros, cons)
  SELECT v.code, v.display_name, v.power_kw, 'electric', v.torque_nm, v.battery, v.ac_kw,
         NULL, 'active_air', 'standard', false, false, false,
         3,
         'Renault service every 30 000 km or 12 months (ADAC lists service 1 at €120 and service 2 at €130 at a German dealer). No oil, timing belt or spark plugs. Routine items: brake fluid, cabin filter, coolant for the motor / power-electronics circuit as the Renault maintenance document specifies, and the 12 V battery when it ages.',
         v.pros, v.cons
    FROM v;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'Expected 6 engines, inserted % -- rolled back', n; END IF;

  -- Configurations (G1-G6).
  WITH v(code, kwh100, cycle, range_km, acc, vmax, curb) AS (VALUES
    ('Q210'::text,       14.6::numeric, 'NEDC'::text, 210::integer, 13.2::numeric, 135::integer, 1547::integer),
    ('R240',             13.3, 'NEDC', 240, 13.2, 135, 1547),
    ('R90-22kWh',        13.3, 'NEDC', 240, 13.2, 135, 1547),
    ('R90-41kWh',        13.3, 'NEDC', 403, 13.2, 135, 1555),
    ('Q90',              14.6, 'NEDC', 370, 13.2, 135, 1555),
    ('R110-41kWh',       16.3, 'WLTP', 316, 11.4, 135, 1575)
  )
  INSERT INTO public.catalog_vehicle_configurations
    (phase_id, body_type_id, engine_id, unit_id, drivetrain_id, driven_axle,
     energy_consumption_kwh100km, consumption_cycle, ev_range_km, acceleration_0_100, top_speed_kmh, curb_weight_kg)
  SELECT pid, bid, e.id, uid, NULL, 'front', v.kwh100, v.cycle, v.range_km, v.acc, v.vmax, v.curb
    FROM v JOIN public.catalog_engines e ON e.code = v.code;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'Expected 6 configurations, inserted % -- rolled back', n; END IF;

  -- Trims (Renault Slovensko brochure 12/2016: LIFE, "intens (LIFE +)").
  INSERT INTO public.catalog_trims (phase_id, name, tier) VALUES (pid, 'Life', '1'), (pid, 'Intens', '2');

  WITH v(trim_name, feature, is_optional, feature_group, safety_feature_slug) AS (VALUES
    ('Life'::text, 'Front airbags (passenger airbag can be switched off) and front side airbags protecting head and thorax'::text, false, 'airbags'::text, 'airbags'::text),
    ('Life', 'ESC stability control with traction control', false, NULL, 'esc'),
    ('Life', 'Tyre pressure monitoring', false, NULL, 'tyre_pressure_monitoring'),
    ('Life', 'ISOFIX on the rear outer seats and the front passenger seat', false, 'seats', NULL),
    ('Life', 'Cruise control with speed limiter', false, 'cruise', NULL),
    ('Life', 'Automatic climate control (single zone)', false, 'climate', NULL),
    ('Life', 'Heat pump (Range Optimizer)', false, 'climate', NULL),
    ('Life', 'LED daytime running lights, halogen headlights', false, 'headlights', NULL),
    ('Life', 'Electrically adjustable heated mirrors', false, 'mirrors', NULL),
    ('Life', 'Electric front windows', false, 'windows', NULL),
    ('Life', 'Keyless start with the Renault card', false, 'locking', NULL),
    ('Life', 'R-LINK Evolution 7-inch touchscreen with TomTom navigation, Bluetooth, 4 speakers', false, 'infotainment', NULL),
    ('Life', '15-inch steel wheels', false, 'wheels', NULL),
    ('Life', '16-inch alloy wheels', true, 'wheels', NULL),
    ('Intens', 'Rear parking sensors', false, 'parking', 'reversing_detection'),
    ('Intens', 'Hands-free Renault card', false, 'locking', NULL),
    ('Intens', 'Rain and light sensor', false, 'light_rain_sensors', NULL),
    ('Intens', 'Electric front and rear windows, driver one-touch', false, 'windows', NULL),
    ('Intens', 'Leather steering wheel', false, 'steering_wheel', NULL),
    ('Intens', 'R-LINK Evolution with DAB radio, 3D Sound by Arkamys, 6 speakers', false, 'sound', NULL),
    ('Intens', '16-inch alloy wheels', false, 'wheels', NULL),
    ('Intens', 'Gloss-black mirror caps and chrome grille strip', false, 'mirrors', NULL),
    ('Intens', '17-inch alloy wheels', true, 'wheels', NULL)
  )
  INSERT INTO public.catalog_trim_features (trim_id, feature, is_optional, feature_group, safety_feature_slug)
  SELECT t.id, v.feature, v.is_optional::boolean, v.feature_group::text, v.safety_feature_slug::text
    FROM v JOIN public.catalog_trims t ON t.phase_id = pid AND t.name = v.trim_name;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 23 THEN RAISE EXCEPTION 'Expected 23 trim features, inserted % -- rolled back', n; END IF;

  -- Engine faults (each of the six motors: charger, bearings, 12 V).
  INSERT INTO public.catalog_component_faults
    (component_type, engine_id, fault, severity, estimated_cost_eur_min, estimated_cost_eur_max,
     annual_probability, pre_purchase_check)
  SELECT 'engine', e.id, f.fault, f.severity,
         CASE WHEN f.kind = 'bearing' AND e.code NOT IN ('Q210', 'Q90') THEN 2500 END,
         CASE WHEN f.kind = 'bearing' AND e.code NOT IN ('Q210', 'Q90') THEN 3500 END,
         f.prob, f.check_text
    FROM public.catalog_engines e
   CROSS JOIN (VALUES
     ('charger'::text,
      'On-board charger / power-electronics failure — the car stops charging on AC, and with no DC socket it can then not be charged at all; more frequent on early cars and on the Q-motor (Q210 / Q90) cars.'::text,
      'critical'::text, 0.02::numeric,
      'Charge the car on AC at a public 22 kW station before buying (and at 43 kW for a Q210 / Q90).'::text),
     ('bearing',
      'Drive-motor rotor bearings wear — a hum or whine that rises with speed; a Renault dealer replaces the whole motor, independent EV specialists replace only the bearings.',
      'moderate', 0.02,
      'Listen for a speed-dependent hum or whine at 30-80 km/h on the test drive.'),
     ('12v',
      '12 V battery drain — the car won''t wake up although the traction battery is full.',
      'minor', 0.25, NULL)
   ) AS f(kind, fault, severity, prob, check_text)
   WHERE e.code IN ('Q210', 'R240', 'R90-22kWh', 'R90-41kWh', 'Q90', 'R110-41kWh');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 18 THEN RAISE EXCEPTION 'Expected 18 engine faults, inserted % -- rolled back', n; END IF;

  -- Gearbox faults (fixed recalls: cost / probability N/A).
  INSERT INTO public.catalog_component_faults
    (component_type, unit_id, fault, severity, affected_year_from, affected_year_to, pre_purchase_check)
  VALUES
    ('transmission', uid,
     'Recall: Zoe built 07/2015–01/2016 (UK campaign R/2017/207) — the reducer may not hold the car in P, so it can roll away; the parking mechanism and park wheel inside the reducer are replaced.',
     'critical', 2015, 2016, 'Check the parking lock holds on a slope, and ask a Renault dealer to confirm the campaign is closed for this VIN.'),
    ('transmission', uid,
     'Recall: Zoe built 11/2016–04/2017 (UK campaign R/2018/070) — the reducer may not hold the car in P; the gearbox parking pin is replaced.',
     'critical', 2016, 2017, 'Check the parking lock holds on a slope, and ask a Renault dealer to confirm the campaign is closed for this VIN.');

  -- Vehicle faults (Phase 1).
  INSERT INTO public.catalog_component_faults
    (component_type, phase_id, category, fault, severity, annual_probability, affected_year_from, affected_year_to, pre_purchase_check)
  VALUES
    ('vehicle', pid, 'climate', 'A/C compressor failure — no cooling and, with the heat pump, weak heating.',
     'moderate', 0.02, NULL, NULL, 'Check that the A/C blows cold and the heating works on the test drive.'),
    ('vehicle', pid, 'suspension', 'Front suspension wears early (control-arm bushes) — knocking over bumps.',
     'moderate', 0.02, NULL, NULL, 'Have the front control-arm bushes checked on a lift.'),
    ('vehicle', pid, 'brakes', 'Brake discs rust because regenerative braking leaves them little work — grinding, uneven braking, inspection findings.',
     'minor', 0.02, NULL, NULL, 'Look at the disc surfaces; rusty, scored discs need replacing.'),
    ('vehicle', pid, 'brakes', 'Recall: early Zoe (UK campaign R/2016/035, 03/2016; ADAC: campaign from 04/2016) — the front wheel-arch liners may rub the front brake hoses, which can leak and reduce braking; liners repositioned, hoses replaced.',
     'critical', NULL, NULL, 2016, 'Ask a Renault dealer to confirm the brake-hose campaign is closed for this VIN.'),
    ('vehicle', pid, 'interior', 'Recall: Zoe built 07–10/2017 (UK campaign R/2018/025) — a wrong accelerator pedal may be fitted, which can catch under the floor mat; the pedal is checked and replaced.',
     'moderate', NULL, 2017, 2017, 'Ask a Renault dealer to confirm the pedal campaign is closed for this VIN.'),
    ('vehicle', pid, 'suspension', 'Recall: ADAC 04/2018 — the front wheel hubs may crack (heat-treatment fault), with abnormal noise from the front; hubs checked and replaced if needed.',
     'critical', NULL, NULL, NULL, 'Listen for noise from the front wheels; ask a Renault dealer to confirm the wheel-hub campaign is closed for this VIN.');

  -- Post-checks.
  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations WHERE phase_id = pid;
  IF n <> 6 THEN RAISE EXCEPTION 'Post-check: expected 6 Phase 1 configurations, found % -- rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_component_faults f
   WHERE f.phase_id = pid OR f.unit_id = uid
      OR f.engine_id IN (SELECT id FROM public.catalog_engines WHERE code IN ('Q210', 'R240', 'R90-22kWh', 'R90-41kWh', 'Q90', 'R110-41kWh'));
  IF n <> 26 THEN RAISE EXCEPTION 'Post-check: expected 26 Phase 1 faults, found % -- rolled back', n; END IF;
END $$;

COMMIT;
