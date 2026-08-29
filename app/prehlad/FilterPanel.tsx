"use client";

import type { FilterOption } from "@/app/lib/carFilters";

interface FilterGroupProps {
  title: string;
  options: FilterOption[];
  counts: Record<string, number>;
  selected: string[];
  onToggle: (slug: string) => void;
}

// checkbox · label · optional badge · one-line plain-language consequence ·
// live (facet) count. Dead options (count 0 and not currently selected) grey
// out and disable — they never disappear from the list.
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
  transmissionOptions: FilterOption[]; transmissionCounts: Record<string, number>; transmissionSelected: string[]; onToggleTransmission: (s: string) => void;
  drivetrainOptions: FilterOption[]; drivetrainCounts: Record<string, number>; drivetrainSelected: string[]; onToggleDrivetrain: (s: string) => void;
  brandOptions: BrandOption[]; brandCounts: Record<string, number>; brandSelected: string[]; onToggleBrand: (s: string) => void;
  priceMin: number | null; priceMax: number | null;
  onChangePriceMin: (v: string) => void; onChangePriceMax: (v: string) => void;
}

export default function FilterPanel(props: FilterPanelProps) {
  return (
    <div className="filter-panel">
      <FilterGroupBlock title="Body Type" options={props.bodyOptions} counts={props.bodyCounts} selected={props.bodySelected} onToggle={props.onToggleBody} />
      <FilterGroupBlock title="Fuel" options={props.fuelOptions} counts={props.fuelCounts} selected={props.fuelSelected} onToggle={props.onToggleFuel} />
      <FilterGroupBlock title="Transmission" options={props.transmissionOptions} counts={props.transmissionCounts} selected={props.transmissionSelected} onToggle={props.onToggleTransmission} />
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

      {/* Brand: collapsed disclosure (30+ options — always-open would dwarf
          every other group), but same visual weight as the rest: full-size
          rows, group-title-styled summary, no cramped compact treatment. */}
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
