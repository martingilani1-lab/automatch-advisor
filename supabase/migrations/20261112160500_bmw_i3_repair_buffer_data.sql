-- BMW i3 (I01) repair-buffer figures (Martin, 2026-11-12). Needs 20261112160000 first.
--
-- All rates and tyre figures are source M (Martin), decided in chat on 2026-11-12:
--   12 V auxiliary battery   EUR 250, replaced about every 4 years   -> annual_probability 0.25
--   Brake corrosion          EUR 450, discs + pads about every 3 years -> 0.33333 (EUR 150/year)
--   A/C compressor           0.2 % a year -> 0.002. The cited article puts the failure rate at
--                            "unclear if ... even as high as 2% after 10 years"; Martin chose the
--                            per-year reading of that (2 %/10 years), not 2 % a year.
--                            Cost stays 4 000-7 500 (the calculator uses the midpoint).
--   Motor mount              2 % a year for cars built up to 2015, 0 after (affected_year_to 2015).
--                            Martin: most 2014-15 cars have since had the reinforced aluminium
--                            mount or the traction-control software update, so the remaining
--                            risk is small -- and a lift check before buying settles it.
--   HV battery module        no rate: stays out of the buffer and is listed as "not priced".
--   Tyres                    front pair EUR 300 / 40 000 km, rear pair EUR 300 / 20 000 km
--                            (rear-wheel drive with instant torque wears the rear pair first).
--
-- UPDATEs of existing rows -> review-only, Martin runs it in a fresh SQL editor tab.
-- One transaction; every step checks its row count.

BEGIN;

CREATE TEMP TABLE i3_engines ON COMMIT DROP AS
SELECT e.id, e.code FROM public.catalog_engines e
WHERE (e.code, e.power_kw) IN (('i3-60Ah', 125), ('i3-94Ah', 125), ('i3-120Ah', 125), ('i3s-94Ah', 135), ('i3s-120Ah', 135));

CREATE TEMP TABLE i3_phases ON COMMIT DROP AS
SELECT p.id FROM public.catalog_phases p
JOIN public.catalog_models m ON m.id = p.model_id
JOIN public.catalog_brands b ON b.id = m.brand_id
WHERE b.name = 'BMW' AND m.name = 'i3' AND p.generation_code = 'I01';

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM i3_engines; IF n <> 5 THEN RAISE EXCEPTION 'expected 5 i3 engines, found %', n; END IF;
  SELECT count(*) INTO n FROM i3_phases;  IF n <> 2 THEN RAISE EXCEPTION 'expected 2 i3 phases, found %', n; END IF;

  UPDATE public.catalog_component_faults SET annual_probability = 0.25
   WHERE component_type = 'engine' AND engine_id IN (SELECT id FROM i3_engines) AND fault LIKE '12 V battery%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 5 THEN RAISE EXCEPTION '12 V battery: expected 5, updated %', n; END IF;

  -- Text reworded to the "<what> -- <symptom>" form so the cost panel can show a short name
  -- ("Brake disc corrosion"); facts unchanged.
  UPDATE public.catalog_component_faults
     SET annual_probability = 0.33333,
         fault = 'Brake disc corrosion -- regenerative braking leaves the friction brakes barely used, so discs rust and calipers stick; the foot brake fails inspection far more often than average (TÜV: 2x on 2-3-year-old cars, 3.5x on 4-5-year-old). Discs and pads get replaced for rust, not wear.'
   WHERE component_type = 'vehicle' AND phase_id IN (SELECT id FROM i3_phases) AND category = 'brakes'
     AND fault LIKE 'Brake discs corrode%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 2 THEN RAISE EXCEPTION 'brakes: expected 2, updated %', n; END IF;

  UPDATE public.catalog_component_faults SET annual_probability = 0.002
   WHERE component_type = 'vehicle' AND phase_id IN (SELECT id FROM i3_phases)
     AND fault LIKE 'A/C compressor failure contaminates the battery cooling circuit%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 2 THEN RAISE EXCEPTION 'A/C compressor: expected 2, updated %', n; END IF;

  UPDATE public.catalog_component_faults
     SET annual_probability = 0.02,
         affected_year_to = 2015,
         pre_purchase_check = 'On a car built up to 2015, have the motor mounts checked on a lift: if the reinforced aluminium mount is already fitted, this risk is gone.'
   WHERE component_type = 'engine' AND engine_id IN (SELECT id FROM i3_engines WHERE code IN ('i3-60Ah', 'i3-94Ah'))
     AND fault LIKE '%motor mount%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 2 THEN RAISE EXCEPTION 'motor mount: expected 2, updated %', n; END IF;

  UPDATE public.catalog_phases
     SET tyre_front_cost_eur = 300, tyre_front_life_km = 40000,
         tyre_rear_cost_eur = 300, tyre_rear_life_km = 20000
   WHERE id IN (SELECT id FROM i3_phases);
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 2 THEN RAISE EXCEPTION 'tyres: expected 2 phases, updated %', n; END IF;
END $$;

COMMIT;
