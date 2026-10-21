"use client";

import { useState } from "react";
import { IconCheck, IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import type { CatalogTrim } from "../lib/types";
import {
  buildCompareRows,
  buildTrimLayout,
  tierLabel,
  trimComparisonLabel,
  type CompareRow,
} from "../lib/trimsDisplay";
import Badge from "./ui/badge";

interface TrimCardsProps {
  trims: CatalogTrim[];
  gapsMode: boolean;
}

function FeatureList({ features }: { features: CatalogTrim["features"] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {features.map((f, i) => (
        <li key={i} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-primary">
            <IconCheck size={14} stroke={2} className="shrink-0 text-emerald-400" />
            {f.feature}
          </span>
          {f.isOptional && <Badge variant="default">optional</Badge>}
        </li>
      ))}
    </ul>
  );
}

function TierBadge({ tier, gapsMode }: { tier: string | null; gapsMode: boolean }) {
  const label = tierLabel(tier);
  if (label) return <Badge variant="default">{label}</Badge>;
  return gapsMode ? <Badge variant="missing">missing tier</Badge> : null;
}

interface TrimCardProps {
  trim: CatalogTrim;
  comparisonLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  gapsMode: boolean;
}

// One non-base trim: header shows the name/tier on the left, trimComparisonLabel's "+N over
// X" (or "Alternative to <base>") on the right in place of the old flat "N extras" count --
// it already carries the count. A trim with no features (not expected live -- all 297 trims
// have at least one feature as of 2026-10-21 -- but the column allows it) isn't expandable.
function TrimCard({ trim, comparisonLabel, isOpen, onToggle, gapsMode }: TrimCardProps) {
  const hasFeatures = trim.features.length > 0;
  return (
    <div className="rounded-xl border border-white/5 bg-panel p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
      <button
        type="button"
        onClick={() => hasFeatures && onToggle()}
        disabled={!hasFeatures}
        className="flex w-full items-center justify-between gap-3 border-0 bg-transparent p-0 text-left disabled:cursor-default"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary">{trim.name}</span>
          <TierBadge tier={trim.tier} gapsMode={gapsMode} />
        </span>
        {hasFeatures ? (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-secondary">
            {comparisonLabel}
            {isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-secondary">Equipment details not available yet</span>
        )}
      </button>
      {hasFeatures && isOpen && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <FeatureList features={trim.features} />
        </div>
      )}
    </div>
  );
}

// Columns = the comparable trims in the same order buildCompareRows(comparable) built its
// cells in -- row.cells[i] corresponds to trims[i], so the two arrays must stay in lockstep
// (both come from the same `comparable` list one level up, never re-sorted independently).
function TrimCompareTable({ trims, rows }: { trims: CatalogTrim[]; rows: CompareRow[] }) {
  return (
    <div className="mb-4 overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-panel-2 text-xs uppercase text-secondary">
            <th className="px-3 py-2 text-left font-medium">Feature</th>
            {trims.map((t) => (
              <th key={t.id} className="px-3 py-2 text-center font-medium">
                <div>{t.name}</div>
                {tierLabel(t.tier) && <div className="mt-0.5 font-normal normal-case text-muted">{tierLabel(t.tier)}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => (
            <tr key={row.feature}>
              <td className="px-3 py-2 text-primary">{row.feature}</td>
              {row.cells.map((cell) => (
                <td key={cell.trimId} className="px-3 py-2 text-center">
                  {cell.status === "none" ? (
                    <span className="text-secondary">–</span>
                  ) : cell.status === "optional" ? (
                    <span className="text-secondary">opt</span>
                  ) : (
                    <IconCheck size={14} stroke={2} className="inline text-emerald-400" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The actual trims layout -- no section heading of its own, so /catalog's TrimsList.tsx (which
// wants an "<h2>Trims</h2>" + gaps badge, matching every other /catalog tab) and /db-test's
// CarDetail.tsx (whose tab bar already labels the tab "Trims (N)", no second heading inside
// the tab content) can each wrap it however fits their own page, sharing this one
// implementation rather than keeping two drifting copies.
export default function TrimCards({ trims, gapsMode }: TrimCardsProps) {
  const layout = buildTrimLayout(trims);
  // Hook must run on every render regardless of the early-return below (rules-of-hooks) --
  // harmless when layout is null, since the component returns before this state is ever
  // read. Default-open rule: every non-base trim starts open when the phase has <=4 trims
  // total, otherwise only the always-open base block starts expanded -- computed once from
  // the initial trims prop via useState's lazy initializer, not recomputed on every render.
  const [openTrims, setOpenTrims] = useState<Record<string, boolean>>(() => {
    if (!layout) return {};
    const openByDefault = trims.length <= 4;
    const initial: Record<string, boolean> = {};
    for (const group of layout.groups) for (const t of group.trims) initial[t.id] = openByDefault;
    return initial;
  });
  const [showCompare, setShowCompare] = useState(false);
  if (!layout) return null;
  const { base, groups } = layout;

  const allEmpty = trims.every((t) => t.features.length === 0);
  const comparable = trims.filter((t) => t.features.length > 0);
  const canCompare = comparable.length >= 2;
  const compareRows = canCompare ? buildCompareRows(comparable) : [];

  return (
    <div>
      {allEmpty && (
        <p className="mb-3 text-sm text-secondary">Equipment details not available yet for this phase.</p>
      )}
      {canCompare && (
        <button
          type="button"
          onClick={() => setShowCompare((v) => !v)}
          className="mb-3 rounded-md border border-white/5 bg-transparent px-3 py-1.5 text-sm text-secondary transition-colors hover:border-zinc-700 hover:text-primary"
        >
          {showCompare ? "Hide comparison" : "Compare trims"}
        </button>
      )}
      {showCompare && canCompare && <TrimCompareTable trims={comparable} rows={compareRows} />}

      {/* Standard equipment -- always expanded, not an accordion: this is the floor every
          other trim builds on, not one option among several to toggle open. */}
      <div className="rounded-xl border border-white/5 bg-panel p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary">{base.name}</span>
          <TierBadge tier={base.tier} gapsMode={gapsMode} />
        </div>
        <p className="mt-1 text-xs text-secondary">Included in every trim below.</p>
        {base.features.length > 0 ? (
          <div className="mt-3">
            <FeatureList features={base.features} />
          </div>
        ) : (
          <p className="mt-2 text-xs text-secondary">Equipment details not available yet</p>
        )}
      </div>

      {groups.map((group) => (
        <div key={`${group.tier ?? "null"}-${group.trims[0].id}`} className="mt-4">
          {group.trims.length > 1 && (
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Alternative versions, same level</p>
          )}
          <div className={group.trims.length > 1 ? "grid gap-4 md:grid-cols-2" : undefined}>
            {group.trims.map((trim) => (
              <TrimCard
                key={trim.id}
                trim={trim}
                comparisonLabel={trimComparisonLabel(trim, base, trims)}
                isOpen={!!openTrims[trim.id]}
                onToggle={() => setOpenTrims((p) => ({ ...p, [trim.id]: !p[trim.id] }))}
                gapsMode={gapsMode}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
