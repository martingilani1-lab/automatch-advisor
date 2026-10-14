import type { CatalogFault } from "../lib/types";
import type { EngineGroup } from "../lib/groupConfigurations";
import { countGaps, type GapField } from "../lib/gaps";
import { cylindersLabel } from "../lib/cylindersLabel";
import Field from "./ui/field";
import Badge from "./ui/badge";
import Chips from "./ui/chips";
import ProsConsList from "./ui/pros-cons-list";
import FaultsList from "./ui/faults-list";
import Rating from "./ui/rating";
import SectionGapsBadge from "./SectionGapsBadge";

interface EnginePanelProps {
  group: EngineGroup;
  faults: CatalogFault[];
  gapsMode: boolean;
}

// Engines and gearboxes are each their own top-level section (see EngineList.tsx/
// GearboxList.tsx) -- a gearbox's own rating/pros/cons/faults describe the unit itself, not
// any one engine pairing, so it's never nested here. Per-configuration numeric facts
// (consumption, performance, EV figures) are deferred to their own dedicated page, not shown
// here either.
export default function EnginePanel({ group, faults, gapsMode }: EnginePanelProps) {
  const { engine } = group;

  // Display rules: a chain's replacement interval and a conventional (non-hybrid) engine's
  // hybrid system are both NULL by design, not missing data -- labeled plainly instead of
  // flagged as a gap. A belt/gear engine with no replacement interval recorded is still a
  // real gap (belts/gears DO have a fixed interval).
  const timingReplacementValue =
    engine.timingReplacementKm != null
      ? `${engine.timingReplacementKm} km`
      : engine.timingType === "chain"
        ? "No fixed interval"
        : null;
  const hybridSystemValue = engine.hybridType ?? "Conventional";

  // Reliability rating renders as the 5-dot Rating indicator below, not a Field row -- kept
  // out of this list so countGaps doesn't double-count it against Rating's own null check.
  const engineFields: GapField[] = [
    { label: "Code", value: engine.code },
    { label: "Displacement", value: engine.displacementCc != null ? `${engine.displacementCc} cm³` : null },
    { label: "Power", value: `${engine.powerKw} kW` },
    { label: "Torque", value: engine.torqueNm != null ? `${engine.torqueNm} Nm` : null },
    { label: "Cylinders", value: cylindersLabel(engine.cylinders) },
    { label: "Emission standard", value: engine.emissionStandard },
    { label: "Timing type", value: engine.timingType },
    { label: "Timing replacement", value: timingReplacementValue },
    { label: "Oil capacity", value: engine.engineOilCapacityLiters != null ? `${engine.engineOilCapacityLiters} L` : null },
    { label: "Hybrid system", value: hybridSystemValue },
  ];

  // catalog_component_faults keys a fault to EITHER an engine OR a unit, never a vehicle.
  const engineFaults = faults.filter((f) => f.engineId === engine.id);
  const totalGaps = countGaps(engineFields) + (engine.reliabilityRating == null ? 1 : 0);

  // Tire sizes are per-configuration -- union across every config this engine actually uses,
  // deduped by (tireSize, isStandard) so the same size offered on two bodies doesn't repeat.
  const tireSizeMap = new Map<string, { tireSize: string; isStandard: boolean }>();
  for (const c of group.configs) {
    for (const t of c.tireSizes) tireSizeMap.set(`${t.tireSize}:${t.isStandard}`, t);
  }
  const tireSizes = [...tireSizeMap.values()];

  return (
    <div
      id={`engine-${engine.id}`}
      className="flex flex-col gap-4 rounded-xl border border-white/5 bg-panel p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset] hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-center gap-2">
        {/* Display-only convention: "<display_name> (<code>) <power_kw> kW", same as
            Browse & Compare's own engine labels -- never changes display_name itself. */}
        <h3 className="text-base font-medium text-primary">
          Engine — {engine.displayName ? `${engine.displayName} (${engine.code}) ${engine.powerKw} kW` : `${engine.code} ${engine.powerKw} kW`}
        </h3>
        <SectionGapsBadge count={totalGaps} />
      </div>
      <Chips items={group.bodyNames} />

      <div className="rounded-lg bg-panel-2 p-4">
        {engineFields.map((f) => (
          <Field key={f.label} label={f.label} value={f.value} gapsMode={gapsMode} />
        ))}
        <Rating value={engine.reliabilityRating} label="Reliability" />
        <ProsConsList pros={engine.pros} cons={engine.cons} gapsMode={gapsMode} />
        <FaultsList faults={engineFaults} gapsMode={gapsMode} />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-sm font-medium text-primary">Tire sizes</p>
          <SectionGapsBadge count={tireSizes.length === 0 ? 1 : 0} />
        </div>
        {tireSizes.length === 0 ? (
          gapsMode ? (
            <Badge variant="missing">no tire sizes recorded</Badge>
          ) : null
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tireSizes.map((t, i) => (
              <li key={i}>
                <Badge variant={t.isStandard ? "default" : "accent"}>
                  {t.tireSize}
                  {!t.isStandard && " (optional)"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
