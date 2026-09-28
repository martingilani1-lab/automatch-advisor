// Pre-generates blank config-grid CSVs (one per phase) for the new-car intake template,
// so the human marks 'x' in a ready-made grid instead of hand-typing column headers.
//
// Columns = every (body x gearbox x drivetrain) combination this car's dictionary entries
// make POSSIBLE — built from dimensions.csv (bodies per phase), transmissions.csv (gearbox
// codes) and drivetrains.csv (extra AWD/4x4 systems this car uses; optional — FWD is always
// included as the no-AWD baseline). Rows = every engine in engines.csv. This is a superset
// menu to prune, not a claim every combination is real — most cars will need most columns
// deleted before marking cells (see the body-availability warning in README.md).
//
// Run from repo root: node scripts/gen-config-grid.mjs [template-dir]
// Refuses to overwrite a configs-<phase>.csv that already has an 'x' mark in it, unless
// --force is passed, so a re-run can't silently erase work already done.

import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const force = args.includes("--force");
const dir = args.find(a => !a.startsWith("--")) || "scripts/new-car-template";

function readCsv(name) {
  const p = path.join(dir, name);
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, "utf8").split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  if (lines.length < 1) return [];
  const header = lines[0].split(",");
  return lines.slice(1).map(line => {
    const cells = line.split(",");
    const row = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

const phases = readCsv("phases.csv");
const dims = readCsv("dimensions.csv");
const trans = readCsv("transmissions.csv");
const engines = readCsv("engines.csv");
const drivetrains = readCsv("drivetrains.csv"); // optional; column: drivetrain_code

for (const [name, rows] of [["phases.csv", phases], ["dimensions.csv", dims], ["transmissions.csv", trans], ["engines.csv", engines]]) {
  if (!rows.length) {
    console.error(`${name} is empty or missing in ${dir} — fill it first (see README.md fill order).`);
    process.exit(1);
  }
}

const gearboxCodes = [...new Set(trans.map(t => t.code).filter(Boolean))];
const dtCodes = ["FWD", ...new Set(drivetrains.map(d => d.drivetrain_code).filter(Boolean))];
const engineRows = engines.filter(e => e.code && e.power_kw).map(e => [e.code, e.power_kw]);

const skipped = [];
const written = [];

for (const ph of phases) {
  const phaseLabel = ph.phase_label;
  if (!phaseLabel) continue;
  const bodies = [...new Set(dims.filter(d => d.phase_label === phaseLabel).map(d => d.body_type).filter(Boolean))];
  if (!bodies.length) {
    console.warn(`No bodies found in dimensions.csv for phase "${phaseLabel}" — skipping its grid (fill dimensions.csv first).`);
    continue;
  }

  const columns = [];
  for (const gb of gearboxCodes) for (const dt of dtCodes) for (const b of bodies) columns.push(`${b}|${gb}|${dt}`);

  const outPath = path.join(dir, `configs-${phaseLabel}.csv`);
  if (fs.existsSync(outPath) && !force) {
    const existing = fs.readFileSync(outPath, "utf8");
    if (/,x(,|\s*$)/m.test(existing)) {
      skipped.push(outPath);
      continue;
    }
  }

  const header = ["phase_label", "engine_code", "power_kw", ...columns];
  const lines = [
    `# Pre-generated columns for "${phaseLabel}" — every body x gearbox x drivetrain combo`,
    "# this car's dictionary entries make POSSIBLE, not a claim every one is real.",
    "# DELETE any column that never happened for this car before marking cells.",
    "# Mark 'x' only where the combo really existed from the factory. Empty = didn't exist.",
    "# A high-output/special engine usually did NOT come in every body — check before marking.",
    header.join(","),
    ...engineRows.map(([code, kw]) => [phaseLabel, code, kw, ...columns.map(() => "")].join(",")),
  ];
  fs.writeFileSync(outPath, lines.join("\n") + "\n");
  written.push({ outPath, rows: engineRows.length, cols: columns.length });
}

for (const w of written) {
  console.log(`Wrote ${w.outPath} — ${w.rows} engine rows x ${w.cols} candidate columns.`);
}
if (skipped.length) {
  console.log(`\nSkipped (already has 'x' marks — use --force to overwrite): ${skipped.join(", ")}`);
}
if (!written.length && !skipped.length) {
  console.log("Nothing written.");
}
