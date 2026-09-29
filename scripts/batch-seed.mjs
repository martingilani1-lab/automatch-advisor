// Batch wrapper for the import-car pipeline's SEED stage — generates one seed .sql file
// per car by calling the existing scripts/generate-seed.mjs per folder (the same
// generator used for a single car, not reimplemented or forked). Run this AFTER
// batch-prep.mjs and human sign-off on its REUSE/CREATE report — this script does not
// gate on "did the human approve," that's a human step, but it does re-run
// validate-template.mjs as a machine gate immediately before generating each car's seed:
// a car that currently fails validation is SKIPPED, not seeded, so this can't silently
// turn a known-broken template into SQL.
//
// generate-seed.mjs itself never executes anything against Supabase (it only reads, to
// resolve REUSE/CREATE and detect alt_codes drift) — this wrapper doesn't either. Nothing
// is seeded, nothing is run against the DB, by running this script.
//
// Run from repo root:
//   node scripts/batch-seed.mjs <car-dir> [<car-dir> ...] | --all
// Exit code 1 if any car was skipped (validation failed) or its generator errored.

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

function run(script, args) {
  const r = spawnSync("node", [path.join(SCRIPTS_DIR, script), ...args], { encoding: "utf8" });
  return { stdout: r.stdout || "", stderr: r.stderr || "", status: r.status };
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/batch-seed.mjs <car-dir> [<car-dir> ...] | --all");
  process.exit(1);
}
const carDirs = resolveCarDirs(args);
if (!carDirs.length) {
  console.error("No car directories resolved -- check the names, or that scripts/cars/ has folders.");
  process.exit(1);
}

console.log("=".repeat(72));
console.log(`BATCH SEED -- ${carDirs.length} car(s)`);
console.log("=".repeat(72));

let anyProblem = false;
const written = [];

for (const dir of carDirs) {
  const carName = path.basename(dir);
  console.log(`\n-- ${carName} ${"-".repeat(Math.max(0, 68 - carName.length))}`);

  if (!fs.existsSync(dir)) {
    console.log(`  MISSING -- no folder at this path, skipped.`);
    anyProblem = true;
    continue;
  }

  // Re-gate on validation immediately before generating -- catches drift since
  // batch-prep.mjs was last run (e.g. a fix applied to one car but not re-validated).
  const validate = run("validate-template.mjs", [dir]);
  if (validate.status !== 0) {
    console.log(`  SKIPPED -- validate-template.mjs is still failing (run batch-prep.mjs to see why):`);
    console.log(validate.stdout.trim().split("\n").map(l => `    ${l}`).join("\n"));
    anyProblem = true;
    continue;
  }

  const gen = run("generate-seed.mjs", [dir]);
  console.log(gen.stdout.trim() || "(no output)");
  if (gen.stderr.trim()) console.log(`  stderr: ${gen.stderr.trim()}`);
  if (gen.status !== 0) {
    console.log(`  FAILED -- generate-seed.mjs exited ${gen.status}.`);
    anyProblem = true;
    continue;
  }
  const m = gen.stdout.match(/Wrote (\S+)/);
  if (m) written.push({ carName, file: m[1] });
}

console.log(`\n${"=".repeat(72)}\nSUMMARY\n${"=".repeat(72)}`);
for (const w of written) console.log(`  ${w.carName}: ${w.file}`);
console.log(`\n${written.length}/${carDirs.length} seed file(s) written. NOT executed -- review each,`);
console.log(`then run via the import-car skill's human-run steps (fresh SQL editor tab per file).`);
process.exit(anyProblem ? 1 : 0);
