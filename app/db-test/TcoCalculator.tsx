"use client";

// Total Cost of Ownership calculator -- the "Costs" tab. Per CONFIGURATION (engine + gearbox +
// drivetrain): a configuration picker and a mileage slider drive a yearly breakdown that is
// also the chart -- one horizontal bar per category, biggest first, so "what costs me the most"
// reads at a glance. A single series in a single hue (no legend needed; each bar is labelled
// with its own name, € and share). All math lives in ./lib/tco.ts (pure, tested); this
// component only owns the two pieces of UI state and recomputes via useMemo.

import { useMemo, useState } from "react";

import type { CatalogConfig } from "@/app/catalog/lib/types";
import type { TcoKey } from "./lib/tco";
import { ANNUAL_KM_STEP, COUNTRY_COSTS, DEFAULT_ANNUAL_KM, DEFAULT_COUNTRY, MAX_ANNUAL_KM, MIN_ANNUAL_KM, calcTco, rankedLines } from "./lib/tco";
import { buildTcoOptions } from "./lib/tcoOptions";
import { MAX_COST_COMPARE } from "./CostCompare";

interface TcoCalculatorProps {
  configs: CatalogConfig[];
  // The phase's market price range (header price) -- its midpoint is the depreciation base.
  priceMin: number;
  priceMax: number;
  // Representative year of manufacture (middle of the phase's years) for the depreciation curve.
  manufactureYear: number | null;
  // Wired later to the external insurance comparison (affiliate) portal. Until then the
  // button renders but does nothing -- deliberately a placeholder, not a fake quote.
  onInsuranceClick?: () => void;
  // Cross-model cost comparison (CostCompare.tsx): adds THIS car with the configuration
  // currently picked here. `comparedKeys` are the configuration keys of this car already in
  // the comparison; `compareCount` is how many vehicles it holds overall (max 3).
  onAddToCompare?: (configKey: string) => void;
  comparedKeys?: string[];
  compareCount?: number;
}

const fmtEur = (n: number) => `€${Math.round(n).toLocaleString("en-US").replace(/,/g, " ")}`;
const fmtKm = (n: number) => `${n.toLocaleString("en-US").replace(/,/g, " ")} km`;
const pct = (share: number) => `${Math.round(share * 100)} %`;

export default function TcoCalculator({ configs, priceMin, priceMax, manufactureYear, onInsuranceClick, onAddToCompare, comparedKeys = [], compareCount = 0 }: TcoCalculatorProps) {
  // Same order as the Configurations tab: fuel group, then smallest engine first.
  const options = useMemo(() => buildTcoOptions(configs, priceMin, priceMax, manufactureYear), [configs, priceMin, priceMax, manufactureYear]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [annualKm, setAnnualKm] = useState(DEFAULT_ANNUAL_KM);
  const [includeVignette, setIncludeVignette] = useState(false);

  // Falls back to the first option when nothing is picked yet, or when the phase switcher
  // swapped in a configuration list that no longer contains the old pick.
  const option = options.find((o) => o.key === selectedKey) ?? options[0] ?? null;
  const tco = useMemo(() => (option ? calcTco(option.input, annualKm, undefined, undefined, { includeVignette }) : null), [option, annualKm, includeVignette]);
  const ranked = useMemo(() => (tco ? rankedLines(tco) : []), [tco]);

  if (!option || !tco) return <p className="tg">No configurations to calculate.</p>;

  const max = ranked[0]?.yearly ?? 0;
  const missing = tco.lines.filter((l) => l.yearly == null);
  const isInsurance = (k: TcoKey) => k === "insurance";

  return (
    <div className="tco">
      <label className="tco-field">
        <span className="cgrid-label">Configuration</span>
        <select value={option.key} onChange={(e) => setSelectedKey(e.target.value)}>
          {options.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
        <span className="tg">{option.bodies.join(" · ")}</span>
      </label>

      {onAddToCompare && (
        <button
          type="button"
          className="tco-compare-btn"
          disabled={comparedKeys.includes(option.key) || compareCount >= MAX_COST_COMPARE}
          onClick={() => onAddToCompare(option.key)}
        >
          {comparedKeys.includes(option.key)
            ? "✓ In cost comparison"
            : compareCount >= MAX_COST_COMPARE
              ? `Cost comparison full (${MAX_COST_COMPARE})`
              : "+ Compare costs with other models"}
        </button>
      )}

      <label className="tco-field">
        <span className="tco-field-row">
          <span className="cgrid-label">Annual mileage</span>
          <strong>{fmtKm(annualKm)} / year</strong>
        </span>
        <input
          type="range"
          min={MIN_ANNUAL_KM}
          max={MAX_ANNUAL_KM}
          step={ANNUAL_KM_STEP}
          value={annualKm}
          onChange={(e) => setAnnualKm(Number(e.target.value))}
          aria-label="Annual mileage in km"
        />
      </label>

      <label className="tco-check">
        <input type="checkbox" checked={includeVignette} onChange={(e) => setIncludeVignette(e.target.checked)} />
        <span>
          Include annual motorway vignette ({fmtEur(COUNTRY_COSTS[DEFAULT_COUNTRY].vignetteEur)} / year)
          <span className="tg"> · only if you use motorways regularly</span>
        </span>
      </label>

      <div className="tco-totals">
        <div>
          <div className="cgrid-label">Monthly</div>
          <div className="tco-total-val">{fmtEur(tco.monthlyTotal)}</div>
        </div>
        <div>
          <div className="cgrid-label">Yearly</div>
          <div className="tco-total-val">{fmtEur(tco.yearlyTotal)}</div>
        </div>
        {ranked[0] && (
          <div>
            <div className="cgrid-label">Biggest cost</div>
            <div className="tco-total-val">{ranked[0].label} · {pct(ranked[0].share)}</div>
          </div>
        )}
      </div>

      <div className="sub-label">Where the money goes</div>
      <ul className="tco-lines" aria-label="Yearly cost by category, biggest first">
        {ranked.map((line) => (
          <li key={line.key} className="tco-line" title={`${line.label}: ${fmtEur(line.yearly)} / year · ${pct(line.share)} of total`}>
            <div className="tco-line-head">
              <span className="tco-line-label">{line.label}</span>
              <span className="tco-line-val">
                {fmtEur(line.yearly)}<span className="tg"> / year · {pct(line.share)}</span>
              </span>
            </div>
            <div className="tco-bar-track">
              <div className="tco-bar" style={{ width: `${max > 0 ? (line.yearly / max) * 100 : 0}%` }} />
            </div>
            <div className="tg">{line.detail}</div>
            {isInsurance(line.key) && (
              <button type="button" className="tco-insurance-btn" onClick={onInsuranceClick}>
                [ Calculate exact insurance ]
              </button>
            )}
          </li>
        ))}
      </ul>

      {missing.length > 0 && (
        <div className="tco-missing">
          <div className="cgrid-label">Not included in the total (no data yet)</div>
          {missing.map((l) => (
            <div key={l.key} className="tg">{l.label} · {l.detail}</div>
          ))}
        </div>
      )}

      <p className="tg">
        Estimate only: average SK/CZ fuel prices, real-world consumption (official +15 %),
        mid-range tyres, workshop service prices and a repair reserve from the engine, gearbox
        and AWD reliability ratings. Depreciation follows the car&apos;s age (middle of its model years): 15 % a year up to 3 years, 10 % to 8, 5 % to 13, then a flat €200.
      </p>
    </div>
  );
}
