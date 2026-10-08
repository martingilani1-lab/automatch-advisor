"use client";

import type { FilterOption } from "@/app/db-test/lib/filters";

interface FilterGroupProps {
  title: string;
  options: FilterOption[];
  counts: Record<string, number>;
  selected: string[];
  onToggle: (slug: string) => void;
}

function FilterGroupBlock({ title, options, counts, selected, onToggle }: FilterGroupProps) {
  return (
    <div className="filter-group">
      <div className="filter-group-title">{title}</div>
      {options.map((o) => {
        const count = counts[o.slug] ?? 0;
        const isSelected = selected.includes(o.slug);
        const dead = count === 0 && !isSelected;
        return (
          <label key={o.slug} className={`filter-opt${dead ? " dead" : ""}`}>
            <input type="checkbox" checked={isSelected} disabled={dead} onChange={() => onToggle(o.slug)} />
            <div className="filter-opt-body">
              <div className="filter-opt-head">
                <span>{o.label}</span>
                {o.badge && <span className="filter-badge">{o.badge}</span>}
                <span className="filter-count">{count}</span>
              </div>
              <div className="filter-consequence">{o.consequence}</div>
            </div>
          </label>
        );
      })}
    </div>
  );
}

interface BrandOption { slug: string; label: string }

interface FilterPanelProps {
  bodyOptions: FilterOption[]; bodyCounts: Record<string, number>; bodySelected: string[]; onToggleBody: (s: string) => void;
  fuelOptions: FilterOption[]; fuelCounts: Record<string, number>; fuelSelected: string[]; onToggleFuel: (s: string) => void;
  gearboxOptions: FilterOption[]; gearboxCounts: Record<string, number>; gearboxSelected: string[]; onToggleGearbox: (s: string) => void;
  drivetrainOptions: FilterOption[]; drivetrainCounts: Record<string, number>; drivetrainSelected: string[]; onToggleDrivetrain: (s: string) => void;
  brandOptions: BrandOption[]; brandCounts: Record<string, number>; brandSelected: string[]; onToggleBrand: (s: string) => void;
  priceMin: number | null; priceMax: number | null;
  onChangePriceMin: (v: string) => void; onChangePriceMax: (v: string) => void;
}

// Copied from app/prehlad/FilterPanel.tsx verbatim (same classes/layout) -- the only
// difference is the Transmission group's title/options/handler renamed to Gearbox, matching
// transmission_units.family's own terminology rather than the legacy schema's "transmission".
export default function FilterPanel(props: FilterPanelProps) {
  return (
    <div className="filter-panel">
      <FilterGroupBlock title="Body Type" options={props.bodyOptions} counts={props.bodyCounts} selected={props.bodySelected} onToggle={props.onToggleBody} />
      <FilterGroupBlock title="Fuel" options={props.fuelOptions} counts={props.fuelCounts} selected={props.fuelSelected} onToggle={props.onToggleFuel} />
      <FilterGroupBlock title="Gearbox" options={props.gearboxOptions} counts={props.gearboxCounts} selected={props.gearboxSelected} onToggle={props.onToggleGearbox} />
      <FilterGroupBlock title="Drivetrain" options={props.drivetrainOptions} counts={props.drivetrainCounts} selected={props.drivetrainSelected} onToggle={props.onToggleDrivetrain} />

      <div className="filter-group">
        <div className="filter-group-title">Budget (€)</div>
        <div className="budget-inputs">
          <input
            type="number" inputMode="numeric" placeholder="Min"
            value={props.priceMin ?? ""}
            onChange={(e) => props.onChangePriceMin(e.target.value)}
            className="opt-btn budget-input"
          />
          <span>–</span>
          <input
            type="number" inputMode="numeric" placeholder="Max"
            value={props.priceMax ?? ""}
            onChange={(e) => props.onChangePriceMax(e.target.value)}
            className="opt-btn budget-input"
          />
        </div>
      </div>

      <details className="filter-brand">
        <summary>
          <span aria-hidden="true">{"\u{1F3F7}️"}</span>
          <span>Brand{props.brandSelected.length ? ` (${props.brandSelected.length} selected)` : ""}</span>
          <span className="brand-chevron" aria-hidden="true">{"▾"}</span>
        </summary>
        {props.brandOptions.map((o) => {
          const count = props.brandCounts[o.slug] ?? 0;
          const isSelected = props.brandSelected.includes(o.slug);
          const dead = count === 0 && !isSelected;
          return (
            <label key={o.slug} className={`filter-opt${dead ? " dead" : ""}`}>
              <input type="checkbox" checked={isSelected} disabled={dead} onChange={() => props.onToggleBrand(o.slug)} />
              <div className="filter-opt-body">
                <div className="filter-opt-head">
                  <span>{o.label}</span>
                  <span className="filter-count">{count}</span>
                </div>
              </div>
            </label>
          );
        })}
      </details>
    </div>
  );
}
