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
--     displacement_cc is the engine family's capacity (1390 / 1595 / 1968 / 1984) and
--     cylinders L4 -- both implied by the names; oil capacity and ratings stay NULL (unknown).
--     Near-duplicate check: none matches a live engine on displacement/power/torque/fuel/
--     emission/timing (CHGA differs from BSE in fuel + emission; CCZA from CZPC in torque).
--   Gearboxes (Martin): 5-speed manual -> VW MQ200; 6-speed manual -> VW MQ250 only for 1.2 TSI,
--     1.4 TSI and 1.8 TSI FWD (<= 250 Nm), VW MQ350 (02Q) for every 2.0 engine and every 4x4;
--     6-speed DSG -> VW DQ250; 7-speed DSG -> VW DQ200. 4x4 -> haldex_gen4 (as live on this phase).
--   Consumption: official NEDC combined only, as supplied by Martin for the FWD manuals of the
--     new engines (CGGA 6.4, CHGA 7.2 on petrol, CEGA 5.7, CCZA 7.2 -- same figure for both
--     bodies). Everything else NULL: Martin's other figures were real-world ranges, which must
--     not be mixed with official ones (cost calculator, Ultra efficient tag).
--
-- Additive INSERTs only: engines ON CONFLICT (code, power_kw) DO NOTHING; configurations
-- WHERE NOT EXISTS on the full combination (no unique constraint exists), so the 6 live rows and
-- any re-run are skipped. The existing 1.6 TDI 4x4 row's gearbox is fixed separately
-- (20261103100500, UPDATE -- human-run). Review-only until Martin signs off.

BEGIN;

-- ---- New engines ---------------------------------------------------------------------------
INSERT INTO public.catalog_engines (code, display_name, displacement_cc, power_kw, fuel_type, torque_nm, cylinders, emission_standard, timing_type)
VALUES
  ('CGGA'::text, '1.4 MPI (CGGA) — 59 kW'::text,     1390::integer,  59::integer, 'petrol'::text, 132::integer, 'L4'::text, 'Euro5'::text, 'belt'::text),
  ('CHGA'::text, '1.6 MPI LPG (CHGA) — 75 kW'::text, 1595::integer,  75::integer, 'lpg'::text,    148::integer, 'L4'::text, 'Euro5'::text, 'belt'::text),
  ('CEGA'::text, '2.0 TDI CR RS (CEGA) — 125 kW'::text, 1968::integer, 125::integer, 'diesel'::text, 350::integer, 'L4'::text, 'Euro5'::text, 'belt'::text),
  ('CCZA'::text, '2.0 TSI RS (CCZA) — 147 kW'::text, 1984::integer, 147::integer, 'petrol'::text, 280::integer, 'L4'::text, 'Euro5'::text, 'chain'::text)
ON CONFLICT (code, power_kw) DO NOTHING;

-- ---- Configurations ------------------------------------------------------------------------
WITH v(engine_code, power_kw, body, unit_code, drivetrain_code, consumption) AS (VALUES
  -- petrol
  ('CGGA'::text,  59::integer, 'Liftback'::text, 'VW MQ200'::text, NULL::text,      6.4::numeric),
  ('CGGA',        59,          'Estate',         'VW MQ200',       NULL,            6.4),
  ('BSE',         75,          'Liftback',       'VW MQ200',       NULL,            NULL),
  ('BSE',         75,          'Estate',         'VW MQ200',       NULL,            NULL),
  ('CHGA',        75,          'Liftback',       'VW MQ200',       NULL,            7.2),
  ('CHGA',        75,          'Estate',         'VW MQ200',       NULL,            7.2),
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
