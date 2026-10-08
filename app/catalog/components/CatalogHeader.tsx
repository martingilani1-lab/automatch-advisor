import type { PhaseBundle } from "../lib/types";
import Badge from "./ui/badge";
import GapsToggleLink from "./GapsToggleLink";

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

  return (
    <header className="flex flex-col gap-3 border-b border-catalog-border pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-catalog-muted">{bundle.brandName}</p>
          <h1 className="text-3xl font-semibold text-catalog-text">
            {bundle.modelName}
            {bundle.generationCode ? ` (${bundle.generationCode})` : ""}
          </h1>
          <p className="mt-1 text-catalog-muted">
            {bundle.phaseLabel}
            {years ? ` · ${years}` : ""}
          </p>
        </div>
        <GapsToggleLink gapsMode={gapsMode} />
      </div>
      <div className="flex flex-wrap gap-2">
        {bundle.platformCode && <Badge variant="accent">{bundle.platformCode}</Badge>}
        {bundle.segment && <Badge>{bundle.segment}</Badge>}
        {bundle.originCountry && <Badge>{bundle.originCountry}</Badge>}
      </div>
    </header>
  );
}
