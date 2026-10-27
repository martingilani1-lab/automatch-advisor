// POST /api/listings  { phaseId: string, engineId: string }
//
// "Search real vehicles" for one configuration's engine: asks every registered portal reader
// (app/lib/listings/portals) for that model + years + fuel, reads the results pages, and keeps
// only ads that are -- or may be -- that exact engine (same strict matcher as /api/match-ad).
// Read-only, TheParking-style: nothing is written to the database; results live in this
// server instance's memory for 24 h so repeat clicks don't hit the portals again.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { ClassifiedListing, RawConfigRow } from "@/app/lib/listings/searchListings";
import { candidateFromRow, classifyListings } from "@/app/lib/listings/searchListings";
import type { EngineCandidate } from "@/app/lib/listings/matchAdToEngine";
import { PORTAL_PROVIDERS } from "@/app/lib/listings/portals";
import type { PortalListing, PortalSearchQuery } from "@/app/lib/listings/portals/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ListingSource {
  portal: string;
  name: string;
  country: "SK" | "CZ";
  status: "ok" | "error";
  count: number; // listings read from the page, before engine filtering
  searchUrl: string;
}

export interface ListingsResponse {
  listings: ClassifiedListing[];
  sources: ListingSource[];
  fetchedAt: string | null;
  cached: boolean;
}

const EMPTY: ListingsResponse = { listings: [], sources: [], fetchedAt: null, cached: false };

// ---- 24 h in-memory cache -----------------------------------------------------------------
// Per server instance, not shared or persisted -- on Vercel a cold start simply re-reads.
// Bounded so a crawl of many cars can't grow it without limit.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 300;
const cache = new Map<string, { at: number; value: ListingsResponse }>();

// Portals get a plain, honest browser-like request, one page per search, with a short timeout
// so one slow portal can't hold up the others.
const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "Mozilla/5.0 (compatible; AutoMatchAdvisor/1.0; +read-only listing preview)";

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "sk,cs;q=0.9,en;q=0.5" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const phaseId = typeof body?.phaseId === "string" ? body.phaseId : "";
    const engineId = typeof body?.engineId === "string" ? body.engineId : "";
    if (!phaseId || !engineId) return NextResponse.json(EMPTY, { status: 400 });

    const key = `${phaseId}|${engineId}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return NextResponse.json({ ...hit.value, cached: true } satisfies ListingsResponse);

    const [phaseRes, configsRes] = await Promise.all([
      supabase.from("catalog_phases").select("id, year_from, year_to, catalog_models(name, catalog_brands(name))").eq("id", phaseId).single(),
      supabase
        .from("catalog_vehicle_configurations")
        .select("phase_id, catalog_engines(id, code, display_name, power_kw, fuel_type, hybrid_type), transmission_units(family)")
        .eq("phase_id", phaseId),
    ]);
    if (phaseRes.error) throw phaseRes.error;
    if (configsRes.error) throw configsRes.error;

    const phase = phaseRes.data as any;
    const modelRow = Array.isArray(phase.catalog_models) ? phase.catalog_models[0] : phase.catalog_models;
    const brandRow = Array.isArray(modelRow?.catalog_brands) ? modelRow.catalog_brands[0] : modelRow?.catalog_brands;
    const brand: string = brandRow?.name ?? "";
    const model: string = modelRow?.name ?? "";

    const candidates = ((configsRes.data ?? []) as unknown as RawConfigRow[])
      .map((r) => candidateFromRow(r, phase.year_from, phase.year_to))
      .filter((c): c is EngineCandidate => c != null);
    const target = candidates.find((c) => c.engineId === engineId);
    if (!target) return NextResponse.json(EMPTY, { status: 404 });

    const query: PortalSearchQuery = {
      brand,
      model,
      yearFrom: phase.year_from,
      // One year of registration lag, same grace the matcher allows.
      yearTo: phase.year_to != null ? phase.year_to + 1 : null,
      fuel: target.fuel,
    };

    // All portals in parallel; one failing never fails the search.
    const results = await Promise.all(
      PORTAL_PROVIDERS.map(async (p) => {
        const searchUrl = p.searchUrl(query);
        try {
          const listings = p.parse(await fetchPage(searchUrl), searchUrl);
          return { source: { portal: p.id, name: p.name, country: p.country, status: "ok", count: listings.length, searchUrl } as ListingSource, listings };
        } catch (err) {
          console.error(`[/api/listings] ${p.id}`, err);
          return { source: { portal: p.id, name: p.name, country: p.country, status: "error", count: 0, searchUrl } as ListingSource, listings: [] as PortalListing[] };
        }
      })
    );

    const value: ListingsResponse = {
      listings: classifyListings(results.flatMap((r) => r.listings), engineId, candidates, brand, model),
      sources: results.map((r) => r.source),
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), value });
    return NextResponse.json(value);
  } catch (err) {
    console.error("[/api/listings]", err);
    return NextResponse.json(EMPTY, { status: 500 });
  }
}
