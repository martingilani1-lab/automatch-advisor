"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconCheck, IconShieldCheck } from "@tabler/icons-react";
import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carPriceMax, carRel, carStars, carAdult, carMileage, carModelBase, REL_COLORS, originLine, bodyLabel, fuelLabel, getConsumptionForFuel, getPowerForFuel, isGsr2Era } from "@/app/lib/carFields";
import type { SafetyFeature } from "@/app/prehlad/types";
import { matchesFuelOption, classifyGearboxTypes, GEARBOX_TYPES } from "@/app/db-test/lib/filters";
import { gearboxHeaderLabel } from "@/app/catalog/lib/gearboxLabel";
import { cylindersLabel } from "@/app/catalog/lib/cylindersLabel";
import { tierLabel, buildTrimLayout, resolveTrimFeatures, trimComparisonLabel, buildCompareRows, safetyEquipmentAvailability, safetyEquipmentAvailabilityLabel, distinctSafetyFeatureSlugs, trimFeatureCategory, TRIM_CATEGORY_ORDER, TRIM_CATEGORY_LABELS, type CompareRow, type ResolvedFeatureRow } from "@/app/catalog/lib/trimsDisplay";
import type { CatalogTrim } from "@/app/catalog/lib/types";
import type { PhaseSwitcherOption } from "@/app/catalog/components/PhaseSwitcher";
import type { ConfigNavTarget } from "@/app/catalog/components/ConfigurationsTable";
import CarHero from "@/app/catalog/components/CarHero";
import { pickMainMedia } from "@/app/catalog/lib/media";
import ConfigRows, { FUEL_SORT_ORDER, fuelGroupLabel } from "./ConfigRows";
import type { DetailData, DetailDrivetrainGroup, DetailEngine, DetailGearboxGroup, DetailFaultItem } from "./types";

const fmtK = (v: number) => (v >= 1000 ? Math.round(v / 1000) + "k" : String(v));
// Same shortener CarRow.tsx's list row uses ("280000 - 450000 km" -> "280k - 450k km"),
// duplicated locally rather than imported since it's a tiny pure string helper, matching this
// codebase's established per-file-duplication convention for ones this small.
function shortenMileageRange(raw: string): string {
  return raw.replace(/\d{4,}/g, (m) => fmtK(Number(m)));
}
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

// Gearboxes tab grouping -- same "small .cfg-group-header per group, not per row" treatment
// as the Engines tab's fuel groups (which itself reuses ConfigRows.tsx's FUEL_SORT_ORDER/
// fuelGroupLabel). Only two groups here, matching what was asked ("automatic / manual"), not
// a header per transmission_units.family value (dct_dry/dct_wet/cvt/etc. all fold into
// "Automatic" -- manual is the only family value that gets its own group).
function gearboxTypeGroup(family: string): "manual" | "automatic" {
  return family === "manual" ? "manual" : "automatic";
}
const GEARBOX_GROUP_LABELS: Record<string, string> = { manual: "Manual variants", automatic: "Automatic variants" };

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
  // The safety_features reference vocabulary -- same page-agnostic shape /prehlad's
  // SafetyFeature already uses, fetched once by DbTestView.tsx the same way PrehladView.tsx
  // does (GET /api/safety-features, no per-car linkage). Feeds both the "Guaranteed safety
  // assists" (gsr2_mandated) and "Optional assists" (beyond_baseline) lists below -- the
  // latter only rendered for GSR2-era cars, see its own comment for why.
  safetyFeatures: SafetyFeature[];
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function phaseLabelText(p: PhaseSwitcherOption): string {
  const label = p.phaseLabel ?? "";
  if (p.yearFrom == null) return label;
  // Open-ended year_to (still in production) shows a trailing "–" with nothing after it.
  const years = `${p.yearFrom}–${p.yearTo ?? ""}`;
  return label ? `${label} ${years}` : years;
}

// Wraps a .tab-bar row with an overflow-aware right-edge fade. A pure-CSS fade can't tell
// whether the row actually overflows -- .tab-bar's own box width is parent-driven (a wide
// desktop column), not content-driven, so a handful of short tab labels can sit well inside
// it with room to spare, and a fade that's always on would clip the last tab's label for no
// reason. ResizeObserver re-checks on any width change (window resize, tab add/remove).
function TabBarRow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  });

  return (
    <div className="tab-bar-wrap">
      <div className="tab-bar" ref={ref}>
        {children}
      </div>
      <div className={`tab-bar-fade${overflowing ? " visible" : ""}`} aria-hidden="true" />
    </div>
  );
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
    <TabBarRow>
      {phases.map((p) => (
        <button key={p.id} className={`tab${p.id === selectedId ? " active" : ""}`} onClick={() => onSelect(p.id)}>
          {phaseLabelText(p)}
        </button>
      ))}
    </TabBarRow>
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

// Haldex is the one family in this table where `generation` alone ("Gen 1", "Gen 5", ...)
// reads as a bare version number with no indication of what it's a generation OF -- every
// other system's generation string already names itself (e.g. "Torsen permanent", "HTRAC").
// Prefixing the maker name here (not reusing system.maker verbatim -- that's "BorgWarner
// (Haldex)"/"Haldex Traction" depending on which migration added the row) keeps every Haldex
// generation's displayed name consistent regardless of which maker string it was seeded with.
function drivetrainDisplayName(system: DetailDrivetrainGroup["system"]): string {
  if (system.type === "haldex" && system.generation) return `Haldex ${system.generation}`;
  return system.generation || system.code;
}

// alwaysOpen (set by the caller when this is the only card in the tab) locks the card open
// and drops the click-to-toggle entirely -- with a single unit there's nothing to collapse
// TO (no sibling card to scan instead), so a toggle would just be a way to hide the only
// content on the tab for no benefit.
function DrivetrainAccordion({ group, showVariants, gapsMode, isOpen, onToggle, alwaysOpen }: { group: DetailDrivetrainGroup; showVariants: boolean; gapsMode: boolean; isOpen: boolean; onToggle: () => void; alwaysOpen?: boolean }) {
  const { system, variants } = group;
  const typeLabel = DRIVETRAIN_TYPE_LABELS[system.type] || cap(system.type);
  const rc = system.reliability !== "—" ? REL_COLORS[system.reliability] || "#888" : null;
  const [descOpen, setDescOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const open = alwaysOpen || isOpen;
  return (
    <div id={`drivetrain-${system.id}`} className={`tx-card${open ? " open" : ""}${alwaysOpen ? " tx-card-static" : ""}`} onClick={alwaysOpen ? undefined : onToggle}>
      <div className="eng-hdr">
        <div className="eng-left">
          <span className="eng-name">{drivetrainDisplayName(system)}</span>
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
        {!alwaysOpen && <span className="chevron">{open ? "▲" : "▼"}</span>}
      </div>
      {open && (
        <div className="eng-body">
          {showVariants && variants.length > 0 && (
            <div style={{ fontSize: ".72rem", color: "#6b6b72", marginBottom: 8 }}>Applies to: {variants.join(", ")}</div>
          )}
          {/* Description and maintenance note: same click-to-reveal tile GearboxAccordion
              uses for its own maintenance note, side by side in one .cgrid row rather than
              always-visible text -- both are often a full paragraph, and this tab already
              shows a lot per card before you open either. */}
          <div className="cgrid">
            {system.description ? (
              <div
                className="cgrid-item cgrid-item-btn"
                onClick={(e) => { e.stopPropagation(); setDescOpen((v) => !v); }}
              >
                <div className="cgrid-val">{"📄"} Description {descOpen ? "▴" : "▾"}</div>
              </div>
            ) : (
              <MissingMarker gapsMode={gapsMode} label="description" />
            )}
            {system.maintenance_note ? (
              <div
                className="cgrid-item cgrid-item-btn"
                onClick={(e) => { e.stopPropagation(); setMaintOpen((v) => !v); }}
              >
                <div className="cgrid-val">{"🔧"} Maintenance {maintOpen ? "▴" : "▾"}</div>
              </div>
            ) : (
              <MissingMarker gapsMode={gapsMode} label="maintenance note" />
            )}
          </div>
          {descOpen && system.description && (
            <div className="maint-card">
              {splitSentences(system.description).map((s, si) => (
                <div key={si} className="maint-item">{s}</div>
              ))}
            </div>
          )}
          {maintOpen && system.maintenance_note && (
            <div className="maint-card">
              {splitSentences(system.maintenance_note).map((s, si) => (
                <div key={si} className="maint-item">{s}</div>
              ))}
            </div>
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

// Mirrors /prehlad's own SafetyFeatureAccordion exactly -- same .eng-card/.eng-hdr/.eng-badge
// classes, same expanded-body fields (marketing names, what it does, how it works, sensors,
// how to disable), since safety_features is the same page-agnostic reference table either
// page reads. badgeLabel/badgeColor are passed in per-row rather than hardcoded, same reason
// as /prehlad's: a mandated row always reads "GSR2-mandated", a beyond-baseline row's badge
// varies by what the caller knows about this specific car. id/availabilityLabel are additive,
// used only by the "Safety equipment in this car's trims" section below -- id is the Trims
// tab's click-through target (sf-<slug>), availabilityLabel is that section's own
// "Optional on X · Standard from Y" line, shown under the name, above the tags row.
function SafetyFeatureAccordion({ feature, badgeLabel, badgeColor, availabilityLabel, id, isOpen, onToggle }: { feature: SafetyFeature; badgeLabel: string; badgeColor: string; availabilityLabel?: string; id?: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div id={id} className={`eng-card${isOpen ? " open" : ""}`} onClick={onToggle}>
      <div className="eng-hdr">
        <div className="eng-left">
          <span className="eng-name">{feature.universal_name}</span>
          {availabilityLabel && <div className="tg">{availabilityLabel}</div>}
          <div className="eng-tags">
            <span className="eng-badge" style={{ background: badgeColor + "22", color: badgeColor, border: `1px solid ${badgeColor}44` }}>{badgeLabel}</span>
          </div>
        </div>
        <span className="chevron">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="eng-body">
          {feature.marketing_names != null && feature.marketing_names.length > 0 && (
            <div style={{ fontSize: ".78rem", color: "#9999aa", marginBottom: 8 }}>{feature.marketing_names.join(" · ")}</div>
          )}
          {feature.what_it_does && <div style={{ fontSize: ".82rem", marginBottom: 8 }}>{feature.what_it_does}</div>}
          {feature.how_it_works && (<>
            <div className="sub-label">How it works</div>
            <div style={{ fontSize: ".78rem", color: "#9999aa", lineHeight: 1.5, marginBottom: 8 }}>{feature.how_it_works}</div>
          </>)}
          {feature.sensors_used && (<>
            <div className="sub-label">Sensors used</div>
            <div style={{ fontSize: ".78rem", color: "#9999aa", lineHeight: 1.5, marginBottom: 8 }}>{feature.sensors_used}</div>
          </>)}
          {feature.how_to_disable && (<>
            <div className="sub-label">How to disable</div>
            <div style={{ fontSize: ".78rem", color: "#9999aa", lineHeight: 1.5 }}>{feature.how_to_disable}</div>
          </>)}
        </div>
      )}
    </div>
  );
}

// Trims tab -- same card/icon/color language as Engines (.eng-card, .eng-badge, .chevron,
// .sub-label) and Configurations (colored tabler icons) instead of the Tailwind Garage-panel
// grid /catalog's TrimsList.tsx uses (that shared TrimCards component is still what /catalog
// renders; this is a separate, native-styled implementation for this page only -- feedback
// was that the Garage panel looked out of place dropped into this page's own dark theme).
// buildTrimLayout/trimComparisonLabel/buildCompareRows/tierLabel are reused from
// app/catalog/lib/trimsDisplay.ts (pure data helpers, no visual coupling) so the base-trim
// pick, tier grouping, "+N over X" naming, and compare-table inclusion rule can't drift from
// /catalog's own copy -- same precedent as gearboxTypeLabel/drivetrainLabel elsewhere here.
// Inherited rows render muted and faded -- already covered by base or an earlier tier, not
// what makes this one worth picking. New rows render green with a "+" -- this trim's own
// feature, nothing before it to replace. Upgraded rows render amber (same hex as this file's
// own Moderate-severity color, #ff9800) with a "↑" -- this trim's own feature replaced a
// DIFFERENT inherited item in the same feature_group; a small muted "was: ..." line names
// what it replaced (an optional upgrade never actually replaces anything -- see
// resolveTrimFeatures -- so it gets the amber "↑" but no "was:" line, since the standard item
// it sits beside is still listed in its own grey row).
// Safety yellow (#facc15) overrides the normal new/upgraded/inherited colour whenever a row's
// safetyFeatureSlug is set -- full opacity for new/upgraded, the same ~0.6 reduced opacity the
// status system already uses for inherited rows, so the status (is this what elevates the
// trim, or just inherited) still reads the same way it does for every other row, just in
// yellow instead of green/amber/grey. The glyph swaps to a shield in place of +/↑/check for
// the same reason -- "this is a safety system" is the more useful signal here than "new vs
// inherited vs upgraded", which the colour/opacity still carries.
function trimRowColor(r: ResolvedFeatureRow): string {
  if (r.safetyFeatureSlug) return "#facc15";
  return r.status === "new" ? "#a5d6a7" : r.status === "upgraded" ? "#ff9800" : "#6b6b72";
}

function TrimFeatureRow({ r, onShowInNcap }: { r: ResolvedFeatureRow; onShowInNcap: (slug: string) => void }) {
  return (
    <div style={{ marginBottom: 3 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: ".78rem", lineHeight: 1.5, color: trimRowColor(r), opacity: r.status === "inherited" ? 0.7 : 1 }}>
        {r.safetyFeatureSlug ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onShowInNcap(r.safetyFeatureSlug!); }}
            aria-label={`Show ${r.feature} in NCAP`}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer" }}
            className="sf-link"
          >
            <IconShieldCheck size={13} stroke={2.5} style={{ flexShrink: 0 }} />
            {r.feature}
          </button>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {r.status === "new" && <span style={{ flexShrink: 0, fontWeight: 700 }}>+</span>}
            {r.status === "upgraded" && <span style={{ flexShrink: 0, fontWeight: 700 }}>↑</span>}
            {r.status === "inherited" && <IconCheck size={13} stroke={2.5} style={{ flexShrink: 0 }} />}
            {r.feature}
          </span>
        )}
        {r.isOptional && <span className="eng-badge" style={{ background: "#6b6b7222", color: "#9999aa", border: "1px solid #6b6b7244" }}>optional</span>}
      </div>
      {r.replacedFeature && <div style={{ fontSize: ".68rem", color: "#6b6b72", paddingLeft: 19 }}>was: {r.replacedFeature}</div>}
    </div>
  );
}

// Grouped into the 5 display sections (trimFeatureCategory, trimsDisplay.ts) instead of one
// flat list -- requested 2026-10-26, the flat list "looks chaotic". Within each section, rows
// keep resolveTrimFeatures' own upgraded/new/inherited order; a section with nothing in it is
// skipped entirely rather than shown empty.
function TrimFeatureList({ trim, base, allTrims, onShowInNcap }: { trim: CatalogTrim; base: CatalogTrim; allTrims: CatalogTrim[]; onShowInNcap: (slug: string) => void }) {
  const rows = resolveTrimFeatures(trim, base, allTrims);
  return (
    <>
      {TRIM_CATEGORY_ORDER.map((cat) => {
        const catRows = rows.filter((r) => trimFeatureCategory(r) === cat);
        if (catRows.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: 10 }}>
            <div className="sub-label">{TRIM_CATEGORY_LABELS[cat]}</div>
            {catRows.map((r, i) => <TrimFeatureRow key={i} r={r} onShowInNcap={onShowInNcap} />)}
          </div>
        );
      })}
    </>
  );
}

function TrimTierBadge({ tier }: { tier: string | null }) {
  const label = tierLabel(tier);
  if (!label) return null;
  return <span className="eng-badge" style={{ background: "#60a5fa22", color: "#60a5fa", border: "1px solid #60a5fa44" }}>{label}</span>;
}

// One non-base trim: header right side is trimComparisonLabel's "+N over X" (or "Alternative
// to <base>") in place of the old flat "N extras" count -- it already carries the count.
// hasFeatures checks base's features too, not just this trim's own rows: TrimFeatureList
// below always shows the merged inherited+extra list, so a trim with zero of its own rows
// (no extras, just the inherited set) still has something to expand into.
function TrimAccordion({ trim, base, allTrims, comparisonLabel, isOpen, onToggle, onShowInNcap }: {
  trim: CatalogTrim;
  base: CatalogTrim;
  allTrims: CatalogTrim[];
  comparisonLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  onShowInNcap: (slug: string) => void;
}) {
  const hasFeatures = trim.features.length > 0 || base.features.length > 0;
  return (
    <div
      className={`eng-card${isOpen && hasFeatures ? " open" : ""}`}
      onClick={hasFeatures ? onToggle : undefined}
      style={hasFeatures ? undefined : { cursor: "default" }}
    >
      <div className="eng-hdr">
        <div className="eng-left">
          <span className="eng-name">{trim.name}</span>
          <div className="eng-tags">
            <TrimTierBadge tier={trim.tier} />
          </div>
        </div>
        {hasFeatures ? (
          <span className="chevron">{comparisonLabel} {isOpen ? "▲" : "▼"}</span>
        ) : (
          <span className="tg">Not available yet</span>
        )}
      </div>
      {hasFeatures && isOpen && (
        <div className="eng-body">
          <TrimFeatureList trim={trim} base={base} allTrims={allTrims} onShowInNcap={onShowInNcap} />
        </div>
      )}
    </div>
  );
}

// Columns = the comparable trims in the same order buildCompareRows(comparable) built its
// cells in -- row.cells[i] corresponds to trims[i], so the two arrays must stay in lockstep
// (both come from the same `comparable` list one level up, never re-sorted independently).
function TrimCompareTable({ trims, rows }: { trims: CatalogTrim[]; rows: CompareRow[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="trim-compare-table">
        <thead>
          <tr>
            <th>Feature</th>
            {trims.map((t) => <th key={t.id}>{t.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td style={{ textAlign: "left", color: "#f0f0f0" }}>{row.label}</td>
              {row.cells.map((cell) => (
                <td key={cell.trimId} style={{ color: cell.changed ? "#ff9800" : cell.text === "–" ? "#6b6b72" : "#f0f0f0" }}>
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TrimsPanelProps {
  trims: CatalogTrim[];
  onShowInNcap: (slug: string) => void;
}

// openTrims/showCompare live here, not lifted to the parent CarDetail like openEngines/
// openGearboxes/openDrivetrain are -- those need parent-level coordination because they also
// combine with a URL-driven focus*Idx for deep-linking/scroll-to behaviour; trims have no
// such deep link, so there's no reason to lift this. Keeping it local also sidesteps a real
// bug the lifted version had: CarDetail mounts (and its useState lazy initializers run)
// before the async `detail` prop has arrived, so an initializer reading `detail?.trims` at
// that point always sees `[]` and permanently locks in "nothing open," no matter how many
// trims load in afterward. TrimsPanel itself is never rendered until the parent's own
// `(detail?.trims ?? []).length === 0` guard has already passed, so `trims` here is
// guaranteed to be the real, non-empty array by the time this component's own first render
// (and its own lazy initializer) runs.
function TrimsPanel({ trims, onShowInNcap }: TrimsPanelProps) {
  // Every non-base trim starts open when this phase has <=4 trims total, otherwise only the
  // always-expanded "Standard equipment" block starts open.
  const [openTrims, setOpenTrims] = useState<Record<string, boolean>>(() => {
    const openByDefault = trims.length <= 4;
    const initial: Record<string, boolean> = {};
    for (const t of trims) initial[t.id] = openByDefault;
    return initial;
  });
  const [showCompare, setShowCompare] = useState(false);
  const layout = buildTrimLayout(trims);
  if (!layout) return null;
  const { base, groups } = layout;

  const allEmpty = trims.every((t) => t.features.length === 0);
  const comparable = trims.filter((t) => t.features.length > 0);
  const canCompare = comparable.length >= 2;
  const compareRows = canCompare ? buildCompareRows(comparable, base, trims) : [];

  return (
    <div>
      {allEmpty && <div className="mp-hint" style={{ marginBottom: 10 }}>Equipment details not available yet for this phase.</div>}
      {canCompare && (
        <button type="button" className="trim-compare-toggle" onClick={() => setShowCompare((v) => !v)}>
          {showCompare ? "Hide comparison" : "Compare trims"}
        </button>
      )}
      {showCompare && canCompare && <TrimCompareTable trims={comparable} rows={compareRows} />}

      {/* Standard equipment -- always expanded, not an accordion: this is the floor every
          other trim builds on, not one option among several to toggle open. */}
      <div className="eng-card" style={{ cursor: "default" }}>
        <div className="eng-hdr">
          <div className="eng-left">
            <span className="eng-name">{base.name}</span>
            <div className="eng-tags">
              <TrimTierBadge tier={base.tier} />
            </div>
          </div>
        </div>
        <div className="tg" style={{ marginBottom: 8 }}>Included in every trim below.</div>
        {base.features.length > 0 ? (
          <TrimFeatureList trim={base} base={base} allTrims={trims} onShowInNcap={onShowInNcap} />
        ) : (
          <div className="tg">Equipment details not available yet</div>
        )}
      </div>

      {groups.map((group) => (
        <div key={`${group.tier ?? "null"}-${group.trims[0].id}`} style={{ marginTop: 14 }}>
          {group.trims.length > 1 && (
            <div className="sub-label" style={{ marginTop: 0 }}>Alternative versions, same level</div>
          )}
          {group.trims.length > 1 ? (
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              {group.trims.map((trim) => (
                <TrimAccordion
                  key={trim.id}
                  trim={trim}
                  base={base}
                  allTrims={trims}
                  comparisonLabel={trimComparisonLabel(trim, base, trims)}
                  isOpen={!!openTrims[trim.id]}
                  onToggle={() => setOpenTrims((p) => ({ ...p, [trim.id]: !p[trim.id] }))}
                  onShowInNcap={onShowInNcap}
                />
              ))}
            </div>
          ) : (
            group.trims.map((trim) => (
              <TrimAccordion
                key={trim.id}
                trim={trim}
                base={base}
                allTrims={trims}
                comparisonLabel={trimComparisonLabel(trim, base, trims)}
                isOpen={!!openTrims[trim.id]}
                onToggle={() => setOpenTrims((p) => ({ ...p, [trim.id]: !p[trim.id] }))}
                onShowInNcap={onShowInNcap}
              />
            ))
          )}
        </div>
      ))}
    </div>
  );
}

export default function CarDetail({ car, detail, loading, fuelFilter, gearboxFilter, drivetrainFilter, gapsMode, onBack, siblingPhases, onSwitchPhase, safetyFeatures }: CarDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTabState, setActiveTabState] = useState<string | null>(null);
  const [openEngines, setOpenEngines] = useState<Record<number, boolean>>({});
  const [openGearboxes, setOpenGearboxes] = useState<Record<number, boolean>>({});
  const [openDrivetrain, setOpenDrivetrain] = useState<Record<number, boolean>>({});
  const [openSafety, setOpenSafety] = useState<Record<string, boolean>>({});

  const focusEngine = searchParams.get("engine");
  const focusUnit = searchParams.get("unit");
  const focusDrivetrain = searchParams.get("drivetrain");
  const focusSafety = searchParams.get("safety");

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

  // Trims tab's safety-equipment click-through (a trim feature row with a safetyFeatureSlug):
  // same mechanism as handleConfigNavigate above, one more URL param (?safety=<slug>) the scroll
  // effect below reacts to, landing on and expanding that slug's own row in the NCAP tab's new
  // "Safety equipment in this car's trims" section.
  function handleShowInNcap(slug: string) {
    updateParams((p) => {
      p.set("tab", "safety");
      p.delete("engine");
      p.delete("unit");
      p.delete("drivetrain");
      p.set("safety", slug);
    });
  }

  const price = `€${fmtK(carPriceMin(car))}–${fmtK(carPriceMax(car))}`;
  const mileage = carMileage(car);
  const rel = carRel(car);
  const relColor = REL_COLORS[rel] || "#888";
  const stars = carStars(car);
  const adult = carAdult(car);
  const child = car.safety?.childOccupant;
  const ped = car.safety?.pedestrian;
  const assist = car.safety?.safetyAssist;
  const ncapYear = car.safety?.ncapYear;

  // Same GSR2-era split as /prehlad's Safety tab: eligibility derived purely from car.years
  // (isGsr2Era), never stored per-car. catalog_ has no vehicle_safety_features equivalent, so
  // there's no real per-car Standard/Optional/Not-available signal for beyondBaselineFeatures
  // either way -- every row reads "Not tracked" regardless of era. Showing that section only
  // for GSR2-era cars is purely a which-cars-see-it-at-all choice, not a reflection of data
  // that becomes available for newer ones (there isn't any, here or there).
  const gsr2Era = isGsr2Era(car);
  const mandatedFeatures = safetyFeatures.filter((f) => f.category === "gsr2_mandated");
  const beyondBaselineFeatures = safetyFeatures.filter((f) => f.category === "beyond_baseline");

  // "Safety equipment in this car's trims" (NCAP tab, above the two lists above) -- real
  // per-car data, unlike those two: every safety_features row some trim of THIS phase actually
  // links to via safety_feature_slug, ordered basic -> gsr2_mandated -> beyond_baseline then by
  // name. trims is detail's own array (not a separate fetch) -- CatalogTrim["features"] already
  // carries safetyFeatureSlug once the db.ts/types.ts transform picks it up.
  const trims = detail?.trims ?? [];
  // Depends on detail?.trims directly, not the `trims` const above -- that one gets a fresh []
  // literal every render whenever detail is null, which would defeat the memo (its identity
  // never matches the previous render's []). detail?.trims itself is a stable reference that
  // only actually changes when detail does.
  const trimSafetySlugs = useMemo(() => distinctSafetyFeatureSlugs(detail?.trims ?? []), [detail?.trims]);
  const trimSafetyFeatures = useMemo(() => {
    const categoryOrder: Record<string, number> = { basic: 0, gsr2_mandated: 1, beyond_baseline: 2 };
    return safetyFeatures
      .filter((f) => trimSafetySlugs.includes(f.slug))
      .sort((a, b) => (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99) || a.universal_name.localeCompare(b.universal_name));
  }, [safetyFeatures, trimSafetySlugs]);
  const SAFETY_CATEGORY_BADGE: Record<string, { label: string; color: string }> = {
    basic: { label: "Basic", color: "#60a5fa" },
    gsr2_mandated: { label: "GSR2", color: "#4caf50" },
    beyond_baseline: { label: "Optional extra", color: "#facc15" },
  };

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

  // Grouped by fuel type, same order/labels as the Configurations tab's ConfigRows (petrol <
  // lpg < diesel < hybrid < phev < electric), ranked within a group by displacement like that
  // tab is -- a null displacement_cc (mostly electric engines) sorts after every known value
  // in its group rather than colliding at 0.
  const filteredEngines = useMemo(() => {
    const all = detail?.e ?? [];
    const filtered = !fuelFilter || fuelFilter.length === 0
      ? all
      : all.filter((e) => fuelFilter.some((sel) => matchesFuelOption(e.fuel_type, sel)));
    return [...filtered].sort((a, b) => {
      const fuelDiff = (FUEL_SORT_ORDER[a.fuel_type] ?? 99) - (FUEL_SORT_ORDER[b.fuel_type] ?? 99);
      if (fuelDiff !== 0) return fuelDiff;
      const dispA = a.displacement_cc ?? Infinity;
      const dispB = b.displacement_cc ?? Infinity;
      if (dispA !== dispB) return dispA - dispB;
      return a.power_kw - b.power_kw;
    });
  }, [detail, fuelFilter]);

  // Grouped manual/automatic (manual first, matching GEARBOX_TYPES' own ordering in
  // app/db-test/lib/filters.ts), ranked within a group by speeds ascending (5-speed before
  // 6-speed before 7-speed...). A null speeds value (ungraded/unknown gear count) sorts
  // after every known count in its group, same null-handling pattern as the Configurations/
  // Engines tabs' displacement sort.
  const gearboxGroups = useMemo(() => {
    const all = detail?.g ?? [];
    return [...all].sort((a, b) => {
      const groupDiff = (gearboxTypeGroup(a.family) === "manual" ? 0 : 1) - (gearboxTypeGroup(b.family) === "manual" ? 0 : 1);
      if (groupDiff !== 0) return groupDiff;
      const speedsA = a.speeds ?? Infinity;
      const speedsB = b.speeds ?? Infinity;
      if (speedsA !== speedsB) return speedsA - speedsB;
      return a.code.localeCompare(b.code);
    });
  }, [detail]);
  const drivetrainGroups = detail?.dt ?? [];

  const configs = detail?.configs ?? [];

  const tabs: TabDef[] = [];
  if (configs.length > 0) tabs.push({ id: "configurations", label: "Configurations", count: configs.length });
  if (filteredEngines.length > 0) tabs.push({ id: "engines", label: "Engines", count: filteredEngines.length });
  if (gearboxGroups.length > 0) tabs.push({ id: "gearboxes", label: "Gearboxes", count: gearboxGroups.length });
  if (drivetrainGroups.length > 0) tabs.push({ id: "drivetrain", label: "Drivetrain System", count: drivetrainGroups.length });
  if ((detail?.dims.length ?? 0) > 0) tabs.push({ id: "dimensions", label: "Dimensions", count: detail!.dims.length });
  if ((detail?.trims.length ?? 0) > 0) tabs.push({ id: "equipment", label: "Trims", count: detail!.trims.length });
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
    const focusId = focusEngine ? `engine-${focusEngine}` : focusUnit ? `gearbox-${focusUnit}` : focusDrivetrain ? `drivetrain-${focusDrivetrain}` : focusSafety ? `sf-${focusSafety}` : null;
    if (!focusId) return;
    const el = document.getElementById(focusId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight-pulse");
    const t = setTimeout(() => el.classList.remove("highlight-pulse"), 1200);
    return () => clearTimeout(t);
  }, [activeTab, focusEngine, focusUnit, focusDrivetrain, focusSafety]);

  return (
    <div className="detail-view">
      <button className="btn-back" style={{ width: "100%", marginBottom: 14 }} onClick={onBack}>{"←"} Back to results</button>

      <CarHero media={pickMainMedia(detail?.media ?? [])} alt={`${car.make} ${carModelBase(car)}`} />

      <div className="detail-header">
        <div className="model-row">
          <span className="cmake">{car.make}</span>
          <span className="cmodel">{carModelBase(car)}</span>
        </div>
        {car.phaseLabel && <div className="cphase">{car.phaseLabel}</div>}
        <div className="cgen">{originLine(car)}</div>
        <div className="row-tags" style={{ marginTop: 8 }}>
          {/* Every distinct body this phase is offered in (car.bodyNames, the same field
              CarRow.tsx's list row already shows all of), not just the single primaryBody
              `car.body` -- a phase offered as both Hatchback and Estate was only ever showing
              the first one here. Same fallback-to-[car.body] CarRow.tsx uses, for a car whose
              bodyNames hasn't been populated (e.g. a stale cached response). */}
          {(car.bodyNames && car.bodyNames.length > 0 ? car.bodyNames : [car.body]).map((b) => (
            <span key={b} className="cfuel-tag">{bodyLabel(b)}</span>
          ))}
          {(car.fuel || []).map((f) => <span key={f} className="cfuel-tag">{fuelLabel(f)}</span>)}
        </div>
        <div className="cprice" style={{ marginTop: 8 }}>{price}</div>
        {/* carMileage/pricing.mileageAtMidBudget (catalog_phases.typical_mileage_range) --
            already shown on the car-list row (CarRow.tsx), just missing from this page. */}
        {mileage && <div className="tg">{shortenMileageRange(mileage)}</div>}

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

        <TabBarRow>
          {tabs.map((t) => (
            <button key={t.id} className={`tab${activeTab === t.id ? " active" : ""}`} onClick={() => selectTab(t.id)}>
              {t.label}{t.count != null ? ` (${t.count})` : ""}
            </button>
          ))}
        </TabBarRow>

        {activeTab === "engines" && (
          <div className="mp-section">
            {filteredEngines.map((e, i) => (
              <div key={i}>
                {e.fuel_type !== filteredEngines[i - 1]?.fuel_type && (
                  <div className="cfg-group-header" style={i === 0 ? { marginTop: 0 } : undefined}>
                    {fuelGroupLabel(e.fuel_type)}
                  </div>
                )}
                <EngineAccordion engine={e} gapsMode={gapsMode} isOpen={!!openEngines[i] || i === focusEngineIdx} onToggle={() => setOpenEngines((p) => ({ ...p, [i]: !p[i] }))} />
              </div>
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
              <div key={g.code}>
                {gearboxTypeGroup(g.family) !== (i > 0 ? gearboxTypeGroup(gearboxGroups[i - 1].family) : null) && (
                  <div className="cfg-group-header" style={i === 0 ? { marginTop: 0 } : undefined}>
                    {GEARBOX_GROUP_LABELS[gearboxTypeGroup(g.family)]}
                  </div>
                )}
                <GearboxAccordion gearbox={g} gapsMode={gapsMode} isOpen={!!openGearboxes[i] || i === focusUnitIdx} onToggle={() => setOpenGearboxes((p) => ({ ...p, [i]: !p[i] }))} />
              </div>
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
                alwaysOpen={drivetrainGroups.length === 1}
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
            {(detail?.trims ?? []).length === 0 ? (
              <div className="mp-hint">No data available.</div>
            ) : (
              <TrimsPanel trims={detail!.trims} onShowInNcap={handleShowInNcap} />
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

        {/* Safety — Euro NCAP, plus the two GSR2/optional reference lists ported from
            /prehlad. Unlike those two (static reference content, no per-car signal for
            catalog_ cars), the "Safety equipment in this car's trims" section right below the
            NCAP bars IS real per-car data: catalog_trim_features.safety_feature_slug links a
            trim's own equipment rows to safety_features, which is exactly the per-car safety
            signal catalog_ was missing (there is no vehicle_safety_features for catalog_, only
            for the legacy schema /prehlad reads). */}
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

            {/* Safety equipment in this car's trims -- the Trims tab's yellow/shield rows
                click through here (?safety=<slug>, see handleShowInNcap), landing on and
                expanding the matching row below via id={`sf-${slug}`}. Every distinct slug
                ANY trim of this phase links to, not just the ones that happen to also be
                GSR2-mandated or beyond-baseline reference rows -- a 'basic' row (ABS/ESC/
                airbags) only ever shows up here, never in the two lists below. */}
            {trimSafetyFeatures.length > 0 && (
              <>
                <div className="mp-title" style={{ marginTop: 18 }}>{"\u{1F6E1}️"} Safety equipment in this car&apos;s trims</div>
                {trimSafetyFeatures.map((f) => {
                  const categoryBadge = SAFETY_CATEGORY_BADGE[f.category] ?? { label: f.category, color: "#6b6b72" };
                  return (
                    <SafetyFeatureAccordion
                      key={f.slug}
                      id={`sf-${f.slug}`}
                      feature={f}
                      badgeLabel={categoryBadge.label}
                      badgeColor={categoryBadge.color}
                      availabilityLabel={safetyEquipmentAvailabilityLabel(f.slug, trims) ?? undefined}
                      isOpen={!!openSafety[f.slug] || f.slug === focusSafety}
                      onToggle={() => setOpenSafety((p) => ({ ...p, [f.slug]: !p[f.slug] }))}
                    />
                  );
                })}
              </>
            )}

            {/* GSR2-mandated safety assists -- ported from /prehlad's Safety tab, same
                additive-on-top-of-NCAP structure. Eligibility is derived from car.years
                (isGsr2Era) -- never stored per-car, never touches scoring/filters/tags.
                Title/content pairing fixed relative to /prehlad's own version: that page's
                ternary has the two title strings swapped (says "Safety assists this model
                can have" for a GSR2-era car, which is backwards -- a GSR2-era car's mandated
                features are guaranteed, not just "can have"; flagged separately, not changed
                there since it wasn't asked for). */}
            <div className="mp-title" style={{ marginTop: 18 }}>{"\u{1F6E1}️"} {gsr2Era ? "Guaranteed safety assists" : "Safety assists this model can have"}</div>
            {gsr2Era ? (
              mandatedFeatures.length > 0 ? (
                mandatedFeatures.map((f) => (
                  <SafetyFeatureAccordion
                    key={f.slug}
                    feature={f}
                    badgeLabel="GSR2-mandated"
                    badgeColor="#4caf50"
                    isOpen={!!openSafety[f.slug]}
                    onToggle={() => setOpenSafety((p) => ({ ...p, [f.slug]: !p[f.slug] }))}
                  />
                ))
              ) : (
                <div className="mp-hint">Safety-feature reference data isn&apos;t loaded yet.</div>
              )
            ) : (
              <div className="mp-hint">This model&apos;s production ended before the EU&apos;s 2022 GSR2 safety mandate took effect, so the guaranteed-baseline list above doesn&apos;t apply here.</div>
            )}

            {/* Optional assists -- shown only for GSR2-mandated (gsr2Era) vehicles, by
                request (confirmed live: 45 of 88 catalog_ phases qualify). This is purely
                about which cars show the section at all, unrelated to whether a given row's
                badge below can show real data -- that now comes from the same trims/
                safety_feature_slug link the new section above uses: a beyond_baseline feature
                some trim of this phase actually links to shows its real "Standard from X" /
                "Optional on X" badge instead of "Not tracked". A feature no trim links to yet
                still reads "Not tracked" -- absence in trims is not a confirmed "not
                available" (NULL over invention). /prehlad is untouched: its own Optional
                assists stays un-gated (see the earlier fix) and keeps reading from
                vehicle_safety_features, not this trims-based source. */}
            {gsr2Era && (
              <>
                <div className="mp-title" style={{ marginTop: 18 }}>{"✨"} Optional assists</div>
                {beyondBaselineFeatures.length > 0 ? (
                  beyondBaselineFeatures.map((f) => {
                    const { standardFrom, optionalOn } = safetyEquipmentAvailability(f.slug, trims);
                    const badgeLabel = standardFrom ? `Standard from ${standardFrom.name}`
                      : optionalOn.length > 0 ? `Optional on ${optionalOn.map((t) => t.name).join(", ")}`
                      : "Not tracked";
                    const badgeColor = standardFrom ? "#4caf50" : optionalOn.length > 0 ? "#facc15" : "#6b6b72";
                    return (
                      <SafetyFeatureAccordion
                        key={f.slug}
                        feature={f}
                        badgeLabel={badgeLabel}
                        badgeColor={badgeColor}
                        isOpen={!!openSafety[f.slug]}
                        onToggle={() => setOpenSafety((p) => ({ ...p, [f.slug]: !p[f.slug] }))}
                      />
                    );
                  })
                ) : (
                  <div className="mp-hint">Safety-feature reference data isn&apos;t loaded yet.</div>
                )}
              </>
            )}
          </div>
        )}
      </>)}

      {!loading && tabs.length === 0 && (
        <div className="mp-hint" style={{ padding: "20px 0" }}>No detail data available for this car.</div>
      )}
    </div>
  );
}
