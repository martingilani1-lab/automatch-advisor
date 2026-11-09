-- EV range follows the configuration's test cycle + BMW i3 (I01) data fix
-- (Martin, 2026-11-09: "go with the recommended way").
--
-- Replaces the unrun 20261109220000 (deleted in the same commit) -- same i3 data, plus the
-- schema change it needed.
--
-- Part 1 -- catalog_vehicle_configurations.ev_range_wltp_km -> ev_range_km (RENAME, no data lost:
--   2 rows filled live, both WLTP, both i3 120 Ah). The range now means the official range on the
--   row's own consumption_cycle, exactly like fuel_consumption_l100km / energy_consumption_kwh100km
--   already do. Reason: NEDC-era EVs (i3 60 / 94 Ah, Zoe Ph1, e-Golf, Leaf) only have an NEDC range;
--   a WLTP-only column had nowhere to put it, and a second NEDC column would let one row carry two
--   cycles. No constraint, view or function references the old name (checked live 2026-11-09).
--   App code reads ev_range_km from the branch `ev-range-follows-cycle` -- merge/deploy it right
--   after this runs (before, the old code still reads ev_range_wltp_km and would error).
--
-- Part 2 -- the 2 existing range rows get consumption_cycle = 'WLTP' (they were seeded without a
--   cycle because the seed only wrote the phase default next to a consumption figure; fixed in
--   generate-seed.mjs: a range now counts too).
--
-- Part 3 -- typical_mileage_range 'NULL km' -> NULL on both i3 phases (intake-parser bug, fixed in
--   scripts/intake-to-template.mjs, commit ecad30e).
--
-- Part 4 -- i3 per-configuration facts, NULL cells only. Sources:
--   [B16] BMW technical data i3 (60 Ah) / (94 Ah), 2016 (ecomento.de copy of BMW's sheet), EU cycle
--         = NEDC, 19" wheels: 12.9 / 12.6 kWh/100 km, range 190 / 312 km; EU curb weight
--         1280 / 1320 kg; 0-100 7.2 / 7.3 s; 150 km/h.
--   [US]  ultimatespecs.com, i3s 94Ah (2017-18): 14.3 kWh/100 km, NEDC range 280 km, 0-100 6.9 s.
--         160 km/h = the i3s limiter, same as [BMU].
--   [BMU] BMW technical data i3 / i3s (120 Ah) (bmw.mu): EU curb weight 1345 / 1365 kg; 0-100
--         7.3 / 6.9 s; 150 / 160 km/h. Its consumption is labelled NEDC and conflicts with WLTP
--         figures elsewhere, so 120 Ah consumption stays NULL.
--   Curb weight is the EU figure (with driver) -- the only one every source gives.
--   Every pre-2018 row is NEDC (the facelift 94 Ah rows too: homologated before WLTP).
--   Left NULL: facelift i3 94 Ah consumption / range / weight, i3s 94 Ah weight (only a "dry
--   weight" found), 120 Ah consumption.
--
-- Schema change + UPDATE: human-run only, FRESH SQL editor tab. Count-guarded throughout.

BEGIN;

ALTER TABLE public.catalog_vehicle_configurations RENAME COLUMN ev_range_wltp_km TO ev_range_km;

DO $$
DECLARE n int;
BEGIN
  -- Part 2
  UPDATE public.catalog_vehicle_configurations SET consumption_cycle = 'WLTP'
   WHERE ev_range_km IS NOT NULL AND consumption_cycle IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 range rows without a cycle (i3 120 Ah), updated % -- rolled back', n; END IF;

  -- Part 3
  UPDATE public.catalog_phases p SET typical_mileage_range = NULL
    FROM public.catalog_models m
   WHERE m.id = p.model_id AND m.name = 'i3' AND p.generation_code = 'I01'
     AND p.typical_mileage_range = 'NULL km';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 i3 phases with ''NULL km'', updated % -- rolled back', n; END IF;

  -- Part 4
  WITH v(phase_label, engine_code, energy, range_km, cycle, curb, accel, vmax) AS (VALUES
    ('Pre-facelift'::text, 'i3-60Ah'::text,   12.9::numeric, 190::integer, 'NEDC'::text, 1280::integer, 7.2::numeric, 150::integer),  -- [B16]
    ('Pre-facelift',       'i3-94Ah',         12.6,          312,          'NEDC',       1320,          7.3,          150),           -- [B16]
    ('Facelift',           'i3-94Ah',         NULL,          NULL,         'NEDC',       NULL,          7.3,          150),           -- [B16] performance unchanged
    ('Facelift',           'i3s-94Ah',        14.3,          280,          'NEDC',       NULL,          6.9,          160),           -- [US]
    ('Facelift',           'i3-120Ah',        NULL,          NULL,         NULL,         1345,          7.3,          150),           -- [BMU] range 285 / WLTP already set
    ('Facelift',           'i3s-120Ah',       NULL,          NULL,         NULL,         1365,          6.9,          160)            -- [BMU] range 270 / WLTP already set
  )
  UPDATE public.catalog_vehicle_configurations c
     SET energy_consumption_kwh100km = COALESCE(c.energy_consumption_kwh100km, v.energy),
         ev_range_km                 = COALESCE(c.ev_range_km, v.range_km),
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

  -- Every i3 range now has a cycle next to it.
  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations WHERE ev_range_km IS NOT NULL AND consumption_cycle IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION '% range rows still without a cycle -- rolled back', n; END IF;
END $$;

COMMIT;
