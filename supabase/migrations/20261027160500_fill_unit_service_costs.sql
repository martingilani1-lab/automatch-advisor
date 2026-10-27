-- Fill the gearbox / AWD service columns (20261027160000) for every unit actually used by a
-- catalog configuration (18 gearboxes + 7 drivetrain systems), taken from each unit's OWN live
-- maintenance_note -- no new figures were introduced. Where the note gives an interval range
-- ("every 50,000-60,000 km") the LOWER bound is used (the conservative, more frequent interval).
--
-- Left NULL because the note has no price -- please supply these and I'll add them:
--   gearboxes:  Audi DL382, Audi ML401, DQ400e, VW MQ281, ZF AL552
--   drivetrain: haldex_gen4, haldex_gen5 (218 configs!), haldex_gen6, quattro_torsen, quattro_ultra
--
-- UPDATE of existing reference rows: review-only, NOT run by this session. Run in a FRESH
-- Supabase SQL editor tab, AFTER 20261027160000. Guard: aborts unless exactly 25 rows update.

BEGIN;

CREATE TEMP TABLE _svc (k text, code text, km int, yrs smallint, cost_min int, cost_max int) ON COMMIT DROP;
INSERT INTO _svc VALUES
  -- gearboxes                          km      yrs   €min  €max   (source: maintenance_note)
  ('tu', 'Aisin 09G (TF-60SN)',         50000,  NULL, 140,  200),  -- 50-60k km, ~EUR 140-200
  ('tu', 'Audi DL382',                  60000,  NULL, NULL, NULL), -- ~60k km, no price
  ('tu', 'Audi ML401',                  120000, NULL, NULL, NULL), -- ~120k km, no price
  ('tu', 'DQ400e',                      60000,  NULL, NULL, NULL), -- 60k km, no price
  ('tu', 'Jatco 09A (JF506E)',          50000,  NULL, 120,  180),  -- 50-60k km, ~EUR 120-180
  ('tu', 'VW 01M',                      45000,  NULL, 120,  180),  -- 45-60k km, ~EUR 120-180
  ('tu', 'VW 02J',                      60000,  NULL, 40,   70),   -- 60-80k km, ~EUR 40-70
  ('tu', 'VW 02K',                      60000,  NULL, 40,   60),   -- 60k km, ~EUR 40-60
  ('tu', 'VW 02M',                      80000,  NULL, 60,   90),   -- 80-100k km, ~EUR 60-90
  ('tu', 'VW DQ200',                    60000,  NULL, 100,  160),  -- ~60k km, ~EUR 100-160
  ('tu', 'VW DQ250',                    60000,  NULL, 150,  250),  -- ~60k km, ~EUR 150-250
  ('tu', 'VW DQ381',                    60000,  NULL, 160,  260),  -- ~60k km, ~EUR 160-260
  ('tu', 'VW DQ500',                    60000,  NULL, 170,  280),  -- ~60k km, ~EUR 170-280
  ('tu', 'VW MQ200',                    100000, NULL, 60,   110),  -- 100-120k km, ~EUR 60-110
  ('tu', 'VW MQ250',                    100000, NULL, 60,   120),  -- 100-120k km, ~EUR 60-120
  ('tu', 'VW MQ281',                    100000, NULL, NULL, NULL), -- 100-120k km, no price
  ('tu', 'VW MQ350',                    100000, NULL, 70,   120),  -- 100-120k km, ~EUR 70-120
  ('tu', 'ZF AL552',                    80000,  NULL, NULL, NULL), -- 80-120k km, no price
  -- AWD systems
  ('dt', 'haldex_gen1',                 60000,  NULL, 80,   150),  -- ~60k km, ~EUR 80-150
  ('dt', 'haldex_gen2',                 60000,  NULL, 80,   150),  -- ~60k km, ~EUR 80-150
  ('dt', 'haldex_gen4',                 40000,  NULL, NULL, NULL), -- 40-50k km, no price
  ('dt', 'haldex_gen5',                 40000,  NULL, NULL, NULL), -- 40-60k km, no price
  ('dt', 'haldex_gen6',                 60000,  3,    NULL, NULL), -- 60k km or 3 years, no price
  ('dt', 'quattro_torsen',              90000,  NULL, NULL, NULL), -- 90-120k km, no price
  ('dt', 'quattro_ultra',               60000,  NULL, NULL, NULL); -- ~60k km, no price

DO $$
DECLARE n_tu int; n_dt int;
BEGIN
  UPDATE transmission_units t
     SET service_interval_km = s.km, service_interval_years = s.yrs,
         service_cost_eur_min = s.cost_min, service_cost_eur_max = s.cost_max
    FROM _svc s WHERE s.k = 'tu' AND t.code = s.code;
  GET DIAGNOSTICS n_tu = ROW_COUNT;

  UPDATE drivetrain_systems d
     SET service_interval_km = s.km, service_interval_years = s.yrs,
         service_cost_eur_min = s.cost_min, service_cost_eur_max = s.cost_max
    FROM _svc s WHERE s.k = 'dt' AND d.code = s.code;
  GET DIAGNOSTICS n_dt = ROW_COUNT;

  IF n_tu <> 18 OR n_dt <> 7 THEN
    RAISE EXCEPTION 'Expected 18 gearbox + 7 drivetrain rows, got % + % -- rolled back', n_tu, n_dt;
  END IF;
END $$;

COMMIT;
