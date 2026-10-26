import { notFound } from "next/navigation";

import { getGenerationBundles, getSafetyFeatures, slugify } from "@/app/catalog/lib/db";
import type { SafetyFeature } from "@/app/prehlad/types";
import VehiclePageClient from "@/app/catalog/components/VehiclePageClient";

interface CatalogPageProps {
  params: Promise<{ brand: string; model: string; generation: string; phase: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// params/searchParams are Promises in Next 16.2.7's App Router and must be awaited --
// see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md.
export default async function CatalogPage({ params, searchParams }: CatalogPageProps) {
  const { brand, model, generation, phase } = await params;
  const { gaps } = await searchParams;
  const gapsMode = gaps === "1";

  let phases;
  try {
    // Loads every phase of this generation (vehicle page redesign step 1's phase switcher)
    // in one server fetch, so switching phases client-side needs no refetch.
    phases = await getGenerationBundles(brand, model, generation);
  } catch (err) {
    // No NextResponse fallback contract here (this isn't a route handler) -- log and treat
    // as not-found rather than letting a raw Supabase error reach Next's generic error page.
    console.error("[/catalog]", err);
    notFound();
  }
  if (!phases || phases.length === 0) notFound();

  // Static, car-independent reference vocabulary -- a failure here isn't fatal to the page the
  // way a missing `phases` is (TrimCards.tsx just shows every trim feature plain, same as
  // before this existed), so its own try/catch degrades to [] rather than 404ing the whole
  // page over a table this route doesn't strictly need.
  let safetyFeatures: SafetyFeature[];
  try {
    safetyFeatures = await getSafetyFeatures();
  } catch (err) {
    console.error("[/catalog] safety_features fetch failed", err);
    safetyFeatures = [];
  }

  // The URL's own [phase] segment names which phase this specific route resolves to -- the
  // default selection (and the one CatalogHeader's title area reflects before any client-side
  // switch). A phase slug that matches no sibling (shouldn't happen, the route couldn't have
  // resolved otherwise) falls back to the first/oldest phase rather than 404ing the whole page.
  const routePhase = phases.find((p) => slugify(p.phaseLabel) === phase) ?? phases[0];

  return (
    <VehiclePageClient phases={phases} routePhaseId={routePhase.phaseId} gapsMode={gapsMode} safetyFeatures={safetyFeatures} />
  );
}
