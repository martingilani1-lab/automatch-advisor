-- Links existing catalog_trim_features rows to their safety_features entry (column added by
-- 20261026220000), by exact feature name -- 90 rows, all names read from the live table 2026-10-26:
--   abs                        ABS (9)
--   esc                        ESP (7)
--   airbags                    every feature_group = 'airbags' row (11: Driver airbag, Dual front
--                              and side airbags, 4x airbags, ...)
--   aeb                        Front Assist (21) -- VW group's name for its AEB system
--   emergency_lane_keeping     Lane Assist (8) -- intervenes at the lane edge only
--   driver_drowsiness_attention_warning  Driver fatigue detection (1)
--   adaptive_cruise_control    Adaptive cruise control (ACC) (1)
--   lane_centering             Travel Assist (2) -- ACC + active lane centering; linked to lane
--                              centering, which is what separates it from plain Lane Assist (ACC is
--                              tracked as its own feature) -- agreed with Martin 2026-10-26
--   adaptive_matrix_headlights IQ.LIGHT / Matrix LED headlights (12) + Bi-Xenon with cornering
--                              light (AFS) (1)
--   parking_assist             Park Assist / Park Assist Plus (3)
--   reversing_detection        Rear / front-and-rear / plain parking sensors (14)
-- Guarded: exactly 90 rows linked, none of them previously linked.
-- UPDATE of existing data: review-only, NOT run by this session. Run in a FRESH Supabase SQL tab,
-- AFTER 20261026220000.

BEGIN;

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM catalog_trim_features WHERE safety_feature_slug IS NOT NULL;
  IF n <> 0 THEN RAISE EXCEPTION 'Expected no linked rows yet, found %', n; END IF;
END $$;

UPDATE catalog_trim_features SET safety_feature_slug = CASE
  WHEN feature = 'ABS' THEN 'abs'
  WHEN feature = 'ESP' THEN 'esc'
  WHEN feature_group = 'airbags' THEN 'airbags'
  WHEN feature = 'Front Assist' THEN 'aeb'
  WHEN feature = 'Lane Assist' THEN 'emergency_lane_keeping'
  WHEN feature = 'Driver fatigue detection' THEN 'driver_drowsiness_attention_warning'
  WHEN feature = 'Adaptive cruise control (ACC)' THEN 'adaptive_cruise_control'
  WHEN feature IN ('Travel assist', 'Travel Assist') THEN 'lane_centering'
  WHEN feature IN ('IQ.LIGHT LED matrix headlights', 'IQ.LIGHT matrix LED', 'IQ.LIGHT matrix LED headlights',
                   'LED matrix headlights', 'LED Matrix headlights', 'Matrix LED headlights',
                   'Bi-Xenon headlights with cornering (AFS)') THEN 'adaptive_matrix_headlights'
  WHEN feature IN ('Park assist', 'Park assist plus', 'Park Assist Plus') THEN 'parking_assist'
  WHEN feature IN ('Rear parking sensors', 'Front and rear parking sensors', 'Front/rear parking sensors',
                   'Parking sensors') THEN 'reversing_detection'
END
WHERE feature IN ('ABS', 'ESP', 'Front Assist', 'Lane Assist', 'Driver fatigue detection',
                  'Adaptive cruise control (ACC)', 'Travel assist', 'Travel Assist',
                  'IQ.LIGHT LED matrix headlights', 'IQ.LIGHT matrix LED', 'IQ.LIGHT matrix LED headlights',
                  'LED matrix headlights', 'LED Matrix headlights', 'Matrix LED headlights',
                  'Bi-Xenon headlights with cornering (AFS)', 'Park assist', 'Park assist plus',
                  'Park Assist Plus', 'Rear parking sensors', 'Front and rear parking sensors',
                  'Front/rear parking sensors', 'Parking sensors')
   OR feature_group = 'airbags';

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM catalog_trim_features WHERE safety_feature_slug IS NOT NULL;
  IF n <> 90 THEN RAISE EXCEPTION 'Expected 90 linked rows, found %', n; END IF;
END $$;

COMMIT;
