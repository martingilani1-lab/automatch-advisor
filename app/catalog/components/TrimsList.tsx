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
        <h2 className="text-lg font-medium text-primary">Trims</h2>
        <SectionGapsBadge count={totalGaps} />
      </div>
      <div className="mt-2 grid gap-4 md:grid-cols-2">
        {trims.map((trim) => (
          <div key={trim.id} className="rounded-xl border border-white/5 bg-panel p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset] hover:border-zinc-700 transition-colors">
            <p className="text-sm font-medium text-primary">{trim.name}</p>
            <Field label="Tier" value={trim.tier} gapsMode={gapsMode} />
            <ul className="mt-2 flex flex-col gap-1.5">
              {trim.features.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-primary">{f.feature}</span>
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
