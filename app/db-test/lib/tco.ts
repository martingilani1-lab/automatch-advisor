// Total Cost of Ownership math behind TcoCalculator.tsx. Pure functions only -- the component
// owns the mileage slider state and just calls calcTco() inside a useMemo, so every rule here
// is unit-testable (tests/tco.test.ts) without rendering anything.
//
// Every constant below is a deliberate, coarse SK/CZ ballpark for an ESTIMATE, not live market
// data. They are collected in one place so updating a fuel price or the vignette is a one-line
// change, not a hunt through JSX.
import { reliabilityTone, type RelTone } from "./engineCompare";

// ---- Constants ----------------------------------------------------------------------------
export const DEFAULT_ANNUAL_KM = 15000;
export const MIN_ANNUAL_KM = 5000;
export const MAX_ANNUAL_KM = 50000;
export const ANNUAL_KM_STEP = 1000;

// € per unit (litre, or kWh for electric). Average pump/home-charging prices -- update these
// when prices move; nothing else in the app reads them.
export const FUEL_PRICE_EUR: Record<string, number> = {
  petrol: 1.6,
  diesel: 1.55,
  lpg: 0.8,
  cng: 1.4, // €/kg, consumption for CNG is kg/100 km
  electric: 0.25, // €/kWh, home-charging mix
};
// Fallback for a fuel type not in the map (e.g. a hybrid tagged oddly) -- petrol is the
// conservative middle choice.
const FALLBACK_FUEL = "petrol";

export const TIRE_SET_COST_EUR = 400; // one set of 4 mid-range tyres, fitted
export const TIRE_SET_LIFE_KM = 40000;
export const TIRE_SWAP_COST_EUR = 30; // one seasonal swap (summer <-> winter)
export const TIRE_SWAPS_PER_YEAR = 2;

// Unexpected-repairs reserve, keyed by the same 3-tone fold engineCompare already uses for the
// 5-word reliability scale (Excellent/Good -> good, Below Average/Poor -> poor). An UNRATED
// engine gets the "average" reserve: unknown is not the same as reliable, so it must not get
// the cheapest figure, but it isn't evidence of a bad engine either.
export const REPAIR_RESERVE_EUR: Record<RelTone, number> = { good: 200, average: 500, poor: 800, unknown: 500 };
// The reserve scales with mileage (more km = more wear), but clamped: a car parked most of the
// year still ages (rubber, batteries, corrosion), and a 50 000 km/year driver doesn't triple
// their risk of a single big failure. ±50 % around the 15 000 km baseline.
const RESERVE_SCALE_MIN = 0.5;
const RESERVE_SCALE_MAX = 1.5;

export const VIGNETTE_EUR = 60; // SK annual highway vignette
export const INSPECTION_EUR = 80; // STK + EK together
export const INSPECTION_EVERY_YEARS = 2;

// Compulsory third-party liability (PZP) estimate by engine power -- the main factor SK/CZ
// insurers price on. A real quote also depends on age, region, claims history; hence the
// "Calculate exact insurance" link next to it.
export function insuranceEstimate(powerKw: number): number {
  if (powerKw < 100) return 110;
  if (powerKw <= 150) return 150;
  return 180;
}

export const DEPRECIATION_RATE = 0.1; // 10 % of the purchase price per year

// ---- Input / output -----------------------------------------------------------------------
export interface TcoInput {
  priceEur: number | null;
  fuelType: string;
  // REAL-world consumption per 100 km in the fuel's unit (l, kg or kWh). If only the official
  // combined figure is known, pass it through realWorldConsumption() first.
  consumptionPer100: number | null;
  powerKw: number;
  // 1..5 catalog rating, or null when unrated.
  reliabilityRating: number | null;
  yearlyServiceEur: number | null;
  // Timing belt kit job; leave null for chain engines (no fixed interval -> not prorated).
  timingBeltCostEur: number | null;
  timingBeltIntervalKm: number | null;
}

export type TcoKey = "fuel" | "maintenance" | "tires" | "repairs" | "fixed" | "insurance" | "depreciation";

export interface TcoLine {
  key: TcoKey;
  label: string;
  yearly: number | null; // null = not computable from the data we have (shown as "No data")
  detail: string;
}

export interface TcoResult {
  lines: TcoLine[];
  yearlyTotal: number;
  monthlyTotal: number;
  // True when at least one line was null and is therefore NOT in the total -- the UI must say
  // so instead of presenting an incomplete total as the full cost.
  incomplete: boolean;
}

// Official WLTP/NEDC combined figures under-read real driving; +15 % is the typical gap for
// combustion engines. Applied only when the caller has nothing better.
export const REAL_WORLD_FACTOR = 1.15;
export function realWorldConsumption(official: number | null): number | null {
  return official == null ? null : Math.round(official * REAL_WORLD_FACTOR * 10) / 10;
}

const eur = (n: number) => `€${Math.round(n).toLocaleString("en-US").replace(/,/g, " ")}`;

// ---- The calculation ----------------------------------------------------------------------
export function calcTco(car: TcoInput, annualKm: number): TcoResult {
  const fuelKey = car.fuelType.toLowerCase() in FUEL_PRICE_EUR ? car.fuelType.toLowerCase() : FALLBACK_FUEL;
  const fuelPrice = FUEL_PRICE_EUR[fuelKey];
  const unit = fuelKey === "electric" ? "kWh" : fuelKey === "cng" ? "kg" : "l";

  // Fuel: (km / 100) × consumption × price.
  const fuel = car.consumptionPer100 != null ? (annualKm / 100) * car.consumptionPer100 * fuelPrice : null;

  // Maintenance: base yearly service + the timing-belt job prorated per km driven. Only
  // prorated when BOTH cost and interval are known (a cost with no interval = chain engine).
  const beltPerYear =
    car.timingBeltCostEur != null && car.timingBeltIntervalKm
      ? (car.timingBeltCostEur / car.timingBeltIntervalKm) * annualKm
      : 0;
  const maintenance = car.yearlyServiceEur != null ? car.yearlyServiceEur + beltPerYear : null;

  // Tyres: wear prorated per km + the fixed seasonal swaps.
  const tires = (TIRE_SET_COST_EUR / TIRE_SET_LIFE_KM) * annualKm + TIRE_SWAP_COST_EUR * TIRE_SWAPS_PER_YEAR;

  const tone = reliabilityTone(car.reliabilityRating);
  const scale = Math.min(RESERVE_SCALE_MAX, Math.max(RESERVE_SCALE_MIN, annualKm / DEFAULT_ANNUAL_KM));
  const repairs = REPAIR_RESERVE_EUR[tone] * scale;

  const fixed = VIGNETTE_EUR + INSPECTION_EUR / INSPECTION_EVERY_YEARS;
  const insurance = insuranceEstimate(car.powerKw);
  const depreciation = car.priceEur != null ? car.priceEur * DEPRECIATION_RATE : null;

  const lines: TcoLine[] = [
    {
      key: "fuel",
      label: "Fuel",
      yearly: fuel,
      detail: car.consumptionPer100 != null
        ? `${car.consumptionPer100} ${unit}/100 km × €${fuelPrice.toFixed(2)}/${unit}`
        : "No consumption data",
    },
    {
      key: "maintenance",
      label: "Maintenance",
      yearly: maintenance,
      detail: car.yearlyServiceEur == null
        ? "No service cost data"
        : beltPerYear > 0
          ? `Servicing ${eur(car.yearlyServiceEur)} + timing belt ${eur(beltPerYear)} (prorated)`
          : `Servicing ${eur(car.yearlyServiceEur)}`,
    },
    {
      key: "tires",
      label: "Tyres & seasonal swaps",
      yearly: tires,
      detail: `${eur(TIRE_SET_COST_EUR)} set per ${(TIRE_SET_LIFE_KM / 1000).toFixed(0)} 000 km + ${TIRE_SWAPS_PER_YEAR}× swap`,
    },
    {
      key: "repairs",
      label: "Unexpected repairs reserve",
      yearly: repairs,
      detail: tone === "unknown" ? "Engine not rated, average reserve assumed" : `Based on ${tone} reliability`,
    },
    {
      key: "fixed",
      label: "Vignette + STK/EK",
      yearly: fixed,
      detail: `${eur(VIGNETTE_EUR)} vignette + ${eur(INSPECTION_EUR)} inspection every ${INSPECTION_EVERY_YEARS} years`,
    },
    { key: "insurance", label: "Insurance (PZP estimate)", yearly: insurance, detail: `${car.powerKw} kW` },
    {
      key: "depreciation",
      label: "Depreciation",
      yearly: depreciation,
      detail: car.priceEur != null ? `${DEPRECIATION_RATE * 100} % of ${eur(car.priceEur)}` : "No price data",
    },
  ];

  const yearlyTotal = lines.reduce((sum, l) => sum + (l.yearly ?? 0), 0);
  return { lines, yearlyTotal, monthlyTotal: yearlyTotal / 12, incomplete: lines.some((l) => l.yearly == null) };
}
