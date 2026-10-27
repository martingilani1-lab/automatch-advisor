// Step 2 of matching a classified ad to our catalog: given the ad's extracted facts
// (adExtraction.ts) and the engine configurations of the model it was resolved to, decide
// WHICH ENGINE the ad is -- or refuse to decide.
//
// The failure that matters is a confident wrong answer (showing a robust engine's
// reliability on a car that actually has the troublesome one). So:
//   * power_kw is the HARD ANCHOR. If the ad states a power figure, only engines within
//     ±POWER_TOLERANCE_KW of it qualify -- never "the nearest one".
//   * fuel / transmission / year only NARROW the field when the ad states them; a missing
//     value never excludes anything.
//   * Ambiguity is a result, not an error: more than one distinct engine left -> no match,
//     with the remaining candidates returned so a human (or the UI) can pick.
//
// Pure function, no I/O -- the caller loads the model's configurations (e.g. from
// catalog_vehicle_configurations) and passes them in; candidatesFromConfigs() below builds
// the input from our CatalogConfig shape.

import type { CatalogConfig } from "@/app/catalog/lib/types";
import type { AdFuel, AdTransmission, ExtractedAd } from "./adExtraction";
import { engineNamesConflict, parseEngineName } from "./engineName";

export const POWER_TOLERANCE_KW = 2;

// One engine as offered in one phase of the model, with the gearbox types it came with.
// Several configurations of the same engine (different bodies/gearboxes) collapse into one
// candidate -- the question is "which engine", so a single engine offered with both a manual
// and a DSG is still ONE answer, not an ambiguity.
export interface EngineCandidate {
  engineId: string;
  label: string; // for logs / review UI, e.g. "2.0 TDI (CRBC) 110 kW"
  // catalog_engines.display_name ("2.0 TDI 110kW") -- compared with an engine name read from
  // the ad ("2.0 TDI"); null/unparseable never excludes a candidate.
  engineName?: string | null;
  // The catalog phases this engine was offered in (merged across phases) -- lets a UI link the
  // match to the right car page.
  phaseIds?: string[];
  powerKw: number;
  fuel: AdFuel; // our fuel_type/hybrid_type mapped onto the ad vocabulary
  transmissions: AdTransmission[];
  yearFrom: number | null;
  yearTo: number | null; // null = still in production
}

export type MatchReason =
  | "exact" // kW + year + fuel all confirmed
  | "power_unique" // kW confirmed, one engine left, but year and/or fuel not stated
  | "only_option" // no kW in the ad, but only one engine fits fuel/year/gearbox
  | "ambiguous_power" // several engines share that kW in the stated year/fuel
  | "ambiguous_no_power" // no kW and several engines fit
  | "no_power_match" // ad's kW matches no engine of this model (wrong model? typo?)
  | "no_candidates" // nothing survives fuel/year/gearbox filtering
  | "model_not_found"; // the ad's model isn't in our catalog (set by /api/match-ad, never here)

export interface EngineMatch {
  matchedEngineId: string | null;
  confidenceScore: number; // 0.0 - 1.0
  reason: MatchReason;
  // Engines still in the running -- the review list for anything that isn't a match.
  candidates: EngineCandidate[];
}

// Confidence tiers. 1.0 / 0.5 / 0.0 are the spec'd ones; POWER_UNIQUE covers the case the
// spec doesn't name (kW confirmed but year or fuel missing): the hard anchor held, so it's
// stronger than "only option without kW", but not fully confirmed.
export const CONFIDENCE = {
  EXACT: 1.0,
  POWER_UNIQUE: 0.8,
  ONLY_OPTION: 0.5,
  NONE: 0.0,
} as const;

// ---- Filters ------------------------------------------------------------------------------

function fuelMatches(adFuel: AdFuel | null, c: EngineCandidate): boolean {
  return adFuel == null || adFuel === c.fuel;
}

// Ad engine name ("2.0 TDI") vs the candidate's display name: excluded only on a clear
// conflict (different size, or diesel vs petrol). Unreadable on either side -> kept.
function engineNameMatches(adEngine: string | null | undefined, c: EngineCandidate): boolean {
  const a = parseEngineName(adEngine);
  const b = parseEngineName(c.engineName);
  return !a || !b || !engineNamesConflict(a, b);
}

function transmissionMatches(adTx: AdTransmission | null, c: EngineCandidate): boolean {
  return adTx == null || c.transmissions.includes(adTx);
}

// The ad's year must fall inside the engine's production years. Ads usually give the year of
// FIRST REGISTRATION, which can trail the build date -- a car built in Dec 2012 can be
// registered in 2013 -- so the end of the range gets YEAR_REGISTRATION_GRACE extra years.
// The start does not (a car can't be registered before it was built).
export const YEAR_REGISTRATION_GRACE = 1;
function yearMatches(adYear: number | null, c: EngineCandidate): boolean {
  if (adYear == null) return true;
  if (c.yearFrom != null && adYear < c.yearFrom) return false;
  if (c.yearTo != null && adYear > c.yearTo + YEAR_REGISTRATION_GRACE) return false;
  return true;
}

// Same engine can appear in several phases (pre-facelift + facelift) with different year
// ranges -> merge into one candidate per engineId with the widest range and all gearboxes.
function dedupeByEngine(list: EngineCandidate[]): EngineCandidate[] {
  const byId = new Map<string, EngineCandidate>();
  for (const c of list) {
    const prev = byId.get(c.engineId);
    if (!prev) {
      byId.set(c.engineId, { ...c, transmissions: [...c.transmissions], phaseIds: [...(c.phaseIds ?? [])] });
      continue;
    }
    prev.transmissions = [...new Set([...prev.transmissions, ...c.transmissions])];
    prev.phaseIds = [...new Set([...(prev.phaseIds ?? []), ...(c.phaseIds ?? [])])];
    prev.yearFrom = prev.yearFrom == null || c.yearFrom == null ? null : Math.min(prev.yearFrom, c.yearFrom);
    prev.yearTo = prev.yearTo == null || c.yearTo == null ? null : Math.max(prev.yearTo, c.yearTo);
  }
  return [...byId.values()];
}

// ---- The matcher --------------------------------------------------------------------------

// `engine_name` is optional: the rule-based reader (adReader.ts) fills it; the LLM schema
// keeps the six spec'd fields only.
export function matchAdToEngine(ad: ExtractedAd & { engine_name?: string | null }, databaseEngines: EngineCandidate[]): EngineMatch {
  // 1. Narrow by what the ad states (fuel, gearbox, year, engine name). Filtering happens per phase/config
  //    row BEFORE merging, so a gearbox or year that only one phase had is respected.
  const narrowed = dedupeByEngine(
    databaseEngines.filter(
      (c) =>
        fuelMatches(ad.fuel, c) &&
        transmissionMatches(ad.transmission, c) &&
        yearMatches(ad.year, c) &&
        engineNameMatches(ad.engine_name, c)
    )
  );
  if (narrowed.length === 0) {
    return { matchedEngineId: null, confidenceScore: CONFIDENCE.NONE, reason: "no_candidates", candidates: [] };
  }

  // 2a. No power in the ad: only safe when exactly one engine is left.
  if (ad.power_kw == null) {
    return narrowed.length === 1
      ? { matchedEngineId: narrowed[0].engineId, confidenceScore: CONFIDENCE.ONLY_OPTION, reason: "only_option", candidates: narrowed }
      : { matchedEngineId: null, confidenceScore: CONFIDENCE.NONE, reason: "ambiguous_no_power", candidates: narrowed };
  }

  // 2b. Hard anchor: power within ±POWER_TOLERANCE_KW. No nearest-neighbour fallback.
  const kw = ad.power_kw;
  const byPower = narrowed.filter((c) => Math.abs(c.powerKw - kw) <= POWER_TOLERANCE_KW);
  if (byPower.length === 0) {
    return { matchedEngineId: null, confidenceScore: CONFIDENCE.NONE, reason: "no_power_match", candidates: narrowed };
  }
  if (byPower.length > 1) {
    // Real example: in the Octavia 5E, 110 kW is both the 2.0 TDI (CRBC) and the 1.4 TSI
    // (CZDA) -- an ad with "110 kW" but no fuel must not be guessed.
    return { matchedEngineId: null, confidenceScore: CONFIDENCE.NONE, reason: "ambiguous_power", candidates: byPower };
  }

  const fullyConfirmed = ad.year != null && ad.fuel != null;
  return {
    matchedEngineId: byPower[0].engineId,
    confidenceScore: fullyConfirmed ? CONFIDENCE.EXACT : CONFIDENCE.POWER_UNIQUE,
    reason: fullyConfirmed ? "exact" : "power_unique",
    candidates: byPower,
  };
}

// ---- Building candidates from our catalog -------------------------------------------------

// catalog_engines.fuel_type + hybrid_type -> ad vocabulary. MHEV (e.g. 1.5 eTSI) stays
// "petrol": sellers list it as benzín, not hybrid. PHEV / full hybrid -> "hybrid". Factory
// LPG/CNG engines (G-TEC) are petrol-based and advertised that way.
export function adFuelOf(fuelType: string, hybridType: string | null): AdFuel {
  const f = fuelType.toLowerCase();
  if (f === "electric") return "ev";
  if (hybridType && hybridType.toUpperCase() !== "MHEV") return "hybrid";
  if (f === "diesel") return "diesel";
  return "petrol";
}

// transmission_units.family -> ad vocabulary. Everything without a clutch pedal is
// "automatic" to a seller (DSG, torque converter, CVT, single-speed EV reduction gear...).
export function adTransmissionOf(family: string): AdTransmission {
  return family === "manual" ? "manual" : "automatic";
}

// One phase's configurations -> candidates (one per engine, gearbox types merged). Call once
// per phase with that phase's years and concatenate for the whole model.
export function candidatesFromConfigs(
  configs: CatalogConfig[],
  yearFrom: number | null,
  yearTo: number | null,
  phaseId: string | null = null,
  labelOf: (c: CatalogConfig) => string = (c) => `${c.engine.displayName ?? c.engine.code} (${c.engine.code}) ${c.engine.powerKw} kW`,
): EngineCandidate[] {
  return dedupeByEngine(
    configs.map((c) => ({
      engineId: c.engine.id,
      label: labelOf(c),
      engineName: c.engine.displayName,
      phaseIds: phaseId ? [phaseId] : [],
      powerKw: c.engine.powerKw,
      fuel: adFuelOf(c.engine.fuelType, c.engine.hybridType),
      transmissions: [adTransmissionOf(c.gearbox.family)],
      yearFrom,
      yearTo,
    }))
  );
}
