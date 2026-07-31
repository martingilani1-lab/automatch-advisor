import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carPriceMax, carRel, REL_COLORS, originLine } from "@/app/lib/carFields";

const fmtK = (v: number) => (v >= 1000 ? Math.round(v / 1000) + "k" : String(v));

interface CarRowProps {
  car: CarData;
  onOpen: () => void;
}

// Row face is major info only — make/model/gen, price range, body type, fuel
// tags, reliability pill. Per-engine power/consumption/gearbox/drivetrain
// don't belong here (a multi-engine car has no single correct value) — those
// live per-variant in the full-screen detail view opened by clicking the row.
export default function CarRow({ car, onOpen }: CarRowProps) {
  const price = `€${fmtK(carPriceMin(car))}–${fmtK(carPriceMax(car))}`;
  const rel = carRel(car);

  // reliabilityTiers/reliabilityWorst come straight off /api/cars — no
  // /api/detail dependency, so the list can show the honest "Poor–Good"
  // spread instead of bestRel's optimistic single tier, same as CarDetail.
  const relTiers = car.reliabilityTiers ?? [];
  const isRelSpread = relTiers.length > 1;
  const relLabel = isRelSpread ? `${relTiers[0]}–${relTiers[relTiers.length - 1]}` : rel;
  const relColor = REL_COLORS[isRelSpread ? (car.reliabilityWorst || relTiers[0]) : rel] || "#888";
  const relTitle = isRelSpread ? `Reliability by engine: ${relTiers.join(" · ")}` : undefined;

  return (
    <div
      className="car-row"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
    >
      <div className="row-photo" aria-hidden="true">{"\u{1F4F7}"}</div>
      <div className="row-main">
        <div className="cmake">{car.make}</div>
        <div className="cmodel">{car.model}</div>
        <div className="cgen">{originLine(car)}</div>
        <div className="row-tags">
          <span className="cfuel-tag">{car.body}</span>
          {(car.fuel || []).map((f) => <span key={f} className="cfuel-tag">{f}</span>)}
        </div>
      </div>
      <div className="row-side">
        <div className="row-price" title={price}>{price}</div>
        <span className="rel-pill" title={relTitle} style={{ background: relColor + "22", color: relColor, border: `1px solid ${relColor}44` }}>{relLabel}</span>
      </div>
    </div>
  );
}
