import { notFound } from "next/navigation";

import { getPhaseBundle } from "@/app/catalog/lib/db";
import CatalogHeader from "@/app/catalog/components/CatalogHeader";
import KeyFacts from "@/app/catalog/components/KeyFacts";
import BodyDimensionsTabs from "@/app/catalog/components/BodyDimensionsTabs";
import Configurator from "@/app/catalog/components/Configurator";
import TrimsList from "@/app/catalog/components/TrimsList";
import MediaGallery from "@/app/catalog/components/MediaGallery";

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

  let bundle;
  try {
    bundle = await getPhaseBundle(brand, model, generation, phase);
  } catch (err) {
    // No NextResponse fallback contract here (this isn't a route handler) -- log and treat
    // as not-found rather than letting a raw Supabase error reach Next's generic error page.
    console.error("[/catalog]", err);
    notFound();
  }
  if (!bundle) notFound();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10">
      <CatalogHeader bundle={bundle} gapsMode={gapsMode} />
      <KeyFacts bundle={bundle} gapsMode={gapsMode} />
      <BodyDimensionsTabs bodies={bundle.bodyDimensions} gapsMode={gapsMode} />
      <MediaGallery
        bodies={bundle.bodyDimensions.map((d) => ({ bodyTypeId: d.bodyTypeId, bodyName: d.bodyName }))}
        media={bundle.media}
        gapsMode={gapsMode}
      />
      <Configurator configs={bundle.configs} faults={bundle.faults} gapsMode={gapsMode} />
      <TrimsList trims={bundle.trims} gapsMode={gapsMode} />
    </main>
  );
}
