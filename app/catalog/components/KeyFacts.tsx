import type { PhaseBundle } from "../lib/types";
import { countGaps, type GapField } from "../lib/gaps";
import Field from "./ui/field";
import SectionGapsBadge from "./SectionGapsBadge";

interface KeyFactsProps {
  bundle: PhaseBundle;
  gapsMode: boolean;
}

function eur(n: number | null): string | null {
  return n == null ? null : `€${n.toLocaleString("en-US")}`;
}

function pct(n: number | null): string | null {
  return n == null ? null : `${n}%`;
}

export default function KeyFacts({ bundle, gapsMode }: KeyFactsProps) {
  const priceRange =
    bundle.priceRangeMinEur != null && bundle.priceRangeMaxEur != null
      ? `${eur(bundle.priceRangeMinEur)} – ${eur(bundle.priceRangeMaxEur)}`
      : null;

  const fields: GapField[] = [
    { label: "NCAP stars", value: bundle.safetyRating != null ? `${bundle.safetyRating} / 5` : null },
    { label: "Adult occupant", value: pct(bundle.ncapAdultPct) },
    { label: "Child occupant", value: pct(bundle.ncapChildPct) },
    { label: "Pedestrian", value: pct(bundle.ncapPedestrianPct) },
    { label: "Safety assist", value: pct(bundle.ncapSafetyAssistPct) },
    { label: "Price range", value: priceRange },
    { label: "Avg. market price", value: eur(bundle.avgMarketPriceEur) },
    { label: "Typical mileage", value: bundle.typicalMileageRange },
    { label: "Resale value", value: bundle.resaleValueRating },
    {
      label: "Towing capacity",
      value: bundle.towingCapacityKg != null ? `${bundle.towingCapacityKg} kg` : null,
    },
  ];

  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium text-catalog-text">Key facts</h2>
        <SectionGapsBadge count={countGaps(fields)} />
      </div>
      <div className="mt-2 rounded-lg border border-catalog-border bg-catalog-surface p-4">
        {fields.map((f) => (
          <Field key={f.label} label={f.label} value={f.value} gapsMode={gapsMode} />
        ))}
      </div>
    </section>
  );
}
