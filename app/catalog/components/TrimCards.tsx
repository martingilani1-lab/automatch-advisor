"use client";

import { useState } from "react";
import { IconCheck, IconChevronDown, IconChevronUp, IconShieldCheck } from "@tabler/icons-react";

import type { CatalogTrim } from "../lib/types";
import type { SafetyFeature } from "@/app/prehlad/types";
import {
  buildCompareRows,
  resolveTrimFeatures,
  buildTrimLayout,
  tierLabel,
  trimComparisonLabel,
  trimFeatureCategory,
  TRIM_CATEGORY_ORDER,
  TRIM_CATEGORY_LABELS,
  type CompareRow,
  type ResolvedFeatureRow,
} from "../lib/trimsDisplay";
import Badge from "./ui/badge";

interface TrimCardsProps {
  trims: CatalogTrim[];
  gapsMode: boolean;
  safetyFeatures: SafetyFeature[];
}

// Inherited rows render muted and faded -- already covered by base or an earlier tier, not
// what makes this one worth picking. New rows render green with a "+" -- this trim's own
// feature, nothing before it to replace. Upgraded rows render amber with a "↑" -- this trim's
// own feature replaced a DIFFERENT inherited item in the same feature_group; a small muted
// "was: ..." line names what it replaced (an optional upgrade never actually replaces
// anything -- see resolveTrimFeatures -- so it gets the amber "↑" but no "was:" line, since
// the standard item it sits beside is still listed in its own grey row).
//
// A row whose safetyFeatureSlug is set overrides all of that with safety yellow + a shield
// icon -- same reduced-opacity-for-inherited convention, just yellow instead of green/amber/
// grey, since "this is one of the 20 reference safety systems" is the more useful signal here.
// /catalog has no NCAP tab to click through to (unlike /db-test's own copy of this component),
// so this is static: a title attribute carries the feature's plain-language explanation.
// Inherited rows fade to opacity-40 (was 60) -- requested 2026-10-26: make what the trim
// already had recede further so what it actually ADDS (new/upgraded, still full-strength
// green/amber/yellow) reads as the obviously distinguishing content, not just a slightly
// different shade in the same list.
function FeatureRow({ r, safetyFeatureBySlug }: { r: ResolvedFeatureRow; safetyFeatureBySlug: Map<string, SafetyFeature> }) {
  const safetyFeature = r.safetyFeatureSlug ? safetyFeatureBySlug.get(r.safetyFeatureSlug) : undefined;
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="flex flex-col">
        {safetyFeature ? (
          <span className="flex items-center gap-2 text-yellow-300" style={{ opacity: r.status === "inherited" ? 0.4 : 1 }} title={safetyFeature.what_it_does ?? undefined}>
            <IconShieldCheck size={14} stroke={2} className="shrink-0" />
            {r.feature}
          </span>
        ) : (<>
          {r.status === "new" && (
            <span className="flex items-center gap-2 text-emerald-400">
              <span className="shrink-0 font-semibold">+</span>
              {r.feature}
            </span>
          )}
          {r.status === "upgraded" && (
            <span className="flex items-center gap-2 text-amber-400">
              <span className="shrink-0 font-semibold">↑</span>
              {r.feature}
            </span>
          )}
          {r.status === "inherited" && (
            <span className="flex items-center gap-2 text-muted opacity-40">
              <IconCheck size={14} stroke={2} className="shrink-0" />
              {r.feature}
            </span>
          )}
        </>)}
        {r.replacedFeature && <span className="pl-5 text-xs text-muted">was: {r.replacedFeature}</span>}
      </span>
      {r.isOptional && <Badge variant="default">optional</Badge>}
    </li>
  );
}

// Grouped into the 5 display sections (trimFeatureCategory, trimsDisplay.ts) instead of one
// flat list -- requested 2026-10-26, the flat list "looks chaotic". Within each section, rows
// keep resolveTrimFeatures' own upgraded/new/inherited order; a section with nothing in it is
// skipped entirely rather than shown empty.
function FeatureList({ trim, base, allTrims, safetyFeatureBySlug }: { trim: CatalogTrim; base: CatalogTrim; allTrims: CatalogTrim[]; safetyFeatureBySlug: Map<string, SafetyFeature> }) {
  const rows = resolveTrimFeatures(trim, base, allTrims);
  return (
    <div className="flex flex-col gap-3">
      {TRIM_CATEGORY_ORDER.map((cat) => {
        const catRows = rows.filter((r) => trimFeatureCategory(r) === cat);
        if (catRows.length === 0) return null;
        return (
          <div key={cat}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{TRIM_CATEGORY_LABELS[cat]}</p>
            <ul className="flex flex-col gap-1.5">
              {catRows.map((r, i) => <FeatureRow key={i} r={r} safetyFeatureBySlug={safetyFeatureBySlug} />)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function TierBadge({ tier, gapsMode }: { tier: string | null; gapsMode: boolean }) {
  const label = tierLabel(tier);
  if (label) return <Badge variant="default">{label}</Badge>;
  return gapsMode ? <Badge variant="missing">missing tier</Badge> : null;
}

interface TrimCardProps {
  trim: CatalogTrim;
  base: CatalogTrim;
  allTrims: CatalogTrim[];
  comparisonLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  gapsMode: boolean;
  safetyFeatureBySlug: Map<string, SafetyFeature>;
}

// One non-base trim: header shows the name/tier on the left, trimComparisonLabel's "+N over
// X" (or "Alternative to <base>") on the right in place of the old flat "N extras" count --
// it already carries the count. hasFeatures checks base's features too, not just this trim's
// own rows: FeatureList below always shows the merged inherited+extra list, so a trim with
// zero of its own rows (no extras, just the inherited set) still has something to expand
// into, same as a trim that does have its own rows.
function TrimCard({ trim, base, allTrims, comparisonLabel, isOpen, onToggle, gapsMode, safetyFeatureBySlug }: TrimCardProps) {
  const hasFeatures = trim.features.length > 0 || base.features.length > 0;
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
          <FeatureList trim={trim} base={base} allTrims={allTrims} safetyFeatureBySlug={safetyFeatureBySlug} />
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
            <tr key={row.label}>
              <td className="px-3 py-2 text-primary">{row.label}</td>
              {row.cells.map((cell) => (
                <td key={cell.trimId} className={`px-3 py-2 text-center ${cell.changed ? "text-amber-400" : cell.text === "–" ? "text-secondary" : "text-primary"}`}>
                  {cell.text}
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
export default function TrimCards({ trims, gapsMode, safetyFeatures }: TrimCardsProps) {
  const safetyFeatureBySlug = new Map(safetyFeatures.map((f) => [f.slug, f]));
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
  const compareRows = canCompare ? buildCompareRows(comparable, base, trims) : [];

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
            <FeatureList trim={base} base={base} allTrims={trims} safetyFeatureBySlug={safetyFeatureBySlug} />
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
                base={base}
                allTrims={trims}
                comparisonLabel={trimComparisonLabel(trim, base, trims)}
                isOpen={!!openTrims[trim.id]}
                onToggle={() => setOpenTrims((p) => ({ ...p, [trim.id]: !p[trim.id] }))}
                gapsMode={gapsMode}
                safetyFeatureBySlug={safetyFeatureBySlug}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
