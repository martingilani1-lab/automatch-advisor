-- Two schema changes for "safety equipment in the Trims tab, clickable through to NCAP" (Martin,
-- 2026-10-26):
--
-- 1. safety_features gets a third category, 'basic', for the passive/fundamental safety equipment
--    every car of the catalog era has in some form and that trims list explicitly -- ABS, ESC (VW's
--    "ESP"), airbags -- so the NCAP tab can explain them the same way it explains the 17 assists,
--    and the Trims tab has something to link them to. 3 new rows. This deliberately widens the
--    "frozen 17" vocabulary (20260824090000) by an explicit, reviewed decision; content mirrored in
--    scripts/safety-features-content.md (Section 3) in the same commit. gsr2 = false for all three
--    (safety_features_check ties gsr2 to category = 'gsr2_mandated'). vehicle_safety_features'
--    own 8-slug CHECK is untouched -- 'basic' rows are never per-legacy-car tags.
--
-- 2. catalog_trim_features.safety_feature_slug: optional FK to safety_features(slug) -- "this trim
--    feature IS that safety system". Presence-only in spirit: NULL = not a safety system (or not
--    linked yet), never a negative claim. The fill is a separate file (20261026220500).
--
-- Schema change: review-only, NOT run by this session. Run in a FRESH Supabase SQL editor tab,
-- BEFORE 20261026220500.

BEGIN;

ALTER TABLE safety_features DROP CONSTRAINT safety_features_category_check;
ALTER TABLE safety_features ADD CONSTRAINT safety_features_category_check
  CHECK (category IN ('gsr2_mandated', 'beyond_baseline', 'basic'));

INSERT INTO safety_features (slug, universal_name, category, marketing_names, what_it_does, how_it_works, sensors_used, how_to_disable, gsr2) VALUES
  ('abs', 'Anti-lock Braking System', 'basic', ARRAY['ABS'],
   'Stops the wheels from locking under hard braking, so the car can still be steered while braking at full force.',
   'A speed sensor on each wheel reports how fast it is turning. When one wheel slows much faster than the car itself -- about to lock -- the ABS unit briefly releases and re-applies that wheel''s brake pressure, many times per second. The driver feels this as pulsing in the brake pedal; it is normal, keep pressing hard.',
   'Wheel-speed sensors on all four wheels, plus the ABS hydraulic unit with its own control module.',
   'Cannot be switched off. A lit ABS warning light means the system is off due to a fault -- normal braking still works, but wheels can lock.'),
  ('esc', 'Electronic Stability Control', 'basic', ARRAY['ESP', 'ESC', 'DSC', 'VSC'],
   'Keeps the car pointing where the driver steers when it starts to skid -- understeer or oversteer -- by braking individual wheels and cutting engine power.',
   'It compares where the driver is steering with where the car is actually going. If they differ (the car is starting to slide), it brakes one or more individual wheels to pull the car back on line and can reduce engine torque. Built on top of ABS and includes traction control. Mandatory on all new cars in the EU since November 2014.',
   'Steering-angle sensor, yaw-rate and lateral-acceleration sensors, and the four ABS wheel-speed sensors.',
   'Usually partly switchable via an "ESC OFF" / "ASR OFF" button (mainly the traction-control part, for driving on snow or sand); it switches back on at the next engine start. Full deactivation is normally not possible on road cars.'),
  ('airbags', 'Airbags', 'basic', ARRAY['SRS', 'Front airbags', 'Side airbags', 'Curtain airbags'],
   'Inflates cushions in a crash to stop the occupants hitting the steering wheel, dashboard, doors or side windows.',
   'Crash sensors measure deceleration; if it exceeds the deployment threshold, the airbag control unit fires a gas generator that inflates the bag in a few hundredths of a second, before the occupant moves forward or sideways. Front airbags protect in frontal impacts; side (seat) and curtain airbags protect the chest and head in side impacts. Works together with the seatbelts -- an airbag is designed for a belted occupant.',
   'Front and side crash sensors and the airbag control unit (often with a passenger-seat occupancy sensor).',
   'The front passenger airbag can usually be switched off with a key switch or menu setting, so a rear-facing child seat can be used there. All other airbags cannot be switched off.');

ALTER TABLE catalog_trim_features ADD COLUMN safety_feature_slug text REFERENCES safety_features(slug);

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM safety_features;
  IF n <> 20 THEN RAISE EXCEPTION 'Expected 20 safety_features rows (17 + 3 basic), found %', n; END IF;
END $$;

COMMIT;
