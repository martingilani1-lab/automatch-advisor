import type { CatalogMediaItem } from "../lib/types";
import Badge from "./ui/badge";
import SectionGapsBadge from "./SectionGapsBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface MediaGalleryProps {
  bodies: { bodyTypeId: string; bodyName: string }[];
  media: CatalogMediaItem[];
  gapsMode: boolean;
}

// catalog_media hangs off (phase, body_type) -- same granularity as phase_body_dimensions,
// so it reuses the same body-tab shape as BodyDimensionsTabs rather than inventing a second
// grouping scheme. A body with zero images is a gap (nothing to hide vs. show), not an
// empty-but-valid list.
export default function MediaGallery({ bodies, media, gapsMode }: MediaGalleryProps) {
  if (bodies.length === 0) return null;

  const byBody = new Map<string, CatalogMediaItem[]>();
  for (const m of media) {
    const list = byBody.get(m.bodyTypeId) ?? [];
    list.push(m);
    byBody.set(m.bodyTypeId, list);
  }

  const emptyBodyCount = bodies.filter((b) => (byBody.get(b.bodyTypeId) ?? []).length === 0).length;

  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium text-catalog-text">Media</h2>
        <SectionGapsBadge count={emptyBodyCount} />
      </div>
      <Tabs defaultValue={bodies[0].bodyTypeId} className="mt-2">
        <TabsList>
          {bodies.map((b) => (
            <TabsTrigger key={b.bodyTypeId} value={b.bodyTypeId}>
              {b.bodyName}
            </TabsTrigger>
          ))}
        </TabsList>
        {bodies.map((b) => {
          const items = byBody.get(b.bodyTypeId) ?? [];
          return (
            <TabsContent key={b.bodyTypeId} value={b.bodyTypeId}>
              {items.length === 0 ? (
                gapsMode ? (
                  <Badge variant="missing">no media recorded</Badge>
                ) : null
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {items.map((m) => (
                    <figure
                      key={m.id}
                      className="overflow-hidden rounded-lg border border-catalog-border bg-catalog-surface"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- external, unoptimized catalog image URLs, not a static asset */}
                      <img src={m.imageUrl} alt={`${b.bodyName} ${m.viewAngle ?? ""}`} className="aspect-video w-full object-cover" />
                      {m.viewAngle && (
                        <figcaption className="p-2 text-xs text-catalog-muted">
                          {m.viewAngle}
                          {m.isMain && " · main"}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}
