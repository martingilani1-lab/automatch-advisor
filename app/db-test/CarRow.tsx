import { useState } from "react";
import Image from "next/image";

import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carPriceMax, carRel, carMileage, carModelBase, REL_COLORS, originLine, bodyLabel } from "@/app/lib/carFields";
import { matchesFuelOption } from "@/app/db-test/lib/filters";

// Neutral car-silhouette placeholder (zinc-700 fill) for a phase with no catalog_media row
// yet -- never a broken image, same fixed 16:9 box as a real photo so the row never reflows.
function CarSilhouette() {
  return (
    <svg className="row-photo-placeholder" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h.5a1.5 1.5 0 0 1 1.5 1.5V16a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a1 1 0 0 1-1-1v-3.5A1.5 1.5 0 0 1 4.5 11H5zm2.1-4L5.9 11h12.2l-1.2-4H7.1zM7 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
    </svg>
  );
}

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
  // Same "track the URL that failed" rationale as CarHero -- a different car's row reusing
  // this component instance (list re-render, not remount) must not stay stuck on a stale
  // broken-image fallback.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = car.mainImageUrl && failedUrl !== car.mainImageUrl;

  return (
    <div
      className="car-row"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
    >
      <div className="row-photo">
        {showPhoto ? (
          <Image
            src={car.mainImageUrl!}
            alt={`${car.make} ${carModelBase(car)}`}
            fill
            sizes="96px"
            loading="lazy"
            onError={() => setFailedUrl(car.mainImageUrl!)}
          />
        ) : (
          <CarSilhouette />
        )}
      </div>
      <div className="row-main">
        <div className="model-row">
          <span className="cmake">{car.make}</span>
          <span className="cmodel">{carModelBase(car)}</span>
        </div>
        {car.phaseLabel && <div className="cphase">{car.phaseLabel}</div>}
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
