"use client";

// "Recommended annual buffer" panel on the Costs tab (Martin, 2026-11-12): what to keep aside each
// year for wear and repairs on THIS configuration, with a "How did we calculate this?" accordion.
// All maths is in ./lib/repairBuffer.ts (pure, tested); this only displays a RepairBuffer.
//
// Tone of the copy is deliberate: the figure is an average across many cars (the expected-cost
// method fleet operators budget with), not a list of repairs this car will need. The rare,
// expensive faults are where a buyer is most likely to read a buffer as a prediction, so the
// accordion says plainly that most owners never meet them. <details> gives the accordion its
// keyboard and screen-reader behaviour for free, with no state to keep.

import type { BufferItem, BufferItemKind, RepairBuffer as RepairBufferData } from "./lib/repairBuffer";

interface RepairBufferProps {
  buffer: RepairBufferData;
  annualKm: number;
  vehicleYear: number | null;
}

const fmtEur = (n: number) => `€${Math.round(n).toLocaleString("en-US").replace(/,/g, " ")}`;
const fmtKm = (n: number) => `${n.toLocaleString("en-US").replace(/,/g, " ")} km`;

const GROUPS: { kind: BufferItemKind; label: string; tip: string }[] = [
  {
    kind: "wear-time",
    label: "Wear by time",
    tip: "Parts that age whether or not you drive: the replacement cost spread over their usual life. A €250 part that lasts about 4 years costs about €62 a year.",
  },
  {
    kind: "wear-km",
    label: "Wear by mileage",
    tip: "Parts that wear with every kilometre: the cost of a pair of tyres × the share of their life you use up in a year at your mileage.",
  },
  {
    kind: "risk",
    label: "Repair risk",
    tip: "Known faults that hit some cars, not all: the repair price × the share of cars that meet the fault in a year. Most owners never pay these; the small yearly amount covers those who do.",
  },
];

function Tip({ text }: { text: string }) {
  return (
    <span className="rb-tip" tabIndex={0} role="note" aria-label={text} title={text}>
      i
    </span>
  );
}

function ItemRow({ item }: { item: BufferItem }) {
  return (
    <li className="rb-item" title={item.fault ?? undefined}>
      <div className="rb-item-head">
        <span className="rb-item-title">{item.title}</span>
        <span className="rb-item-val">{fmtEur(item.yearly)}<span className="tg"> / year</span></span>
      </div>
      <div className="tg">
        {fmtEur(item.costEur)} {item.kind === "wear-km" ? "a pair" : item.kind === "risk" ? "repair" : "replacement"} · {item.basis}
      </div>
    </li>
  );
}

export default function RepairBuffer({ buffer, annualKm, vehicleYear }: RepairBufferProps) {
  if (!buffer.hasFaultData && buffer.tyresYearly == null) return null;

  const checks = buffer.items.filter((i) => i.prePurchaseCheck);
  const example = buffer.items.find((i) => i.kind === "risk") ?? buffer.items[0];

  return (
    <section className="rb" aria-labelledby="rb-title">
      <div className="rb-head">
        <div className="cgrid-label" id="rb-title">
          Recommended annual buffer{" "}
          <Tip text="The amount to put aside each year so wear and repairs don't come as a surprise. It is already included in the yearly total above (Unexpected repairs + Tyres)." />
        </div>
        <div className="rb-total">
          {fmtEur(buffer.yearlyTotal)}<span className="rb-total-unit"> / year</span>
        </div>
        <div className="tg">
          About {fmtEur(buffer.yearlyTotal / 12)} a month · for a {vehicleYear ?? "typical"}{vehicleYear ? "-built" : ""} car driven {fmtKm(annualKm)} a year
        </div>
      </div>

      {GROUPS.map((g) => {
        const items = buffer.items.filter((i) => i.kind === g.kind);
        if (items.length === 0) return null;
        return (
          <div key={g.kind} className="rb-group">
            <div className="sub-label">
              {g.label} <Tip text={g.tip} />
            </div>
            <ul className="rb-items">
              {items.map((i) => <ItemRow key={`${i.kind}-${i.title}`} item={i} />)}
            </ul>
          </div>
        );
      })}

      {checks.length > 0 && (
        <div className="rb-checks">
          <div className="cgrid-label">Before you buy</div>
          {checks.map((i) => (
            <p key={i.title} className="rb-check">
              <strong>{i.title}</strong> ({fmtEur(i.costEur)} repair): {i.prePurchaseCheck}
            </p>
          ))}
        </div>
      )}

      <details className="rb-how">
        <summary>How did we calculate this?</summary>
        <div className="rb-how-body">
          <p>
            We budget the way fleet operators and leasing companies do. Instead of guessing which
            repair one particular car will need, they set aside a small, steady amount per car
            that covers the average cost of wear and repairs across many cars of the same model.
            Over a fleet, the averages are reliable; for a single car they smooth an unpredictable
            bill into a predictable monthly sum.
          </p>
          <p>
            <strong>This is not a list of repairs your car will need.</strong> Most owners never
            meet the rare faults below. The buffer simply means that if one does happen, the money
            is already there.
          </p>

          <div className="sub-label">Three kinds of cost, one idea</div>
          <ul className="rb-how-list">
            <li><strong>Wear by time</strong> — replacement price ÷ usual life in years.</li>
            <li><strong>Wear by mileage</strong> — your yearly kilometres ÷ the part&apos;s life in km × its price.</li>
            <li><strong>Repair risk</strong> — repair price × the share of cars that meet the fault in a year.</li>
          </ul>
          {example && example.kind === "risk" && (
            <p className="tg">
              Example: {example.title.toLowerCase()} costs about {fmtEur(example.costEur)} to repair
              and affects roughly {example.basis.replace(" a year", "")} of cars a year, so the buffer
              keeps {fmtEur(example.yearly)} a year for it.
            </p>
          )}

          <div className="sub-label">Where the figures come from</div>
          <p>
            Faults are the ones known for this model: manufacturer service bulletins and recalls,
            roadworthiness-test statistics (TÜV), owner reports, and our own experience of the
            Slovak and Czech used-car market. Repair prices are typical out-of-warranty prices at
            independent garages in Slovakia and the Czech Republic; where we have a range, we use
            its middle. Faults that only affected certain build years count only for those years.
          </p>

          <div className="sub-label">What the buffer leaves out</div>
          <ul className="rb-how-list">
                {buffer.unpriced.map((u) => (
                  <li key={u.title} title={u.fault}>
                    {u.title} — known fault, but we don&apos;t have a reliable {u.missing === "cost" ? "repair price" : u.missing === "probability" ? "failure rate" : "price or failure rate"} yet, so it isn&apos;t in the figure.
                  </li>
                ))}
                {buffer.notThisYear.map((n) => (
                  <li key={n.title}>{n.title} — affects cars built {n.years}, not a {vehicleYear} car.</li>
                ))}
                <li>Routine servicing, insurance and inspections — they are separate lines in the yearly total.</li>
                <li>Accident damage and anything still covered by a warranty.</li>
              </ul>

          <p className="tg">
            All figures are estimates for planning, not quotes or guarantees. A pre-purchase
            inspection by an independent garage tells you more about one specific car than any
            average can.
          </p>
        </div>
      </details>
    </section>
  );
}
