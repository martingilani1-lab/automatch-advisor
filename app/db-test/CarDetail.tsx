"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carPriceMax, carRel, carStars, carAdult, REL_COLORS, originLine, bodyLabel, fuelLabel, getConsumptionForFuel, getPowerForFuel } from "@/app/lib/carFields";
import { matchesFuelOption, classifyGearboxTypes, GEARBOX_TYPES } from "@/app/db-test/lib/filters";
import { gearboxHeaderLabel } from "@/app/catalog/lib/gearboxLabel";
import { cylindersLabel } from "@/app/catalog/lib/cylindersLabel";
import type { PhaseSwitcherOption } from "@/app/catalog/components/PhaseSwitcher";
import type { ConfigNavTarget } from "@/app/catalog/components/ConfigurationsTable";
import ConfigRows from "./ConfigRows";
import type { DetailData, DetailDrivetrainGroup, DetailEngine, DetailGearboxGroup, DetailFaultItem } from "./types";

const fmtK = (v: number) => (v >= 1000 ? Math.round(v / 1000) + "k" : String(v));
// catalog_component_faults.severity's own frozen vocabulary (critical/moderate/minor, see
// scripts/catalog-vocabularies.json) -- different words and casing from the legacy schema's
// SEVERITY_COLORS (Critical/High/Medium/Low), so this is its own map, not a copy.
const SEVERITY_COLORS: Record<string, string> = { Critical: "#f44336", Moderate: "#ff9800", Minor: "#4caf50" };

// Per-item severity badge on the engine/gearbox "Known faults" lists below (distinct from the
// SEVERITY_COLORS map above, which colors the flat "Common faults" tab and keeps minor=green
// there, an existing convention left untouched). Here minor uses blue -- an informational
// tone, distinct from the red/amber alert colors -- rather than green, so a low-severity
// fault doesn't read as a reassuring "all good" signal. (Grey was tried first but kept
// reading as "no badge at all" against this dark theme.)
const FAULT_ITEM_SEVERITY_COLORS: Record<string, string> = { critical: "#f44336", moderate: "#ff9800", minor: "#4a9eff" };
const FAULT_ITEM_SEVERITY_ORDER: Record<string, number> = { critical: 0, moderate: 1, minor: 2 };

// Shared by EngineAccordion and TransmissionAccordion so both "Known faults" lists look
// identical: sorted critical -> moderate -> minor -> (no severity recorded), each item
// carrying its own colored severity badge.
function FaultsBlock({ faults, gapsMode }: { faults: DetailFaultItem[]; gapsMode: boolean }) {
  if (faults.length === 0) return <MissingMarker gapsMode={gapsMode} label="known faults" />;
  const sorted = [...faults].sort(
    (a, b) => (FAULT_ITEM_SEVERITY_ORDER[a.severity ?? ""] ?? 3) - (FAULT_ITEM_SEVERITY_ORDER[b.severity ?? ""] ?? 3)
  );
  return (
    <>
      <div className="sub-label">{"⚠️"} Known faults</div>
      {sorted.map((f, fi) => {
        const color = f.severity ? FAULT_ITEM_SEVERITY_COLORS[f.severity] ?? "#4a9eff" : "#4a9eff";
        return (
          <div key={fi} className="fault-item">
            {f.severity && (
              <span className="fault-sev" style={{ background: color + "22", color, border: `1px solid ${color}44`, marginRight: 6 }}>
                {f.severity}
              </span>
            )}
            {f.fault}
          </div>
        );
      })}
    </>
  );
}

// Small pill chips for the body types/drivetrains a given engine+gearbox pairing is offered
// with -- reuses .cfuel-tag's existing rounded-chip look rather than a separate block per
// body/drivetrain.
function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, marginBottom: 6 }}>
      {items.map((item) => (
        <span key={item} className="cfuel-tag">{item}</span>
      ))}
    </div>
  );
}

const DRIVETRAIN_TYPE_LABELS: Record<string, string> = {
  haldex: "Haldex-type coupling",
  torsen: "Torsen mechanical diff",
  permanent: "Permanent / full-time",
  on_demand: "On-demand coupling",
  dual_motor: "Dual-motor (electric)",
};
const DT_TYPE_COLOR = "#8ab4f8";

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
  // ?gaps=1 -- read by the engine/gearbox/drivetrain widgets' reliability/pros/cons/faults/
  // notes fields (EngineAccordion, GearboxAccordion, DrivetrainAccordion below). In normal
  // mode a missing one of those is hidden entirely, matching every other field in this view;
  // gaps mode shows it instead.
  gapsMode: boolean;
  onBack: () => void;
  // Every sibling phase of this car's generation (vehicle page redesign step 1's phase
  // switcher) -- empty until DbTestView's detail fetch resolves, same "load everything in
  // one fetch, switch is pure client state" shape as /catalog's VehiclePageClient.
  siblingPhases: PhaseSwitcherOption[];
  onSwitchPhase: (phaseId: string) => void;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function phaseLabelText(p: PhaseSwitcherOption): string {
  const label = p.phaseLabel ?? "";
  if (p.yearFrom == null) return label;
  // Open-ended year_to (still in production) shows a trailing "–" with nothing after it.
  const years = `${p.yearFrom}–${p.yearTo ?? ""}`;
  return label ? `${label} ${years}` : years;
}

// Phase switcher, reusing the exact .tab-bar/.tab classes the main tab bar below already
// uses -- the /catalog equivalent (PhaseSwitcher.tsx) is Tailwind-styled and looked visually
// foreign dropped into this page's hand-rolled design, so this is a native-styled sibling
// rather than that shared component. Renders static text (no switcher at all) when the
// generation has only one phase.
function PhaseSwitcherTabs({ phases, selectedId, onSelect }: { phases: PhaseSwitcherOption[]; selectedId: string; onSelect: (id: string) => void }) {
  if (phases.length === 0) return null;
  if (phases.length === 1) {
    return <div className="tg" style={{ marginBottom: 10 }}>{phaseLabelText(phases[0])}</div>;
  }
  return (
    <div className="tab-bar">
      {phases.map((p) => (
        <button key={p.id} className={`tab${p.id === selectedId ? " active" : ""}`} onClick={() => onSelect(p.id)}>
          {phaseLabelText(p)}
        </button>
      ))}
    </div>
  );
}

// "—" is this view's existing missing-value convention (see every `?? "—"`/`|| "—"` in this
// file) -- gaps mode swaps that single dash for a visible, explicit marker instead of hiding
// it, reusing the same .fault-sev pill look the faults list already uses for a severity badge.
function MissingMarker({ gapsMode, label }: { gapsMode: boolean; label: string }) {
  if (!gapsMode) return null;
  return (
    <span className="fault-sev" style={{ background: "#ff980022", color: "#ff9800", border: "1px solid #ff980044" }}>
      missing: {label}
    </span>
  );
}

// Gearboxes tab card. A gearbox is a real, standalone unit, its own top-level tab
// independent of Engines -- the same gearbox can be paired with several different engines
// (engineNames below is which ones, shown as chips alongside body/drivetrain).
function GearboxAccordion({ gearbox, gapsMode, isOpen, onToggle }: { gearbox: DetailGearboxGroup; gapsMode: boolean; isOpen: boolean; onToggle: () => void }) {
  const typeLabel = GEARBOX_TYPES.find((tt) => tt.slug === gearbox.family)?.label;
  const [maintOpen, setMaintOpen] = useState(false);
  const rc = gearbox.reliability !== "—" ? REL_COLORS[gearbox.reliability] || "#888" : null;
  return (
    <div id={`gearbox-${gearbox.id}`} className={`tx-card${isOpen ? " open" : ""}`} onClick={onToggle}>
      <div className="eng-hdr">
        <div className="eng-left">
          <span className="eng-name">{gearboxHeaderLabel(gearbox.code, gearbox.speeds, gearbox.family)}</span>
          <div className="eng-tags">
            {rc ? (
              <span className="eng-badge" style={{ background: rc + "22", color: rc, border: `1px solid ${rc}44` }}>{gearbox.reliability}</span>
            ) : (
              <MissingMarker gapsMode={gapsMode} label="reliability rating" />
            )}
            {typeLabel && <span className="cfuel-tag">{typeLabel}</span>}
            {gearbox.speeds == null && <MissingMarker gapsMode={gapsMode} label="speeds" />}
          </div>
        </div>
        <span className="chevron">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="eng-body">
          <Chips items={[...gearbox.engineNames, ...gearbox.bodyNames, ...gearbox.drivetrainLabels]} />
          {gearbox.maintenance_note ? (
            <div className="cgrid">
              <div
                className="cgrid-item cgrid-item-btn"
                onClick={(e) => { e.stopPropagation(); setMaintOpen((v) => !v); }}
              >
                <div className="cgrid-val">{"🔧"} Maintenance {maintOpen ? "▴" : "▾"}</div>
              </div>
            </div>
          ) : (
            <MissingMarker gapsMode={gapsMode} label="maintenance note" />
          )}
          {maintOpen && gearbox.maintenance_note && (
            <div className="maint-card">
              {splitSentences(gearbox.maintenance_note).map((s, si) => (
                <div key={si} className="maint-item">{s}</div>
              ))}
            </div>
          )}
          {gearbox.reliability_note ? (
            <>
              <div className="sub-label">{"⚠️"} Reliability</div>
              <div style={{ fontSize: ".78rem", color: "#9999aa", lineHeight: 1.5, marginBottom: 8 }}>{gearbox.reliability_note}</div>
            </>
          ) : (
            <MissingMarker gapsMode={gapsMode} label="reliability note" />
          )}
          {gearbox.pros?.length > 0 && (<>
            <div className="sub-label">{"✅"} Pros</div>
            {gearbox.pros.map((p, pi) => <div key={pi} className="pro-item">{"·"} {p}</div>)}
          </>)}
          {gearbox.pros?.length === 0 && <MissingMarker gapsMode={gapsMode} label="pros" />}
          {gearbox.cons?.length > 0 && (<>
            <div className="sub-label">{"❌"} Cons</div>
            {gearbox.cons.map((c, ci) => <div key={ci} className="con-item">{"·"} {c}</div>)}
          </>)}
          {gearbox.cons?.length === 0 && <MissingMarker gapsMode={gapsMode} label="cons" />}
          {/* catalog_component_faults keys a fault to the unit itself (shared across every
              car using this gearbox), not this one car -- always "Known faults", never
              "This car". */}
          <FaultsBlock faults={gearbox.faults} gapsMode={gapsMode} />
          {gearbox.phase_note ? (
            <>
              <div className="sub-label">In this car</div>
              <div style={{ fontSize: ".78rem", color: "#9999aa", lineHeight: 1.5 }}>{gearbox.phase_note}</div>
            </>
          ) : (
            <MissingMarker gapsMode={gapsMode} label="in-this-car note" />
          )}
        </div>
      )}
    </div>
  );
}

// Engines tab card.
function EngineAccordion({ engine, gapsMode, isOpen, onToggle }: { engine: DetailEngine; gapsMode: boolean; isOpen: boolean; onToggle: () => void }) {
  const rc = engine.reliability !== "—" ? REL_COLORS[engine.reliability] || "#888" : null;
  const cylinders = cylindersLabel(engine.cylinders);

  return (
    <div id={`engine-${engine.id}`} className={`eng-card${isOpen ? " open" : ""}`} onClick={onToggle}>
      <div className="eng-hdr">
        <div className="eng-left">
          <span className="eng-name">{engine.engine}</span>
          <div className="eng-tags">
            {rc ? (
              <span className="eng-badge" style={{ background: rc + "22", color: rc, border: `1px solid ${rc}44` }}>{engine.reliability}</span>
            ) : (
              <MissingMarker gapsMode={gapsMode} label="reliability rating" />
            )}
            {engine.fuel_type && <span className="cfuel-tag">{fuelLabel(engine.fuel_type)}</span>}
          </div>
        </div>
        <span className="chevron">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="eng-body">
          <Chips items={engine.bodyNames} />
          <div className="cgrid">
            {engine.displacement_cc != null && (
              <div className="cgrid-item">
                <div className="cgrid-label">Displacement</div>
                <div className="cgrid-val">{engine.displacement_cc} cm³</div>
              </div>
            )}
            {engine.torque_nm != null && (
              <div className="cgrid-item">
                <div className="cgrid-label">Torque</div>
                <div className="cgrid-val">{engine.torque_nm} Nm</div>
              </div>
            )}
            {cylinders != null && (
              <div className="cgrid-item">
                <div className="cgrid-label">Cylinders</div>
                <div className="cgrid-val">{cylinders}</div>
              </div>
            )}
          </div>
          {engine.pros?.length > 0 && (<>
            <div className="sub-label">{"✅"} Pros</div>
            {engine.pros.map((p, pi) => <div key={pi} className="pro-item">{"·"} {p}</div>)}
          </>)}
          {engine.pros?.length === 0 && <MissingMarker gapsMode={gapsMode} label="pros" />}
          {engine.cons?.length > 0 && (<>
            <div className="sub-label">{"❌"} Cons</div>
            {engine.cons.map((c, ci) => <div key={ci} className="con-item">{"·"} {c}</div>)}
          </>)}
          {engine.cons?.length === 0 && <MissingMarker gapsMode={gapsMode} label="cons" />}
          <FaultsBlock faults={engine.faults} gapsMode={gapsMode} />
        </div>
      )}
    </div>
  );
}

function DrivetrainAccordion({ group, showVariants, gapsMode, isOpen, onToggle }: { group: DetailDrivetrainGroup; showVariants: boolean; gapsMode: boolean; isOpen: boolean; onToggle: () => void }) {
  const { system, variants } = group;
  const typeLabel = DRIVETRAIN_TYPE_LABELS[system.type] || cap(system.type);
  const rc = system.reliability !== "—" ? REL_COLORS[system.reliability] || "#888" : null;
  return (
    <div id={`drivetrain-${system.id}`} className={`tx-card${isOpen ? " open" : ""}`} onClick={onToggle}>
      <div className="eng-hdr">
        <div className="eng-left">
          <span className="eng-name">{system.generation || system.code}</span>
          <div className="eng-tags">
            <span className="eng-badge" style={{ background: DT_TYPE_COLOR + "22", color: DT_TYPE_COLOR, border: `1px solid ${DT_TYPE_COLOR}44` }}>{typeLabel}</span>
            {rc ? (
              <span className="eng-badge" style={{ background: rc + "22", color: rc, border: `1px solid ${rc}44` }}>{system.reliability}</span>
            ) : (
              <MissingMarker gapsMode={gapsMode} label="reliability rating" />
            )}
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
            <div style={{ fontSize: ".78rem", color: "#9999aa", lineHeight: 1.5, marginBottom: 8 }}>{system.reliability_note}</div>
          </>)}
          {system.pros.length > 0 && (<>
            <div className="sub-label">{"✅"} Pros</div>
            {system.pros.map((p, pi) => <div key={pi} className="pro-item">{"·"} {p}</div>)}
          </>)}
          {system.pros.length === 0 && <MissingMarker gapsMode={gapsMode} label="pros" />}
          {system.cons.length > 0 && (<>
            <div className="sub-label">{"❌"} Cons</div>
            {system.cons.map((c, ci) => <div key={ci} className="con-item">{"·"} {c}</div>)}
          </>)}
          {system.cons.length === 0 && <MissingMarker gapsMode={gapsMode} label="cons" />}
        </div>
      )}
    </div>
  );
}

export default function CarDetail({ car, detail, loading, fuelFilter, gearboxFilter, drivetrainFilter, gapsMode, onBack, siblingPhases, onSwitchPhase }: CarDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTabState, setActiveTabState] = useState<string | null>(null);
  const [openEngines, setOpenEngines] = useState<Record<number, boolean>>({});
  const [openGearboxes, setOpenGearboxes] = useState<Record<number, boolean>>({});
  const [openDrivetrain, setOpenDrivetrain] = useState<Record<number, boolean>>({});

  const focusEngine = searchParams.get("engine");
  const focusUnit = searchParams.get("unit");
  const focusDrivetrain = searchParams.get("drivetrain");

  function updateParams(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleConfigNavigate(target: ConfigNavTarget) {
    updateParams((p) => {
      p.set("tab", target.kind === "engine" ? "engines" : target.kind === "unit" ? "gearboxes" : "drivetrain");
      p.delete("engine");
      p.delete("unit");
      p.delete("drivetrain");
      p.set(target.kind, target.id);
    });
  }

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

  const gearboxGroups = detail?.g ?? [];
  const drivetrainGroups = detail?.dt ?? [];

  const configs = detail?.configs ?? [];

  const tabs: TabDef[] = [];
  if (configs.length > 0) tabs.push({ id: "configurations", label: "Configurations", count: configs.length });
  if (filteredEngines.length > 0) tabs.push({ id: "engines", label: "Engines", count: filteredEngines.length });
  if (gearboxGroups.length > 0) tabs.push({ id: "gearboxes", label: "Gearboxes", count: gearboxGroups.length });
  if (drivetrainGroups.length > 0) tabs.push({ id: "drivetrain", label: "Drivetrain System", count: drivetrainGroups.length });
  if ((detail?.dims.length ?? 0) > 0) tabs.push({ id: "dimensions", label: "Dimensions", count: detail!.dims.length });
  if ((detail?.q.length ?? 0) > 0) tabs.push({ id: "equipment", label: "Trims", count: detail!.q.length });
  if ((detail?.c.length ?? 0) > 0) tabs.push({ id: "faults", label: "Common faults", count: detail!.c.length });
  tabs.push({ id: "safety", label: "NCAP" });

  // The URL's own ?tab= wins over local state when it names a real tab -- set by
  // handleConfigNavigate (a Configurations-row click) or by a shared/refreshed link.
  const tabParam = searchParams.get("tab");
  const urlTab = tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : null;
  const activeTab = urlTab ?? (activeTabState && tabs.some((t) => t.id === activeTabState) ? activeTabState : (tabs[0]?.id ?? null));

  function selectTab(id: string) {
    setActiveTabState(id);
    updateParams((p) => {
      p.set("tab", id);
      p.delete("engine");
      p.delete("unit");
      p.delete("drivetrain");
    });
  }

  // The focused engine/gearbox/drivetrain (if any) must render open even if the user never
  // clicked it -- computed during render (not set via effect) so there's no cascading-render
  // setState-in-effect; each accordion's isOpen below ORs this in with its own toggle state.
  const focusEngineIdx = focusEngine ? filteredEngines.findIndex((e) => e.id === focusEngine) : -1;
  const focusUnitIdx = focusUnit ? gearboxGroups.findIndex((g) => g.id === focusUnit) : -1;
  const focusDrivetrainIdx = focusDrivetrain ? drivetrainGroups.findIndex((g) => g.system.id === focusDrivetrain) : -1;

  // Scrolls to and briefly highlights the focused widget -- an imperative DOM action, so it
  // stays in an effect (unlike the "open" state above), firing after the tab switch has
  // already committed, so the target card actually exists to scroll to.
  useEffect(() => {
    const focusId = focusEngine ? `engine-${focusEngine}` : focusUnit ? `gearbox-${focusUnit}` : focusDrivetrain ? `drivetrain-${focusDrivetrain}` : null;
    if (!focusId) return;
    const el = document.getElementById(focusId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight-pulse");
    const t = setTimeout(() => el.classList.remove("highlight-pulse"), 1200);
    return () => clearTimeout(t);
  }, [activeTab, focusEngine, focusUnit, focusDrivetrain]);

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
          <button type="button" className="variety-teaser" onClick={() => selectTab("engines")}>
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
        <PhaseSwitcherTabs phases={siblingPhases} selectedId={car.id} onSelect={onSwitchPhase} />

        <div className="tab-bar">
          {tabs.map((t) => (
            <button key={t.id} className={`tab${activeTab === t.id ? " active" : ""}`} onClick={() => selectTab(t.id)}>
              {t.label}{t.count != null ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>

        {activeTab === "engines" && (
          <div className="mp-section">
            {filteredEngines.map((e, i) => (
              <EngineAccordion key={i} engine={e} gapsMode={gapsMode} isOpen={!!openEngines[i] || i === focusEngineIdx} onToggle={() => setOpenEngines((p) => ({ ...p, [i]: !p[i] }))} />
            ))}
          </div>
        )}

        {activeTab === "configurations" && (
          <div className="mp-section">
            <ConfigRows configs={configs} onNavigate={handleConfigNavigate} />
          </div>
        )}

        {activeTab === "gearboxes" && (
          <div className="mp-section">
            {gearboxGroups.map((g, i) => (
              <GearboxAccordion key={g.code} gearbox={g} gapsMode={gapsMode} isOpen={!!openGearboxes[i] || i === focusUnitIdx} onToggle={() => setOpenGearboxes((p) => ({ ...p, [i]: !p[i] }))} />
            ))}
          </div>
        )}

        {activeTab === "drivetrain" && (
          <div className="mp-section">
            {drivetrainGroups.map((g, i) => (
              <DrivetrainAccordion
                key={g.system.code}
                group={g}
                showVariants={drivetrainGroups.length > 1}
                gapsMode={gapsMode}
                isOpen={!!openDrivetrain[i] || i === focusDrivetrainIdx}
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
