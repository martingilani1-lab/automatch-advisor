import Image from "next/image";

import type { PhaseBundle } from "../lib/types";
import { countGaps, type GapField } from "../lib/gaps";
import { pickMainMedia } from "../lib/media";
import Badge from "./ui/badge";
import Field from "./ui/field";
import GapsToggleLink from "./GapsToggleLink";
import SectionGapsBadge from "./SectionGapsBadge";

interface CatalogHeaderProps {
  bundle: PhaseBundle;
  gapsMode: boolean;
  // The body currently selected elsewhere on the page (e.g. the Configurations/body filter),
  // if any -- when set and that body has its own image, it takes priority over the phase's
  // general main image. Optional: most callers don't track a body selection at all.
  selectedBodyTypeId?: string | null;
}

export default function CatalogHeader({ bundle, gapsMode, selectedBodyTypeId }: CatalogHeaderProps) {
  const mainMedia = pickMainMedia(bundle.media, selectedBodyTypeId);
  // Display rule: no yearTo means the model is still in production -- a real, non-gap
  // value, not a missing end date.
  const years =
    bundle.yearFrom && bundle.yearTo
      ? `${bundle.yearFrom}–${bundle.yearTo}`
      : bundle.yearFrom
        ? `${bundle.yearFrom} – in production`
        : null;

  // brand/model are never null by construction (the route can't resolve without them) --
  // only chassis/phase/years/platform are genuinely gappable header fields.
  const fields: GapField[] = [
    { label: "Chassis", value: bundle.generationCode },
    { label: "Phase", value: bundle.phaseLabel },
    { label: "Years", value: years },
    { label: "Platform", value: bundle.platformCode },
  ];

  return (
    <header className="flex flex-col gap-3 border-b border-white/5 pb-6">
      {mainMedia && (
        <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl bg-panel-2">
          <Image
            src={mainMedia.imageUrl}
            alt={`${bundle.brandName} ${bundle.modelName}`}
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-secondary">{bundle.brandName}</p>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-primary">{bundle.modelName}</h1>
            <SectionGapsBadge count={countGaps(fields)} />
          </div>
        </div>
        <GapsToggleLink gapsMode={gapsMode} />
      </div>
      <div className="grid max-w-md grid-cols-2 gap-x-6">
        {fields.map((f) => (
          <Field key={f.label} label={f.label} value={f.value} gapsMode={gapsMode} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {bundle.segment && <Badge>{bundle.segment}</Badge>}
        {bundle.originCountry && <Badge>{bundle.originCountry}</Badge>}
      </div>
    </header>
  );
}
