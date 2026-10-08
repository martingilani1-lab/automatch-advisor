import type { PhaseBundle } from "../lib/types";
import { countGaps, type GapField } from "../lib/gaps";
import Badge from "./ui/badge";
import Field from "./ui/field";
import GapsToggleLink from "./GapsToggleLink";
import SectionGapsBadge from "./SectionGapsBadge";

interface CatalogHeaderProps {
  bundle: PhaseBundle;
  gapsMode: boolean;
}

export default function CatalogHeader({ bundle, gapsMode }: CatalogHeaderProps) {
  const years =
    bundle.yearFrom && bundle.yearTo
      ? `${bundle.yearFrom}–${bundle.yearTo}`
      : bundle.yearFrom
        ? `${bundle.yearFrom}–present`
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
    <header className="flex flex-col gap-3 border-b border-catalog-border pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-catalog-muted">{bundle.brandName}</p>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-catalog-text">{bundle.modelName}</h1>
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
