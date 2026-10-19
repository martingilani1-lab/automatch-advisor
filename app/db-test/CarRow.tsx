import { useState } from "react";
import Image from "next/image";
import { IconGauge, IconGasStation, IconCar4wd } from "@tabler/icons-react";

import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carPriceMax, carRel, carMileage, carModelBase, REL_COLORS, bodyLabel } from "@/app/lib/carFields";
import { matchesFuelOption } from "@/app/db-test/lib/filters";

// One color per stat so the three read apart from each other at a glance, distinct from
// REL_COLORS' tier palette (this isn't a rating scale) -- amber for power, teal for
// consumption, violet for drivetrain. The icon alone carries the color; the value text stays
// neutral/light so three differently-colored lines don't fight for attention against the
// make/model text above them.
const SPEC_ICON_COLORS = { power: "#ffa94d", consumption: "#4dd0e1", drivetrain: "#a78bfa" };

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

// "280000 - 450000 km" / "280000-450000 km" (14 rows use the no-space variant, see TODO.md)
// -> "280k - 450k km" / "280k-450k km" -- replaces each run of digits in place with fmtK's
// shortened form, so it works on both separator styles without needing to parse the string's
// structure at all, and leaves "km" and any punctuation exactly where they already were.
function shortenMileageRange(raw: string): string {
  return raw.replace(/\d{4,}/g, (m) => fmtK(Number(m)));
}

// min===max (a single-engine model) collapses to one value ("66 kW") instead of a
// zero-width range ("66-66 kW"), which would read as a typo rather than "only one engine."
function rangeLabel(min: number | null | undefined, max: number | null | undefined, unit: string, decimals = 0): string | null {
  if (min == null || max == null) return null;
  const fmt = (n: number) => decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
  return min === max ? `${fmt(min)} ${unit}` : `${fmt(min)}–${fmt(max)} ${unit}`;
}

interface CarRowProps {
  car: CarData;
  onOpen: () => void;
  selectedFuel: string[];
}

// Started as a copy of app/prehlad/CarRow.tsx (same layout/classes), drops the lifestyle-
// tag-chips block (carTags) entirely since catalog_ has no tags vocabulary to source it from.
// The reliability tag still renders (rel = "—", REL_COLORS falls back to gray automatically
// for an unknown key) rather than being cut, since catalog_ cards do carry other real content
// around it (price/mileage/fuel) worth keeping in the same row shape.
export default function CarRow({ car, onOpen, selectedFuel }: CarRowProps) {
  const price = `€${fmtK(carPriceMin(car))}–${fmtK(carPriceMax(car))}`;
  const mileage = carMileage(car);
  const rel = carRel(car);
  const relColor = REL_COLORS[rel] || "#888";
  // Falls back to the single primaryBody `car.body` for a car whose bodyNames hasn't been
  // populated (e.g. a stale cached response) rather than rendering nothing.
  const bodyNames = car.bodyNames && car.bodyNames.length > 0 ? car.bodyNames : [car.body];
  const powerRange = rangeLabel(car.minPowerKw, car.maxPowerKw, "kW");
  // kWh/100 km only for a model that's electric-only (every config shares the EV unit) --
  // anything that mixes electric with petrol/diesel configs keeps the l/100km label, same
  // simplification minConsumption/maxConsumption's own blended-unit pool already makes
  // server-side (app/api/db-test/route.ts).
  const isElectricOnly = (car.fuel || []).length === 1 && car.fuel[0] === "electric";
  const consumptionRange = rangeLabel(car.minConsumption, car.maxConsumption, isElectricOnly ? "kWh/100 km" : "l/100 km", 1);
  // "AWD"/"FWD" capability (whichever this model offers, possibly both) -- distinct from the
  // drivetrainSystemNames tags above, which name the specific AWD system (Haldex gen, quattro)
  // rather than just the capability.
  const drivetrainCapability = (car.drivetrains || []).join(", ") || null;
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
        {/* Country of origin dropped from this line -- replaced with the reliability tag,
            placed right before the year range. Best engine tier (app/api/db-test/route.ts),
            "—" when no engine in this phase has a reliability_rating recorded yet. Same
            per-tier REL_COLORS the detail page's badges use, at a lower background/border
            alpha than a solid pill so it reads as a quiet inline label, not a loud badge. */}
        <div className="cgen">
          <span className="row-rel-tag" style={{ background: relColor + "14", color: relColor, border: `1px solid ${relColor}33` }}>{rel}</span>
          {" "}{car.years}
        </div>
        <div className="row-tags">
          {bodyNames.map((b, i) => (
            <span key={b}>
              {i > 0 && <span className="row-tags-sep">{"·"}</span>}
              <span className="row-body-label">{bodyLabel(b)}</span>
            </span>
          ))}
          {(car.fuel || []).length > 0 && <span className="row-tags-sep">{"·"}</span>}
          {(car.fuel || []).map((f) => {
            const isMatch = selectedFuel.length > 0 && selectedFuel.some((sel) => matchesFuelOption(f, sel));
            return <span key={f} className={`cfuel-tag${isMatch ? " match" : ""}`}>{f}</span>;
          })}
          {/* Named AWD system only (quattro, Haldex gen, xDrive...) -- a car with no
              drivetrain_systems config (plain FWD, the vast majority) gets no tag here at
              all, matching what was asked ("if model have quattro or Haldex... option"). */}
          {(car.drivetrainSystemNames || []).map((d) => (
            <span key={d} className="cfuel-tag" title="Drivetrain system">{d}</span>
          ))}
        </div>
        {(powerRange || consumptionRange || drivetrainCapability) && (
          <div className="row-specs">
            {powerRange && (
              <span className="row-spec-item">
                <IconGauge size={16} stroke={1.5} style={{ color: SPEC_ICON_COLORS.power }} />
                <span>{powerRange}</span>
              </span>
            )}
            {consumptionRange && (
              <span className="row-spec-item">
                <IconGasStation size={16} stroke={1.5} style={{ color: SPEC_ICON_COLORS.consumption }} />
                <span>{consumptionRange}</span>
              </span>
            )}
            {drivetrainCapability && (
              <span className="row-spec-item">
                <IconCar4wd size={16} stroke={1.5} style={{ color: SPEC_ICON_COLORS.drivetrain }} />
                <span>{drivetrainCapability}</span>
              </span>
            )}
          </div>
        )}
      </div>
      <div className="row-side">
        <div className="row-price" title={price}>{price}</div>
        {mileage && <div className="row-mileage" title={mileage}>{glueLastWord(shortenMileageRange(mileage))}</div>}
      </div>
    </div>
  );
}
