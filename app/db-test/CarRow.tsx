import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carPriceMax, carRel, carMileage, REL_COLORS, originLine, bodyLabel } from "@/app/lib/carFields";
import { matchesFuelOption } from "@/app/db-test/lib/filters";

const fmtK = (v: number) => (v >= 1000 ? Math.round(v / 1000) + "k" : String(v));

const glueLastWord = (s: string) => {
  const i = s.lastIndexOf(" ");
  return i === -1 ? s : s.slice(0, i) + " " + s.slice(i + 1);
};

interface CarRowProps {
  car: CarData;
  onOpen: () => void;
  selectedFuel: string[];
}

// Copied from app/prehlad/CarRow.tsx, same layout/classes -- drops the lifestyle-tag-chips
// block (carTags) entirely, since catalog_ has no tags vocabulary to source it from. The
// reliability pill still renders (rel = "—", REL_COLORS falls back to gray automatically for
// an unknown key) rather than being cut, since catalog_ cards do carry other real content
// around it (price/mileage/fuel) worth keeping in the same row shape.
export default function CarRow({ car, onOpen, selectedFuel }: CarRowProps) {
  const price = `€${fmtK(carPriceMin(car))}–${fmtK(carPriceMax(car))}`;
  const mileage = carMileage(car);
  const rel = carRel(car);
  const relColor = REL_COLORS[rel] || "#888";

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
          <span className="row-body-label">{bodyLabel(car.body)}</span>
          {(car.fuel || []).length > 0 && <span className="row-tags-sep">{"·"}</span>}
          {(car.fuel || []).map((f) => {
            const isMatch = selectedFuel.length > 0 && selectedFuel.some((sel) => matchesFuelOption(f, sel));
            return <span key={f} className={`cfuel-tag${isMatch ? " match" : ""}`}>{f}</span>;
          })}
          {car.fuelTankLiters != null && (
            <>
              <span className="row-tags-sep">{"·"}</span>
              <span className="cfuel-tag" title="Fuel tank capacity (phase_body_dimensions)">{car.fuelTankLiters}L tank</span>
            </>
          )}
        </div>
      </div>
      <span className="rel-pill row-rel-pill" style={{ background: relColor + "22", color: relColor, border: `1px solid ${relColor}44` }}>{rel}</span>
      <div className="row-side">
        <div className="row-price" title={price}>{price}</div>
        {mileage && <div className="row-mileage" title={mileage}>{glueLastWord(mileage)}</div>}
      </div>
    </div>
  );
}
