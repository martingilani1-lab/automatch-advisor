"use client";

// Wear & tear + known faults panel on the Costs tab (Martin, 2026-11-12, revised 2026-11-14).
// All maths is in ./lib/repairBuffer.ts (pure, tested); this only displays a RepairBuffer.
//
// Two blocks, deliberately different:
//   - "Wear & tear": parts that will need replacing (tyres, brakes, 12 V battery). These are in
//     the yearly total, so they show a yearly figure.
//   - "Known faults": faults some cars of this model get. These are NOT in the yearly total and
//     never show a per-year amount -- the owner who meets one pays the whole repair at once, so
//     the panel shows the one-off repair price, how often it happens in words, and the check
//     that settles it before buying (Martin, 2026-11-14).
// Figures are rounded to €10: the inputs are estimates, and €585.50 would claim a precision
// the data doesn't have. <details> gives the accordion keyboard / screen-reader behaviour for
// free, with no state.

import type { FaultLikelihood, PossibleFault, RepairBuffer as RepairBufferData } from "./lib/repairBuffer";

interface RepairBufferProps {
  buffer: RepairBufferData;
  annualKm: number;
  vehicleYear: number | null;
}

const groupDigits = (n: number) => Math.round(n).toLocaleString("en-US").replace(/,/g, " ");
const eur10 = (n: number) => `€${groupDigits(Math.round(n / 10) * 10)}`;
const eur = (n: number) => `€${groupDigits(n)}`;

// Same colours as the Known faults badges in CarDetail.tsx (FAULT_ITEM_SEVERITY_COLORS).
const SEVERITY: Record<string, { label: string; color: string }> = {
  critical: { label: "Serious", color: "#f44336" },
  moderate: { label: "Moderate", color: "#ff9800" },
  minor: { label: "Minor", color: "#4a9eff" },
};

const LIKELIHOOD: Record<FaultLikelihood, { label: string; tip: string }> = {
  rare: { label: "Rare", tip: "Fewer than 1 in 100 cars of this model a year." },
  occasional: { label: "Occasional", tip: "About 1 to 5 in 100 cars of this model a year." },
  common: { label: "Common", tip: "More than 5 in 100 cars of this model a year." },
  unknown: { label: "How often: not known", tip: "Owners report it, but there is no reliable figure for how often it happens." },
};

function Tip({ text }: { text: string }) {
  return (
    <span className="rb-tip" tabIndex={0} role="note" aria-label={text} title={text}>
      i
    </span>
  );
}

function repairCost(f: PossibleFault): string {
  if (f.costMin == null || f.costMax == null) return "Repair price not known yet";
  return f.costMin === f.costMax ? `Repair about ${eur(f.costMin)}` : `Repair ${eur(f.costMin)}–${eur(f.costMax)}`;
}

export default function RepairBuffer({ buffer, annualKm, vehicleYear }: RepairBufferProps) {
  if (buffer.wear.length === 0 && buffer.possibleFaults.length === 0) return null;

  return (
    <section className="rb" aria-label="Wear and known faults">
      {buffer.wear.length > 0 && (
        <div className="rb-head">
          <div className="cgrid-label">
            Wear &amp; tear{" "}
            <Tip text="Parts that will need replacing while you own the car, spread over their usual life. Already included in the yearly total above." />
          </div>
          <div className="rb-total">
            {eur10(buffer.wearYearly)}<span className="rb-total-unit"> / year</span>
          </div>
          <div className="tg">
            About {eur10(buffer.wearYearly / 12)} a month at {groupDigits(annualKm)} km a year
          </div>
          <ul className="rb-items">
            {buffer.wear.map((w) => (
              <li key={`${w.kind}-${w.title}`} className="rb-item" title={w.fault ?? undefined}>
                <div className="rb-item-head">
                  <span className="rb-item-title">{w.title}</span>
                  <span className="rb-item-val">{eur10(w.yearly)}<span className="tg"> / year</span></span>
                </div>
                <div className="tg">{eur(w.costEur)} {w.kind === "km" ? "a pair" : "each time"} · {w.basis}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {buffer.possibleFaults.length > 0 && (
        <div className="rb-group">
          <div className="cgrid-label">
            Known faults on this model{" "}
            <Tip text="Faults that some cars of this model get. They are not in the yearly total: most owners never meet them, and whoever does pays the repair at once." />
          </div>
          <ul className="rb-items">
            {buffer.possibleFaults.map((f) => {
              const sev = f.severity ? SEVERITY[f.severity] : null;
              const how = LIKELIHOOD[f.likelihood];
              return (
                <li key={f.title} className="rb-item" title={f.fault}>
                  <div className="rb-item-head">
                    <span className="rb-item-title">{f.title}</span>
                    {sev && (
                      <span className="rb-sev" style={{ color: sev.color, borderColor: sev.color }}>{sev.label}</span>
                    )}
                  </div>
                  <div className="tg">
                    {repairCost(f)} · <span title={how.tip}>{how.label}</span>
                  </div>
                  {f.prePurchaseCheck && <p className="rb-check"><strong>Before you buy:</strong> {f.prePurchaseCheck}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <details className="rb-how">
        <summary>How did we calculate this?</summary>
        <div className="rb-how-body">
          <div className="sub-label">Wear &amp; tear: spread over the year</div>
          <p>
            Some parts wear out on every car, so their cost is certain to come — only the timing
            varies. We spread each replacement over its usual life, the way fleet managers
            budget running costs: a part that costs €250 and lasts about 4 years is €62 a year.
            Tyres follow your mileage: a pair that lasts 20 000 km costs you three-quarters of a
            pair a year at 15 000 km.
          </p>

          <div className="sub-label">Known faults: shown as one-off bills</div>
          <p>
            A fault is different: most cars never get it, and the one that does needs the whole
            repair at once. Dividing a €5 000 repair into a few euros a year would look
            reassuring and tell you nothing, so we don&apos;t. Instead you see what the repair
            costs, how often the fault turns up on this model, and — where there is one — the
            check that tells you before buying whether the car you&apos;re looking at is
            affected.
          </p>

          <div className="sub-label">Where the figures come from</div>
          <p>
            Faults and lifespans come from manufacturer service bulletins and recalls,
            roadworthiness-test statistics (TÜV), owner reports and our own experience of the
            Slovak and Czech used-car market. Prices are typical out-of-warranty prices at
            independent garages in Slovakia and the Czech Republic, rounded to €10.
            {vehicleYear ? ` Faults limited to certain build years are shown only for the year you picked (${vehicleYear}).` : ""}
          </p>

          <div className="sub-label">Not included</div>
          <ul className="rb-how-list">
            {buffer.notThisYear.map((n) => (
              <li key={n.title}>{n.title} — affects cars built {n.years} only.</li>
            ))}
            <li>Routine servicing, insurance and inspections — they are separate lines above.</li>
            <li>Accident damage, and anything still covered by a warranty.</li>
          </ul>

          <p className="tg">
            All figures are estimates for planning, not quotes or guarantees. An inspection by an
            independent garage tells you more about one particular car than any average can.
          </p>
        </div>
      </details>
    </section>
  );
}
