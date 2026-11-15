-- Renault Zoe (X10) Phase 2 completion, part 2 of 2: UPDATE / DELETE of existing rows.
-- Research + Martin's decisions (2026-11-15): docs/intake/research/renault-zoe-x10-completion.md.
-- Part 1 (new fault rows) is 20261115200000; the two files are independent, either order works.
--
-- 1. Phase (D3, D5, D6): towing_capacity_kg 0 -- Renault DE price list 09/2019, "Zulässige
--    Anhängelast (kg) -/-", legend "- = nicht verfügbar" [E2]; Renault CH 02/2024 "-" [E4].
--    Market from the CZ column (19 listings 2026-11-15, 2 cut at each end): min 13 430, median
--    16 000, max 22 340; mileage "10,860 - 128,329 km" (Martin: the 135 km nearly-new car left out
--    of the mileage range only). SK had 5 listings (median 14 690), DE reference median 15 990.
--    resale_value_rating stays depreciates_fast (D6).
-- 2. Body Hatchback 5-door (D1, D2): curb 1 577 (EU, incl. driver: Renault SK 01/2022, Renault DE
--    09/2019, ADAC), gross 1 988, payload 486 (Renault SK "425–486", lightest version). ISOFIX stays
--    2 / rear only (D4, Renault SK lists).
-- 3. Both configurations: curb_weight_kg 1 502 -> 1 577 (D1; 1 502 was mass without the driver).
-- 4. Engines R110@80 / R135@100 (D7): reliability 3, maintenance_note, pros, cons.
--    yearly_maintenance stays NULL (pure EV, N/A).
-- 5. Existing faults (D8, D9): charger 4 700 / 0.02 (+ pre-purchase check); R110 12 V wear 0.25
--    (cost left NULL -- no source); heat-pump leak 0.02 (cost NULL).
-- 6. Trims (D10): the 18 live features contradicted the Renault Slovensko price lists (03/2020,
--    01/2022) -- e.g. CCS standard on Intens (it is a €1 000 option on every trim), auto climate
--    and rear sensors standard on Zen (options). All 18 out; trim "R.S. Line / Iconic" (in no SK / CZ
--    document) deleted; 34 verified features in (Life 15, Zen 10, Intens 9), every one with a
--    feature_group or a safety slug.
-- Gearbox maker stays NULL: approved exception (D11), no SQL.
--
-- UPDATE / DELETE of existing data -> Martin runs this in a FRESH SQL editor tab (CLAUDE.md rule 5/6).
-- Every step is guarded on today's (2026-11-15) values; any mismatch rolls the whole file back.

BEGIN;

DO $$
DECLARE n int; pid uuid; bid uuid; r110 uuid; r135 uuid;
BEGIN
  SELECT p.id INTO pid
    FROM public.catalog_phases p
    JOIN public.catalog_models m ON m.id = p.model_id
    JOIN public.catalog_brands b ON b.id = m.brand_id
   WHERE b.name = 'Renault' AND m.name = 'Zoe' AND p.generation_code = 'X10' AND p.phase_label = 'Phase 2';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 Zoe X10 Phase 2, found % -- rolled back', n; END IF;

  SELECT id INTO bid FROM public.catalog_body_types WHERE name = 'Hatchback 5-door';
  SELECT id INTO r110 FROM public.catalog_engines WHERE code = 'R110' AND power_kw = 80 AND fuel_type = 'electric';
  SELECT id INTO r135 FROM public.catalog_engines WHERE code = 'R135' AND power_kw = 100 AND fuel_type = 'electric';
  IF bid IS NULL OR r110 IS NULL OR r135 IS NULL THEN RAISE EXCEPTION 'Body type or engine not found -- rolled back'; END IF;

  -- 1. Phase.
  UPDATE public.catalog_phases
     SET towing_capacity_kg = 0,
         price_range_min_eur = 13430, avg_market_price_eur = 16000, price_range_max_eur = 22340,
         typical_mileage_range = '10,860 - 128,329 km'
   WHERE id = pid
     AND towing_capacity_kg IS NULL AND price_range_min_eur IS NULL AND avg_market_price_eur IS NULL
     AND price_range_max_eur IS NULL AND typical_mileage_range IS NULL
     AND resale_value_rating = 'depreciates_fast';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected the Phase 2 row with NULL towing / market, updated % -- rolled back', n; END IF;

  -- 2. Body.
  UPDATE public.phase_body_dimensions
     SET curb_weight_kg = 1577, gross_vehicle_weight_kg = 1988, payload_kg = 486
   WHERE phase_id = pid AND body_type_id = bid
     AND curb_weight_kg IS NULL AND gross_vehicle_weight_kg IS NULL AND payload_kg IS NULL
     AND isofix_count = 2 AND isofix_front_passenger = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 Phase 2 body row with NULL weights, updated % -- rolled back', n; END IF;

  -- 3. Configurations.
  UPDATE public.catalog_vehicle_configurations
     SET curb_weight_kg = 1577
   WHERE phase_id = pid AND engine_id IN (r110, r135) AND curb_weight_kg = 1502;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 Phase 2 configurations at 1 502 kg, updated % -- rolled back', n; END IF;

  -- 4. Engines.
  UPDATE public.catalog_engines
     SET reliability_rating = 3,
         maintenance_note = 'Renault service every 30 000 km or 12 months (ADAC lists service 1 at €120 and service 2 at €130 at a German dealer). No oil, timing belt or spark plugs. Routine items: brake fluid, cabin filter, coolant for the motor / power-electronics circuit as the Renault maintenance document specifies, and the 12 V battery when it ages -- ADAC names the Zoe''s 12 V battery as relatively breakdown-prone.',
         pros = ARRAY[
           '52 kWh usable battery: 395 km WLTP',
           '22 kW three-phase AC charging (Caméléon) standard -- about 3 h on a 22 kW wallbox',
           'Heat pump standard on every trim sold in Slovakia'],
         cons = ARRAY[
           'DC fast charging (CCS, 50 kW) was a €1 000 option -- many cars have no CCS socket; with it, about 70 min to 80 %',
           '80 kW: 0-100 km/h in 11.4 s, 135 km/h top speed -- slow on the motorway',
           'Some German-market cars were sold with a rented battery (until 11/2020) -- check the battery is owned']
   WHERE id = r110 AND reliability_rating IS NULL AND maintenance_note IS NULL AND pros IS NULL AND cons IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected R110 with NULL rating / notes, updated % -- rolled back', n; END IF;

  UPDATE public.catalog_engines
     SET reliability_rating = 3,
         maintenance_note = 'Renault service every 30 000 km or 12 months (ADAC lists service 1 at €120 and service 2 at €130 at a German dealer). No oil, timing belt or spark plugs. Routine items: brake fluid, cabin filter, coolant for the motor / power-electronics circuit as the Renault maintenance document specifies, and the 12 V battery when it ages -- ADAC names the Zoe''s 12 V battery as relatively breakdown-prone.',
         pros = ARRAY[
           '52 kWh usable battery: 386 km WLTP',
           '100 kW / 245 Nm: 0-100 km/h in 9.5 s',
           '22 kW three-phase AC charging (Caméléon) standard -- about 3 h on a 22 kW wallbox',
           'Heat pump standard on every trim sold in Slovakia'],
         cons = ARRAY[
           'DC fast charging (CCS, 50 kW) was a €1 000 option -- many cars have no CCS socket; with it, about 70 min to 80 %',
           'Some German-market cars were sold with a rented battery (until 11/2020) -- check the battery is owned']
   WHERE id = r135 AND reliability_rating IS NULL AND maintenance_note IS NULL AND pros IS NULL AND cons IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected R135 with NULL rating / notes, updated % -- rolled back', n; END IF;

  -- 5. Existing faults.
  UPDATE public.catalog_component_faults
     SET estimated_cost_eur_min = 4700, estimated_cost_eur_max = 4700, annual_probability = 0.02,
         pre_purchase_check = 'AC-charge the car on a 22 kW / three-phase wallbox before buying.'
   WHERE engine_id IN (r110, r135) AND fault LIKE 'Onboard "Chameleon" charger faults%'
     AND estimated_cost_eur_min IS NULL AND annual_probability IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 charger faults, updated % -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET annual_probability = 0.25
   WHERE engine_id = r110 AND fault LIKE '12 V battery drain%' AND annual_probability IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 R110 12 V fault, updated % -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET annual_probability = 0.02
   WHERE phase_id = pid AND fault LIKE 'Heat-pump / AC refrigerant leaks%' AND annual_probability IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 heat-pump fault, updated % -- rolled back', n; END IF;

  -- 6a. Old trim features (18) and the unverified trim.
  DELETE FROM public.catalog_trim_features f
   USING public.catalog_trims t
   WHERE f.trim_id = t.id AND t.phase_id = pid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 18 THEN RAISE EXCEPTION 'Expected to delete 18 Phase 2 trim features, deleted % -- rolled back', n; END IF;

  DELETE FROM public.catalog_trims WHERE phase_id = pid AND name = 'R.S. Line / Iconic';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected to delete trim "R.S. Line / Iconic", deleted % -- rolled back', n; END IF;

  -- 6b. Verified features, Renault Slovensko price lists 03/2020 and 01/2022 (research doc section 5).
  --     A higher trim lists only what it adds (i3 convention).
  WITH v(trim_name, feature, is_optional, feature_group, safety_feature_slug) AS (VALUES
    ('Life'::text, 'Front and side airbags for driver and passenger, passenger airbag can be switched off'::text, false, 'airbags'::text, 'airbags'::text),
    ('Life', 'ESC stability control with traction control', false, NULL, 'esc'),
    ('Life', 'Tyre pressure monitoring', false, NULL, 'tyre_pressure_monitoring'),
    ('Life', 'ISOFIX on the rear outer seats', false, 'seats', NULL),
    ('Life', 'Cruise control with speed limiter', false, 'cruise', NULL),
    ('Life', 'Full LED headlights (LED Pure Vision)', false, 'headlights', NULL),
    ('Life', 'Rain and light sensor', false, 'light_rain_sensors', NULL),
    ('Life', '15-inch steel wheels', false, 'wheels', NULL),
    ('Life', 'Manual air conditioning', false, 'climate', NULL),
    ('Life', 'Heat pump', false, 'climate', NULL),
    ('Life', '10-inch digital instrument cluster', false, 'instruments', NULL),
    ('Life', 'Easy Link 7-inch multimedia system (a pack option from 2022)', false, 'infotainment', NULL),
    ('Life', 'Hands-free key card', false, 'locking', NULL),
    ('Life', 'Rear parking sensors', true, 'parking', 'reversing_detection'),
    ('Life', 'Winter pack: heated front seats and heated steering wheel', true, 'seat_comfort', NULL),
    ('Zen', 'Lane keeping assist with active steering correction', false, NULL, 'emergency_lane_keeping'),
    ('Zen', 'Blind-spot warning', false, NULL, 'blind_spot_monitoring'),
    ('Zen', '16-inch alloy wheels', false, 'wheels', NULL),
    ('Zen', 'Automatic high beam', false, 'headlights', NULL),
    ('Zen', 'Recycled-fabric (Recytex) upholstery', false, 'interior_trim', NULL),
    ('Zen', 'Faux-leather steering wheel', false, 'steering_wheel', NULL),
    ('Zen', 'Electric rear windows and 1/3-2/3 split rear seat', false, 'windows', NULL),
    ('Zen', 'Wireless smartphone charging (Intens only from 2022)', false, 'smartphone', NULL),
    ('Zen', 'Automatic climate control', true, 'climate', NULL),
    ('Zen', 'Front fog lights with cornering function', true, 'fog_lights', NULL),
    ('Intens', 'Traffic sign recognition with speed warning', false, NULL, 'isa'),
    ('Intens', 'Front and rear parking sensors with reversing camera', false, 'parking', 'reversing_detection'),
    ('Intens', 'Automatic climate control', false, 'climate', NULL),
    ('Intens', 'Front LED fog lights with cornering function', false, 'fog_lights', NULL),
    ('Intens', 'Easy Link navigation with 9.3-inch screen (2020; 7-inch navigation from 2022)', false, 'infotainment', NULL),
    ('Intens', 'Black diamond-cut 16-inch alloy wheels (17-inch optional)', false, 'wheels', NULL),
    ('Intens', 'Electrically folding heated mirrors and dark-tinted rear windows', false, 'mirrors', NULL),
    ('Intens', 'Bose audio', true, 'sound', NULL),
    ('Intens', 'Easy Park Assist: front, rear and side sensors with automatic steering', true, 'parking', 'parking_assist')
  )
  INSERT INTO public.catalog_trim_features (trim_id, feature, is_optional, feature_group, safety_feature_slug)
  SELECT t.id, v.feature, v.is_optional::boolean, v.feature_group::text, v.safety_feature_slug::text
    FROM v JOIN public.catalog_trims t ON t.phase_id = pid AND t.name = v.trim_name;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 34 THEN RAISE EXCEPTION 'Expected 34 new Phase 2 trim features, inserted % -- rolled back', n; END IF;

  -- Post-checks.
  SELECT count(*) INTO n FROM public.catalog_trims WHERE phase_id = pid AND name IN ('Life', 'Zen', 'Intens');
  IF n <> 3 THEN RAISE EXCEPTION 'Post-check: expected trims Life / Zen / Intens, found % -- rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_trims WHERE phase_id = pid;
  IF n <> 3 THEN RAISE EXCEPTION 'Post-check: expected 3 Phase 2 trims, found % -- rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_trim_features f JOIN public.catalog_trims t ON t.id = f.trim_id
   WHERE t.phase_id = pid AND f.feature_group IS NULL AND f.safety_feature_slug IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION 'Post-check: % Phase 2 features without group or slug -- rolled back', n; END IF;
END $$;

COMMIT;
