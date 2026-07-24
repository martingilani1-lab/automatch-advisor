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
  vehicleFaults?: { issue: string; severity: string }[];
  pricing?: { skPriceMin?: number; skPriceMax?: number; euPriceMin?: number; euPriceMax?: number; mileageAtMidBudget?: string };
  reliability?: any; safety?: any; equipment?: any[];
  _n?: boolean; budgetMin?: number; budgetMax?: number; mileageRange?: string;
  ncapStars?: number | null; ncapAdult?: number | null;
  pros?: string[]; cons?: string[]; consumptionByFuel?: Record<string, number> | null;
  powerByFuel?: Record<string, number> | null;
  // Every Prehľad (Path B) category slug this car matches — computed server-side
  // in app/api/cars/route.ts from CATEGORY_PREDICATES. Only present on /api/cars
  // responses; absent on /api/recommend's normalised shape.
  categories?: string[];
}

export const REL_RANK: Record<string, number> = { Excellent: 3, Good: 2, Average: 1, Poor: 0 };

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
