import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Origin country to flag emoji
const ORIGIN_FLAGS: Record<string, string> = {
  german: "\u{1F1E9}\u{1F1EA}", japanese: "\u{1F1EF}\u{1F1F5}", korean: "\u{1F1F0}\u{1F1F7}",
  french: "\u{1F1EB}\u{1F1F7}", czech: "\u{1F1E8}\u{1F1FF}", italian: "\u{1F1EE}\u{1F1F9}",
  swedish: "\u{1F1F8}\u{1F1EA}", british: "\u{1F1EC}\u{1F1E7}", american: "\u{1F1FA}\u{1F1F8}",
  chinese: "\u{1F1E8}\u{1F1F3}", romanian: "\u{1F1F7}\u{1F1F4}", spanish: "\u{1F1EA}\u{1F1F8}",
};

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════

interface CarData {
  id: string; make: string; model: string; gen: string; years: string;
  yearTo?: number; body: string; segment?: string; fuel: string[]; seats?: number; boot?: number;
  bootMax?: number; origin?: string; originFlag?: string;
  towingCapacity?: number | null; groundClearance?: number | null;
  length?: number | null; width?: number | null; height?: number | null; weight?: number | null;
  hasAWD?: boolean; drivetrains?: string[]; avgConsumption?: number | null; fuelTankLiters?: number | null;
  resaleValue?: string | null; bodyVariants?: any[] | null;
  note?: string; buyingTip?: string; usageTags?: string[];
  transmissions?: any[]; maxPowerKw?: number | null; minPowerKw?: number | null;
  vehicleFaults?: { issue: string; severity: string }[];
  pricing?: { skPriceMin?: number; skPriceMax?: number; euPriceMin?: number; euPriceMax?: number; mileageAtMidBudget?: string };
  reliability?: any; safety?: any; equipment?: any[];
  _n?: boolean; budgetMin?: number; budgetMax?: number; mileageRange?: string;
  ncapStars?: number | null; ncapAdult?: number | null; ncapChild?: number | null;
  ncapPed?: number | null; ncapAssist?: number | null; ncapYear?: number | null;
  luxury?: number; longTrip?: boolean; repair?: string; tx?: string[];
  faults?: { summary?: string; buyingTip?: string };
  _dims?: { practical: number; financial: number; preference: number; safety: number };
  pros?: string[]; cons?: string[]; consumptionByFuel?: Record<string, number> | null;
  powerByFuel?: Record<string, number> | null;
}
interface ScoredCar { car: CarData; score: number; isBest: boolean }
type Answers = Record<string, string | string[]>;

// ════════════════════════════════════════════════════════════
// VEHICLE FETCH — same fetch+transform pattern as app/api/cars/route.ts
// ════════════════════════════════════════════════════════════

async function fetchCarData(): Promise<CarData[]> {
  const [vehiclesRes, enginesRes, transRes] = await Promise.all([
    supabase.from("vehicles").select("*"),
    supabase.from("engines").select("*"),
    supabase.from("transmissions").select("*"),
  ]);

  if (vehiclesRes.error) throw vehiclesRes.error;
  if (enginesRes.error) throw enginesRes.error;
  if (transRes.error) throw transRes.error;

  const engines = enginesRes.data || [];
  const transmissions = transRes.data || [];

  return (vehiclesRes.data || []).map((v: any) => {
    const vEngines = engines.filter((e: any) => e.vehicle_id === v.id);
    const vTrans = transmissions.filter((t: any) => t.vehicle_id === v.id);

    // Unique fuel types
    const fuelTypes = [...new Set(vEngines.map((e: any) => (e.fuel_type || "").toLowerCase()))].filter(Boolean);

    // Best reliability from engines
    const relOrder = ["excellent", "good", "average", "below_average"];
    const bestRel = vEngines.reduce((best: string, e: any) => {
      const r = (e.reliability_rating || "average").toLowerCase();
      return relOrder.indexOf(r) < relOrder.indexOf(best) ? r : best;
    }, "average");
    const relMap: Record<string, string> = { excellent: "Excellent", good: "Good", average: "Average", below_average: "Poor" };

    // Has AWD?
    const hasAWD = vEngines.some((e: any) => e.drivetrain === "AWD");
    const drivetrains = [...new Set(vEngines.map((e: any) => e.drivetrain).filter(Boolean))];

    // Parse yearTo
    let yearTo = 2025;
    if (v.production_years) {
      if (v.production_years.toLowerCase().includes("present")) yearTo = 2025;
      else { const m = v.production_years.match(/(\d{4})\s*$/); if (m) yearTo = parseInt(m[1]); }
    }

    // Avg fuel consumption
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
          const v = Number(e.fuel_consumption_avg);
          if (!ft || !v) return;
          if (!m[ft]) m[ft] = { sum: 0, n: 0 };
          m[ft].sum += v; m[ft].n += 1;
        });
        const out: Record<string, number> = {};
        Object.keys(m).forEach(k => { out[k] = Math.round((m[k].sum / m[k].n) * 10) / 10; });
        return Object.keys(out).length ? out : null;
      })(),
      powerByFuel: (() => {
        const m: Record<string, number> = {};
        vEngines.forEach((e: any) => {
          const ft = (e.fuel_type || "").toLowerCase();
          const v = Number(e.power_kw);
          if (!ft || !v) return;
          if (!m[ft] || v > m[ft]) m[ft] = v;
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
      // Vehicle-level common faults: [{issue, severity}]
      vehicleFaults: v.common_faults || [],
      // Max engine power for quick display
      maxPowerKw: vEngines.length > 0 ? Math.max(...vEngines.map((e: any) => e.power_kw || 0)) : null,
      minPowerKw: vEngines.length > 0 ? Math.min(...vEngines.filter((e: any) => e.power_kw > 0).map((e: any) => e.power_kw)) : null,
    };
  });
}

// ════════════════════════════════════════════════════════════
// SCORING ALGORITHM — relocated from app/page.tsx (calcResults pipeline)
// ════════════════════════════════════════════════════════════

// Budget string to number
function parseBudget(b: string): number {
  const m: Record<string, number> = { under_5k: 5000, "5k_10k": 10000, "10k_15k": 15000, "15k_25k": 25000, "25k_40k": 40000, "40k_60k": 60000, "60k_100k": 100000, over_100k: 150000 };
  return m[b] || 18000;
}
function parseKm(k: string): number {
  const m: Record<string, number> = { under_10k: 8000, "10k_20k": 15000, "20k_30k": 25000, over_30k: 35000 };
  return m[k] || 15000;
}

function norm(c: CarData): CarData {
  if (c._n) return c;
  const p = c.pricing || {}; const r = c.reliability || {}; const s = c.safety || {};
  Object.assign(c, {
    _n: true, budgetMin: p.skPriceMin ?? p.euPriceMin ?? 0, budgetMax: p.skPriceMax ?? p.euPriceMax ?? 99999,
    mileageRange: p.mileageAtMidBudget || "", reliability: r.overall ?? "Average", repair: r.repairCost ?? "Moderate",
    ncapStars: s.stars ?? null, ncapAdult: s.adultOccupant ?? null, ncapChild: s.childOccupant ?? null,
    ncapPed: s.pedestrian ?? null, ncapAssist: s.safetyAssist ?? null, ncapYear: s.ncapYear ?? null,
    luxury: c.usageTags?.includes("luxury") ? 3 : c.usageTags?.includes("business") ? 2 : 1,
    longTrip: c.usageTags?.includes("longDistance") ?? false,
    faults: { summary: r.tuvNote ?? c.note, buyingTip: c.buyingTip },
    yearTo: c.yearTo ?? 2025,
    tx: Array.isArray(c.transmissions) ? c.transmissions.filter(Boolean).map((t: any) => (typeof t === "string" ? t : t?.name || "")) : [],
  });
  return c;
}

function matchesTx(c: CarData, pref: string | undefined): boolean {
  if (!pref || pref === "no_pref") return true;
  const t = (c.tx || []).join(" ").toLowerCase();
  if (pref === "only_manual") return t.includes("manual");
  if (pref === "only_auto") return /auto|dsg|cvt|dct|ecvt|amt|ev/.test(t);
  // prefer_manual / prefer_auto — show all but boost score
  return true;
}

const AGE_MAP: Record<string, number> = { "new": 2022, "few_years": 2018, "older_fine": 2013, "old_ok": 2000, "any_year": 2000 };

// Real off-road/towing capability — not all "SUV" and "AWD" are equal
function getCapabilityScore(c: CarData): number {
  let cap = 0;
  const body = c.body || "";
  const gc = c.groundClearance || 150;
  const tow = c.towingCapacity || 0;

  // Body type baseline
  if (body === "pickup") cap += 30;
  else if (body === "suv" && gc >= 200) cap += 25;
  else if (body === "suv" && gc >= 170) cap += 15;
  else if (body === "crossover") cap += 5;
  else if (body === "suv") cap += 10;
  else cap -= 10;

  // Ground clearance is the real off-road indicator
  if (gc >= 220) cap += 20;
  else if (gc >= 200) cap += 15;
  else if (gc >= 180) cap += 8;
  else if (gc < 150) cap -= 10;

  // Towing capacity = pulling power
  if (tow >= 3500) cap += 25;
  else if (tow >= 3000) cap += 18;
  else if (tow >= 2500) cap += 12;
  else if (tow >= 2000) cap += 6;
  else if (tow < 1500) cap -= 5;

  // Weight = ruggedness indicator (heavy = built for work)
  const w = c.weight || 1400;
  if (w >= 2200) cap += 8;
  else if (w >= 1800) cap += 4;
  else if (w < 1300) cap -= 5;

  return cap;
}

// How much does resale value matter to THIS buyer? Returns 0.0–1.0
function getResaleRelevance(a: Answers): number {
  const mission = a.mission as string;
  const year = a.year as string;
  const km = a.yearly_km as string;
  const priorities = (Array.isArray(a.priorities) ? a.priorities : []) as string[];

  // Depreciation curve — new cars bleed value, pre-2013 already hit the floor
  let w = year === "new" ? 1.0
        : year === "few_years" ? 0.8
        : year === "older_fine" ? 0.45
        : 0.15; // old_ok / any_year

  // Rational buyer signals — these people WILL resell and feel every euro
  if (priorities.includes("low_cost")) w += 0.25;
  if (mission === "professional_driver") w += 0.3;  // burns through cars, resells every 2-3 years
  if (mission === "commuter" || mission === "all_rounder") w += 0.1;
  if (km === "over_30k") w += 0.2;
  else if (km === "20k_30k") w += 0.1;
  if (a.equipment === "value") w += 0.1;

  // Emotional buyer signals — depreciation is the price of the experience
  if (mission === "head_turner" || mission === "show_with_soul" || mission === "drivers_car") w -= 0.5;
  if (priorities.includes("looks") || priorities.includes("driving_pleasure")) w -= 0.15;

  return Math.max(0, Math.min(1, w));
}

// Pick the best body variant for this user's needs
// Mutates c.body and c.boot so all downstream scoring just works
const ESTATE_STYLES = [
  "estate", "combi", "variant", "touring", "tourer", "avant", "sw",
  "sports tourer", "sport tourer", "grandtour", "grand tour", "break",
  "shooting brake", "shootingbrake","shooting_brake", "sportbrake", "sport brake",
  "t-modell", "t-model", "wagon", "station wagon",
  "alltrack", "allroad", "scout", "cross country", "all-terrain",
];

function applyBestVariant(c: CarData, a: Answers): void {
  const variants = c.bodyVariants;
  if (!variants || !Array.isArray(variants) || variants.length <= 1) return;

  const space = a.space as string;
  const bt = a.body_type as string;
  const mission = a.mission as string;
  const towing = a.towing as string;

  // Does this user need cargo space?
  const needsCargo = space === "large" || space === "maximum"
    || mission === "work_horse" || mission === "family" || mission === "weekend_adventure"
    || mission === "road_trip" || mission === "all_rounder"
    || towing === "medium" || towing === "heavy";

  // Does this user want a normal/low car specifically?
  const wantsLow = bt === "small_nimble"
    || mission === "drivers_car" || mission === "show_with_soul" || mission === "head_turner";

  for (const v of variants) {
    const style = (v.style || "").toLowerCase();
    const styleNorm = style.replace(/_/g, " ");
    const isEstate = ESTATE_STYLES.some(s => styleNorm.includes(s));

    // Pick estate variant when user needs cargo
    if (isEstate && needsCargo && !wantsLow) {
      c.body = "estate";
      if (v.boot_liters) c.boot = v.boot_liters;
      if (v.boot_max_liters) c.bootMax = v.boot_max_liters;
      if (v.length_mm) c.length = v.length_mm;
      return;
    }
  }
  // No variant switch needed — keep defaults
}

function hardFilter(c: CarData, a: Answers): boolean {
  const budget = parseBudget(a.budget as string);
 if ((c.budgetMin || 0) > budget * 1.2) return false;

  const fuel = a.fuel as string;
  if (fuel && fuel !== "open") {
    const hasFuel = c.fuel.some(f => {
      const fl = f.toLowerCase();
      if (fuel === "petrol") return fl.includes("petrol") || fl.includes("gasoline");
      if (fuel === "diesel") return fl.includes("diesel");
      if (fuel === "electric") return fl.includes("electric");
      if (fuel === "hybrid") return fl.includes("hybrid") || fl.includes("phev");
      return true;
    });
    if (!hasFuel) return false;
  }

  const yearPref = a.year as string;
  if (yearPref && AGE_MAP[yearPref] && (c.yearTo || 2025) < AGE_MAP[yearPref]) return false;

  const passengers = a.passengers as string;
  if (passengers === "6_plus" && (c.seats || 5) < 7) return false;
  if (passengers === "5" && (c.seats || 5) < 5) return false;

  if (!matchesTx(c, a.transmission as string)) return false;

  const body = c.body || "";
  const towing = a.towing as string;
  const tow = c.towingCapacity || 0;
  const env = a.environment as string;
  const gc = c.groundClearance || 150;
  const mission = a.mission as string;
  const cap = getCapabilityScore(c);

  // ── TOWING — capability-based elimination ──
  if (towing === "heavy" && tow < 2500) return false;
  if (towing === "heavy" && cap < 30) return false;
  if (towing === "medium" && tow < 1000) return false;

  // ── ENVIRONMENT — real off-road needs real capability ──
  if (env === "rural" && a.winter_grip === "yes" && cap < 20) return false;
  if (env === "rural" && gc < 130 && !["suv", "pickup"].includes(body) && mission !== "drivers_car" && mission !== "show_with_soul") return false;

  // ── AWD — strict when required ──
  if (a.winter_grip === "yes" && !c.hasAWD) return false;

  // ── BODY TYPE ──
  const bt = a.body_type as string;
  if (bt === "big_commanding" && !["suv", "pickup", "van"].includes(body)) return false;
  if (bt === "small_nimble" && ["suv", "pickup", "van", "estate", "minivan", "mpv"].includes(body)) return false;
 // Normal car + large cargo = estate or large sedan only
  if (bt === "normal" && (a.space === "large" || a.space === "maximum")) {
    if (body === "suv") return false;
    if (body === "crossover") return false;
    if (body === "hatchback") return false;
    if (body === "mpv" || body === "minivan") return false;
    if (body === "van") return false;
    if (body === "sedan" && (c.boot || 0) < 450 && a.mission !== "professional_driver") return false;
    if (body === "sedan" && (c.boot || 0) < 400 && a.mission === "professional_driver") return false;
  }
  // Raised + large cargo — user wants an SUV/crossover, hatchbacks contradict both answers
  if (bt === "raised" && (a.space === "large" || a.space === "maximum") && body === "hatchback") return false;

  // User didn't pick "raised" — no crossovers or SUVs sneaking in
  if (bt === "normal" && body === "crossover") return false;
  if (bt === "normal" && body === "mpv") return false;
  if (bt === "small_nimble" && body === "crossover") return false;
  // ── MISSION hard elimination ──
  if (mission === "work_horse" && ["coupe", "convertible", "city_car"].includes(body)) return false;
  if (mission === "weekend_adventure" && ["sedan", "coupe", "city_car"].includes(body)) return false;
  if (mission === "family" && (c.seats || 5) < 4) return false;
  if (mission === "first_car" && (c.maxPowerKw || 0) > 200) return false;

  return true;
}

function scorePractical(c: CarData, a: Answers): number {
  let s = 6;
  const boot = c.boot || 0;
  const body = c.body || "";
  const space = a.space as string;
  const env = a.environment as string;
  const towing = a.towing as string;
  const cap = getCapabilityScore(c);
  const tow = c.towingCapacity || 0;
  const gc = c.groundClearance || 150;
  const bt = a.body_type as string;

 // ── TOWING — THE dominant factor when selected ──
  const carWeight = c.weight || 1400;
  if (towing === "heavy") {
    if (tow >= 3500) s += 13;
    else if (tow >= 3000) s += 9;
    else if (tow >= 2500) s += 5;
    else s -= 10;
    if (body === "pickup") s += 4;
    else if (body === "suv" && gc >= 200) s += 3;
    else if (body === "crossover") s -= 5;
    // Tow-to-weight stability — car should outweigh what it pulls
    if (carWeight >= 2200) s += 4;        // Heavy = planted and stable
    else if (carWeight >= 1800) s += 1;
    else if (carWeight < 1500) s -= 5;    // Dangerously light for heavy towing
  } else if (towing === "medium") {
    if (tow >= 2500) s += 8;
    else if (tow >= 2000) s += 5;
    else if (tow >= 1000) s += 3;
    else s -= 4;
    // Medium towing stability — caravan at 1,500 kg needs a stable tow car
    if (carWeight >= 2000) s += 4;        // Touareg, Santa Fe — rock solid
    else if (carWeight >= 1700) s += 2;   // Kodiaq, Sorento — good enough
    else if (carWeight >= 1500) s += 0;   // Tiguan — borderline, will feel it
    else s -= 4;                          // Sub-1500 kg towing a caravan = dangerous sway
  }
  // ── ENVIRONMENT + CAPABILITY ──
  if (env === "rural" || a.winter_grip === "yes") {
    // Use capability score directly — this is what separates
    // a Land Cruiser from a Tiguan
    if (cap >= 60) s += 10;
    else if (cap >= 40) s += 6;
    else if (cap >= 25) s += 3;
    else if (cap < 15) s -= 6;
  }
  if (env === "city" && ["hatchback", "city_car"].includes(body)) s += 3;
  if (env === "city" && body === "pickup") s -= 4;
  // Vehicle length scoring for city — shorter = easier to park
  if (env === "city") {
    const len = c.length || 0;
    const wantsSmall = space === "minimal" || bt === "small_nimble";
    if (len > 0 && len <= 3700) s += wantsSmall ? 5 : 3;       // Micro: Up!, 500, Twingo — park anywhere
    else if (len > 0 && len <= 4100) s += wantsSmall ? 3 : 2;  // Supermini: Fabia, Yaris, Swift — easy
    else if (len > 0 && len <= 4400) s += 0;                    // Compact: Golf, i30 — normal city car
    else if (len > 0 && len <= 4700) s -= wantsSmall ? 4 : 1;  // Midsize: Octavia, Passat — getting long
    else if (len > 0) s -= wantsSmall ? 6 : 2;                 // Large: Superb, X5 — city nightmare
  }
  if (env === "highway" && ["sedan", "estate"].includes(body)) s += 3;

  // ── AWD ──
  if (a.winter_grip === "yes" && c.hasAWD) s += 5;
  if (a.winter_grip === "sometimes" && c.hasAWD) s += 2;
  if (a.winter_grip === "yes" && !c.hasAWD) s -= 6;

  // Pickup bed = maximum cargo, regardless of NULL boot_liters
  const effBoot = body === "pickup" ? Math.max(boot, 1000) : boot;

 // ── BOOT SPACE ──
  if (space === "maximum" && effBoot >= 500) s += 6;
  else if (space === "maximum" && effBoot >= 400) s += 3;
  else if (space === "maximum" && effBoot < 400) s -= 5;
  if (space === "large" && effBoot >= 500) s += 6;
  else if (space === "large" && effBoot >= 400) s += 4;
  else if (space === "large" && effBoot < 400) s -= 4;
  if (space === "moderate" && effBoot >= 300) s += 2;
  else if (space === "moderate" && effBoot < 280) s -= 4;
  else if (space === "moderate" && effBoot < 320) s -= 1;
  if (space === "minimal") s += 2;

  // ── PASSENGERS ──
  const pass = a.passengers as string;
  if (pass === "6_plus" && (c.seats || 5) >= 7) s += 5;
  if (pass === "5" && (c.seats || 5) >= 5) s += 3;
  if (pass === "3_4") s += 2;
  if (pass === "1_2") s += 2;

  // ── BODY TYPE MATCH ──
 if (bt === "raised" && body === "suv") s += 4;
  else if (bt === "raised" && ["crossover", "pickup"].includes(body)) s += 3;
  else if (bt === "raised" && !["suv", "crossover", "pickup"].includes(body)) s -= 4;
  if (bt === "normal" && ["hatchback", "sedan", "estate"].includes(body)) s += 4;
  else if (bt === "normal" && ["pickup", "van", "minivan", "mpv"].includes(body)) s -= 4;
  else if (bt === "normal" && body === "suv") s -= 6;
  else if (bt === "normal" && body === "crossover") s -= 4;
  if (bt === "small_nimble" && ["hatchback", "city_car"].includes(body)) s += 5;
  else if (bt === "small_nimble" && ["suv", "pickup"].includes(body)) s -= 6;
  if (bt === "big_commanding" && ["suv", "pickup"].includes(body)) s += 5;
  else if (bt === "big_commanding" && ["hatchback", "sedan", "city_car"].includes(body)) s -= 6;

  // ── NORMAL + LARGE CARGO = ESTATE PREFERENCE ──
  if (bt === "normal" && (space === "large" || space === "maximum")) {
    if (body === "estate") s += 5;
    else if (body === "sedan" && boot >= 500) s += 2;
    else if (body === "sedan" && boot < 400) s -= 4;
    else if (body === "hatchback" && boot >= 400) s += 1;
    else if (body === "hatchback" && boot < 400) s -= 5;
    else if (body === "suv") s -= 5;
    else if (body === "crossover") s -= 4;
  }

  // ── MISSION BODY PENALTIES ──
  const mission = a.mission as string;
  if (mission === "work_horse" && !["suv", "pickup", "van", "estate"].includes(body)) s -= 5;
  if (mission === "weekend_adventure" && !["suv", "crossover", "pickup"].includes(body)) s -= 4;
  if (mission === "drivers_car" && ["van", "pickup", "minivan"].includes(body)) s -= 5;
  if (mission === "commuter" && body === "pickup") s -= 4;

  // ── TRIP PATTERN ──
  if (a.trip_pattern === "long" && boot >= 400) s += 2;
  if (a.trip_pattern === "long" && boot < 250) s -= 3;

// Range scoring for long-distance profiles
  if (a.trip_pattern === "long" || a.yearly_km === "over_30k") {
    const tank = c.fuelTankLiters || 0;
    const cons = c.avgConsumption || 7;
    if (tank > 0 && cons > 0) {
      const rangeKm = (tank / cons) * 100;
      if (rangeKm >= 1200) s += 5;
      else if (rangeKm >= 900) s += 3;
      else if (rangeKm >= 600) s += 0;
      else s -= 3;
    }
  }

  return Math.max(0, Math.min(35, s));
}
function scoreFinancial(c: CarData, a: Answers): number {
  let s = 8; const budget = parseBudget(a.budget as string);
  const imageMission = a.mission === "head_turner" || a.mission === "show_with_soul" || a.mission === "drivers_car";
  const priorities = (Array.isArray(a.priorities) ? a.priorities : []) as string[];
  const prestigeBuyer = imageMission || (priorities.includes("looks") && budget >= 60000);
  const midPrice = ((c.budgetMin || 0) + (c.budgetMax || 0)) / 2;
  if (midPrice >= budget * 0.5 && midPrice <= budget) s += 10;
  else if (midPrice >= budget * 0.3 && midPrice <= budget * 1.2) s += 6;
  else if (midPrice > budget * 1.2) s -= 4;
  else if (midPrice < budget * 0.3) s += prestigeBuyer ? -5 : 2; // Image buyers: a bargain-bin car defeats the purpose
  if (c.repair === "VeryLow") s += 6;
  else if (c.repair === "Low") s += 4;
  else if (c.repair === "Moderate") s += 1;
  else if (c.repair === "High") s -= imageMission ? 1 : 4;  // Image buyers accept higher repair costs
  const km = parseKm(a.yearly_km as string);
  const userFuelSel = a.fuel as string;
  if (km >= 25000 && c.fuel.includes("diesel") && (userFuelSel === "diesel" || userFuelSel === "open" || !userFuelSel)) s += 3;
  if (km >= 25000 && c.fuel.includes("electric") && (userFuelSel === "electric" || userFuelSel === "open" || !userFuelSel)) s += 4;
  if (km <= 10000 && c.fuel.includes("petrol") && (userFuelSel === "petrol" || userFuelSel === "open" || !userFuelSel)) s += 2;
 // Fuel consumption — environment-aware estimation

  const env = a.environment as string;
  const isHybrid = c.fuel.some(f => { const fl = f.toLowerCase(); return fl.includes("hybrid") || fl.includes("phev"); });
  const isDiesel = c.fuel.some(f => f.toLowerCase().includes("diesel"));
 const hasRealHybrid = c.fuel.some(f => f.toLowerCase().includes("hybrid"));
  const hasPHEV = c.fuel.some(f => f.toLowerCase().includes("phev"));
  const isPHEV = hasPHEV && !hasRealHybrid;
  const cantCharge = (a.charging as string) === "no";
  const unpluggedPHEV = isPHEV && cantCharge;
  const baseCons = getConsumptionForFuel(c, a.fuel as string) ?? 7;
  // Unplugged PHEV: WLTP figure is fantasy — double it, floor at 6.5
  const rawCons = (unpluggedPHEV && baseCons <= 4.5)
    ? Math.max(baseCons * 2, 6.5)
    : baseCons;

  // Hybrids consume LESS in city than combined (regen braking + EV creeping)
  // ICE consumes MORE in city than combined (constant stop-start)
  const cons = env === "highway" ? rawCons * 0.82
             : env === "city" && isHybrid && !unpluggedPHEV ? rawCons * 0.78
             : env === "city" && !isHybrid ? rawCons * 1.30
             : rawCons;
  if (cons <= 5) s += 4;
  else if (cons <= 6.5) s += 2;
  else if (cons >= 10) s -= 3;
  // Diesel highway bonus — most efficient at cruise speed
  if (env === "highway" && isDiesel && (a.yearly_km === "over_30k" || a.yearly_km === "20k_30k")) s += 2;

  // Fix 2: DCT penalty for city driving
  // Dry dual-clutch transmissions die in constant stop-start city traffic
  const txJoined = (c.tx || []).join(" ").toLowerCase();
  const hasDCT = /dsg|dct|dq200|dq250|dq381|7dct|6dct|dual.?clutch|powershift/.test(txJoined);
  const hasSafeTx = /e-cvt|ecvt|cvt|torque.?converter|at6|at8|aisin|jatco|hydra/.test(txJoined);
  if (env === "city" && hasDCT) {
    const km = parseKm(a.yearly_km as string);
    if (km >= 25000) s -= 6;       // DCT will fail within 3 years
    else if (km >= 15000) s -= 3;  // DCT will struggle within 5 years
    if (a.mission === "professional_driver") s -= 3; // Extra penalty — this is a work tool
  }
  // Bonus for city-proof transmissions
  if (env === "city" && hasSafeTx && (a.yearly_km === "over_30k" || a.yearly_km === "20k_30k")) s += 3;

  // Fix 4: Hybrid maintenance savings for city driving
  // Regen braking cuts brake wear 50-70%, engine runs less = less oil degradation
  if (isHybrid && !unpluggedPHEV && env === "city" && (a.yearly_km === "over_30k" || a.yearly_km === "20k_30k")) s += 3;
  if (isHybrid && !unpluggedPHEV && env === "city") s += 1; // Smaller bonus even at lower mileage
  // Unplugged PHEV: full ICE wear + hybrid complexity + dead battery weight = worst of both worlds
  if (unpluggedPHEV) s -= 3;
  // Resale value
// ── RESALE — weighted by how much depreciation this buyer will actually feel ──
  const rw = getResaleRelevance(a);
  if (c.resaleValue === "holds_well") s += Math.round(6 * rw);
  else if (c.resaleValue === "depreciates_fast") s -= Math.round(5 * rw);
  // Contrarian bonus: buying an already-depreciated "fast dropper" old = maximum car for the money
  if (c.resaleValue === "depreciates_fast" && rw <= 0.2
      && (a.year === "old_ok" || a.year === "older_fine")
      && (Array.isArray(a.priorities) && (a.priorities as string[]).includes("low_cost"))) s += 2;
  return Math.max(0, Math.min(35, s));
}

function scorePreference(c: CarData, a: Answers): number {
  let s = 6;
  const priorities = (Array.isArray(a.priorities) ? a.priorities : []) as string[];
  const mission = a.mission as string;
  if (priorities.includes("durability") && c.reliability === "Excellent") s += 8;
  else if (priorities.includes("durability") && c.reliability === "Good") s += 4;
  else if (priorities.includes("durability") && c.reliability === "Poor") s -= 6;
  if (priorities.includes("driving_pleasure") && ["convertible", "coupe"].includes(c.body)) s += 6;
  if (priorities.includes("low_cost") && c.repair === "VeryLow") s += 6;
  if (priorities.includes("comfort") && c.longTrip) s += 5;
  if (priorities.includes("comfort") && (c.luxury || 0) >= 2) s += 4;
  if (priorities.includes("safety") && (c.ncapStars || 0) >= 5) s += 8;
 if (priorities.includes("looks") && (c.luxury || 0) >= 3) s += 6;
  else if (priorities.includes("looks") && (c.luxury || 0) >= 2) s += 3;  // Business-class cars still look good
  // Head turner / show_with_soul — premium feel matters at ANY budget
  if ((mission === "head_turner" || mission === "show_with_soul") && (c.luxury || 0) >= 2) s += 3;
  // Head turner: presence matters — coupes/convertibles turn heads, economy hatchbacks don't
  if (mission === "head_turner") {
    if (["coupe", "convertible"].includes(c.body)) s += 6;
    if ((c.luxury || 0) <= 1 && ["hatchback", "city_car", "mpv"].includes(c.body)) s -= 6;
  }
 if (priorities.includes("easy_entry")) {
    // Seating height proxy — ground clearance + body type
    const gc = c.groundClearance || 150;
    const body = c.body || "";
    if (["suv", "crossover"].includes(body) && gc >= 180) s += 5;       // High SUV: Kodiaq, Tucson — slide right in
    else if (["suv", "crossover"].includes(body)) s += 4;               // Lower SUV/crossover: Kamiq, Bayon — still good
    else if (body === "mpv") s += 3;                                     // MPV: Touran, Berlingo — flat floor, easy access
    else if (body === "estate" && gc >= 160) s += 2;                     // Raised estate: Outback, Scout — decent
    else if (["hatchback", "estate"].includes(body)) s -= 1;            // Normal height — not terrible but requires bending
    else if (["sedan", "coupe", "convertible"].includes(body)) s -= 4;  // Low cars — dropping down into the seat
    else if (body === "city_car") s -= 2;                                // Small but not as low as sedan
  }
  // Mission bonuses
if (mission === "drivers_car" && ["convertible", "coupe"].includes(c.body)) s += 5;
  // Power-to-weight ratio — THE metric for driving pleasure
  if (mission === "drivers_car" || mission === "show_with_soul" || priorities.includes("driving_pleasure")) {
    const pwMax = c.maxPowerKw || 0;
    const pwMin = c.minPowerKw || pwMax;
    const fuelPw = getPowerForFuel(c, a.fuel as string);
    const pw = fuelPw ?? (pwMax + pwMin) / 2; // Fuel-specific power when known; else mid-lineup — halo variants shouldn't score the whole model
    const wt = c.weight || 1500;
    if (pw > 0 && wt > 0) {
      const hpPerTon = (pw * 1.36) / (wt / 1000); // kW to hp, kg to ton
      if (hpPerTon >= 250) s += 6;       // Serious performance: GR86, M2, Supra
      else if (hpPerTon >= 180) s += 4;  // Quick: Focus ST, i30N, MX-5
      else if (hpPerTon >= 130) s += 1;  // Adequate: Golf GTI, 320i
      else s -= 3;                       // Sluggish: heavy + weak = boring
    }
    // Light weight bonus — light cars feel faster and corner better
    if (wt > 0 && wt <= 1300) s += 3;        // Sub-1300kg: MX-5, GR86, Swift Sport
    else if (wt > 0 && wt <= 1500) s += 1;   // Light-ish: i30N, Civic Type R
    else if (wt >= 1900) s -= 2;              // Heavy barge: no fun on mountain roads
  }
  if (mission === "family" && (c.seats || 5) >= 5 && (c.boot || 0) >= 400) s += 5;
  if (mission === "road_trip" && c.longTrip) s += 5;
  // Length-based comfort tier for road_trip / long-distance
  // Longer cars = longer wheelbase = better ride, more cabin space, quieter highway cruising
  if (mission === "road_trip" || a.trip_pattern === "long") {
    const len = c.length || 0;
    if (len >= 4900) s += 5;
    else if (len >= 4500) s += 3;
    else if (len >= 4100) s += 0;
    else if (len > 0) s -= 4;
  }
  // Length as rear legroom proxy for professional_driver
  // Taxi passengers need legroom — longer car = longer wheelbase = more rear space
  if (mission === "professional_driver" && (a.passengers === "3_4" || a.passengers === "5" || a.passengers === "6_plus")) {
    const len = c.length || 0;
    if (len >= 4800) s += 5;       // Superb, Camry — legendary taxi legroom
    else if (len >= 4500) s += 3;  // Octavia, Corolla sedan — good rear space
    else if (len >= 4200) s += 0;  // i30, Ceed — acceptable
    else if (len > 0) s -= 4;     // Yaris, Fabia — cramped for passengers
  }
  // Comfort priority + vehicle size synergy
  if (priorities.includes("comfort")) {
    const len = c.length || 0;
    if (len >= 4900) s += 3;
    else if (len >= 4500) s += 1;
    else if (len > 0 && len < 4100) s -= 2;
  }
  if (mission === "work_horse" && ["suv", "pickup"].includes(c.body)) s += 5;
  if (mission === "weekend_adventure" && c.body === "suv") s += 4;
  if (mission === "commuter" && c.body === "hatchback") s += 3;
  // Equipment match
  const eq = a.equipment as string;
  if (eq === "full" && (c.luxury || 0) >= 3) s += 4;
  if (eq === "basic" && (c.luxury || 0) <= 1) s += 3;
  if (eq === "full" && (c.luxury || 0) <= 1) s -= 3;
  // Transmission preference bonus
  // Transmission preference bonus — reward cars matching the preference
  const tx = a.transmission as string;
  const txJoinedPref = (c.tx || []).join(" ").toLowerCase();
  const hasManual = txJoinedPref.includes("manual");
  const hasAuto = /auto|dsg|cvt|dct|ecvt|amt|e-cvt/.test(txJoinedPref);
  if (tx === "prefer_auto" && hasAuto) s += 3;
  else if (tx === "prefer_auto" && !hasAuto) s -= 3;
  else if (tx === "prefer_manual" && hasManual) s += 3;
  else if (tx === "prefer_manual" && !hasManual) s -= 3;
  return Math.max(0, Math.min(35, s));
}

function getConsumptionForFuel(c: CarData, userFuel: string): number | null {
  const bf = c.consumptionByFuel;
  if (!bf || !userFuel || userFuel === "open") return c.avgConsumption ?? null;
  if (userFuel === "hybrid") return bf["hybrid"] ?? bf["phev"] ?? c.avgConsumption ?? null;
  return bf[userFuel] ?? c.avgConsumption ?? null;
}

function getPowerForFuel(c: CarData, userFuel: string): number | null {
  const bf = c.powerByFuel;
  if (!bf || !userFuel || userFuel === "open") return c.maxPowerKw ?? null;
  if (userFuel === "hybrid") return bf["hybrid"] ?? bf["phev"] ?? c.maxPowerKw ?? null;
  return bf[userFuel] ?? c.maxPowerKw ?? null;
}

function scoreSafety(c: CarData, a: Answers): number {
  let s = 6;
  if ((c.ncapStars || 0) >= 5) s += 10; else if (c.ncapStars === 4) s += 6; else if (c.ncapStars === 3) s += 2; else if (c.ncapStars != null && c.ncapStars <= 2) s -= 6;
  if ((c.ncapAdult || 0) >= 90) s += 4; else if ((c.ncapAdult || 0) >= 80) s += 2;
  const priorities = (Array.isArray(a.priorities) ? a.priorities : []) as string[];
  if (priorities.includes("safety") && (c.ncapStars || 0) >= 5) s += 6;
  if (priorities.includes("safety") && c.ncapStars != null && c.ncapStars <= 2) s -= 8;
  // Family mission = safety matters more
  if (a.mission === "family" && (c.ncapStars || 0) >= 5) s += 4;
  if (a.mission === "family" && c.ncapStars != null && c.ncapStars <= 2) s -= 6;
  if (c.reliability === "Excellent") s += 4; else if (c.reliability === "Good") s += 2; else if (c.reliability === "Poor") s -= 3;
  return Math.max(0, Math.min(35, s));
}

// Mission-based weight profiles
const MISSION_WEIGHTS: Record<string, { practical: number; financial: number; preference: number; safety: number }> = {
  commuter:            { practical: 0.25, financial: 0.30, preference: 0.20, safety: 0.25 },
  family:              { practical: 0.30, financial: 0.15, preference: 0.10, safety: 0.45 },
  road_trip:           { practical: 0.30, financial: 0.20, preference: 0.30, safety: 0.20 },
  drivers_car:         { practical: 0.10, financial: 0.10, preference: 0.60, safety: 0.20 },
  work_horse:          { practical: 0.55, financial: 0.20, preference: 0.10, safety: 0.15 },
  head_turner:         { practical: 0.10, financial: 0.15, preference: 0.55, safety: 0.20 },
  show_with_soul:      { practical: 0.10, financial: 0.10, preference: 0.60, safety: 0.20 },
  weekend_adventure:   { practical: 0.50, financial: 0.15, preference: 0.15, safety: 0.20 },
  professional_driver: { practical: 0.20, financial: 0.40, preference: 0.10, safety: 0.30 },
  first_car:           { practical: 0.20, financial: 0.35, preference: 0.10, safety: 0.35 },
  all_rounder:         { practical: 0.25, financial: 0.25, preference: 0.25, safety: 0.25 },
};

  // Fault mentions an engine family irrelevant to the user's fuel choice?
function faultRelevant(issue: string, userFuel: string): boolean {
  if (!userFuel || userFuel === "open") return true;
  const t = (issue || "").toLowerCase();
  const petrolHints = /puretech|tsi|tfsi|mpi|fsi|vti|tce|1\.0|1\.2 |petrol/;
  const dieselHints = /tdi|tdci|dci|cdti|hdi|crdi|dpf|injector|diesel|adblue|egr/;
  if ((userFuel === "hybrid" || userFuel === "electric") && (petrolHints.test(t) || dieselHints.test(t))) return false;
  if (userFuel === "petrol" && dieselHints.test(t)) return false;
  if (userFuel === "diesel" && petrolHints.test(t)) return false;
  return true;
}

function scoreCar(car: CarData, a: Answers): number {
  const c = norm(car);
  applyBestVariant(c, a);
  if (!hardFilter(c, a)) return 0;
  const practical = scorePractical(c, a);
  const financial = scoreFinancial(c, a);
  const preference = scorePreference(c, a);
  const safety = scoreSafety(c, a);
  let w = { ...(MISSION_WEIGHTS[a.mission as string] || { practical: 0.25, financial: 0.25, preference: 0.25, safety: 0.25 }) };

  // Budget-aware weight scaling
  // At high budgets, buyers expect premium even for practical missions
  const budget = parseBudget(a.budget as string);
  const mission = a.mission as string;
  if (budget >= 40000 && (mission === "work_horse" || mission === "commuter" || mission === "all_rounder")) {
    // Shift weight from practical → preference (premium matters when you're paying for it)
    const shift = budget >= 60000 ? 0.15 : 0.10;
    w.practical = Math.max(0.15, w.practical - shift);
    w.preference = Math.min(0.45, w.preference + shift);
  }
  // Professional driver at high budget — comfort and preference matter more
  if (budget >= 25000 && mission === "professional_driver") {
    w.preference = Math.min(0.20, w.preference + 0.05);
    w.financial = Math.max(0.30, w.financial - 0.05);
  }
  const weighted = (practical * w.practical + financial * w.financial + preference * w.preference + safety * w.safety) * 4;
  const body = c.body || "";
  let bonus = 0;
// Towing override — capability IS the score for heavy/medium
  if (a.towing === "heavy" || a.towing === "medium") {
    const towCap = c.towingCapacity || 0;
    const cap = getCapabilityScore(c);
    if (a.towing === "heavy") {
      if (towCap >= 3500) bonus += 12;
      else if (towCap >= 3000) bonus += 8;
      else if (towCap >= 2500) bonus += 4;
      // Real truck/SUV vs crossover pretending to be capable
      if (body === "pickup") bonus += 5;
      else if (body === "suv" && cap >= 50) bonus += 3;
      else if (body === "crossover") bonus -= 10;
      else if (!["suv", "pickup"].includes(body)) bonus -= 12;
    }
    if (a.towing === "medium") {
      if (towCap >= 2500) bonus += 6;
      else if (towCap >= 2000) bonus += 3;
    }
  }
  const priorities = (Array.isArray(a.priorities) ? a.priorities : []) as string[];

  // Reliability + durability priority
  if (c.reliability === "Excellent" && priorities.includes("durability")) bonus += 5;
  if (c.reliability === "Poor" && priorities.includes("durability")) bonus -= 5;

  if (priorities.includes("comfort") && c.body === "pickup") bonus -= 5;

  // Family perfect match
  if (a.mission === "family" && (c.ncapStars || 0) >= 5 && (c.seats || 5) >= 5 && (c.boot || 0) >= 400) bonus += 6;

  if (a.body_type === "small_nimble" && (c.length || 0) > 4400) bonus -= 4;

  // Adventure + proper SUV/pickup
  if (a.mission === "weekend_adventure" && ["suv", "pickup"].includes(body) && c.hasAWD && (c.groundClearance || 0) >= 170) bonus += 6;
  if (a.mission === "weekend_adventure" && ["sedan", "coupe", "city_car"].includes(body)) bonus -= 5;

  // Driver's car + sports body
  if ((a.mission === "drivers_car" || a.mission === "show_with_soul") && ["coupe", "convertible"].includes(body)) bonus += 6;
  if ((a.mission === "drivers_car" || a.mission === "show_with_soul") && ["van", "pickup", "minivan"].includes(body)) bonus -= 5;

  // Work horse + capable body
  if (a.mission === "work_horse" && ["pickup", "van"].includes(body) && (c.towingCapacity || 0) >= 2000) bonus += 6;
  if (a.mission === "work_horse" && ["coupe", "convertible", "city_car"].includes(body)) bonus -= 6;

  // Professional driver — reliability is everything
  if (a.mission === "professional_driver" && c.reliability === "Excellent") bonus += 5;
  if (a.mission === "professional_driver" && c.reliability === "Poor") bonus -= 5;

  // Head turner + premium
  if (a.mission === "head_turner" && (c.luxury || 0) >= 2) bonus += 5;

  // Towing + actual capacity
  if ((a.towing === "heavy") && (c.towingCapacity || 0) >= 3000) bonus += 5;

  // Eco mission — penalize gas guzzlers
  if (priorities.includes("low_cost") && (c.avgConsumption || 7) <= 5) bonus += 4;
  if (priorities.includes("low_cost") && (c.avgConsumption || 7) >= 10) bonus -= 3;

  // NCAP bonus when safety is priority
  if (priorities.includes("safety") && (c.ncapStars || 0) >= 5) bonus += 4;
  if (priorities.includes("safety") && (c.ncapStars || 0) <= 2) bonus -= 4;

  // Easy entry + raised body: low cars contradict both answers — penalize at the bonus level (practical may be floored at 0)
  if (priorities.includes("easy_entry") && a.body_type === "raised" && ["hatchback", "city_car", "sedan", "coupe"].includes(body)) bonus -= 6;

  // Critical faults penalty
  const criticalFaults = (c.vehicleFaults || []).filter((f: any) => f.severity === "critical" && faultRelevant(f.issue, a.fuel as string)).length;
  if (criticalFaults > 0) bonus -= criticalFaults * 2;

  c._dims = { practical, financial, preference, safety };
  return Math.max(1, Math.min(200, Math.round(weighted + bonus)));
}

function calcResults(DB: CarData[], a: Answers): ScoredCar[] {
  const raw = DB.map((car) => ({ car: norm(car), score: scoreCar(car, a), isBest: false }));
  const valid = raw.filter((s) => s.score > 0);
  if (valid.length === 0) return [];
  const max = Math.max(...valid.map((s) => s.score));
  const min = Math.min(...valid.map((s) => s.score));
  const range = max - min || 1;
  const normalized = raw.map((s) => s.score === 0 ? s : { ...s, score: Math.max(10, Math.min(99, Math.round((s.score / max) * 99))) });
  const sorted = normalized.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
  if (sorted.length) sorted[0].isBest = true;
  return sorted;
}

// ════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    const answers = (await request.json()) as Answers;
    const cars = await fetchCarData();
    const results = calcResults(cars, answers);
    return NextResponse.json(results);
  } catch (err) {
    console.error("[/api/recommend]", err);
    return NextResponse.json([], { status: 500 });
  }
}
