-- Maintenance data for the 7 Octavia II (1Z) Facelift engines that had none beyond oil capacity,
-- oil km interval, timing km interval and yearly cost (Martin, 2026-11-03).
--
-- Conventions kept from the complete rows (BXE, CFHC, CBZB, CAXA ...):
--   * fuel_filter_interval_km NULL on direct-injection petrols (CDAA, CCZA) -- lifetime filter,
--     same as CBZB / CAXA.
--   * spark-plug columns NULL on diesels.
--   * timing_service_cost on chain engines = chain + tensioner kit replacement cost (as CBZB/CAXA).
--   * CHGA's LPG-system service (gas-phase filter 15 000 km, liquid-phase 30 000 km, ~EUR 50-80)
--     has no column -> maintenance_note.
-- CEGA timing belt: 6 years per Martin (its EA189 siblings CFHC / CAYC are stored with 10).
--
-- UPDATE of existing rows: human-run only, in a FRESH SQL editor tab. Fills only columns that are
-- still NULL (the WHERE requires every target column empty); rolls back unless exactly 7 rows change.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  WITH v(code, power_kw, oil_mo, oil_spec, oil_cmin, oil_cmax, air_km, fuel_km, plug_km, plug_cmin, plug_cmax, t_yr, t_cmin, t_cmax, note) AS (VALUES
    ('BLS'::text,   77::integer, 12::smallint, 'VW 507 00, 5W-30'::text, 90::integer, 130::integer, 60000::integer, 60000::integer, NULL::integer, NULL::integer, NULL::integer, 6::smallint, 350::integer, 550::integer,
     'Strictly requires low-SAPS VW 507 00 oil because of the DPF; the older 505 01 spec rapidly clogs and destroys the particulate filter.'::text),
    ('BMM',        103,          12,           'VW 507 00, 5W-30',       90,           130,           60000,           60000,           NULL,          NULL,          NULL,          6,           350,           550,
     'Shares the mechanical simplicity of older PD units but mandates DPF-safe VW 507 00 oil to prevent fatal exhaust back-pressure build-up.'),
    ('CEGA',       125,          12,           'VW 507 00, 5W-30',       90,           130,           90000,           60000,           NULL,          NULL,          NULL,          6,           450,           650,
     'The common-rail high-pressure fuel pump is extremely sensitive to fuel quality; never skip the 60 000 km fuel filter replacement.'),
    ('CGGA',        59,          12,           'VW 502 00, 5W-40',       70,           100,           60000,           60000,           60000,         40,            70,            6,           250,           400,
     'Very inexpensive to maintain; the timing system uses two belts (main and camshaft-linking) which must always be replaced together.'),
    ('CHGA',        75,          12,           'VW 502 00, 5W-40',       70,           100,           60000,           60000,           30000,         50,            80,            6,           250,           400,
     'LPG operation accelerates spark-plug wear (30 000 km). The LPG system needs a gas-phase filter every 15 000 km and a liquid-phase filter every 30 000 km (about EUR 50-80 together). Fuel filter interval is the petrol filter.'),
    ('CDAA',       118,          12,           'VW 504 00, 5W-30',       90,           130,           90000,           NULL,            60000,         60,            100,           NULL,        500,           800,
     'Annual oil changes at no more than 10 000-15 000 km are critical to keep oil pressure for the timing-chain tensioner and limit engine wear. Timing cost = chain + tensioner kit.'),
    ('CCZA',       147,          12,           'VW 504 00, 5W-30',       90,           130,           90000,           NULL,            60000,         60,            100,           NULL,        600,           900,
     'Because of the high failure rate of the EA888 Gen 2 timing-chain tensioner, proactive replacement of the whole chain and tensioner kit is strongly recommended regardless of mileage. Timing cost = that kit.')
  )
  UPDATE public.catalog_engines e
     SET oil_change_interval_months  = v.oil_mo,
         oil_spec                    = v.oil_spec,
         oil_service_cost_eur_min    = v.oil_cmin,
         oil_service_cost_eur_max    = v.oil_cmax,
         air_filter_interval_km      = v.air_km,
         fuel_filter_interval_km     = v.fuel_km,
         spark_plug_interval_km      = v.plug_km,
         spark_plug_cost_eur_min     = v.plug_cmin,
         spark_plug_cost_eur_max     = v.plug_cmax,
         timing_replacement_years    = v.t_yr,
         timing_service_cost_eur_min = v.t_cmin,
         timing_service_cost_eur_max = v.t_cmax,
         maintenance_note            = v.note
    FROM v
   WHERE e.code = v.code AND e.power_kw = v.power_kw
     AND e.oil_change_interval_months IS NULL AND e.oil_spec IS NULL
     AND e.oil_service_cost_eur_min IS NULL AND e.oil_service_cost_eur_max IS NULL
     AND e.air_filter_interval_km IS NULL AND e.fuel_filter_interval_km IS NULL
     AND e.spark_plug_interval_km IS NULL AND e.spark_plug_cost_eur_min IS NULL AND e.spark_plug_cost_eur_max IS NULL
     AND e.timing_replacement_years IS NULL
     AND e.timing_service_cost_eur_min IS NULL AND e.timing_service_cost_eur_max IS NULL
     AND e.maintenance_note IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 7 THEN RAISE EXCEPTION 'Expected 7 engines with empty maintenance data, updated % -- rolled back', n; END IF;
END $$;

COMMIT;
