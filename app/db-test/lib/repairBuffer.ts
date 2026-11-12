// Maintenance & repair buffer -- the "how much should I keep aside each year" figure behind the
// Costs tab's repairs and tyre lines (Martin, 2026-11-12). Pure functions only, unit-tested in
// tests/repairBuffer.test.ts; TcoCalculator / RepairBuffer.tsx only display the result.
//
// The model is the expected-cost approach fleet operators use, applied per car from catalog data
// rather than hard-coded per model, so a new car needs data, not code:
//
//   1. Wear by time      a part replaced every N years           cost × (1 / N)
//   2. Wear by mileage   tyres, per axle                         (annual km / life km) × cost
//   3. Risk              a fault that hits some cars, some years cost × annual probability
//
// 1 and 3 are the SAME formula -- a fault's annual_probability is 1/N for a wear item (12 V battery
// every 4 years = 0.25) and a small share for a random failure (A/C compressor 0.002) -- so both
// live in catalog_component_faults and are only split here, for display, by how high the
// probability is. 2 comes from catalog_phases.tyre_*.
//
// What is deliberately NOT done:
//   - A fault with no cost or no annual_probability is never guessed into the total. It is
//     returned in `unpriced` and the UI says the buffer leaves it out -- a buffer that silently
//     treats an unknown KLE charger failure as €0 would look more precise than it is.
//   - Expected cost is the long-run average across many owners, not a forecast for one car: a
//     single owner either meets the €5 750 compressor bill or doesn't. The UI copy says so.

import type { TyreWear } from "@/app/catalog/lib/types";

// The fault facts the buffer needs (a subset of CatalogFault, so tests don't need whole rows).
export interface BufferFault {
  fault: string;
  severity: string | null;
  estimatedCostEurMin: number | null;
  estimatedCostEurMax: number | null;
  annualProbability: number | null;
  affectedYearFrom: number | null;
  affectedYearTo: number | null;
  prePurchaseCheck: string | null;
}

export type BufferItemKind = "wear-time" | "wear-km" | "risk";

export interface BufferItem {
  kind: BufferItemKind;
  title: string; // short name for the row
  fault: string | null; // full fault text (tooltip / accordion); null for tyres
  costEur: number; // one occurrence: repair, part or tyre pair
  yearly: number; // expected cost per year
  basis: string; // "replaced about every 4 years" / "40 000 km per pair" / "0.2 % a year"
  severity: string | null;
  prePurchaseCheck: string | null;
}

export interface UnpricedFault {
  title: string;
  fault: string;
  severity: string | null;
  missing: "cost" | "probability" | "both";
}

export interface RepairBuffer {
  items: BufferItem[]; // biggest yearly first
  yearlyTotal: number;
  faultsYearly: number; // wear-time + risk only (what replaces the generic repair reserve)
  tyresYearly: number | null; // wear-km only; null = no car-specific tyre data
  unpriced: UnpricedFault[];
  notThisYear: { title: string; years: string }[]; // priced faults outside the chosen build year
  hasFaultData: boolean; // at least one priced fault applies
}

// A probability at or above this is a scheduled replacement (every 5 years or more often), shown
// as wear by time; below it, a risk. Only a display split -- the formula is the same.
export const WEAR_PROBABILITY_MIN = 0.2;

const mid = (a: number | null, b: number | null): number | null =>
  a == null && b == null ? null : (((a ?? b) as number) + ((b ?? a) as number)) / 2;

// Fault texts are written as "<what> -- <symptom>" or as one long sentence; the buffer row needs
// a short name. Text before " -- ", minus any parenthesis, cut to the first sentence and ~70
// characters. The full text stays available as `fault`.
export function faultTitle(fault: string): string {
  let t = fault.split(" -- ")[0].split(" — ")[0];
  t = t.replace(/\s*\([^)]*\)/g, "");
  t = t.split(/(?<=[a-z0-9])\.\s/)[0].replace(/\.$/, "").trim();
  if (t.length > 70) t = `${t.slice(0, 67).replace(/\s+\S*$/, "")}…`;
  return t;
}

const pctText = (p: number) => {
  const v = p * 100;
  return `${v < 1 ? v.toFixed(1) : Math.round(v)} % a year`;
};
const kmText = (n: number) => `${n.toLocaleString("en-US").replace(/,/g, " ")} km`;
const yearsText = (from: number | null, to: number | null) =>
  from != null && to != null ? `${from}–${to}` : from != null ? `from ${from}` : `up to ${to}`;

function appliesTo(f: BufferFault, year: number | null): boolean {
  if (year == null) return true; // unknown year: keep it -- leaving a risk out is the cheaper error to hide
  if (f.affectedYearFrom != null && year < f.affectedYearFrom) return false;
  if (f.affectedYearTo != null && year > f.affectedYearTo) return false;
  return true;
}

export function calculateRepairBuffer(
  faults: BufferFault[],
  tyreWear: TyreWear | null,
  annualKm: number,
  vehicleYear: number | null,
): RepairBuffer {
  const items: BufferItem[] = [];
  const unpriced: UnpricedFault[] = [];
  const notThisYear: { title: string; years: string }[] = [];

  for (const f of faults) {
    const title = faultTitle(f.fault);
    const cost = mid(f.estimatedCostEurMin, f.estimatedCostEurMax);
    const p = f.annualProbability;
    if (cost == null || p == null) {
      unpriced.push({ title, fault: f.fault, severity: f.severity, missing: cost == null && p == null ? "both" : cost == null ? "cost" : "probability" });
      continue;
    }
    if (!appliesTo(f, vehicleYear)) {
      notThisYear.push({ title, years: yearsText(f.affectedYearFrom, f.affectedYearTo) });
      continue;
    }
    const wear = p >= WEAR_PROBABILITY_MIN;
    items.push({
      kind: wear ? "wear-time" : "risk",
      title,
      fault: f.fault,
      costEur: cost,
      yearly: cost * p,
      basis: wear ? `replaced about every ${Math.round(1 / p)} years` : pctText(p),
      severity: f.severity,
      prePurchaseCheck: f.prePurchaseCheck,
    });
  }

  let tyresYearly: number | null = null;
  if (tyreWear) {
    const front = (annualKm / tyreWear.frontLifeKm) * tyreWear.frontCostEur;
    const rear = (annualKm / tyreWear.rearLifeKm) * tyreWear.rearCostEur;
    tyresYearly = front + rear;
    items.push(
      { kind: "wear-km", title: "Rear tyres", fault: null, costEur: tyreWear.rearCostEur, yearly: rear, basis: `${kmText(tyreWear.rearLifeKm)} per pair`, severity: null, prePurchaseCheck: null },
      { kind: "wear-km", title: "Front tyres", fault: null, costEur: tyreWear.frontCostEur, yearly: front, basis: `${kmText(tyreWear.frontLifeKm)} per pair`, severity: null, prePurchaseCheck: null },
    );
  }

  items.sort((a, b) => b.yearly - a.yearly);
  const faultsYearly = items.filter((i) => i.kind !== "wear-km").reduce((s, i) => s + i.yearly, 0);
  return {
    items,
    yearlyTotal: faultsYearly + (tyresYearly ?? 0),
    faultsYearly,
    tyresYearly,
    unpriced,
    notThisYear,
    hasFaultData: items.some((i) => i.kind !== "wear-km"),
  };
}
