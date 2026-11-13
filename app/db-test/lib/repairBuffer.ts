// Wear costs and possible faults for the Costs tab (Martin, 2026-11-12, revised 2026-11-14).
// Pure functions only, unit-tested in tests/repairBuffer.test.ts; RepairBuffer.tsx only displays.
//
// Two different things, kept apart on purpose:
//
//   WEAR -- parts that will almost certainly need replacing during ownership. These ARE spread
//   over the year, because the bill is predictable and recurring:
//     by time     replacement cost × (1 / life in years)      12 V battery €250 every 4 years
//     by mileage  (annual km / life km) × cost of a pair      rear tyres €300 per 20 000 km
//   A fault row is wear when its annual_probability is at least WEAR_PROBABILITY_MIN (a part
//   replaced every 5 years or more often); annual_probability = 1 / life in years.
//
//   POSSIBLE FAULTS -- things some cars get and most never do (A/C compressor, motor mount, HV
//   battery module). These are NOT spread over the year. Martin, 2026-11-14: an owner who meets
//   the A/C compressor pays €5 750 at once; "€11.50 a year" (cost × 0.2 %) is the fleet-
//   averaging view and tells one buyer nothing -- it would only look reassuring. So a possible
//   fault is listed with its one-off repair cost, how often it happens (in words) and the check
//   that settles it before buying, and is never part of the yearly total.
//
// A fault with no cost is still listed (cost unknown) -- a known fault is worth a warning even
// before anyone has priced it. Nothing unknown is ever turned into a number.

import type { TyreWear } from "@/app/catalog/lib/types";

// The fault facts this needs (a subset of CatalogFault, so tests don't need whole rows).
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

export interface WearItem {
  kind: "time" | "km";
  title: string;
  fault: string | null; // full fault text (tooltip); null for tyres
  costEur: number; // one replacement / one pair of tyres
  yearly: number;
  basis: string; // "about every 4 years" / "20 000 km per pair"
}

export type FaultLikelihood = "rare" | "occasional" | "common" | "unknown";

export interface PossibleFault {
  title: string;
  fault: string;
  severity: string | null;
  costMin: number | null; // one-off repair, EUR; null = not priced yet
  costMax: number | null;
  likelihood: FaultLikelihood;
  prePurchaseCheck: string | null;
}

export interface RepairBuffer {
  wear: WearItem[]; // biggest yearly first
  wearYearly: number; // everything in `wear` -- the yearly figure shown to the buyer
  partsYearly: number; // wear by time only (what replaces the generic repair reserve)
  tyresYearly: number | null; // wear by km only; null = no car-specific tyre data
  possibleFaults: PossibleFault[]; // most severe, then most expensive first
  notThisYear: { title: string; years: string }[]; // faults outside the chosen build year
  hasFaultData: boolean; // at least one wear-by-time part from the faults table
}

// At or above this a fault row is wear (replaced every 5 years or more often); below it, a
// possible fault.
export const WEAR_PROBABILITY_MIN = 0.2;

// Words for how often a possible fault happens, from its annual probability. A share of cars per
// year, so "rare" is under 1 in 100 cars a year. Only for display -- never multiplied by cost.
export function likelihoodWord(p: number | null): FaultLikelihood {
  if (p == null) return "unknown";
  if (p < 0.01) return "rare";
  if (p < 0.05) return "occasional";
  return "common";
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, moderate: 1, minor: 2 };

const mid = (a: number | null, b: number | null): number | null =>
  a == null && b == null ? null : (((a ?? b) as number) + ((b ?? a) as number)) / 2;

// Fault texts are written as "<what> -- <symptom>" or as one long sentence; a row needs a short
// name. Text before " -- ", minus any parenthesis, cut to the first sentence and ~70 characters.
export function faultTitle(fault: string): string {
  let t = fault.split(" -- ")[0].split(" — ")[0];
  t = t.replace(/\s*\([^)]*\)/g, "");
  t = t.split(/(?<=[a-z0-9])\.\s/)[0].replace(/\.$/, "").trim();
  if (t.length > 70) t = `${t.slice(0, 67).replace(/\s+\S*$/, "")}…`;
  return t;
}

const kmText = (n: number) => `${n.toLocaleString("en-US").replace(/,/g, " ")} km`;
const yearsText = (from: number | null, to: number | null) =>
  from != null && to != null ? `${from}–${to}` : from != null ? `from ${from}` : `up to ${to}`;

function appliesTo(f: BufferFault, year: number | null): boolean {
  if (year == null) return true; // unknown year: keep it -- a missing warning is the worse error
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
  const wear: WearItem[] = [];
  const possibleFaults: PossibleFault[] = [];
  const notThisYear: { title: string; years: string }[] = [];

  for (const f of faults) {
    const title = faultTitle(f.fault);
    if (!appliesTo(f, vehicleYear)) {
      notThisYear.push({ title, years: yearsText(f.affectedYearFrom, f.affectedYearTo) });
      continue;
    }
    const p = f.annualProbability;
    const cost = mid(f.estimatedCostEurMin, f.estimatedCostEurMax);
    if (p != null && p >= WEAR_PROBABILITY_MIN && cost != null) {
      wear.push({ kind: "time", title, fault: f.fault, costEur: cost, yearly: cost * p, basis: `about every ${Math.round(1 / p)} years` });
      continue;
    }
    possibleFaults.push({
      title,
      fault: f.fault,
      severity: f.severity,
      costMin: f.estimatedCostEurMin ?? f.estimatedCostEurMax,
      costMax: f.estimatedCostEurMax ?? f.estimatedCostEurMin,
      likelihood: likelihoodWord(p),
      prePurchaseCheck: f.prePurchaseCheck,
    });
  }

  let tyresYearly: number | null = null;
  if (tyreWear) {
    const front = (annualKm / tyreWear.frontLifeKm) * tyreWear.frontCostEur;
    const rear = (annualKm / tyreWear.rearLifeKm) * tyreWear.rearCostEur;
    tyresYearly = front + rear;
    wear.push(
      { kind: "km", title: "Rear tyres", fault: null, costEur: tyreWear.rearCostEur, yearly: rear, basis: `${kmText(tyreWear.rearLifeKm)} per pair` },
      { kind: "km", title: "Front tyres", fault: null, costEur: tyreWear.frontCostEur, yearly: front, basis: `${kmText(tyreWear.frontLifeKm)} per pair` },
    );
  }

  wear.sort((a, b) => b.yearly - a.yearly);
  possibleFaults.sort((a, b) =>
    (SEVERITY_ORDER[a.severity ?? ""] ?? 3) - (SEVERITY_ORDER[b.severity ?? ""] ?? 3)
    || (b.costMax ?? -1) - (a.costMax ?? -1));
  const partsYearly = wear.filter((w) => w.kind === "time").reduce((s, w) => s + w.yearly, 0);
  return {
    wear,
    wearYearly: partsYearly + (tyresYearly ?? 0),
    partsYearly,
    tyresYearly,
    possibleFaults,
    notThisYear,
    hasFaultData: wear.some((w) => w.kind === "time"),
  };
}
