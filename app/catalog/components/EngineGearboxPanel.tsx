import type { CatalogConfig, CatalogFault } from "../lib/types";
import { countGaps, type GapField } from "../lib/gaps";
import Badge from "./ui/badge";
import Field from "./ui/field";
import SectionGapsBadge from "./SectionGapsBadge";

interface EngineGearboxPanelProps {
  config: CatalogConfig;
  faults: CatalogFault[];
  gapsMode: boolean;
}

export default function EngineGearboxPanel({ config, faults, gapsMode }: EngineGearboxPanelProps) {
  const { engine, gearbox, drivetrain } = config;

  const engineFields: GapField[] = [
    { label: "Code", value: engine.code },
    { label: "Displacement", value: engine.displacementCc != null ? `${engine.displacementCc} cc` : null },
    { label: "Power", value: `${engine.powerKw} kW` },
    { label: "Torque", value: engine.torqueNm != null ? `${engine.torqueNm} Nm` : null },
    { label: "Cylinders", value: engine.cylinders },
    { label: "Emission standard", value: engine.emissionStandard },
    { label: "Timing type", value: engine.timingType },
    { label: "Timing replacement", value: engine.timingReplacementKm != null ? `${engine.timingReplacementKm} km` : null },
    { label: "Oil capacity", value: engine.engineOilCapacityLiters != null ? `${engine.engineOilCapacityLiters} L` : null },
    { label: "Hybrid system", value: engine.hybridType },
    { label: "0–100 km/h", value: config.acceleration0To100 != null ? `${config.acceleration0To100} s` : null },
    { label: "Top speed", value: config.topSpeedKmh != null ? `${config.topSpeedKmh} km/h` : null },
    { label: "Consumption (combined)", value: config.fuelConsumptionCombined != null ? `${config.fuelConsumptionCombined} L/100km` : null },
    { label: "CO₂ emissions", value: config.co2EmissionsGKm != null ? `${config.co2EmissionsGKm} g/km` : null },
    { label: "Battery capacity", value: config.batteryCapacityNetKwh != null ? `${config.batteryCapacityNetKwh} kWh` : null },
    { label: "EV range (WLTP)", value: config.evRangeWltpKm != null ? `${config.evRangeWltpKm} km` : null },
    { label: "Max DC charging", value: config.maxChargingKwDc != null ? `${config.maxChargingKwDc} kW` : null },
  ];

  const gearboxFields: GapField[] = [
    { label: "Code", value: gearbox.code },
    { label: "Family", value: gearbox.family },
    { label: "Maker", value: gearbox.maker },
    { label: "Speeds", value: gearbox.speeds },
    { label: "Reliability note", value: gearbox.reliabilityNote },
    { label: "Maintenance note", value: gearbox.maintenanceNote },
  ];

  const drivetrainFields: GapField[] = drivetrain
    ? [
        { label: "Code", value: drivetrain.code },
        { label: "Type", value: drivetrain.type },
        { label: "Maker", value: drivetrain.maker },
        { label: "Reliability note", value: drivetrain.reliabilityNote },
      ]
    : [];

  const totalGaps = countGaps([...engineFields, ...gearboxFields, ...drivetrainFields]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium uppercase tracking-wide text-catalog-muted">
          Selected configuration
        </h3>
        <SectionGapsBadge count={totalGaps} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-catalog-border bg-catalog-surface p-4">
          <p className="mb-2 text-sm font-medium text-catalog-text">
            Engine — {engine.displayName ?? engine.code}
          </p>
          {engineFields.map((f) => (
            <Field key={f.label} label={f.label} value={f.value} gapsMode={gapsMode} />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-catalog-border bg-catalog-surface p-4">
            <p className="mb-2 text-sm font-medium text-catalog-text">Gearbox — {gearbox.code}</p>
            {gearboxFields.map((f) => (
              <Field key={f.label} label={f.label} value={f.value} gapsMode={gapsMode} />
            ))}
          </div>
          {drivetrain && (
            <div className="rounded-lg border border-catalog-border bg-catalog-surface p-4">
              <p className="mb-2 text-sm font-medium text-catalog-text">
                Drivetrain — {drivetrain.code}
              </p>
              {drivetrainFields.map((f) => (
                <Field key={f.label} label={f.label} value={f.value} gapsMode={gapsMode} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-catalog-text">
          Known faults {faults.length > 0 && <span className="text-catalog-muted">({faults.length})</span>}
        </p>
        {faults.length === 0 ? (
          <p className="text-sm text-catalog-muted">None recorded for this engine/gearbox.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {faults.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-catalog-border bg-catalog-surface p-3"
              >
                <span className="text-sm text-catalog-text">{f.fault}</span>
                {f.severity && <Badge variant="warning">{f.severity}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
