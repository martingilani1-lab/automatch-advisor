import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  FUEL_OPTIONS,
  DRIVETRAIN_OPTIONS,
  TRANSMISSION_TYPES,
  matchesFuelGroup,
  matchesTransmissionGroup,
  matchesDrivetrainGroup,
} from "@/app/lib/carFilters";

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
// BROWSE (Path B) — body-type PARTITION: each car lands in exactly ONE tile.
// Resolution: primary_body (hand-curated override column on `vehicles`,
// NULL for most rows today — see migration 20260730120000) falls back to
// body_type, then maps to one of 10 tile slugs below. Replaces the old
// overlapping CATEGORY_PREDICATES model (a car could land in many
// categories, summing to 502 tags across 334 cars). Browse only ever reads
// this; scoring's own body-type handling in recommend/route.ts is untouched.
// ════════════════════════════════════════════════════════════

const BODY_TILE_MAP: Record<string, string> = {
  city_car: "city",
  hatchback: "hatchback",
  liftback: "liftback",
  sedan: "sedan",
  estate: "combi",
  suv: "suv_crossover",
  crossover: "suv_crossover",
  minivan: "minivan",
  pickup: "pickup",
  van: "van",
  coupe: "coupe_convertible",
  convertible: "coupe_convertible",
};

const TILE_WHITELIST = Object.freeze([
  "city", "hatchback", "liftback", "sedan", "combi",
  "suv_crossover", "minivan", "pickup", "van", "coupe_convertible",
]) as readonly string[];

function resolveCategory(v: any): string {
  const resolvedBody = v.primary_body || v.body_type || "hatchback";
  const tile = BODY_TILE_MAP[resolvedBody];
  if (!tile) {
    console.warn(`[/api/cars] unmapped body "${resolvedBody}" for vehicle ${v.id} — defaulting to hatchback tile`);
    return "hatchback";
  }
  return tile;
}

const FUEL_WHITELIST = FUEL_OPTIONS.map((o) => o.slug);
const DRIVETRAIN_WHITELIST = DRIVETRAIN_OPTIONS.map((o) => o.slug);
const TRANSMISSION_WHITELIST = TRANSMISSION_TYPES.map((o) => o.slug);
const SORT_WHITELIST = ["price_asc", "price_desc", "reliability", "safety", "year"];
const RELIABILITY_RANK: Record<string, number> = { Excellent: 4, Good: 3, Average: 2, Poor: 1 };

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

  // Best-within-fuel reliability tier, keyed by fuel type — mirrors
  // consumptionByFuel/powerByFuel below. bestRel above is the optimistic
  // single value across ALL engines; this lets callers score/display the
  // tier of the engine(s) matching the fuel the user actually wants.
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

  // Distinct reliability tiers across the vehicle's engines, worst-first —
  // bestRel above is the optimistic single value (best engine's tier); this
  // is the honest spread so the browse card can show "Poor–Good" instead of
  // just "Good" for a multi-engine model whose engines don't all agree.
  const relTierSet = vEngines.length > 0
    ? [...new Set(vEngines.map((e: any) => (e.reliability_rating || "average").toLowerCase()))]
    : ["average"];
  const reliabilityTiers = relTierSet
    .sort((a, b) => relOrder.indexOf(b) - relOrder.indexOf(a))
    .map((r) => relMap[r] || "Average");
  const reliabilityWorst = reliabilityTiers[0];

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
    // Counts only — full per-engine/gearbox detail still lives behind /api/detail.
    // Exposed here so the browse card's variety teaser ("2 engines · 2 gearboxes")
    // is complete on first paint, without waiting on the per-vehicle detail fetch.
    engineCount: vEngines.length,
    transmissionCount: vTrans.length,
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
    reliabilityTiers,
    reliabilityWorst,
    reliabilityByFuel,
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

// Comma-separated, whitelisted, unknown values dropped rather than erroring —
// same convention as `brand` used consistently across every group now.
function parseList(param: string | null, whitelist: string[], normalize: (s: string) => string): string[] {
  if (!param) return [];
  return param.split(",").map((s) => normalize(s.trim())).filter((s) => whitelist.includes(s));
}

function parseQuery(searchParams: URLSearchParams) {
  const category = searchParams.get("category");
  const fuel = parseList(searchParams.get("fuel"), FUEL_WHITELIST, (s) => s.toLowerCase());
  const transmission = parseList(searchParams.get("transmission"), TRANSMISSION_WHITELIST, (s) => s.toLowerCase());
  const drivetrain = parseList(searchParams.get("drivetrain"), DRIVETRAIN_WHITELIST, (s) => s.toUpperCase());
  const brandParam = searchParams.get("brand");
  const priceMinParam = searchParams.get("priceMin");
  const priceMaxParam = searchParams.get("priceMax");
  const sortParam = searchParams.get("sort");

  const priceMin = priceMinParam !== null && !Number.isNaN(Number(priceMinParam)) ? Number(priceMinParam) : null;
  const priceMax = priceMaxParam !== null && !Number.isNaN(Number(priceMaxParam)) ? Number(priceMaxParam) : null;

  return {
    category: category && TILE_WHITELIST.includes(category) ? category : null,
    fuel,
    transmission,
    drivetrain,
    brands: brandParam ? brandParam.split(",").map(b => b.trim().toLowerCase()).filter(Boolean) : [],
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
      return { ...base, categories: [resolveCategory(v)] };
    });

    // Resolved once here, server-side, and exposed to the client as the
    // `categories` tag (single-element array — see BODY_TILE_MAP above; kept
    // as an array so nothing downstream that reads c.categories breaks).
    // The client filters on the tag, it never re-resolves this itself.
    if (q.category) cars = cars.filter((c) => c.categories.includes(q.category!));
    if (q.fuel.length) cars = cars.filter((c) => matchesFuelGroup(c, q.fuel));
    if (q.transmission.length) cars = cars.filter((c) => matchesTransmissionGroup(c, q.transmission));
    if (q.drivetrain.length) cars = cars.filter((c) => matchesDrivetrainGroup(c, q.drivetrain));
    if (q.brands.length) cars = cars.filter((c) => q.brands.includes((c.make || "").toLowerCase()));
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