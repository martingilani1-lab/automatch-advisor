"use client";

// Total Cost of Ownership calculator: one mileage slider driving a per-category yearly
// breakdown plus monthly/yearly totals. All math lives in ./lib/tco.ts (pure, tested); this
// component only owns the slider state and recomputes via useMemo when it or the car changes.
// Markup reuses this page's existing native classes (.sub-label, .tg, .cgrid-*) -- no new
// styling was added with it.

import { useMemo, useState } from "react";

import type { TcoInput } from "./lib/tco";
import { ANNUAL_KM_STEP, DEFAULT_ANNUAL_KM, MAX_ANNUAL_KM, MIN_ANNUAL_KM, calcTco } from "./lib/tco";

interface TcoCalculatorProps {
  car: TcoInput;
  // Wired later to the external insurance comparison (affiliate) portal. Until then the
  // button renders but does nothing -- deliberately a placeholder, not a fake quote.
  onInsuranceClick?: () => void;
}

const fmtEur = (n: number) => `€${Math.round(n).toLocaleString("en-US").replace(/,/g, " ")}`;
const fmtKm = (n: number) => `${n.toLocaleString("en-US").replace(/,/g, " ")} km`;

export default function TcoCalculator({ car, onInsuranceClick }: TcoCalculatorProps) {
  const [annualKm, setAnnualKm] = useState(DEFAULT_ANNUAL_KM);
  const tco = useMemo(() => calcTco(car, annualKm), [car, annualKm]);

  return (
    <div className="tco">
      <div className="sub-label">{"💶"} Total cost of ownership</div>

      <label className="tco-slider">
        <span className="tg">Annual mileage</span>
        <strong>{fmtKm(annualKm)} / year</strong>
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

      <ul className="tco-lines">
        {tco.lines.map((line) => (
          <li key={line.key} className="tco-line">
            <div>
              <div className="cgrid-label">{line.label}</div>
              <div className="tg">{line.detail}</div>
              {line.key === "insurance" && (
                <button type="button" className="tco-insurance-btn" onClick={onInsuranceClick}>
                  [ Calculate exact insurance ]
                </button>
              )}
            </div>
            <div className="cgrid-val">
              {line.yearly != null ? `${fmtEur(line.yearly)} / year` : <span className="tg">No data</span>}
            </div>
          </li>
        ))}
      </ul>

      <div className="tco-totals">
        <div>
          <div className="cgrid-label">Monthly</div>
          <div className="cgrid-val">{fmtEur(tco.monthlyTotal)}</div>
        </div>
        <div>
          <div className="cgrid-label">Yearly</div>
          <div className="cgrid-val">{fmtEur(tco.yearlyTotal)}</div>
        </div>
      </div>

      {tco.incomplete && (
        <p className="tg">Some categories have no data and are not included in the total.</p>
      )}
      <p className="tg">
        Estimate only: average SK/CZ fuel prices, mid-range tyres and a reliability-based repair
        reserve. Depreciation assumes 10 % of the purchase price per year.
      </p>
    </div>
  );
}
