import type { CatalogFault } from "../lib/types";
import type { GearboxGroup } from "../lib/groupConfigurations";
import { countGaps, type GapField } from "../lib/gaps";
import { gearboxHeaderLabel } from "../lib/gearboxLabel";
import Field from "./ui/field";
import Chips from "./ui/chips";
import ProsConsList from "./ui/pros-cons-list";
import FaultsList from "./ui/faults-list";
import Rating from "./ui/rating";
import SectionGapsBadge from "./SectionGapsBadge";

interface GearboxPanelProps {
  group: GearboxGroup;
  faults: CatalogFault[];
  gapsMode: boolean;
}

// A gearbox is a real, standalone unit, shown as its own top-level section (see
// GearboxList.tsx) rather than nested under any one engine -- the same gearbox can sit
// behind several different engines (engineNames below is which ones, on this phase).
// Its paired drivetrain system(s), if any, nest directly inside -- a drivetrain system only
// ever exists in the context of the gearbox(es) it's actually paired with. Per-configuration
// numeric facts (consumption, performance, EV figures) are deferred to their own dedicated
// page, not shown here.
export default function GearboxPanel({ group, faults, gapsMode }: GearboxPanelProps) {
  const { gearbox, drivetrainSystems } = group;

  // Reliability rating renders via the 5-dot Rating indicator, not a Field row -- see
  // EnginePanel's own comment on the same pattern.
  const gearboxFields: GapField[] = [
    { label: "Code", value: gearbox.code },
    { label: "Family", value: gearbox.family },
    { label: "Maker", value: gearbox.maker },
    { label: "Speeds", value: gearbox.speeds },
    { label: "Reliability note", value: gearbox.reliabilityNote },
    { label: "Maintenance note", value: gearbox.maintenanceNote },
    { label: "In this car", value: gearbox.phaseNote },
  ];
  const gearboxFaults = faults.filter((f) => f.unitId === gearbox.id);

  const drivetrainFields: GapField[] = drivetrainSystems.flatMap((d) => [
    { label: "Type", value: d.type },
    { label: "Maker", value: d.maker },
    { label: "Reliability note", value: d.reliabilityNote },
  ]);
  const drivetrainRatingGaps = drivetrainSystems.filter((d) => d.reliabilityRating == null).length;
  const totalGaps =
    countGaps(gearboxFields) + (gearbox.reliabilityRating == null ? 1 : 0) +
    countGaps(drivetrainFields) + drivetrainRatingGaps;

  return (
    <div
      id={`gearbox-${gearbox.id}`}
      className="flex flex-col gap-4 rounded-xl border border-white/5 bg-panel p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset] hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-center gap-2">
        <h3 className="text-base font-medium text-primary">
          Gearbox — {gearboxHeaderLabel(gearbox.code, gearbox.speeds, gearbox.family)}
        </h3>
        <SectionGapsBadge count={totalGaps} />
      </div>
      <Chips items={[...group.engineNames, ...group.bodyNames, ...group.drivetrainLabels]} />

      <div className="rounded-lg bg-panel-2 p-4">
        {gearboxFields.map((f) => (
          <Field key={f.label} label={f.label} value={f.value} gapsMode={gapsMode} />
        ))}
        <Rating value={gearbox.reliabilityRating} label="Reliability" />
        <ProsConsList pros={gearbox.pros} cons={gearbox.cons} gapsMode={gapsMode} />
        <FaultsList faults={gearboxFaults} gapsMode={gapsMode} />
      </div>

      {drivetrainSystems.map((drivetrain) => (
        <div key={drivetrain.id} id={`drivetrain-${drivetrain.id}`} className="rounded-lg bg-panel-2 p-3">
          <p className="mb-1 text-sm font-medium text-primary">Drivetrain — {drivetrain.code}</p>
          <Field label="Type" value={drivetrain.type} gapsMode={gapsMode} />
          <Field label="Maker" value={drivetrain.maker} gapsMode={gapsMode} />
          <Rating value={drivetrain.reliabilityRating} label="Reliability" />
          <Field label="Reliability note" value={drivetrain.reliabilityNote} gapsMode={gapsMode} />
          <ProsConsList pros={drivetrain.pros} cons={drivetrain.cons} gapsMode={gapsMode} />
        </div>
      ))}
    </div>
  );
}
