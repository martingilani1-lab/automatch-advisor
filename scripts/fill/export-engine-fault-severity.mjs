// Exports scripts/fill/engine-fault-severity.csv: every catalog_component_faults row
// (component_type = 'engine') with severity still NULL, one row per fault, with the engine's
// phase-usage count repeated on every fault row for that engine so the whole file can be
// sorted by it. Read-only -- queries the live DB, writes a CSV, touches nothing else.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "engine-fault-severity.csv");

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
  const faults = await fetchAllRows(
    "catalog_component_faults",
    "id, engine_id, fault, severity, catalog_engines(code, display_name, power_kw)"
  ).then((rows) => rows.filter((r) => r.severity == null));

  const configs = await fetchAllRows("catalog_vehicle_configurations", "engine_id, phase_id");
  const phasesByEngine = new Map();
  for (const c of configs) {
    const set = phasesByEngine.get(c.engine_id) ?? new Set();
    set.add(c.phase_id);
    phasesByEngine.set(c.engine_id, set);
  }

  const rows = faults.map((f) => ({
    engineLabel: `${f.catalog_engines.code}@${f.catalog_engines.power_kw}`,
    engineName: f.catalog_engines.display_name ?? "",
    fault: f.fault,
    phasesUsing: (phasesByEngine.get(f.engine_id) ?? new Set()).size,
  }));

  rows.sort((a, b) => b.phasesUsing - a.phasesUsing || a.engineLabel.localeCompare(b.engineLabel) || a.fault.localeCompare(b.fault));

  console.log(`${rows.length} engine faults with NULL severity -> ${OUT_PATH}`);

  const header = ["engine", "engine_name", "fault", "phases_using", "severity"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      csvField(r.engineLabel),
      csvField(r.engineName),
      csvField(r.fault),
      csvField(r.phasesUsing),
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
