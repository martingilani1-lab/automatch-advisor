import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carPriceMax, getConsumptionForFuel, getPowerForFuel } from "@/app/lib/carFields";

const fmtK = (v: number) => (v >= 1000 ? Math.round(v / 1000) + "k" : String(v));

// Fixed-width fields in a monospace font is what makes the columns line up
// down the list — this is not just string formatting, the alignment is the point.
function buildSpecLine(c: CarData, fuelContext: string): string {
  const price = `€${fmtK(carPriceMin(c))}–${fmtK(carPriceMax(c))}`;
  const isElectric = fuelContext === "electric";
  const cons = getConsumptionForFuel(c, fuelContext);
  const consStr = cons != null ? `${cons}${isElectric ? "kWh" : "L"}/100` : "—";
  const power = getPowerForFuel(c, fuelContext);
  const powerStr = power != null ? `${power}kW` : "—";
  // Gearbox: raw transmissions.specific_type strings, as-is — no unit-name normalisation.
  const gearbox = (c.transmissions || []).filter(Boolean).join(" / ") || "—";
  // Drivetrain: raw engines.drivetrain values, as-is — no drivetrain_systems table yet.
  const drivetrain = c.drivetrains && c.drivetrains.length > 0 ? c.drivetrains.join("/") : "—";
  return [
    price.padEnd(14),
    consStr.padEnd(12),
    powerStr.padEnd(9),
    gearbox.padEnd(28),
    drivetrain,
  ].join("");
}

interface CarRowProps {
  car: CarData;
  fuelContext: string;
}

export default function CarRow({ car, fuelContext }: CarRowProps) {
  return (
    <div className="car-row">
      <div className="row-photo" aria-hidden="true">{"\u{1F4F7}"}</div>
      <div className="row-main">
        <div className="cmake">{car.make}</div>
        <div className="cmodel">{car.model}</div>
        <div className="cgen">{car.gen} {"·"} {car.years}</div>
        <div className="row-spec">{buildSpecLine(car, fuelContext)}</div>
      </div>
    </div>
  );
}
