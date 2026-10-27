// POST /api/match-ad  { text: string }
//
// Reads a pasted classified ad (rule-based, no AI -- app/lib/listings/adReader.ts), resolves
// it to a catalog model, then picks the exact engine (app/lib/listings/matchAdToEngine.ts).
// Returns what was read (with the text each value came from), the model(s) it could be, and
// the match: an engine id + confidence, or no engine + the remaining candidates when the ad
// doesn't say enough. It never guesses an engine -- see matchAdToEngine.ts for the rules.
//
// Two small queries per request: the model vocabulary (36 models, every request -- keeps new
// catalog imports recognised immediately), then configurations of the matched model only.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { AdReadResult, AdVocabularyModel } from "@/app/lib/listings/adReader";
import { readAd } from "@/app/lib/listings/adReader";
import type { EngineCandidate, EngineMatch } from "@/app/lib/listings/matchAdToEngine";
import { adFuelOf, adTransmissionOf, matchAdToEngine } from "@/app/lib/listings/matchAdToEngine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ads are short; anything longer is a paste mistake (or abuse) -- read only the start.
const MAX_AD_CHARS = 5000;

export interface MatchAdResponse {
  read: AdReadResult;
  models: { modelId: string; brand: string; model: string }[];
  match: EngineMatch;
}

const EMPTY_RESPONSE: MatchAdResponse = {
  read: {
    ad: { brand: "", model: "", year: null, power_kw: null, fuel: null, transmission: null, engine_name: null },
    modelIds: [],
    generationCodes: [],
    evidence: {},
  },
  models: [],
  match: { matchedEngineId: null, confidenceScore: 0, reason: "model_not_found", candidates: [] },
};

interface PhaseRef {
  id: string;
  modelId: string;
  generationCode: string | null;
  yearFrom: number | null;
  yearTo: number | null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.slice(0, MAX_AD_CHARS) : "";
    if (!text.trim()) return NextResponse.json(EMPTY_RESPONSE, { status: 400 });

    // 1. Vocabulary: every catalog model with its brand and phases.
    const [modelsRes] = await Promise.all([
      supabase.from("catalog_models").select("id, name, catalog_brands(name), catalog_phases(id, generation_code, year_from, year_to)"),
    ]);
    if (modelsRes.error) throw modelsRes.error;

    const vocab: AdVocabularyModel[] = [];
    const phases: PhaseRef[] = [];
    for (const m of (modelsRes.data ?? []) as any[]) {
      const brand = Array.isArray(m.catalog_brands) ? m.catalog_brands[0]?.name : m.catalog_brands?.name;
      const ps = (m.catalog_phases ?? []) as any[];
      vocab.push({
        modelId: m.id,
        brand: brand ?? "",
        model: m.name,
        generationCodes: [...new Set(ps.map((p) => p.generation_code).filter(Boolean))] as string[],
      });
      for (const p of ps) {
        phases.push({ id: p.id, modelId: m.id, generationCode: p.generation_code, yearFrom: p.year_from, yearTo: p.year_to });
      }
    }

    // 2. Read the ad.
    const read = readAd(text, vocab);
    const models = vocab
      .filter((v) => read.modelIds.includes(v.modelId))
      .map((v) => ({ modelId: v.modelId, brand: v.brand, model: v.model }));
    if (!read.modelIds.length) {
      return NextResponse.json({ ...EMPTY_RESPONSE, read } satisfies MatchAdResponse);
    }

    // 3. The matched model's phases -- only the stated generation(s) when the ad names one.
    const modelPhases = phases.filter(
      (p) => read.modelIds.includes(p.modelId) && (!read.generationCodes.length || (p.generationCode != null && read.generationCodes.includes(p.generationCode)))
    );
    const phaseById = new Map(modelPhases.map((p) => [p.id, p]));

    const [configsRes] = await Promise.all([
      supabase
        .from("catalog_vehicle_configurations")
        .select("phase_id, catalog_engines(id, code, display_name, power_kw, fuel_type, hybrid_type), transmission_units(family)")
        .in("phase_id", modelPhases.map((p) => p.id)),
    ]);
    if (configsRes.error) throw configsRes.error;

    // 4. One candidate per (phase, engine, gearbox family); the matcher merges them per engine.
    const candidates: EngineCandidate[] = ((configsRes.data ?? []) as any[])
      .filter((c) => c.catalog_engines && c.transmission_units)
      .map((c) => {
        const e = c.catalog_engines;
        const phase = phaseById.get(c.phase_id);
        const name = e.display_name ?? e.code;
        return {
          engineId: e.id,
          label: `${name} · ${e.code}${/kw/i.test(name) ? "" : ` · ${e.power_kw} kW`}`,
          engineName: e.display_name,
          phaseIds: [c.phase_id],
          powerKw: Number(e.power_kw),
          fuel: adFuelOf(e.fuel_type, e.hybrid_type),
          transmissions: [adTransmissionOf(c.transmission_units.family)],
          yearFrom: phase?.yearFrom ?? null,
          yearTo: phase?.yearTo ?? null,
        };
      });

    const match = matchAdToEngine(read.ad, candidates);
    return NextResponse.json({ read, models, match } satisfies MatchAdResponse);
  } catch (err) {
    console.error("[/api/match-ad]", err);
    return NextResponse.json(EMPTY_RESPONSE, { status: 500 });
  }
}
