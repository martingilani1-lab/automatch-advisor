-- Imports reliability_rating/pros/cons/battery_kwh and common_faults from the old
-- (legacy, flat) engines table into catalog_engines/catalog_component_faults -- Step 2 of
-- the engine-import review (scripts/fill/engine-import-review.csv, resolved per Martin's
-- decisions, scripts/fill/engine-import-resolve.mjs). Generated, not hand-written --
-- regenerate via scripts/fill/generate-engine-import-migrations.mjs if the review CSV changes.
--
-- Read-only on `engines`/`vehicles` (the source); only catalog_engines/
-- catalog_component_faults are written, and only where genuinely new:
--   - reliability_rating/pros/cons/battery_kwh: COALESCE, so an already-non-NULL column
--     is never overwritten. 25 catalog_engines rows have a decided
--     winner (a clean single match, or the generation-matched variant in a conflicting
--     group); 8 more get faults only, below -- their pros/cons/reliability
--     stays NULL until a human picks a winner (scripts/fill/engine-import-review.csv's
--     remaining "UNDECIDED" rows -- 48 at generation time).
--   - common_faults: unioned across EVERY old row matched to that engine (case-insensitive
--     dedupe), not just the decided winner -- faults don't need a pros/cons tie-break,
--     per Martin's own separate rule for this column. Each INSERT is itself guarded
--     (WHERE NOT EXISTS, case-insensitive) against a fault already recorded for that
--     engine -- live-checked at run time, not precomputed, so it stays correct even if
--     this file sits unreviewed for a while and something else adds a fault first.
--
-- Row-count guards assert this file touched exactly what it expects to, before COMMIT.
-- Review-only: NOT run by this session. Run once, in a fresh SQL editor tab.

BEGIN;

-- Precondition: every engine this file touches must currently have reliability_rating,
-- pros, and cons all NULL (true for all 131 catalog_engines rows as of generation time) --
-- abort rather than silently no-op (COALESCE) over content this file didn't author if that's
-- drifted.
DO $$
DECLARE
  non_null_n integer;
BEGIN
  SELECT count(*) INTO non_null_n FROM catalog_engines
  WHERE id IN ('b01d37ac-8824-4477-9004-b1b3ced9a88c', 'f9c4f083-1d91-4f8a-890d-a8855b47f131', 'dea306e8-1816-4227-b280-655db27c27e0', 'b6f30f36-9fa9-4121-b6d1-446b050ff3a2', 'a7f345b8-79de-4e07-afac-90f40cfb00d9', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', '38cc4c07-40d9-4d29-abd6-fcb6c8ecffb2', '1170fe07-5a1b-4248-97ff-5a9a3290229d', 'fe18b681-8f87-4aaa-85bb-4b1940d69d21', 'f63671bc-1abf-45e8-8546-4c003bd639da', '7119968a-88bf-4a9b-8bab-ed326e493bc9', '575e1d41-3ace-43ed-b499-36ad4dfada44', '14edd59a-45e0-4220-8cac-6437e3504746', '56e7d259-9c9e-4bdb-a417-9667e65f1565', '96f26012-526b-45ed-abdf-b315edf29a31', 'aa21ae0c-1a44-4cbf-a9fc-384ee4559c22', '0234e87e-6732-492a-8de1-2db8727e9d48', '98ef04a8-a43c-4a27-b993-95b01fa8ce3d', '8955f0a7-c32d-4842-b84c-ed6a582daf9a', '40e4a099-46ec-4c8b-ab73-f70914b4a63a', 'd2ec9660-2b0e-42f5-8e65-a7b7b81599bd', 'fd42cf8b-50ae-41e2-9b8a-5fa880a0d79e', '93ebdf69-eadc-49fa-866c-864b3516b98d', 'f14d7405-6944-42e5-98fe-6c06c255bcf9', 'd033e108-f64b-4cdd-aade-8ed40883db76')
    AND (reliability_rating IS NOT NULL OR pros IS NOT NULL OR cons IS NOT NULL);
  IF non_null_n <> 0 THEN
    RAISE EXCEPTION 'Expected 0 of the % targeted catalog_engines rows to already have reliability_rating/pros/cons set, found % -- live state has drifted, aborting rather than silently skipping content this file did not author.', 25, non_null_n;
  END IF;
END $$;

-- 25 engines with a decided reliability/pros/cons winner.
-- CAYC@77
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['Modern common-rail — quieter than 1.9 TDI', 'Better emissions compliance', 'Consumption 4.0 – 5.0 l/100 km']::text[]),
  cons = COALESCE(cons, ARRAY['Less robust long-term than 1.9 TDI', 'DPF and EGR add maintenance complexity', 'Piezo injectors are costly']::text[])
WHERE id = 'b01d37ac-8824-4477-9004-b1b3ced9a88c';

-- CAXA@90
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 2),
  pros = COALESCE(pros, ARRAY['Good power for a 1.4 — 90 kW / 200 Nm', 'Reasonable consumption when healthy — 6.0 – 7.5 l/100 km', 'Turbo + supercharger provides broad torque band (twincharger variant)']::text[]),
  cons = COALESCE(cons, ARRAY['Timing chain is a known critical failure — 1,500 – 2,500 EUR repair', 'Carbon build-up adds maintenance cost', 'Below-average reliability drags down an otherwise good engine']::text[])
WHERE id = 'f9c4f083-1d91-4f8a-890d-a8855b47f131';

-- CHYA@44
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['Lowest consumption — 4.5 – 5.5 l/100 km', 'Simple design — cheap servicing', 'Lowest insurance in the range', 'No turbo to worry about']::text[]),
  cons = COALESCE(cons, ARRAY['Only 44 kW — insufficient on motorway', 'Three-cylinder vibrations felt in cabin', 'A/C noticeably saps power']::text[])
WHERE id = 'dea306e8-1816-4227-b280-655db27c27e0';

-- CJZC@66
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 3),
  pros = COALESCE(pros, ARRAY['Good power/economy balance — 5.0 – 6.5 l/100 km', 'Turbo liveliness for overtaking', 'Quieter than 1.0 MPI']::text[]),
  cons = COALESCE(cons, ARRAY['EA211 timing chain is a known weak point', 'Turbo adds complexity', 'Higher oil consumption on some units']::text[])
WHERE id = 'b6f30f36-9fa9-4121-b6d1-446b050ff3a2';

-- DLAA@81
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['Best balance of power and economy for daily use', 'Consumption 5.0 – 6.5 l/100 km real-world', 'Adequate for city, suburbs, and highway']::text[]),
  cons = COALESCE(cons, ARRAY['Three-cylinder vibration at idle — character not everyone likes', 'Still a small engine for loaded motorway cruising']::text[])
WHERE id = 'a7f345b8-79de-4e07-afac-90f40cfb00d9';

-- CZDA@110
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['Quiet and refined with strong output for 1.4 L', 'ACT saves fuel on highways — 5.5 – 6.5 l/100 km', 'Excellent for combined city/highway driving']::text[]),
  cons = COALESCE(cons, ARRAY['Higher consumption under hard driving (8 – 9 l/100 km)', 'Timing chain needs checking when buying used', 'ACT is another component to potentially service']::text[])
WHERE id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b';

-- BXE@77
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 5),
  pros = COALESCE(pros, ARRAY['Legendary reliability — routinely exceeds 400,000 km', 'Simple mechanical design — cheap to repair anywhere', 'Real-world consumption 4.5 – 5.5 l/100 km']::text[]),
  cons = COALESCE(cons, ARRAY['Outdated emissions — restricted in some low-emission zones', 'Noisier than modern TDI engines', 'No DPF on early models — fails emissions tests in some countries']::text[])
WHERE id = '38cc4c07-40d9-4d29-abd6-fcb6c8ecffb2';

-- BSE@75
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 5),
  pros = COALESCE(pros, ARRAY['Virtually indestructible naturally aspirated design', 'Cheapest possible maintenance and insurance', 'No timing chain or turbo to worry about']::text[]),
  cons = COALESCE(cons, ARRAY['Only 75 kW — sluggish on the motorway', 'Consumption 7.0 – 8.5 l/100 km — poor for a petrol', 'Zero fun factor — purely practical']::text[])
WHERE id = '1170fe07-5a1b-4248-97ff-5a9a3290229d';

-- DNUA@200
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 3),
  pros = COALESCE(pros, ARRAY['200 kW / 350 Nm — sports-car feel', '0 – 100 km/h in 5.8 s — fastest Superb', 'Quiet at cruising speeds']::text[]),
  cons = COALESCE(cons, ARRAY['Consumption 9 – 14 l/100 km', 'Only with DSG 6 and 4x4 — most expensive config', 'Highest insurance in the range']::text[])
WHERE id = 'fe18b681-8f87-4aaa-85bb-4b1940d69d21';

-- DKZA@140
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 3),
  pros = COALESCE(pros, ARRAY['Quieter and more refined than diesel', '140 kW / 320 Nm for sportier driving', 'No DPF/AdBlue worries']::text[]),
  cons = COALESCE(cons, ARRAY['Consumption 8.0 – 11.0 l/100 km', 'With AWD and DSG consumption rises further', 'Less common than diesel — smaller used selection']::text[])
WHERE id = 'f63671bc-1abf-45e8-8546-4c003bd639da';

-- CFHC@103
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['Best engine for Yeti — 103 kW / 320 Nm', 'Consumption 5.5 – 7.0 l/100 km with 4x4', 'Proven 2.0 TDI EA189 — robust reliability']::text[]),
  cons = COALESCE(cons, ARRAY['EA189 — check Dieselgate software fix status', 'Higher service cost than 1.6 TDI']::text[])
WHERE id = '7119968a-88bf-4a9b-8bab-ed326e493bc9';

-- CHYB@55
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 5),
  pros = COALESCE(pros, ARRAY['Slightly more liveable than 44 kW — better for mixed driving', 'Same bulletproof reliability', 'Consumption 4.5 – 6.0 l/100 km']::text[]),
  cons = COALESCE(cons, ARRAY['Still underpowered for motorway — just less painful', 'Three-cylinder character remains']::text[])
WHERE id = '575e1d41-3ace-43ed-b499-36ad4dfada44';

-- CZPC@147
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['147 kW / 320 Nm — genuine hot hatch performance', '0 – 100 in 6.7 s — quick for a supermini', 'Engaging driving experience']::text[]),
  cons = COALESCE(cons, ARRAY['Consumption 7.5 – 11 l/100 km', 'Premium insurance', 'Carbon cleaning adds periodic cost']::text[])
WHERE id = '14edd59a-45e0-4220-8cac-6437e3504746';

-- CRKB@81
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['Most economical Golf — 4.0 – 5.2 l/100 km', 'Adequate for relaxed driving', 'Cheap to maintain']::text[]),
  cons = COALESCE(cons, ARRAY['Only 81 kW — not exciting to drive', 'DPF sensitive to city-only use', 'Noisier at idle than TSI']::text[])
WHERE id = '56e7d259-9c9e-4bdb-a417-9667e65f1565';

-- DNFG@235
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['235 kW / 420 Nm — 0 to 100 in 4.7 s', '4MOTION AWD with torque vectoring', 'Drift mode and special driving profiles']::text[]),
  cons = COALESCE(cons, ARRAY['Consumption 9 – 14 l/100 km', 'Highest insurance and maintenance of any Golf', 'Haldex oil service adds cost']::text[])
WHERE id = '96f26012-526b-45ed-abdf-b315edf29a31';

-- DGTE@85
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['Most economical Touran — 4.5 – 5.5 l/100 km', 'Adequate for relaxed family driving']::text[]),
  cons = COALESCE(cons, ARRAY['Only 85 kW — underpowered for a loaded 7-seat MPV', 'DPF requires regular highway runs']::text[])
WHERE id = 'aa21ae0c-1a44-4cbf-a9fc-384ee4559c22';

-- DFYA@110
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['110 kW with 48V mild-hybrid — smooth and efficient', 'Economy 5.0 – 6.0 l/100 km with COD', 'Refined for a compact']::text[]),
  cons = COALESCE(cons, ARRAY['DQ200 on FWD auto — mechatronics risk', 'Timing chain monitoring']::text[])
WHERE id = '0234e87e-6732-492a-8de1-2db8727e9d48';

-- DNFC@245
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['245 kW / 400 Nm — 0-100 in 4.8 s', 'quattro AWD — usable year-round', 'Upgraded over previous S3']::text[]),
  cons = COALESCE(cons, ARRAY['Consumption 7.5 – 11 l/100 km', 'Premium insurance']::text[])
WHERE id = '98ef04a8-a43c-4a27-b993-95b01fa8ce3d';

-- DETA@140
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['Best A4 engine — 140 kW / 400 Nm with quattro', 'Economy 4.8 – 5.8 l/100 km', 'Paired with wet-clutch S-tronic — no DQ200 issues']::text[]),
  cons = COALESCE(cons, ARRAY['DPF needs highway driving', 'quattro adds weight and consumption']::text[])
WHERE id = '8955f0a7-c32d-4842-b84c-ed6a582daf9a';

-- CVKB@140
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['Smooth 140 kW turbo four', 'No DPF/AdBlue concerns', 'Economy 5.5 – 7.0 l/100 km']::text[]),
  cons = COALESCE(cons, ARRAY['Paired with DQ200 on FWD — mechatronics risk', 'Water pump is a known issue', 'Carbon cleaning adds cost']::text[])
WHERE id = '40e4a099-46ec-4c8b-ab73-f70914b4a63a';

-- CVNA@110
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['Adequate for daily A4 use', 'Good economy with COD', 'Lower insurance than 2.0']::text[]),
  cons = COALESCE(cons, ARRAY['DQ200 risk on FWD', 'Only 110 kW — underpowered for a D-segment car', 'Timing chain monitoring']::text[])
WHERE id = 'd2ec9660-2b0e-42f5-8e65-a7b7b81599bd';

-- DEUA@110
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['Economy champion — 4.0 – 5.0 l/100 km', 'Adequate 110 kW for relaxed driving', 'Proven diesel']::text[]),
  cons = COALESCE(cons, ARRAY['Only 110 kW — adequate but not exciting', 'DPF needs highway drives']::text[])
WHERE id = 'fd42cf8b-50ae-41e2-9b8a-5fa880a0d79e';

-- CJXC@221
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['221 kW — genuine hot hatch', 'Same EA888 as Golf R/S3', 'Progressive steering']::text[]),
  cons = COALESCE(cons, ARRAY['Consumption 7.5 – 11 l/100 km', 'Torque steer on FWD']::text[])
WHERE id = '93ebdf69-eadc-49fa-866c-864b3516b98d';

-- CHHC@169
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['169 kW / 370 Nm with quattro — proper sports car', 'Economy 6.0 – 7.5 l/100 km', 'Wet S-tronic on quattro — reliable']::text[]),
  cons = COALESCE(cons, ARRAY['Water pump monitoring', 'Carbon cleaning at higher mileage']::text[])
WHERE id = 'f14d7405-6944-42e5-98fe-6c06c255bcf9';

-- DAZA@294
UPDATE catalog_engines SET
  reliability_rating = COALESCE(reliability_rating, 4),
  pros = COALESCE(pros, ARRAY['294 kW 5-cylinder — one of the best sounding engines EVER', '0-100 in 3.7 s — supercar pace', 'Values holding well — future classic']::text[]),
  cons = COALESCE(cons, ARRAY['Consumption 8.5 – 13 l/100 km', 'Premium insurance', 'Track use stresses everything']::text[])
WHERE id = 'd033e108-f64b-4cdd-aade-8ed40883db76';

-- Postcondition: every targeted engine now has reliability_rating/pros/cons set (they were
-- all NULL going in, per the precondition above -- this just confirms the COALESCE fill
-- actually landed, not that nothing else touched these rows concurrently).
DO $$
DECLARE
  filled_n integer;
BEGIN
  SELECT count(*) INTO filled_n FROM catalog_engines
  WHERE id IN ('b01d37ac-8824-4477-9004-b1b3ced9a88c', 'f9c4f083-1d91-4f8a-890d-a8855b47f131', 'dea306e8-1816-4227-b280-655db27c27e0', 'b6f30f36-9fa9-4121-b6d1-446b050ff3a2', 'a7f345b8-79de-4e07-afac-90f40cfb00d9', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', '38cc4c07-40d9-4d29-abd6-fcb6c8ecffb2', '1170fe07-5a1b-4248-97ff-5a9a3290229d', 'fe18b681-8f87-4aaa-85bb-4b1940d69d21', 'f63671bc-1abf-45e8-8546-4c003bd639da', '7119968a-88bf-4a9b-8bab-ed326e493bc9', '575e1d41-3ace-43ed-b499-36ad4dfada44', '14edd59a-45e0-4220-8cac-6437e3504746', '56e7d259-9c9e-4bdb-a417-9667e65f1565', '96f26012-526b-45ed-abdf-b315edf29a31', 'aa21ae0c-1a44-4cbf-a9fc-384ee4559c22', '0234e87e-6732-492a-8de1-2db8727e9d48', '98ef04a8-a43c-4a27-b993-95b01fa8ce3d', '8955f0a7-c32d-4842-b84c-ed6a582daf9a', '40e4a099-46ec-4c8b-ab73-f70914b4a63a', 'd2ec9660-2b0e-42f5-8e65-a7b7b81599bd', 'fd42cf8b-50ae-41e2-9b8a-5fa880a0d79e', '93ebdf69-eadc-49fa-866c-864b3516b98d', 'f14d7405-6944-42e5-98fe-6c06c255bcf9', 'd033e108-f64b-4cdd-aade-8ed40883db76')
    AND reliability_rating IS NOT NULL AND pros IS NOT NULL AND cons IS NOT NULL;
  IF filled_n <> 25 THEN
    RAISE EXCEPTION 'Expected all % targeted engines to have reliability_rating/pros/cons filled, found %.', 25, filled_n;
  END IF;
END $$;

-- 180 faults across 33 engines (decided and still-undecided alike --
-- faults don't wait on a pros/cons winner). Each guarded individually against a
-- case-insensitive duplicate already on that engine.
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a0e64f01-c8b1-4e74-8fd4-f67421a41417', 'Timing chain stretching — primary and expensive concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a0e64f01-c8b1-4e74-8fd4-f67421a41417' AND lower(fault) = lower('Timing chain stretching — primary and expensive concern')
); -- CBZB@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a0e64f01-c8b1-4e74-8fd4-f67421a41417', 'Water pump leak 60 – 80k km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a0e64f01-c8b1-4e74-8fd4-f67421a41417' AND lower(fault) = lower('Water pump leak 60 – 80k km')
); -- CBZB@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a0e64f01-c8b1-4e74-8fd4-f67421a41417', 'Turbo diverter valve — boost leaks', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a0e64f01-c8b1-4e74-8fd4-f67421a41417' AND lower(fault) = lower('Turbo diverter valve — boost leaks')
); -- CBZB@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a0e64f01-c8b1-4e74-8fd4-f67421a41417', 'Timing chain stretching — the primary concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a0e64f01-c8b1-4e74-8fd4-f67421a41417' AND lower(fault) = lower('Timing chain stretching — the primary concern')
); -- CBZB@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a0e64f01-c8b1-4e74-8fd4-f67421a41417', 'Water pump leak 60,000 – 80,000 km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a0e64f01-c8b1-4e74-8fd4-f67421a41417' AND lower(fault) = lower('Water pump leak 60,000 – 80,000 km')
); -- CBZB@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a0e64f01-c8b1-4e74-8fd4-f67421a41417', 'Turbo diverter valve boost leaks', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a0e64f01-c8b1-4e74-8fd4-f67421a41417' AND lower(fault) = lower('Turbo diverter valve boost leaks')
); -- CBZB@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a0e64f01-c8b1-4e74-8fd4-f67421a41417', 'Timing chain stretching — number one concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a0e64f01-c8b1-4e74-8fd4-f67421a41417' AND lower(fault) = lower('Timing chain stretching — number one concern')
); -- CBZB@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a0e64f01-c8b1-4e74-8fd4-f67421a41417', 'Timing chain stretching — number one concern and critical', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a0e64f01-c8b1-4e74-8fd4-f67421a41417' AND lower(fault) = lower('Timing chain stretching — number one concern and critical')
); -- CBZB@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a0e64f01-c8b1-4e74-8fd4-f67421a41417', 'Ignition coil misfires', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a0e64f01-c8b1-4e74-8fd4-f67421a41417' AND lower(fault) = lower('Ignition coil misfires')
); -- CBZB@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'b01d37ac-8824-4477-9004-b1b3ced9a88c', 'DPF clogging with short urban trips', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'b01d37ac-8824-4477-9004-b1b3ced9a88c' AND lower(fault) = lower('DPF clogging with short urban trips')
); -- CAYC@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'b01d37ac-8824-4477-9004-b1b3ced9a88c', 'EGR carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'b01d37ac-8824-4477-9004-b1b3ced9a88c' AND lower(fault) = lower('EGR carbon build-up')
); -- CAYC@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'b01d37ac-8824-4477-9004-b1b3ced9a88c', 'Piezo injectors — expensive to replace', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'b01d37ac-8824-4477-9004-b1b3ced9a88c' AND lower(fault) = lower('Piezo injectors — expensive to replace')
); -- CAYC@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'b01d37ac-8824-4477-9004-b1b3ced9a88c', 'Intake manifold swirl flap failure', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'b01d37ac-8824-4477-9004-b1b3ced9a88c' AND lower(fault) = lower('Intake manifold swirl flap failure')
); -- CAYC@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'b01d37ac-8824-4477-9004-b1b3ced9a88c', 'DPF clogging with short trips', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'b01d37ac-8824-4477-9004-b1b3ced9a88c' AND lower(fault) = lower('DPF clogging with short trips')
); -- CAYC@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'b01d37ac-8824-4477-9004-b1b3ced9a88c', 'Piezo injectors expensive', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'b01d37ac-8824-4477-9004-b1b3ced9a88c' AND lower(fault) = lower('Piezo injectors expensive')
); -- CAYC@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'b01d37ac-8824-4477-9004-b1b3ced9a88c', 'Piezo injectors — expensive replacement', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'b01d37ac-8824-4477-9004-b1b3ced9a88c' AND lower(fault) = lower('Piezo injectors — expensive replacement')
); -- CAYC@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'b01d37ac-8824-4477-9004-b1b3ced9a88c', 'Piezo injectors expensive to replace', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'b01d37ac-8824-4477-9004-b1b3ced9a88c' AND lower(fault) = lower('Piezo injectors expensive to replace')
); -- CAYC@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'f9c4f083-1d91-4f8a-890d-a8855b47f131', 'Timing chain tensioner failure — critical and expensive', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'f9c4f083-1d91-4f8a-890d-a8855b47f131' AND lower(fault) = lower('Timing chain tensioner failure — critical and expensive')
); -- CAXA@90
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'f9c4f083-1d91-4f8a-890d-a8855b47f131', 'Water pump and thermostat leak', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'f9c4f083-1d91-4f8a-890d-a8855b47f131' AND lower(fault) = lower('Water pump and thermostat leak')
); -- CAXA@90
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'f9c4f083-1d91-4f8a-890d-a8855b47f131', 'Carbon build-up on intake valves', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'f9c4f083-1d91-4f8a-890d-a8855b47f131' AND lower(fault) = lower('Carbon build-up on intake valves')
); -- CAXA@90
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'f9c4f083-1d91-4f8a-890d-a8855b47f131', 'Oil consumption increase over time', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'f9c4f083-1d91-4f8a-890d-a8855b47f131' AND lower(fault) = lower('Oil consumption increase over time')
); -- CAXA@90
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7269415-4eae-4d33-9c37-2e4bbd6b8b0a', 'DPF', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7269415-4eae-4d33-9c37-2e4bbd6b8b0a' AND lower(fault) = lower('DPF')
); -- DFFA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7269415-4eae-4d33-9c37-2e4bbd6b8b0a', 'AdBlue sensor and injector failures', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7269415-4eae-4d33-9c37-2e4bbd6b8b0a' AND lower(fault) = lower('AdBlue sensor and injector failures')
); -- DFFA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7269415-4eae-4d33-9c37-2e4bbd6b8b0a', 'Oil pump — EA288 Evo family concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7269415-4eae-4d33-9c37-2e4bbd6b8b0a' AND lower(fault) = lower('Oil pump — EA288 Evo family concern')
); -- DFFA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7269415-4eae-4d33-9c37-2e4bbd6b8b0a', 'DPF with city driving', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7269415-4eae-4d33-9c37-2e4bbd6b8b0a' AND lower(fault) = lower('DPF with city driving')
); -- DFFA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7269415-4eae-4d33-9c37-2e4bbd6b8b0a', 'EGR carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7269415-4eae-4d33-9c37-2e4bbd6b8b0a' AND lower(fault) = lower('EGR carbon build-up')
); -- DFFA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'dea306e8-1816-4227-b280-655db27c27e0', 'Three-cylinder vibrations — engine mount wear', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'dea306e8-1816-4227-b280-655db27c27e0' AND lower(fault) = lower('Three-cylinder vibrations — engine mount wear')
); -- CHYA@44
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'dea306e8-1816-4227-b280-655db27c27e0', 'Ignition coils at higher mileage', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'dea306e8-1816-4227-b280-655db27c27e0' AND lower(fault) = lower('Ignition coils at higher mileage')
); -- CHYA@44
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'dea306e8-1816-4227-b280-655db27c27e0', 'Thermostat sticking', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'dea306e8-1816-4227-b280-655db27c27e0' AND lower(fault) = lower('Thermostat sticking')
); -- CHYA@44
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'dea306e8-1816-4227-b280-655db27c27e0', 'Exhaust heat shield rattle', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'dea306e8-1816-4227-b280-655db27c27e0' AND lower(fault) = lower('Exhaust heat shield rattle')
); -- CHYA@44
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'dea306e8-1816-4227-b280-655db27c27e0', 'Ignition coils at very high mileage', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'dea306e8-1816-4227-b280-655db27c27e0' AND lower(fault) = lower('Ignition coils at very high mileage')
); -- CHYA@44
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'dea306e8-1816-4227-b280-655db27c27e0', 'Thermostat — rare sticking', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'dea306e8-1816-4227-b280-655db27c27e0' AND lower(fault) = lower('Thermostat — rare sticking')
); -- CHYA@44
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'b6f30f36-9fa9-4121-b6d1-446b050ff3a2', 'Timing chain stretching — listen for rattle on startup', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'b6f30f36-9fa9-4121-b6d1-446b050ff3a2' AND lower(fault) = lower('Timing chain stretching — listen for rattle on startup')
); -- CJZC@66
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'b6f30f36-9fa9-4121-b6d1-446b050ff3a2', 'Water pump leak around 60 – 80k km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'b6f30f36-9fa9-4121-b6d1-446b050ff3a2' AND lower(fault) = lower('Water pump leak around 60 – 80k km')
); -- CJZC@66
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'b6f30f36-9fa9-4121-b6d1-446b050ff3a2', 'Ignition coil misfires', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'b6f30f36-9fa9-4121-b6d1-446b050ff3a2' AND lower(fault) = lower('Ignition coil misfires')
); -- CJZC@66
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'b6f30f36-9fa9-4121-b6d1-446b050ff3a2', 'Turbo boost valve — power loss', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'b6f30f36-9fa9-4121-b6d1-446b050ff3a2' AND lower(fault) = lower('Turbo boost valve — power loss')
); -- CJZC@66
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7f345b8-79de-4e07-afac-90f40cfb00d9', 'Timing chain tensioner — monitor on early builds', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7f345b8-79de-4e07-afac-90f40cfb00d9' AND lower(fault) = lower('Timing chain tensioner — monitor on early builds')
); -- DLAA@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7f345b8-79de-4e07-afac-90f40cfb00d9', 'Water pump plastic impeller leak possible', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7f345b8-79de-4e07-afac-90f40cfb00d9' AND lower(fault) = lower('Water pump plastic impeller leak possible')
); -- DLAA@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7f345b8-79de-4e07-afac-90f40cfb00d9', 'Turbo wastegate occasional rattle at idle', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7f345b8-79de-4e07-afac-90f40cfb00d9' AND lower(fault) = lower('Turbo wastegate occasional rattle at idle')
); -- DLAA@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7f345b8-79de-4e07-afac-90f40cfb00d9', 'Timing chain tensioner — same 1.0 TSI concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7f345b8-79de-4e07-afac-90f40cfb00d9' AND lower(fault) = lower('Timing chain tensioner — same 1.0 TSI concern')
); -- DLAA@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7f345b8-79de-4e07-afac-90f40cfb00d9', 'Water pump plastic impeller leak', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7f345b8-79de-4e07-afac-90f40cfb00d9' AND lower(fault) = lower('Water pump plastic impeller leak')
); -- DLAA@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7f345b8-79de-4e07-afac-90f40cfb00d9', 'Turbo wastegate occasional rattle', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7f345b8-79de-4e07-afac-90f40cfb00d9' AND lower(fault) = lower('Turbo wastegate occasional rattle')
); -- DLAA@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7f345b8-79de-4e07-afac-90f40cfb00d9', 'Timing chain tensioner early builds', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7f345b8-79de-4e07-afac-90f40cfb00d9' AND lower(fault) = lower('Timing chain tensioner early builds')
); -- DLAA@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7f345b8-79de-4e07-afac-90f40cfb00d9', 'Water pump plastic impeller', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7f345b8-79de-4e07-afac-90f40cfb00d9' AND lower(fault) = lower('Water pump plastic impeller')
); -- DLAA@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7f345b8-79de-4e07-afac-90f40cfb00d9', 'Turbo wastegate rattle', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7f345b8-79de-4e07-afac-90f40cfb00d9' AND lower(fault) = lower('Turbo wastegate rattle')
); -- DLAA@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'a7f345b8-79de-4e07-afac-90f40cfb00d9', 'Timing chain tensioner — monitor early builds', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'a7f345b8-79de-4e07-afac-90f40cfb00d9' AND lower(fault) = lower('Timing chain tensioner — monitor early builds')
); -- DLAA@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Water pump same 1.5 TSI family concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Water pump same 1.5 TSI family concern')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'OPF clogging with exclusively short trips', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('OPF clogging with exclusively short trips')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Water pump same family issue', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Water pump same family issue')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'OPF clogging with short city trips', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('OPF clogging with short city trips')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Water pump plastic impeller — leak possible', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Water pump plastic impeller — leak possible')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Timing chain stretch', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Timing chain stretch')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'DQ200 on auto', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('DQ200 on auto')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Water pump same concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Water pump same concern')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'OPF clogging with short trips only', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('OPF clogging with short trips only')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Timing chain improved but still monitor', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Timing chain improved but still monitor')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Water pump — same family issue', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Water pump — same family issue')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'OPF clogging with short trips', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('OPF clogging with short trips')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Water pump plastic impeller', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Water pump plastic impeller')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Water pump — same 1.5 TSI concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Water pump — same 1.5 TSI concern')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Timing chain stretch at higher mileage', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Timing chain stretch at higher mileage')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Carbon build-up')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Paired with DQ200 on auto', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Paired with DQ200 on auto')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'eb01556d-9347-4072-bea1-2f0186a05012', 'Paired with DQ200 on FWD', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'eb01556d-9347-4072-bea1-2f0186a05012' AND lower(fault) = lower('Paired with DQ200 on FWD')
); -- DADA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '0ca7d37a-1b5d-469a-949f-0d000e5a4ae9', 'Timing chain tensioner early wear on some units', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '0ca7d37a-1b5d-469a-949f-0d000e5a4ae9' AND lower(fault) = lower('Timing chain tensioner early wear on some units')
); -- CHZB@70
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '0ca7d37a-1b5d-469a-949f-0d000e5a4ae9', 'Turbo wastegate rattle', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '0ca7d37a-1b5d-469a-949f-0d000e5a4ae9' AND lower(fault) = lower('Turbo wastegate rattle')
); -- CHZB@70
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '0ca7d37a-1b5d-469a-949f-0d000e5a4ae9', 'Water pump leak around 60,000 km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '0ca7d37a-1b5d-469a-949f-0d000e5a4ae9' AND lower(fault) = lower('Water pump leak around 60,000 km')
); -- CHZB@70
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '0ca7d37a-1b5d-469a-949f-0d000e5a4ae9', 'Timing chain tensioner', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '0ca7d37a-1b5d-469a-949f-0d000e5a4ae9' AND lower(fault) = lower('Timing chain tensioner')
); -- CHZB@70
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '0ca7d37a-1b5d-469a-949f-0d000e5a4ae9', 'Three-cylinder vibration', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '0ca7d37a-1b5d-469a-949f-0d000e5a4ae9' AND lower(fault) = lower('Three-cylinder vibration')
); -- CHZB@70
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '0ca7d37a-1b5d-469a-949f-0d000e5a4ae9', 'Too new for major issues', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '0ca7d37a-1b5d-469a-949f-0d000e5a4ae9' AND lower(fault) = lower('Too new for major issues')
); -- CHZB@70
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'Oil seepage through turbo — check consumption', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('Oil seepage through turbo — check consumption')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'EGR cooler cracking at higher mileage', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('EGR cooler cracking at higher mileage')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'DMF wear at 130,000 – 180,000 km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('DMF wear at 130,000 – 180,000 km')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'Injectors — carbon build-up after 150,000+ km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('Injectors — carbon build-up after 150,000+ km')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'DPF regeneration issues with urban driving', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('DPF regeneration issues with urban driving')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'DMF wear around 150,000 km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('DMF wear around 150,000 km')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'EGR cooler cracking', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('EGR cooler cracking')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'DMF wear at 130 – 180k km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('DMF wear at 130 – 180k km')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'Injectors — carbon build-up after 150k+ km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('Injectors — carbon build-up after 150k+ km')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'Injector carbon build-up after 150k+ km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('Injector carbon build-up after 150k+ km')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'DPF with city driving', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('DPF with city driving')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'EGR carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('EGR carbon build-up')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'DPF clogging with city driving', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('DPF clogging with city driving')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'AdBlue system on later cars', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('AdBlue system on later cars')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'Same EA288 concerns', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('Same EA288 concerns')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '5cca43f2-9499-47df-83e4-e5c9af808f38', 'Haldex coupling fluid change every 60k km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '5cca43f2-9499-47df-83e4-e5c9af808f38' AND lower(fault) = lower('Haldex coupling fluid change every 60k km')
); -- CRBC@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'Oil pump occasional issues at higher mileage', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('Oil pump occasional issues at higher mileage')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'AdBlue system sensor and pump failures', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('AdBlue system sensor and pump failures')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'EGR improved but still sensitive to urban driving', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('EGR improved but still sensitive to urban driving')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'Oil pump chain tensioner concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('Oil pump chain tensioner concern')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'AdBlue sensor/pump failures', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('AdBlue sensor/pump failures')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'EGR sensitive to urban-only driving', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('EGR sensitive to urban-only driving')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'Oil pump chain slack — EA288 concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('Oil pump chain slack — EA288 concern')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'DPF requires regular highway drives', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('DPF requires regular highway drives')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'Oil pump chain slack', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('Oil pump chain slack')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'AdBlue failures', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('AdBlue failures')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'Haldex coupling requires 60k km oil change', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('Haldex coupling requires 60k km oil change')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'DPF needs highway driving', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('DPF needs highway driving')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'DPF needs regular highway drives', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('DPF needs regular highway drives')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'Haldex coupling needs 60k km oil change', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('Haldex coupling needs 60k km oil change')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'Oil pump chain concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('Oil pump chain concern')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'AdBlue sensor failures', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('AdBlue sensor failures')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '11959a05-1db6-4740-aa98-6f98fd995ca8', 'DPF needs highway drives', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '11959a05-1db6-4740-aa98-6f98fd995ca8' AND lower(fault) = lower('DPF needs highway drives')
); -- DFGA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', 'Timing chain stretching on earlier builds — listen for rattle', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b' AND lower(fault) = lower('Timing chain stretching on earlier builds — listen for rattle')
); -- CZDA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', 'Water pump with thermostat — leak around 80,000 km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b' AND lower(fault) = lower('Water pump with thermostat — leak around 80,000 km')
); -- CZDA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', 'ACT cylinder deactivation — occasional vibrations', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b' AND lower(fault) = lower('ACT cylinder deactivation — occasional vibrations')
); -- CZDA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', 'Timing chain stretching on earlier builds', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b' AND lower(fault) = lower('Timing chain stretching on earlier builds')
); -- CZDA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', 'Water pump with thermostat leak around 80k km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b' AND lower(fault) = lower('Water pump with thermostat leak around 80k km')
); -- CZDA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', 'ACT cylinder deactivation vibrations', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b' AND lower(fault) = lower('ACT cylinder deactivation vibrations')
); -- CZDA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', 'Timing chain stretch', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b' AND lower(fault) = lower('Timing chain stretch')
); -- CZDA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', 'DQ200 on auto', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b' AND lower(fault) = lower('DQ200 on auto')
); -- CZDA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', 'Carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b' AND lower(fault) = lower('Carbon build-up')
); -- CZDA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', 'Timing chain stretch at higher mileage', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b' AND lower(fault) = lower('Timing chain stretch at higher mileage')
); -- CZDA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', 'Carbon build-up with city driving', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b' AND lower(fault) = lower('Carbon build-up with city driving')
); -- CZDA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b', 'Water pump failure', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '17a3aa0d-a5b8-4a67-814e-6bd41dd3f03b' AND lower(fault) = lower('Water pump failure')
); -- CZDA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '4a84b959-e99a-4d00-a3b2-e2272acc53d5', 'Increased oil consumption — check every 1,000 km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '4a84b959-e99a-4d00-a3b2-e2272acc53d5' AND lower(fault) = lower('Increased oil consumption — check every 1,000 km')
); -- CHHA@169
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '4a84b959-e99a-4d00-a3b2-e2272acc53d5', 'Carbon deposits on intake valves (direct injection)', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '4a84b959-e99a-4d00-a3b2-e2272acc53d5' AND lower(fault) = lower('Carbon deposits on intake valves (direct injection)')
); -- CHHA@169
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '4a84b959-e99a-4d00-a3b2-e2272acc53d5', 'Turbo — higher stress, shorter life under hard driving', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '4a84b959-e99a-4d00-a3b2-e2272acc53d5' AND lower(fault) = lower('Turbo — higher stress, shorter life under hard driving')
); -- CHHA@169
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '4a84b959-e99a-4d00-a3b2-e2272acc53d5', 'Water pump — same issue as 1.4 TSI', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '4a84b959-e99a-4d00-a3b2-e2272acc53d5' AND lower(fault) = lower('Water pump — same issue as 1.4 TSI')
); -- CHHA@169
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '4a84b959-e99a-4d00-a3b2-e2272acc53d5', 'Carbon deposits on intake valves', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '4a84b959-e99a-4d00-a3b2-e2272acc53d5' AND lower(fault) = lower('Carbon deposits on intake valves')
); -- CHHA@169
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '4a84b959-e99a-4d00-a3b2-e2272acc53d5', 'Oil consumption — check every 1,000 km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '4a84b959-e99a-4d00-a3b2-e2272acc53d5' AND lower(fault) = lower('Oil consumption — check every 1,000 km')
); -- CHHA@169
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '4a84b959-e99a-4d00-a3b2-e2272acc53d5', 'Water pump leak', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '4a84b959-e99a-4d00-a3b2-e2272acc53d5' AND lower(fault) = lower('Water pump leak')
); -- CHHA@169
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '4a84b959-e99a-4d00-a3b2-e2272acc53d5', 'Turbo stress under track use', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '4a84b959-e99a-4d00-a3b2-e2272acc53d5' AND lower(fault) = lower('Turbo stress under track use')
); -- CHHA@169
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '38cc4c07-40d9-4d29-abd6-fcb6c8ecffb2', 'Turbo actuator sticking and loss of boost', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '38cc4c07-40d9-4d29-abd6-fcb6c8ecffb2' AND lower(fault) = lower('Turbo actuator sticking and loss of boost')
); -- BXE@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '38cc4c07-40d9-4d29-abd6-fcb6c8ecffb2', 'Injector seals — diesel leak (black death)', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '38cc4c07-40d9-4d29-abd6-fcb6c8ecffb2' AND lower(fault) = lower('Injector seals — diesel leak (black death)')
); -- BXE@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '38cc4c07-40d9-4d29-abd6-fcb6c8ecffb2', 'EGR valve clogging at higher mileage', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '38cc4c07-40d9-4d29-abd6-fcb6c8ecffb2' AND lower(fault) = lower('EGR valve clogging at higher mileage')
); -- BXE@77
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '1170fe07-5a1b-4248-97ff-5a9a3290229d', 'Practically nothing — one of the most trouble-free VW engines ever', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '1170fe07-5a1b-4248-97ff-5a9a3290229d' AND lower(fault) = lower('Practically nothing — one of the most trouble-free VW engines ever')
); -- BSE@75
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '1170fe07-5a1b-4248-97ff-5a9a3290229d', 'Ignition coils — rare failure at extreme mileage', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '1170fe07-5a1b-4248-97ff-5a9a3290229d' AND lower(fault) = lower('Ignition coils — rare failure at extreme mileage')
); -- BSE@75
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '7486fdd1-b0cd-4f97-83b6-f86bfd178864', 'DMF wear at high mileage', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '7486fdd1-b0cd-4f97-83b6-f86bfd178864' AND lower(fault) = lower('DMF wear at high mileage')
); -- DFHA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '7486fdd1-b0cd-4f97-83b6-f86bfd178864', 'AdBlue sensor/pump failures after 80,000+ km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '7486fdd1-b0cd-4f97-83b6-f86bfd178864' AND lower(fault) = lower('AdBlue sensor/pump failures after 80,000+ km')
); -- DFHA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '7486fdd1-b0cd-4f97-83b6-f86bfd178864', 'Oil pump — known EA288 concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '7486fdd1-b0cd-4f97-83b6-f86bfd178864' AND lower(fault) = lower('Oil pump — known EA288 concern')
); -- DFHA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '7486fdd1-b0cd-4f97-83b6-f86bfd178864', 'AdBlue sensor/pump failures', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '7486fdd1-b0cd-4f97-83b6-f86bfd178864' AND lower(fault) = lower('AdBlue sensor/pump failures')
); -- DFHA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '7486fdd1-b0cd-4f97-83b6-f86bfd178864', 'Oil pump chain concern', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '7486fdd1-b0cd-4f97-83b6-f86bfd178864' AND lower(fault) = lower('Oil pump chain concern')
); -- DFHA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'fe18b681-8f87-4aaa-85bb-4b1940d69d21', 'Increased oil consumption — check every 1,000 km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'fe18b681-8f87-4aaa-85bb-4b1940d69d21' AND lower(fault) = lower('Increased oil consumption — check every 1,000 km')
); -- DNUA@200
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'fe18b681-8f87-4aaa-85bb-4b1940d69d21', 'Carbon deposits on intake valves', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'fe18b681-8f87-4aaa-85bb-4b1940d69d21' AND lower(fault) = lower('Carbon deposits on intake valves')
); -- DNUA@200
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'fe18b681-8f87-4aaa-85bb-4b1940d69d21', 'Water pump coolant leak', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'fe18b681-8f87-4aaa-85bb-4b1940d69d21' AND lower(fault) = lower('Water pump coolant leak')
); -- DNUA@200
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'f63671bc-1abf-45e8-8546-4c003bd639da', 'Oil consumption — check every 1,000 – 2,000 km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'f63671bc-1abf-45e8-8546-4c003bd639da' AND lower(fault) = lower('Oil consumption — check every 1,000 – 2,000 km')
); -- DKZA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'f63671bc-1abf-45e8-8546-4c003bd639da', 'Carbon deposits on intake valves', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'f63671bc-1abf-45e8-8546-4c003bd639da' AND lower(fault) = lower('Carbon deposits on intake valves')
); -- DKZA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'f63671bc-1abf-45e8-8546-4c003bd639da', 'Water pump plastic ring leak', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'f63671bc-1abf-45e8-8546-4c003bd639da' AND lower(fault) = lower('Water pump plastic ring leak')
); -- DKZA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'f63671bc-1abf-45e8-8546-4c003bd639da', 'Turbo noise after 100,000+ km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'f63671bc-1abf-45e8-8546-4c003bd639da' AND lower(fault) = lower('Turbo noise after 100,000+ km')
); -- DKZA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'f63671bc-1abf-45e8-8546-4c003bd639da', 'Oil consumption — check regularly', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'f63671bc-1abf-45e8-8546-4c003bd639da' AND lower(fault) = lower('Oil consumption — check regularly')
); -- DKZA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'f63671bc-1abf-45e8-8546-4c003bd639da', 'Carbon build-up on intake valves', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'f63671bc-1abf-45e8-8546-4c003bd639da' AND lower(fault) = lower('Carbon build-up on intake valves')
); -- DKZA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '7119968a-88bf-4a9b-8bab-ed326e493bc9', 'Turbo actuator sticking at higher mileage', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '7119968a-88bf-4a9b-8bab-ed326e493bc9' AND lower(fault) = lower('Turbo actuator sticking at higher mileage')
); -- CFHC@103
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '7119968a-88bf-4a9b-8bab-ed326e493bc9', 'DMF wear 150 – 200k km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '7119968a-88bf-4a9b-8bab-ed326e493bc9' AND lower(fault) = lower('DMF wear 150 – 200k km')
); -- CFHC@103
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '7119968a-88bf-4a9b-8bab-ed326e493bc9', 'EGR cooler cracking on high-mileage units', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '7119968a-88bf-4a9b-8bab-ed326e493bc9' AND lower(fault) = lower('EGR cooler cracking on high-mileage units')
); -- CFHC@103
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '575e1d41-3ace-43ed-b499-36ad4dfada44', 'Same minimal issues as 44 kW version', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '575e1d41-3ace-43ed-b499-36ad4dfada44' AND lower(fault) = lower('Same minimal issues as 44 kW version')
); -- CHYB@55
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '14edd59a-45e0-4220-8cac-6437e3504746', 'Carbon build-up on intake valves', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '14edd59a-45e0-4220-8cac-6437e3504746' AND lower(fault) = lower('Carbon build-up on intake valves')
); -- CZPC@147
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '14edd59a-45e0-4220-8cac-6437e3504746', 'Water pump leak', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '14edd59a-45e0-4220-8cac-6437e3504746' AND lower(fault) = lower('Water pump leak')
); -- CZPC@147
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '14edd59a-45e0-4220-8cac-6437e3504746', 'OPF clogging with city-only use', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '14edd59a-45e0-4220-8cac-6437e3504746' AND lower(fault) = lower('OPF clogging with city-only use')
); -- CZPC@147
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '56e7d259-9c9e-4bdb-a417-9667e65f1565', 'DPF clogging with short urban trips', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '56e7d259-9c9e-4bdb-a417-9667e65f1565' AND lower(fault) = lower('DPF clogging with short urban trips')
); -- CRKB@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '56e7d259-9c9e-4bdb-a417-9667e65f1565', 'EGR valve carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '56e7d259-9c9e-4bdb-a417-9667e65f1565' AND lower(fault) = lower('EGR valve carbon build-up')
); -- CRKB@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '56e7d259-9c9e-4bdb-a417-9667e65f1565', 'DMF wear around 150k km', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '56e7d259-9c9e-4bdb-a417-9667e65f1565' AND lower(fault) = lower('DMF wear around 150k km')
); -- CRKB@81
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '96f26012-526b-45ed-abdf-b315edf29a31', 'Carbon build-up — more severe due to higher boost', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '96f26012-526b-45ed-abdf-b315edf29a31' AND lower(fault) = lower('Carbon build-up — more severe due to higher boost')
); -- DNFG@235
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '96f26012-526b-45ed-abdf-b315edf29a31', 'Turbo higher stress — track use accelerates wear', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '96f26012-526b-45ed-abdf-b315edf29a31' AND lower(fault) = lower('Turbo higher stress — track use accelerates wear')
); -- DNFG@235
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '96f26012-526b-45ed-abdf-b315edf29a31', 'Haldex coupling requires 60k km oil change', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '96f26012-526b-45ed-abdf-b315edf29a31' AND lower(fault) = lower('Haldex coupling requires 60k km oil change')
); -- DNFG@235
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'aa21ae0c-1a44-4cbf-a9fc-384ee4559c22', 'DPF very sensitive to short trips', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'aa21ae0c-1a44-4cbf-a9fc-384ee4559c22' AND lower(fault) = lower('DPF very sensitive to short trips')
); -- DGTE@85
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'aa21ae0c-1a44-4cbf-a9fc-384ee4559c22', 'EGR carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'aa21ae0c-1a44-4cbf-a9fc-384ee4559c22' AND lower(fault) = lower('EGR carbon build-up')
); -- DGTE@85
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '0234e87e-6732-492a-8de1-2db8727e9d48', 'Timing chain stretch', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '0234e87e-6732-492a-8de1-2db8727e9d48' AND lower(fault) = lower('Timing chain stretch')
); -- DFYA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '0234e87e-6732-492a-8de1-2db8727e9d48', 'Carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '0234e87e-6732-492a-8de1-2db8727e9d48' AND lower(fault) = lower('Carbon build-up')
); -- DFYA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '0234e87e-6732-492a-8de1-2db8727e9d48', 'DQ200 on auto', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '0234e87e-6732-492a-8de1-2db8727e9d48' AND lower(fault) = lower('DQ200 on auto')
); -- DFYA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '98ef04a8-a43c-4a27-b993-95b01fa8ce3d', 'Carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '98ef04a8-a43c-4a27-b993-95b01fa8ce3d' AND lower(fault) = lower('Carbon build-up')
); -- DNFC@245
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '98ef04a8-a43c-4a27-b993-95b01fa8ce3d', 'Water pump', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '98ef04a8-a43c-4a27-b993-95b01fa8ce3d' AND lower(fault) = lower('Water pump')
); -- DNFC@245
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '98ef04a8-a43c-4a27-b993-95b01fa8ce3d', 'Too new for major patterns', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '98ef04a8-a43c-4a27-b993-95b01fa8ce3d' AND lower(fault) = lower('Too new for major patterns')
); -- DNFC@245
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '8955f0a7-c32d-4842-b84c-ed6a582daf9a', 'DPF with city driving', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '8955f0a7-c32d-4842-b84c-ed6a582daf9a' AND lower(fault) = lower('DPF with city driving')
); -- DETA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '8955f0a7-c32d-4842-b84c-ed6a582daf9a', 'EGR carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '8955f0a7-c32d-4842-b84c-ed6a582daf9a' AND lower(fault) = lower('EGR carbon build-up')
); -- DETA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '8955f0a7-c32d-4842-b84c-ed6a582daf9a', 'AdBlue system', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '8955f0a7-c32d-4842-b84c-ed6a582daf9a' AND lower(fault) = lower('AdBlue system')
); -- DETA@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '40e4a099-46ec-4c8b-ab73-f70914b4a63a', 'Water pump failure', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '40e4a099-46ec-4c8b-ab73-f70914b4a63a' AND lower(fault) = lower('Water pump failure')
); -- CVKB@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '40e4a099-46ec-4c8b-ab73-f70914b4a63a', 'Oil consumption at higher mileage', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '40e4a099-46ec-4c8b-ab73-f70914b4a63a' AND lower(fault) = lower('Oil consumption at higher mileage')
); -- CVKB@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '40e4a099-46ec-4c8b-ab73-f70914b4a63a', 'Carbon build-up on intake valves', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '40e4a099-46ec-4c8b-ab73-f70914b4a63a' AND lower(fault) = lower('Carbon build-up on intake valves')
); -- CVKB@140
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'd2ec9660-2b0e-42f5-8e65-a7b7b81599bd', 'Timing chain stretch', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'd2ec9660-2b0e-42f5-8e65-a7b7b81599bd' AND lower(fault) = lower('Timing chain stretch')
); -- CVNA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'd2ec9660-2b0e-42f5-8e65-a7b7b81599bd', 'Carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'd2ec9660-2b0e-42f5-8e65-a7b7b81599bd' AND lower(fault) = lower('Carbon build-up')
); -- CVNA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'fd42cf8b-50ae-41e2-9b8a-5fa880a0d79e', 'DPF with city use', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'fd42cf8b-50ae-41e2-9b8a-5fa880a0d79e' AND lower(fault) = lower('DPF with city use')
); -- DEUA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'fd42cf8b-50ae-41e2-9b8a-5fa880a0d79e', 'EGR carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'fd42cf8b-50ae-41e2-9b8a-5fa880a0d79e' AND lower(fault) = lower('EGR carbon build-up')
); -- DEUA@110
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '93ebdf69-eadc-49fa-866c-864b3516b98d', 'Carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '93ebdf69-eadc-49fa-866c-864b3516b98d' AND lower(fault) = lower('Carbon build-up')
); -- CJXC@221
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '93ebdf69-eadc-49fa-866c-864b3516b98d', 'Water pump', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '93ebdf69-eadc-49fa-866c-864b3516b98d' AND lower(fault) = lower('Water pump')
); -- CJXC@221
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', '93ebdf69-eadc-49fa-866c-864b3516b98d', 'Torque steer on FWD', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = '93ebdf69-eadc-49fa-866c-864b3516b98d' AND lower(fault) = lower('Torque steer on FWD')
); -- CJXC@221
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'f14d7405-6944-42e5-98fe-6c06c255bcf9', 'Water pump failure', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'f14d7405-6944-42e5-98fe-6c06c255bcf9' AND lower(fault) = lower('Water pump failure')
); -- CHHC@169
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'f14d7405-6944-42e5-98fe-6c06c255bcf9', 'Carbon build-up', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'f14d7405-6944-42e5-98fe-6c06c255bcf9' AND lower(fault) = lower('Carbon build-up')
); -- CHHC@169
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'd033e108-f64b-4cdd-aade-8ed40883db76', 'Carbon build-up under hard driving', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'd033e108-f64b-4cdd-aade-8ed40883db76' AND lower(fault) = lower('Carbon build-up under hard driving')
); -- DAZA@294
INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)
SELECT 'engine', 'd033e108-f64b-4cdd-aade-8ed40883db76', 'Turbo oil feed at high mileage', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_component_faults WHERE engine_id = 'd033e108-f64b-4cdd-aade-8ed40883db76' AND lower(fault) = lower('Turbo oil feed at high mileage')
); -- DAZA@294

COMMIT;
