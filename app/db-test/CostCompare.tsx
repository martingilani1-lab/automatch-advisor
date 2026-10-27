"use client";

// Cross-model cost-of-ownership comparison: up to 3 vehicles side by side, each one a model
// (catalog phase) + one of its configurations, all on one shared mileage slider. Same shape as
// the Engines tab comparison (EngineCompare.tsx): a floating bar once something is picked, and
// a full-screen view -- but the selection lives in DbTestView, not CarDetail, because it spans
// several cars. Vehicles are added from a car's Costs tab, or picked right here (model picker
// + configuration picker per column), so the view is usable from a single starting car.
//
// It's a real <table>: one row per cost category, so the same category lines up across
// vehicles. Each cell carries a thin bar scaled to that ROW's largest value -- the visual
// answer to "which of these costs more on fuel / depreciation / ...". All money math is
// calcTco()/pickCheapest() in ./lib/tco.ts; nothing is computed differently from the Costs tab.

import { useEffect, useMemo, useState } from "react";
import { IconTrophy, IconX } from "@tabler/icons-react";

import type { CarData } from "@/app/lib/carFields";
import { carModelBase, carPriceMax, carPriceMin } from "@/app/lib/carFields";
import type { DetailData } from "./types";
import type { TcoKey, TcoOption, TcoResult } from "./lib/tco";
import { ANNUAL_KM_STEP, DEFAULT_ANNUAL_KM, MAX_ANNUAL_KM, MIN_ANNUAL_KM, calcTco, pickCheapest, rankedLines } from "./lib/tco";
import { buildTcoOptions } from "./lib/tcoOptions";
import { modelName, phaseOptionLabel, suggestSimilarCars } from "./lib/costCompareSuggest";

export const MAX_COST_COMPARE = 3;

// One compared vehicle: a phase id (what /db-test calls a "car") + a configuration key from
// buildTcoOptions(). configKey null = "first option" until the user picks one (used when a
// model is chosen in the view itself, before its configurations have loaded).
export interface CostCompareEntry {
  phaseId: string;
  configKey: string | null;
}

const fmtEur = (n: number) => `€${Math.round(n).toLocaleString("en-US").replace(/,/g, " ")}`;
const fmtKm = (n: number) => `${n.toLocaleString("en-US").replace(/,/g, " ")} km`;

// Fixed row order (same as the Costs tab's calculation order); a row only shows if at least one
// compared vehicle has that line at all (AWD service appears only when an AWD car is compared).
const ROW_ORDER: TcoKey[] = ["fuel", "engine", "gearbox", "drivetrain", "tires", "repairs", "fixed", "insurance", "depreciation"];

export function carOptionLabel(c: CarData): string {
  const years = c.years ? ` (${c.years})` : "";
  return `${carModelBase(c)}${c.phaseLabel ? ` ${c.phaseLabel}` : ""}${years}`;
}

// ---- Floating bar -------------------------------------------------------------------------

interface CostCompareBarProps {
  count: number;
  hidden: boolean;
  onOpen: () => void;
  onClear: () => void;
}

// Unlike the engines bar this shows from the FIRST vehicle: the comparison view has its own
// model picker, so one car is already a useful starting point -- and the selection survives
// navigating between cars, so the bar is the only sign it exists. `hidden` keeps it out of the
// way while the Engines tab's own compare bar uses the same spot.
export function CostCompareBar({ count, hidden, onOpen, onClear }: CostCompareBarProps) {
  const visible = count >= 1 && !hidden;
  return (
    <div aria-hidden={!visible} className={`compare-bar${visible ? " visible" : ""}`}>
      <div className="compare-bar-inner">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: ".85rem", fontWeight: 600, color: "#f0f0f0" }}>
            Cost comparison · {count} {count === 1 ? "vehicle" : "vehicles"}
          </div>
          <div className="tg" style={{ marginTop: 2 }}>
            {count < MAX_COST_COMPARE ? `Add up to ${MAX_COST_COMPARE - count} more` : `Maximum of ${MAX_COST_COMPARE}`} ·{" "}
            <button type="button" onClick={onClear} tabIndex={visible ? 0 : -1} className="compare-bar-clear">
              Clear
            </button>
          </div>
        </div>
        <button type="button" onClick={onOpen} tabIndex={visible ? 0 : -1} className="compare-bar-cta">
          Compare costs
        </button>
      </div>
    </div>
  );
}

// ---- Model picker -------------------------------------------------------------------------

interface ModelSelectProps {
  cars: CarData[];
  value: string;
  onChange: (phaseId: string) => void;
}

// Native <select> grouped by brand -- 300+ phases is too many for a flat list, and a native
// picker is the most usable option on phones.
function ModelSelect({ cars, value, onChange }: ModelSelectProps) {
  const groups = useMemo(() => {
    const byMake = new Map<string, CarData[]>();
    for (const c of cars) byMake.set(c.make, [...(byMake.get(c.make) ?? []), c]);
    return [...byMake.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([make, list]) => [make, [...list].sort((a, b) => carOptionLabel(a).localeCompare(carOptionLabel(b)))] as const);
  }, [cars]);
  return (
    <select className="tco-cmp-select" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label="Model">
      {groups.map(([make, list]) => (
        <optgroup key={make} label={make}>
          {list.map((c) => (
            <option key={c.id} value={c.id}>{carOptionLabel(c)}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// ---- "Add a vehicle" ----------------------------------------------------------------------

interface AddVehicleProps {
  cars: CarData[];
  compared: CarData[];
  onAdd: (phaseId: string) => void;
}

// Suggestions first (same model in other phases/generations, then same-class rivals at a
// similar price -- see suggestSimilarCars), then a brand -> model -> phase cascade for
// anything else. The cascade adds the car as soon as a phase is picked; a model with a single
// phase is added straight from the model step.
function AddVehicle({ cars, compared, onAdd }: AddVehicleProps) {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const suggestions = useMemo(() => suggestSimilarCars(cars, compared), [cars, compared]);
  const brands = useMemo(() => [...new Set(cars.map((c) => c.make))].sort((a, b) => a.localeCompare(b)), [cars]);
  const models = useMemo(
    () => [...new Set(cars.filter((c) => c.make === brand).map(modelName))].sort((a, b) => a.localeCompare(b)),
    [cars, brand]
  );
  const phases = useMemo(
    () => cars.filter((c) => c.make === brand && modelName(c) === model).sort((a, b) => a.years.localeCompare(b.years)),
    [cars, brand, model]
  );
  const takenIds = new Set(compared.map((c) => c.id));

  const add = (id: string) => {
    onAdd(id);
    setBrand("");
    setModel("");
  };

  return (
    <div className="tco-add">
      {suggestions.length > 0 && (
        <>
          <div className="cgrid-label">Suggested</div>
          <div className="tco-add-suggest">
            {suggestions.map((sg) => (
              <button key={sg.car.id} type="button" className="tco-add-chip" onClick={() => add(sg.car.id)}>
                <span className="tco-add-chip-name">{sg.car.make} {carOptionLabel(sg.car)}</span>
                <span className="tg">{sg.reason}</span>
              </button>
            ))}
          </div>
          <div className="cgrid-label" style={{ marginTop: 10 }}>Or choose</div>
        </>
      )}
      <select className="tco-cmp-select" value={brand} onChange={(e) => { setBrand(e.target.value); setModel(""); }} aria-label="Brand">
        <option value="">Brand…</option>
        {brands.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
      <select
        className="tco-cmp-select"
        value={model}
        disabled={!brand}
        aria-label="Model"
        onChange={(e) => {
          const m = e.target.value;
          const only = cars.filter((c) => c.make === brand && modelName(c) === m);
          if (only.length === 1 && !takenIds.has(only[0].id)) add(only[0].id);
          else setModel(m);
        }}
      >
        <option value="">Model…</option>
        {models.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <select
        className="tco-cmp-select"
        value=""
        disabled={!model}
        aria-label="Phase"
        onChange={(e) => e.target.value && add(e.target.value)}
      >
        <option value="">Generation / phase…</option>
        {phases.map((c) => (
          <option key={c.id} value={c.id} disabled={takenIds.has(c.id)}>{phaseOptionLabel(c)}</option>
        ))}
      </select>
    </div>
  );
}

// ---- Full-screen view ---------------------------------------------------------------------

interface CostCompareViewProps {
  entries: CostCompareEntry[];
  onChange: (entries: CostCompareEntry[]) => void;
  onClose: () => void;
  cars: CarData[];
  details: Record<string, DetailData>;
  loading: Record<string, boolean>;
  loadDetail: (phaseId: string) => void;
}

interface Column {
  entry: CostCompareEntry;
  car: CarData | null;
  options: TcoOption[];
  option: TcoOption | null;
  result: TcoResult | null;
  isLoading: boolean;
}

export function CostCompareView({ entries, onChange, onClose, cars, details, loading, loadDetail }: CostCompareViewProps) {
  const [annualKm, setAnnualKm] = useState(DEFAULT_ANNUAL_KM);

  // Every compared model needs its configurations; loadDetail() is a no-op when they're
  // already cached or on their way.
  useEffect(() => {
    for (const e of entries) loadDetail(e.phaseId);
  }, [entries, loadDetail]);

  // Escape closes; the page behind must not scroll while the overlay is up.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const columns: Column[] = useMemo(
    () =>
      entries.map((entry) => {
        const car = cars.find((c) => c.id === entry.phaseId) ?? null;
        const detail = details[entry.phaseId];
        const options = car && detail ? buildTcoOptions(detail.configs, carPriceMin(car), carPriceMax(car)) : [];
        const option = options.find((o) => o.key === entry.configKey) ?? options[0] ?? null;
        return {
          entry,
          car,
          options,
          option,
          result: option ? calcTco(option.input, annualKm) : null,
          isLoading: !detail && !!loading[entry.phaseId],
        };
      }),
    [entries, cars, details, loading, annualKm]
  );

  const cheapest = pickCheapest(columns.map((c) => c.result));
  const rows = ROW_ORDER.filter((k) => columns.some((c) => c.result?.lines.some((l) => l.key === k)));

  const setEntry = (i: number, next: CostCompareEntry) => onChange(entries.map((e, j) => (j === i ? next : e)));
  const removeEntry = (i: number) => onChange(entries.filter((_, j) => j !== i));
  const addEntry = (phaseId: string) => onChange([...entries, { phaseId, configKey: null }]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Cost comparison" className="compare-overlay">
      <div className="compare-overlay-inner">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <div>
            <div className="tg" style={{ textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700 }}>Cost of ownership</div>
            <h2 className="cmodel" style={{ marginTop: 2 }}>Compare vehicles</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close comparison" className="compare-close-btn">
            <IconX size={18} />
          </button>
        </div>

        <label className="tco-field">
          <span className="tco-field-row">
            <span className="cgrid-label">Annual mileage (all vehicles)</span>
            <strong>{fmtKm(annualKm)} / year</strong>
          </span>
          <input
            type="range"
            min={MIN_ANNUAL_KM}
            max={MAX_ANNUAL_KM}
            step={ANNUAL_KM_STEP}
            value={annualKm}
            onChange={(e) => setAnnualKm(Number(e.target.value))}
            aria-label="Annual mileage in km"
          />
        </label>

        <div className="tco-cmp-scroll">
          <table className="tco-cmp">
            <thead>
              <tr>
                <th className="tco-cmp-rowhead" />
                {columns.map((col, i) => (
                  <th key={i} className={cheapest === i ? "tco-cmp-win" : undefined}>
                    <div className="tco-cmp-colhead">
                      {cheapest === i && (
                        <span className="eng-badge tco-cmp-badge"><IconTrophy size={12} /> Lowest cost</span>
                      )}
                      <button type="button" className="tco-cmp-remove" aria-label="Remove from comparison" onClick={() => removeEntry(i)}>
                        <IconX size={14} />
                      </button>
                    </div>
                    <div className="cgrid-label">Model</div>
                    <ModelSelect cars={cars} value={col.entry.phaseId} onChange={(id) => setEntry(i, { phaseId: id, configKey: null })} />
                    <div className="cgrid-label" style={{ marginTop: 8 }}>Configuration</div>
                    {col.option ? (
                      <select
                        className="tco-cmp-select"
                        value={col.option.key}
                        onChange={(e) => setEntry(i, { ...col.entry, configKey: e.target.value })}
                        aria-label="Configuration"
                      >
                        {col.options.map((o) => (
                          <option key={o.key} value={o.key}>{o.label}</option>
                        ))}
                      </select>
                    ) : null}
                    {/* Full label under the picker -- a narrow column truncates the selected
                        option's text inside the <select> itself. */}
                    {col.option && <div className="tg tco-cmp-cfg">{col.option.label}</div>}
                    {!col.option && (
                      <div className="tg">{col.isLoading || !details[col.entry.phaseId] ? "Loading…" : "No configurations"}</div>
                    )}
                  </th>
                ))}
                {entries.length < MAX_COST_COMPARE && (
                  <th className="tco-cmp-add">
                    <div className="cgrid-label" style={{ marginBottom: 6 }}>Add a vehicle</div>
                    <AddVehicle
                      cars={cars}
                      compared={columns.map((c) => c.car).filter((c): c is CarData => c != null)}
                      onAdd={addEntry}
                    />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <tr className="tco-cmp-total">
                <th className="tco-cmp-rowhead">Monthly</th>
                {columns.map((col, i) => (
                  <td key={i} className={cheapest === i ? "tco-cmp-win" : undefined}>
                    {col.result ? fmtEur(col.result.monthlyTotal) : "—"}
                  </td>
                ))}
                {entries.length < MAX_COST_COMPARE && <td />}
              </tr>
              <tr className="tco-cmp-total">
                <th className="tco-cmp-rowhead">Yearly</th>
                {columns.map((col, i) => (
                  <td key={i} className={cheapest === i ? "tco-cmp-win" : undefined}>
                    {col.result ? fmtEur(col.result.yearlyTotal) : "—"}
                    {col.result?.incomplete && <div className="tg tco-cmp-note">Some costs have no data and aren&apos;t included</div>}
                  </td>
                ))}
                {entries.length < MAX_COST_COMPARE && <td />}
              </tr>
              <tr>
                <th className="tco-cmp-rowhead">Biggest cost</th>
                {columns.map((col, i) => {
                  const top = col.result ? rankedLines(col.result)[0] : null;
                  return (
                    <td key={i} className={cheapest === i ? "tco-cmp-win" : undefined}>
                      {top ? `${top.label} · ${Math.round(top.share * 100)} %` : "—"}
                    </td>
                  );
                })}
                {entries.length < MAX_COST_COMPARE && <td />}
              </tr>
              {rows.map((key) => {
                const cells = columns.map((col) => col.result?.lines.find((l) => l.key === key) ?? null);
                const rowMax = Math.max(0, ...cells.map((l) => l?.yearly ?? 0));
                const label = cells.find((l) => l)?.label ?? key;
                return (
                  <tr key={key}>
                    <th className="tco-cmp-rowhead">{label}</th>
                    {cells.map((line, i) => (
                      <td key={i} className={cheapest === i ? "tco-cmp-win" : undefined}>
                        {line == null ? (
                          <span className="tg">{key === "drivetrain" && columns[i].result ? "No AWD" : "—"}</span>
                        ) : line.yearly == null ? (
                          <span className="tg" title={line.detail}>No data</span>
                        ) : (
                          <div title={line.detail}>
                            <span className="tco-cmp-val">{fmtEur(line.yearly)}</span>
                            <div className="tco-bar-track">
                              <div className="tco-bar" style={{ width: `${rowMax > 0 ? (line.yearly / rowMax) * 100 : 0}%` }} />
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                    {entries.length < MAX_COST_COMPARE && <td />}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="tg" style={{ marginTop: 20, lineHeight: 1.6 }}>
          All amounts are per year unless marked monthly, on the same mileage for every vehicle. Bars compare
          each cost across the vehicles. &ldquo;Lowest cost&rdquo; is shown only when every vehicle has complete
          data and the difference is at least €60 a year. Same estimate as each car&apos;s Costs tab:
          average SK/CZ fuel prices, real-world consumption, workshop service prices, a repair reserve
          from the reliability ratings, and 10 % yearly depreciation of the mid market price.
        </p>
      </div>
    </div>
  );
}
