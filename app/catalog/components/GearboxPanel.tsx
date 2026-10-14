import type { CatalogFault } from "../lib/types";
import type { GearboxGroup } from "../lib/groupConfigurations";
import { countGaps, type GapField } from "../lib/gaps";
import { gearboxHeaderLabel } from "../lib/gearboxLabel";
import Field from "./ui/field";
import Chips from "./ui/chips";
import ProsConsList from "./ui/pros-cons-list";
import FaultsList from "./ui/faults-list";
import SectionGapsBadge from "./SectionGapsBadge";

interface GearboxPanelProps {
  group: GearboxGroup;
  faults: CatalogFault[];
  gapsMode: boolean;
}

// transmission_units/drivetrain_systems.reliability_rating is a smallint 1-5 -- same scale
// and word labels as EnginePanel's own RELIABILITY_LABELS (small, intentional duplication --
// see CLAUDE.md on the few pure helpers already duplicated between page.tsx/recommend/route.ts).
const RELIABILITY_LABELS: Record<number, string> = { 5: "Excellent", 4: "Good", 3: "Average", 2: "Below Average", 1: "Poor" };

// A gearbox is a real, standalone unit, shown as its own top-level section (see
// GearboxList.tsx) rather than nested under any one engine -- the same gearbox can sit
// behind several different engines (engineNames below is which ones, on this phase).
// Its paired drivetrain system(s), if any, nest directly inside -- a drivetrain system only
// ever exists in the context of the gearbox(es) it's actually paired with. Per-configuration
// numeric facts (consumption, performance, EV figures) are deferred to their own dedicated
// page, not shown here.
export default function GearboxPanel({ group, faults, gapsMode }: GearboxPanelProps) {
  const { gearbox, drivetrainSystems } = group;

  const gearboxFields: GapField[] = [
    { label: "Code", value: gearbox.code },
    { label: "Family", value: gearbox.family },
    { label: "Maker", value: gearbox.maker },
    { label: "Speeds", value: gearbox.speeds },
    { label: "Reliability rating", value: gearbox.reliabilityRating != null ? RELIABILITY_LABELS[gearbox.reliabilityRating] : null },
    { label: "Reliability note", value: gearbox.reliabilityNote },
    { label: "Maintenance note", value: gearbox.maintenanceNote },
    { label: "In this car", value: gearbox.phaseNote },
  ];
  const gearboxFaults = faults.filter((f) => f.unitId === gearbox.id);

  const drivetrainFields: GapField[] = drivetrainSystems.flatMap((d) => [
    { label: "Type", value: d.type },
    { label: "Maker", value: d.maker },
    { label: "Reliability rating", value: d.reliabilityRating != null ? RELIABILITY_LABELS[d.reliabilityRating] : null },
    { label: "Reliability note", value: d.reliabilityNote },
  ]);
  const totalGaps = countGaps(gearboxFields) + countGaps(drivetrainFields);

  return (
    <div id={`gearbox-${gearbox.id}`} className="flex flex-col gap-4 rounded-lg border border-catalog-border bg-catalog-bg p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-medium text-catalog-text">
          Gearbox — {gearboxHeaderLabel(gearbox.code, gearbox.speeds, gearbox.family)}
        </h3>
        <SectionGapsBadge count={totalGaps} />
      </div>
      <Chips items={[...group.engineNames, ...group.bodyNames, ...group.drivetrainLabels]} />

      <div className="rounded-lg border border-catalog-border bg-catalog-surface p-4">
        {gearboxFields.map((f) => (
          <Field key={f.label} label={f.label} value={f.value} gapsMode={gapsMode} />
        ))}
        <ProsConsList pros={gearbox.pros} cons={gearbox.cons} gapsMode={gapsMode} />
        <FaultsList faults={gearboxFaults} gapsMode={gapsMode} />
      </div>

      {drivetrainSystems.map((drivetrain) => (
        <div key={drivetrain.id} id={`drivetrain-${drivetrain.id}`} className="rounded-lg border border-catalog-border bg-catalog-surface p-3">
          <p className="mb-1 text-sm font-medium text-catalog-text">Drivetrain — {drivetrain.code}</p>
          <Field label="Type" value={drivetrain.type} gapsMode={gapsMode} />
          <Field label="Maker" value={drivetrain.maker} gapsMode={gapsMode} />
          <Field
            label="Reliability rating"
            value={drivetrain.reliabilityRating != null ? RELIABILITY_LABELS[drivetrain.reliabilityRating] : null}
            gapsMode={gapsMode}
          />
          <Field label="Reliability note" value={drivetrain.reliabilityNote} gapsMode={gapsMode} />
          <ProsConsList pros={drivetrain.pros} cons={drivetrain.cons} gapsMode={gapsMode} />
        </div>
      ))}
    </div>
  );
}
