-- BMW i3 (I01): corrections from the first Gemini research run, kept only where the evidence
-- quote checked out (Martin, 2026-11-10: "do the update").
--
-- 1. Facelift Hatchback 5-door dimensions -- the facelift row was a copy of the pre-facelift
--    (3999 / 1578 mm). [E13] BMW technical data 2018 BMW i3 / i3s (es.scribd.com/document/357497232):
--    "Length mm 4011 ... Height (with roof fin) mm 1598 ... Ground clearance mm 139".
--    [E14] de.wikipedia BMW I01: "Die Ladekante ist 78 cm hoch." -> boot_sill_height_mm 780.
--    Base i3 figures; the i3s is 4006 / 1570 / 131 mm (ADAC) -- a per-version difference the body
--    table can't hold. Pre-facelift row unchanged.
-- 2. i3s (120 Ah) WLTP range 270 -> 283 km. [ADAC] Autokatalog BMW i3s (120 Ah) 11/18-03/22:
--    "283 km" WLTP (the same page confirms 16,3 kWh/100 km WLTP and 1365 kg -- already stored).
-- 3. New vehicle fault, both phases: A/C compressor failure contaminating the battery cooling
--    circuit. One electric compressor serves cabin A/C and high-voltage battery cooling; when it
--    breaks up internally, metal debris spreads into the battery cooling plates. [carcomplaints.com]
--    owner reports ("AC compressor eats itself and shoots metal filings", 2017 i3),
--    [theautopian.com] "How the 'Black Death' can destroy a BMW i3". Severity critical: the repair
--    can include the battery cooling hardware. No cost figure stored -- the one quoted (EUR 10 000+)
--    had no reliable source.
--
-- NOT taken from the Gemini run (evidence missing, wrong scope or contradicting its own quote):
-- 94 Ah / 120 Ah consumption figures, facelift 94 Ah range, gross weight / payload, market prices
-- (all-years listing page), resale rating, REx 25 kW, brake-disc / seat-heater faults.
--
-- UPDATE + INSERT: human-run, FRESH SQL editor tab. Count-guarded throughout.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  UPDATE public.phase_body_dimensions d
     SET length_mm = 4011, height_mm = 1598, ground_clearance_mm = 139, boot_sill_height_mm = 780
    FROM public.catalog_phases p, public.catalog_models m, public.catalog_body_types b
   WHERE d.phase_id = p.id AND m.id = p.model_id AND b.id = d.body_type_id
     AND m.name = 'i3' AND p.generation_code = 'I01' AND p.phase_label = 'Facelift'
     AND b.name = 'Hatchback 5-door'
     AND d.length_mm = 3999 AND d.height_mm = 1578
     AND d.ground_clearance_mm IS NULL AND d.boot_sill_height_mm IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 i3 facelift body row in the inherited state, updated % -- rolled back', n; END IF;

  UPDATE public.catalog_vehicle_configurations c
     SET ev_range_km = 283
    FROM public.catalog_engines e, public.catalog_phases p, public.catalog_models m
   WHERE e.id = c.engine_id AND p.id = c.phase_id AND m.id = p.model_id
     AND m.name = 'i3' AND e.code = 'i3s-120Ah'
     AND c.ev_range_km = 270 AND c.consumption_cycle = 'WLTP';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 i3s 120 Ah row at 270 km WLTP, updated % -- rolled back', n; END IF;

  INSERT INTO public.catalog_component_faults (component_type, phase_id, fault, severity, category)
  SELECT 'vehicle', p.id,
         'A/C compressor failure contaminates the battery cooling circuit -- the one electric compressor serves cabin A/C and high-voltage battery cooling; when it breaks up internally, metal debris spreads into the battery cooling plates. Symptoms: A/C stops cooling, compressor noise, battery cooling fault warnings.',
         'critical', 'climate'
    FROM public.catalog_phases p JOIN public.catalog_models m ON m.id = p.model_id
   WHERE m.name = 'i3' AND p.generation_code = 'I01'
     AND NOT EXISTS (SELECT 1 FROM public.catalog_component_faults x
                      WHERE x.phase_id = p.id AND x.fault LIKE 'A/C compressor failure contaminates%');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected the A/C fault on 2 i3 phases, inserted % -- rolled back', n; END IF;
END $$;

COMMIT;
