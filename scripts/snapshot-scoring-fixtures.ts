// ONE-TIME, MANUALLY-RUN generator for tests/fixtures/scoring-cars.json — the
// frozen fixture data the scoring regression suite (tests/recommend.scoring.test.ts)
// loads instead of ever hitting Supabase itself. This script is the only part of
// the regression-test setup that touches the live database, and only when you
// run it by hand; the test suite never imports or invokes it.
//
// Usage: npx tsx scripts/snapshot-scoring-fixtures.ts
// Output: tests/fixtures/scoring-cars.json
//
// This is a MANUALLY-SYNCED MIRROR of app/api/recommend/route.ts's fetchCarData
// transform logic — same convention, and same risk, as scripts/score-audit.ts
// (see that file's own header comment). If fetchCarData's field derivation ever
// changes, re-sync this by hand (diff against it) or the fixture will silently
// stop matching what real production data actually looks like. Deliberately NOT
// importing fetchCarData from route.ts — the only export added to that file for
// this test suite is `calcResults` (+ its 3 supporting types), a minimal seam
// agreed on ahead of time; adding a second export wasn't part of that.
//
// The 8 fixture cars were hand-picked (see the accompanying plan) to exercise a
// spread of hardFilter eliminations and scorePractical/scoreFinancial/
// scorePreference/scoreSafety branches: Volkswagen Amarok (diesel pickup, heavy
// tow), Škoda Citigo (small city + genuinely multi-fuel electric/petrol), Škoda
// Kodiaq (diesel, 5-star/AWD/family SUV), Dacia Sandero III (2-star NCAP), Mazda
// MX-5 (light manual coupe), Škoda Fabia IV (DSG/DQ200 — city DCT penalty), BMW
// iX (expensive, fast-depreciating EV), Tesla Model S (760 kW — triggers the
// first_car maxPowerKw>200 hard-filter elimination).
//
// NOTE: the original picks for the tow/family archetypes were RAM 1500 (DT) and
// Jeep Grand Cherokee (WL) — both were swapped out after the first snapshot run
// showed P04_family_diesel_safety and P08_workhorse_diesel_durability (both
// `fuel: "diesel"`) eliminating ALL 8 cars: neither RAM (petrol-only) nor Jeep
// (PHEV-only) offers diesel, so hardFilter's fuel-match check (route.ts line
// ~370) rejected the whole fixture set before towing/family-safety logic ever
// ran. Amarok/Kodiaq are direct archetype-preserving replacements that also
// offer diesel.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Manually parse .env.local — no dotenv package in this repo (same approach
// used elsewhere in this project for standalone scripts that need Supabase
// credentials outside the Next.js runtime).
const envPath = path.join(__dirname, "..", ".env.local");
const envVars: Record<string, string> = {};
fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) envVars[m[1]] = m[2];
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const FIXTURE_VEHICLE_IDS = [
  "fd03ebcb-a89e-4730-b829-9350e9e5fef4", // Volkswagen Amarok (2H) — diesel, heavy tow
  "fb35d8fd-4ae9-439f-a233-a6c34628b4f2", // Škoda Citigo (AA)
  "42eed166-bef1-4867-9d6b-0db975b592fc", // Škoda Kodiaq (NS7) — diesel, 5-star/AWD family SUV
  "b86fad56-96e7-4bba-8166-c2db42bd623b", // Dacia Sandero III (BJ)
  "71ee38e4-911c-4800-b073-0f9b654c17c8", // Mazda MX-5 (ND)
  "43c5233e-3e93-4f8f-bd6d-7cbf87526d64", // Škoda Fabia IV (PJ)
  "4eaa5801-1e10-4d48-b1c3-1dcbe1c5b488", // BMW iX (I20)
  "79d1b612-238b-48a6-a81d-123ed3ed9059", // Tesla Model S
];

const ORIGIN_FLAGS: Record<string, string> = {
  german: "\u{1F1E9}\u{1F1EA}", japanese: "\u{1F1EF}\u{1F1F5}", korean: "\u{1F1F0}\u{1F1F7}",
  french: "\u{1F1EB}\u{1F1F7}", czech: "\u{1F1E8}\u{1F1FF}", italian: "\u{1F1EE}\u{1F1F9}",
  swedish: "\u{1F1F8}\u{1F1EA}", british: "\u{1F1EC}\u{1F1E7}", american: "\u{1F1FA}\u{1F1F8}",
  chinese: "\u{1F1E8}\u{1F1F3}", romanian: "\u{1F1F7}\u{1F1F4}", spanish: "\u{1F1EA}\u{1F1F8}",
};

async function main() {
  const [vehiclesRes, enginesRes, transRes] = await Promise.all([
    supabase.from("vehicles").select("*").in("id", FIXTURE_VEHICLE_IDS),
    supabase.from("engines").select("*").in("vehicle_id", FIXTURE_VEHICLE_IDS),
    supabase.from("transmissions").select("*").in("vehicle_id", FIXTURE_VEHICLE_IDS),
  ]);
  if (vehiclesRes.error) throw vehiclesRes.error;
  if (enginesRes.error) throw enginesRes.error;
  if (transRes.error) throw transRes.error;

  const engines = enginesRes.data || [];
  const transmissions = transRes.data || [];

  if ((vehiclesRes.data || []).length !== FIXTURE_VEHICLE_IDS.length) {
    const found = new Set((vehiclesRes.data || []).map((v: any) => v.id));
    const missing = FIXTURE_VEHICLE_IDS.filter((id) => !found.has(id));
    throw new Error(`Expected ${FIXTURE_VEHICLE_IDS.length} vehicles, found ${(vehiclesRes.data || []).length}. Missing: ${missing.join(", ")}`);
  }

  // Mirrors fetchCarData in app/api/recommend/route.ts EXACTLY — see header comment.
  const cars = (vehiclesRes.data || []).map((v: any) => {
    const vEngines = engines.filter((e: any) => e.vehicle_id === v.id);
    const vTrans = transmissions.filter((t: any) => t.vehicle_id === v.id);

    const fuelTypes = [...new Set(vEngines.map((e: any) => (e.fuel_type || "").toLowerCase()))].filter(Boolean);

    const relOrder = ["excellent", "good", "average", "below_average"];
    const bestRel = vEngines.reduce((best: string, e: any) => {
      const r = (e.reliability_rating || "average").toLowerCase();
      return relOrder.indexOf(r) < relOrder.indexOf(best) ? r : best;
    }, "average");
    const relMap: Record<string, string> = { excellent: "Excellent", good: "Good", average: "Average", below_average: "Poor" };

    const reliabilityByFuel = (() => {
      const m: Record<string, string> = {};
      vEngines.forEach((e: any) => {
        const ft = (e.fuel_type || "").toLowerCase();
        if (!ft) return;
        const r = (e.reliability_rating || "average").toLowerCase();
        if (!m[ft] || relOrder.indexOf(r) < relOrder.indexOf(m[ft])) m[ft] = r;
      });
      const out: Record<string, string> = {};
      Object.keys(m).forEach((k) => { out[k] = relMap[m[k]] || "Average"; });
      return Object.keys(out).length ? out : null;
    })();

    const relTierSet = vEngines.length > 0
      ? [...new Set(vEngines.map((e: any) => (e.reliability_rating || "average").toLowerCase()))]
      : ["average"];
    const reliabilityTiers = relTierSet
      .sort((a, b) => relOrder.indexOf(b) - relOrder.indexOf(a))
      .map((r) => relMap[r] || "Average");
    const reliabilityWorst = reliabilityTiers[0];

    const hasAWD = vEngines.some((e: any) => e.drivetrain === "AWD");
    const drivetrains = [...new Set(vEngines.map((e: any) => e.drivetrain).filter(Boolean))];

    let yearTo = 2025;
    if (v.production_years) {
      if (v.production_years.toLowerCase().includes("present")) yearTo = 2025;
      else { const m = v.production_years.match(/(\d{4})\s*$/); if (m) yearTo = parseInt(m[1]); }
    }

    const avgConsumption = vEngines.length > 0
      ? Math.round(vEngines.reduce((s: number, e: any) => s + (e.fuel_consumption_avg || 0), 0) / vEngines.length * 10) / 10
      : null;

    return {
      id: v.id,
      make: v.brand,
      model: v.model,
      gen: v.production_years || "",
      years: v.production_years || "",
      yearTo,
      body: v.body_type || "hatchback",
      segment: v.segment || "",
      fuel: fuelTypes.length > 0 ? fuelTypes : ["petrol"],
      seats: v.seats_count || 5,
      boot: v.boot_capacity_liters || null,
      bootMax: v.boot_max_liters || null,
      origin: v.origin_country || "",
      originFlag: ORIGIN_FLAGS[v.origin_country || ""] || "\u{1F30D}",
      towingCapacity: v.towing_capacity_kg || null,
      groundClearance: v.ground_clearance_mm || null,
      length: v.length_mm || null,
      width: v.width_mm || null,
      height: v.height_mm || null,
      weight: v.curb_weight_kg || null,
      hasAWD,
      drivetrains,
      avgConsumption,
      resaleValue: v.resale_value_rating || null,
      bodyVariants: v.body_variants || null,
      buyingTip: v.buyers_guide || "",
      transmissions: vTrans.map((t: any) => t.specific_type || t.trans_type || ""),
      fuelTankLiters: Math.max(...vEngines.map((e: any) => e.fuel_tank_liters || 0)) || null,
      consumptionByFuel: (() => {
        const m: Record<string, { sum: number; n: number }> = {};
        vEngines.forEach((e: any) => {
          const ft = (e.fuel_type || "").toLowerCase();
          const val = Number(e.fuel_consumption_avg);
          if (!ft || !val) return;
          if (!m[ft]) m[ft] = { sum: 0, n: 0 };
          m[ft].sum += val; m[ft].n += 1;
        });
        const out: Record<string, number> = {};
        Object.keys(m).forEach(k => { out[k] = Math.round((m[k].sum / m[k].n) * 10) / 10; });
        return Object.keys(out).length ? out : null;
      })(),
      powerByFuel: (() => {
        const m: Record<string, number> = {};
        vEngines.forEach((e: any) => {
          const ft = (e.fuel_type || "").toLowerCase();
          const val = Number(e.power_kw);
          if (!ft || !val) return;
          if (!m[ft] || val > m[ft]) m[ft] = val;
        });
        return Object.keys(m).length ? m : null;
      })(),
      pricing: {
        skPriceMin: v.price_range_min_eur,
        skPriceMax: v.price_range_max_eur,
        euPriceMin: v.price_range_min_eur,
        euPriceMax: v.price_range_max_eur,
        mileageAtMidBudget: v.typical_milage_range || "",
      },
      reliability: { overall: relMap[bestRel] || "Average", repairCost: "Moderate" },
      reliabilityByFuel,
      reliabilityTiers,
      reliabilityWorst,
      safety: {
        stars: v.safety_rating,
        adultOccupant: v.ncap_adult_pct,
        childOccupant: v.ncap_child_pct,
        pedestrian: v.ncap_pedestrian_pct,
        safetyAssist: v.ncap_safety_assist_pct,
        ncapYear: v.ncap_year,
      },
      equipment: (v.equipment_trims || []).map((t: any) => ({
        trim: t.trim || t.name || "Standard",
        features: t.features || [],
      })),
      pros: v.general_pros || [],
      cons: v.general_cons || [],
      vehicleFaults: v.common_faults || [],
      maxPowerKw: vEngines.length > 0 ? Math.max(...vEngines.map((e: any) => e.power_kw || 0)) : null,
      minPowerKw: vEngines.length > 0 ? Math.min(...vEngines.filter((e: any) => e.power_kw > 0).map((e: any) => e.power_kw)) : null,
    };
  });

  // Preserve the hand-picked order (FIXTURE_VEHICLE_IDS), not whatever order
  // Supabase returned rows in, so the fixture file reads in the documented order.
  const byId = new Map(cars.map((c) => [c.id, c]));
  const ordered = FIXTURE_VEHICLE_IDS.map((id) => byId.get(id));

  const outPath = path.join(__dirname, "..", "tests", "fixtures", "scoring-cars.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(ordered, null, 2) + "\n");

  console.log(`Snapshotted ${ordered.length} cars -> ${outPath}`);
  console.log("Nothing else was touched. This fixture file is what the regression test loads from now on.");
}

main();
