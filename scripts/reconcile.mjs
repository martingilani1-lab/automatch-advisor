// Reconcile step (CLAUDE.md "Adding a new car / model — RULES", rules 1-2) as a script
// instead of a hand-typed prompt: reads the filled engines.csv + transmissions.csv from a
// new-car intake template, queries the LIVE DB, and prints the REUSE/CREATE table (engines)
// and the RESOLVED/MISSING table (transmissions) with resolved ids. Flags engine alias
// collisions — a code that's already another row's primary code, or already sits in another
// row's alt_codes — since reconcile-by-code silently assumes codes are unique, and an
// unflagged collision means "which row do I actually reuse?".
//
// Transmissions have NO create path (post catalog_transmissions -> transmission_units
// consolidation): transmissions.csv is just unit_code, matched against the live, reference-
// only transmission_units.code or alt_codes — never speed count. A MISSING unit_code is a
// hard STOP per CLAUDE.md, not something this script or generate-seed.mjs creates inline;
// see the transmission_units linking-audit workflow to add a new unit first. For every
// RESOLVED unit_code this prints the unit's family and speeds too, so a human can eyeball
// that the resolved unit is really the right physical gearbox before signing off.
//
// Read-only by default. Makes no writes unless --fix-flags is passed. Run from repo root:
//   node scripts/reconcile.mjs [template-dir] [--fix-flags]
// Exit code 1 if any problem was found (drifted REUSE/NEW claim, an engine collision, or a
// MISSING transmission unit_code), else 0 -- this is based on the report pass and is
// unaffected by --fix-flags (which runs after and reports separately; it doesn't re-run the
// report against the fixed file).
//
// --fix-flags: engines ONLY (transmissions have no reuse_or_new flag to fix anymore).
// Rewrites reuse_or_new in engines.csv to match what's actually live right now (REUSE where
// a live match exists, NEW where none does), and prints every flag it changed. Only touches
// the reuse_or_new cell of rows that actually need to change -- every other column, every
// comment, every blank line is preserved byte-for-byte. Does NOT touch a row flagged as a
// COLLISION above (an alt_code matching a different row's primary code or alt_codes) --
// that's a genuine ambiguity for a human to resolve, not a stale flag to auto-correct.

import fs from "fs";
import path from "path";
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";

function loadEnv() {
  const text = fs.readFileSync(".env.local", "utf8");
  return Object.fromEntries(
    text
      .split("\n")
      .filter(l => l.includes("="))
      .map(l => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
      })
  );
}

// RFC4180: a doubled quote ("") inside a quoted field is a literal quote, not a close+reopen.
// The previous version toggled inQ on every '"' and dropped all of them -- correct for a
// field that's merely wrapped in quotes, but it silently stripped quote characters that were
// meant to survive as literal text (e.g. a fault description quoting "Kangarooing").
function parseCsvLine(line) {
  const cells = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

function readCsv(p) {
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, "utf8").split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  if (!lines.length) return [];
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const row = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

// Rewrites ONLY the reuse_or_new cell (always column 0 in both engines.csv and
// transmissions.csv) of rows that need to change -- every other cell, comment, and blank
// line is preserved verbatim from the original file. `determineCorrect(row)` returns
// "REUSE" | "NEW" | null (null = leave this row untouched, e.g. missing code/power, or a
// collision the caller has already decided not to touch).
function fixReuseFlags(filePath, determineCorrect) {
  const raw = fs.readFileSync(filePath, "utf8");
  const allLines = raw.split("\n");
  const isContent = l => l.trim() && !l.trim().startsWith("#");
  const contentLines = allLines.filter(isContent);
  if (contentLines.length < 2) return { changes: [] };
  const header = contentLines[0];
  const dataLines = contentLines.slice(1);
  const parsedRows = readCsv(filePath); // same content-line filter, so this lines up 1:1 with dataLines

  const changes = [];
  const newDataLines = dataLines.map((line, i) => {
    const row = parsedRows[i];
    const correct = determineCorrect(row);
    if (correct == null) return line;
    const firstComma = line.indexOf(",");
    const current = line.slice(0, firstComma);
    if (current === correct) return line;
    changes.push({ code: row.code, power_kw: row.power_kw, from: current || "(empty)", to: correct });
    return correct + line.slice(firstComma);
  });

  if (!changes.length) return { changes };

  const updatedContent = [header, ...newDataLines];
  let ci = 0;
  const outLines = allLines.map(l => (isContent(l) ? updatedContent[ci++] : l));
  fs.writeFileSync(filePath, outLines.join("\n"));
  return { changes };
}

const args = process.argv.slice(2);
const fixFlags = args.includes("--fix-flags");
const dir = args.find(a => !a.startsWith("--")) || "scripts/new-car-template";
const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const engines = readCsv(path.join(dir, "engines.csv"));
const trans = readCsv(path.join(dir, "transmissions.csv"));

const { data: liveEngines, error: e1 } = await sb.from("catalog_engines").select("id, code, power_kw, alt_codes");
if (e1) throw e1;
const { data: liveUnits, error: e2 } = await sb.from("transmission_units").select("id, code, alt_codes, family, speeds");
if (e2) throw e2;

let problems = 0;

console.log("=== ENGINES ===");
for (const e of engines) {
  if (!e.code || !e.power_kw) continue;
  const kw = Number(e.power_kw);
  const primaryHit = liveEngines.find(le => le.code === e.code && le.power_kw === kw);
  const aliasHits = liveEngines.filter(le => (le.alt_codes || []).includes(e.code) && le.id !== primaryHit?.id);
  const claimed = (e.reuse_or_new || "").toUpperCase();

  if (primaryHit) {
    const mismatch = claimed === "NEW" ? "  !! template says NEW but this exists live" : "";
    console.log(`REUSE  ${e.code} (${kw}kW) -> ${primaryHit.id}${mismatch}`);
    if (mismatch) problems++;
  } else if (aliasHits.length) {
    console.log(
      `COLLISION  ${e.code} (${kw}kW) is not a primary code, but IS an alt_code of ` +
        `${aliasHits.map(h => `${h.code}/${h.power_kw}`).join(", ")} -> resolve before seeding, do not create a duplicate`
    );
    problems++;
  } else {
    const mismatch = claimed === "REUSE" ? "  !! template says REUSE but nothing matches live" : "";
    console.log(`CREATE ${e.code} (${kw}kW)${mismatch}`);
    if (mismatch) problems++;
  }

  if (e.alt_codes) {
    for (const alt of e.alt_codes.split("|").map(s => s.trim()).filter(Boolean)) {
      const clashPrimary = liveEngines.find(le => le.code === alt && le.id !== primaryHit?.id);
      const clashAlias = liveEngines.find(le => (le.alt_codes || []).includes(alt) && le.id !== primaryHit?.id);
      if (clashPrimary) {
        console.log(`  !! alt_code '${alt}' collides with ${clashPrimary.code}/${clashPrimary.power_kw}'s PRIMARY code`);
        problems++;
      } else if (clashAlias) {
        console.log(`  !! alt_code '${alt}' collides with an alt_code already on ${clashAlias.code}/${clashAlias.power_kw}`);
        problems++;
      }
    }
  }
}

console.log("\n=== TRANSMISSIONS ===");
for (const t of trans) {
  if (!t.unit_code) continue;
  const hit = liveUnits.find(lu => lu.code === t.unit_code || (lu.alt_codes || []).includes(t.unit_code));
  if (hit) {
    console.log(`RESOLVED  ${t.unit_code} -> ${hit.code} (${hit.id})  family=${hit.family}  speeds=${hit.speeds ?? "?"}`);
  } else {
    console.log(`MISSING   ${t.unit_code} -> no transmission_units row matches (checked code and alt_codes) -- STOP, add the unit first (see transmission_units linking-audit workflow), do not guess or create inline`);
    problems++;
  }
}

console.log(`\n${problems === 0 ? "No problems found." : `${problems} problem(s) found — resolve before seeding.`}`);

if (fixFlags) {
  console.log("\n=== --fix-flags ===");

  const engineChanges = fixReuseFlags(path.join(dir, "engines.csv"), (row) => {
    if (!row.code || !row.power_kw) return null;
    const kw = Number(row.power_kw);
    const primaryHit = liveEngines.find(le => le.code === row.code && le.power_kw === kw);
    if (primaryHit) return "REUSE";
    // A code that's someone else's alt_code is a collision, not a stale flag -- leave it
    // for a human to resolve (see the COLLISION line already printed above).
    const aliasHits = liveEngines.filter(le => (le.alt_codes || []).includes(row.code));
    if (aliasHits.length) return null;
    return "NEW";
  }).changes;

  // transmissions.csv has no reuse_or_new flag anymore -- unit_code either resolves live or
  // it's a MISSING/STOP, nothing to fix mechanically.
  if (engineChanges.length) {
    console.log("engines.csv:");
    for (const c of engineChanges) console.log(`  ${c.code} (${c.power_kw}kW): ${c.from} -> ${c.to}`);
  } else {
    console.log("No flags needed changing.");
  }
}

process.exit(problems > 0 ? 1 : 0);
