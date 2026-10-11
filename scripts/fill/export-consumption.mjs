// Exports scripts/fill/consumption.csv: one row per distinct (phase, engine, gearbox,
// drivetrain) combination actually used by catalog_vehicle_configurations, with the
// fuel_consumption_l100km/energy_consumption_kwh100km columns left empty for a human to fill
// in by hand. Read-only -- queries the live DB, writes a CSV, touches nothing else. Not a
// migration/seed script (no SQL is generated here); run again any time to regenerate the CSV
// if new cars are added before this one is filled in and re-imported.
//
// Distinct key is (phase_id, engine_id, unit_id, drivetrain_id) -- NOT the full
// catalog_vehicle_configurations row, which also varies by body_type_id. A given
// engine+gearbox+drivetrain combo is one real-world driveline regardless of which body it's
// bolted into, and consumption figures are authored per-driveline, not per-body -- so distinct
// bodies collapse into one row with a `bodies` column listing all of them, rather than one
// duplicate consumption row per body.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "consumption.csv");

// PostgREST caps a single request at 1000 rows regardless of an in-request .range() --
// confirmed live while building /api/db-test (catalog_vehicle_configurations already holds
// more than 1000 rows). Real pagination, not a bigger .range(), is the only fix.
async function fetchAllRows(table, select) {
  const pageSize = 1000;
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function csvField(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const configs = await fetchAllRows(
    "catalog_vehicle_configurations",
    `
    id, phase_id, engine_id, unit_id, drivetrain_id,
    catalog_phases(generation_code, phase_label, catalog_models(name, catalog_brands(name))),
    catalog_engines(code, display_name, power_kw),
    transmission_units(code),
    drivetrain_systems(code),
    catalog_body_types(name)
    `
  );

  const groups = new Map();
  for (const c of configs) {
    const key = `${c.phase_id}:${c.engine_id}:${c.unit_id}:${c.drivetrain_id ?? "none"}`;
    let g = groups.get(key);
    if (!g) {
      const phase = c.catalog_phases;
      const model = phase?.catalog_models;
      const brand = model?.catalog_brands;
      const engine = c.catalog_engines;
      g = {
        brand: brand?.name ?? "",
        model: model?.name ?? "",
        gen: phase?.generation_code ?? "",
        phase: phase?.phase_label ?? "",
        engineLabel: engine?.display_name
          ? `${engine.display_name} (${engine.code}) ${engine.power_kw} kW`
          : `${engine?.code ?? ""} ${engine?.power_kw ?? ""} kW`,
        gearbox: c.transmission_units?.code ?? "",
        drivetrain: c.drivetrain_systems?.code ?? "FWD",
        bodies: new Set(),
      };
      groups.set(key, g);
    }
    if (c.catalog_body_types?.name) g.bodies.add(c.catalog_body_types.name);
  }

  const rows = [...groups.values()].sort((a, b) =>
    a.brand.localeCompare(b.brand) ||
    a.model.localeCompare(b.model) ||
    a.phase.localeCompare(b.phase) ||
    a.engineLabel.localeCompare(b.engineLabel)
  );

  console.log(`${configs.length} catalog_vehicle_configurations rows -> ${rows.length} distinct (phase, engine, gearbox, drivetrain) rows.`);

  const header = ["brand", "model", "gen", "phase", "engine", "gearbox", "drivetrain", "bodies", "fuel_consumption_l100km", "energy_consumption_kwh100km"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      csvField(r.brand),
      csvField(r.model),
      csvField(r.gen),
      csvField(r.phase),
      csvField(r.engineLabel),
      csvField(r.gearbox),
      csvField(r.drivetrain),
      csvField([...r.bodies].join("; ")),
      "",
      "",
    ].join(","));
  }

  writeFileSync(OUT_PATH, lines.join("\n") + "\n");
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
