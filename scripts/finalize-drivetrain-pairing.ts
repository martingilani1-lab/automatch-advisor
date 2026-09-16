// ONE-TIME, MANUALLY-RUN finalizer for scripts/drivetrain-pairing-filled.csv —
// applies the confirmed decisions from the drivetrain-pairing review round to
// the CSV in place. Read/write of the CSV only; never touches the database.
//
// Usage: npx tsx scripts/finalize-drivetrain-pairing.ts
//
// Decisions applied (see the review conversation for full reasoning):
// - Cupra Formentor, SEAT Ateca, SEAT Tarraco, Audi A3 (8V): proposed_code ->
//   haldex_gen5 (MQB platform), confirmed.
// - Audi Q3 (8U): only the DQ250 row ("for quattro models" per its own
//   transmission notes) gets haldex_gen5, marked interim pending a future
//   facelift split. The other 2 rows (DQ200, manual) are FWD-only per their
//   own notes — confirmed no code, not a gap.
// - Mitsubishi L200 (KL): left out of pairing entirely — no reliable signal
//   in this DB distinguishes Easy Select vs Super Select 4WD-II, and
//   guessing was explicitly ruled out.
// - VW Amarok (2H), Audi A6 (C8): already correctly paired per-row from the
//   original pairing sheet — untouched here.
// - Every other still-blank row (e.g. the BMW 5 Series/i5 "ZF 8HP" row, which
//   is the RWD ICE engine's own transmission, not the AWD one) stays blank —
//   confirmed, not forced.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, "drivetrain-pairing-filled.csv");

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
function csvField(v: string): string {
  if (/["\,\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

const raw = fs.readFileSync(csvPath, "utf8");
const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
const header = parseCsvLine(lines[0]);
const col = (name: string) => header.indexOf(name);

const rows = lines.slice(1).map((l) => parseCsvLine(l));

// key -> {code, conf, reason} — applies to ALL of that vehicle's rows.
const VEHICLE_OVERRIDE: Record<string, { code: string; conf: string; reason: string }> = {
  "Cupra|Formentor": { code: "haldex_gen5", conf: "high", reason: "FINAL — confirmed by user. MQB platform (same rationale as SEAT Leon III 4Drive/Ateca/Tarraco/A3(8V))." },
  "SEAT|Ateca": { code: "haldex_gen5", conf: "high", reason: "FINAL — confirmed by user. MQB platform." },
  "SEAT|Tarraco": { code: "haldex_gen5", conf: "high", reason: "FINAL — confirmed by user. MQB platform." },
  "Audi|A3 (8V)": { code: "haldex_gen5", conf: "high", reason: "FINAL — confirmed by user. MQB platform." },
  "Mitsubishi|L200 (KL)": { code: "", conf: "low", reason: "FINAL — confirmed by user: left OUT of pairing entirely. No reliable signal in this DB distinguishes Easy Select vs Super Select 4WD-II trim; not guessing." },
};

// transmission_variant substring -> override, for the one vehicle needing a
// per-row (not per-vehicle) decision.
const Q3_8U_OVERRIDE: Record<string, { code: string; conf: string; reason: string }> = {
  "DQ250": { code: "haldex_gen5", conf: "medium", reason: "FINAL — confirmed by user as an INTERIM pairing pending a future facelift split. This is the one AWD-relevant row (\"for quattro models\" per its own transmission notes); its production span (2011-2018) straddles the pre/post-2014-facelift haldex_gen4/gen5 boundary with no way to distinguish which era from this single DB row — haldex_gen5 applied as the interim default." },
  "DQ200": { code: "", conf: "high", reason: "FINAL — confirmed: this row is FWD-only per its own notes (\"For 1.4 TFSI FWD\"), not AWD-relevant. Correctly has no drivetrain code." },
  "Manual": { code: "", conf: "high", reason: "FINAL — confirmed: this row is FWD-only per its own notes (\"For FWD diesel and 1.4 TFSI\"), not AWD-relevant. Correctly has no drivetrain code." },
};

let changed = 0;
for (const r of rows) {
  const key = r[col("brand")] + "|" + r[col("model")];
  if (key === "Audi|Q3 (8U)") {
    const variant = r[col("transmission_variant")];
    const match = Object.entries(Q3_8U_OVERRIDE).find(([k]) => variant.includes(k));
    if (!match) throw new Error(`Q3 (8U) row not matched by any override: "${variant}"`);
    const [, ov] = match;
    r[col("proposed_code")] = ov.code;
    r[col("confidence")] = ov.conf;
    r[col("reason")] = ov.reason;
    changed++;
    continue;
  }
  if (key in VEHICLE_OVERRIDE) {
    const ov = VEHICLE_OVERRIDE[key];
    r[col("proposed_code")] = ov.code;
    r[col("confidence")] = ov.conf;
    r[col("reason")] = ov.reason;
    changed++;
  }
}

console.log(`Applied final decisions to ${changed} rows.`);

const outLines = [header.join(",")];
for (const r of rows) outLines.push(header.map((h, i) => csvField(r[i])).join(","));
fs.writeFileSync(csvPath, outLines.join("\n") + "\n");
console.log(`Rewrote ${csvPath}`);
