// Parses an engine name like "2.0 TDI", "1,4tsi", "1.8T 20V", "35 TFSI" -- from ad text AND
// from catalog_engines.display_name -- into a comparable {size, family}. Used by the ad
// reader (to pull the engine name out of an ad) and the matcher (to drop catalog engines whose
// name contradicts it). Deliberately lenient: it only ever says two names CONFLICT when both
// the size and the fuel family are clearly readable and different.

export type TechFamily = "diesel" | "petrol_turbo" | "petrol_na" | "hybrid" | "other";

export interface EngineName {
  // "2.0" (litres) or "35" (Audi's power-class naming: 35 TFSI, 40 TDI)
  size: string;
  tech: string; // normalised token, e.g. "TDI", "TSI", "T", "MPI"
  family: TechFamily;
  text: string; // as found, for evidence
}

// Tech token -> fuel family. TFSI/eTSI are TSI by another name; "1.8T" is the old 20V turbo.
const TECH_FAMILY: Record<string, TechFamily> = {
  TDI: "diesel", BITDI: "diesel", SDI: "diesel", CDI: "diesel", HDI: "diesel", DCI: "diesel", CRDI: "diesel",
  TSI: "petrol_turbo", TFSI: "petrol_turbo", ETSI: "petrol_turbo", T: "petrol_turbo",
  MPI: "petrol_na", FSI: "petrol_na", "8V": "petrol_na", "16V": "petrol_na", "20V": "petrol_na", V5: "petrol_na", V6: "petrol_na", VR6: "petrol_na",
  EHYBRID: "hybrid", IV: "hybrid", GTE: "hybrid",
  TGI: "other",
};

// Size (1.0-6.9 litres with . or , ; or a 25-65 Audi class number) followed by a tech token.
// Longer tokens first so "TFSI" isn't read as "T".
const TECH_ALT = Object.keys(TECH_FAMILY).sort((a, b) => b.length - a.length).join("|");
const ENGINE_RE = new RegExp(`(?:^|[^0-9.,])([1-6][.,]\\d|[2-6][05])\\s?(${TECH_ALT})(?![A-Z0-9])`, "gi");

// First readable engine name in the text.
export function parseEngineName(text: string | null | undefined): EngineName | null {
  if (!text) return null;
  for (const m of text.toUpperCase().replace(/-/g, "").matchAll(ENGINE_RE)) {
    const tech = m[2].toUpperCase();
    const found = m[0].replace(/^[^0-9]/, "").trim();
    // Bare "T" only when glued to the size ("1.8T"): "ťažné 1,5 t" is a towing weight.
    if (tech === "T" && /\s/.test(found)) continue;
    return { size: m[1].replace(",", "."), tech, family: TECH_FAMILY[tech] ?? "other", text: found };
  }
  return null;
}

const isClassNumber = (size: string) => !size.includes(".");

// true only when the two names clearly describe DIFFERENT engines.
export function engineNamesConflict(a: EngineName, b: EngineName): boolean {
  // Litres vs. Audi class number ("1.5 TFSI" vs "35 TFSI") can't be compared -> no conflict.
  if (isClassNumber(a.size) === isClassNumber(b.size) && a.size !== b.size) return true;
  // Hybrid / unknown tech says nothing about the combustion family ("1.4 TSI iV" is sold as
  // "1.4 eHybrid") -> only a clear diesel-vs-petrol style mismatch counts.
  const comparable = (f: TechFamily) => f === "diesel" || f === "petrol_turbo" || f === "petrol_na";
  return comparable(a.family) && comparable(b.family) && a.family !== b.family;
}
