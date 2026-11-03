-- Škoda Octavia II (1Z) Facelift 2009-2013: complete the configuration matrix (Martin,
-- 2026-11-03). The phase had 6 configurations live; Martin's factory list collapses to 49 real
-- engine x gearbox x drivetrain x body combinations, so this adds the 43 missing ones.
--
-- Collapsed on purpose: "Combi (Scout)" = the same Estate + 4x4 + engine + gearbox as the plain
-- Combi 4x4 (Scout is a trim/version, not a body); "GreenLine" = a 1.6 TDI CR version, also a
-- trim. "Combi" = catalog body type 'Estate'.
--
-- Reconcile (live DB, 2026-11-03):
--   REUSE engines: BSE 75, CBZB 77, CAXA 90, CDAA 118, BXE 77, CAYC 77, BKD 103, CFHC 103.
--   CREATE engines (codes + torque / emission / timing from Martin):
--     CGGA 1.4 MPI 59 kW  132 Nm Euro5 belt
--     CHGA 1.6 MPI 75 kW  148 Nm Euro5 belt -- factory LPG: reinforced head, hardened valve
--                         seats and valves; mechanically distinct from BSE (Martin), so its own
--                         engine with fuel_type 'lpg', not a BSE trim note.
--     CEGA 2.0 TDI CR RS 125 kW 350 Nm Euro5 belt
--     CCZA 2.0 TSI RS 147 kW 280 Nm Euro5 chain
--     displacement_cc (1390 / 1595 / 1968 / 1984) and cylinders L4 confirmed by Martin.
--     Reliability, oil capacity + interval, belt interval, yearly maintenance, pros/cons and
--     faults: Martin, 2026-11-03. Timing-replacement years, oil/belt service costs and
--     maintenance_note stay NULL (not supplied). Fault severities are proposed by Claude from
--     the fault text (engine death -> critical, repair-shop job -> moderate, cheap part -> minor)
--     -- part of Martin's review of this file.
--     Excluded per CLAUDE.md rule 10 (cross-check fault text against the engine's hardware):
--       CGGA "occasional EGR valve faults" -- the EA111 1.4 16V MPI has no external EGR valve.
--     Excluded as a duplicate: CDAA "catastrophic oil consumption due to thin piston control
--       rings" -- CDAA already carries "High oil consumption from faulty piston rings".
--   CDAA's own empty columns (reliability, interval, maintenance, pros/cons) are an UPDATE of an
--     existing row -> separate human-run file 20261103101000. Its two new faults are additive
--     and live here.
--   Era (Martin): BXE, BKD and BSE were all still sold in the early facelift (2009-2010).
--     Near-duplicate check: none matches a live engine on displacement/power/torque/fuel/
--     emission/timing (CHGA differs from BSE in fuel + emission; CCZA from CZPC in torque).
--   Gearboxes (Martin): 5-speed manual -> VW MQ200; 6-speed manual -> VW MQ250 only for 1.2 TSI,
--     1.4 TSI and 1.8 TSI FWD (<= 250 Nm), VW MQ350 (02Q) for every 2.0 engine and every 4x4;
--     6-speed DSG -> VW DQ250; 7-speed DSG -> VW DQ200. 4x4 -> haldex_gen4 (as live on this phase).
--   Consumption: official NEDC combined only, as supplied by Martin for the FWD manuals of the
--     new engines (CGGA 6.4, CHGA 9.2, CEGA 5.7, CCZA 7.2 -- same figure for both bodies).
--     CHGA stores the LPG figure (9.2), not the petrol one (7.2): fuel_type is 'lpg', so the
--     cost calculator multiplies by the LPG price -- the petrol figure would understate fuel cost.
--     Everything else NULL: Martin's other figures were real-world ranges, which must not be
--     mixed with official ones (cost calculator, Ultra efficient tag).
--
-- Additive INSERTs only: engines ON CONFLICT (code, power_kw) DO NOTHING; configurations
-- WHERE NOT EXISTS on the full combination (no unique constraint exists), so the 6 live rows and
-- any re-run are skipped. The existing 1.6 TDI 4x4 row's gearbox is fixed separately
-- (20261103100500, UPDATE -- human-run). Review-only until Martin signs off.

BEGIN;

-- ---- New engines ---------------------------------------------------------------------------
INSERT INTO public.catalog_engines (code, display_name, displacement_cc, power_kw, fuel_type, torque_nm, cylinders, emission_standard, timing_type,
                                    reliability_rating, engine_oil_capacity_liters, oil_change_interval_km, timing_replacement_km,
                                    yearly_maintenance_eur_min, yearly_maintenance_eur_max, pros, cons)
VALUES
  ('CGGA'::text, '1.4 MPI (CGGA) — 59 kW'::text,        1390::integer,  59::integer, 'petrol'::text, 132::integer, 'L4'::text, 'Euro5'::text, 'belt'::text,
   5::smallint, 3.2::numeric, 15000::integer, 120000::integer, 150::integer, 250::integer,
   ARRAY['Bulletproof reliability', 'Extremely cheap to run and fix']::text[],
   ARRAY['Dangerously slow for highway overtakes']::text[]),
  ('CHGA'::text, '1.6 MPI LPG (CHGA) — 75 kW'::text,    1595::integer,  75::integer, 'lpg'::text,    148::integer, 'L4'::text, 'Euro5'::text, 'belt'::text,
   4::smallint, 4.5::numeric, 15000::integer, 120000::integer, 200::integer, 350::integer,
   ARRAY['Low running costs', 'Factory LPG integration with hardened valve seats']::text[],
   ARRAY['Sluggish performance', 'LPG components require extra maintenance']::text[]),
  ('CEGA'::text, '2.0 TDI CR RS (CEGA) — 125 kW'::text, 1968::integer, 125::integer, 'diesel'::text, 350::integer, 'L4'::text, 'Euro5'::text, 'belt'::text,
   4::smallint, 4.3::numeric, 15000::integer, 210000::integer, 300::integer, 500::integer,
   ARRAY['Excellent blend of power and economy', 'Refined common-rail delivery']::text[],
   ARRAY['DPF struggles with frequent short city trips']::text[]),
  ('CCZA'::text, '2.0 TSI RS (CCZA) — 147 kW'::text,    1984::integer, 147::integer, 'petrol'::text, 280::integer, 'L4'::text, 'Euro5'::text, 'chain'::text,
   3::smallint, 4.6::numeric, 15000::integer, NULL::integer, 350::integer, 600::integer,
   ARRAY['High tuning potential', 'Strong torque delivery']::text[],
   ARRAY['Timing chain tensioner risk', 'Prone to burning oil']::text[])
ON CONFLICT (code, power_kw) DO NOTHING;

-- ---- Engine faults (component_type 'engine'; additive, skipped if the same text exists) ------
WITH f(engine_code, power_kw, fault, severity) AS (VALUES
  ('CGGA'::text,  59::integer, 'Carbon buildup in the throttle body'::text,                                     'minor'::text),
  ('CHGA',        75,          'LPG injector failure',                                                          'moderate'),
  ('CHGA',        75,          'Faulty LPG pressure regulator',                                                 'moderate'),
  ('CHGA',        75,          'Ignition coil failure',                                                         'minor'),
  ('CEGA',       125,          'Intake manifold flap actuator failure (P2015)',                                 'moderate'),
  ('CEGA',       125,          'EGR cooler leaks',                                                              'moderate'),
  ('CEGA',       125,          'DPF clogging',                                                                  'moderate'),
  ('CCZA',       147,          'Timing chain tensioner failure causing piston-to-valve contact',                'critical'),
  ('CCZA',       147,          'PCV valve failure',                                                             'minor'),
  ('CCZA',       147,          'Carbon buildup on intake valves',                                               'moderate'),
  ('CDAA',       118,          'Timing chain tensioner failure causing engine death',                           'critical'),
  ('CDAA',       118,          'Leaking water pump',                                                            'moderate')
)
INSERT INTO public.catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', e.id, f.fault, f.severity
FROM f JOIN public.catalog_engines e ON e.code = f.engine_code AND e.power_kw = f.power_kw
WHERE NOT EXISTS (SELECT 1 FROM public.catalog_component_faults x WHERE x.engine_id = e.id AND x.fault = f.fault);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.catalog_engines
   WHERE (code, power_kw) IN (('CGGA', 59), ('CHGA', 75), ('CEGA', 125), ('CCZA', 147));
  IF n <> 4 THEN RAISE EXCEPTION 'Expected the 4 new engines, found % -- rolled back', n; END IF;
  -- 12 listed faults resolve to 12 rows (CDAA keeps its existing 1 -> 3 in total).
  SELECT count(*) INTO n FROM public.catalog_component_faults x JOIN public.catalog_engines e ON e.id = x.engine_id
   WHERE (e.code, e.power_kw) IN (('CGGA', 59), ('CHGA', 75), ('CEGA', 125), ('CCZA', 147), ('CDAA', 118));
  IF n <> 13 THEN RAISE EXCEPTION 'Expected 13 faults on CGGA/CHGA/CEGA/CCZA/CDAA, found % -- rolled back', n; END IF;
END $$;

-- ---- Configurations ------------------------------------------------------------------------
WITH v(engine_code, power_kw, body, unit_code, drivetrain_code, consumption) AS (VALUES
  -- petrol
  ('CGGA'::text,  59::integer, 'Liftback'::text, 'VW MQ200'::text, NULL::text,      6.4::numeric),
  ('CGGA',        59,          'Estate',         'VW MQ200',       NULL,            6.4),
  ('BSE',         75,          'Liftback',       'VW MQ200',       NULL,            NULL),
  ('BSE',         75,          'Estate',         'VW MQ200',       NULL,            NULL),
  ('CHGA',        75,          'Liftback',       'VW MQ200',       NULL,            9.2),  -- LPG figure
  ('CHGA',        75,          'Estate',         'VW MQ200',       NULL,            9.2),
  ('CBZB',        77,          'Liftback',       'VW MQ250',       NULL,            NULL),  -- live already, skipped
  ('CBZB',        77,          'Estate',         'VW MQ250',       NULL,            NULL),
  ('CBZB',        77,          'Liftback',       'VW DQ200',       NULL,            NULL),
  ('CBZB',        77,          'Estate',         'VW DQ200',       NULL,            NULL),
  ('CAXA',        90,          'Liftback',       'VW MQ250',       NULL,            NULL),
  ('CAXA',        90,          'Estate',         'VW MQ250',       NULL,            NULL),
  ('CAXA',        90,          'Liftback',       'VW DQ200',       NULL,            NULL),  -- live already, skipped
  ('CAXA',        90,          'Estate',         'VW DQ200',       NULL,            NULL),
  ('CDAA',       118,          'Liftback',       'VW MQ250',       NULL,            NULL),
  ('CDAA',       118,          'Estate',         'VW MQ250',       NULL,            NULL),
  ('CDAA',       118,          'Liftback',       'VW DQ200',       NULL,            NULL),
  ('CDAA',       118,          'Estate',         'VW DQ200',       NULL,            NULL),
  ('CDAA',       118,          'Estate',         'VW MQ350',       'haldex_gen4',   NULL),
  ('CDAA',       118,          'Estate',         'VW DQ250',       'haldex_gen4',   NULL),
  ('CCZA',       147,          'Liftback',       'VW MQ350',       NULL,            7.2),
  ('CCZA',       147,          'Estate',         'VW MQ350',       NULL,            7.2),
  ('CCZA',       147,          'Liftback',       'VW DQ250',       NULL,            NULL),
  ('CCZA',       147,          'Estate',         'VW DQ250',       NULL,            NULL),
  -- diesel
  ('BXE',         77,          'Liftback',       'VW MQ200',       NULL,            NULL),
  ('BXE',         77,          'Estate',         'VW MQ200',       NULL,            NULL),
  ('BXE',         77,          'Liftback',       'VW DQ250',       NULL,            NULL),
  ('BXE',         77,          'Estate',         'VW DQ250',       NULL,            NULL),
  ('BXE',         77,          'Estate',         'VW MQ350',       'haldex_gen4',   NULL),
  ('CAYC',        77,          'Liftback',       'VW MQ200',       NULL,            NULL),  -- live already, skipped
  ('CAYC',        77,          'Estate',         'VW MQ200',       NULL,            NULL),
  ('CAYC',        77,          'Liftback',       'VW DQ200',       NULL,            NULL),  -- live already, skipped
  ('CAYC',        77,          'Estate',         'VW DQ200',       NULL,            NULL),
  ('BKD',        103,          'Liftback',       'VW MQ350',       NULL,            NULL),
  ('BKD',        103,          'Estate',         'VW MQ350',       NULL,            NULL),
  ('BKD',        103,          'Liftback',       'VW DQ250',       NULL,            NULL),
  ('BKD',        103,          'Estate',         'VW DQ250',       NULL,            NULL),
  ('BKD',        103,          'Estate',         'VW MQ350',       'haldex_gen4',   NULL),
  ('CFHC',       103,          'Liftback',       'VW MQ350',       NULL,            NULL),
  ('CFHC',       103,          'Estate',         'VW MQ350',       NULL,            NULL),
  ('CFHC',       103,          'Liftback',       'VW DQ250',       NULL,            NULL),
  ('CFHC',       103,          'Estate',         'VW DQ250',       NULL,            NULL),
  ('CFHC',       103,          'Estate',         'VW MQ350',       'haldex_gen4',   NULL),
  ('CFHC',       103,          'Estate',         'VW DQ250',       'haldex_gen4',   NULL),  -- live already, skipped
  ('CEGA',       125,          'Liftback',       'VW MQ350',       NULL,            5.7),
  ('CEGA',       125,          'Estate',         'VW MQ350',       NULL,            5.7),
  ('CEGA',       125,          'Liftback',       'VW DQ250',       NULL,            NULL),
  ('CEGA',       125,          'Estate',         'VW DQ250',       NULL,            NULL)
  -- CAYC 77 Estate 4x4: live row exists (gearbox corrected to MQ350 by 20261103100500).
),
r AS (
  SELECT p.id AS phase_id, b.id AS body_type_id, e.id AS engine_id, t.id AS unit_id, d.id AS drivetrain_id,
         v.consumption, v.drivetrain_code
  FROM v
  JOIN public.catalog_phases p
    ON p.generation_code = '1Z' AND p.phase_label = 'Facelift'
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

-- Every listed engine/gearbox/drivetrain/body must have resolved -- a silent JOIN miss would
-- drop a configuration. 48 listed rows (43 new + 5 already live) -> all must resolve.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
  FROM public.catalog_vehicle_configurations c
  JOIN public.catalog_phases p ON p.id = c.phase_id
  JOIN public.catalog_models m ON m.id = p.model_id
  WHERE m.name = 'Octavia' AND p.generation_code = '1Z' AND p.phase_label = 'Facelift';
  IF n <> 49 THEN
    RAISE EXCEPTION 'Octavia 1Z Facelift should have 49 configurations after this seed, has % -- rolled back', n;
  END IF;
END $$;

COMMIT;
