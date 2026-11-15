"use client";

// Engines tab comparison: a floating action bar once 2-3 engines are ticked, and a full-screen
// side-by-side view. Restyled to match this page's own native look (.eng-card/.eng-badge/
// .sub-label, the dark #1c1c1e/#2a2a2e palette every other tab already uses) instead of the
// separate Tailwind zinc/blue design this shipped with -- that design was deliberately its own
// per the brief it was built under, but read as visually foreign once it sat next to the
// native-styled Engines/Configurations/Trims tabs around it. All derived values -- verdict
// tag, fault ordering, Smart Choice -- still come from ./lib/engineCompare.ts; only the markup
// and styling below changed, same props, same behavior.

import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { IconBulb, IconX } from "@tabler/icons-react";

import type { DetailEngine, EngineFigure } from "./types";
import { eurRange, km, yearlyMaintenanceLabel } from "@/app/catalog/lib/engineMaintenance";
import {
  MAX_COMPARE,
  WEIGHTED_NOTE,
  compareEngineTitle,
  engineVerdict,
  fieldsFor,
  figureLabel,
  figuresComparable,
  pickSmartChoice,
  powertrainClass,
  reliabilityTone,
  rowsFor,
  timingLabel,
  topFaults,
  type CompareField,
  type RelTone,
} from "./lib/engineCompare";

const ROW_LABELS: Record<CompareField, string> = {
  powerTorque: "Power / torque",
  battery: "Battery (net)",
  evRange: "Electric range",
  charging: "Charging AC / DC",
  thermal: "Battery cooling / heat pump",
  electricConsumption: "Electricity consumption",
  fuelConsumption: "Fuel consumption",
  combustionEngine: "Combustion engine",
  timing: "Timing system",
  yearlyMaintenance: "Yearly maintenance",
  reliability: "Reliability",
  traps: "Expensive traps",
};

const THERMAL_WORDS: Record<string, string> = { active_liquid: "Active liquid", active_air: "Active air", active_refrigerant: "Active refrigerant", passive: "Passive" };
const HEAT_PUMP_WORDS: Record<string, string> = { standard: "heat pump standard", optional: "heat pump optional", none: "no heat pump" };

const NoData = () => <span className="tg">No data</span>;

// A consumption cell: the figure with its cycle, plus a "weighted (hybrid test)" marker whose
// hover says why it can't be read against a pure EV's or a petrol car's figure.
function FigureCell({ f }: { f: EngineFigure | null | undefined }) {
  const label = figureLabel(f);
  if (!label) return <NoData />;
  return (
    <>
      {label}
      {f?.weighted && (
        <div className="tg" style={{ marginTop: 3, cursor: "help", textDecoration: "underline dotted" }} title={WEIGHTED_NOTE}>
          weighted (hybrid test)
        </div>
      )}
    </>
  );
}

// Same 3-tone scale reliabilityTone() already classifies into (good/average/poor/unknown),
// just given real colors here -- matching the REL_COLORS values this page already uses
// elsewhere for "Excellent"/"Average"/"Poor" badges, not a new palette.
const TONE_COLORS: Record<RelTone, string> = {
  good: "#6bdb8a",
  average: "#ff9944",
  poor: "#ff6b35",
  unknown: "#6b6b72",
};

// Same severity palette as FAULT_ITEM_SEVERITY_COLORS in CarDetail.tsx (critical/moderate/
// minor) -- duplicated rather than imported, same "small color map, fine to repeat per
// display spot" convention this file already follows for REL_COLORS-adjacent maps elsewhere.
const SEVERITY_DOT_COLOR: Record<string, string> = { critical: "#f44336", moderate: "#ff9800", minor: "#4a9eff" };

interface CompareBarProps {
  count: number;
  onCompare: () => void;
  onClear: () => void;
}

// Floating bar -- slides up from the bottom as soon as 2+ engines are selected. With a single
// engine ticked it stays mounted but off-screen, so the slide-in plays on the 2nd tick instead
// of popping in.
export function CompareBar({ count, onCompare, onClear }: CompareBarProps) {
  const visible = count >= 2;
  return (
    <div aria-hidden={!visible} className={`compare-bar${visible ? " visible" : ""}`}>
      <div className="compare-bar-inner">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: ".85rem", fontWeight: 600, color: "#f0f0f0" }}>Comparing {count} engines</div>
          <div className="tg" style={{ marginTop: 2 }}>
            {count < MAX_COMPARE ? `Add up to ${MAX_COMPARE - count} more` : `Maximum of ${MAX_COMPARE}`} ·{" "}
            <button
              type="button"
              onClick={onClear}
              tabIndex={visible ? 0 : -1}
              className="compare-bar-clear"
            >
              Clear
            </button>
          </div>
        </div>
        <button type="button" onClick={onCompare} tabIndex={visible ? 0 : -1} className="compare-bar-cta">
          Compare Engines
        </button>
      </div>
    </div>
  );
}

interface EngineCompareViewProps {
  engines: DetailEngine[];
  carLabel: string;
  onClose: () => void;
}

function CompareRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="compare-row">
      <div className="sub-label" style={{ margin: 0 }}>{label}</div>
      <div style={{ fontSize: ".82rem", color: "#f0f0f0", marginTop: 4 }}>{children}</div>
    </div>
  );
}

export function EngineCompareView({ engines, carLabel, onClose }: EngineCompareViewProps) {
  const smart = useMemo(() => pickSmartChoice(engines), [engines]);
  // Rows: every field that applies to at least one compared engine, in a fixed order. A cell
  // whose own engine can't have the field reads "Not applicable" -- never "Unknown".
  const rows = useMemo(() => rowsFor(engines).filter((f) => f !== "reliability"), [engines]);
  // Like-for-like notes: when two or more engines have a consumption figure that can't be
  // compared (different cycle, or weighted plug-in vs direct), say so once above the grid
  // instead of letting the lower number look better.
  const comparabilityNotes = useMemo(() => {
    const notes: string[] = [];
    const check = (label: string, figs: (EngineFigure | null | undefined)[]) => {
      const present = figs.filter(Boolean);
      if (present.length < 2) return;
      const r = figuresComparable(present);
      if (!r.ok && r.reason) notes.push(`${label}: ${r.reason}.`);
    };
    check("Electricity consumption", engines.filter((e) => fieldsFor(powertrainClass(e)).includes("electricConsumption")).map((e) => e.electric_consumption));
    check("Fuel consumption", engines.filter((e) => fieldsFor(powertrainClass(e)).includes("fuelConsumption")).map((e) => e.fuel_consumption));
    return notes;
  }, [engines]);

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

  return (
    <div role="dialog" aria-modal="true" aria-label="Engine comparison" className="compare-overlay">
      <div className="compare-overlay-inner">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div>
            <div className="tg" style={{ textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700 }}>Engine comparison</div>
            <h2 className="cmodel" style={{ marginTop: 2 }}>{carLabel}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close comparison" className="compare-close-btn">
            <IconX size={18} />
          </button>
        </div>

        {comparabilityNotes.length > 0 && (
          <div className="tg" style={{ marginBottom: 14, lineHeight: 1.6, color: "#ff9944" }}>
            {comparabilityNotes.map((n) => <div key={n}>{n}</div>)}
          </div>
        )}

        {/* Mobile: columns become a horizontal swipe (snap per engine) so they stay side by
            side as asked; wider viewports get a plain fixed-column grid. */}
        <div className="compare-grid" style={{ gridTemplateColumns: engines.length === 3 ? "repeat(3, minmax(260px, 1fr))" : "repeat(2, minmax(260px, 1fr))" }}>
          {engines.map((e) => {
            const isSmart = smart?.engineId === e.id;
            const tone = TONE_COLORS[reliabilityTone(e.reliability_rating)];
            const cls = powertrainClass(e);
            const own = new Set(fieldsFor(cls));
            const timing = timingLabel(e.timing_type);
            const traps = topFaults(e.faults);
            const yearly = yearlyMaintenanceLabel(e.maintenance);
            const m = e.maintenance;
            const oil = m.oilChangeIntervalKm != null ? `every ${km(m.oilChangeIntervalKm)}${m.oilChangeIntervalMonths != null ? ` / ${m.oilChangeIntervalMonths} mo` : ""}` : null;
            const timingCost = eurRange(m.timingServiceCostEurMin, m.timingServiceCostEurMax);
            const timingEvery = e.timing_type === "chain"
              ? "No fixed interval"
              : e.timing_replacement_km != null
                ? `every ${km(e.timing_replacement_km)}${m.timingReplacementYears != null ? ` / ${m.timingReplacementYears} years` : ""}`
                : null;

            // One cell per row; the row exists because SOME compared engine has the field.
            const cell = (field: CompareField): ReactNode => {
              if (!own.has(field)) return <span className="tg">Not applicable</span>;
              switch (field) {
                case "powerTorque":
                  return (
                    <>
                      {e.power_kw} kW{e.torque_nm != null ? ` · ${e.torque_nm} Nm` : ""}
                      {cls === "PLUGIN" && e.hybrid_type === "EREV" && <div className="tg" style={{ marginTop: 3 }}>electric motor</div>}
                    </>
                  );
                case "battery":
                  return e.ev.batteryCapacityNetKwh != null ? `${e.ev.batteryCapacityNetKwh} kWh` : <NoData />;
                case "evRange":
                  return figureLabel(e.ev_range) ?? <NoData />;
                case "charging":
                  return e.ev.maxAcChargingKw != null || e.ev.maxDcChargingKw != null
                    ? `${e.ev.maxAcChargingKw ?? "–"} / ${e.ev.maxDcChargingKw ?? "–"} kW`
                    : <NoData />;
                case "thermal": {
                  const parts = [
                    e.ev.batteryThermalManagement ? THERMAL_WORDS[e.ev.batteryThermalManagement] ?? e.ev.batteryThermalManagement : null,
                    e.ev.heatPump ? HEAT_PUMP_WORDS[e.ev.heatPump] ?? e.ev.heatPump : null,
                  ].filter(Boolean);
                  return parts.length ? parts.join(" · ") : <NoData />;
                }
                case "electricConsumption":
                  return <FigureCell f={e.electric_consumption} />;
                case "fuelConsumption":
                  return <FigureCell f={e.fuel_consumption} />;
                case "combustionEngine": {
                  // A range extender's power_kw is the electric motor's -- the generator's own
                  // output has no column, so it isn't shown rather than shown wrong.
                  const parts = [
                    e.displacement_cc != null ? `${e.displacement_cc} cm³` : null,
                    e.hybrid_type === "EREV" ? null : `${e.power_kw} kW`,
                    e.emission_standard ?? null,
                  ].filter(Boolean);
                  return (
                    <>
                      {parts.length ? parts.join(" · ") : <NoData />}
                      {e.hybrid_type === "EREV" && <div className="tg" style={{ marginTop: 3 }}>petrol generator, never drives the wheels</div>}
                    </>
                  );
                }
                case "timing":
                  return (
                    <>
                      {timing ?? <NoData />}
                      {(timingCost || timingEvery) && (
                        <div className="tg" style={{ marginTop: 3 }}>
                          {[e.timing_type === "chain" ? (timingCost ? `chain job ${timingCost}` : null) : timingCost ? `belt kit ${timingCost}` : null, timingEvery].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </>
                  );
                case "yearlyMaintenance":
                  if (cls === "EV" && !yearly) return <span style={{ fontWeight: 700 }}>No engine servicing</span>;
                  return (
                    <>
                      {yearly ? <span style={{ fontWeight: 700 }}>{yearly}</span> : <NoData />}
                      {oil && <div className="tg" style={{ marginTop: 3 }}>Oil {oil}</div>}
                    </>
                  );
                case "traps":
                  return traps.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {traps.map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                          <span
                            style={{
                              marginTop: 6,
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              flexShrink: 0,
                              background: SEVERITY_DOT_COLOR[(f.severity || "").toLowerCase()] ?? "#6b6b72",
                            }}
                          />
                          <span style={{ color: "#9999aa" }}>{f.fault}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="tg">No known faults recorded</span>
                  );
                default:
                  return null;
              }
            };
            return (
              <section
                key={e.id}
                className="compare-card"
                style={isSmart ? { borderColor: "#60a5fa" } : undefined}
              >
                {isSmart && (
                  <div className="eng-badge" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#60a5fa22", color: "#60a5fa", border: "1px solid #60a5fa44", marginBottom: 10 }}>
                    <IconBulb size={12} /> Smart Choice
                  </div>
                )}
                {/* Code-free title, same style for every engine (compareEngineTitle). */}
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f0f0f0", lineHeight: 1.3 }}>
                  {compareEngineTitle({ display_name: e.display_name, code: null, power_kw: e.power_kw, hybrid_type: e.hybrid_type })}
                </div>
                <div className="eng-tags" style={{ marginTop: 8 }}>
                  <span className="cfuel-tag">{engineVerdict(e)}</span>
                  <span className="eng-badge" style={{ background: tone + "22", color: tone, border: `1px solid ${tone}44` }}>
                    {e.reliability !== "—" ? e.reliability : "Not rated"}
                  </span>
                </div>
                {isSmart && smart && <p style={{ fontSize: ".72rem", color: "#60a5fa", marginTop: 8, lineHeight: 1.5 }}>{smart.reasons.join(" · ")}</p>}

                <div style={{ marginTop: 10 }}>
                  {rows.map((field) => (
                    <CompareRow key={field} label={ROW_LABELS[field]}>
                      {cell(field)}
                    </CompareRow>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <p className="tg" style={{ marginTop: 20, lineHeight: 1.6 }}>
          {smart
            ? "Smart Choice weighs the reliability rating most, then the number and severity of known faults, then yearly maintenance cost and official consumption."
            : "No Smart Choice: the engines are too close to call, or not enough of them have a reliability rating."}{" "}
          Use-case tags are derived from fuel type and power. Consumption and range are the manufacturer&apos;s official figures with their test cycle (NEDC / WLTP), not real-world measurements; a lower figure only counts in Smart Choice when the cycle and method match. Plug-in and range-extender figures are the weighted hybrid test. A pure EV has no engine servicing. Maintenance prices are typical independent-workshop prices in SK/CZ.
        </p>
      </div>
    </div>
  );
}
