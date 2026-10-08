import type { CatalogBodyDimensions } from "../lib/types";
import { countGaps, type GapField } from "../lib/gaps";
import Field from "./ui/field";
import SectionGapsBadge from "./SectionGapsBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface BodyDimensionsTabsProps {
  bodies: CatalogBodyDimensions[];
  gapsMode: boolean;
}

function mm(n: number | null): string | null {
  return n == null ? null : `${n} mm`;
}
function kg(n: number | null): string | null {
  return n == null ? null : `${n} kg`;
}
function liters(n: number | null): string | null {
  return n == null ? null : `${n} L`;
}

function fieldsFor(b: CatalogBodyDimensions): GapField[] {
  return [
    { label: "Length", value: mm(b.lengthMm) },
    { label: "Width", value: mm(b.widthMm) },
    { label: "Height", value: mm(b.heightMm) },
    { label: "Ground clearance", value: mm(b.groundClearanceMm) },
    { label: "Curb weight", value: kg(b.curbWeightKg) },
    { label: "Boot capacity", value: liters(b.bootCapacityLiters) },
    { label: "Boot capacity (max)", value: liters(b.bootMaxLiters) },
    { label: "Gross vehicle weight", value: kg(b.grossVehicleWeightKg) },
    { label: "Payload", value: kg(b.payloadKg) },
    { label: "Fuel tank", value: liters(b.fuelTankCapacityLiters) },
    { label: "Seats", value: b.seatsCount },
  ];
}

// Renders one tab per body actually present in this phase's phase_body_dimensions rows --
// never a hardcoded count (Audi A4 B9 has 2, Golf VII 5G has 3).
export default function BodyDimensionsTabs({ bodies, gapsMode }: BodyDimensionsTabsProps) {
  if (bodies.length === 0) return null;
  const totalGaps = countGaps(bodies.flatMap(fieldsFor));

  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium text-catalog-text">Body &amp; dimensions</h2>
        <SectionGapsBadge count={totalGaps} />
      </div>
      <Tabs defaultValue={bodies[0].bodyTypeId} className="mt-2">
        <TabsList>
          {bodies.map((b) => (
            <TabsTrigger key={b.bodyTypeId} value={b.bodyTypeId}>
              {b.bodyName}
            </TabsTrigger>
          ))}
        </TabsList>
        {bodies.map((b) => (
          <TabsContent key={b.bodyTypeId} value={b.bodyTypeId}>
            <div className="rounded-lg border border-catalog-border bg-catalog-surface p-4">
              {fieldsFor(b).map((f) => (
                <Field key={f.label} label={f.label} value={f.value} gapsMode={gapsMode} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
