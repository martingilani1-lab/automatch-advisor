// Batch wrapper for the import-car pipeline's PREP stage — runs gen-config-grid,
// reconcile, and validate-template for every car folder in the batch, and prints ONE
// consolidated report instead of three separate outputs per car. Calls the existing
// single-car scripts as child processes (node scripts/gen-config-grid.mjs <dir>, etc.) —
// does NOT reimplement or fork their logic, so a fix to any of the three stays a
// one-file change, same as before this existed.
//
// Read-only in effect: gen-config-grid.mjs only ever WRITES a blank config-grid CSV, and
// refuses to touch one that already has 'x' marks in it (see its own header comment) —
// safe to run unconditionally on already-filled car folders, it'll just skip those.
// reconcile.mjs and validate-template.mjs are both read-only against the live DB. No seed
// is generated here, no writes to the DB.
//
// Run from repo root:
//   node scripts/batch-prep.mjs <car-dir> [<car-dir> ...]
//   node scripts/batch-prep.mjs --all                      (every folder in scripts/cars/)
// <car-dir> may be a bare folder name (resolved under scripts/cars/) or a full path.
// Exit code 1 if ANY car has a reconcile problem or a validate ERROR, else 0.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const CARS_ROOT = "scripts/cars";
const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));

function resolveCarDirs(args) {
  if (args.includes("--all")) {
    if (!fs.existsSync(CARS_ROOT)) return [];
    return fs.readdirSync(CARS_ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(CARS_ROOT, d.name))
      .sort();
  }
  return args.filter(a => !a.startsWith("--")).map(a => (a.includes("/") ? a : path.join(CARS_ROOT, a)));
}

// Spawns one of the existing single-car scripts and captures its output — never lets its
// stdout print directly, so the whole batch can be assembled into one report at the end.
function run(script, args) {
  const r = spawnSync("node", [path.join(SCRIPTS_DIR, script), ...args], { encoding: "utf8" });
  return { stdout: r.stdout || "", stderr: r.stderr || "", status: r.status };
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/batch-prep.mjs <car-dir> [<car-dir> ...] | --all");
  process.exit(1);
}
const carDirs = resolveCarDirs(args);
if (!carDirs.length) {
  console.error("No car directories resolved — check the names, or that scripts/cars/ has folders.");
  process.exit(1);
}

const results = [];

for (const dir of carDirs) {
  const carName = path.basename(dir);
  if (!fs.existsSync(dir)) {
    results.push({ carName, missing: true });
    continue;
  }

  const grid = run("gen-config-grid.mjs", [dir]);
  const reconcile = run("reconcile.mjs", [dir]);
  const validate = run("validate-template.mjs", [dir]);

  results.push({
    carName,
    grid,
    reconcile,
    validate,
    ready: reconcile.status === 0 && validate.status === 0,
  });
}

console.log("=".repeat(72));
console.log(`BATCH PREP -- ${results.length} car(s)`);
console.log("=".repeat(72));

for (const r of results) {
  console.log(`\n-- ${r.carName} ${"-".repeat(Math.max(0, 68 - r.carName.length))}`);
  if (r.missing) {
    console.log(`  MISSING -- no folder at this path, skipped.`);
    continue;
  }
  if (r.grid.stdout.trim()) console.log(`\n[gen-config-grid]\n${r.grid.stdout.trim()}`);
  console.log(`\n[reconcile]  exit=${r.reconcile.status}\n${r.reconcile.stdout.trim() || "(no output)"}`);
  if (r.reconcile.stderr.trim()) console.log(`  stderr: ${r.reconcile.stderr.trim()}`);
  console.log(`\n[validate]  exit=${r.validate.status}\n${r.validate.stdout.trim() || "(no output)"}`);
  if (r.validate.stderr.trim()) console.log(`  stderr: ${r.validate.stderr.trim()}`);
  console.log(`\n${r.carName}: ${r.ready ? "READY" : "NEEDS ATTENTION"}`);
}

console.log(`\n${"=".repeat(72)}\nSUMMARY\n${"=".repeat(72)}`);
const nameWidth = Math.max(...results.map(r => r.carName.length), 8);
for (const r of results) {
  const status = r.missing ? "MISSING" : r.ready ? "READY" : "NEEDS ATTENTION";
  console.log(`${r.carName.padEnd(nameWidth)}  ${status}`);
}
const anyProblem = results.some(r => r.missing || !r.ready);
console.log(`\n${results.filter(r => r.ready).length}/${results.length} ready.`);
process.exit(anyProblem ? 1 : 0);
