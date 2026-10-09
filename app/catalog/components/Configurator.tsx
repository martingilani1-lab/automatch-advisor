"use client";

import { useState } from "react";

import type { CatalogConfig, CatalogFault } from "../lib/types";
import SegmentedControl from "./ui/segmented-control";
import EngineGearboxPanel from "./EngineGearboxPanel";

interface ConfiguratorProps {
  configs: CatalogConfig[];
  faults: CatalogFault[];
  gapsMode: boolean;
}

const NO_DRIVETRAIN = "none";

function distinctBy(
  items: CatalogConfig[],
  keyFn: (c: CatalogConfig) => string,
  labelFn: (c: CatalogConfig) => string
): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) seen.set(key, labelFn(item));
  }
  return Array.from(seen, ([value, label]) => ({ value, label }));
}

// body -> fuel -> engine -> gearbox -> drivetrain. Every step's options are a distinct
// projection over whatever configs remain after the upstream selections -- never a static
// cross-join of catalog_engines/transmission_units/drivetrain_systems, which would offer
// combinations that never existed from the factory (CLAUDE.md rule 4).
export default function Configurator({ configs, faults, gapsMode }: ConfiguratorProps) {
  const [body, setBody] = useState<string | null>(null);
  const [fuel, setFuel] = useState<string | null>(null);
  const [engineId, setEngineId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [drivetrainKey, setDrivetrainKey] = useState<string | null>(null);

  // A step with exactly one remaining option has no real choice to make -- SegmentedControl
  // renders it as a static label (nothing to click), so it must also resolve automatically
  // here, not just visually. "effective" = explicit user pick, else the sole option if
  // there's only one, else null (still genuinely undecided).
  const bodyOptions = distinctBy(configs, (c) => c.bodyTypeId, (c) => c.bodyName);
  const effectiveBody = body ?? (bodyOptions.length === 1 ? bodyOptions[0].value : null);
  const afterBody = configs.filter((c) => !effectiveBody || c.bodyTypeId === effectiveBody);

  const fuelOptions = distinctBy(afterBody, (c) => c.engine.fuelType, (c) => c.engine.fuelType);
  const effectiveFuel = fuel ?? (fuelOptions.length === 1 ? fuelOptions[0].value : null);
  const afterFuel = afterBody.filter((c) => !effectiveFuel || c.engine.fuelType === effectiveFuel);

  // Display-only convention: "<display_name> (<code>) <power_kw> kW", same as Browse &
  // Compare's own engine labels -- never changes display_name itself.
  const engineOptions = distinctBy(
    afterFuel,
    (c) => c.engine.id,
    (c) => c.engine.displayName ? `${c.engine.displayName} (${c.engine.code}) ${c.engine.powerKw} kW` : `${c.engine.code} ${c.engine.powerKw} kW`
  );
  const effectiveEngineId = engineId ?? (engineOptions.length === 1 ? engineOptions[0].value : null);
  const afterEngine = afterFuel.filter((c) => !effectiveEngineId || c.engine.id === effectiveEngineId);

  const gearboxOptions = distinctBy(
    afterEngine,
    (c) => c.gearbox.id,
    (c) => `${c.gearbox.code} (${c.gearbox.speeds ? `${c.gearbox.speeds}-speed ` : ""}${c.gearbox.family})`
  );
  const effectiveUnitId = unitId ?? (gearboxOptions.length === 1 ? gearboxOptions[0].value : null);
  const afterGearbox = afterEngine.filter((c) => !effectiveUnitId || c.gearbox.id === effectiveUnitId);

  const drivetrainOptions = distinctBy(
    afterGearbox,
    (c) => c.drivetrain?.id ?? NO_DRIVETRAIN,
    (c) => c.drivetrain?.code ?? "FWD"
  );
  const effectiveDrivetrainKey =
    drivetrainKey ?? (drivetrainOptions.length === 1 ? drivetrainOptions[0].value : null);
  const selected = effectiveDrivetrainKey
    ? afterGearbox.find((c) => (c.drivetrain?.id ?? NO_DRIVETRAIN) === effectiveDrivetrainKey) ?? null
    : null;

  function selectBody(v: string) {
    setBody(v);
    setFuel(null);
    setEngineId(null);
    setUnitId(null);
    setDrivetrainKey(null);
  }
  function selectFuel(v: string) {
    setFuel(v);
    setEngineId(null);
    setUnitId(null);
    setDrivetrainKey(null);
  }
  function selectEngine(v: string) {
    setEngineId(v);
    setUnitId(null);
    setDrivetrainKey(null);
  }
  function selectGearbox(v: string) {
    setUnitId(v);
    setDrivetrainKey(null);
  }

  const relevantFaults = selected
    ? faults.filter((f) => f.engineId === selected.engine.id || f.unitId === selected.gearbox.id)
    : [];

  return (
    <section>
      <h2 className="text-lg font-medium text-catalog-text">Configurator</h2>
      <div className="mt-2 flex flex-col gap-4 rounded-lg border border-catalog-border bg-catalog-surface p-4">
        <Step
          label="Body"
          groupId="body"
          options={bodyOptions}
          value={effectiveBody}
          onChange={selectBody}
        />
        <Step
          label="Fuel"
          groupId="fuel"
          options={fuelOptions}
          value={effectiveFuel}
          onChange={selectFuel}
        />
        <Step
          label="Engine"
          groupId="engine"
          options={engineOptions}
          value={effectiveEngineId}
          onChange={selectEngine}
        />
        <Step
          label="Gearbox"
          groupId="gearbox"
          options={gearboxOptions}
          value={effectiveUnitId}
          onChange={selectGearbox}
        />
        <Step
          label="Drivetrain"
          groupId="drivetrain"
          options={drivetrainOptions}
          value={effectiveDrivetrainKey}
          onChange={setDrivetrainKey}
        />
      </div>

      {selected && (
        <div className="mt-4">
          <EngineGearboxPanel config={selected} faults={relevantFaults} gapsMode={gapsMode} />
        </div>
      )}
    </section>
  );
}

interface StepProps {
  label: string;
  groupId: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
}

function Step({ label, groupId, options, value, onChange }: StepProps) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-wide text-catalog-muted">{label}</p>
      <SegmentedControl groupId={groupId} options={options} value={value} onChange={onChange} />
    </div>
  );
}
