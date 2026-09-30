// Reconcile step (CLAUDE.md "Adding a new car / model — RULES", rules 1-2) as a script
// instead of a hand-typed prompt: reads the filled engines.csv + transmissions.csv from a
// new-car intake template, queries the LIVE DB, and prints the REUSE/CREATE table with
// resolved ids. Flags alias collisions — a code that's already another row's primary code,
// or already sits in another row's alt_codes — since reconcile-by-code silently assumes
// codes are unique, and an unflagged collision means "which row do I actually reuse?".
//
// Read-only by default. Makes no writes unless --fix-flags is passed. Run from repo root:
//   node scripts/reconcile.mjs [template-dir] [--fix-flags]
// Exit code 1 if any problem was found (drifted REUSE/NEW claim, or a collision), else 0 --
// this is based on the report pass and is unaffected by --fix-flags (which runs after and
// reports separately; it doesn't re-run the report against the fixed file).
//
// --fix-flags: rewrites reuse_or_new in engines.csv/transmissions.csv to match what's
// actually live right now (REUSE where a live match exists, NEW where none does), and
// prints every flag it changed. Only touches the reuse_or_new cell of rows that actually
// need to change -- every other column, every comment, every blank line is preserved
// byte-for-byte. Does NOT touch a row flagged as a COLLISION above (an alt_code matching
// a different row's primary code or alt_codes) -- that's a genuine ambiguity for a human
// to resolve, not a stale flag to auto-correct.

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

function readCsv(p) {
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, "utf8").split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  if (!lines.length) return [];
  const header = lines[0].split(",");
  return lines.slice(1).map(line => {
    const cells = [];
    let cur = "", inQ = false;
    for (const c of line) {
      if (c === '"') inQ = !inQ;
      else if (c === "," && !inQ) { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur);
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
const { data: liveTrans, error: e2 } = await sb.from("catalog_transmissions").select("id, code");
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
  if (!t.code) continue;
  const hit = liveTrans.find(lt => lt.code === t.code);
  const claimed = (t.reuse_or_new || "").toUpperCase();
  if (hit) {
    const mismatch = claimed === "NEW" ? "  !! template says NEW but this exists live" : "";
    console.log(`REUSE  ${t.code} -> ${hit.id}${mismatch}`);
    if (mismatch) problems++;
  } else {
    const mismatch = claimed === "REUSE" ? "  !! template says REUSE but nothing matches live" : "";
    console.log(`CREATE ${t.code}${mismatch}`);
    if (mismatch) problems++;
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

  const transChanges = fixReuseFlags(path.join(dir, "transmissions.csv"), (row) => {
    if (!row.code) return null;
    return liveTrans.some(lt => lt.code === row.code) ? "REUSE" : "NEW";
  }).changes;

  if (engineChanges.length) {
    console.log("engines.csv:");
    for (const c of engineChanges) console.log(`  ${c.code} (${c.power_kw}kW): ${c.from} -> ${c.to}`);
  }
  if (transChanges.length) {
    console.log("transmissions.csv:");
    for (const c of transChanges) console.log(`  ${c.code}: ${c.from} -> ${c.to}`);
  }
  if (!engineChanges.length && !transChanges.length) {
    console.log("No flags needed changing.");
  }
}

process.exit(problems > 0 ? 1 : 0);
