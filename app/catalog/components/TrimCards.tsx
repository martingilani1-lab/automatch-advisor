"use client";

import { useState } from "react";
import { IconCheck, IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import type { CatalogTrim } from "../lib/types";
import { sortTrimsByTier, tierLabel } from "../lib/trimsDisplay";
import Badge from "./ui/badge";

interface TrimCardsProps {
  trims: CatalogTrim[];
  gapsMode: boolean;
}

function numericTier(tier: string | null): number {
  return tier != null && /^\d+$/.test(tier) ? Number(tier) : Infinity;
}

interface TrimCardProps {
  trim: CatalogTrim;
  defaultOpen: boolean;
  previousTrimName: string | null;
  // Whether this card should show its own "Equipment details not available yet" line when it
  // has zero features -- false when TrimCards has already shown that note once, above the
  // whole grid, because every trim in the phase is empty (point 3: "instead of repeating it
  // on every card").
  showEmptyNote: boolean;
  // Normal mode: a trim with no tier recorded shows no tier badge at all. Gaps mode: a
  // "missing" badge instead, same convention as ui/field.tsx's own isMissing/gapsMode branch.
  gapsMode: boolean;
}

function TrimCard({ trim, defaultOpen, previousTrimName, showEmptyNote, gapsMode }: TrimCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasFeatures = trim.features.length > 0;
  const label = tierLabel(trim.tier);

  return (
    <div className="rounded-xl border border-white/5 bg-panel p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
      <button
        type="button"
        onClick={() => hasFeatures && setIsOpen((v) => !v)}
        // A card with no features has nothing to expand -- not a button semantically (no
        // cursor-pointer, no toggle), just the header row rendered with the same markup.
        disabled={!hasFeatures}
        className="flex w-full items-center justify-between gap-3 border-0 bg-transparent p-0 text-left disabled:cursor-default"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary">{trim.name}</span>
          {label ? <Badge variant="default">{label}</Badge> : gapsMode && <Badge variant="missing">missing tier</Badge>}
        </span>
        {hasFeatures ? (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-secondary">
            {trim.features.length} extra{trim.features.length === 1 ? "" : "s"}
            {isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </span>
        ) : (
          showEmptyNote && <span className="shrink-0 text-xs text-secondary">Equipment details not available yet</span>
        )}
      </button>
      {hasFeatures && isOpen && (
        <div className="mt-3 border-t border-white/5 pt-3">
          {previousTrimName && (
            <p className="mb-2 text-xs text-secondary">Everything in {previousTrimName}, plus:</p>
          )}
          <ul className="flex flex-col gap-1.5">
            {trim.features.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-primary">
                  <IconCheck size={14} stroke={2} className="shrink-0 text-emerald-400" />
                  {f.feature}
                </span>
                {f.isOptional && <Badge variant="default">optional</Badge>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Rows = every distinct feature across the comparable trims, each attributed to the lowest
// tier that introduces it (features are additive-only per the data's own design -- once a
// feature appears at tier N, every trim >= N has it too). Columns = the same trims. A cell
// is a check for "included as standard," "opt" for "included but optional," "–" for "not yet
// at this tier" -- reconstructed from the incremental per-trim lists, not a separate
// cumulative column in the data.
function TrimCompareTable({ trims }: { trims: CatalogTrim[] }) {
  const rows: { feature: string; introTier: number; isOptional: boolean }[] = [];
  const seen = new Set<string>();
  for (const trim of trims) {
    const introTier = numericTier(trim.tier);
    for (const f of trim.features) {
      if (seen.has(f.feature)) continue;
      seen.add(f.feature);
      rows.push({ feature: f.feature, introTier, isOptional: f.isOptional });
    }
  }

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
              {trims.map((t) => {
                const included = numericTier(t.tier) >= row.introTier;
                return (
                  <td key={t.id} className="px-3 py-2 text-center">
                    {!included ? (
                      <span className="text-secondary">–</span>
                    ) : row.isOptional ? (
                      <span className="text-secondary">opt</span>
                    ) : (
                      <IconCheck size={14} stroke={2} className="inline text-emerald-400" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The actual trims grid -- no section heading of its own, so /catalog's TrimsList.tsx (which
// wants an "<h2>Trims</h2>" + gaps badge, matching every other /catalog tab) and /db-test's
// CarDetail.tsx (whose tab bar already labels the tab "Trims (N)", no second heading inside
// the tab content) can each wrap it however fits their own page, sharing this one
// implementation rather than keeping two drifting copies.
export default function TrimCards({ trims, gapsMode }: TrimCardsProps) {
  // Hook must run on every render regardless of the early-return below (rules-of-hooks) --
  // harmless when trims is empty, since the component returns null before this state is ever
  // read.
  const [showCompare, setShowCompare] = useState(false);
  if (trims.length === 0) return null;
  const sorted = sortTrimsByTier(trims);
  const allEmpty = sorted.every((t) => t.features.length === 0);
  const comparable = sorted.filter((t) => t.features.length > 0);
  const canCompare = comparable.length >= 2;

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
      {showCompare && canCompare && <TrimCompareTable trims={comparable} />}
      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((trim, i) => (
          <TrimCard
            key={trim.id}
            trim={trim}
            defaultOpen={i === 0}
            previousTrimName={i > 0 ? sorted[i - 1].name : null}
            showEmptyNote={!allEmpty}
            gapsMode={gapsMode}
          />
        ))}
      </div>
    </div>
  );
}
