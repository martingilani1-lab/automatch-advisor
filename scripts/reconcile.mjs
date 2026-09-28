// Reconcile step (CLAUDE.md "Adding a new car / model — RULES", rules 1-2) as a script
// instead of a hand-typed prompt: reads the filled engines.csv + transmissions.csv from a
// new-car intake template, queries the LIVE DB, and prints the REUSE/CREATE table with
// resolved ids. Flags alias collisions — a code that's already another row's primary code,
// or already sits in another row's alt_codes — since reconcile-by-code silently assumes
// codes are unique, and an unflagged collision means "which row do I actually reuse?".
//
// Read-only. Makes no writes, no matter what it finds. Run from repo root:
//   node scripts/reconcile.mjs [template-dir]
// Exit code 1 if any problem was found (drifted REUSE/NEW claim, or a collision), else 0.

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

const dir = process.argv[2] || "scripts/new-car-template";
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
process.exit(problems > 0 ? 1 : 0);
