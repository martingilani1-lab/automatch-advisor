// Shared part of the "Search real vehicles" feature: given listings read from the portals
// and the engines of one catalog phase, keep only the ads that are (or may be) the engine
// the user is looking at. Reuses the exact same matcher as the ad matcher
// (matchAdToEngine.ts), so an ad only counts as "this engine" under the same strict rules.

import type { ExtractedAd } from "./adExtraction";
import { parseEngineName } from "./engineName";
import type { EngineCandidate, EngineMatch } from "./matchAdToEngine";
import { adFuelOf, adTransmissionOf, matchAdToEngine } from "./matchAdToEngine";
import type { PortalListing } from "./portals/types";

export type ListingFit = "exact" | "possible";

export interface ClassifiedListing extends PortalListing {
  fit: ListingFit; // exact = matched to the target engine; possible = target is one of the candidates
  confidence: number;
}

// Power from the listing title when the portal has no separate field ("2.0 TDI 110kW", "150 PS").
function powerFromTitle(title: string): number | null {
  const kw = title.match(/(\d{2,3})\s?kw\b/i);
  if (kw) return Number(kw[1]);
  const ps = title.match(/(\d{2,3})\s?(?:ps|k|koní|koni|hp)\b/i);
  return ps ? Math.round(Number(ps[1]) * 0.7355) : null;
}

export function listingToAd(l: PortalListing, brand: string, model: string): ExtractedAd & { engine_name: string | null } {
  const name = parseEngineName(l.title);
  return {
    brand,
    model,
    year: l.year,
    power_kw: l.powerKw ?? powerFromTitle(l.title),
    fuel: l.fuel,
    transmission: l.transmission,
    engine_name: name ? `${name.size} ${name.tech}` : null,
  };
}

// exact first (by confidence), then possible; within each, cheapest first. Duplicates (the
// same ad URL reached twice) are dropped.
export function classifyListings(
  listings: PortalListing[],
  targetEngineId: string,
  candidates: EngineCandidate[],
  brand: string,
  model: string,
): ClassifiedListing[] {
  const seen = new Set<string>();
  const out: ClassifiedListing[] = [];
  for (const l of listings) {
    if (seen.has(l.url)) continue;
    seen.add(l.url);
    const m: EngineMatch = matchAdToEngine(listingToAd(l, brand, model), candidates);
    if (m.matchedEngineId === targetEngineId) out.push({ ...l, fit: "exact", confidence: m.confidenceScore });
    else if (!m.matchedEngineId && m.candidates.some((c) => c.engineId === targetEngineId)) out.push({ ...l, fit: "possible", confidence: 0 });
  }
  return out.sort(
    (a, b) => (a.fit === b.fit ? 0 : a.fit === "exact" ? -1 : 1) || b.confidence - a.confidence || (a.price ?? Infinity) - (b.price ?? Infinity)
  );
}

// A raw catalog_vehicle_configurations row as /api/match-ad and /api/listings select it
// (engine + gearbox family embedded) -> matcher candidate.
export interface RawConfigRow {
  phase_id: string;
  catalog_engines: { id: string; code: string; display_name: string | null; power_kw: number | string; fuel_type: string; hybrid_type: string | null } | null;
  transmission_units: { family: string } | null;
}

export function candidateFromRow(r: RawConfigRow, yearFrom: number | null, yearTo: number | null): EngineCandidate | null {
  const e = r.catalog_engines;
  if (!e || !r.transmission_units) return null;
  const name = e.display_name ?? e.code;
  return {
    engineId: e.id,
    label: `${name} · ${e.code}${/kw/i.test(name) ? "" : ` · ${e.power_kw} kW`}`,
    engineName: e.display_name,
    phaseIds: [r.phase_id],
    powerKw: Number(e.power_kw),
    fuel: adFuelOf(e.fuel_type, e.hybrid_type),
    transmissions: [adTransmissionOf(r.transmission_units.family)],
    yearFrom,
    yearTo,
  };
}
