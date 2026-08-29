// Reads either shape a car object can arrive in:
// - RAW, straight from /api/cars (pricing.euPriceMin, safety.stars, reliability.overall)
// - NORMALISED, after /api/recommend's norm() (budgetMin, ncapStars, reliability: "Good")
// `_n` is the flag norm() stamps on a car once normalised. Any code reading price,
// reliability, safety, or mileage off a car that might be either shape MUST go through
// these accessors instead of touching the raw/normalised field directly.

export interface CarData {
  id: string; make: string; model: string; gen: string; years: string;
  yearTo?: number; body: string; segment?: string; fuel: string[]; seats?: number; boot?: number;
  bootMax?: number; origin?: string; originFlag?: string;
  towingCapacity?: number | null; groundClearance?: number | null;
  length?: number | null; width?: number | null; height?: number | null; weight?: number | null;
  hasAWD?: boolean; drivetrains?: string[]; avgConsumption?: number | null; fuelTankLiters?: number | null;
  resaleValue?: string | null; bodyVariants?: any[] | null;
  buyingTip?: string;
  transmissions?: string[]; maxPowerKw?: number | null; minPowerKw?: number | null;
  // Counts only (from /api/cars) — per-engine/gearbox detail still lives behind
  // /api/detail. Absent on /api/recommend's normalised shape.
  engineCount?: number; transmissionCount?: number;
  vehicleFaults?: { issue: string; severity: string }[];
  pricing?: { skPriceMin?: number; skPriceMax?: number; euPriceMin?: number; euPriceMax?: number; mileageAtMidBudget?: string };
  reliability?: any; safety?: any; equipment?: any[];
  // Distinct reliability tiers across the vehicle's engines, worst-first, and
  // the worst one alone (from /api/cars) — bestRel (reliability.overall) is
  // the optimistic single value; these let the browse card show the honest
  // "Poor–Good" spread instead. Absent on /api/recommend's normalised shape.
  reliabilityTiers?: string[]; reliabilityWorst?: string;
  reliabilityByFuel?: Record<string, string> | null;
  _n?: boolean; budgetMin?: number; budgetMax?: number; mileageRange?: string;
  ncapStars?: number | null; ncapAdult?: number | null;
  pros?: string[]; cons?: string[]; consumptionByFuel?: Record<string, number> | null;
  powerByFuel?: Record<string, number> | null;
  // Every Prehľad (Path B) category slug this car matches — computed server-side
  // in app/api/cars/route.ts from CATEGORY_PREDICATES. Only present on /api/cars
  // responses; absent on /api/recommend's normalised shape.
  categories?: string[];
  // Hand-assigned lifestyle tags (0..8 of LIFESTYLE_TAG_SLUGS, app/lib/tags.ts) —
  // distinct from the derived `categories`/body-shape fields above. Additive
  // only for now (Track A Step 1): populated from vehicles.tags on /api/cars
  // responses, unread by scoring, the quiz, browse filtering, or tiles.
  tags?: string[];
}

export const REL_RANK: Record<string, number> = { Excellent: 3, Good: 2, Average: 1, Poor: 0 };
export const REL_COLORS: Record<string, string> = { Excellent: "#6bdb8a", Good: "#e8ff47", Average: "#ff9944", Poor: "#ff6b35" };
export const REL_SCALE_TITLE = "Reliability: Excellent > Good > Average > Poor";

// origin_country + years, e.g. "🇩🇪 German · 2015–2021" — falls back to just
// years (no orphan "·") if origin is empty. gen and years are both set to the
// same raw production_years string by /api/cars, so a card must never render
// both — this is the single shared line that replaces that doubled render.
export function originLine(c: CarData): string {
  const origin = c.origin ? c.origin.charAt(0).toUpperCase() + c.origin.slice(1) : "";
  return origin ? `${c.originFlag || "\u{1F30D}"} ${origin} · ${c.years}` : c.years;
}

const FUEL_LABELS: Record<string, string> = { petrol: "⛽ Petrol", diesel: "\u{1F6E2}️ Diesel", electric: "⚡ Electric", hybrid: "⚡ Hybrid", phev: "⚡ PHEV", lpg: "\u{1F4A7} LPG" };
export function fuelLabel(f: string): string { return FUEL_LABELS[f] || f; }

const BODY_LABELS: Record<string, string> = { hatchback: "Hatchback", estate: "Estate", suv: "SUV", mpv: "MPV", pickup: "Pickup", convertible: "Convertible", coupe: "Coupe", sedan: "Sedan", crossover: "Crossover", city_car: "City Car", van: "Van", minivan: "MPV" };
export function bodyLabel(b: string): string { return BODY_LABELS[b] || b; }

export function carPriceMin(c: CarData): number { return c._n ? (c.budgetMin ?? 0) : (c.pricing?.euPriceMin ?? c.pricing?.skPriceMin ?? 0); }
export function carPriceMax(c: CarData): number { return c._n ? (c.budgetMax ?? 0) : (c.pricing?.euPriceMax ?? c.pricing?.skPriceMax ?? 0); }
export function carRel(c: CarData): string { return c._n ? String(c.reliability ?? "Average") : (c.reliability?.overall ?? "Average"); }
export function carStars(c: CarData): number | null { return c._n ? (c.ncapStars ?? null) : (c.safety?.stars ?? null); }
export function carAdult(c: CarData): number | null { return c._n ? (c.ncapAdult ?? null) : (c.safety?.adultOccupant ?? null); }
export function carMileage(c: CarData): string { return c._n ? (c.mileageRange ?? "") : (c.pricing?.mileageAtMidBudget ?? ""); }
export function carFuelMatch(c: CarData, fuel: string): boolean {
  if (!fuel) return true;
  return (c.fuel || []).some((f) => {
    const ft = f.toLowerCase();
    if (fuel === "hybrid") return ft.includes("hybrid") || ft.includes("phev");
    return ft.includes(fuel);
  });
}

// Multi-powertrain models (208, 500, Kona...) blend all their engines' figures
// into avgConsumption/maxPowerKw, which is meaningless once you know which
// fuel the buyer actually wants — these read the per-fuel figure instead when
// one is known. Has a bug history (PHEV/per-fuel corruption); single source
// of truth, do not re-duplicate.
export function getConsumptionForFuel(c: CarData, userFuel: string): number | null {
  const bf = c.consumptionByFuel;
  if (!bf || !userFuel || userFuel === "open") return c.avgConsumption ?? null;
  if (userFuel === "hybrid") return bf["hybrid"] ?? bf["phev"] ?? c.avgConsumption ?? null;
  return bf[userFuel] ?? c.avgConsumption ?? null;
}

export function getPowerForFuel(c: CarData, userFuel: string): number | null {
  const bf = c.powerByFuel;
  if (!bf || !userFuel || userFuel === "open") return c.maxPowerKw ?? null;
  if (userFuel === "hybrid") return bf["hybrid"] ?? bf["phev"] ?? c.maxPowerKw ?? null;
  return bf[userFuel] ?? c.maxPowerKw ?? null;
}

// Fuel-contextual reliability tier — same fallback shape as getConsumptionForFuel/
// getPowerForFuel above. Falls back through carRel() so it works on both RAW
// (reliability.overall) and NORMALISED (flattened reliability string) car shapes.
export function getReliabilityForFuel(c: CarData, userFuel: string): string {
  const bf = c.reliabilityByFuel;
  const fallback = carRel(c);
  if (!bf || !userFuel || userFuel === "open") return fallback;
  if (userFuel === "hybrid") return bf["hybrid"] ?? bf["phev"] ?? fallback;
  return bf[userFuel] ?? fallback;
}

// GSR2-era: production still active past 2022 (contains "Present", or the end
// year is 2022+) — the same rule that identified 261/334 cars as eligible for
// the GSR2-mandated safety-feature baseline (see the read-only query that
// established that count/list). Derived purely from the existing years
// string — no new per-car column. Every car in this catalog uses a strict
// "YYYY - YYYY" / "YYYY - Present" format (verified against all 334 rows),
// so no ambiguous-format handling is needed beyond the regex simply not
// matching (which correctly falls through to false/non-GSR2-era).
export function isGsr2Era(c: CarData): boolean {
  const y = c.years || "";
  if (/present/i.test(y)) return true;
  const m = y.match(/(\d{4})\s*$/);
  return m ? parseInt(m[1], 10) >= 2022 : false;
}
