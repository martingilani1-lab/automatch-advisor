-- !!! SUPERSEDED -- DO NOT RUN (it would roll back anyway: the 94 Ah range is no longer NULL and
-- !!! the market max is no longer 25 000). Never run live; replaced on 2026-11-15 by
-- !!! 20261115180000_bmw_i3_facelift_trims_range_market.sql (range 300 km, same 28 trim rows,
-- !!! market 15 000 / 20 545 / 27 000 per Martin 2026-11-15). Kept for the record.
--
-- BMW i3 (I01) Facelift: corrections from the research-car verification run (2026-11-10), as
-- Martin decided them. Evidence: docs/intake/research/bmw-i3-i01-facelift.md (refs E3, E7, E11,
-- E12 in its section Q).
--
-- 1. i3 94 Ah (125 kW) Facelift range NULL -> 300 km NEDC. [E3] ADAC Autokatalog BMW i3 (94 Ah)
--    11/17-09/18: "Reichweite NEFZ (elektrisch): 300 km" (same page: 13,1 kWh NEFZ, 1320 kg EU --
--    both already stored). The Pre-facelift 94 Ah row (312 km) is a different phase and untouched.
-- 2. i3 120 Ah range: Martin keeps 285 km (BMW's "285 - 310", E5). No change here.
-- 3. Facelift trim features: rewritten to match the BMW Austria price list of November 2018 [E7].
--    What was wrong:
--      * Atelier "Professional or Business navigation" -- standard is Radio Professional with a
--        6.5" screen; navigation Business (6AM) and Professional (609) are options.
--      * Atelier "automatic air conditioning" -- standard is "Klimaanlage inkl. Mikrofilter und
--        Umlufttaste"; Klimaautomatik comes with the Komfort-Paket.
--      * Loft "LED headlights" -- standard on every facelift ("LED-Scheinwerfer" under
--        Serienausstattungen; ADAC: "11/2017 ... LED-Scheinwerfer serienmaessig"). Moved to Atelier.
--      * Loft "eucalyptus or carbon-look dashboard trim" -- Loft has a light dashboard with
--        "Electronic" brown surfaces; wood is Lodge / Suite.
--      * Lodge "heated seats" -- "Sitzheizung fuer Fahrer und Beifahrer" is an option; Suite is
--        "Nur in Verbindung mit Sitzheizung".
--      * Suite "Harman Kardon audio" -- option 674 (EUR 670), not part of Suite.
--    Convention kept: the base line (Atelier) carries the car-wide standard items and the
--    options; Loft / Lodge / Suite list only what the line adds -- the same delta pattern as the
--    rest of the catalog. The Sportpaket rows from 20261110230000 are left alone, so this file
--    works whether that one has run or not.
-- 4. Facelift market data replaced. The old 14 000 / 18 000 / 25 000 EUR and "40,000 - 100,000 km"
--    had no recorded source. New: autobazar.eu, 2026-11-10, 18 facelift (MY 2018-2022, BEV only)
--    listings, cheapest 2 and dearest 2 cut -> 14: min 17 900, median 20 545, max 26 900 EUR,
--    mileage 43 260 - 115 000 km [E11, E12]. One site only -- see the research doc's section R.
--    resale_value_rating unchanged.
--
-- UPDATE + DELETE + INSERT: human-run, FRESH SQL editor tab. Count-guarded throughout; any
-- mismatch rolls the whole file back. Pre-facelift rows are not touched.

BEGIN;

DO $$
DECLARE n int; pid uuid;
BEGIN
  SELECT p.id INTO pid
    FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'i3' AND p.generation_code = 'I01' AND p.phase_label = 'Facelift';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 i3 I01 Facelift phase, found % -- rolled back', n; END IF;

  -- 1. 94 Ah Facelift range.
  UPDATE public.catalog_vehicle_configurations c
     SET ev_range_km = 300
    FROM public.catalog_engines e
   WHERE e.id = c.engine_id AND c.phase_id = pid
     AND e.code = 'i3-94Ah' AND e.power_kw = 125
     AND c.consumption_cycle = 'NEDC' AND c.ev_range_km IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 Facelift i3-94Ah@125 row with NULL range, updated % -- rolled back', n; END IF;

  -- 3a. Remove the old Facelift features of the four interior lines (15 rows), keeping any
  --     Sportpaket rows that 20261110230000 may already have added.
  DELETE FROM public.catalog_trim_features f
   USING public.catalog_trims t
   WHERE f.trim_id = t.id AND t.phase_id = pid
     AND t.name IN ('Atelier', 'Loft', 'Lodge', 'Suite')
     AND f.feature NOT LIKE 'Sportpaket:%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 15 THEN RAISE EXCEPTION 'Expected to delete 15 old Facelift trim features, deleted % -- rolled back', n; END IF;

  -- 3b. Insert the verified set (28 rows).
  WITH v(trim_name, feature, is_optional, feature_group, safety_feature_slug) AS (VALUES
    ('Atelier'::text, 'Front and side airbags with front and rear head airbags'::text, false, 'airbags'::text, 'airbags'::text),
    ('Atelier', 'DSC stability control', false, NULL, 'esc'),
    ('Atelier', 'Tyre pressure indicator', false, NULL, 'tyre_pressure_monitoring'),
    ('Atelier', 'Rear parking sensors', false, 'parking', 'reversing_detection'),
    ('Atelier', 'ISOFIX on both rear seats', false, 'seats', NULL),
    ('Atelier', 'LED headlights', false, 'headlights', NULL),
    ('Atelier', 'Radio Professional with 6.5-inch screen and Bluetooth', false, 'infotainment', NULL),
    ('Atelier', 'Air conditioning (manual)', false, 'climate', NULL),
    ('Atelier', 'Leather steering wheel', false, 'steering_wheel', NULL),
    ('Atelier', '19-inch alloy wheels (20-inch on the i3s)', false, 'wheels', NULL),
    ('Atelier', 'Neutronic cloth in Aragaz grey with dark dashboard', false, 'interior_trim', NULL),
    ('Atelier', 'Navigation Business (6.5-inch screen)', true, 'infotainment', NULL),
    ('Atelier', 'Navigation Professional (10.25-inch screen)', true, 'infotainment', NULL),
    ('Atelier', 'Apple CarPlay preparation (only with navigation; no Android Auto)', true, 'smartphone', NULL),
    ('Atelier', 'Automatic climate control (Komfort-Paket)', true, 'climate', NULL),
    ('Atelier', 'Heated front seats', true, 'seat_comfort', NULL),
    ('Atelier', 'Heat pump', true, 'climate', NULL),
    ('Atelier', 'Harman Kardon audio', true, 'sound', NULL),
    ('Loft', 'Electronic cloth / Sensatec upholstery in Carum grey', false, 'interior_trim', NULL),
    ('Loft', 'Light dashboard with Electronic brown interior surfaces', false, 'interior_trim', NULL),
    ('Loft', 'LED ambient lighting and welcome light', false, 'ambient_lighting', NULL),
    ('Lodge', 'Solaric wool / natural-leather upholstery', false, 'interior_trim', NULL),
    ('Lodge', 'Leather dashboard with open-pore eucalyptus or dark oak wood', false, 'interior_trim', NULL),
    ('Lodge', 'LED ambient lighting and welcome light', false, 'ambient_lighting', NULL),
    ('Suite', 'Vernasca natural leather in Dark Truffle', false, 'interior_trim', NULL),
    ('Suite', 'Leather dashboard with dark oak or eucalyptus wood', false, 'interior_trim', NULL),
    ('Suite', 'LED ambient lighting and welcome light', false, 'ambient_lighting', NULL),
    ('Suite', 'Heated front seats (must be ordered with Suite)', true, 'seat_comfort', NULL)
  )
  INSERT INTO public.catalog_trim_features (trim_id, feature, is_optional, feature_group, safety_feature_slug)
  SELECT t.id, v.feature, v.is_optional::boolean, v.feature_group::text, v.safety_feature_slug::text
    FROM v JOIN public.catalog_trims t ON t.phase_id = pid AND t.name = v.trim_name;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 28 THEN RAISE EXCEPTION 'Expected 28 new Facelift trim features, inserted % -- rolled back', n; END IF;

  -- 4. Market data.
  UPDATE public.catalog_phases
     SET price_range_min_eur = 17900, avg_market_price_eur = 20545, price_range_max_eur = 26900,
         typical_mileage_range = '43,260 - 115,000 km'
   WHERE id = pid
     AND price_range_min_eur = 14000 AND avg_market_price_eur = 18000 AND price_range_max_eur = 25000
     AND typical_mileage_range = '40,000 - 100,000 km';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected the Facelift phase with the old market data, updated % -- rolled back', n; END IF;

  -- Post-checks.
  SELECT count(*) INTO n FROM public.catalog_trim_features f JOIN public.catalog_trims t ON t.id = f.trim_id
   WHERE t.phase_id = pid AND t.name IN ('Atelier', 'Loft', 'Lodge', 'Suite') AND f.feature NOT LIKE 'Sportpaket:%';
  IF n <> 28 THEN RAISE EXCEPTION 'Post-check: expected 28 Facelift line features, found % -- rolled back', n; END IF;

  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations WHERE phase_id = pid AND ev_range_km IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION 'Post-check: % Facelift configuration(s) still without a range -- rolled back', n; END IF;
END $$;

COMMIT;
