// "Search real vehicles": keep only portal ads that are (or may be) the target engine.
// Candidates mirror the live Octavia 5E facelift set, where 81 kW is both a petrol (CYVB)
// and a diesel (CRKB) -- the classic trap.
import { describe, it, expect } from "vitest";
import { classifyListings, listingToAd, candidateFromRow } from "@/app/lib/listings/searchListings";
import type { EngineCandidate } from "@/app/lib/listings/matchAdToEngine";
import type { PortalListing } from "@/app/lib/listings/portals/types";

const c = (engineId: string, engineName: string, powerKw: number, fuel: "petrol" | "diesel"): EngineCandidate =>
  ({ engineId, label: engineId, engineName, powerKw, fuel, transmissions: ["manual", "automatic"], yearFrom: 2017, yearTo: 2020, phaseIds: ["fl"] });
const FL = [c("CYVB", "1.2 TSI", 81, "petrol"), c("CRKB", "1.6 TDI", 81, "diesel"), c("CRBC", "2.0 TDI", 110, "diesel"), c("CUNA", "2.0 TDI", 135, "diesel")];

const l = (url: string, o: Partial<PortalListing>): PortalListing => ({
  portal: "test", url, title: "Škoda Octavia", price: null, currency: "EUR", year: null, mileageKm: null,
  powerKw: null, fuel: null, transmission: null, location: null, photoUrl: null, ...o,
});

describe("classifyListings", () => {
  const ads = [
    l("a", { title: "Škoda Octavia Combi 2.0 TDI 110kW DSG", year: 2018, fuel: "diesel", price: 15900 }),
    l("b", { title: "Škoda Octavia 1.6 TDI", year: 2018, powerKw: 81, fuel: "diesel", price: 11900 }),
    l("c", { title: "Škoda Octavia 1.2 TSI 81kW", year: 2018, fuel: "petrol" }), // petrol 81 kW: not CRKB
    l("d", { title: "Škoda Octavia Style", year: 2019, fuel: "diesel", price: 13500 }), // no power: possible
    l("a", { title: "duplicate of a", year: 2018, fuel: "diesel" }),
  ];
  it("keeps the exact engine, marks unclear ads as possible, drops other engines and duplicates", () => {
    const r = classifyListings(ads, "CRKB", FL, "Škoda", "Octavia");
    expect(r.map((x) => [x.url, x.fit])).toEqual([["b", "exact"], ["d", "possible"]]);
  });
  it("reads power from the title when the portal has no field", () => {
    const r = classifyListings(ads, "CRBC", FL, "Škoda", "Octavia");
    expect(r[0]).toMatchObject({ url: "a", fit: "exact", confidence: 1 });
  });
  it("orders exact before possible, cheaper first within a group", () => {
    const more = [l("x", { title: "Octavia 2.0 TDI 110 kW", year: 2018, fuel: "diesel", price: 20000 }), ...ads];
    expect(classifyListings(more, "CRBC", FL, "Škoda", "Octavia").map((x) => x.url)).toEqual(["a", "x", "d"]);
  });
});

describe("listingToAd", () => {
  it("prefers the portal's power field, falls back to PS in the title", () => {
    expect(listingToAd(l("p", { title: "Octavia 150 PS", powerKw: null }), "Škoda", "Octavia").power_kw).toBe(110);
    expect(listingToAd(l("p", { title: "Octavia 150 PS", powerKw: 103 }), "Škoda", "Octavia").power_kw).toBe(103);
  });
});

describe("candidateFromRow", () => {
  it("maps a raw configuration row; skips rows without engine or gearbox", () => {
    const row = { phase_id: "p1", catalog_engines: { id: "e1", code: "CRBC", display_name: "2.0 TDI", power_kw: "110", fuel_type: "diesel", hybrid_type: null }, transmission_units: { family: "dct_wet" } };
    expect(candidateFromRow(row, 2017, 2020)).toMatchObject({ engineId: "e1", powerKw: 110, fuel: "diesel", transmissions: ["automatic"], label: "2.0 TDI · CRBC · 110 kW" });
    expect(candidateFromRow({ ...row, transmission_units: null }, 2017, 2020)).toBeNull();
  });
});
