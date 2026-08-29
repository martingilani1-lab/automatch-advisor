import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carPriceMax, carRel, carMileage, REL_COLORS, originLine, bodyLabel } from "@/app/lib/carFields";
import { matchesFuelOption } from "@/app/lib/carFilters";
import { LIFESTYLE_TAGS } from "@/app/lib/tags";

const fmtK = (v: number) => (v >= 1000 ? Math.round(v / 1000) + "k" : String(v));

// Glue the last space to a non-breaking one so the final token (e.g. "km")
// always wraps together with the number right before it — CSS line-wrapping
// can't otherwise guarantee "km" won't end up alone on its own line when the
// range above it wraps. Display-only formatting; the underlying value/string
// from the API is untouched.
const glueLastWord = (s: string) => {
  const i = s.lastIndexOf(" ");
  return i === -1 ? s : s.slice(0, i) + " " + s.slice(i + 1);
};

interface CarRowProps {
  car: CarData;
  onOpen: () => void;
  selectedTags: string[];
  selectedFuel: string[];
}

// Row face is major info only — make/model/gen, price range, body type, fuel
// tags, reliability pill. Per-engine power/consumption/gearbox/drivetrain
// don't belong here (a multi-engine car has no single correct value) — those
// live per-variant in the full-screen detail view opened by clicking the row.
export default function CarRow({ car, onOpen, selectedTags, selectedFuel }: CarRowProps) {
  const price = `€${fmtK(carPriceMin(car))}–${fmtK(carPriceMax(car))}`;
  const mileage = carMileage(car);
  const rel = carRel(car);

  // reliabilityTiers/reliabilityWorst come straight off /api/cars — no
  // /api/detail dependency, so the list can show the honest "Poor–Good"
  // spread instead of bestRel's optimistic single tier, same as CarDetail.
  const relTiers = car.reliabilityTiers ?? [];
  const isRelSpread = relTiers.length > 1;
  const relLabel = isRelSpread ? `${relTiers[0]}–${relTiers[relTiers.length - 1]}` : rel;
  const relColor = REL_COLORS[isRelSpread ? (car.reliabilityWorst || relTiers[0]) : rel] || "#888";
  const relTitle = isRelSpread ? `Reliability by engine: ${relTiers.join(" · ")}` : undefined;

  // Under the hard-filter tag model, a match badge ("N/M") would be
  // meaningless — every visible car already matches ALL selected tags by
  // definition (matchesTagGroup, carFilters.ts). Instead show the car's OWN
  // lifestyle tags as small chips, highlighting whichever are currently
  // selected. Cars with no tags (322/334 today — only 12 are hand-tagged so
  // far) render nothing here, not an empty row.
  const carTags = car.tags ?? [];

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
        </div>
        {carTags.length > 0 && (
          <div className="row-tag-chips">
            {carTags.map((slug) => {
              const t = LIFESTYLE_TAGS.find((lt) => lt.slug === slug);
              if (!t) return null;
              const isMatch = selectedTags.includes(slug);
              return (
                <span key={slug} className={`row-tag-chip${isMatch ? " match" : ""}`}>
                  {t.emoji} {t.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <span className="rel-pill row-rel-pill" title={relTitle} style={{ background: relColor + "22", color: relColor, border: `1px solid ${relColor}44` }}>{relLabel}</span>
      <div className="row-side">
        <div className="row-price" title={price}>{price}</div>
        {mileage && <div className="row-mileage" title={mileage}>{glueLastWord(mileage)}</div>}
      </div>
    </div>
  );
}
