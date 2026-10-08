import type { CatalogTrim } from "../lib/types";
import { countGaps, type GapField } from "../lib/gaps";
import Badge from "./ui/badge";
import Field from "./ui/field";
import SectionGapsBadge from "./SectionGapsBadge";

interface TrimsListProps {
  trims: CatalogTrim[];
  gapsMode: boolean;
}

export default function TrimsList({ trims, gapsMode }: TrimsListProps) {
  if (trims.length === 0) return null;

  const tierFields: GapField[] = trims.map((t) => ({ label: t.name, value: t.tier }));
  const totalGaps = countGaps(tierFields);

  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium text-catalog-text">Trims</h2>
        <SectionGapsBadge count={totalGaps} />
      </div>
      <div className="mt-2 grid gap-4 md:grid-cols-2">
        {trims.map((trim) => (
          <div key={trim.id} className="rounded-lg border border-catalog-border bg-catalog-surface p-4">
            <p className="text-sm font-medium text-catalog-text">{trim.name}</p>
            <Field label="Tier" value={trim.tier} gapsMode={gapsMode} />
            <ul className="mt-2 flex flex-col gap-1.5">
              {trim.features.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-catalog-text">{f.feature}</span>
                  {f.isOptional && <Badge>optional</Badge>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
