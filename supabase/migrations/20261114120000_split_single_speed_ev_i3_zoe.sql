-- Split the shared 'generic:Single-speed EV' gearbox row into one row per car (Martin, 2026-11-14:
-- "separate and use two different gearboxes for each model, each with its own pros and cons").
--
-- WHY: the BMW i3 (I01, 6 configs, rear axle) and the Renault Zoe (Phase 2, 2 configs, front axle)
-- shared one generic bucket. They are physically different reducers (different maker, axle and
-- ratio), so any pros/cons/faults written on the shared row would wrongly show on the other car.
--
-- Naming: no verified manufacturer part code exists for either reducer, so both rows keep the
-- 'generic:' prefix with the car in brackets -- the same convention as the existing
-- 'generic:Single-speed EV (i5)' row. maker stays NULL: who actually builds each unit was not
-- verifiable (rule 7, NULL over invention). With a NULL maker the rule-2c near-duplicate check
-- has nothing to group on, so no known-distinct-reference-groups.json entry is needed.
--
-- Sources:
--   [BMW-TD]  BMW U.S. press technical data, 2018 BMW i3 / i3s: transmission "automatic,
--             single-speed with fixed ratio", ratio 9.665 (press.bmwgroup.com).
--   [SI-B27]  BMW Technical Service SI B27 01 14 (May 2014), model I01 (i3 and i3 REx),
--             "Parking Lock Cannot Be Engaged or Disengaged" -- cause: "Internal failure of the
--             park lock actuator" or "Software error"; remedy: replace the parking lock module
--             (27 21 7 645 837) or reprogram (static.nhtsa.gov/odi/tsbs/2014/MC-10148311-9999.pdf).
--   [BMW-CBS] BMW i3 CBS maintenance schedules (bmwtechinfo.bmwgroup.com): no reducer oil
--             change listed. Aftermarket sources recommend a preventive change anyway.
--   [Zoe-oil] speakev.com owner threads: reducer oil change "isn't something Renault put in the
--             service schedule"; parts retailers quote 50 000-80 000 km, 0.6-0.85 l 75W-80.
--             Retailer figures disagree with each other -> no service_interval_km stored.
--
-- Deliberately NOT stored:
--   * Zoe reducer faults: nothing documented for the reducer itself. The bearing wear / whine
--     owners report on the R110/R135 is in the electric MOTOR (an engine-side fault, if anyone
--     sources it properly), not this gearbox -- rule 9 in reverse.
--   * Zoe gear ratio: no source quoted beyond hearsay.
--   * Reliability: i3 drops from the generic 5 to 4 because of the documented parking-lock
--     bulletin; Zoe keeps the generic 5. Both are judgement calls -- change before running if
--     you disagree.
--
-- The old 'generic:Single-speed EV' row is left in place with 0 configurations (no DELETE here).
--
-- INSERT + UPDATE: human-run, in a FRESH SQL editor tab (rule 6). Count-guarded throughout;
-- any mismatch raises and rolls everything back.

BEGIN;

-- 1. New gearbox rows (additive reference data).
INSERT INTO public.transmission_units
  (code, family, maker, speeds, alt_codes, reliability_rating, reliability_note, maintenance_note, pros, cons)
SELECT 'generic:Single-speed EV (i3 I01)', 'single_speed', NULL, 1, NULL, 4,
       'Single-speed reduction gearbox for the rear-mounted motor, fixed 9.665:1 ratio. One fixed gear, no clutch or torque converter, so there is no conventional gearbox wear. The documented weak point is the electro-mechanical parking lock: BMW bulletin SI B27 01 14 (2014) covers a parking-lock actuator that may not engage or release Park, fixed by a new parking-lock module or a software update.',
       'BMW''s service schedule lists no reducer oil change (filled for life). Specialists suggest a preventive oil change at high mileage. No clutch, filter or converter to service.',
       ARRAY[
         'No clutch, torque converter or gear changes -- nothing that wears like a conventional gearbox',
         'Fixed 9.665:1 reduction -- smooth, uninterrupted acceleration',
         'No scheduled reducer oil change in BMW''s service plan'
       ]::text[],
       ARRAY[
         'Electro-mechanical parking lock can fail to engage or release Park (BMW bulletin SI B27 01 14)',
         'BMW specifies no oil change, so the reducer oil is never refreshed unless the owner asks'
       ]::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.transmission_units WHERE code = 'generic:Single-speed EV (i3 I01)');

INSERT INTO public.transmission_units
  (code, family, maker, speeds, alt_codes, reliability_rating, reliability_note, maintenance_note, pros, cons)
SELECT 'generic:Single-speed EV (Zoe Ph2)', 'single_speed', NULL, 1, NULL, 5,
       'Single-speed reduction gear and differential on the front axle, driven by the R110/R135 motor. One fixed gear, no clutch or torque converter. No documented fault pattern was found for the reducer itself.',
       'Renault''s service schedule includes no reducer oil change. Owners and dealers disagree: parts suppliers quote a change every 50,000-80,000 km (about 0.6-0.85 l of 75W-80), some dealers only on request. No clutch, filter or converter to service.',
       ARRAY[
         'No clutch, torque converter or gear changes -- nothing that wears like a conventional gearbox',
         'Simple layout: one reduction gear plus the differential'
       ]::text[],
       ARRAY[
         'No reducer oil change in Renault''s service schedule -- recommended intervals from other sources disagree'
       ]::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.transmission_units WHERE code = 'generic:Single-speed EV (Zoe Ph2)');

DO $$
DECLARE n int;
BEGIN
  IF (SELECT count(*) FROM public.transmission_units
       WHERE code IN ('generic:Single-speed EV (i3 I01)', 'generic:Single-speed EV (Zoe Ph2)')) <> 2 THEN
    RAISE EXCEPTION 'New i3/Zoe gearbox rows missing after insert -- rolled back';
  END IF;

  -- 2. Move the i3's 6 configurations off the shared row.
  UPDATE public.catalog_vehicle_configurations c
     SET unit_id = (SELECT id FROM public.transmission_units WHERE code = 'generic:Single-speed EV (i3 I01)')
    FROM public.catalog_phases p, public.catalog_models m, public.catalog_brands b
   WHERE p.id = c.phase_id AND m.id = p.model_id AND b.id = m.brand_id
     AND b.name = 'BMW' AND m.name = 'i3' AND p.generation_code = 'I01'
     AND c.unit_id = (SELECT id FROM public.transmission_units WHERE code = 'generic:Single-speed EV');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'Expected 6 i3 configs on generic:Single-speed EV, moved % -- rolled back', n; END IF;

  -- 3. Move the Zoe's 2 configurations off the shared row.
  UPDATE public.catalog_vehicle_configurations c
     SET unit_id = (SELECT id FROM public.transmission_units WHERE code = 'generic:Single-speed EV (Zoe Ph2)')
    FROM public.catalog_phases p, public.catalog_models m, public.catalog_brands b
   WHERE p.id = c.phase_id AND m.id = p.model_id AND b.id = m.brand_id
     AND b.name = 'Renault' AND m.name = 'Zoe' AND p.phase_label = 'Phase 2'
     AND c.unit_id = (SELECT id FROM public.transmission_units WHERE code = 'generic:Single-speed EV');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 Zoe configs on generic:Single-speed EV, moved % -- rolled back', n; END IF;

  -- The shared row must now be unused -- otherwise some other car was on it that this file didn't plan for.
  IF (SELECT count(*) FROM public.catalog_vehicle_configurations
       WHERE unit_id = (SELECT id FROM public.transmission_units WHERE code = 'generic:Single-speed EV')) <> 0 THEN
    RAISE EXCEPTION 'generic:Single-speed EV still has configurations after the split -- rolled back';
  END IF;

  -- 4. i3 gearbox fault: the parking lock bulletin [SI-B27]. Severity moderate: the car shows
  --    "Drive Faulty" and may not go into or out of Park; fixed with a module or a software update.
  INSERT INTO public.catalog_component_faults (component_type, unit_id, fault, severity, pre_purchase_check)
  SELECT 'transmission', t.id,
         'Parking lock actuator may fail to engage or release Park -- the gear selector flashes "N" or "P" with a "Drive Faulty" / "Secure vehicle against rolling away" message. Cause: internal actuator failure or a software error (BMW bulletin SI B27 01 14); fixed by a new parking-lock module or a software update.',
         'moderate',
         'Shift between P, R and D several times; the selector must not flash and no drive-fault message may appear. Ask for an EME fault-memory read-out (codes 222D25 / 222D26 / 222D29).'
    FROM public.transmission_units t
   WHERE t.code = 'generic:Single-speed EV (i3 I01)'
     AND NOT EXISTS (SELECT 1 FROM public.catalog_component_faults x
                      WHERE x.unit_id = t.id AND x.fault LIKE 'Parking lock actuator may fail%');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 i3 parking-lock fault, inserted % -- rolled back', n; END IF;
END $$;

COMMIT;
