// Autobazar.eu reader (app/lib/listings/portals/autobazarEu.ts). The fixture holds the first
// 5 listings of the live Octavia Combi results page (values + URLs real, read 2026-10-27; the
// surrounding markup approximated -- see the fixture's generator note in the commit).
import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import { autobazarEuSearchUrls, engineFromSlug, parseAutobazarEu, slug } from "@/app/lib/listings/portals/autobazarEu";
import { classifyListings } from "@/app/lib/listings/searchListings";
import type { EngineCandidate } from "@/app/lib/listings/matchAdToEngine";

const html = readFileSync("tests/fixtures/autobazar-eu-octavia-combi.html", "utf8");

describe("autobazarEu search URLs", () => {
  it("uses the power filter and covers the Combi model page for Škoda estates", () => {
    expect(autobazarEuSearchUrls({ brand: "Škoda", model: "Octavia", yearFrom: 2013, yearTo: 2017, fuel: "diesel", powerKw: 110, bodyNames: ["Liftback", "Combi"] })).toEqual([
      "https://www.autobazar.eu/vysledky-parametre/osobne-vozidla/skoda/octavia/110-kw/",
      "https://www.autobazar.eu/vysledky-parametre/osobne-vozidla/skoda/octavia-combi/110-kw/",
    ]);
  });
  it("slugs names like the site", () => {
    expect([slug("Škoda"), slug("León"), slug("T-Roc"), slug("New Beetle")]).toEqual(["skoda", "leon", "t-roc", "new-beetle"]);
  });
});

describe("parseAutobazarEu", () => {
  const ads = parseAutobazarEu(html, 2026);
  it("reads every card once, in page order", () => {
    expect(ads).toHaveLength(5);
    expect(ads[4].url).toBe("https://www.autobazar.eu/detail/skoda-octavia-combi-20-tdi-style-dsg/AmemzZDKskE/");
  });
  it("reads the card facts", () => {
    expect(ads[0]).toMatchObject({
      price: 8800, currency: "EUR", year: 2016, mileageKm: 224496, powerKw: 110,
      fuel: "diesel", transmission: "manual", location: "ZA kraj",
    });
    expect(ads[0].photoUrl).toBe("https://img.autobazar.eu/foto/NjQweDQ4MC9maWx0ZXJzOnF1YWxpdHkoODApOmZvcm1hdCh3ZWJwKS9hc2s=/YMi7oGHPb_fss?st=x&ts=1792559778&e=0");
    expect(ads[1]).toMatchObject({ price: 11000, fuel: "petrol", year: 2017 });
    expect(ads[3]).toMatchObject({ transmission: "automatic", powerKw: 81, year: 2021 });
  });
  it("adds the engine from the ad's address when the title is shortened", () => {
    expect(ads[0].title).toBe("Škoda Octavia Combi - 2016, 6-st. manuálna · 2.0 TDI");
    expect(ads[4].title).toBe("Škoda Octavia Combi 2.0 TDI Style DSG"); // already has it
    expect(engineFromSlug("skoda-octavia-combi-200-tdi-dsg")).toBe("2.0 TDI");
    expect(engineFromSlug("skoda-octavia-combi-16-servkniha")).toBeNull(); // no tech -> no guess
  });
  it("never throws on junk", () => {
    expect(parseAutobazarEu("<html>nothing here</html>")).toEqual([]);
  });
  it("feeds the matcher: Octavia 5E 2.0 TDI 110 kW (CRBC) keeps only the two diesel 110 kW ads", () => {
    const c = (engineId: string, engineName: string, powerKw: number, fuel: "petrol" | "diesel"): EngineCandidate =>
      ({ engineId, label: engineId, engineName, powerKw, fuel, transmissions: ["manual", "automatic"], yearFrom: 2013, yearTo: 2020, phaseIds: ["5e"] });
    const OCT_5E = [c("CRBC", "2.0 TDI", 110, "diesel"), c("CZDA", "1.4 TSI", 110, "petrol"), c("CJZA", "1.2 TSI", 77, "petrol"), c("CUNA", "2.0 TDI", 135, "diesel")];
    const r = classifyListings(ads, "CRBC", OCT_5E, "Škoda", "Octavia");
    expect(r.map((x) => [x.price, x.fit])).toEqual([[7800, "exact"], [8800, "exact"]]);
  });
});
