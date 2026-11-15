import type { CatalogFault } from "../lib/types";
import type { EngineGroup } from "../lib/groupConfigurations";
import { countGaps, type GapField } from "../lib/gaps";
import { cylindersLabel } from "../lib/cylindersLabel";
import { POWERTRAIN_EXPLAINERS, powertrainKind } from "../lib/powertrainExplainer";
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

  // An electrified row is a combination of units; the explainer says in plain words how they
  // work together (see powertrainExplainer.ts). A range extender (EREV) is additionally split
  // into two sub-blocks -- the electric drive and the petrol generator -- the same way
  // GearboxPanel nests a drivetrain system as its own block, because one flat list mixing
  // "125 kW" (the motor) with "647 cm³" (the generator) reads as one engine that doesn't exist.
  const kind = powertrainKind(engine);
  const explainer = kind ? POWERTRAIN_EXPLAINERS[kind] : null;
  const isRangeExtender = kind === "EREV";

  const electricDriveFields: GapField[] = [
    { label: "Motor power", value: `${engine.powerKw} kW` },
    { label: "Motor torque", value: engine.torqueNm != null ? `${engine.torqueNm} Nm` : null },
    { label: "Battery (net)", value: engine.ev.batteryCapacityNetKwh != null ? `${engine.ev.batteryCapacityNetKwh} kWh` : null },
    { label: "AC charging", value: engine.ev.maxAcChargingKw != null ? `${engine.ev.maxAcChargingKw} kW` : null },
    { label: "DC charging", value: engine.ev.maxDcChargingKw != null ? `${engine.ev.maxDcChargingKw} kW` : null },
    { label: "Battery cooling", value: thermalLabel(engine.ev.batteryThermalManagement) },
    { label: "Heat pump", value: engine.ev.heatPump },
  ];
  // Time-based oil service (the i3 REx: by the service indicator, every 24 months) is shown
  // as months; a km interval, when a row has one, comes first.
  const m = engine.maintenance;
  const oilIntervalValue =
    [m.oilChangeIntervalKm != null ? `${m.oilChangeIntervalKm} km` : null,
     m.oilChangeIntervalMonths != null ? `${m.oilChangeIntervalMonths} months` : null]
      .filter(Boolean).join(" / ") || null;
  const rangeExtenderFields: GapField[] = [
    { label: "Displacement", value: engine.displacementCc != null ? `${engine.displacementCc} cm³` : null },
    { label: "Cylinders", value: cylindersLabel(engine.cylinders) },
    { label: "Emission standard", value: engine.emissionStandard },
    { label: "Timing type", value: engine.timingType },
    { label: "Timing replacement", value: timingReplacementValue },
    { label: "Oil capacity", value: engine.engineOilCapacityLiters != null ? `${engine.engineOilCapacityLiters} L` : null },
    { label: "Oil change", value: oilIntervalValue },
    { label: "Oil spec", value: m.oilSpec },
  ];
  const codeField: GapField = { label: "Code", value: engine.code };

  // catalog_component_faults now also carries drivetrain_id- and phase_id-keyed rows (the
  // latter is "vehicle" -- see fetchBundleForPhase's own comment), but exact-id equality here
  // means only this engine's own rows ever match; a vehicle-level row's engineId is null.
  const engineFaults = faults.filter((f) => f.engineId === engine.id);
  const totalGaps =
    (isRangeExtender
      ? countGaps([codeField, ...electricDriveFields, ...rangeExtenderFields])
      : countGaps(engineFields)) + (engine.reliabilityRating == null ? 1 : 0);

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

      {explainer && (
        <div className="rounded-lg border border-white/5 bg-panel-2 p-3">
          <p className="mb-1 text-sm font-medium text-primary">How it works — {explainer.title}</p>
          <p className="text-sm text-secondary">{explainer.body}</p>
        </div>
      )}

      <div className="rounded-lg bg-panel-2 p-4">
        {isRangeExtender ? (
          <>
            <Field label={codeField.label} value={codeField.value} gapsMode={gapsMode} />
            <div className="mt-2 rounded-lg border border-white/5 p-3">
              <p className="mb-1 text-sm font-medium text-primary">Electric drive — motor + battery (drives the wheels)</p>
              {electricDriveFields.map((f) => (
                <Field key={f.label} label={f.label} value={f.value} gapsMode={gapsMode} />
              ))}
            </div>
            <div className="mt-2 mb-2 rounded-lg border border-white/5 p-3">
              <p className="mb-1 text-sm font-medium text-primary">Range extender — petrol generator (charges the battery only)</p>
              {rangeExtenderFields.map((f) => (
                <Field key={f.label} label={f.label} value={f.value} gapsMode={gapsMode} />
              ))}
            </div>
          </>
        ) : (
          engineFields.map((f) => (
            <Field key={f.label} label={f.label} value={f.value} gapsMode={gapsMode} />
          ))
        )}
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

// catalog_engines.battery_thermal_management is a frozen vocabulary
// (scripts/catalog-vocabularies.json); shown in words, raw value as the fallback.
const THERMAL_LABELS: Record<string, string> = {
  active_liquid: "Active (liquid)",
  active_air: "Active (air)",
  active_refrigerant: "Active (refrigerant)",
  passive: "Passive",
};

function thermalLabel(value: string | null): string | null {
  if (value == null) return null;
  return THERMAL_LABELS[value] ?? value;
}
