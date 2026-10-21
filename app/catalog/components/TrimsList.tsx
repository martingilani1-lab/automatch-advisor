import type { CatalogTrim } from "../lib/types";
import { countGaps, type GapField } from "../lib/gaps";
import SectionGapsBadge from "./SectionGapsBadge";
import TrimCards from "./TrimCards";

interface TrimsListProps {
  trims: CatalogTrim[];
  gapsMode: boolean;
}

// Section wrapper (heading + gaps badge, matching every other /catalog tab) around the actual
// cards, which live in TrimCards.tsx so /db-test's CarDetail.tsx can render the same component
// without a second "Trims" heading (its tab bar already labels the tab).
export default function TrimsList({ trims, gapsMode }: TrimsListProps) {
  if (trims.length === 0) return null;

  const tierFields: GapField[] = trims.map((t) => ({ label: t.name, value: t.tier }));
  const totalGaps = countGaps(tierFields);

  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium text-primary">Trims</h2>
        <SectionGapsBadge count={totalGaps} />
      </div>
      <div className="mt-2">
        <TrimCards trims={trims} gapsMode={gapsMode} />
      </div>
    </section>
  );
}
