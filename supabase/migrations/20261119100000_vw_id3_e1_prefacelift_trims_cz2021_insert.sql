-- VW ID.3 (E1) Pre-facelift: trims Pure / Pro / Pro S from the Volkswagen ČR price list "Ceník, technická data a rozměry
-- modelu ID.3", "Platnost od 16.07.2021" (dealer copy autotrendliberec.cz, Internet Archive 2022-01-20) -- evidence E36 in
-- docs/intake/research/vw-id3-e1-completion.md, decision X9 (Martin 2026-11-19: "CZ lines, drop Easy").
--
-- In that list the "Linie" is tied to the battery: Pure = ID.3 Pure Performance 110 kW / 45 kWh; Pro = Pro 107 kW and Pro
-- Performance 150 kW / 58 kWh; Pro S = Pro S 150 kW / 77 kWh, 4- or 5-seat. Features: "●" = standard, "○" = option, read
-- with `pdftotext -table` (marks aligned per row). Higher tiers list only what they add (i3 / Zoe convention). Charging
-- hardware (DC 50 / 100 / 125 kW, AC 7.2 / 11 kW) is not a trim feature -- it lives on the engine rows.
-- Pro adds nothing but the battery and charging, so the Pro trim has no feature rows of its own (it inherits Pure).
-- Heat pump: standard on all three CZ lines (decision X10: trim feature only; the EBJ engine rows stay 'optional').
--
-- The old Pre-facelift trim "Easy" (Slovenská sporiteľňa fleet configuration 10/2022) is removed by the separate
-- DELETE file 20261119100500 -- Martin runs that one, after this INSERT.
--
-- Additive INSERT only. May run via the Supabase MCP after Martin has reviewed this file.

BEGIN;

DO $$
DECLARE n int; pre uuid;
BEGIN
  SELECT p.id INTO pre FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'ID.3' AND p.phase_label = 'Pre-facelift' AND p.generation_code = 'E1';
  IF pre IS NULL THEN RAISE EXCEPTION 'ID.3 (E1) Pre-facelift phase not found -- rolled back'; END IF;
  SELECT count(*) INTO n FROM public.catalog_trims WHERE phase_id = pre AND name IN ('Pure', 'Pro', 'Pro S');
  IF n <> 0 THEN RAISE EXCEPTION 'Pre-facelift already has % of the trims Pure / Pro / Pro S -- rolled back', n; END IF;

  INSERT INTO public.catalog_trims (phase_id, name, tier)
  VALUES (pre, 'Pure', '1'), (pre, 'Pro', '2'), (pre, 'Pro S', '3');

  WITH v(trim_name, feature, is_optional, feature_group, safety_feature_slug) AS (VALUES
    -- Pure: standard
    ('Pure'::text, 'Driver and passenger airbags (passenger can be switched off), front side airbags, head airbags, front centre airbag'::text, false, 'airbags'::text, 'airbags'::text),
    ('Pure', 'Adaptive cruise control (ACC) with stop & go and predictive function', false, 'cruise', 'adaptive_cruise_control'),
    ('Pure', 'Front Assist with automatic braking and pedestrian / cyclist detection; turn assist stops the car for oncoming traffic when turning left', false, NULL, 'aeb'),
    ('Pure', 'Lane Assist', false, NULL, 'emergency_lane_keeping'),
    ('Pure', 'Driver fatigue detection', false, NULL, 'driver_drowsiness_attention_warning'),
    ('Pure', 'Seat-belt warning for the front and rear seats', false, NULL, 'seatbelt_reminders'),
    ('Pure', 'Traffic-sign recognition (camera)', false, 'instruments', NULL),
    ('Pure', 'Indirect tyre pressure monitoring', false, NULL, 'tyre_pressure_monitoring'),
    ('Pure', 'Park Pilot front and rear parking sensors', false, 'parking', 'reversing_detection'),
    ('Pure', 'LED headlights with automatic high beam, LED tail lights', false, 'headlights', NULL),
    ('Pure', 'Single-zone air conditioning', false, 'climate', NULL),
    ('Pure', 'Heat pump', false, 'climate', NULL),
    ('Pure', 'Discover Pro navigation, 10-inch touchscreen, voice control, DAB+, Streaming & Internet', false, 'infotainment', NULL),
    ('Pure', 'App-Connect wireless: Apple CarPlay and Android Auto', false, 'smartphone', NULL),
    ('Pure', 'Phone interface Comfort with wireless charging; 2 USB-C ports in front', false, 'smartphone', NULL),
    ('Pure', 'ID. Display 5.3-inch digital instruments and ID. Light strip', false, 'instruments', NULL),
    ('Pure', 'Keyless Start', false, 'locking', NULL),
    ('Pure', 'Ambient lighting, 10 colours', false, 'ambient_lighting', NULL),
    ('Pure', 'Electrically adjustable, heated mirrors in body colour', false, 'mirrors', NULL),
    ('Pure', 'Rain sensor; manually dimming interior mirror', false, 'light_rain_sensors', NULL),
    ('Pure', 'Front armrests', false, 'armrests', NULL),
    ('Pure', 'Height-adjustable driver''s seat', false, 'seat_adjustment', NULL),
    ('Pure', 'Multifunction steering wheel with touch controls, adjustable for height and reach', false, 'steering_wheel', NULL),
    ('Pure', 'ISOFIX on the front passenger seat and the rear outer seats', false, 'seats', NULL),
    ('Pure', 'Tinted heat-insulating side and rear windows', false, 'windows', NULL),
    ('Pure', 'Fabric upholstery "Fragment", fabric door trims', false, 'interior_trim', NULL),
    ('Pure', '18-inch steel wheels, 215/55 R18, with Tire Mobility Set', false, 'wheels', NULL),
    -- Pure: options (also available on Pro; Pro S has its own versions of the comfort packs)
    ('Pure', 'Assistance pack: reversing camera, Keyless Advanced, alarm, PreCrash', true, 'parking', NULL),
    ('Pure', 'Assistance Plus pack: Travel Assist with lane centring, Emergency Assist, electrically folding mirrors', true, 'cruise', 'lane_centering'),
    ('Pure', 'Side Assist lane-change warning (Assistance Plus pack)', true, NULL, 'blind_spot_monitoring'),
    ('Pure', 'Area View 360° cameras (Assistance Plus pack with IQ.LED design)', true, 'parking', 'camera_360'),
    ('Pure', 'IQ.Light LED matrix headlights, animated LED tail lights, tinted rear windows (IQ.LED Design pack)', true, 'headlights', 'adaptive_matrix_headlights'),
    ('Pure', 'Head-up display with acoustic windscreen and 6+1 speakers (Infotainment Plus pack)', true, 'instruments', 'head_up_display'),
    ('Pure', 'Heated front seats and heated washer jets (Comfort pack)', true, 'seat_comfort', NULL),
    ('Pure', 'Two-zone Climatronic and height-adjustable boot floor (Comfort Plus pack)', true, 'climate', NULL),
    ('Pure', 'Adaptive dampers DCC with progressive steering (Sport Plus pack)', true, 'suspension', NULL),
    ('Pure', '18-inch "East Derry" or 19-inch "Andoya" alloy wheels', true, 'wheels', NULL),
    -- Pro S: what it adds over Pure / Pro
    ('Pro S', '19-inch alloy wheels "Andoya", 215/50 R19, locking wheel bolts', false, 'wheels', NULL),
    ('Pro S', 'Heated leather multifunction steering wheel with touch controls', false, 'steering_wheel', NULL),
    ('Pro S', 'Ambient lighting, 30 colours', false, 'ambient_lighting', NULL),
    ('Pro S', 'Fabric upholstery "Flow", faux-leather door and side trims', false, 'interior_trim', NULL),
    ('Pro S', 'Stainless-steel pedals "Play" / "Pause"', false, 'interior_trim', NULL),
    ('Pro S', 'Both front seats height-adjustable', false, 'seat_adjustment', NULL),
    ('Pro S', '4-seat version: two rear seats with a centre armrest (a 5-seat version with a rear bench was also sold)', false, 'seats', NULL),
    ('Pro S', 'ergoActive massage front seats, heated (Style Plus interior pack)', true, 'seat_comfort', NULL),
    ('Pro S', '20-inch alloy wheels "Sanya", 215/45 R20', true, 'wheels', NULL)
  )
  INSERT INTO public.catalog_trim_features (trim_id, feature, is_optional, feature_group, safety_feature_slug)
  SELECT t.id, v.feature, v.is_optional::boolean, v.feature_group::text, v.safety_feature_slug::text
    FROM v JOIN public.catalog_trims t ON t.phase_id = pre AND t.name = v.trim_name;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 46 THEN RAISE EXCEPTION 'Expected 46 trim features, inserted % -- rolled back', n; END IF;
END $$;

COMMIT;
