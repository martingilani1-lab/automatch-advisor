-- Škoda Citigo (AA) TOP-UP: brings the live rows to the reviewed state of 20261120210000_seed_skoda_citigo_aa.sql
-- (commit 270a7b0; values from scripts/seed-data/skoda-citigo-aa/*.csv, Martin's items 1-7 and M1-M5, 2026-11-20).
--
-- WHY: the file that actually ran is the 09adba7 seed trio 20261120190000 / 20261120190500 / 20261120191000 (read
-- back via MCP 2026-11-20: e iV market NULL, faults without costs, spark plugs on four engine rows, MQ100 with the
-- extra pro "Simple cable-shift manual", engines at 15 000 km / 12 months with no yearly maintenance). 20261120210000
-- never ran and must not run now (its guards would stop it: the Citigo model exists).
--
-- Diff against the live rows (read 2026-11-20), and what this file does:
--   A. ADDITIVE INSERTs (8 fault rows):
--      - CNG tank / valve corrosion on CPGA-Euro5@50 (2013-15), CPGA@50 (2015-18), CPGA-Euro6dT@50 (2018-19)  (item 1)
--      - front exhaust pipe with catalytic converter on the 3 Euro 5 rows, 450-1 450 EUR                     (cost 3b)
--      - ASG gear-selector module 0CT311097E, 950-1 050 EUR                                                   (cost 4b)
--      - spark plugs as a Pre-facelift VEHICLE row, electrical, 2012-2016, 40-75 EUR                          (M5)
--      - rear drum brake shoes on Pre-facelift and Facelift, 100-160 EUR                                      (cost 8b)
--      => 3 + 3 + 1 + 1 + 2 = 10 rows.
--   B. UPDATEs of rows this import created (no other model's rows are touched):
--      - catalog_phases AA-iV: market 10 999 / 12 260 / 14 900 EUR, 18,150 - 164,920 km                     (M2)
--      - 7 new combustion engines: Škoda service interval 30 000 km / 12 months, yearly maintenance petrol
--        100-140 / CNG 140-190 EUR, maintenance_note; EBM-32kWh maintenance_note (brake fluid)                  (maintenance)
--      - VW SQ100 reliability_note / cons wording (actuator / selector module / clutch); VW MQ100 pros without
--        the unsourced "Simple cable-shift manual". Both rows are used only by the Citigo today (guarded).    (R2)
--      - faults: starter 70-210 + text (2); exhaust -> rear silencer 80-150 + text (3a); J497 text (3); ASG
--        actuator 250-400 + text (4a); ASG clutch + flywheel 720-810 (5); parking brake 70-150 (7); "Brake pads
--        and rear drums" / "Brake pads" -> front pads + discs 140-245, years NULL (8a); wiring harness text /
--        years NULL / 70-130 / check (6, cost 9); lighting 25-40 (10); water 20-200 (11); Takata 69KH / 69PB /
--        69PC and 93J5 pre_purchase_check -> "Verify recall(s) ... (VIN check at a Škoda dealer)" (R6, item 2)
--   C. DELETE: the 4 spark-plug ENGINE rows (CHYA-Euro5, CHYB-Euro5, CPGA-Euro5, CPGA) -- replaced by the vehicle
--      row in A (M5).
-- Deliberately KEPT (differs from 20261120210000): the three Takata rows stay separate (69KH, 69PB, 69PC -- R6 allowed
-- "one fault row or combined"), and the four other live recall rows (airbag ECU 05/2013, child lock 2015-16, sunroof
-- panel 2016, towing eye 2017) stay -- they are sourced recalls Martin's list did not mention; delete them only on his
-- word. Recall rows keep cost NULL (cost CHECK forbids 0). Engine pros / cons wording differences are cosmetic and
-- not touched.
--
-- UPDATE + DELETE of existing rows: HUMAN-RUN ONLY (Martin), fresh SQL editor tab. One transaction; every statement
-- checks its row count and rolls the whole file back on any mismatch. Nothing here was executed by Claude.

BEGIN;

DO $$
DECLARE n int; mid uuid; pf uuid; fl uuid; iv uuid; u_asg uuid; u_mt uuid;
BEGIN
  SELECT m.id INTO mid FROM public.catalog_models m JOIN public.catalog_brands b ON b.id = m.brand_id
   WHERE b.name = 'Škoda' AND m.name = 'Citigo';
  SELECT id INTO pf FROM public.catalog_phases WHERE model_id = mid AND generation_code = 'AA' AND phase_label = 'Pre-facelift';
  SELECT id INTO fl FROM public.catalog_phases WHERE model_id = mid AND generation_code = 'AA' AND phase_label = 'Facelift';
  SELECT id INTO iv FROM public.catalog_phases WHERE model_id = mid AND generation_code = 'AA-iV' AND phase_label = 'Facelift';
  SELECT id INTO u_asg FROM public.transmission_units WHERE code = 'VW SQ100';
  SELECT id INTO u_mt FROM public.transmission_units WHERE code = 'VW MQ100';
  IF pf IS NULL OR fl IS NULL OR iv IS NULL OR u_asg IS NULL OR u_mt IS NULL THEN
    RAISE EXCEPTION 'Citigo phases or gearbox rows missing -- the seed has not run as expected; rolled back';
  END IF;

  -- Guard: the live state is the 09adba7 seed (31 faults incl. 4 spark-plug engine rows; e iV market NULL).
  SELECT count(*) INTO n FROM public.catalog_component_faults f
   WHERE f.phase_id IN (pf, fl, iv) OR f.unit_id = u_asg
      OR f.engine_id IN (SELECT id FROM public.catalog_engines
                          WHERE code IN ('CHYA-Euro5','CHYA-Euro6dT','CHYB-Euro5','CHYB-Euro6dT','CPGA-Euro5','CPGA','CPGA-Euro6dT','EBM-32kWh'));
  IF n <> 31 THEN RAISE EXCEPTION 'Expected 31 live Citigo faults (09adba7 seed), found % -- re-read before running; rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_phases WHERE id = iv AND price_range_min_eur IS NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'e iV market already set -- re-read before running; rolled back'; END IF;
  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations c
   WHERE c.unit_id IN (u_asg, u_mt) AND c.phase_id NOT IN (pf, fl, iv);
  IF n <> 0 THEN RAISE EXCEPTION 'VW SQ100 / MQ100 now used by % non-Citigo configurations -- re-check R2; rolled back', n; END IF;

  ---------------------------------------------------------------------------------------------------------------------
  -- A. ADDITIVE INSERTs
  INSERT INTO public.catalog_component_faults
    (component_type, engine_id, fault, severity, annual_probability, estimated_cost_eur_min, estimated_cost_eur_max,
     affected_year_from, affected_year_to, pre_purchase_check)
  SELECT 'engine', e.id, v.fault, v.sev, v.p::numeric, v.c1::integer, v.c2::integer, v.y1::integer, v.y2::integer, v.chk
    FROM (VALUES
      ('CPGA-Euro5', 50, 'CNG tank / valve corrosion found at the gas-system inspection (steel tanks under the floor, gibgas.de: Erdgastank Stahl, Unterflur).', 'moderate', 0.002, NULL, NULL, 2013, 2015, 'Inspect CNG tank surface and valve seats for corrosion; ask for the last gas-system inspection record.'),
      ('CPGA',       50, 'CNG tank / valve corrosion found at the gas-system inspection (steel tanks under the floor, gibgas.de: Erdgastank Stahl, Unterflur).', 'moderate', 0.002, NULL, NULL, 2015, 2018, 'Inspect CNG tank surface and valve seats for corrosion; ask for the last gas-system inspection record.'),
      ('CPGA-Euro6dT', 50, 'CNG tank / valve corrosion found at the gas-system inspection (steel tanks under the floor, gibgas.de: Erdgastank Stahl, Unterflur).', 'moderate', 0.002, NULL, NULL, 2018, 2019, 'Inspect CNG tank surface and valve seats for corrosion; ask for the last gas-system inspection record.'),
      ('CHYA-Euro5', 44, 'Front exhaust pipe with catalytic converter fails on early cars (ADAC: early exhaust systems prone to defects).', 'moderate', 0.002, 450, 1450, 2012, 2014, 'Check the exhaust for leaks and the engine-light / emissions result.'),
      ('CHYB-Euro5', 55, 'Front exhaust pipe with catalytic converter fails on early cars (ADAC: early exhaust systems prone to defects).', 'moderate', 0.002, 450, 1450, 2012, 2014, 'Check the exhaust for leaks and the engine-light / emissions result.'),
      ('CPGA-Euro5', 50, 'Front exhaust pipe with catalytic converter fails on early cars (ADAC: early exhaust systems prone to defects).', 'moderate', 0.002, 450, 1450, 2013, 2014, 'Check the exhaust for leaks and the engine-light / emissions result.')
    ) AS v(code, kw, fault, sev, p, c1, c2, y1, y2, chk)
    JOIN public.catalog_engines e ON e.code = v.code AND e.power_kw = v.kw;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'A: expected 6 engine fault inserts, got % -- rolled back', n; END IF;

  INSERT INTO public.catalog_component_faults
    (component_type, unit_id, fault, severity, annual_probability, estimated_cost_eur_min, estimated_cost_eur_max,
     affected_year_from, affected_year_to, pre_purchase_check)
  VALUES ('transmission', u_asg,
          'ASG gear-selector module (0CT311097E) fails -- gears cannot be selected and the car loses drive; module replaced.',
          'critical', 0.005, 950, 1050, 2012, 2018, 'Read the gearbox fault memory; drive it through all gears and in reverse.');

  INSERT INTO public.catalog_component_faults
    (component_type, phase_id, category, fault, severity, annual_probability, estimated_cost_eur_min, estimated_cost_eur_max,
     affected_year_from, affected_year_to, pre_purchase_check)
  VALUES
    ('vehicle', pf, 'electrical',
     'Spark plugs fail -- misfire, rough running or a breakdown (ADAC breakdown statistics 2012-2016); new plugs, ignition coils checked (add 40-80 EUR per failed coil).',
     'minor', 0.02, 40, 75, 2012, 2016, 'Ask when the spark plugs were last replaced; check for misfire at idle.'),
    ('vehicle', pf, 'brakes',
     'Rear drum brake shoes (and wheel cylinders) wear (ADAC breakdowns: brake drums 2015 cars); shoes and cylinders replaced.',
     'minor', 0.2, 100, 160, NULL, NULL, 'Check the last brake service and the inspection report.'),
    ('vehicle', fl, 'brakes',
     'Rear drum brake shoes (and wheel cylinders) wear; shoes and cylinders replaced.',
     'minor', 0.2, 100, 160, NULL, NULL, 'Check the last brake service and the inspection report.');

  ---------------------------------------------------------------------------------------------------------------------
  -- B. UPDATEs (rows created by this import only)
  UPDATE public.catalog_phases SET price_range_min_eur = 10999, avg_market_price_eur = 12260, price_range_max_eur = 14900,
         typical_mileage_range = '18,150 - 164,920 km'
   WHERE id = iv;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'B: e iV market update hit % rows -- rolled back', n; END IF;

  UPDATE public.catalog_engines
     SET oil_change_interval_km = 30000, oil_change_interval_months = 12,
         yearly_maintenance_eur_min = CASE WHEN fuel_type = 'cng' THEN 140 ELSE 100 END,
         yearly_maintenance_eur_max = CASE WHEN fuel_type = 'cng' THEN 190 ELSE 140 END,
         maintenance_note = 'Škoda service: first basic service after 2 years / 30 000 km, then every 30 000 km or 1 year. Oil 3.4 l service fill (3.7 l dry). Timing belt: ADAC lists 210 000 km -- most likely the first inspection, replace on condition. Brake fluid first after 3 years, then every 2 years (owner''s manual).'
                            || CASE WHEN fuel_type = 'cng' THEN ' CNG system: tanks and pipes go through the national gas inspection.' ELSE '' END
   WHERE code IN ('CHYA-Euro5','CHYA-Euro6dT','CHYB-Euro5','CHYB-Euro6dT','CPGA-Euro5','CPGA','CPGA-Euro6dT');
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 7 THEN RAISE EXCEPTION 'B: engine maintenance update hit % rows -- rolled back', n; END IF;

  UPDATE public.catalog_engines
     SET maintenance_note = 'No oil, timing belt or spark plugs. Brake fluid first after 3 years, then every 2 years (owner''s manual); cabin filter and the 12 V battery per the Škoda service schedule. High-voltage battery warranty 8 years / 160 000 km (ŠA SK price list).'
   WHERE code = 'EBM-32kWh' AND power_kw = 61;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'B: EBM note update hit % rows -- rolled back', n; END IF;

  UPDATE public.transmission_units
     SET reliability_note = 'Automated version of the 0CF five-speed manual (Škoda SSP 093: SQ100-5F) with electromechanical clutch and gear actuators, in the Škoda Citigo / VW up! / SEAT Mii 1.0 MPI 44 and 55 kW (2012 - 2019). Owners report the car losing drive or falling out of gear with the gear warning lit; the usual fixes are a software update, the clutch actuator, the gear-selector module or a new clutch and flywheel. Shifts are slow and moving off is jerky (ADAC).',
         cons = ARRAY['Jerky moving off and very slow gear changes (ADAC)', 'Loss-of-drive faults reported by owners: actuator, selector module or clutch', 'No P position']::text[]
   WHERE id = u_asg;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'B: SQ100 update hit % rows -- rolled back', n; END IF;
  UPDATE public.transmission_units SET pros = ARRAY['Light and compact (about 27 kg)']::text[] WHERE id = u_mt;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'B: MQ100 update hit % rows -- rolled back', n; END IF;

  -- Engine faults.
  UPDATE public.catalog_component_faults f
     SET fault = 'Starter motor fails -- the engine will not crank (ADAC breakdown statistics: 2012 cars); starter replaced (used part 30-50 EUR or remanufactured; part no. 02M 911 021 G).',
         estimated_cost_eur_min = 70, estimated_cost_eur_max = 210
    FROM public.catalog_engines e
   WHERE f.engine_id = e.id AND e.code IN ('CHYA-Euro5','CHYB-Euro5','CPGA-Euro5') AND f.fault LIKE 'Starter motor fails%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 3 THEN RAISE EXCEPTION 'B: starter update hit % rows -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults f
     SET fault = 'Rear exhaust silencer rusts through on early cars (ADAC: anfällige Abgasanlage, nur frühe Exemplare).',
         estimated_cost_eur_min = 80, estimated_cost_eur_max = 150
    FROM public.catalog_engines e
   WHERE f.engine_id = e.id AND e.code IN ('CHYA-Euro5','CHYB-Euro5','CPGA-Euro5') AND f.fault LIKE 'Exhaust system defects on early cars%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 3 THEN RAISE EXCEPTION 'B: rear silencer update hit % rows -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults f
     SET fault = 'High-voltage battery controller (J497) fails -- "Electrical system fault, stop the vehicle" and the car is immobilised; the controller (sometimes wiring or modules) is replaced, under the 8-year battery warranty, often weeks off the road (e-up! / Mii / Citigo e owners, 2020). Repair requires opening the sealed HV battery pack (HV-certified workshop / dealer).'
    FROM public.catalog_engines e
   WHERE f.engine_id = e.id AND e.code = 'EBM-32kWh' AND f.fault LIKE 'High-voltage battery controller (J497)%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'B: J497 update hit % rows -- rolled back', n; END IF;

  -- Gearbox faults.
  UPDATE public.catalog_component_faults
     SET fault = 'ASG clutch actuator (0CT142056x) fails -- gear warning light, the car loses drive or falls out of gear; try the gearbox software update first, then a new actuator (fault P060C; BRISKODA owners, 2014-2015 cars).',
         estimated_cost_eur_min = 250, estimated_cost_eur_max = 400
   WHERE unit_id = u_asg AND fault LIKE 'ASG gear actuator, control unit or software fault%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'B: ASG actuator update hit % rows -- rolled back', n; END IF;
  UPDATE public.catalog_component_faults
     SET fault = 'ASG clutch and flywheel worn -- loss of drive with the engine warning light; clutch kit, flywheel and release bearing replaced.',
         estimated_cost_eur_min = 720, estimated_cost_eur_max = 810
   WHERE unit_id = u_asg AND fault LIKE 'ASG clutch and flywheel worn%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'B: ASG clutch update hit % rows -- rolled back', n; END IF;

  -- Vehicle faults.
  UPDATE public.catalog_component_faults
     SET fault = CASE WHEN phase_id = pf
                      THEN 'Mechanical parking brake fails -- cables or mechanism; a breakdown item in the ADAC statistics (2014-2016 cars); cables replaced.'
                      ELSE 'Mechanical parking brake fails -- cables or mechanism (ADAC breakdown list: 2017 and 2019 cars); cables replaced.' END,
         estimated_cost_eur_min = 70, estimated_cost_eur_max = 150
   WHERE phase_id IN (pf, fl) AND fault LIKE 'Mechanical parking brake fails%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 2 THEN RAISE EXCEPTION 'B: parking brake update hit % rows -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET fault = CASE WHEN phase_id = pf
                      THEN 'Front brake pads and discs wear -- reduced braking at the technical inspection (TÜV: funktionseingeschränkte Bremsen; ADAC breakdowns: pads); pads and discs replaced (pads only 60-100 EUR).'
                      ELSE 'Front brake pads and discs wear -- reduced braking at the technical inspection; pads and discs replaced (pads only 60-100 EUR).' END,
         estimated_cost_eur_min = 140, estimated_cost_eur_max = 245, affected_year_from = NULL, affected_year_to = NULL
   WHERE (phase_id = pf AND fault LIKE 'Brake pads and rear drums wear%') OR (phase_id = fl AND fault LIKE 'Brake pads wear%');
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 2 THEN RAISE EXCEPTION 'B: front pads + discs update hit % rows -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET fault = 'Wiring harness fault (location not specified by ADAC).', estimated_cost_eur_min = 70, estimated_cost_eur_max = 130,
         affected_year_from = NULL, affected_year_to = NULL,
         pre_purchase_check = 'Scan for electrical fault codes; check the wiring in the tailgate hinge gaiter.'
   WHERE phase_id = pf AND fault LIKE 'Wiring harness fault%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'B: wiring update hit % rows -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET fault = CASE WHEN phase_id = pf
                      THEN 'Lighting defects at the technical inspection -- bulbs, headlight aim (TÜV: Lichtmängel des öfteren); H4 bulbs replaced and aimed.'
                      ELSE 'Lighting defects at the technical inspection -- bulbs, headlight aim (TÜV); H4 bulbs replaced and aimed.' END,
         estimated_cost_eur_min = 25, estimated_cost_eur_max = 40
   WHERE phase_id IN (pf, fl) AND fault LIKE 'Lighting defects at the technical inspection%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 2 THEN RAISE EXCEPTION 'B: lighting update hit % rows -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET fault = 'Water in the footwells -- the drains of the gulley below the windscreen block with leaves; drain holes cleared and the carpets dried (BRISKODA owners).',
         estimated_cost_eur_min = 20, estimated_cost_eur_max = 200
   WHERE phase_id IN (pf, fl) AND fault LIKE 'Water in the footwells%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 2 THEN RAISE EXCEPTION 'B: water update hit % rows -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET pre_purchase_check = CASE WHEN phase_id = pf THEN 'Verify recalls 69KH / 69PB / 69PC are done (VIN check at a Škoda dealer).'
                                   ELSE 'Verify recall 69PC is done (VIN check at a Škoda dealer).' END
   WHERE phase_id IN (pf, fl) AND (fault LIKE 'Recall 69KH:%' OR fault LIKE 'Recall 69PB:%' OR fault LIKE 'Recall 69PC:%');
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 4 THEN RAISE EXCEPTION 'B: Takata check update hit % rows -- rolled back', n; END IF;

  UPDATE public.catalog_component_faults
     SET pre_purchase_check = 'Verify recall 93J5 is done (VIN check at a Škoda dealer).'
   WHERE phase_id = iv AND fault LIKE 'Recall 93J5:%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'B: 93J5 update hit % rows -- rolled back', n; END IF;

  ---------------------------------------------------------------------------------------------------------------------
  -- C. DELETE: spark plugs off the engine rows (M5 -- the vehicle row in A replaces them).
  DELETE FROM public.catalog_component_faults f
   USING public.catalog_engines e
   WHERE f.engine_id = e.id AND e.code IN ('CHYA-Euro5','CHYB-Euro5','CPGA-Euro5','CPGA') AND f.fault LIKE 'Spark plugs fail%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 4 THEN RAISE EXCEPTION 'C: spark-plug delete hit % rows -- rolled back', n; END IF;

  -- Post-check: 31 - 4 + 10 = 37 Citigo faults.
  SELECT count(*) INTO n FROM public.catalog_component_faults f
   WHERE f.phase_id IN (pf, fl, iv) OR f.unit_id = u_asg
      OR f.engine_id IN (SELECT id FROM public.catalog_engines
                          WHERE code IN ('CHYA-Euro5','CHYA-Euro6dT','CHYB-Euro5','CHYB-Euro6dT','CPGA-Euro5','CPGA','CPGA-Euro6dT','EBM-32kWh'));
  IF n <> 37 THEN RAISE EXCEPTION 'Post-check: expected 37 Citigo faults, found % -- rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_component_faults f
   WHERE (f.phase_id IN (pf, fl, iv) OR f.unit_id = u_asg OR f.engine_id IN (SELECT id FROM public.catalog_engines WHERE code LIKE 'CHY%-%' OR code LIKE 'CPGA%' OR code = 'EBM-32kWh'))
     AND f.fault NOT LIKE 'Recall%' AND f.estimated_cost_eur_min IS NULL
     AND f.fault NOT LIKE 'CNG tank%' AND f.fault NOT LIKE 'High-voltage battery controller%';
  IF n <> 0 THEN RAISE EXCEPTION 'Post-check: % non-recall faults still without a cost -- rolled back', n; END IF;
END $$;

COMMIT;
