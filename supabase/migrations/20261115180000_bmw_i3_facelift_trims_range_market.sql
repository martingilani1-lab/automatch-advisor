-- BMW i3 (I01) Facelift: the 2026-11-10 verification decisions, rewritten against the LIVE
-- state of 2026-11-15. REPLACES 20261110230000 and 20261110233000, which were never run and must
-- NOT be run now (233000 would roll back: it expects the 94 Ah range to be NULL, but
-- 20261112120500 has since set it to 290, and the Facelift price max is 27 000 since
-- 20261115160000). Evidence: docs/intake/research/bmw-i3-i01-facelift.md (E3, E7, E11, E12).
--
-- 1. The "i3s" trim row is not a trim -> dropped (its 5 features), and the Sportpaket (SA 330)
--    recorded as an option on the four real interior lines. BMW Austria price list 11/2018 [E7]
--    gives the i3s its own model code (8P61); the Sportpaket: "20" Leichtmetallräder Styling 431
--    … Fahrzeugverbreiterung … 10mm Tieferlegung … Im Modell BMW i3s enthalten." Unchanged from
--    20261110230000. The i3s' 135 kW is already on the i3s engine rows.
-- 2. Facelift trim features rewritten to the BMW Austria price list 11/2018 [E7]: 15 old rows of
--    Atelier / Loft / Lodge / Suite out, 28 verified rows in (same set as 20261110233000 section 3;
--    what was wrong is listed there and in the research doc).
-- 3. i3 94 Ah Facelift range 290 -> 300 km NEDC. Martin, 2026-11-10 and again 2026-11-15 ("300").
--    ADAC Autokatalog BMW i3 (94 Ah) 11/17-09/18: "Reichweite NEFZ (elektrisch): 300 km" [E3];
--    BMW's own launch document gives "290 to 300 kilometres" (20261112120500 had stored the lower
--    end, flagged "change to 300 if Martin prefers").
--    The two facelift 94 Ah REx engines' con quoted the old figure ("235 vs 290 km NEDC") ->
--    "235 vs 300 km NEDC" (20261115120000 seed text), so the two pages agree.
-- 4. Facelift market data. Martin, 2026-11-15: min 15 000, average 20 545, max 27 000,
--    mileage "43,260 - 115,000 km".
--      average 20 545 + mileage: autobazar.eu 2026-11-10, 14 facelift BEV listings (MY 2018-2022,
--        cheapest 2 and dearest 2 cut) [E11, E12] -- Martin approved 2026-11-10.
--      max 27 000: source M (Martin saw facelift cars above 25 000), live since 20261115160000.
--      min 15 000: the 2018 94 Ah facelift cars seen 2026-11-15 ask 15 000-18 400 (SK
--        autobazar.eu 15 700; mobile.de DE 14 999-18 390 -- rex research doc M2), so the 11-10
--        minimum of 17 900 would have left them below the range.
--
-- DELETE + INSERT + UPDATE of existing rows -> Martin runs this in a FRESH SQL editor tab.
-- Count-guarded throughout against today's values; any mismatch rolls the whole file back.
-- Pre-facelift rows are not touched.

BEGIN;

DO $$
DECLARE n int; pid uuid; tid uuid;
BEGIN
  SELECT p.id INTO pid
    FROM public.catalog_phases p
    JOIN public.catalog_models m ON m.id = p.model_id
    JOIN public.catalog_brands b ON b.id = m.brand_id
   WHERE b.name = 'BMW' AND m.name = 'i3' AND p.generation_code = 'I01' AND p.phase_label = 'Facelift';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 i3 I01 Facelift phase, found % -- rolled back', n; END IF;

  -- 1. i3s trim -> Sportpaket option.
  SELECT t.id INTO tid FROM public.catalog_trims t WHERE t.phase_id = pid AND t.name = 'i3s';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 i3s trim on the Facelift, found % -- rolled back', n; END IF;

  DELETE FROM public.catalog_trim_features WHERE trim_id = tid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 5 THEN RAISE EXCEPTION 'Expected 5 features on the i3s trim, deleted % -- rolled back', n; END IF;

  DELETE FROM public.catalog_trims WHERE id = tid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected to delete 1 i3s trim, deleted % -- rolled back', n; END IF;

  -- 2a. Old features of the four interior lines (15 rows).
  DELETE FROM public.catalog_trim_features f
   USING public.catalog_trims t
   WHERE f.trim_id = t.id AND t.phase_id = pid
     AND t.name IN ('Atelier', 'Loft', 'Lodge', 'Suite')
     AND f.feature NOT LIKE 'Sportpaket:%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 15 THEN RAISE EXCEPTION 'Expected to delete 15 old Facelift trim features, deleted % -- rolled back', n; END IF;

  -- 2b. Verified set (28 rows) + the Sportpaket option on each line (4 rows).
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
    ('Suite', 'Heated front seats (must be ordered with Suite)', true, 'seat_comfort', NULL),
    ('Atelier', 'Sportpaket: 20-inch alloy wheels, wheel-arch widening, 10 mm lower sport suspension (standard on i3s)', true, 'suspension', NULL),
    ('Loft', 'Sportpaket: 20-inch alloy wheels, wheel-arch widening, 10 mm lower sport suspension (standard on i3s)', true, 'suspension', NULL),
    ('Lodge', 'Sportpaket: 20-inch alloy wheels, wheel-arch widening, 10 mm lower sport suspension (standard on i3s)', true, 'suspension', NULL),
    ('Suite', 'Sportpaket: 20-inch alloy wheels, wheel-arch widening, 10 mm lower sport suspension (standard on i3s)', true, 'suspension', NULL)
  )
  INSERT INTO public.catalog_trim_features (trim_id, feature, is_optional, feature_group, safety_feature_slug)
  SELECT t.id, v.feature, v.is_optional::boolean, v.feature_group::text, v.safety_feature_slug::text
    FROM v JOIN public.catalog_trims t ON t.phase_id = pid AND t.name = v.trim_name;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 32 THEN RAISE EXCEPTION 'Expected 32 new Facelift trim features (28 + 4 Sportpaket), inserted % -- rolled back', n; END IF;

  -- 3. 94 Ah Facelift range 290 -> 300, and the REx con that quotes it.
  UPDATE public.catalog_vehicle_configurations c
     SET ev_range_km = 300
    FROM public.catalog_engines e
   WHERE e.id = c.engine_id AND c.phase_id = pid
     AND e.code = 'i3-94Ah' AND e.power_kw = 125
     AND c.consumption_cycle = 'NEDC' AND c.ev_range_km = 290;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 Facelift i3-94Ah@125 row at 290 km, updated % -- rolled back', n; END IF;

  UPDATE public.catalog_engines
     SET cons = array_replace(cons,
           'About 120 kg heavier than the pure-EV i3 94 Ah with less usable electric range (235 vs 290 km NEDC)',
           'About 120 kg heavier than the pure-EV i3 94 Ah with less usable electric range (235 vs 300 km NEDC)')
   WHERE code IN ('i3-94Ah-REx-Euro6c', 'i3-94Ah-REx-Euro6dT')
     AND 'About 120 kg heavier than the pure-EV i3 94 Ah with less usable electric range (235 vs 290 km NEDC)' = ANY(cons);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 facelift REx engines quoting 290 km, updated % -- rolled back', n; END IF;

  -- 4. Market data.
  UPDATE public.catalog_phases
     SET price_range_min_eur = 15000, avg_market_price_eur = 20545,
         typical_mileage_range = '43,260 - 115,000 km'
   WHERE id = pid
     AND price_range_min_eur = 14000 AND avg_market_price_eur = 18000 AND price_range_max_eur = 27000
     AND typical_mileage_range = '40,000 - 100,000 km';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected the Facelift phase at 14000 / 18000 / 27000, updated % -- rolled back', n; END IF;

  -- Post-checks.
  SELECT count(*) INTO n FROM public.catalog_trims WHERE phase_id = pid;
  IF n <> 4 THEN RAISE EXCEPTION 'Post-check: expected 4 Facelift trims, found % -- rolled back', n; END IF;

  SELECT count(*) INTO n FROM public.catalog_trim_features f JOIN public.catalog_trims t ON t.id = f.trim_id
   WHERE t.phase_id = pid;
  IF n <> 32 THEN RAISE EXCEPTION 'Post-check: expected 32 Facelift trim features, found % -- rolled back', n; END IF;
END $$;

COMMIT;
