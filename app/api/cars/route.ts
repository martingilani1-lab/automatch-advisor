import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ESTATE_STYLES } from "../recommend/route";

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
// BROWSE (Path B) — category predicates over the joined CarData shape.
// Separate from ESTATE_STYLES' consumer in recommend/route.ts (applyBestVariant),
// which mutates scoring state — browse only ever reads, never mutates.
// ════════════════════════════════════════════════════════════

const BROWSE_ESTATE_STYLES = [...ESTATE_STYLES, "sport_turismo", "cross_turismo"];

function normStyle(s: string): string {
  return (s || "").toLowerCase().replace(/_/g, " ");
}

function hasVariantStyle(car: BaseCarData, patterns: string[]): boolean {
  const variants = car.bodyVariants;
  if (!Array.isArray(variants)) return false;
  const normPatterns = patterns.map(normStyle);
  return variants.some((v: any) => {
    const style = normStyle(v?.style || "");
    return normPatterns.some((p) => style.includes(p));
  });
}

const CATEGORY_PREDICATES: Record<string, (c: BaseCarData) => boolean> = {
  city_small: (c) => ["city_car", "hatchback"].includes(c.body) && typeof c.length === "number" && c.length < 4200,
  hatchback: (c) => c.body === "hatchback",
  estate: (c) => c.body === "estate" || hasVariantStyle(c, BROWSE_ESTATE_STYLES),
  sedan_liftback: (c) => c.body === "sedan" || hasVariantStyle(c, ["liftback", "sportback", "fastback", "gran_coupe"]),
  suv_crossover: (c) => ["suv", "crossover"].includes(c.body),
  seven_seats: (c) => (c.seats || 0) >= 7 || c.body === "minivan" || hasVariantStyle(c, ["suv_7seat", "mpv_7seat", "lounge_7seat", "van_9seat"]),
  pickup_work: (c) => ["pickup", "van"].includes(c.body),
  coupe_convertible: (c) => c.body === "coupe" || hasVariantStyle(c, ["convertible", "cabriolet", "targa"]),
  electric: (c) => c.fuel.includes("electric"),
};

const FUEL_WHITELIST = ["petrol", "diesel", "electric", "hybrid", "phev"];
const DRIVETRAIN_WHITELIST = ["AWD", "FWD", "RWD"];
const TRANSMISSION_WHITELIST = ["manual", "automatic"];
const SORT_WHITELIST = ["price_asc", "price_desc", "reliability", "safety", "year"];
const RELIABILITY_RANK: Record<string, number> = { Excellent: 4, Good: 3, Average: 2, Poor: 1 };

function matchesFuel(c: CarData, fuel: string): boolean {
  if (fuel === "hybrid") return c.fuel.includes("hybrid") || c.fuel.includes("phev");
  return c.fuel.includes(fuel);
}

// Same auto/manual convention as matchesTx() in recommend/route.ts, duplicated
// here since browse must not import scoring logic.
function matchesTransmission(c: CarData, pref: string): boolean {
  const t = (c.transmissions || []).join(" ").toLowerCase();
  if (pref === "manual") return t.includes("manual");
  return /auto|dsg|cvt|dct|ecvt|amt|tronic|pdk/.test(t);
}

function matchesDrivetrain(c: CarData, drivetrain: string): boolean {
  return (c.drivetrains || []).some((d: string) => d.toUpperCase() === drivetrain);
}

function buildCar(v: any, vEngines: any[], vTrans: any[]) {
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
  const drivetrains = [...new Set(vEngines.map((e: any) => e.drivetrain).filter(Boolean))] as string[];

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
}

type BaseCarData = ReturnType<typeof buildCar>;
type CarData = BaseCarData & { categories: string[] };

function tagCategories(c: BaseCarData): string[] {
  return Object.keys(CATEGORY_PREDICATES).filter((slug) => CATEGORY_PREDICATES[slug](c));
}

function parseQuery(searchParams: URLSearchParams) {
  const category = searchParams.get("category");
  const fuel = searchParams.get("fuel")?.toLowerCase();
  const transmission = searchParams.get("transmission")?.toLowerCase();
  const drivetrain = searchParams.get("drivetrain")?.toUpperCase();
  const brandParam = searchParams.get("brand");
  const priceMinParam = searchParams.get("priceMin");
  const priceMaxParam = searchParams.get("priceMax");
  const sortParam = searchParams.get("sort");

  const priceMin = priceMinParam !== null && !Number.isNaN(Number(priceMinParam)) ? Number(priceMinParam) : null;
  const priceMax = priceMaxParam !== null && !Number.isNaN(Number(priceMaxParam)) ? Number(priceMaxParam) : null;

  return {
    category: category && CATEGORY_PREDICATES[category] ? category : null,
    fuel: fuel && FUEL_WHITELIST.includes(fuel) ? fuel : null,
    transmission: transmission && TRANSMISSION_WHITELIST.includes(transmission) ? transmission : null,
    drivetrain: drivetrain && DRIVETRAIN_WHITELIST.includes(drivetrain) ? drivetrain : null,
    brands: brandParam ? brandParam.split(",").map(b => b.trim().toLowerCase()).filter(Boolean) : null,
    priceMin,
    priceMax,
    sort: sortParam && SORT_WHITELIST.includes(sortParam) ? sortParam : null,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = parseQuery(searchParams);

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

    let cars: CarData[] = (vehiclesRes.data || []).map((v: any) => {
      const vEngines = engines.filter((e: any) => e.vehicle_id === v.id);
      const vTrans = transmissions.filter((t: any) => t.vehicle_id === v.id);
      const base = buildCar(v, vEngines, vTrans);
      return { ...base, categories: tagCategories(base) };
    });

    // Predicates run once here, server-side, and are exposed to the client as
    // the `categories` tag — the client filters on the tag, it never
    // re-evaluates CATEGORY_PREDICATES itself.
    if (q.category) cars = cars.filter((c) => c.categories.includes(q.category!));
    if (q.fuel) cars = cars.filter((c) => matchesFuel(c, q.fuel!));
    if (q.transmission) cars = cars.filter((c) => matchesTransmission(c, q.transmission!));
    if (q.drivetrain) cars = cars.filter((c) => matchesDrivetrain(c, q.drivetrain!));
    if (q.brands) cars = cars.filter((c) => q.brands!.includes((c.make || "").toLowerCase()));
    if (q.priceMin !== null) cars = cars.filter((c) => (c.pricing?.euPriceMax ?? 0) >= q.priceMin!);
    if (q.priceMax !== null) cars = cars.filter((c) => (c.pricing?.euPriceMin ?? 0) <= q.priceMax!);

    if (q.sort === "price_asc") cars.sort((a, b) => (a.pricing?.euPriceMin ?? 0) - (b.pricing?.euPriceMin ?? 0));
    else if (q.sort === "price_desc") cars.sort((a, b) => (b.pricing?.euPriceMin ?? 0) - (a.pricing?.euPriceMin ?? 0));
    else if (q.sort === "reliability") cars.sort((a, b) => (RELIABILITY_RANK[b.reliability?.overall] ?? 0) - (RELIABILITY_RANK[a.reliability?.overall] ?? 0));
    else if (q.sort === "safety") cars.sort((a, b) => (b.safety?.stars ?? 0) - (a.safety?.stars ?? 0));
    else if (q.sort === "year") cars.sort((a, b) => (b.yearTo ?? 0) - (a.yearTo ?? 0));

    return NextResponse.json(cars);
  } catch (err) {
    console.error("[/api/cars]", err);
    return NextResponse.json([], { status: 500 });
  }
}