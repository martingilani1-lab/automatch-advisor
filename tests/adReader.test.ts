// Rule-based ad reader (app/lib/listings/adReader.ts). Vocabulary mirrors the live catalog's
// model names + generation codes (queried 2026-10-27); ad texts are typical SK/CZ phrasing.
import { describe, it, expect } from "vitest";
import { readAd, type AdVocabularyModel } from "@/app/lib/listings/adReader";
import { parseEngineName, engineNamesConflict } from "@/app/lib/listings/engineName";
import { matchAdToEngine, type EngineCandidate } from "@/app/lib/listings/matchAdToEngine";

const v = (modelId: string, brand: string, model: string, gens: string[]): AdVocabularyModel => ({ modelId, brand, model, generationCodes: gens });
const VOCAB: AdVocabularyModel[] = [
  v("oct", "Škoda", "Octavia", ["1U", "1Z", "5E", "NX"]),
  v("fab", "Škoda", "Fabia", ["NJ", "PJ"]),
  v("sup", "Škoda", "Superb", ["3V", "PY"]),
  v("kod", "Škoda", "Kodiaq", ["NS7", "PS"]),
  v("golf", "Volkswagen", "Golf", ["1J", "5G", "CD1"]),
  v("pas", "Volkswagen", "Passat", ["3G", "CJ"]),
  v("troc", "Volkswagen", "T-Roc", ["A11"]),
  v("leon", "SEAT", "León", ["1M", "5F", "KL"]),
  v("cleon", "Cupra", "León", ["KL"]),
  v("a3", "Audi", "A3", ["8L", "8V", "8Y"]),
  v("polo", "Volkswagen", "Polo", ["AW"]),
];
const Y = 2026;

describe("readAd", () => {
  it("reads a typical Slovak ad completely", () => {
    const r = readAd("Predám Škoda Octavia 3 combi 2.0 TDI 110kW, r.v. 2015, DSG, nafta, STK do 2027, najazdené 210 000 km", VOCAB, Y);
    expect(r.modelIds).toEqual(["oct"]);
    expect(r.generationCodes).toEqual(["5E"]);
    expect(r.ad).toMatchObject({ brand: "Škoda", model: "Octavia", year: 2015, power_kw: 110, fuel: "diesel", transmission: "automatic", engine_name: "2.0 TDI" });
    expect(r.evidence.year).toContain("2015");
  });
  it("converts PS / koní to kW and ignores the STK year", () => {
    const r = readAd("VW Golf VII 1,4 TSI 150 koní, manuál 6st, rok výroby 2016, STK 2026", VOCAB, Y);
    expect(r.ad).toMatchObject({ power_kw: 110, fuel: "petrol", transmission: "manual", year: 2016 });
    expect(r.generationCodes).toEqual(["5G"]);
  });
  it("Czech phrasing + first registration date", () => {
    const r = readAd("Prodám Oktávku, 1. registrace 03/2018, benzín, 110 kW / 150 PS, automat", VOCAB, Y);
    expect(r.ad).toMatchObject({ model: "Octavia", year: 2018, power_kw: 110, fuel: "petrol", transmission: "automatic" });
    expect(r.generationCodes).toEqual([]); // "150 PS" must not read as Kodiaq generation "PS"
  });
  it("leaves power empty when only the engine name is given -- no guessing", () => {
    const r = readAd("Superb 2.0 TDI 2019 DSG", VOCAB, Y);
    expect(r.ad.power_kw).toBeNull();
    expect(r.ad.engine_name).toBe("2.0 TDI");
    expect(r.ad.fuel).toBe("diesel"); // from TDI
  });
  it("treats '150k' after mileage words as mileage, not power", () => {
    expect(readAd("Fabia 1.0 TSI, najazdené 150k, 2019", VOCAB, Y).ad.power_kw).toBeNull();
    expect(readAd("Fabia 1.0 TSI 95 k, 2019", VOCAB, Y).ad.power_kw).toBe(70);
  });
  it("conflicting facts become null", () => {
    expect(readAd("Passat 110 kW alebo 140 kW", VOCAB, Y).ad.power_kw).toBeNull();
    expect(readAd("Passat nafta benzín", VOCAB, Y).ad.fuel).toBeNull();
    expect(readAd("Passat DSG aj manuál", VOCAB, Y).ad.transmission).toBeNull();
    expect(readAd("Octavia 2014 alebo 2016?", VOCAB, Y).ad.year).toBeNull();
  });
  it("does not misread common SK words", () => {
    const r = readAd("Octavia IV 2021, ev. číslo SK, ťažné 1,5 t", VOCAB, Y);
    expect(r.ad.fuel).toBeNull(); // not "iV" hybrid, not "ev" electric, not "1,5 T" turbo
    expect(r.generationCodes).toEqual(["NX"]); // Roman IV = 4th generation
  });
  it("plug-in hybrid beats the TSI petrol word", () => {
    expect(readAd("Octavia RS 1.4 TSI iV 2021", VOCAB, Y).ad.fuel).toBe("hybrid");
  });
  it("brand-ambiguous model keeps both brands; a stated brand narrows", () => {
    expect(readAd("Leon 2.0 TSI 2021", VOCAB, Y).modelIds.sort()).toEqual(["cleon", "leon"]);
    expect(readAd("Seat Leon 1.6 TDI 2015", VOCAB, Y).modelIds).toEqual(["leon"]);
  });
  it("hyphenated model names and VW alias", () => {
    expect(readAd("vw troc 2019", VOCAB, Y).modelIds).toEqual(["troc"]);
  });
  it("understands declined model names, but not ordinary words", () => {
    expect(readAd("Ponúkam na predaj Octaviu combi", VOCAB, Y).modelIds).toEqual(["oct"]);
    expect(readAd("jazdené s Golfom 2017", VOCAB, Y).modelIds).toEqual(["golf"]);
    expect(readAd("parkovanie pri poli, ťažné", VOCAB, Y).modelIds).toEqual([]); // not Polo
  });
  it("unknown model -> no model ids", () => {
    expect(readAd("Predám Ford Focus 2015", VOCAB, Y).modelIds).toEqual([]);
  });
});

describe("engine names", () => {
  it("parses ad and catalog spellings alike", () => {
    expect(parseEngineName("2,0tdi")).toMatchObject({ size: "2.0", tech: "TDI", family: "diesel" });
    expect(parseEngineName("1.8T 20V")).toMatchObject({ size: "1.8", tech: "T" });
    expect(parseEngineName("ťažné 1,5 t, 2.0 TDI")).toMatchObject({ size: "2.0", tech: "TDI" });
    expect(parseEngineName("35 TFSI 110kW")).toMatchObject({ size: "35", family: "petrol_turbo" });
  });
  it("conflicts only on clear differences", () => {
    const n = (s: string) => parseEngineName(s)!;
    expect(engineNamesConflict(n("2.0 TDI"), n("1.4 TSI"))).toBe(true);
    expect(engineNamesConflict(n("1.5 TSI"), n("1.5 TFSI"))).toBe(false);
    expect(engineNamesConflict(n("1.5 TFSI"), n("35 TFSI"))).toBe(false); // litres vs class number
    expect(engineNamesConflict(n("1.4 TSI iV"), n("1.4 eHybrid"))).toBe(false);
  });
});

describe("reader -> matcher end to end", () => {
  const c = (engineId: string, engineName: string, powerKw: number, fuel: "petrol" | "diesel"): EngineCandidate =>
    ({ engineId, label: engineId, engineName, powerKw, fuel, transmissions: ["manual", "automatic"], yearFrom: 2017, yearTo: 2020, phaseIds: ["fl"] });
  // Octavia 5E facelift, live engine set: 81 kW exists as 1.2 TSI (CYVB) and 1.6 TDI (CRKB).
  const FL = [c("CYVB", "1.2 TSI", 81, "petrol"), c("CRKB", "1.6 TDI", 81, "diesel"), c("CRBC", "2.0 TDI", 110, "diesel")];
  it("engine name resolves the 81 kW petrol/diesel collision without a fuel word", () => {
    const r = readAd("Octavia 1.6 TDI 81 kW 2018", VOCAB, Y);
    expect(matchAdToEngine(r.ad, FL)).toMatchObject({ matchedEngineId: "CRKB", confidenceScore: 1 });
  });
  it("engine name alone (no kW) can leave a single engine at 0.5", () => {
    const r = readAd("Octavia 2.0 TDI 2018 DSG", VOCAB, Y);
    expect(matchAdToEngine(r.ad, FL)).toMatchObject({ matchedEngineId: "CRBC", confidenceScore: 0.5, reason: "only_option" });
  });
});
