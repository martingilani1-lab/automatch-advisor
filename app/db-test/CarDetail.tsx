"use client";

import { useMemo, useState } from "react";
import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carPriceMax, carRel, carStars, carAdult, REL_COLORS, originLine, bodyLabel, fuelLabel, getConsumptionForFuel, getPowerForFuel } from "@/app/lib/carFields";
import { matchesFuelOption, classifyGearboxTypes, GEARBOX_TYPES } from "@/app/db-test/lib/filters";
import type { DetailData, DetailEngine, DetailTransmission, DetailDrivetrainSystem } from "./types";

const fmtK = (v: number) => (v >= 1000 ? Math.round(v / 1000) + "k" : String(v));
// catalog_component_faults.severity's own frozen vocabulary (critical/moderate/minor, see
// scripts/catalog-vocabularies.json) -- different words and casing from the legacy schema's
// SEVERITY_COLORS (Critical/High/Medium/Low), so this is its own map, not a copy.
const SEVERITY_COLORS: Record<string, string> = { Critical: "#f44336", Moderate: "#ff9800", Minor: "#4caf50" };

const DRIVETRAIN_TYPE_LABELS: Record<string, string> = {
  haldex: "Haldex-type coupling",
  torsen: "Torsen mechanical diff",
  permanent: "Permanent / full-time",
  on_demand: "On-demand coupling",
  dual_motor: "Dual-motor (electric)",
};
const DT_TYPE_COLOR = "#8ab4f8";

interface DrivetrainGroup {
  system: DetailDrivetrainSystem;
  variants: string[];
}

function splitSentences(text: string): string[] {
  const parts = text.split(/\.\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
  return parts.map((s, i) => (i < parts.length - 1 ? s + "." : s));
}

interface TabDef { id: string; label: string; count?: number }

interface CarDetailProps {
  car: CarData;
  detail: DetailData | null;
  loading: boolean;
  fuelFilter: string[];
  gearboxFilter: string[];
  drivetrainFilter: string[];
  onBack: () => void;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Engines tab card. Reliability badge/dot removed vs. the Prehľad original -- catalog_engines
// has no reliability-tier column, and engine.reliability is literally "—" here (see
// app/api/db-test/route.ts), so a colored badge/dots row would just be gray noise on every
// single card rather than real signal.
function EngineAccordion({ car, engine, isOpen, onToggle }: { car: CarData; engine: DetailEngine; isOpen: boolean; onToggle: () => void }) {
  const isEV = engine.fuel_type === "electric" || engine.battery_kwh != null;
  const cons = engine.consumption ?? getConsumptionForFuel(car, engine.fuel_type);

  return (
    <div className={`eng-card${isOpen ? " open" : ""}`} onClick={onToggle}>
      <div className="eng-hdr">
        <div className="eng-left">
          <span className="eng-name">{engine.engine}</span>
          <div className="eng-tags">
            {engine.fuel_type && <span className="cfuel-tag">{fuelLabel(engine.fuel_type)}</span>}
          </div>
        </div>
        <span className="chevron">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="eng-body">
          <div className="cgrid">
            <div className="cgrid-item">
              <div className="cgrid-label">{isEV ? "Battery" : "Displacement"}</div>
              <div className="cgrid-val">{isEV ? (engine.battery_kwh != null ? `${engine.battery_kwh}kWh` : "—") : (engine.displacement_cc != null ? `${(engine.displacement_cc / 1000).toFixed(1)}L` : "—")}</div>
            </div>
            <div className="cgrid-item">
              <div className="cgrid-label">Torque</div>
              <div className="cgrid-val">{engine.torque_nm != null ? `${engine.torque_nm}Nm` : "—"}</div>
            </div>
            <div className="cgrid-item">
              <div className="cgrid-label">Drivetrain</div>
              <div className="cgrid-val">{engine.drivetrain || "—"}</div>
            </div>
            <div className="cgrid-item">
              <div className="cgrid-label">{isEV ? "Range" : "Consumption"}</div>
              <div className="cgrid-val">{isEV ? (engine.range_km != null ? `${engine.range_km}km` : "—") : (cons != null ? `${cons}L/100` : "—")}</div>
            </div>
          </div>
          {engine.faults?.length > 0 && (<>
            <div className="sub-label">{"⚠️"} Known faults</div>
            {engine.faults.map((f, fi) => <div key={fi} className="fault-item">{"·"} {f}</div>)}
          </>)}
        </div>
      )}
    </div>
  );
}

function TransmissionAccordion({ trans, isOpen, onToggle }: { trans: DetailTransmission; isOpen: boolean; onToggle: () => void }) {
  const typeLabel = GEARBOX_TYPES.find((tt) => tt.slug === trans.subtype)?.label;
  const [maintOpen, setMaintOpen] = useState(false);
  return (
    <div className={`tx-card${isOpen ? " open" : ""}`} onClick={onToggle}>
      <div className="eng-hdr">
        <div className="eng-left">
          <span className="eng-name">{trans.type}</span>
          <div className="eng-tags">
            {typeLabel && <span className="cfuel-tag">{typeLabel}</span>}
          </div>
        </div>
        <span className="chevron">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="eng-body">
          <div className="cgrid">
            {trans.unit?.maintenance_note ? (
              <div
                className="cgrid-item cgrid-item-btn"
                onClick={(e) => { e.stopPropagation(); setMaintOpen((v) => !v); }}
              >
                <div className="cgrid-val">{"🔧"} Maintenance {maintOpen ? "▴" : "▾"}</div>
              </div>
            ) : (
              <div className="cgrid-item">
                <div className="cgrid-label">Maintenance</div>
                <div className="cgrid-val">{trans.maintenance_km != null ? `${fmtK(trans.maintenance_km)}km` : "—"}</div>
              </div>
            )}
          </div>
          {maintOpen && trans.unit?.maintenance_note && (
            <div className="maint-card">
              {splitSentences(trans.unit.maintenance_note).map((s, si) => (
                <div key={si} className="maint-item">{s}</div>
              ))}
            </div>
          )}
          {trans.unit?.reliability_note ? (
            <>
              <div className="sub-label">{"⚠️"} Reliability</div>
              <div style={{ fontSize: ".78rem", color: "#9999aa", lineHeight: 1.5, marginBottom: 8 }}>{trans.unit.reliability_note}</div>
              {trans.faults?.length > 0 && (<>
                <div className="sub-label">This car</div>
                {trans.faults.map((f, fi) => <div key={fi} className="fault-item">{"·"} {f}</div>)}
              </>)}
            </>
          ) : (
            trans.faults?.length > 0 && (<>
              <div className="sub-label">{"⚠️"} Known faults</div>
              {trans.faults.map((f, fi) => <div key={fi} className="fault-item">{"·"} {f}</div>)}
            </>)
          )}
        </div>
      )}
    </div>
  );
}

function DrivetrainAccordion({ group, showVariants, isOpen, onToggle }: { group: DrivetrainGroup; showVariants: boolean; isOpen: boolean; onToggle: () => void }) {
  const { system, variants } = group;
  const typeLabel = DRIVETRAIN_TYPE_LABELS[system.type] || cap(system.type);
  return (
    <div className={`tx-card${isOpen ? " open" : ""}`} onClick={onToggle}>
      <div className="eng-hdr">
        <div className="eng-left">
          <span className="eng-name">{system.generation || system.code}</span>
          <div className="eng-tags">
            <span className="eng-badge" style={{ background: DT_TYPE_COLOR + "22", color: DT_TYPE_COLOR, border: `1px solid ${DT_TYPE_COLOR}44` }}>{typeLabel}</span>
            {system.maker && <span className="cfuel-tag">{system.maker}</span>}
            <span className="cfuel-tag" style={{ fontFamily: "monospace" }}>{system.code}</span>
          </div>
        </div>
        <span className="chevron">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="eng-body">
          {system.description && <div style={{ fontSize: ".78rem", color: "#9999aa", lineHeight: 1.5, marginBottom: 4 }}>{system.description}</div>}
          {showVariants && variants.length > 0 && (
            <div style={{ fontSize: ".72rem", color: "#6b6b72", marginBottom: 8 }}>Applies to: {variants.join(", ")}</div>
          )}
          {system.reliability_note && (<>
            <div className="sub-label">{"⚠️"} Reliability</div>
            <div style={{ fontSize: ".78rem", color: "#9999aa", lineHeight: 1.5 }}>{system.reliability_note}</div>
          </>)}
        </div>
      )}
    </div>
  );
}

export default function CarDetail({ car, detail, loading, fuelFilter, gearboxFilter, drivetrainFilter, onBack }: CarDetailProps) {
  const [activeTabState, setActiveTabState] = useState<string | null>(null);
  const [openEngines, setOpenEngines] = useState<Record<number, boolean>>({});
  const [openTrans, setOpenTrans] = useState<Record<number, boolean>>({});
  const [openDrivetrain, setOpenDrivetrain] = useState<Record<number, boolean>>({});

  const price = `€${fmtK(carPriceMin(car))}–${fmtK(carPriceMax(car))}`;
  const rel = carRel(car);
  const relColor = REL_COLORS[rel] || "#888";
  const stars = carStars(car);
  const adult = carAdult(car);
  const child = car.safety?.childOccupant;
  const ped = car.safety?.pedestrian;
  const assist = car.safety?.safetyAssist;
  const ncapYear = car.safety?.ncapYear;

  const carGearboxTypes = useMemo(() => classifyGearboxTypes(car), [car]);
  const matchedFuels = (fuelFilter || []).filter((sel) => (car.fuel || []).some((f) => matchesFuelOption(f, sel)));
  const matchedDrive = (drivetrainFilter || []).filter((sel) => (car.drivetrains || []).includes(sel));
  const matchedGearbox = (gearboxFilter || []).filter((sel) => carGearboxTypes.includes(sel));
  const hasUnlockedSpecs = matchedFuels.length > 0 || matchedDrive.length > 0 || matchedGearbox.length > 0;

  const teaserText = useMemo(() => {
    const parts: string[] = [];
    if (car.engineCount) parts.push(`${car.engineCount} engine${car.engineCount > 1 ? "s" : ""}`);
    if (car.transmissionCount) parts.push(`${car.transmissionCount} gearbox${car.transmissionCount > 1 ? "es" : ""}`);
    const fuels = (car.fuel || []).map(cap);
    if (fuels.length) parts.push(fuels.join("/"));
    const drives = car.drivetrains || [];
    if (drives.length > 1) parts.push(drives.join(" & "));
    return parts.length ? parts.join(" · ") : "Explore variants";
  }, [car]);

  const filteredEngines = useMemo(() => {
    const all = detail?.e ?? [];
    if (!fuelFilter || fuelFilter.length === 0) return all;
    return all.filter((e) => fuelFilter.some((sel) => matchesFuelOption(e.fuel_type, sel)));
  }, [detail, fuelFilter]);

  const drivetrainGroups = useMemo<DrivetrainGroup[]>(() => {
    const groups: DrivetrainGroup[] = [];
    const byCode = new Map<string, DrivetrainGroup>();
    for (const t of detail?.t ?? []) {
      if (!t.drivetrainSystem) continue;
      const existing = byCode.get(t.drivetrainSystem.code);
      if (existing) {
        existing.variants.push(t.type);
      } else {
        const group: DrivetrainGroup = { system: t.drivetrainSystem, variants: [t.type] };
        byCode.set(t.drivetrainSystem.code, group);
        groups.push(group);
      }
    }
    return groups;
  }, [detail]);

  const tabs: TabDef[] = [];
  if (filteredEngines.length > 0) tabs.push({ id: "engines", label: "Engines", count: filteredEngines.length });
  if ((detail?.t.length ?? 0) > 0) tabs.push({ id: "transmissions", label: "Gearboxes", count: detail!.t.length });
  if (drivetrainGroups.length > 0) tabs.push({ id: "drivetrain", label: "Drivetrain System", count: drivetrainGroups.length });
  if ((detail?.dims.length ?? 0) > 0) tabs.push({ id: "dimensions", label: "Dimensions", count: detail!.dims.length });
  if ((detail?.q.length ?? 0) > 0) tabs.push({ id: "equipment", label: "Trims", count: detail!.q.length });
  if ((detail?.c.length ?? 0) > 0) tabs.push({ id: "faults", label: "Common faults", count: detail!.c.length });
  tabs.push({ id: "safety", label: "NCAP" });

  const activeTab = activeTabState && tabs.some((t) => t.id === activeTabState) ? activeTabState : (tabs[0]?.id ?? null);

  return (
    <div className="detail-view">
      <button className="btn-back" style={{ width: "100%", marginBottom: 14 }} onClick={onBack}>{"←"} Back to results</button>

      <div className="detail-header">
        <div className="cmake">{car.make}</div>
        <div className="cmodel">{car.model}</div>
        <div className="cgen">{originLine(car)}</div>
        <div className="row-tags" style={{ marginTop: 8 }}>
          <span className="cfuel-tag">{bodyLabel(car.body)}</span>
          {(car.fuel || []).map((f) => <span key={f} className="cfuel-tag">{fuelLabel(f)}</span>)}
        </div>
        <div className="cprice" style={{ marginTop: 8 }}>{price}</div>

        {hasUnlockedSpecs ? (<>
          <div className="mp-hint" style={{ marginTop: 10, marginBottom: 4 }}>Matches your filter</div>
          <div className="cgrid">
            {matchedFuels.map((sel) => {
              const p = getPowerForFuel(car, sel);
              const cons = getConsumptionForFuel(car, sel);
              return (
                <div className="cgrid-item" key={`fuel-${sel}`}>
                  <div className="cgrid-label">{cap(sel)}</div>
                  <div className="cgrid-val">{p != null ? `${p}kW` : "—"}{cons != null ? ` · ${cons}L/100` : ""}</div>
                </div>
              );
            })}
            {matchedDrive.length > 0 && (
              <div className="cgrid-item">
                <div className="cgrid-label">Drive</div>
                <div className="cgrid-val">{matchedDrive.join(" / ")}</div>
              </div>
            )}
            {matchedGearbox.length > 0 && (
              <div className="cgrid-item">
                <div className="cgrid-label">Gearbox</div>
                <div className="cgrid-val">{matchedGearbox.map((s) => GEARBOX_TYPES.find((t) => t.slug === s)?.label || s).join(" / ")}</div>
              </div>
            )}
          </div>
        </>) : (
          <button type="button" className="variety-teaser" onClick={() => setActiveTabState("engines")}>
            {teaserText} <span className="vt-cta">— tap to explore</span>
          </button>
        )}

        <div className="trust-row">
          <span className="rel-pill" style={{ background: relColor + "22", color: relColor, border: `1px solid ${relColor}44` }}>{rel}</span>
          {stars != null ? (
            <div className="ncap-stars-row" style={{ marginBottom: 0 }}>
              {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`ns-lg${n <= stars ? " on" : ""}`}>{"★"}</span>)}
              <span className="ns-label">{stars}/5 NCAP</span>
            </div>
          ) : (
            <span className="ncap-na" style={{ padding: 0 }}>{"⚠️"} Not tested</span>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-spin"><div className="spin" /><span>Loading {car.make} {car.model} details...</span></div>
      )}

      {!loading && tabs.length > 0 && (<>
        <div className="tab-bar">
          {tabs.map((t) => (
            <button key={t.id} className={`tab${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTabState(t.id)}>
              {t.label}{t.count != null ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>

        {activeTab === "engines" && (
          <div className="mp-section">
            {filteredEngines.map((e, i) => (
              <EngineAccordion key={i} car={car} engine={e} isOpen={!!openEngines[i]} onToggle={() => setOpenEngines((p) => ({ ...p, [i]: !p[i] }))} />
            ))}
          </div>
        )}

        {activeTab === "transmissions" && (
          <div className="mp-section">
            {(detail?.t ?? []).length === 0 ? (
              <div className="mp-hint">No data available.</div>
            ) : (
              detail!.t.map((t, i) => (
                <TransmissionAccordion key={i} trans={t} isOpen={!!openTrans[i]} onToggle={() => setOpenTrans((p) => ({ ...p, [i]: !p[i] }))} />
              ))
            )}
          </div>
        )}

        {activeTab === "drivetrain" && (
          <div className="mp-section">
            {drivetrainGroups.map((g, i) => (
              <DrivetrainAccordion
                key={g.system.code}
                group={g}
                showVariants={drivetrainGroups.length > 1}
                isOpen={!!openDrivetrain[i]}
                onToggle={() => setOpenDrivetrain((p) => ({ ...p, [i]: !p[i] }))}
              />
            ))}
          </div>
        )}

        {/* New vs. the Prehľad original -- phase_body_dimensions is per (phase, body_type),
            which the legacy vehicles table never modeled (one flat dimension set per
            generation). No existing tab had anywhere to put this, so it's a tab of its own:
            one .cgrid block per body, same classes as every other tab's grid. */}
        {activeTab === "dimensions" && (
          <div className="mp-section">
            {(detail?.dims ?? []).map((d, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div className="sub-label">{d.bodyName}</div>
                <div className="cgrid">
                  <div className="cgrid-item"><div className="cgrid-label">Length</div><div className="cgrid-val">{d.length != null ? `${d.length}mm` : "—"}</div></div>
                  <div className="cgrid-item"><div className="cgrid-label">Width</div><div className="cgrid-val">{d.width != null ? `${d.width}mm` : "—"}</div></div>
                  <div className="cgrid-item"><div className="cgrid-label">Height</div><div className="cgrid-val">{d.height != null ? `${d.height}mm` : "—"}</div></div>
                  <div className="cgrid-item"><div className="cgrid-label">Ground clearance</div><div className="cgrid-val">{d.groundClearance != null ? `${d.groundClearance}mm` : "—"}</div></div>
                  <div className="cgrid-item"><div className="cgrid-label">Curb weight</div><div className="cgrid-val">{d.curbWeight != null ? `${d.curbWeight}kg` : "—"}</div></div>
                  <div className="cgrid-item"><div className="cgrid-label">Boot</div><div className="cgrid-val">{d.bootCapacity != null ? `${d.bootCapacity}L` : "—"}</div></div>
                  <div className="cgrid-item"><div className="cgrid-label">Boot (max)</div><div className="cgrid-val">{d.bootMax != null ? `${d.bootMax}L` : "—"}</div></div>
                  <div className="cgrid-item"><div className="cgrid-label">Gross vehicle weight</div><div className="cgrid-val">{d.grossVehicleWeight != null ? `${d.grossVehicleWeight}kg` : "—"}</div></div>
                  <div className="cgrid-item"><div className="cgrid-label">Payload</div><div className="cgrid-val">{d.payload != null ? `${d.payload}kg` : "—"}</div></div>
                  <div className="cgrid-item"><div className="cgrid-label">Fuel tank</div><div className="cgrid-val">{d.fuelTank != null ? `${d.fuelTank}L` : "—"}</div></div>
                  <div className="cgrid-item"><div className="cgrid-label">Seats</div><div className="cgrid-val">{d.seats ?? "—"}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "equipment" && (
          <div className="mp-section">
            {(detail?.q ?? []).length === 0 ? (
              <div className="mp-hint">No data available.</div>
            ) : (
              detail!.q.map((eq, i) => (
                <div key={i} className="eq-item">
                  <div className="eq-trim">{eq.trim}</div>
                  <div className="eq-feats">{eq.features}</div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "faults" && (
          <div className="mp-section">
            {(detail?.c ?? []).length === 0 ? (
              <div className="mp-hint">No data available.</div>
            ) : (
              detail!.c.map((f, i) => {
                const color = SEVERITY_COLORS[f.severity] || "#888";
                return (
                  <div key={i} className="fault-block">
                    <div className="fault-hdr">
                      <span className="fault-area">{f.area}</span>
                      <span className="fault-sev" style={{ background: color + "22", color, border: `1px solid ${color}44` }}>{f.severity}</span>
                    </div>
                    <div className="fault-detail">{f.detail}</div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Safety — Euro NCAP only. The Prehľad original additionally shows GSR2-mandated
            and beyond-baseline safety-feature sections (safety_features/
            vehicle_safety_features) -- catalog_ has no equivalent table at all, so rather
            than render a permanent "reference data isn't loaded" placeholder for every single
            car, that content is left out entirely here. */}
        {activeTab === "safety" && (
          <div className="mp-section">
            <div className="mp-title">{"\u{1F6E1}️"} NCAP {"—"} Euro NCAP</div>
            {stars != null ? (
              <div className="ncap-detail">
                <div className="ncap-stars-row">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`ns-lg${n <= (stars || 0) ? " on" : ""}`}>{"★"}</span>)}<span className="ns-label">{stars}/5{ncapYear ? ` · ${ncapYear}` : ""}</span></div>
                {[{ l: "Adult", v: adult }, { l: "Child", v: child }, { l: "Pedestrian", v: ped }, { l: "Safety Assist", v: assist }].filter((b) => b.v != null).map((b) => (
                  <div key={b.l} className="ncap-bar"><span className="ncap-bl">{b.l}</span><div className="ncap-track"><div className="ncap-fill" style={{ width: b.v + "%", background: (b.v || 0) >= 90 ? "#4caf50" : (b.v || 0) >= 75 ? "#e8ff47" : (b.v || 0) >= 60 ? "#ff9800" : "#f44336" }} /></div><span className="ncap-pv">{b.v}%</span></div>
                ))}
                <div className="ncap-verdict" style={{ color: (stars || 0) >= 5 ? "#4caf50" : (stars || 0) >= 4 ? "#e8ff47" : "#ff9800" }}>{(stars || 0) >= 5 ? "Outstanding safety" : (stars || 0) >= 4 ? "Good — 4 stars" : (stars || 0) >= 3 ? "⚠️ Below average" : "⚠️ Poor rating"}</div>
              </div>
            ) : <div className="ncap-na">{"⚠️"} Not tested by Euro NCAP</div>}
          </div>
        )}
      </>)}

      {!loading && tabs.length === 0 && (
        <div className="mp-hint" style={{ padding: "20px 0" }}>No detail data available for this car.</div>
      )}
    </div>
  );
}
