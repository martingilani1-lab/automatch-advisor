-- Škoda Octavia II (1Z) Pre-facelift 2004-2008: complete the configuration matrix (Martin,
-- 2026-11-03). The phase had 6 configurations live; it ends with 47.
--
-- REQUIRES 20261103120000 (new gearbox VW MQ200-6F / 02U) to have run first -- the 1.6 FSI
-- manual rows join to it, and the count guard below rolls back if they can't.
--
-- Collapsed on purpose (same rules as the Facelift seed 20261103100000): every "Scout" = the
-- plain Combi 4x4 row (Scout is a trim); "Combi" = catalog body type 'Estate'.
-- Dropped (Martin): 1.8 TSI 4x4 -- it launched as MY2009 with CDAA + Haldex Gen 4, so it belongs
-- to the Facelift only (where it already exists).
--
-- Reconcile (live DB, 2026-11-03):
--   REUSE engines: AXP 55 kW (BCA is its alt code -- the 1.4 MPI 55 kW), BSE 75, BXE 77, BLS 77,
--     BKD 103, BMM 103.
--   CREATE engines (all data: Martin, 2026-11-03):
--     BUD  1.4 MPI      59 kW 1390 cc 132 Nm Euro4 belt   (replaced BCA from 2006)
--     BLF  1.6 FSI      85 kW 1598 cc 155 Nm Euro4 chain  (EA111)
--     BVY  2.0 FSI     110 kW 1984 cc 200 Nm Euro4 belt   alt code BVX (the 4x4 version of the
--          same unit). BLR / BLX are NOT alt codes -- they differ (NOx sensor).
--     BZB  1.8 TSI     118 kW 1798 cc 250 Nm Euro4 chain  (2007-08; separate from CDAA on purpose:
--          different piston rings, no CDAA-style oil burning -> reliability 3 vs CDAA 2)
--     BWA  2.0 TFSI RS 147 kW 1984 cc 280 Nm Euro4 belt   (EA113: timing belt + short cam-linking
--          chain; timing_type 'belt')
--     BMN  2.0 TDI PD RS 125 kW 1968 cc 350 Nm Euro4 belt (16V, DPF, Siemens piezo injectors)
--     Near-duplicate check (rule 1c): none matches a live engine on displacement/power/torque/
--     fuel/emission/timing (checked live).
--   Excluded per rule 10: BUD "EGR valve clogging" -- the EA111 1.4 16V MPI has no external EGR
--     valve (same exclusion Martin confirmed for CGGA). EA888 "Gen 1 / Gen 2" wording left out of
--     every text (Martin: sources disagree, keep the database from contradicting itself).
--   Fault severities: proposed by Claude, same scale as the Facelift (engine death / sudden
--     shutdown -> critical, workshop job -> moderate, cheap part -> minor).
--   Gearboxes (Martin): 5-speed manual -> VW MQ200; 1.6 FSI 6-speed manual -> VW MQ200-6F (02U);
--     2.0 FSI and 1.8 TSI FWD 6-speed manual -> VW MQ250 (<= 250 Nm); 2.0 TFSI / 2.0 TDI 6-speed
--     manual -> VW MQ350; Tiptronic -> Aisin 09G; DSG -> VW DQ250; every 4x4 -> VW MQ350 +
--     haldex_gen2.
--   BLS / BMM: same configurations and official NEDC figures as the Facelift (Martin: unchanged
--     2006-2009).
--   Consumption: official NEDC combined, Martin, for every new row.
--   Maintenance conventions as the Facelift fill (20261103110000): spark-plug columns NULL on
--     diesels; fuel_filter NULL on BZB (lifetime filter, as CBZB/CAXA/CDAA/CCZA); on chain engines
--     timing_service_cost = chain + tensioner kit. BLF/BVY/BWA fuel filter 60 000 km per Martin.
--
-- Additive INSERTs only: engines ON CONFLICT (code, power_kw) DO NOTHING; faults and
-- configurations WHERE NOT EXISTS. Review-only until Martin signs off. The 3 corrections of
-- existing consumption values are an UPDATE -> 20261103121000 (human-run).

BEGIN;

-- ---- New engines ---------------------------------------------------------------------------
INSERT INTO public.catalog_engines (
  code, display_name, alt_codes, displacement_cc, power_kw, fuel_type, torque_nm, cylinders, emission_standard, timing_type,
  reliability_rating, engine_oil_capacity_liters, oil_change_interval_km, oil_change_interval_months, oil_spec,
  oil_service_cost_eur_min, oil_service_cost_eur_max, air_filter_interval_km, fuel_filter_interval_km,
  spark_plug_interval_km, spark_plug_cost_eur_min, spark_plug_cost_eur_max,
  timing_replacement_km, timing_replacement_years, timing_service_cost_eur_min, timing_service_cost_eur_max,
  yearly_maintenance_eur_min, yearly_maintenance_eur_max, pros, cons, maintenance_note)
VALUES
  ('BUD'::text, '1.4 MPI (BUD) — 59 kW'::text, NULL::text[], 1390::integer, 59::integer, 'petrol'::text, 132::integer, 'L4'::text, 'Euro4'::text, 'belt'::text,
   5::smallint, 3.2::numeric, 15000::integer, 12::smallint, 'VW 502 00, 5W-40'::text,
   70::integer, 100::integer, 60000::integer, 60000::integer,
   60000::integer, 40::integer, 70::integer,
   90000::integer, 6::smallint, 250::integer, 400::integer,
   150::integer, 250::integer,
   ARRAY['Bulletproof naturally aspirated simplicity', 'Very cheap to run']::text[],
   ARRAY['Painfully slow', 'Needs high revs to hold highway speeds']::text[],
   'Like the BCA, keep the throttle body clean to prevent erratic idling.'::text),
  ('BLF', '1.6 FSI (BLF) — 85 kW', NULL, 1598, 85, 'petrol', 155, 'L4', 'Euro4', 'chain',
   3, 3.6, 15000, 12, 'VW 502 00, 5W-30',
   70, 100, 60000, 60000,
   60000, 50, 80,
   NULL, NULL, 400, 600,
   200, 350,
   ARRAY['Good fuel economy on steady motorway runs', 'Quiet and refined at idle'],
   ARRAY['Requires premium fuel (98 RON) to run properly', 'Susceptible to carbon buildup'],
   'Avoid LongLife servicing: frequent oil changes protect the delicate timing chain and the high-pressure fuel pump. Timing cost = chain + tensioner kit.'),
  ('BVY', '2.0 FSI (BVY) — 110 kW', ARRAY['BVX'], 1984, 110, 'petrol', 200, 'L4', 'Euro4', 'belt',
   3, 4.6, 15000, 12, 'VW 502 00, 5W-30',
   80, 120, 60000, 60000,
   60000, 60, 90,
   120000, 6, 400, 600,
   250, 400,
   ARRAY['Smooth and linear power delivery', 'No turbocharger complexity'],
   ARRAY['Heavy on fuel compared with newer TSI units', 'Very sensitive to fuel quality'],
   'The high-pressure fuel pump is driven by the camshaft: inspect its cam follower every 60 000 km to prevent catastrophic camshaft wear. BVX is the 4x4 code of the same unit.'),
  ('BZB', '1.8 TSI (BZB) — 118 kW', NULL, 1798, 118, 'petrol', 250, 'L4', 'Euro4', 'chain',
   3, 4.6, 15000, 12, 'VW 504 00, 5W-30',
   90, 130, 90000, NULL,
   60000, 60, 100,
   NULL, NULL, 500, 800,
   300, 500,
   ARRAY['Avoids the piston-ring oil burning of the later CDAA', 'Excellent tuning potential'],
   ARRAY['Timing chain tensioner risk'],
   'Replace the original timing-chain tensioner with the revised part preventively; otherwise it is a ticking time bomb for engine failure. Timing cost = chain + tensioner kit.'),
  ('BWA', '2.0 TFSI RS (BWA) — 147 kW', NULL, 1984, 147, 'petrol', 280, 'L4', 'Euro4', 'belt',
   4, 4.6, 15000, 12, 'VW 502 00 / 504 00, 5W-30',
   90, 130, 90000, 60000,
   60000, 60, 100,
   120000, 6, 450, 650,
   350, 550,
   ARRAY['Very robust engine block', 'Generally more reliable than the later chain-driven CCZA'],
   ARRAY['High-pressure fuel pump cam follower wear', 'PCV system issues'],
   'As on the 2.0 FSI, the cam follower driving the high-pressure fuel pump is a consumable: inspect or replace it every 30 000-50 000 km -- a EUR 40 part can ruin the engine if ignored. Timing belt plus a short chain linking the camshafts.'),
  ('BMN', '2.0 TDI PD RS (BMN) — 125 kW', NULL, 1968, 125, 'diesel', 350, 'L4', 'Euro4', 'belt',
   2, 4.3, 15000, 12, 'VW 507 00, 5W-30',
   90, 130, 60000, 60000,
   NULL, NULL, NULL,
   120000, 6, 450, 650,
   400, 700,
   ARRAY['Aggressive power delivery with a strong top-end pull for a diesel'],
   ARRAY['Siemens piezo injector failures', 'Heavy DPF problems'],
   'Make sure the factory recall for the Siemens piezo injectors was completed; the original unrevised injectors almost guarantee a breakdown. Strictly low-SAPS VW 507 00 oil (DPF).')
ON CONFLICT (code, power_kw) DO NOTHING;

-- ---- Engine faults -------------------------------------------------------------------------
WITH f(engine_code, power_kw, fault, severity) AS (VALUES
  ('BUD'::text,  59::integer, 'Ignition coil pack failure'::text,                                   'minor'::text),
  ('BUD',        59,          'Carbon buildup in the throttle body',                                'minor'),
  ('BLF',        85,          'Timing chain stretch and tensioner failure',                         'critical'),
  ('BLF',        85,          'NOx sensor failure',                                                 'moderate'),
  ('BLF',        85,          'Carbon buildup on intake valves',                                    'moderate'),
  ('BVY',       110,          'Intake manifold flap motor failure',                                 'moderate'),
  ('BVY',       110,          'EGR valve clogging',                                                 'moderate'),
  ('BVY',       110,          'High-pressure fuel pump cam follower wear damaging the camshaft',    'critical'),
  ('BZB',       118,          'Timing chain tensioner failure',                                     'critical'),
  ('BZB',       118,          'PCV valve failure',                                                  'minor'),
  ('BZB',       118,          'Water pump and thermostat housing leaks',                            'moderate'),
  ('BWA',       147,          'Cam follower wear punching through to the camshaft',                 'critical'),
  ('BWA',       147,          'PCV valve failure causing rough idle',                               'minor'),
  ('BWA',       147,          'Turbo diverter valve diaphragm tearing',                             'minor'),
  ('BMN',       125,          'Siemens piezo injector short circuit causing sudden engine shutdown', 'critical'),
  ('BMN',       125,          'DPF clogging',                                                       'moderate'),
  ('BMN',       125,          'Tandem fuel/vacuum pump leaks',                                      'moderate')
)
INSERT INTO public.catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', e.id, f.fault, f.severity
FROM f JOIN public.catalog_engines e ON e.code = f.engine_code AND e.power_kw = f.power_kw
WHERE NOT EXISTS (SELECT 1 FROM public.catalog_component_faults x WHERE x.engine_id = e.id AND x.fault = f.fault);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.catalog_engines
   WHERE (code, power_kw) IN (('BUD', 59), ('BLF', 85), ('BVY', 110), ('BZB', 118), ('BWA', 147), ('BMN', 125));
  IF n <> 6 THEN RAISE EXCEPTION 'Expected the 6 new engines, found % -- rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_component_faults x JOIN public.catalog_engines e ON e.id = x.engine_id
   WHERE (e.code, e.power_kw) IN (('BUD', 59), ('BLF', 85), ('BVY', 110), ('BZB', 118), ('BWA', 147), ('BMN', 125));
  IF n <> 17 THEN RAISE EXCEPTION 'Expected 17 faults on the 6 new engines, found % -- rolled back', n; END IF;
END $$;

-- ---- Configurations ------------------------------------------------------------------------
WITH v(engine_code, power_kw, body, unit_code, drivetrain_code, consumption) AS (VALUES
  -- petrol
  ('AXP'::text,  55::integer, 'Liftback'::text, 'VW MQ200'::text,            NULL::text,    6.9::numeric),
  ('AXP',        55,          'Estate',         'VW MQ200',                  NULL,          7.1),
  ('BUD',        59,          'Liftback',       'VW MQ200',                  NULL,          6.6),
  ('BUD',        59,          'Estate',         'VW MQ200',                  NULL,          6.8),
  ('BSE',        75,          'Estate',         'VW MQ200',                  NULL,          7.4),
  ('BSE',        75,          'Estate',         'Aisin 09G (TF-60SN)',       NULL,          8.0),
  ('BLF',        85,          'Liftback',       'VW MQ200-6F',               NULL,          6.6),
  ('BLF',        85,          'Estate',         'VW MQ200-6F',               NULL,          6.8),
  ('BLF',        85,          'Liftback',       'Aisin 09G (TF-60SN)',       NULL,          7.6),
  ('BLF',        85,          'Estate',         'Aisin 09G (TF-60SN)',       NULL,          7.8),
  ('BVY',       110,          'Liftback',       'VW MQ250',                  NULL,          7.2),
  ('BVY',       110,          'Estate',         'VW MQ250',                  NULL,          7.4),
  ('BVY',       110,          'Liftback',       'Aisin 09G (TF-60SN)',       NULL,          8.1),
  ('BVY',       110,          'Estate',         'Aisin 09G (TF-60SN)',       NULL,          8.3),
  ('BVY',       110,          'Estate',         'VW MQ350',                  'haldex_gen2', 8.4),  -- incl. Scout
  ('BZB',       118,          'Liftback',       'VW MQ250',                  NULL,          7.4),
  ('BZB',       118,          'Estate',         'VW MQ250',                  NULL,          7.6),
  ('BWA',       147,          'Liftback',       'VW MQ350',                  NULL,          7.8),
  ('BWA',       147,          'Estate',         'VW MQ350',                  NULL,          7.9),
  ('BWA',       147,          'Liftback',       'VW DQ250',                  NULL,          7.9),
  ('BWA',       147,          'Estate',         'VW DQ250',                  NULL,          8.0),
  -- diesel
  ('BXE',        77,          'Estate',         'VW MQ200',                  NULL,          5.1),
  ('BXE',        77,          'Estate',         'VW DQ250',                  NULL,          5.9),
  ('BLS',        77,          'Liftback',       'VW MQ200',                  NULL,          4.9),
  ('BLS',        77,          'Estate',         'VW MQ200',                  NULL,          5.1),
  ('BLS',        77,          'Liftback',       'VW DQ250',                  NULL,          5.8),
  ('BLS',        77,          'Estate',         'VW DQ250',                  NULL,          5.9),
  ('BLS',        77,          'Estate',         'VW MQ350',                  'haldex_gen2', 6.0),
  ('BKD',       103,          'Liftback',       'VW MQ350',                  NULL,          5.5),
  ('BKD',       103,          'Estate',         'VW MQ350',                  NULL,          5.5),
  ('BKD',       103,          'Liftback',       'VW DQ250',                  NULL,          6.0),
  ('BKD',       103,          'Estate',         'VW MQ350',                  'haldex_gen2', 6.3),  -- incl. Scout
  ('BMM',       103,          'Liftback',       'VW MQ350',                  NULL,          5.5),
  ('BMM',       103,          'Estate',         'VW MQ350',                  NULL,          5.5),
  ('BMM',       103,          'Liftback',       'VW DQ250',                  NULL,          6.0),
  ('BMM',       103,          'Estate',         'VW DQ250',                  NULL,          6.0),
  ('BMM',       103,          'Estate',         'VW MQ350',                  'haldex_gen2', 6.3),  -- incl. Scout
  ('BMN',       125,          'Liftback',       'VW MQ350',                  NULL,          5.7),
  ('BMN',       125,          'Estate',         'VW MQ350',                  NULL,          5.9),
  ('BMN',       125,          'Liftback',       'VW DQ250',                  NULL,          6.0),
  ('BMN',       125,          'Estate',         'VW DQ250',                  NULL,          6.2)
  -- Live already (not listed): BSE Liftback MQ200 + 09G, BXE Liftback MQ200 + DQ250,
  -- BXE Estate 4x4 MQ350 haldex_gen2, BKD Estate DQ250.
),
r AS (
  SELECT p.id AS phase_id, b.id AS body_type_id, e.id AS engine_id, t.id AS unit_id, d.id AS drivetrain_id, v.consumption
  FROM v
  JOIN public.catalog_phases p
    ON p.generation_code = '1Z' AND p.phase_label = 'Pre-facelift'
   AND p.model_id = (SELECT m.id FROM public.catalog_models m JOIN public.catalog_brands br ON br.id = m.brand_id
                     WHERE m.name = 'Octavia' AND br.name = 'Škoda')
  JOIN public.catalog_body_types b ON b.name = v.body
  JOIN public.catalog_engines e ON e.code = v.engine_code AND e.power_kw = v.power_kw
  JOIN public.transmission_units t ON t.code = v.unit_code
  LEFT JOIN public.drivetrain_systems d ON d.code = v.drivetrain_code
)
INSERT INTO public.catalog_vehicle_configurations (phase_id, body_type_id, engine_id, unit_id, drivetrain_id, fuel_consumption_l100km)
SELECT r.phase_id, r.body_type_id, r.engine_id, r.unit_id, r.drivetrain_id, r.consumption
FROM r
WHERE NOT EXISTS (
  SELECT 1 FROM public.catalog_vehicle_configurations c
  WHERE c.phase_id = r.phase_id AND c.body_type_id = r.body_type_id AND c.engine_id = r.engine_id
    AND c.unit_id = r.unit_id AND c.drivetrain_id IS NOT DISTINCT FROM r.drivetrain_id
);

-- 41 listed (all new) + 6 live = 47. A silent JOIN miss (e.g. MQ200-6F not created yet) would
-- drop rows -> caught here.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
  FROM public.catalog_vehicle_configurations c
  JOIN public.catalog_phases p ON p.id = c.phase_id
  JOIN public.catalog_models m ON m.id = p.model_id
  WHERE m.name = 'Octavia' AND p.generation_code = '1Z' AND p.phase_label = 'Pre-facelift';
  IF n <> 47 THEN
    RAISE EXCEPTION 'Octavia 1Z Pre-facelift should have 47 configurations after this seed, has % -- rolled back', n;
  END IF;
END $$;

COMMIT;
