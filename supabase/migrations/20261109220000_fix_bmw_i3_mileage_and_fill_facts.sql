-- BMW i3 (I01) follow-up to the 20261105162025 seed (Martin, 2026-11-09: "missing information
-- about i3 ... consumption, charging, range not correctly displayed").
--
-- Part 1 -- typical_mileage_range = 'NULL km' on both i3 phases -> NULL.
--   Pipeline bug, fixed in scripts/intake-to-template.mjs in the same commit: the mileage
--   normalizer appended " km" to the document's literal "NULL". Only these 2 rows have it
--   (checked live 2026-11-09).
--
-- Part 2 -- per-configuration facts, filling NULL cells only.
--   [B16] BMW technical data i3 (60 Ah) / i3 (94 Ah), 2016 (ecomento.de copy of BMW's sheet):
--         EU-cycle (NEDC) 12.9 / 12.6 kWh/100 km on 19" wheels; EU curb weight 1280 / 1320 kg;
--         0-100 7.2 / 7.3 s; 150 km/h.
--   [BMU] BMW technical data i3 / i3s (120 Ah) (bmw.mu): EU curb weight 1345 / 1365 kg; 0-100
--         7.3 / 6.9 s; 150 / 160 km/h. Its consumption is labelled NEDC and conflicts with the
--         WLTP figures elsewhere, so 120 Ah consumption stays NULL.
--   [US]  ultimatespecs.com, i3s 94Ah: 0-100 6.9 s; 14.3 kWh/100 km (NEDC era). Top speed
--         160 km/h = the i3s motor/limiter, same as [BMU].
--   Curb weight is the EU figure (with driver) throughout, the only one all sources give.
--   The 2017-18 facelift 94 Ah rows are NEDC-homologated, so their consumption_cycle is set to
--   'NEDC' on the row (the facelift phase default is WLTP) -- the per-row override exists for this.
--   NOT stored, because there is no column for it: the NEDC ranges (60 Ah 190 km, 94 Ah 312 km,
--   i3s 94 Ah 280 km). ev_range_wltp_km is WLTP-only -- see the note to Martin.
--
-- UPDATE of existing rows: human-run only, FRESH SQL editor tab. Every step is count-guarded.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  UPDATE public.catalog_phases p SET typical_mileage_range = NULL
    FROM public.catalog_models m
   WHERE m.id = p.model_id AND m.name = 'i3' AND p.generation_code = 'I01'
     AND p.typical_mileage_range = 'NULL km';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 i3 phases with ''NULL km'', updated % -- rolled back', n; END IF;

  WITH v(phase_label, engine_code, energy, cycle, curb, accel, vmax) AS (VALUES
    ('Pre-facelift'::text, 'i3-60Ah'::text,   12.9::numeric, NULL::text, 1280::integer, 7.2::numeric, 150::integer),  -- [B16]
    ('Pre-facelift',       'i3-94Ah',         12.6,          NULL,       1320,          7.3,          150),           -- [B16]
    ('Facelift',           'i3-94Ah',         NULL,          'NEDC',     NULL,          7.3,          150),           -- [B16] performance unchanged
    ('Facelift',           'i3s-94Ah',        14.3,          'NEDC',     NULL,          6.9,          160),           -- [US]
    ('Facelift',           'i3-120Ah',        NULL,          NULL,       1345,          7.3,          150),           -- [BMU]
    ('Facelift',           'i3s-120Ah',       NULL,          NULL,       1365,          6.9,          160)            -- [BMU]
  )
  UPDATE public.catalog_vehicle_configurations c
     SET energy_consumption_kwh100km = COALESCE(c.energy_consumption_kwh100km, v.energy),
         consumption_cycle           = COALESCE(c.consumption_cycle, v.cycle),
         curb_weight_kg              = COALESCE(c.curb_weight_kg, v.curb),
         acceleration_0_100          = COALESCE(c.acceleration_0_100, v.accel),
         top_speed_kmh               = COALESCE(c.top_speed_kmh, v.vmax)
    FROM v, public.catalog_phases p, public.catalog_models m, public.catalog_engines e
   WHERE p.id = c.phase_id AND m.id = p.model_id AND e.id = c.engine_id
     AND m.name = 'i3' AND p.generation_code = 'I01'
     AND p.phase_label = v.phase_label AND e.code = v.engine_code
     AND c.energy_consumption_kwh100km IS NULL AND c.curb_weight_kg IS NULL
     AND c.acceleration_0_100 IS NULL AND c.top_speed_kmh IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'Expected 6 empty i3 configurations, updated % -- rolled back', n; END IF;
END $$;

COMMIT;
