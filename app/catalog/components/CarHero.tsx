import Image from "next/image";

import type { CatalogMediaItem } from "../lib/types";

interface CarHeroProps {
  media: CatalogMediaItem | null;
  alt: string;
}

// Large hero photo at the top of the vehicle detail page -- shared by /catalog
// (CatalogHeader) and /db-test (CarDetail), the same "one component, both pages" pattern
// already established for PhaseSwitcher/ConfigurationsTable. The photo's background is
// already transparent (scripts/media/process-images.py), so it sits directly on the page
// with no grey box behind it -- a soft radial glow plus a blurred "ground shadow" ellipse are
// what keep a transparent cutout from looking like it's floating on flat black.
//
// Renders nothing at all when there's no photo for this phase -- unlike the car-list row
// (CarRow.tsx), which always shows a placeholder silhouette, a detail page's hero is either
// a real photo or nothing (no placeholder art at this size).
//
// `key={media.imageUrl}` below forces a fresh mount (and so the fade-in animation) whenever
// the phase switch changes which photo this is -- both pages already remount their whole
// detail view on phase switch (db-test keys CarDetail by car id; /catalog's
// VehiclePageClient swaps `bundle` client-side), so this doesn't need its own switch-tracking
// state, just something that reliably changes identity when the photo does.
export default function CarHero({ media, alt }: CarHeroProps) {
  if (!media) return null;

  return (
    <div key={media.imageUrl} className="hero-fade-in relative mx-auto aspect-video w-full max-h-[720px]">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 60% at 50% 45%, rgb(63 63 70 / 0.4), transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[6%] left-1/2 h-[8%] w-[55%] -translate-x-1/2 rounded-full bg-black/60 blur-xl"
        aria-hidden="true"
      />
      <Image
        src={media.imageUrl}
        alt={alt}
        fill
        priority
        sizes="(max-width: 768px) 100vw, 720px"
        style={{ objectFit: "contain" }}
        className="relative"
      />
    </div>
  );
}
