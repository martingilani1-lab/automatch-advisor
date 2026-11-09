-- EV range follows the configuration's test cycle + BMW i3 (I01) data, engine content and faults
-- (Martin, 2026-11-09: "go with the recommended way").
--
-- Follows 20261109220000 (run 2026-11-09, file since removed from the repo) -- corrects / completes
-- what it wrote, plus the schema change.
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
-- Part 3 -- (dropped) the i3 'NULL km' mileage: already cleared -- 20261109220000 had been run
--   before this file replaced it (Martin, 2026-11-09; the first attempt of this file rolled back on
--   that). Parts 2 and 4 are written against the state 20261109220000 left.
--
-- Part 4 -- i3 per-configuration facts set to Martin's finalized figures. Sources:
--   [B16] BMW technical data i3 (60 Ah) / (94 Ah), 2016 (ecomento.de copy of BMW's sheet), EU cycle
--         = NEDC, 19" wheels: 12.9 / 12.6 kWh/100 km, range 190 / 312 km; EU curb weight
--         1280 / 1320 kg; 0-100 7.2 / 7.3 s; 150 km/h.
--   [US]  ultimatespecs.com, i3s 94Ah (2017-18): 14.3 kWh/100 km, NEDC range 280 km, 0-100 6.9 s.
--         160 km/h = the i3s limiter, same as [BMU].
--   [BMU] BMW technical data i3 / i3s (120 Ah) (bmw.mu): EU curb weight 1345 / 1365 kg; 0-100
--         7.3 / 6.9 s; 150 / 160 km/h.
--   [M]   Martin's finalized set (2026-11-09) -- the figures below follow it: facelift i3 94 Ah
--         13.1 kWh NEDC / 1320 kg, i3s 94 Ah 1340 kg, 120 Ah WLTP 15.3 / 16.3 kWh. (The 120 Ah NEDC
--         13.1 / 14.0 kWh can't sit on the same row -- one cycle per row.)
--   Curb weight is the EU figure (with driver). Every pre-2018 row is NEDC (the facelift 94 Ah rows
--   too: homologated before WLTP). Left NULL: facelift i3 94 Ah range.
--
-- Part 5 -- engine content: max_ac_charging_kw 7.4 -> 11 on the 94 Ah rows (BMW 2016 data: 11 kW /
--   16 A three-phase option on the 94 Ah), and pros / cons on all five i3 engines (were empty).
--   Engine content only -- no drivetrain or body facts (CLAUDE.md rule 9).
--
-- Part 6 -- 7 new engine faults (KLE charger, motor mount, 12 V) per docs/intake/city-2026-11/
--   bmw-i3-i01.md section I. The 3 seeded faults stay as they are.
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

  -- Part 3 -- dropped: the 'NULL km' mileage was already cleared when 20261109220000 ran.

  -- Part 4 -- the 6 i3 rows to Martin's finalized set. 20261109220000 already ran (2026-11-09)
  -- and filled part of this, so each row is matched on the exact state that file left
  -- (old_energy / old_curb) -- anything else on a row means someone changed it since, and the
  -- count check rolls everything back.
  WITH v(phase_label, engine_code, old_energy, old_curb, energy, range_km, cycle, curb, accel, vmax) AS (VALUES
    ('Pre-facelift'::text, 'i3-60Ah'::text,   12.9::numeric, 1280::integer, 12.9::numeric, 190::integer, 'NEDC'::text, 1280::integer, 7.2::numeric, 150::integer),  -- [B16][M]
    ('Pre-facelift',       'i3-94Ah',         12.6,          1320,          12.6,          312,          'NEDC',       1320,          7.3,          150),           -- [B16][M]
    ('Facelift',           'i3-94Ah',         NULL,          NULL,          13.1,          NULL,         'NEDC',       1320,          7.3,          150),           -- [M]
    ('Facelift',           'i3s-94Ah',        14.3,          NULL,          14.3,          280,          'NEDC',       1340,          6.9,          160),           -- [US][M]
    ('Facelift',           'i3-120Ah',        NULL,          1345,          15.3,          NULL,         'WLTP',       1345,          7.3,          150),           -- [M] range 285 already set
    ('Facelift',           'i3s-120Ah',       NULL,          1365,          16.3,          NULL,         'WLTP',       1365,          6.9,          160)            -- [M] range 270 already set
  )
  UPDATE public.catalog_vehicle_configurations c
     SET energy_consumption_kwh100km = v.energy,
         ev_range_km                 = COALESCE(c.ev_range_km, v.range_km),
         consumption_cycle           = v.cycle,
         curb_weight_kg              = v.curb,
         acceleration_0_100          = v.accel,
         top_speed_kmh               = v.vmax
    FROM v, public.catalog_phases p, public.catalog_models m, public.catalog_engines e
   WHERE p.id = c.phase_id AND m.id = p.model_id AND e.id = c.engine_id
     AND m.name = 'i3' AND p.generation_code = 'I01'
     AND p.phase_label = v.phase_label AND e.code = v.engine_code
     AND c.energy_consumption_kwh100km IS NOT DISTINCT FROM v.old_energy
     AND c.curb_weight_kg IS NOT DISTINCT FROM v.old_curb;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'Expected 6 i3 configurations in the state 20261109220000 left, updated % -- rolled back', n; END IF;

  -- Every i3 range now has a cycle next to it.
  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations WHERE ev_range_km IS NOT NULL AND consumption_cycle IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION '% range rows still without a cycle -- rolled back', n; END IF;

  -- Part 5a: 11 kW three-phase AC on the 94 Ah variants.
  UPDATE public.catalog_engines SET max_ac_charging_kw = 11
   WHERE code IN ('i3-94Ah', 'i3s-94Ah') AND fuel_type = 'electric' AND max_ac_charging_kw = 7.4;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 i3 94 Ah engines at 7.4 kW AC, updated % -- rolled back', n; END IF;

  -- Part 5b: pros / cons (empty on all five).
  WITH v(code, pros, cons) AS (VALUES
    ('i3-60Ah'::text,
     ARRAY['Actively cooled battery (refrigerant plates) -- lower capacity loss with age than passively cooled EVs of the same years; check state of health anyway',
           '125 kW / 250 Nm from standstill -- strong 0-60 km/h in town']::text[],
     ARRAY['50 kW DC peak -- slow by current standards (~25 min to 80 % on this small pack)',
           'Small 18.8 kWh pack: 190 km NEDC, realistically 120-150 km -- a city-only car']::text[]),
    ('i3-94Ah',
     ARRAY['Actively cooled battery (refrigerant plates) -- lower capacity loss with age than passively cooled EVs of the same years; check state of health anyway',
           '125 kW / 250 Nm from standstill -- strong 0-60 km/h in town',
           '11 kW three-phase AC option -- a full charge overnight on a wallbox']::text[],
     ARRAY['50 kW DC peak -- ~40 min to 80 %, slow by current standards']::text[]),
    ('i3s-94Ah',
     ARRAY['Actively cooled battery (refrigerant plates) -- lower capacity loss with age than passively cooled EVs of the same years; check state of health anyway',
           '135 kW / 270 Nm -- 0-100 km/h in 6.9 s',
           '11 kW three-phase AC option -- a full charge overnight on a wallbox']::text[],
     ARRAY['50 kW DC peak -- ~40 min to 80 %, slow by current standards']::text[]),
    ('i3-120Ah',
     ARRAY['Actively cooled battery (refrigerant plates) -- lower capacity loss with age than passively cooled EVs of the same years; check state of health anyway',
           '125 kW / 250 Nm from standstill -- strong 0-60 km/h in town',
           '37.9 kWh net: 285 km WLTP -- the most usable i3 battery',
           '11 kW three-phase AC -- a full charge overnight on a wallbox']::text[],
     ARRAY['50 kW DC peak -- ~42 min to 80 %, slow by current standards']::text[]),
    ('i3s-120Ah',
     ARRAY['Actively cooled battery (refrigerant plates) -- lower capacity loss with age than passively cooled EVs of the same years; check state of health anyway',
           '135 kW / 270 Nm -- 0-100 km/h in 6.9 s',
           '37.9 kWh net: 270 km WLTP',
           '11 kW three-phase AC -- a full charge overnight on a wallbox']::text[],
     ARRAY['50 kW DC peak -- ~42 min to 80 %, slow by current standards']::text[])
  )
  UPDATE public.catalog_engines e SET pros = v.pros, cons = v.cons
    FROM v
   WHERE e.code = v.code AND e.fuel_type = 'electric'
     AND (e.pros IS NULL OR cardinality(e.pros) = 0) AND (e.cons IS NULL OR cardinality(e.cons) = 0);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 5 THEN RAISE EXCEPTION 'Expected 5 i3 engines without pros/cons, updated % -- rolled back', n; END IF;

  -- Part 6: 7 new engine faults (additive; guarded so a re-run can't duplicate them).
  WITH f(code, fault, severity) AS (VALUES
    ('i3-94Ah'::text,   'KLE (on-board AC charger) failure -- AC charging stops or won''t start, DC still works; unit replacement out of warranty.'::text, 'critical'::text),
    ('i3-60Ah',         'Electric-motor mount wear on early cars -- clunk when pulling away or lifting off.', 'moderate'),
    ('i3-94Ah',         'Electric-motor mount wear -- clunk when pulling away or lifting off.', 'moderate'),
    ('i3-60Ah',         '12 V battery drain -- "drive train malfunction" warnings, the car won''t wake up.', 'minor'),
    ('i3s-94Ah',        '12 V battery drain -- "drive train malfunction" warnings, the car won''t wake up.', 'minor'),
    ('i3-120Ah',        '12 V battery drain -- "drive train malfunction" warnings, the car won''t wake up.', 'minor'),
    ('i3s-120Ah',       '12 V battery drain -- "drive train malfunction" warnings, the car won''t wake up.', 'minor')
  )
  INSERT INTO public.catalog_component_faults (component_type, engine_id, fault, severity)
  SELECT 'engine', e.id, f.fault, f.severity
    FROM f JOIN public.catalog_engines e ON e.code = f.code AND e.fuel_type = 'electric'
   WHERE NOT EXISTS (SELECT 1 FROM public.catalog_component_faults x WHERE x.engine_id = e.id AND x.fault = f.fault);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 7 THEN RAISE EXCEPTION 'Expected 7 new i3 engine faults, inserted % -- rolled back', n; END IF;
END $$;

COMMIT;
