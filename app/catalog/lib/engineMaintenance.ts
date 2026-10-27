// Display helpers for an engine's maintenance window (catalog_engines maintenance columns,
// 20261027140000) -- shared by /db-test's engine card + comparison and anything on /catalog
// that wants the same rows, so intervals and prices read identically everywhere.
import type { EngineMaintenance } from "./types";

export const EMPTY_ENGINE_MAINTENANCE: EngineMaintenance = {
  oilChangeIntervalKm: null,
  oilChangeIntervalMonths: null,
  oilSpec: null,
  oilServiceCostEurMin: null,
  oilServiceCostEurMax: null,
  airFilterIntervalKm: null,
  fuelFilterIntervalKm: null,
  sparkPlugIntervalKm: null,
  sparkPlugCostEurMin: null,
  sparkPlugCostEurMax: null,
  timingReplacementYears: null,
  timingServiceCostEurMin: null,
  timingServiceCostEurMax: null,
  yearlyMaintenanceEurMin: null,
  yearlyMaintenanceEurMax: null,
  note: null,
};

// "15 000 km" -- thin-space-free, plain space thousands separator (SK/CZ convention, and it
// matches how intervals were written in the fill list).
export function km(n: number): string {
  return `${n.toLocaleString("en-US").replace(/,/g, " ")} km`;
}

export function eurRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? `€${min}` : `€${min}–${max}`;
  return `€${(min ?? max) as number}`;
}

// One "every X km / Y months" phrase from whichever halves are known; null if neither.
function everyPhrase(kmVal: number | null, period: string | null): string | null {
  const parts = [kmVal != null ? km(kmVal) : null, period].filter(Boolean);
  return parts.length ? `every ${parts.join(" / ")}` : null;
}

export interface MaintenanceRow {
  label: string;
  // Interval text ("every 15 000 km / 12 months"); null when only a price is known.
  interval: string | null;
  // Extra detail after the interval (oil spec); null if none.
  detail: string | null;
  price: string | null;
}

// The rows of the maintenance block, in workshop order: oil service, air filter, fuel filter,
// spark plugs, timing. A row with nothing at all known is left out entirely (no empty rows);
// spark plugs on a diesel and a fuel filter on a modern petrol are NULL by design, so they
// simply don't appear. Chain engines have no timing interval -- the row says so explicitly
// ("no fixed interval") so a missing number isn't mistaken for missing data.
export function maintenanceRows(m: EngineMaintenance, timingType: string | null, timingReplacementKm: number | null): MaintenanceRow[] {
  const rows: MaintenanceRow[] = [];
  const oilEvery = everyPhrase(m.oilChangeIntervalKm, m.oilChangeIntervalMonths != null ? `${m.oilChangeIntervalMonths} months` : null);
  const oilPrice = eurRange(m.oilServiceCostEurMin, m.oilServiceCostEurMax);
  if (oilEvery || oilPrice || m.oilSpec) rows.push({ label: "Oil + filter", interval: oilEvery, detail: m.oilSpec, price: oilPrice });
  if (m.airFilterIntervalKm != null) rows.push({ label: "Air filter", interval: everyPhrase(m.airFilterIntervalKm, null), detail: null, price: null });
  if (m.fuelFilterIntervalKm != null) rows.push({ label: "Fuel filter", interval: everyPhrase(m.fuelFilterIntervalKm, null), detail: null, price: null });
  const plugPrice = eurRange(m.sparkPlugCostEurMin, m.sparkPlugCostEurMax);
  if (m.sparkPlugIntervalKm != null || plugPrice) rows.push({ label: "Spark plugs", interval: everyPhrase(m.sparkPlugIntervalKm, null), detail: null, price: plugPrice });

  const timingPrice = eurRange(m.timingServiceCostEurMin, m.timingServiceCostEurMax);
  const isChain = timingType === "chain";
  const timingEvery = everyPhrase(timingReplacementKm, m.timingReplacementYears != null ? `${m.timingReplacementYears} years` : null);
  if (timingEvery || timingPrice) {
    rows.push({
      label: isChain ? "Timing chain" : timingType === "belt" ? "Timing belt kit" : "Timing",
      interval: timingEvery ?? (isChain ? "no fixed interval" : null),
      detail: isChain && timingPrice ? "typical job if worn" : null,
      price: timingPrice,
    });
  }
  return rows;
}

export function yearlyMaintenanceLabel(m: EngineMaintenance): string | null {
  const r = eurRange(m.yearlyMaintenanceEurMin, m.yearlyMaintenanceEurMax);
  return r ? `${r} / year` : null;
}

export function hasMaintenanceData(m: EngineMaintenance): boolean {
  return Object.values(m).some((v) => v != null);
}
