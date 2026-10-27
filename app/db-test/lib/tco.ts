// Total Cost of Ownership math behind TcoCalculator.tsx -- per CONFIGURATION (engine + gearbox
// + drivetrain), not per engine, because the gearbox's fluid service and the AWD system's
// Haldex/Torsen service are real recurring costs, and the gearbox's reliability changes how much
// to keep aside for repairs (a DQ200 car is not a 02J car with the same engine).
//
// Pure functions only -- the component owns the mileage slider + selected configuration and
// just calls calcTco() inside a useMemo, so every rule here is unit-testable
// (tests/tco.test.ts) without rendering anything.
//
// Every constant below is a deliberate, coarse SK/CZ ballpark for an ESTIMATE, not live market
// data. They are collected in one place so updating a fuel price or the vignette is a one-line
// change, not a hunt through JSX.
import type { CatalogConfig, UnitService } from "@/app/catalog/lib/types";
import { drivetrainLabel } from "@/app/catalog/lib/configDisplay";
import { gearboxHeaderLabel } from "@/app/catalog/lib/gearboxLabel";
import { reliabilityTone, type RelTone } from "./engineCompare";

// ---- Constants ----------------------------------------------------------------------------
export const DEFAULT_ANNUAL_KM = 15000;
export const MIN_ANNUAL_KM = 5000;
export const MAX_ANNUAL_KM = 50000;
export const ANNUAL_KM_STEP = 1000;

// € per unit (litre, kg for CNG, kWh for electric). Petrol/diesel set by Martin 2026-10-27;
// update these when prices move -- nothing else in the app reads them.
export const FUEL_PRICE_EUR: Record<string, number> = {
  petrol: 1.85,
  diesel: 1.95,
  lpg: 0.8,
  cng: 1.4,
  electric: 0.25, // home-charging mix
};
// Fallback for a fuel type not in the map -- petrol, the most common in the catalog.
const FALLBACK_FUEL = "petrol";

export const TIRE_SET_COST_EUR = 400; // one set of 4 mid-range tyres, fitted
export const TIRE_SET_LIFE_KM = 40000;
export const TIRE_SWAP_COST_EUR = 30; // one seasonal swap (summer <-> winter)
export const TIRE_SWAPS_PER_YEAR = 2;

// Unexpected-repairs reserve. The BASE comes from the engine's reliability (the 3-tone fold
// engineCompare already uses: Excellent/Good -> good, Below Average/Poor -> poor). The gearbox
// and AWD system each ADD to it by their own rating -- a poor gearbox (DQ200: mechatronic
// €900-1 500, dry clutch €700-1 200 per its own note) is real money on top of the engine.
// UNRATED = average figure: unknown is not the same as reliable, so never the cheapest one.
export const REPAIR_RESERVE_EUR: Record<RelTone, number> = { good: 200, average: 500, poor: 800, unknown: 500 };
export const UNIT_RESERVE_UPLIFT_EUR: Record<RelTone, number> = { good: 0, average: 100, poor: 250, unknown: 100 };
// The reserve scales with mileage (more km = more wear), clamped ±50 % around 15 000 km/year:
// a car parked most of the year still ages, and 50 000 km/year doesn't triple the risk.
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

// Official combined figures under-read real driving; +15 % is the typical gap.
export const REAL_WORLD_FACTOR = 1.15;
export function realWorldConsumption(official: number | null): number | null {
  return official == null ? null : Math.round(official * REAL_WORLD_FACTOR * 10) / 10;
}

// ---- Input / output -----------------------------------------------------------------------
// A gearbox or AWD system as the calculator needs it: its rating (for the repair reserve) and
// its one scheduled fluid service.
export interface TcoUnit {
  label: string;
  reliabilityRating: number | null;
  service: UnitService;
}

export interface TcoInput {
  priceEur: number | null;
  fuelType: string;
  // REAL-world consumption per 100 km in the fuel's unit (l, kg or kWh).
  consumptionPer100: number | null;
  powerKw: number;
  engineReliabilityRating: number | null;
  // Engine routine servicing per year (oil, filters, plugs) -- catalog_engines yearly_maintenance.
  engineYearlyServiceEur: number | null;
  // Timing belt kit job; null for chain engines (no fixed interval -> nothing to prorate).
  timingBelt: UnitService | null;
  gearbox: TcoUnit;
  drivetrain: TcoUnit | null; // null = 2WD, no AWD service line at all
}

export type TcoKey = "fuel" | "engine" | "gearbox" | "drivetrain" | "tires" | "repairs" | "fixed" | "insurance" | "depreciation";

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

const eur = (n: number) => `€${Math.round(n).toLocaleString("en-US").replace(/,/g, " ")}`;
const kmText = (n: number) => `${n.toLocaleString("en-US").replace(/,/g, " ")} km`;
const mid = (a: number | null, b: number | null): number | null =>
  a == null && b == null ? null : (((a ?? b) as number) + ((b ?? a) as number)) / 2;

// A recurring job spread over the year: by km driven, or by its time limit when that comes
// first (a 60k km / 3-year Haldex service at 10 000 km/year is due on time, not on km) -- so the
// larger of the two. null when the price or both intervals are unknown.
export function proratedYearly(s: UnitService, annualKm: number): number | null {
  const cost = mid(s.costEurMin, s.costEurMax);
  if (cost == null || (s.intervalKm == null && s.intervalYears == null)) return null;
  const byKm = s.intervalKm ? (cost / s.intervalKm) * annualKm : 0;
  const byTime = s.intervalYears ? cost / s.intervalYears : 0;
  return Math.max(byKm, byTime);
}

function intervalText(s: UnitService): string {
  const parts = [s.intervalKm != null ? kmText(s.intervalKm) : null, s.intervalYears != null ? `${s.intervalYears} years` : null].filter(Boolean);
  return parts.length ? `every ${parts.join(" / ")}` : "";
}

function unitServiceLine(key: "gearbox" | "drivetrain", label: string, u: TcoUnit, annualKm: number): TcoLine {
  const yearly = proratedYearly(u.service, annualKm);
  const range = u.service.costEurMin != null ? `${eur(u.service.costEurMin)}–${eur(u.service.costEurMax ?? u.service.costEurMin)}` : null;
  return {
    key,
    label,
    yearly,
    detail: yearly != null
      ? `${u.label}: fluid service ${range} ${intervalText(u.service)}`
      : `${u.label}: no service price yet`,
  };
}

// ---- The calculation ----------------------------------------------------------------------
export function calcTco(car: TcoInput, annualKm: number): TcoResult {
  const fuelKey = car.fuelType.toLowerCase() in FUEL_PRICE_EUR ? car.fuelType.toLowerCase() : FALLBACK_FUEL;
  const fuelPrice = FUEL_PRICE_EUR[fuelKey];
  const unit = fuelKey === "electric" ? "kWh" : fuelKey === "cng" ? "kg" : "l";

  const fuel = car.consumptionPer100 != null ? (annualKm / 100) * car.consumptionPer100 * fuelPrice : null;

  const belt = car.timingBelt ? proratedYearly(car.timingBelt, annualKm) ?? 0 : 0;
  const engine = car.engineYearlyServiceEur != null ? car.engineYearlyServiceEur + belt : null;

  const tires = (TIRE_SET_COST_EUR / TIRE_SET_LIFE_KM) * annualKm + TIRE_SWAP_COST_EUR * TIRE_SWAPS_PER_YEAR;

  const scale = Math.min(RESERVE_SCALE_MAX, Math.max(RESERVE_SCALE_MIN, annualKm / DEFAULT_ANNUAL_KM));
  const eTone = reliabilityTone(car.engineReliabilityRating);
  const gTone = reliabilityTone(car.gearbox.reliabilityRating);
  const dTone = car.drivetrain ? reliabilityTone(car.drivetrain.reliabilityRating) : null;
  const repairs =
    (REPAIR_RESERVE_EUR[eTone] + UNIT_RESERVE_UPLIFT_EUR[gTone] + (dTone ? UNIT_RESERVE_UPLIFT_EUR[dTone] : 0)) * scale;
  const toneWord = (t: RelTone) => (t === "unknown" ? "not rated" : t);

  const fixed = VIGNETTE_EUR + INSPECTION_EUR / INSPECTION_EVERY_YEARS;
  const insurance = insuranceEstimate(car.powerKw);
  const depreciation = car.priceEur != null ? car.priceEur * DEPRECIATION_RATE : null;

  const lines: TcoLine[] = [
    {
      key: "fuel",
      label: "Fuel",
      yearly: fuel,
      detail: car.consumptionPer100 != null
        ? `${car.consumptionPer100} ${unit}/100 km real-world × €${fuelPrice.toFixed(2)}/${unit}`
        : "No consumption data",
    },
    {
      key: "engine",
      label: "Engine servicing",
      yearly: engine,
      detail: car.engineYearlyServiceEur == null
        ? "No service cost data"
        : belt > 0
          ? `Oil, filters, plugs ${eur(car.engineYearlyServiceEur)} + timing belt ${eur(belt)} (prorated)`
          : `Oil, filters, plugs ${eur(car.engineYearlyServiceEur)}`,
    },
    unitServiceLine("gearbox", "Gearbox service", car.gearbox, annualKm),
    ...(car.drivetrain ? [unitServiceLine("drivetrain", "AWD service", car.drivetrain, annualKm)] : []),
    {
      key: "tires",
      label: "Tyres & seasonal swaps",
      yearly: tires,
      detail: `${eur(TIRE_SET_COST_EUR)} set per ${kmText(TIRE_SET_LIFE_KM)} + ${TIRE_SWAPS_PER_YEAR}× swap`,
    },
    {
      key: "repairs",
      label: "Unexpected repairs reserve",
      yearly: repairs,
      detail: `Engine ${toneWord(eTone)} · gearbox ${toneWord(gTone)}${dTone ? ` · AWD ${toneWord(dTone)}` : ""}`,
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

// ---- Configurations -> selectable options -------------------------------------------------
// Body type doesn't change running costs, so configurations collapse to one option per real
// (engine, gearbox, drivetrain) combination; `bodies` lists which bodies it covers. Consumption
// is the mean of the official figures across those bodies, then lifted to real-world. Electric
// engines use kWh/100 km; everything else (PHEV included) l/100 km.
export interface TcoOption {
  key: string;
  label: string;
  bodies: string[];
  input: TcoInput;
}

export function tcoOptions(
  configs: CatalogConfig[],
  priceMin: number,
  priceMax: number,
  engineLabel: (c: CatalogConfig) => string,
): TcoOption[] {
  const price = priceMin > 0 || priceMax > 0 ? mid(priceMin || null, priceMax || null) : null;
  const groups = new Map<string, CatalogConfig[]>();
  for (const c of configs) {
    // Same key as tcoOptions.ts's tcoKeyOf() -- keep the two in step.
    const key = `${c.engine.id}|${c.gearbox.id}|${c.drivetrain?.id ?? "2wd"}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.entries()].map(([key, list]) => {
    const c = list[0];
    const e = c.engine;
    const electric = e.fuelType.toLowerCase() === "electric";
    const vals = list
      .map((x) => (electric ? x.energyConsumptionKwh100km : x.fuelConsumptionL100km))
      .filter((v): v is number => v != null);
    const official = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const m = e.maintenance;
    const isBelt = e.timingType === "belt";
    return {
      key,
      label: `${engineLabel(c)} · ${gearboxHeaderLabel(c.gearbox.code, c.gearbox.speeds, c.gearbox.family)} · ${drivetrainLabel(c)}`,
      bodies: [...new Set(list.map((x) => x.bodyName))],
      input: {
        priceEur: price,
        fuelType: e.fuelType,
        consumptionPer100: realWorldConsumption(official),
        powerKw: e.powerKw,
        engineReliabilityRating: e.reliabilityRating,
        engineYearlyServiceEur: mid(m.yearlyMaintenanceEurMin, m.yearlyMaintenanceEurMax),
        timingBelt: isBelt
          ? { intervalKm: e.timingReplacementKm, intervalYears: m.timingReplacementYears, costEurMin: m.timingServiceCostEurMin, costEurMax: m.timingServiceCostEurMax }
          : null,
        gearbox: { label: c.gearbox.code, reliabilityRating: c.gearbox.reliabilityRating, service: c.gearbox.service },
        drivetrain: c.drivetrain
          ? { label: drivetrainLabel(c), reliabilityRating: c.drivetrain.reliabilityRating, service: c.drivetrain.service }
          : null,
      },
    };
  });
}

// Lines that have a figure, biggest first -- what the "where the money goes" bars show.
export function rankedLines(r: TcoResult): (TcoLine & { yearly: number; share: number })[] {
  return r.lines
    .filter((l): l is TcoLine & { yearly: number } => l.yearly != null && l.yearly > 0)
    .map((l) => ({ ...l, share: r.yearlyTotal > 0 ? l.yearly / r.yearlyTotal : 0 }))
    .sort((a, b) => b.yearly - a.yearly);
}

// ---- Cross-model comparison ---------------------------------------------------------------
// Which compared vehicle is cheapest to own. Deliberately strict, same spirit as the engine
// comparison's Smart Choice: no pick unless at least 2 vehicles are compared, EVERY total is
// complete (a vehicle missing its fuel or gearbox price would look cheaper than it is), and the
// winner is at least CHEAPEST_MARGIN_EUR a year below the runner-up -- €5 a month is noise for
// an estimate built on ranges and ballpark constants.
export const CHEAPEST_MARGIN_EUR = 60;
export function pickCheapest(results: (TcoResult | null)[]): number | null {
  if (results.length < 2 || results.some((r) => r == null || r.incomplete)) return null;
  const totals = (results as TcoResult[]).map((r, i) => ({ i, t: r.yearlyTotal })).sort((a, b) => a.t - b.t);
  return totals[1].t - totals[0].t >= CHEAPEST_MARGIN_EUR ? totals[0].i : null;
}
