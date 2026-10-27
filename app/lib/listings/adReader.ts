// Rule-based classified-ad reader: turns raw ad text (Slovak / Czech, some English/German)
// into the same ExtractedAd facts the LLM path produces (adExtraction.ts) -- with no AI, no
// API key and no per-ad cost. Runs anywhere (route handler, browser, tests).
//
// Same rule as the LLM prompt: read only what the ad STATES. A value the rules can't read
// with confidence is null; matchAdToEngine() turns nulls into lower confidence or a list of
// candidates, never into a guess. Conflicting values (two different power figures, "nafta"
// and "benzín" both present) also become null.
//
// Brand/model come from the CATALOG (passed in as `vocab`), not a hard-coded list, so a newly
// imported model is recognised automatically. Only nicknames and generation numbers
// ("oktávka", "Golf 7", "Octavia III") are maintained here by hand.

import type { AdFuel, AdTransmission, ExtractedAd } from "./adExtraction";
import { parseEngineName } from "./engineName";

// ---- Inputs / outputs ---------------------------------------------------------------------

// One catalog model, as the reader needs it.
export interface AdVocabularyModel {
  modelId: string;
  brand: string; // catalog_brands.name, e.g. "Škoda"
  model: string; // catalog_models.name, e.g. "Octavia"
  generationCodes: string[]; // catalog_phases.generation_code values, e.g. ["1U","1Z","5E","NX"]
}

export interface ReadAd extends ExtractedAd {
  // "2.0 TDI" etc. -- narrows engines when kW is missing; null if not found.
  engine_name: string | null;
}

export type AdField = "brand" | "model" | "generation" | "year" | "power_kw" | "fuel" | "transmission" | "engine_name";

export interface AdReadResult {
  ad: ReadAd;
  // Catalog models the ad could be. Usually one; two for brand-ambiguous names ("León" is
  // both SEAT and Cupra) -- the matcher's year/kW checks then decide. Empty = not recognised.
  modelIds: string[];
  // Generation codes stated or implied ("5E", "Octavia 3" -> "5E"); empty = not stated.
  generationCodes: string[];
  // The exact text each value was read from -- for the "we read: 150 PS -> 110 kW" UI and
  // for debugging misreads.
  evidence: Partial<Record<AdField, string>>;
}

// ---- Normalisation ------------------------------------------------------------------------

// Lowercase, strip diacritics (á -> a, š -> s), keep letters/digits/.,/ and single spaces.
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.,/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Whole-word match on normalised text; hyphens/spaces inside the needle match either
// ("T-Roc" = "t roc" = "troc").
//
// allowInflection: Slovak/Czech decline nouns -- "predám Oktávku", "s Octaviou", "Golfom",
// "Passatu". The name's trailing vowel is dropped and up to 3 letters of ending allowed.
// Only for stems of 4+ letters: short names ("Polo" -> "pol") would start matching ordinary
// words ("pole", "polovica").
function wordRe(needle: string, allowInflection = false): RegExp {
  const n = normalize(needle);
  const stem = allowInflection ? n.replace(/[aeiouy]$/, "") : n;
  const inflect = allowInflection && stem.replace(/[\s-]/g, "").length >= 4;
  const body = esc(inflect ? stem : n).replace(/[\s-]+/g, "[\\s-]?");
  return new RegExp(`(?:^|[^a-z0-9])(${body}${inflect ? "[a-z]{0,3}" : ""})(?![a-z0-9])`);
}

// ---- Brand & model ------------------------------------------------------------------------

// Extra spellings sellers use. Keys are normalised catalog names (brand or "brand|model").
const BRAND_ALIASES: Record<string, string[]> = {
  volkswagen: ["vw", "volkswagen", "volkswagon"],
  skoda: ["skoda"],
  seat: ["seat"],
  cupra: ["cupra"],
  audi: ["audi"],
};
const MODEL_ALIASES: Record<string, string[]> = {
  "skoda|octavia": ["oktavia", "oktavka", "octavka", "octavie"],
  "skoda|fabia": ["fabka", "fabie"],
  "skoda|superb": ["superbik"],
  "skoda|kodiaq": ["kodiak"],
  "skoda|karoq": ["karok"],
  "skoda|kamiq": ["kamik"],
  "volkswagen|golf": ["golfik"],
  "volkswagen|passat": ["pasat", "passatka"],
  "volkswagen|new beetle": ["beetle", "chrobak", "brouk"],
};

// Generation NUMBERS sellers use ("Octavia 3", "Golf VII", "Golf Mk7") -> catalog generation
// codes. Only generations present in the catalog are listed; an unknown number is ignored
// (year then decides).
const GENERATION_NUMBERS: Record<string, Record<number, string>> = {
  "skoda|octavia": { 1: "1U", 2: "1Z", 3: "5E", 4: "NX" },
  "skoda|fabia": { 3: "NJ", 4: "PJ" },
  "skoda|superb": { 3: "3V", 4: "PY" },
  "skoda|kodiaq": { 1: "NS7", 2: "PS" },
  "volkswagen|golf": { 4: "1J", 7: "5G", 8: "CD1" },
  "volkswagen|tiguan": { 2: "AD1", 3: "CT" },
  "seat|leon": { 1: "1M", 3: "5F", 4: "KL" },
  "audi|a3": { 1: "8L", 3: "8V", 4: "8Y" },
  "audi|tt": { 1: "8N", 3: "8S" },
};
const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };

const modelKey = (m: AdVocabularyModel) => `${normalize(m.brand)}|${normalize(m.model)}`;

interface ModelHit {
  m: AdVocabularyModel;
  index: number; // where in the text the model name was found
  text: string;
}

function findModels(norm: string, vocab: AdVocabularyModel[]): ModelHit[] {
  const hits: ModelHit[] = [];
  for (const m of vocab) {
    const names = [m.model, ...(MODEL_ALIASES[modelKey(m)] ?? [])];
    for (const n of names) {
      const r = norm.match(wordRe(n, true));
      if (r && r.index != null) {
        hits.push({ m, index: r.index, text: r[1] });
        break;
      }
    }
  }
  return hits;
}

function findBrands(norm: string, vocab: AdVocabularyModel[]): Set<string> {
  const found = new Set<string>();
  for (const brand of new Set(vocab.map((m) => m.brand))) {
    const aliases = BRAND_ALIASES[normalize(brand)] ?? [brand];
    if (aliases.some((a) => wordRe(a).test(norm))) found.add(brand);
  }
  return found;
}

// "octavia 3", "octavia iii", "golf mk7", "golf vii" right after the model name. The number
// must not be the start of a displacement ("Octavia 2.0 TDI") or a word ("Golf 4motion").
function generationFromNumber(norm: string, hit: ModelHit): string | null {
  const table = GENERATION_NUMBERS[modelKey(hit.m)];
  if (!table) return null;
  const after = norm.slice(hit.index + hit.text.length + 1);
  const r = after.match(/^\s?(?:mk\s?)?(\d|viii|vii|vi|iv|v|iii|ii|i)(?![a-z0-9]|[.,]\d)/);
  if (!r) return null;
  const n = /\d/.test(r[1]) ? Number(r[1]) : ROMAN[r[1]];
  return table[n] ?? null;
}

// ---- Year ---------------------------------------------------------------------------------

const YEAR_LABELED = [
  // r.v. 2015 / rok vyroby 2015 / vyrobene 2015 / rv: 2015 / model year 2015
  /(?:r\.?\s?v\.?|rok\s?vyroby|vyroben[aeyo]?|model\s?year)\s?[:.-]?\s?(?:\d{1,2}\s?\/\s?)?((?:19|20)\d{2})/,
  // 1. reg. 03/2015 / prva registracia 2015 / prvni registrace 2015 / registrovane 2015
  /(?:1\.?\s?reg\w*|prv[aiy]\s?registr\w*|registr\w*)\s?[:.-]?\s?(?:\d{1,2}\s?[./]\s?)?((?:19|20)\d{2})/,
];
// A bare year next to these words is a date of something else (STK do 2027, servis 2024).
const NOT_CAR_YEAR = /(?:^|\s)(stk|ek|tk|servis|servisovane|platna|platne|platnost|do|od|garancia|zaruka|poistenie|pzp)\s?[:.-]?\s?(?:\d{1,2}\s?[./]\s?)?$/;

function readYear(norm: string, currentYear: number): { year: number | null; evidence?: string } {
  const ok = (y: number) => y >= 1950 && y <= currentYear + 1;
  for (const re of YEAR_LABELED) {
    const m = norm.match(re);
    if (m && ok(Number(m[1]))) return { year: Number(m[1]), evidence: m[0].trim() };
  }
  // Unlabelled: every plausible year not tied to STK/servis/etc. One distinct value -> use it;
  // several -> ambiguous -> null.
  const years = new Set<number>();
  let ev = "";
  for (const m of norm.matchAll(/(?:^|[^0-9])((?:19|20)\d{2})(?![0-9])/g)) {
    const y = Number(m[1]);
    const before = norm.slice(Math.max(0, (m.index ?? 0) - 22), (m.index ?? 0) + m[0].indexOf(m[1]));
    if (!ok(y) || NOT_CAR_YEAR.test(before)) continue;
    // "150 000 km" style mileage written without a space ("2000 km") isn't a year.
    if (/^\s?(km|kw|ps|k|eur|e|ccm|cm3|kg)\b/.test(norm.slice((m.index ?? 0) + m[0].length))) continue;
    years.add(y);
    ev = m[1];
  }
  return years.size === 1 ? { year: [...years][0], evidence: ev } : { year: null };
}

// ---- Power --------------------------------------------------------------------------------

const PS_TO_KW = 0.7355;
const HP_TO_KW = 0.7457;
const POWER_CONFLICT_KW = 2; // two figures further apart than this = conflicting -> null

function readPower(norm: string): { kw: number | null; evidence?: string } {
  const values: { kw: number; text: string }[] = [];
  for (const m of norm.matchAll(/(?:^|[^0-9.,])(\d{2,3})\s?kw(?![a-z])/g)) values.push({ kw: Number(m[1]), text: m[0].trim() });
  for (const m of norm.matchAll(/(?:^|[^0-9.,])(\d{2,3})\s?(ps|koni|kon|hp|bhp|cv|k)(?![a-z0-9])/g)) {
    const unit = m[2];
    const rest = norm.slice((m.index ?? 0) + m[0].length);
    const before = norm.slice(Math.max(0, (m.index ?? 0) - 20), m.index ?? 0);
    // "150k" / "150 k" is just as often MILEAGE in thousands ("najazdene 150k", "150k km").
    if (unit === "k" && (/^\s?(km|tis|tkm)/.test(rest) || /(najazd|najet|najezd|najeto|nabeh|km|tachometer|stav)\w*\s?[:.-]?\s?$/.test(before))) continue;
    const factor = unit === "hp" || unit === "bhp" ? HP_TO_KW : PS_TO_KW;
    values.push({ kw: Math.round(Number(m[1]) * factor), text: m[0].trim() });
  }
  const plausible = values.filter((v) => v.kw >= 20 && v.kw <= 800);
  if (!plausible.length) return { kw: null };
  const min = Math.min(...plausible.map((v) => v.kw));
  const max = Math.max(...plausible.map((v) => v.kw));
  if (max - min > POWER_CONFLICT_KW) return { kw: null, evidence: plausible.map((v) => v.text).join(" / ") + " (conflicting)" };
  // Prefer a figure stated in kW over a converted one.
  const best = plausible.find((v) => /kw/.test(v.text)) ?? plausible[0];
  return { kw: best.kw, evidence: plausible.map((v) => v.text).join(" / ") };
}

// ---- Fuel & transmission ------------------------------------------------------------------

const FUEL_WORDS: [AdFuel, RegExp][] = [
  // "iV" only straight after TSI ("1.4 TSI iV"): on its own it's the Roman 4 in "Octavia IV".
  ["hybrid", /(?:^|[^a-z])(hybrid\w*|phev|plug[\s-]?in|e[\s-]?hybrid|tsi\s?iv|gte)(?![a-z])/],
  // No bare "ev": "ev. cislo" is the registration plate number in SK/CZ ads.
  ["ev", /(?:^|[^a-z])(elektro\w*|elektricky|electric|bev)(?![a-z])/],
  ["diesel", /(?:^|[^a-z])(nafta|naftovy|naftak|diesel\w*|tdi|bitdi|sdi|cdi|hdi|dci|crdi)(?![a-z])/],
  ["petrol", /(?:^|[^a-z])(benzin\w*|benzinovy|petrol|tsi|tfsi|etsi|mpi|fsi|tgi|lpg|cng)(?![a-z])/],
];

function readFuel(norm: string): { fuel: AdFuel | null; evidence?: string } {
  const found = FUEL_WORDS.map(([fuel, re]) => ({ fuel, m: norm.match(re) })).filter((x) => x.m);
  if (!found.length) return { fuel: null };
  const kinds = new Set(found.map((f) => f.fuel));
  // A plug-in is also a "TSI"/"benzín" -- hybrid wins over petrol. Anything else mixed
  // (nafta + benzín, elektro + TDI) is a contradiction -> null.
  if (kinds.has("hybrid") && [...kinds].every((k) => k === "hybrid" || k === "petrol")) {
    return { fuel: "hybrid", evidence: found.find((f) => f.fuel === "hybrid")!.m![1] };
  }
  if (kinds.size > 1) return { fuel: null, evidence: found.map((f) => f.m![1]).join(" / ") + " (conflicting)" };
  return { fuel: found[0].fuel, evidence: found[0].m![1] };
}

const AUTO_RE = /(?:^|[^a-z])(dsg|automat\w*|automatic|s[\s-]?tronic|tiptronic|multitronic|steptronic)(?![a-z])/;
const MANUAL_RE = /(?:^|[^a-z])(manual\w*|\d\s?(?:st|stup\w*)\.?\s?(?:man\w*|prevod\w*)|man\.?\s?prevod\w*)(?![a-z])/;

function readTransmission(norm: string): { transmission: AdTransmission | null; evidence?: string } {
  const a = norm.match(AUTO_RE);
  const m = norm.match(MANUAL_RE);
  if (a && m) return { transmission: null, evidence: `${a[1]} / ${m[1]} (conflicting)` };
  if (a) return { transmission: "automatic", evidence: a[1] };
  if (m) return { transmission: "manual", evidence: m[1] };
  return { transmission: null };
}

// ---- Main ---------------------------------------------------------------------------------

export function readAd(text: string, vocab: AdVocabularyModel[], currentYear = new Date().getFullYear()): AdReadResult {
  const norm = normalize(text);
  const evidence: AdReadResult["evidence"] = {};

  // Brand & model. A stated brand narrows the models; if it rules every hit out (seller wrote
  // the brand wrong), the model name alone wins.
  const brands = findBrands(norm, vocab);
  let hits = findModels(norm, vocab);
  const brandHits = hits.filter((h) => brands.has(h.m.brand));
  if (brands.size && brandHits.length) hits = brandHits;
  // Several DIFFERENT model names in one ad ("Octavia, not Superb") -> keep only the first
  // mentioned one; same name under two brands (SEAT/Cupra León) -> keep both.
  if (hits.length > 1) {
    const first = hits.reduce((a, b) => (b.index < a.index ? b : a));
    hits = hits.filter((h) => normalize(h.m.model) === normalize(first.m.model));
  }
  const modelIds = hits.map((h) => h.m.modelId);
  if (hits[0]) evidence.model = hits[0].text;
  const brandOut = hits.length === 1 ? hits[0].m.brand : brands.size === 1 ? [...brands][0] : "";
  if (brandOut) evidence.brand = brandOut;

  // Generation: an explicit catalog code ("5E", "Mk7"->number) for the matched model(s).
  const generationCodes = new Set<string>();
  for (const h of hits) {
    for (const code of h.m.generationCodes) {
      // Not right after a number: "150 PS" must not read as Kodiaq generation "PS".
      const re = new RegExp(`(?<![0-9]\\s?)(?:^|[^a-z0-9])${esc(normalize(code))}(?![a-z0-9])`);
      if (code && re.test(norm)) generationCodes.add(code);
    }
    const byNumber = generationFromNumber(norm, h);
    if (byNumber && h.m.generationCodes.includes(byNumber)) generationCodes.add(byNumber);
  }
  if (generationCodes.size) evidence.generation = [...generationCodes].join(", ");

  const { year, evidence: yEv } = readYear(norm, currentYear);
  if (yEv) evidence.year = yEv;
  const { kw, evidence: pEv } = readPower(norm);
  if (pEv) evidence.power_kw = pEv;
  const engine = parseEngineName(text);
  if (engine) evidence.engine_name = engine.text;
  let { fuel, evidence: fEv } = readFuel(norm);
  // The engine name is itself a fuel statement ("2.0 TDI") when no fuel word was found.
  if (!fuel && !fEv && engine && (engine.family === "diesel" || engine.family === "petrol_turbo" || engine.family === "petrol_na")) {
    fuel = engine.family === "diesel" ? "diesel" : "petrol";
    fEv = engine.text;
  }
  if (fEv) evidence.fuel = fEv;
  const { transmission, evidence: tEv } = readTransmission(norm);
  if (tEv) evidence.transmission = tEv;

  return {
    ad: {
      brand: brandOut,
      model: hits[0]?.m.model ?? "",
      year,
      power_kw: kw,
      fuel,
      transmission,
      engine_name: engine ? `${engine.size} ${engine.tech}` : null,
    },
    modelIds,
    generationCodes: [...generationCodes],
    evidence,
  };
}
