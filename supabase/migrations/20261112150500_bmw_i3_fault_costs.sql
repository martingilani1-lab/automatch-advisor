-- BMW i3 (I01): repair cost + probability on its faults, two new faults (Martin, 2026-11-12).
--
-- Input: Martin's list of common i3 forum failures for the calculator's "unexpected repairs" buffer,
-- fitted to the existing catalog_component_faults rows and checked against sources. Martin's
-- instruction: forum-level figures are acceptable ("nemusí sedieť na chlp"), so every cost below is
-- source M (Martin), informed by the evidence noted per item. Needs
-- 20261112150000_catalog_component_faults_cost_probability.sql first.
--
-- What happened to each item of Martin's list:
--   1 A/C compressor + battery cooling contamination -> ALREADY LIVE (vehicle fault, both phases).
--     Cost + probability added. Evidence: theautopian.com "black death" article -- several owners
--     ~USD 4,000 where contamination was avoided; USD 7,000 compressor + flush quoted; worst cases
--     over USD 20,000 (car written off); failure rate "unclear ... even as high as 2% after 10 years"
--     -> rare. Range 4,000-7,500 EUR (min from owner reports, max Martin). The write-off worst case
--     is above the max on purpose: it is not a typical repair bill.
--   2 Tyre wear / sidewall damage -> NOT a fault: wear plus a design trait (narrow 19-inch tyres),
--     which belongs to running costs. Also unverified as stated: 155/70 R19 is the i3's standard
--     size, but whether it is the rear size was not confirmed (the claim said rear). Left out.
--   3 Brake disc corrosion -> NEW vehicle fault, both phases, category brakes. Evidence: Auto Bild
--     on TÜV-Report 2026, BMW i3: foot brake faulted 2x (2-3-year-old cars) and 3.5x (4-5-year-old)
--     as often as average; discs slightly above average. Corrosion as the mechanism is the usual
--     EV pattern (friction brakes barely used under regeneration) -- stated in the text as the
--     cause, the TÜV figures are the evidence. moderate (inspection failure), common, 450 EUR (M).
--   4 12 V battery -> ALREADY LIVE on all 5 i3 engines, severity minor. Kept minor (cheap fix,
--     although it strands the car). Cost 250 EUR (M), common.
--   5 Motor mount -> ALREADY LIVE on i3-60Ah and i3-94Ah as mount wear with a clunk. Confirmed by
--     BMW SI B22 01 15 ("the electric drivetrain moves excessively in the chassis", left motor mount
--     or its support failed; i3 and i3 REx). The stronger claim in the list -- the motor drops and
--     severs high-voltage cables -- was NOT found in the bulletin or the owner threads (mybmwi3.com
--     reports a broken mount bolt, nothing about HV cables) and is left out. 1,200 EUR (M);
--     occasional on the 60Ah (2013-2016 cars, the bulletin's range), rare on the 94Ah.
--   6 Range Extender fuel system -> no REx engine is in the catalog; nothing to attach it to. Left out.
--   7 HV battery module failure -> NEW engine-level fault on all 5 i3 powertrains (the engine row is
--     motor + battery). Evidence: recurrentauto.com -- "Each i3 battery pack contains eight modules
--     and each module costs between $1,700 to $1,800"; full packs USD 20,000+. That modules are
--     sold individually is what makes a module repair possible; whether independents in SK / CZ do
--     it was not verified, so the text doesn't claim it. critical, rare, 3,500 EUR (M).
--
-- Existing i3 faults still WITHOUT cost after this file (the calculator must show them as unknown):
--   i3-60Ah EME / KLE failure (critical), i3-94Ah KLE failure (critical), Pre-facelift front
--   suspension bushes (minor), i3-120Ah EME recall (fixed under campaign).
--
-- Contains UPDATEs of existing rows -> review-only, Martin runs it in a fresh SQL editor tab.
-- One transaction; every step checks its row count and aborts on a mismatch.

BEGIN;

CREATE TEMP TABLE i3_engines ON COMMIT DROP AS
SELECT e.id, e.code, e.power_kw
FROM public.catalog_engines e
WHERE (e.code, e.power_kw) IN (('i3-60Ah', 125), ('i3-94Ah', 125), ('i3-120Ah', 125), ('i3s-94Ah', 135), ('i3s-120Ah', 135));

CREATE TEMP TABLE i3_phases ON COMMIT DROP AS
SELECT p.id, p.phase_label
FROM public.catalog_phases p
JOIN public.catalog_models m ON m.id = p.model_id
JOIN public.catalog_brands b ON b.id = m.brand_id
WHERE b.name = 'BMW' AND m.name = 'i3' AND p.generation_code = 'I01';

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM i3_engines;
  IF n <> 5 THEN RAISE EXCEPTION 'expected 5 i3 engines, found %', n; END IF;
  SELECT count(*) INTO n FROM i3_phases;
  IF n <> 2 THEN RAISE EXCEPTION 'expected 2 i3 phases, found %', n; END IF;
END $$;

-- 1. A/C compressor (vehicle, both phases) ------------------------------------------------------
DO $$
DECLARE n integer;
BEGIN
  UPDATE public.catalog_component_faults f
     SET estimated_cost_eur_min = 4000, estimated_cost_eur_max = 7500, probability = 'rare'
   WHERE f.component_type = 'vehicle'
     AND f.phase_id IN (SELECT id FROM i3_phases)
     AND f.fault LIKE 'A/C compressor failure contaminates the battery cooling circuit%'
     AND f.estimated_cost_eur_min IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'A/C compressor: expected 2 rows, updated %', n; END IF;
END $$;

-- 4. 12 V battery (engine, all 5) ---------------------------------------------------------------
DO $$
DECLARE n integer;
BEGIN
  UPDATE public.catalog_component_faults f
     SET estimated_cost_eur_min = 250, estimated_cost_eur_max = 250, probability = 'common'
   WHERE f.component_type = 'engine'
     AND f.engine_id IN (SELECT id FROM i3_engines)
     AND f.fault LIKE '12 V battery%'
     AND f.estimated_cost_eur_min IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 5 THEN RAISE EXCEPTION '12 V battery: expected 5 rows, updated %', n; END IF;
END $$;

-- 5. Motor mount (engine, 60Ah + 94Ah) ----------------------------------------------------------
DO $$
DECLARE n integer;
BEGIN
  UPDATE public.catalog_component_faults f
     SET fault = 'Left electric-motor mount or its support fails on early cars (BMW service bulletin SI B22 01 15: the drivetrain moves excessively in the chassis) -- clunk when pulling away or lifting off.',
         estimated_cost_eur_min = 1200, estimated_cost_eur_max = 1200, probability = 'occasional'
   WHERE f.component_type = 'engine'
     AND f.engine_id = (SELECT id FROM i3_engines WHERE code = 'i3-60Ah')
     AND f.fault = 'Electric-motor mount wear on early cars -- clunk when pulling away or lifting off.';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'motor mount 60Ah: expected 1 row, updated %', n; END IF;

  UPDATE public.catalog_component_faults f
     SET estimated_cost_eur_min = 1200, estimated_cost_eur_max = 1200, probability = 'rare'
   WHERE f.component_type = 'engine'
     AND f.engine_id = (SELECT id FROM i3_engines WHERE code = 'i3-94Ah')
     AND f.fault LIKE 'Electric-motor mount wear%'
     AND f.estimated_cost_eur_min IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'motor mount 94Ah: expected 1 row, updated %', n; END IF;
END $$;

-- 3. Brake disc corrosion (NEW vehicle fault, both phases) --------------------------------------
DO $$
DECLARE n integer;
BEGIN
  INSERT INTO public.catalog_component_faults
    (component_type, phase_id, fault, severity, category, estimated_cost_eur_min, estimated_cost_eur_max, probability)
  SELECT 'vehicle', p.id,
         'Brake discs corrode and calipers stick because regenerative braking leaves the friction brakes barely used -- the foot brake fails inspection far more often than average (TÜV: 2x on 2-3-year-old cars, 3.5x on 4-5-year-old). Discs and pads get replaced for rust, not wear.',
         'moderate', 'brakes', 450, 450, 'common'
  FROM i3_phases p
  WHERE NOT EXISTS (SELECT 1 FROM public.catalog_component_faults f
                     WHERE f.phase_id = p.id AND f.component_type = 'vehicle' AND f.category = 'brakes');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'brake fault: expected 2 inserts, did %', n; END IF;
END $$;

-- 7. HV battery module failure (NEW engine fault, all 5) ----------------------------------------
DO $$
DECLARE n integer;
BEGIN
  INSERT INTO public.catalog_component_faults
    (component_type, engine_id, fault, severity, estimated_cost_eur_min, estimated_cost_eur_max, probability)
  SELECT 'engine', e.id,
         'High-voltage battery module failure -- one of the eight modules loses capacity or develops a cell fault (warning, reduced range, or no drive). BMW sells modules individually, so one failed module need not mean a new pack.',
         'critical', 3500, 3500, 'rare'
  FROM i3_engines e
  WHERE NOT EXISTS (SELECT 1 FROM public.catalog_component_faults f
                     WHERE f.engine_id = e.id AND f.fault LIKE 'High-voltage battery module failure%');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 5 THEN RAISE EXCEPTION 'battery module fault: expected 5 inserts, did %', n; END IF;
END $$;

-- Post-condition: 16 i3 fault rows now carry a cost (2 A/C + 5 12 V + 2 mount + 2 brakes + 5 module) -- see the list above for the ones that stay NULL on purpose.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.catalog_component_faults f
   WHERE (f.phase_id IN (SELECT id FROM i3_phases) OR f.engine_id IN (SELECT id FROM i3_engines))
     AND f.estimated_cost_eur_min IS NOT NULL;
  IF n <> 16 THEN RAISE EXCEPTION 'expected 16 costed i3 faults, found %', n; END IF;
END $$;

COMMIT;
