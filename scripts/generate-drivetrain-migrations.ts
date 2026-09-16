// ONE-TIME, MANUALLY-RUN generator for the drivetrain_systems catalogue-load
// and transmissions.drivetrain_id pairing migrations. Reads two CSVs, writes
// two .sql files to supabase/migrations/ — never opens a DB connection,
// never executes anything. Same discipline as every other data-authoring
// script in scripts/.
//
// Usage: npx tsx scripts/generate-drivetrain-migrations.ts
// Reads:
//   scripts/drivetrain-systems-template.csv   (Template 1 — the 22-system catalogue)
//   scripts/drivetrain-pairing-filled.csv     (finalized transmission-variant pairing)
// Writes:
//   supabase/migrations/20260916120100_load_drivetrain_systems_catalogue.sql
//   supabase/migrations/20260916120200_set_transmissions_drivetrain_id.sql
//
// Both validated before anything is written — see the two checks below. A
// validation failure throws and writes NOTHING, rather than emitting SQL
// that would fail (or silently do the wrong thing) when run.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
function parseCsv(filePath: string): { header: string[]; rows: string[][] } {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0 && !l.startsWith("#"));
  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return { header, rows };
}
function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}
function sqlValue(cell: string | undefined): string {
  const v = (cell ?? "").trim();
  return v === "" ? "NULL" : `'${sqlEscape(v)}'`;
}

const VALID_TYPES = ["haldex", "torsen", "permanent", "on_demand", "dual_motor"];
const STALE_SAMPLE_CODE = "Haldex gen 5";

// ════════════════════════════════════════════════════════════
// 1. Catalogue load
// ════════════════════════════════════════════════════════════

const catalogue = parseCsv(path.join(__dirname, "drivetrain-systems-template.csv"));
const cCol = (name: string) => catalogue.header.indexOf(name);

const typeErrors: string[] = [];
const catalogueCodes = new Set<string>();
for (const r of catalogue.rows) {
  const code = r[cCol("code")].trim();
  const type = r[cCol("type")].trim();
  catalogueCodes.add(code);
  if (!VALID_TYPES.includes(type)) {
    typeErrors.push(`code="${code}" has type="${type}", not in [${VALID_TYPES.join(", ")}]`);
  }
}
if (typeErrors.length) {
  throw new Error(`Refusing to generate — invalid type value(s) in drivetrain-systems-template.csv:\n  ${typeErrors.join("\n  ")}`);
}
console.log(`Catalogue: ${catalogue.rows.length} systems, all types validated against the frozen CHECK list.`);

const catalogueCols = ["code", "type", "generation", "maker", "description", "reliability_note", "maintenance_note"];
const catalogueValueRows = catalogue.rows.map((r) => {
  const vals = catalogueCols.map((c) => sqlValue(r[cCol(c)]));
  return `  (${vals.join(", ")})`;
});
const catalogueUpdateSet = catalogueCols
  .filter((c) => c !== "code")
  .map((c) => `  ${c.padEnd(17)} = EXCLUDED.${c}`)
  .join(",\n");

const migration2 = [
  "-- Loads the 22-system AWD/4WD drivetrain catalogue (Template 1) into",
  "-- drivetrain_systems. Generated from scripts/drivetrain-systems-template.csv",
  "-- by scripts/generate-drivetrain-migrations.ts — review before running.",
  "--",
  "-- PREREQUISITE: run 20260916120000_add_drivetrain_systems_catalogue_columns.sql",
  "-- first — this file's INSERT populates generation/description/maintenance_note,",
  "-- which don't exist on the table until that migration runs.",
  "--",
  `-- The table has one pre-existing row, code='${STALE_SAMPLE_CODE}' — the original`,
  "-- migration's own SAMPLE placeholder (its reliability_note literally says",
  '-- "SAMPLE — replace."). Its code uses a different string convention than the',
  "-- catalogue's own haldex_gen5, so a plain ON CONFLICT(code) upsert would NOT",
  "-- match/replace it — it would sit alongside the new haldex_gen5 row as a",
  "-- duplicate. Deleting it explicitly first, per your confirmation.",
  "delete from drivetrain_systems where code = '" + sqlEscape(STALE_SAMPLE_CODE) + "';",
  "",
  "-- Idempotent: upserts on the unique `code`, safe to re-run after editing the CSV.",
  `insert into drivetrain_systems (${catalogueCols.join(", ")})`,
  "values",
  catalogueValueRows.join(",\n") + "",
  "on conflict (code) do update set",
  catalogueUpdateSet + ";",
  "",
].join("\n");

const out2 = path.join(__dirname, "..", "supabase", "migrations", "20260916120100_load_drivetrain_systems_catalogue.sql");
fs.writeFileSync(out2, migration2);
console.log(`Wrote ${out2}`);

// ════════════════════════════════════════════════════════════
// 2. Pairing — transmissions.drivetrain_id
// ════════════════════════════════════════════════════════════

const pairing = parseCsv(path.join(__dirname, "drivetrain-pairing-filled.csv"));
const pCol = (name: string) => pairing.header.indexOf(name);

const pairedRows = pairing.rows.filter((r) => r[pCol("proposed_code")].trim() !== "");
const nullRows = pairing.rows.length - pairedRows.length;

const codeErrors: string[] = [];
for (const r of pairedRows) {
  const code = r[pCol("proposed_code")].trim();
  if (!catalogueCodes.has(code)) {
    codeErrors.push(`transmission id ${r[pCol("vehicle_id")]} (${r[pCol("brand")]} ${r[pCol("model")]} / ${r[pCol("transmission_variant")]}) has proposed_code="${code}", not found in the 22-system catalogue`);
  }
}
if (codeErrors.length) {
  throw new Error(`Refusing to generate — proposed_code value(s) in drivetrain-pairing-filled.csv not present in the catalogue:\n  ${codeErrors.join("\n  ")}`);
}
console.log(`Pairing: ${pairedRows.length} rows with a code (all validated against the catalogue), ${nullRows} left null.`);

// NOTE: drivetrain-pairing-filled.csv doesn't carry the transmission row's own
// id — it has vehicle_id + transmission_variant (the specific_type text). The
// UPDATE below matches on (vehicle_id, specific_type) together, which is
// exactly how the pairing sheet was built (one row per vehicle x transmission
// variant) and is unambiguous per the source data.
const pairingStatements = pairedRows.map((r) => {
  const vehicleId = r[pCol("vehicle_id")];
  const variant = r[pCol("transmission_variant")];
  const code = r[pCol("proposed_code")].trim();
  const brand = r[pCol("brand")];
  const model = r[pCol("model")];
  return `update transmissions set drivetrain_id = (select id from drivetrain_systems where code = '${sqlEscape(code)}') where vehicle_id = '${vehicleId}' and specific_type = '${sqlEscape(variant)}'; -- ${sqlEscape(brand)} ${sqlEscape(model)}`;
});

const migration3 = [
  "-- Sets transmissions.drivetrain_id for the 243 (vehicle, transmission-variant)",
  "-- pairs confirmed in scripts/drivetrain-pairing-filled.csv. Generated by",
  "-- scripts/generate-drivetrain-migrations.ts — review before running.",
  "--",
  "-- PREREQUISITE: run 20260916120100_load_drivetrain_systems_catalogue.sql first —",
  "-- the subquery below resolves each row's drivetrain_systems.id by code, which",
  "-- only exists once that migration has populated the table.",
  "--",
  "-- Matches by (vehicle_id, specific_type) rather than a hardcoded transmission",
  "-- row id, since the pairing CSV doesn't carry transmissions.id directly — this",
  "-- pair is unambiguous per vehicle in the source data.",
  "--",
  `-- ${pairedRows.length} rows get a drivetrain_id; the other ${nullRows} transmission`,
  "-- rows in the catalogue are intentionally left untouched (still NULL) — no",
  "-- reliable pairing exists for them yet (see the pairing review for why each).",
  "",
  ...pairingStatements,
  "",
].join("\n");

const out3 = path.join(__dirname, "..", "supabase", "migrations", "20260916120200_set_transmissions_drivetrain_id.sql");
fs.writeFileSync(out3, migration3);
console.log(`Wrote ${out3}`);
