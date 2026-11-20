#!/usr/bin/env node
// Generates the reviewable seed SQL for the Škoda Citigo (AA) from the CSVs in scripts/seed-data/skoda-citigo-aa/
// (engines.csv, configurations.csv, trim_features.csv, faults.csv) plus the reference / phase / body rows below,
// which follow the reviewed decisions in docs/intake/research/skoda-citigo.md (T1-T10, S1-S6, R1-R8, Martin
// 2026-11-20). author-data-sql skill: it only WRITES a .sql file -- it never opens a DB connection. Martin runs the
// output himself.
//
// Usage: node scripts/generate-citigo-seed.mjs  ->  supabase/migrations/20261120210000_seed_skoda_citigo_aa.sql
//
// Why one file: Martin asked for a single reviewable SQL file for this import. It contains an UPDATE of the shared
// 'VW MQ100' reference row (R2), so the whole file is human-run, never applied via MCP.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, "seed-data", "skoda-citigo-aa");
const outFile = path.join(here, "..", "supabase", "migrations", "20261120210000_seed_skoda_citigo_aa.sql");

// RFC4180 line parser, same behaviour as scripts/generate-seed.mjs ("" inside quotes = literal quote).
function parseCsvLine(line) {
  const cells = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { cells.push(cur); cur = ""; }
    else cur += c;
  }
  cells.push(cur);
  return cells;
}
function readCsv(name) {
  const lines = fs.readFileSync(path.join(dir, name), "utf8").replace(/\r/g, "").split("\n")
    .filter(l => l.trim() && !l.trim().startsWith("#"));
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map(l => {
    const cells = parseCsvLine(l);
    const row = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

// SQL literals. Empty cell -> NULL (never ''), every literal explicitly cast (VALUES-CTE typing, import-car skill).
const txt = v => (v === "" || v == null ? "NULL::text" : `'${String(v).replace(/'/g, "''")}'::text`);
const num = (v, t = "numeric") => {
  if (v === "" || v == null) return `NULL::${t}`;
  if (!/^-?\d+(\.\d+)?$/.test(v)) throw new Error(`Not a number: ${v}`);
  return `${v}::${t}`;
};
const bool = v => {
  if (v !== "true" && v !== "false") throw new Error(`Not a boolean: ${v}`);
  return `${v}::boolean`;
};
const arr = v => (v === "" ? "ARRAY[]::text[]" : `ARRAY[${v.split(" ; ").map(s => `'${s.trim().replace(/'/g, "''")}'`).join(", ")}]::text[]`);

// Closed vocabularies (live CHECK constraints, read via MCP 2026-11-20). A value outside -> stop, never loosen.
const VOCAB = {
  fuel_type: ["petrol", "diesel", "electric", "lpg", "cng"],
  emission_standard: ["", "Euro1", "Euro2", "Euro3", "Euro4", "Euro5", "Euro6", "Euro6c", "Euro6d-TEMP", "Euro6d", "Euro6e"],
  cylinders: ["", "L3"], timing_type: ["", "belt", "chain", "gear"], injection_type: ["", "port"],
  severity: ["critical", "moderate", "minor"],
  category: ["", "electrical", "body_rust", "suspension", "steering", "brakes", "climate", "interior"],
  cycle: ["NEDC", "WLTP"], sec_fuel: ["", "petrol", "lpg", "cng"],
  feature_group: ["", "airbags", "ambient_lighting", "armrests", "bumpers", "climate", "cruise", "fog_lights", "headlights", "infotainment", "instruments", "interior_trim", "light_rain_sensors", "locking", "mirrors", "parking", "rear_spoiler", "roof_rails", "seat_adjustment", "seat_comfort", "seats", "sliding_doors", "smartphone", "sound", "steering_wheel", "suspension", "wheels", "windows"],
  safety_feature_slug: ["", "abs", "adaptive_cruise_control", "adaptive_matrix_headlights", "aeb", "airbags", "blind_spot_monitoring", "camera_360", "driver_drowsiness_attention_warning", "emergency_lane_keeping", "emergency_stop_signal", "esc", "event_data_recorder", "head_up_display", "isa", "lane_centering", "parking_assist", "rear_cross_traffic_alert", "reversing_detection", "seatbelt_reminders", "tyre_pressure_monitoring"],
};
const check = (field, v, where) => { if (!VOCAB[field].includes(v)) throw new Error(`${where}: ${field} '${v}' not in the closed list -- stop`); };

const engines = readCsv("engines.csv");
const configs = readCsv("configurations.csv");
const features = readCsv("trim_features.csv");
const faults = readCsv("faults.csv");

engines.forEach(e => ["fuel_type", "emission_standard", "cylinders", "timing_type", "injection_type"].forEach(f => check(f, e[f], `engine ${e.code}`)));
configs.forEach(c => { check("cycle", c.cycle, `config ${c.id}`); check("sec_fuel", c.sec_fuel, `config ${c.id}`);
  if ((c.sec_fuel === "") !== (c.sec_l100 === "")) throw new Error(`config ${c.id}: secondary_pair_check would fail`); });
features.forEach(f => { check("feature_group", f.feature_group, f.feature); check("safety_feature_slug", f.safety_feature_slug, f.feature); });
faults.forEach(f => { check("severity", f.severity, f.fault); check("category", f.category, f.fault);
  if ((f.component_type === "vehicle") !== (f.category !== "")) throw new Error(`fault category rule: ${f.fault}`);
  for (const k of ["cost_min", "cost_max"]) if (f[k] === "0") throw new Error(`cost 0 fails the CHECK (> 0) -- use NULL: ${f.fault}`); });

const combustion = engines.filter(e => e.fuel_type !== "electric");
const ev = engines.filter(e => e.fuel_type === "electric");
const nEng = engines.length, nCfg = configs.length, nFeat = features.length, nFault = faults.length;

const engineValues = combustion.map(e =>
  `    (${txt(e.code)}, ${num(e.power_kw, "integer")}, ${txt(e.fuel_type)}, ${num(e.torque_nm, "integer")}, ${txt(e.emission_standard)}, ${txt(e.display_name)}, ${num(e.displacement_cc, "integer")}, ${txt(e.cylinders)}, ${txt(e.timing_type)}, ${txt(e.injection_type)}, ${num(e.engine_oil_capacity_liters)}, ${num(e.oil_change_interval_km, "integer")}, ${num(e.oil_change_interval_months, "integer")}, ${num(e.timing_replacement_km, "integer")}, ${num(e.yearly_maintenance_eur_min, "integer")}, ${num(e.yearly_maintenance_eur_max, "integer")}, ${num(e.reliability_rating, "integer")},\n     ${txt(e.maintenance_note)},\n     ${arr(e.pros)},\n     ${arr(e.cons)})`).join(",\n");
const evValues = ev.map(e =>
  `    (${txt(e.code)}, ${txt(e.display_name)}, ${num(e.power_kw, "integer")}, ${num(e.torque_nm, "integer")}, ${num(e.battery_capacity_net_kwh)}, ${num(e.max_ac_charging_kw)}, ${num(e.max_dc_charging_kw)}, ${num(e.reliability_rating, "integer")},\n     ${txt(e.maintenance_note)},\n     ${arr(e.pros)},\n     ${arr(e.cons)})`).join(",\n");
const cfgValues = configs.map(c =>
  `    (${txt(c.id)}, ${txt(c.phase)}, ${num(c.doors, "integer")}, ${txt(c.engine_code)}, ${num(c.power_kw, "integer")}, ${txt(c.unit)}, ${num(c.fuel_l100)}, ${num(c.energy_kwh100)}, ${num(c.co2, "integer")}, ${txt(c.cycle)}, ${num(c.ev_range_km, "integer")}, ${num(c.curb, "integer")}, ${num(c.acc)}, ${num(c.vmax, "integer")}, ${txt(c.sec_fuel)}, ${num(c.sec_l100)}, ${num(c.tank)})`).join(",\n");
const featValues = features.map(f =>
  `    (${txt(f.phase)}, ${txt(f.trim)}, ${txt(f.feature)}, ${bool(f.is_optional)}, ${txt(f.feature_group)}, ${txt(f.safety_feature_slug)})`).join(",\n");
const faultValues = faults.map(f => {
  const [code, kw] = f.component_type === "engine" ? f.target.split("@") : ["", ""];
  return `    (${txt(f.component_type)}, ${txt(code)}, ${num(kw, "integer")}, ${txt(f.component_type === "transmission" ? f.target : "")}, ${txt(f.component_type === "vehicle" ? f.target : "")}, ${txt(f.category)},\n     ${txt(f.fault)},\n     ${txt(f.severity)}, ${num(f.annual_probability)}, ${num(f.cost_min, "integer")}, ${num(f.cost_max, "integer")}, ${num(f.year_from, "integer")}, ${num(f.year_to, "integer")},\n     ${txt(f.pre_purchase_check)})`;
}).join(",\n");

const newEngineCodes = engines.map(e => `'${e.code}'`).join(", ");

const sql = `-- GENERATED by scripts/generate-citigo-seed.mjs from scripts/seed-data/skoda-citigo-aa/*.csv -- do not hand-edit:
-- change the CSV and regenerate. Review before running; the generator never touches the database.
--
-- Škoda Citigo (AA): Pre-facelift (2011-2017), Facelift (2017-2019) and CITIGOe iV (2019-2020), from
-- docs/intake/research/skoda-citigo.md with Martin's reviewed decisions (T1-T10, S1-S6, R1-R8, fault costs and
-- maintenance, 2026-11-20). Replaces the never-run 20261120190000 / 20261120190500 / 20261120191000 (now marked
-- SUPERSEDED -- DO NOT RUN).
--
-- *** HUMAN-RUN ONLY (Martin, fresh SQL editor tab): this file UPDATEs the shared reference row 'VW MQ100' (R2). ***
--
-- What it does, in one transaction:
--   1. transmission_units: NEW 'VW SQ100' (ASG 0CT, rating 3) and 'VW 0CZ' (e iV single speed, rating 5) (C5, C6, R2).
--   2. transmission_units: UPDATE the shared 'VW MQ100' stub (0CF manual): maker, speeds 5, alt_codes, rating 4, notes
--      (R2). It is a shared row -- every model linked to it gets these values; today NO configuration uses it (guarded).
--   3. catalog_models: NEW 'Citigo' (Škoda, segment A, czech) (C1).
--   4. catalog_phases: NEW AA Pre-facelift 2011-2017, AA Facelift 2017-2019, AA-iV Facelift 'CITIGOe iV (AA)' 2019-2020
--      (S2); NCAP 2011 5* / 2019 3* (S1); towing 0 (T1); market M1, resale M3 (pass-5 recommendations).
--   5. phase_body_dimensions: NEW 5 rows (T2, T3, T4, T7; ISOFIX S4).
--   6. catalog_engines: NEW ${nEng} (${combustion.length} combustion incl. the first fuel_type 'cng' rows, 1 electric). REUSE live
--      CHYA@44 / CHYB@55 (Euro 6) unchanged. Oil 3.4 l (T9), belt 210 000 km / years NULL (R5), rating 4 (R1),
--      yearly maintenance petrol 100-140 / CNG 140-190 EUR (maintenance, CNG proposed).
--   7. catalog_vehicle_configurations: NEW ${nCfg} (incl. F10 55 kW ASG Euro 6d-TEMP, T10 / S5).
--   8. catalog_trims: NEW 8 (Pre-facelift names only, S3); catalog_trim_features: NEW ${nFeat} (S6: seatbelt_reminders on the e iV only).
--   9. catalog_component_faults: NEW ${nFault} with Martin's SK / CZ costs; probabilities proposed (R4); one Takata recall
--      check per petrol phase (R6). Nothing is written to CHYA@44 / CHYB@55 or any other existing row (R7 flag only).
-- Deliberately NULL: J497 cost (M), F8 CNG WLTP consumption (T5), e iV market, oil spec, battery thermal management,
-- heat pump. Not here: 69DU (R6, out), 93J5 e iV battery recall (R6, research notes only), CNG-tank fault (blocker).

BEGIN;

DO $$
DECLARE n int; brand uuid; mid uuid; pf uuid; fl uuid; iv uuid; b3 uuid; b5 uuid; u_mt uuid; u_asg uuid; u_ev uuid;
BEGIN
  -- Guards (read the live state this file was written against, 2026-11-20).
  SELECT id INTO brand FROM public.catalog_brands WHERE name = 'Škoda';
  SELECT id INTO b3 FROM public.catalog_body_types WHERE name = 'Hatchback 3-door';
  SELECT id INTO b5 FROM public.catalog_body_types WHERE name = 'Hatchback 5-door';
  IF brand IS NULL OR b3 IS NULL OR b5 IS NULL THEN RAISE EXCEPTION 'Brand Škoda or a hatchback body type missing -- rolled back'; END IF;
  SELECT count(*) INTO n FROM public.catalog_models WHERE brand_id = brand AND lower(replace(name, ' ', '')) = 'citigo';
  IF n <> 0 THEN RAISE EXCEPTION 'A Škoda Citigo model already exists -- rolled back'; END IF;
  SELECT count(*) INTO n FROM public.catalog_engines WHERE code IN (${newEngineCodes});
  IF n <> 0 THEN RAISE EXCEPTION 'Found % Citigo engine codes already live -- rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_engines
   WHERE (code = 'CHYA' AND power_kw = 44 AND emission_standard = 'Euro6' AND torque_nm = 95 AND displacement_cc = 999)
      OR (code = 'CHYB' AND power_kw = 55 AND emission_standard = 'Euro6' AND torque_nm = 95 AND displacement_cc = 999);
  IF n <> 2 THEN RAISE EXCEPTION 'Expected the live Euro 6 rows CHYA@44 / CHYB@55 to REUSE, found % -- rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.transmission_units
   WHERE code IN ('VW SQ100', 'VW 0CZ') OR coalesce(alt_codes, '{}') && ARRAY['SQ100', '0CT', '0CZ', 'MQ100', '0CF']::text[];
  IF n <> 0 THEN RAISE EXCEPTION 'A Citigo gearbox code already exists (% rows) -- rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.transmission_units
   WHERE code = 'VW MQ100' AND family = 'manual' AND maker IS NULL AND speeds IS NULL AND alt_codes IS NULL AND reliability_rating IS NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'VW MQ100 is not the untouched stub any more (% rows) -- rolled back, re-check (rule 6b)', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations c JOIN public.transmission_units t ON t.id = c.unit_id
   WHERE t.code = 'VW MQ100';
  IF n <> 0 THEN RAISE EXCEPTION 'VW MQ100 is linked to % configurations now -- R2 assumed none; rolled back, re-check', n; END IF;

  -- 1. New gearbox rows (C5, C6, R2). Sources: Škoda SSP 093 (SQ100-5F = automated 0CF), Škoda workshop manual
  --    "Automatic gearbox 0CT" (Citigo 2012 ->), VW workshop manual "1-speed gearbox 0CZ" (e-up! 2014 / 2017 / 2020).
  --    'VW 0CZ' joins the reviewed VW Group single_speed group (scripts/known-distinct-reference-groups.json).
  INSERT INTO public.transmission_units
    (code, alt_codes, family, maker, speeds, reliability_rating, reliability_note, maintenance_note, pros, cons)
  VALUES
    ('VW SQ100', ARRAY['SQ100', '0CT']::text[], 'amt', 'Volkswagen Group', 5, 3,
     'Automated version of the 0CF five-speed manual (Škoda SSP 093: SQ100-5F) with electromechanical clutch and gear actuators, in the Škoda Citigo / VW up! / SEAT Mii 1.0 MPI 44 and 55 kW (2012 - 2019). Owners report the car losing drive or falling out of gear with the gear warning lit; the usual fixes are a software update, the clutch actuator, the gear-selector module or a new clutch and flywheel. Shifts are slow and moving off is jerky (ADAC).',
     'Filled for life, no gearbox-oil service. The clutch is a wear part. On any gear warning ask for the gearbox software update first; there is no P position -- park in N with the handbrake.',
     ARRAY['No clutch pedal in town traffic', 'Light: under 30 kg (Škoda)']::text[],
     ARRAY['Jerky moving off and very slow gear changes (ADAC)', 'Loss-of-drive faults reported by owners: actuator, selector module or clutch', 'No P position']::text[]),
    ('VW 0CZ', ARRAY['0CZ']::text[], 'single_speed', 'Volkswagen Group', 1, 5,
     'Single-speed reduction gear and differential of the e-up! family (VW workshop manual "1-speed gearbox 0CZ", e-up! 2014 / 2017 / 2020), also in the Škoda CITIGOe iV and SEAT Mii electric (2020). Final drive 5.176 (Škoda CZ). No fault pattern or recall for the gearbox itself was found.',
     'One fixed gear: no clutch, filter or torque converter. No gearbox-oil change found in the Škoda documents.',
     ARRAY['No clutch, torque converter or gear changes -- nothing that wears like a conventional gearbox']::text[],
     ARRAY['Code confirmed for the VW e-up!; Škoda does not publish it for the CITIGOe iV']::text[]);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 new gearbox rows, inserted % -- rolled back', n; END IF;

  -- 2. Shared 'VW MQ100' (R2): rating 4 etc. SHARED ROW -- any model linked to it later inherits these values.
  UPDATE public.transmission_units
     SET maker = 'Volkswagen Group', speeds = 5, alt_codes = ARRAY['MQ100', '0CF']::text[], reliability_rating = 4,
         reliability_note = 'Five-speed manual 0CF (Škoda SSP 093: MQ100-5F), developed for the NSF small cars -- Škoda Citigo, VW up!, SEAT Mii 1.0 MPI 44 / 55 kW and 1.0 CNG 50 kW (2011 - 2019). About 27 kg. No recurring gearbox fault was verified in ADAC data or the owner forums read.',
         maintenance_note = 'Filled for life (Škoda SSP 093): no gearbox-oil service. The clutch is a wear part.',
         pros = ARRAY['Light and compact (about 27 kg)']::text[],
         cons = ARRAY['Five gears only']::text[]
   WHERE code = 'VW MQ100';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected to update 1 VW MQ100 row, updated % -- rolled back', n; END IF;
  SELECT id INTO u_mt FROM public.transmission_units WHERE code = 'VW MQ100';
  SELECT id INTO u_asg FROM public.transmission_units WHERE code = 'VW SQ100';
  SELECT id INTO u_ev FROM public.transmission_units WHERE code = 'VW 0CZ';

  -- 3. Model (C1).
  INSERT INTO public.catalog_models (brand_id, name, segment, origin_country) VALUES (brand, 'Citigo', 'A', 'czech') RETURNING id INTO mid;

  -- 4. Phases. NCAP S1 (Pre-facelift: 2011 VW up! result applied to the Citigo; Facelift + e iV: 2019 re-rating "all
  --    CITIGOs"). Towing 0 (T1, owner's manual "not approved for towing a trailer"). Market: Pre-facelift SK n=25,
  --    Facelift CZ n=25 (M1); e iV NULL (fewer than 10 ads per country, M2). Resale M3.
  INSERT INTO public.catalog_phases
    (model_id, generation_code, phase_label, year_from, year_to, display_name, platform_code, chassis_type,
     safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,
     towing_capacity_kg, price_range_min_eur, avg_market_price_eur, price_range_max_eur, typical_mileage_range, resale_value_rating)
  VALUES (mid, 'AA', 'Pre-facelift', 2011, 2017, 'Citigo (AA) Pre-facelift', 'NSF', 'monocoque', 5, 2011, 89, 80, 46, 86,
          0, 2800, 4700, 6300, '26,916 - 231,782 km', 'holds_well') RETURNING id INTO pf;
  INSERT INTO public.catalog_phases
    (model_id, generation_code, phase_label, year_from, year_to, display_name, platform_code, chassis_type,
     safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,
     towing_capacity_kg, price_range_min_eur, avg_market_price_eur, price_range_max_eur, typical_mileage_range, resale_value_rating)
  VALUES (mid, 'AA', 'Facelift', 2017, 2019, 'Citigo (AA) Facelift', 'NSF', 'monocoque', 3, 2019, 81, 83, 46, 55,
          0, 5681, 6948, 7765, '30,412 - 185,800 km', 'holds_well') RETURNING id INTO fl;
  INSERT INTO public.catalog_phases
    (model_id, generation_code, phase_label, year_from, year_to, display_name, platform_code, chassis_type,
     safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,
     towing_capacity_kg, price_range_min_eur, avg_market_price_eur, price_range_max_eur, typical_mileage_range, resale_value_rating)
  VALUES (mid, 'AA-iV', 'Facelift', 2019, 2020, 'CITIGOe iV (AA)', 'NSF', 'monocoque', 3, 2019, 81, 83, 46, 55,
          0, NULL, NULL, NULL, NULL, 'average') RETURNING id INTO iv;

  -- 5. Bodies. Pre-facelift: ADAC EU weights, height 1 478 (T3); Facelift: SK brochure 02/2019 (T2, T4); e iV: own row,
  --    tank NULL (T7). 4 seats; ISOFIX 2 rear outer, none front (S4).
  INSERT INTO public.phase_body_dimensions
    (phase_id, body_type_id, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg, boot_capacity_liters,
     boot_max_liters, gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters, seats_count, isofix_count,
     isofix_front_passenger, roof_load_kg, nose_weight_kg)
  VALUES
    (pf, b3, 3563, 1641, 1478, 136, 929,  251, 951, 1290, 361, 35::numeric,   4, 2, false, 50, NULL),
    (pf, b5, 3563, 1645, 1478, 136, 929,  251, 959, 1290, 361, 35::numeric,   4, 2, false, 50, NULL),
    (fl, b3, 3597, 1641, 1478, 136, 934,  251, 951, 1330, 396, 35::numeric,   4, 2, false, 50, NULL),
    (fl, b5, 3597, 1645, 1478, 136, 934,  251, 959, 1330, 396, 35::numeric,   4, 2, false, 50, NULL),
    (iv, b5, 3597, 1645, 1481, 141, 1235, 250, 923, 1530, 295, NULL::numeric, 4, 2, false, 50, NULL);

  -- 6. Engines (engines.csv).
  WITH v(code, power_kw, fuel_type, torque_nm, emission_standard, display_name, displacement_cc, cylinders, timing_type,
         injection_type, oil_l, oil_km, oil_months, belt_km, ym_min, ym_max, rating, note, pros, cons) AS (VALUES
${engineValues}
  )
  INSERT INTO public.catalog_engines
    (code, power_kw, fuel_type, torque_nm, emission_standard, display_name, displacement_cc, cylinders, timing_type,
     injection_type, engine_oil_capacity_liters, oil_change_interval_km, oil_change_interval_months, timing_replacement_km,
     timing_replacement_years, yearly_maintenance_eur_min, yearly_maintenance_eur_max, reliability_rating,
     has_dpf, has_gpf, has_adblue, maintenance_note, pros, cons)
  SELECT code, power_kw, fuel_type, torque_nm, emission_standard, display_name, displacement_cc, cylinders, timing_type,
         injection_type, oil_l, oil_km, oil_months, belt_km, NULL, ym_min, ym_max, rating,
         false, NULL, false, note, pros, cons
    FROM v;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${combustion.length} THEN RAISE EXCEPTION 'Expected ${combustion.length} combustion engines, inserted % -- rolled back', n; END IF;

  WITH v(code, display_name, power_kw, torque_nm, battery, ac_kw, dc_kw, rating, note, pros, cons) AS (VALUES
${evValues}
  )
  INSERT INTO public.catalog_engines
    (code, display_name, power_kw, fuel_type, torque_nm, battery_capacity_net_kwh, max_ac_charging_kw, max_dc_charging_kw,
     battery_thermal_management, heat_pump, has_dpf, has_gpf, has_adblue, reliability_rating, maintenance_note, pros, cons)
  SELECT code, display_name, power_kw, 'electric', torque_nm, battery, ac_kw, dc_kw, NULL, NULL, false, false, false, rating,
         note, pros, cons
    FROM v;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${ev.length} THEN RAISE EXCEPTION 'Expected ${ev.length} electric engine, inserted % -- rolled back', n; END IF;

  -- 7. Configurations (configurations.csv). Front-wheel drive, no drivetrain system.
  WITH v(id, phase, doors, code, kw, unit, l100, kwh100, co2, cycle, range_km, curb, acc, vmax, sec_fuel, sec_l100, tank) AS (VALUES
${cfgValues}
  )
  INSERT INTO public.catalog_vehicle_configurations
    (phase_id, body_type_id, engine_id, unit_id, drivetrain_id, driven_axle, fuel_consumption_l100km, energy_consumption_kwh100km,
     co2_emissions_g_km, consumption_cycle, ev_range_km, curb_weight_kg, acceleration_0_100, top_speed_kmh,
     secondary_fuel_type, secondary_consumption_l100km, fuel_tank_capacity_liters)
  SELECT CASE v.phase WHEN 'pf' THEN pf WHEN 'fl' THEN fl ELSE iv END, CASE v.doors WHEN 3 THEN b3 ELSE b5 END, e.id,
         CASE v.unit WHEN 'mt' THEN u_mt WHEN 'asg' THEN u_asg ELSE u_ev END, NULL, 'front', v.l100, v.kwh100,
         v.co2, v.cycle, v.range_km, v.curb, v.acc, v.vmax, v.sec_fuel, v.sec_l100, v.tank
    FROM v JOIN public.catalog_engines e ON e.code = v.code AND e.power_kw = v.kw;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${nCfg} THEN RAISE EXCEPTION 'Expected ${nCfg} configurations, inserted % -- rolled back', n; END IF;

  -- 8. Trims. Pre-facelift: names only, Czech launch report auto.cz 01.11.2011 (secondary source, S3); prices and
  --    equipment wait for an official ŠA SK / CZ list. Facelift: ŠA SK 14.01.2019. e iV: ŠA SK 18.12.2019.
  INSERT INTO public.catalog_trims (phase_id, name, tier)
  VALUES (pf, 'Easy', '1'), (pf, 'Active', '2'), (pf, 'Ambition', '3'), (pf, 'Elegance', '4'),
         (fl, 'Active', '1'), (fl, 'Ambition', '2'), (fl, 'Style', '3'), (iv, 'iV', '1');

  WITH v(phase, trim_name, feature, is_optional, feature_group, slug) AS (VALUES
${featValues}
  )
  INSERT INTO public.catalog_trim_features (trim_id, feature, is_optional, feature_group, safety_feature_slug)
  SELECT t.id, v.feature, v.is_optional, v.feature_group, v.slug
    FROM v JOIN public.catalog_trims t ON t.phase_id = CASE v.phase WHEN 'fl' THEN fl ELSE iv END AND t.name = v.trim_name;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${nFeat} THEN RAISE EXCEPTION 'Expected ${nFeat} trim features, inserted % -- rolled back', n; END IF;

  -- 9. Faults (faults.csv). Costs: Martin's independent SK / CZ figures (EUR incl. VAT); probabilities proposed (R4);
  --    recall rows: probability and cost NULL (fixed free by the campaign; the cost CHECK forbids 0).
  WITH v(ctype, ecode, ekw, ucode, phase, category, fault, severity, p, cmin, cmax, y1, y2, chk) AS (VALUES
${faultValues}
  )
  INSERT INTO public.catalog_component_faults
    (component_type, engine_id, unit_id, phase_id, category, fault, severity, annual_probability,
     estimated_cost_eur_min, estimated_cost_eur_max, affected_year_from, affected_year_to, pre_purchase_check)
  SELECT v.ctype,
         (SELECT e.id FROM public.catalog_engines e WHERE e.code = v.ecode AND e.power_kw = v.ekw),
         (SELECT t.id FROM public.transmission_units t WHERE t.code = v.ucode),
         CASE v.phase WHEN 'pf' THEN pf WHEN 'fl' THEN fl WHEN 'iv' THEN iv END,
         v.category, v.fault, v.severity, v.p, v.cmin, v.cmax, v.y1, v.y2, v.chk
    FROM v;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${nFault} THEN RAISE EXCEPTION 'Expected ${nFault} faults, inserted % -- rolled back', n; END IF;

  -- Post-checks.
  SELECT count(*) INTO n FROM public.catalog_vehicle_configurations WHERE phase_id IN (pf, fl, iv);
  IF n <> ${nCfg} THEN RAISE EXCEPTION 'Post-check: expected ${nCfg} Citigo configurations, found % -- rolled back', n; END IF;
  SELECT count(*) INTO n FROM public.catalog_component_faults f
   WHERE f.phase_id IN (pf, fl, iv) OR f.unit_id = u_asg
      OR f.engine_id IN (SELECT id FROM public.catalog_engines WHERE code IN (${newEngineCodes}));
  IF n <> ${nFault} THEN RAISE EXCEPTION 'Post-check: expected ${nFault} Citigo faults, found % -- rolled back', n; END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(outFile, sql);
console.log(`Wrote ${path.relative(process.cwd(), outFile)}: ${nEng} engines, ${nCfg} configurations, ${nFeat} trim features, ${nFault} faults. Nothing was run against the database.`);
