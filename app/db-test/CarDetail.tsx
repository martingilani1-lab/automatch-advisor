"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carPriceMax, carStars, carAdult, REL_COLORS, originLine, bodyLabel, fuelLabel, getConsumptionForFuel, getPowerForFuel } from "@/app/lib/carFields";
import { matchesFuelOption, classifyGearboxTypes, GEARBOX_TYPES } from "@/app/db-test/lib/filters";
import { gearboxHeaderLabel } from "@/app/catalog/lib/gearboxLabel";
import { cylindersLabel } from "@/app/catalog/lib/cylindersLabel";
import PhaseSwitcher, { type PhaseSwitcherOption } from "@/app/catalog/components/PhaseSwitcher";
import ConfigurationsTable, { type ConfigNavTarget } from "@/app/catalog/components/ConfigurationsTable";
import Badge from "@/app/catalog/components/ui/badge";
import Chips from "@/app/catalog/components/ui/chips";
import type { DetailData, DetailDrivetrainGroup, DetailEngine, DetailGearboxGroup, DetailFaultItem } from "./types";

const fmtK = (v: number) => (v >= 1000 ? Math.round(v / 1000) + "k" : String(v));
// catalog_component_faults.severity's own frozen vocabulary (critical/moderate/minor, see
// scripts/catalog-vocabularies.json) -- the flat "Common faults" tab below keys off its own
// Title-Case SEVERITY_LABELS (set server-side in app/api/db-test/route.ts) rather than this
// lowercase vocabulary directly, so it gets its own small color map, kept as literal hex
// since it's keyed by that different casing, not the garage theme's badge variants.
const SEVERITY_COLORS: Record<string, string> = { Critical: "#ef4444", Moderate: "#f59e0b", Minor: "#a1a1aa" };

// Per-item severity badge on the engine/gearbox "Known faults" lists below -- reuses the
// garage theme's shared Badge component (app/catalog/components/ui/badge.tsx) so these match
// /catalog's own fault badges exactly (critical/moderate/minor variants).
const FAULT_ITEM_BADGE_VARIANT: Record<string, "critical" | "moderate" | "minor"> = {
  critical: "critical", moderate: "moderate", minor: "minor",
};
const FAULT_ITEM_SEVERITY_ORDER: Record<string, number> = { critical: 0, moderate: 1, minor: 2 };

// Shared by EngineAccordion and GearboxAccordion so both "Known faults" lists look
// identical: sorted critical -> moderate -> minor -> (no severity recorded), each item
// carrying its own colored severity badge (the same Badge variants /catalog's FaultsList
// uses, imported above).
function FaultsBlock({ faults, gapsMode }: { faults: DetailFaultItem[]; gapsMode: boolean }) {
  if (faults.length === 0) return <MissingMarker gapsMode={gapsMode} label="known faults" />;
  const sorted = [...faults].sort(
    (a, b) => (FAULT_ITEM_SEVERITY_ORDER[a.severity ?? ""] ?? 3) - (FAULT_ITEM_SEVERITY_ORDER[b.severity ?? ""] ?? 3)
  );
  return (
    <div className="mt-2">
      <p className="mb-1 text-xs uppercase tracking-wide text-secondary">Known faults</p>
      <ul className="flex flex-col gap-2">
        {sorted.map((f, fi) => (
          <li
            key={fi}
            className="flex items-center justify-between gap-3 rounded-lg bg-panel p-3"
          >
            <span className="text-sm text-primary">{f.fault}</span>
            {f.severity && <Badge variant={FAULT_ITEM_BADGE_VARIANT[f.severity] ?? "warning"}>{f.severity}</Badge>}
          </li>
        ))}
      </ul>
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

// "—" is this view's existing missing-value convention (see every `?? "—"`/`|| "—"` in this
// file) -- gaps mode swaps that single dash for a visible, explicit marker instead of hiding
// it, reusing the garage theme's shared "missing" Badge variant.
function MissingMarker({ gapsMode, label }: { gapsMode: boolean; label: string }) {
  if (!gapsMode) return null;
  return <Badge variant="missing">missing: {label}</Badge>;
}

// Horizontally-scrollable pill tab bar -- replaces the boxy default-button look a bare
// Radix Tabs.Trigger had without tailwindcss/preflight (see catalog.css's own header
// comment on why preflight isn't imported). Plain buttons, not Radix, since nothing here
// needs Radix's roving-tabindex/ARIA layer beyond what a button row already gives for free.
function TabBar({ tabs, activeTab, onSelect }: { tabs: TabDef[]; activeTab: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className={`shrink-0 whitespace-nowrap border-0 border-b-2 bg-transparent px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === t.id
              ? "border-orange-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          {t.label}{t.count != null ? ` (${t.count})` : ""}
        </button>
      ))}
    </div>
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
    <div
      id={`gearbox-${gearbox.id}`}
      className="cursor-pointer rounded-xl border border-white/5 bg-panel p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset] transition-colors hover:border-zinc-700"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-base font-medium text-primary">{gearboxHeaderLabel(gearbox.code, gearbox.speeds, gearbox.family)}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {rc ? (
              <span className="rounded-full border px-2 py-0.5 text-xs font-medium" style={{ background: rc + "22", color: rc, borderColor: rc + "44" }}>{gearbox.reliability}</span>
            ) : (
              <MissingMarker gapsMode={gapsMode} label="reliability rating" />
            )}
            {typeLabel && <Badge>{typeLabel}</Badge>}
            {gearbox.speeds == null && <MissingMarker gapsMode={gapsMode} label="speeds" />}
          </div>
        </div>
        <span className="text-secondary">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="mt-3 flex flex-col gap-1">
          <Chips items={[...gearbox.engineNames, ...gearbox.bodyNames, ...gearbox.drivetrainLabels]} />
          {gearbox.maintenance_note ? (
            <button
              type="button"
              className="mt-2 w-fit rounded-lg border-0 bg-panel-2 px-3 py-1.5 text-left text-xs font-semibold text-secondary transition-colors hover:text-primary"
              onClick={(e) => { e.stopPropagation(); setMaintOpen((v) => !v); }}
            >
              {"🔧"} Maintenance {maintOpen ? "▴" : "▾"}
            </button>
          ) : (
            <MissingMarker gapsMode={gapsMode} label="maintenance note" />
          )}
          {maintOpen && gearbox.maintenance_note && (
            <div className="mt-2 rounded-lg bg-panel-2 px-3">
              {splitSentences(gearbox.maintenance_note).map((s, si) => (
                <div key={si} className="border-t border-white/5 py-2 text-sm text-secondary first:border-t-0">{s}</div>
              ))}
            </div>
          )}
          {gearbox.reliability_note ? (
            <>
              <p className="mb-1 mt-2 text-xs uppercase tracking-wide text-secondary">{"⚠️"} Reliability</p>
              <p className="mb-2 text-sm leading-relaxed text-secondary">{gearbox.reliability_note}</p>
            </>
          ) : (
            <MissingMarker gapsMode={gapsMode} label="reliability note" />
          )}
          {gearbox.pros?.length > 0 && (<>
            <p className="mb-1 mt-2 text-xs uppercase tracking-wide text-secondary">{"✅"} Pros</p>
            {gearbox.pros.map((p, pi) => <p key={pi} className="mb-0.5 text-sm text-zinc-300"><span className="text-emerald-400">·</span> {p}</p>)}
          </>)}
          {gearbox.pros?.length === 0 && <MissingMarker gapsMode={gapsMode} label="pros" />}
          {gearbox.cons?.length > 0 && (<>
            <p className="mb-1 mt-2 text-xs uppercase tracking-wide text-secondary">{"❌"} Cons</p>
            {gearbox.cons.map((c, ci) => <p key={ci} className="mb-0.5 text-sm text-zinc-300"><span className="text-amber-400">·</span> {c}</p>)}
          </>)}
          {gearbox.cons?.length === 0 && <MissingMarker gapsMode={gapsMode} label="cons" />}
          {/* catalog_component_faults keys a fault to the unit itself (shared across every
              car using this gearbox), not this one car -- always "Known faults", never
              "This car". */}
          <FaultsBlock faults={gearbox.faults} gapsMode={gapsMode} />
          {gearbox.phase_note ? (
            <>
              <p className="mb-1 mt-2 text-xs uppercase tracking-wide text-secondary">In this car</p>
              <p className="text-sm leading-relaxed text-secondary">{gearbox.phase_note}</p>
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
    // Flat row, no card border/background -- "clean typography and generous vertical
    // padding between rows" instead of boxed cards; separation comes from the parent list's
    // divide-y, not a per-row border.
    <div
      id={`engine-${engine.id}`}
      className="cursor-pointer py-4"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between gap-3">
        {/* engine.engine is already "<name> (<code>) <power_kw> kW" (server-built, see
            app/api/db-test/route.ts) -- no separate power suffix needed here. */}
        <span className="font-medium text-white">{engine.engine}</span>
        <span className="shrink-0 text-zinc-400">{isOpen ? "▲" : "▼"}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {rc ? (
          <span style={{ color: rc }}>{engine.reliability}</span>
        ) : (
          <MissingMarker gapsMode={gapsMode} label="reliability rating" />
        )}
        {engine.fuel_type && <span className="text-white">{fuelLabel(engine.fuel_type)}</span>}
      </div>
      {isOpen && (
        <div className="mt-3 flex flex-col gap-1">
          <Chips items={engine.bodyNames} />
          <div className="grid grid-cols-3 gap-2">
            {engine.displacement_cc != null && (
              <div className="rounded-lg bg-panel-2 p-2 text-center">
                <div className="text-[.6rem] uppercase tracking-wide text-secondary">Displacement</div>
                <div className="mt-0.5 text-sm font-semibold text-primary">{engine.displacement_cc} cm³</div>
              </div>
            )}
            {engine.torque_nm != null && (
              <div className="rounded-lg bg-panel-2 p-2 text-center">
                <div className="text-[.6rem] uppercase tracking-wide text-secondary">Torque</div>
                <div className="mt-0.5 text-sm font-semibold text-primary">{engine.torque_nm} Nm</div>
              </div>
            )}
            {cylinders != null && (
              <div className="rounded-lg bg-panel-2 p-2 text-center">
                <div className="text-[.6rem] uppercase tracking-wide text-secondary">Cylinders</div>
                <div className="mt-0.5 text-sm font-semibold text-primary">{cylinders}</div>
              </div>
            )}
          </div>
          {engine.pros?.length > 0 && (<>
            <p className="mb-1 mt-2 text-xs uppercase tracking-wide text-secondary">{"✅"} Pros</p>
            {engine.pros.map((p, pi) => <p key={pi} className="mb-0.5 text-sm text-zinc-300"><span className="text-emerald-400">·</span> {p}</p>)}
          </>)}
          {engine.pros?.length === 0 && <MissingMarker gapsMode={gapsMode} label="pros" />}
          {engine.cons?.length > 0 && (<>
            <p className="mb-1 mt-2 text-xs uppercase tracking-wide text-secondary">{"❌"} Cons</p>
            {engine.cons.map((c, ci) => <p key={ci} className="mb-0.5 text-sm text-zinc-300"><span className="text-amber-400">·</span> {c}</p>)}
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
    <div
      id={`drivetrain-${system.id}`}
      className="cursor-pointer rounded-xl border border-white/5 bg-panel p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset] transition-colors hover:border-zinc-700"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-base font-medium text-primary">{system.generation || system.code}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-accent-2/40 bg-accent-2/10 px-2 py-0.5 text-xs font-medium text-accent-2-text">{typeLabel}</span>
            {rc ? (
              <span className="rounded-full border px-2 py-0.5 text-xs font-medium" style={{ background: rc + "22", color: rc, borderColor: rc + "44" }}>{system.reliability}</span>
            ) : (
              <MissingMarker gapsMode={gapsMode} label="reliability rating" />
            )}
            {system.maker && <Badge>{system.maker}</Badge>}
            <Badge className="font-mono">{system.code}</Badge>
          </div>
        </div>
        <span className="text-secondary">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="mt-3 flex flex-col gap-1">
          {system.description && <p className="mb-1 text-sm leading-relaxed text-secondary">{system.description}</p>}
          {showVariants && variants.length > 0 && (
            <p className="mb-2 text-xs text-secondary">Applies to: {variants.join(", ")}</p>
          )}
          {system.reliability_note && (<>
            <p className="mb-1 text-xs uppercase tracking-wide text-secondary">{"⚠️"} Reliability</p>
            <p className="mb-2 text-sm leading-relaxed text-secondary">{system.reliability_note}</p>
          </>)}
          {system.pros.length > 0 && (<>
            <p className="mb-1 mt-2 text-xs uppercase tracking-wide text-secondary">{"✅"} Pros</p>
            {system.pros.map((p, pi) => <p key={pi} className="mb-0.5 text-sm text-zinc-300"><span className="text-emerald-400">·</span> {p}</p>)}
          </>)}
          {system.pros.length === 0 && <MissingMarker gapsMode={gapsMode} label="pros" />}
          {system.cons.length > 0 && (<>
            <p className="mb-1 mt-2 text-xs uppercase tracking-wide text-secondary">{"❌"} Cons</p>
            {system.cons.map((c, ci) => <p key={ci} className="mb-0.5 text-sm text-zinc-300"><span className="text-amber-400">·</span> {c}</p>)}
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

  // car.model is server-built as "<name> (<generation_code>) <phase_label>" in one string
  // (app/api/db-test/route.ts's modelLabel, also what CarRow uses -- not something to
  // reshape there, it's shared with the list). The hero/sub-info split below derives the
  // phase label/years separately from siblingPhases (already-available structured data, no
  // new fetch) instead of parsing car.model -- heroModel strips the matched phase_label
  // suffix only when it's genuinely present, falling back to the full string otherwise.
  const currentPhase = siblingPhases.find((p) => p.id === car.id) ?? null;
  const heroModel =
    currentPhase?.phaseLabel && car.model.endsWith(currentPhase.phaseLabel)
      ? car.model.slice(0, -currentPhase.phaseLabel.length).trim()
      : car.model;
  const subInfoParts = [
    currentPhase?.phaseLabel,
    currentPhase?.yearFrom != null ? `${currentPhase.yearFrom} – ${currentPhase.yearTo ?? ""}`.trim() : null,
    bodyLabel(car.body),
  ].filter(Boolean);
  const subInfoLine = subInfoParts.length > 0 ? subInfoParts.join(" · ") : originLine(car);
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
    el.classList.add("catalog-highlight");
    const t = setTimeout(() => el.classList.remove("catalog-highlight"), 1500);
    return () => clearTimeout(t);
  }, [activeTab, focusEngine, focusUnit, focusDrivetrain]);

  return (
    // bg-zinc-900 (soft dark gray), not .theme-garage-page's near-black gradient -- that
    // class is shared with /catalog's page background via catalog.css, so it's overridden
    // here with a direct utility rather than changed at the token level (out of this
    // request's db-test-only scope).
    <div className="theme-garage rounded-2xl bg-zinc-900 p-4 sm:p-6">
      <button
        type="button"
        className="mb-3.5 border-0 bg-transparent p-0 text-sm text-zinc-400 transition-colors hover:text-white"
        onClick={onBack}
      >
        {"←"} Back to results
      </button>

      <div className="pb-4">
        <h1 className="text-3xl font-bold text-white">{car.make} {heroModel}</h1>
        <p className="mt-1 text-sm text-secondary">{subInfoLine}</p>
        <div className="mt-2">
          <Chips items={(car.fuel || []).map(fuelLabel)} />
        </div>
        <p className="mt-2 text-2xl font-bold text-white">{price}</p>

        {hasUnlockedSpecs ? (<>
          <p className="mb-1 mt-2.5 text-xs uppercase tracking-wide text-secondary">Matches your filter</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {matchedFuels.map((sel) => {
              const p = getPowerForFuel(car, sel);
              const cons = getConsumptionForFuel(car, sel);
              return (
                <div className="rounded-lg bg-panel-2 p-2 text-center" key={`fuel-${sel}`}>
                  <div className="text-[.6rem] uppercase tracking-wide text-secondary">{cap(sel)}</div>
                  <div className="mt-0.5 text-sm font-semibold text-primary">{p != null ? `${p}kW` : "—"}{cons != null ? ` · ${cons}L/100` : ""}</div>
                </div>
              );
            })}
            {matchedDrive.length > 0 && (
              <div className="rounded-lg bg-panel-2 p-2 text-center">
                <div className="text-[.6rem] uppercase tracking-wide text-secondary">Drive</div>
                <div className="mt-0.5 text-sm font-semibold text-primary">{matchedDrive.join(" / ")}</div>
              </div>
            )}
            {matchedGearbox.length > 0 && (
              <div className="rounded-lg bg-panel-2 p-2 text-center">
                <div className="text-[.6rem] uppercase tracking-wide text-secondary">Gearbox</div>
                <div className="mt-0.5 text-sm font-semibold text-primary">{matchedGearbox.map((s) => GEARBOX_TYPES.find((t) => t.slug === s)?.label || s).join(" / ")}</div>
              </div>
            )}
          </div>
        </>) : (
          <button
            type="button"
            className="mt-2.5 w-full rounded-lg border-0 bg-panel-2 px-3 py-2 text-left text-sm text-secondary transition-colors hover:text-primary"
            onClick={() => selectTab("engines")}
          >
            {teaserText} <span className="font-semibold text-orange-500">— tap to explore</span>
          </button>
        )}

        <div className="mt-3 flex items-center gap-2">
          <span aria-hidden="true">🚗</span>
          {stars != null ? (
            // Filled/empty stars use the same orange-500/zinc-500 pairing as ui/rating.tsx's
            // reliability dots (zinc-500, not the spec's literal zinc-700 -- see that
            // component's own comment on the contrast fix).
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= stars ? "text-orange-500" : "text-zinc-500"}>★</span>
              ))}
              <span className="ml-1 text-xs text-secondary">{stars}/5 NCAP</span>
            </div>
          ) : (
            <span className="text-xs text-secondary">{"⚠️"} Not tested</span>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-6 text-sm text-secondary">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-accent" />
          Loading {car.make} {car.model} details...
        </div>
      )}

      {!loading && tabs.length > 0 && (<>
        <div className="mt-4">
          <PhaseSwitcher phases={siblingPhases} selectedId={car.id} onSelect={onSwitchPhase} />
        </div>

        <div className="mt-3">
          <TabBar tabs={tabs} activeTab={activeTab} onSelect={selectTab} />
        </div>

        <div className="mt-4">
          {activeTab === "configurations" && (
            <ConfigurationsTable configs={configs} onNavigate={handleConfigNavigate} />
          )}

          {activeTab === "engines" && (
            // divide-y, not per-row cards -- "generous vertical padding between rows" is
            // the separation, see EngineAccordion's own comment.
            <div className="divide-y divide-zinc-800">
              {filteredEngines.map((e, i) => (
                <EngineAccordion key={i} engine={e} gapsMode={gapsMode} isOpen={!!openEngines[i] || i === focusEngineIdx} onToggle={() => setOpenEngines((p) => ({ ...p, [i]: !p[i] }))} />
              ))}
            </div>
          )}

          {activeTab === "gearboxes" && (
            <div className="flex flex-col gap-3">
              {gearboxGroups.map((g, i) => (
                <GearboxAccordion key={g.code} gearbox={g} gapsMode={gapsMode} isOpen={!!openGearboxes[i] || i === focusUnitIdx} onToggle={() => setOpenGearboxes((p) => ({ ...p, [i]: !p[i] }))} />
              ))}
            </div>
          )}

          {activeTab === "drivetrain" && (
            <div className="flex flex-col gap-3">
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
              generation). No existing tab had anywhere to put this, so it's a tab of its own. */}
          {activeTab === "dimensions" && (detail?.dims ?? []).map((d, i) => (
            <div key={i} className="mb-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-secondary">{d.bodyName}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg bg-panel-2 p-2 text-center"><div className="text-[.6rem] uppercase tracking-wide text-secondary">Length</div><div className="mt-0.5 text-sm font-semibold text-primary">{d.length != null ? `${d.length}mm` : "—"}</div></div>
                <div className="rounded-lg bg-panel-2 p-2 text-center"><div className="text-[.6rem] uppercase tracking-wide text-secondary">Width</div><div className="mt-0.5 text-sm font-semibold text-primary">{d.width != null ? `${d.width}mm` : "—"}</div></div>
                <div className="rounded-lg bg-panel-2 p-2 text-center"><div className="text-[.6rem] uppercase tracking-wide text-secondary">Height</div><div className="mt-0.5 text-sm font-semibold text-primary">{d.height != null ? `${d.height}mm` : "—"}</div></div>
                <div className="rounded-lg bg-panel-2 p-2 text-center"><div className="text-[.6rem] uppercase tracking-wide text-secondary">Ground clearance</div><div className="mt-0.5 text-sm font-semibold text-primary">{d.groundClearance != null ? `${d.groundClearance}mm` : "—"}</div></div>
                <div className="rounded-lg bg-panel-2 p-2 text-center"><div className="text-[.6rem] uppercase tracking-wide text-secondary">Curb weight</div><div className="mt-0.5 text-sm font-semibold text-primary">{d.curbWeight != null ? `${d.curbWeight}kg` : "—"}</div></div>
                <div className="rounded-lg bg-panel-2 p-2 text-center"><div className="text-[.6rem] uppercase tracking-wide text-secondary">Boot</div><div className="mt-0.5 text-sm font-semibold text-primary">{d.bootCapacity != null ? `${d.bootCapacity}L` : "—"}</div></div>
                <div className="rounded-lg bg-panel-2 p-2 text-center"><div className="text-[.6rem] uppercase tracking-wide text-secondary">Boot (max)</div><div className="mt-0.5 text-sm font-semibold text-primary">{d.bootMax != null ? `${d.bootMax}L` : "—"}</div></div>
                <div className="rounded-lg bg-panel-2 p-2 text-center"><div className="text-[.6rem] uppercase tracking-wide text-secondary">Gross vehicle weight</div><div className="mt-0.5 text-sm font-semibold text-primary">{d.grossVehicleWeight != null ? `${d.grossVehicleWeight}kg` : "—"}</div></div>
                <div className="rounded-lg bg-panel-2 p-2 text-center"><div className="text-[.6rem] uppercase tracking-wide text-secondary">Payload</div><div className="mt-0.5 text-sm font-semibold text-primary">{d.payload != null ? `${d.payload}kg` : "—"}</div></div>
                <div className="rounded-lg bg-panel-2 p-2 text-center"><div className="text-[.6rem] uppercase tracking-wide text-secondary">Fuel tank</div><div className="mt-0.5 text-sm font-semibold text-primary">{d.fuelTank != null ? `${d.fuelTank}L` : "—"}</div></div>
                <div className="rounded-lg bg-panel-2 p-2 text-center"><div className="text-[.6rem] uppercase tracking-wide text-secondary">Seats</div><div className="mt-0.5 text-sm font-semibold text-primary">{d.seats ?? "—"}</div></div>
              </div>
            </div>
          ))}

          {activeTab === "equipment" && (
            (detail?.q ?? []).length === 0 ? (
              <p className="text-sm text-secondary">No data available.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {detail!.q.map((eq, i) => (
                  <div key={i} className="rounded-lg border border-white/5 bg-panel p-3">
                    <div className="text-sm font-semibold text-primary">{eq.trim}</div>
                    <div className="mt-0.5 text-sm leading-relaxed text-secondary">{eq.features}</div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === "faults" && (
            (detail?.c ?? []).length === 0 ? (
              <p className="text-sm text-secondary">No data available.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {detail!.c.map((f, i) => {
                  const color = SEVERITY_COLORS[f.severity] || "#a1a1aa";
                  return (
                    <div key={i} className="rounded-lg border border-white/5 bg-panel p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-primary">{f.area}</span>
                        <span className="rounded-full border px-2 py-0.5 text-xs font-medium" style={{ background: color + "1a", color, borderColor: color + "66" }}>{f.severity}</span>
                      </div>
                      <div className="mt-1 text-sm leading-relaxed text-secondary">{f.detail}</div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Safety — Euro NCAP only. The Prehľad original additionally shows GSR2-mandated
              and beyond-baseline safety-feature sections (safety_features/
              vehicle_safety_features) -- catalog_ has no equivalent table at all, so rather
              than render a permanent "reference data isn't loaded" placeholder for every single
              car, that content is left out entirely here. */}
          {activeTab === "safety" && (
            <>
              <p className="mb-2 text-sm font-medium text-primary">{"\u{1F6E1}️"} NCAP {"—"} Euro NCAP</p>
              {stars != null ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={n <= (stars || 0) ? "text-orange-500" : "text-zinc-500"}>★</span>
                    ))}
                    <span className="ml-1 text-sm text-secondary">{stars}/5{ncapYear ? ` · ${ncapYear}` : ""}</span>
                  </div>
                  {[{ l: "Adult", v: adult }, { l: "Child", v: child }, { l: "Pedestrian", v: ped }, { l: "Safety Assist", v: assist }].filter((b) => b.v != null).map((b) => (
                    <div key={b.l} className="flex items-center gap-2">
                      <span className="w-28 text-sm text-secondary">{b.l}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel-2">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: b.v + "%",
                            background: (b.v || 0) >= 90 ? "#34d399" : (b.v || 0) >= 75 ? "#fbbf24" : (b.v || 0) >= 60 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                      <span className="w-10 text-right text-sm text-secondary">{b.v}%</span>
                    </div>
                  ))}
                  <p className="text-sm font-medium" style={{ color: (stars || 0) >= 5 ? "#34d399" : (stars || 0) >= 4 ? "#fbbf24" : "#f59e0b" }}>
                    {(stars || 0) >= 5 ? "Outstanding safety" : (stars || 0) >= 4 ? "Good — 4 stars" : (stars || 0) >= 3 ? "⚠️ Below average" : "⚠️ Poor rating"}
                  </p>
                </div>
              ) : <p className="text-sm text-secondary">{"⚠️"} Not tested by Euro NCAP</p>}
            </>
          )}
        </div>
      </>)}

      {!loading && tabs.length === 0 && (
        <p className="py-5 text-sm text-secondary">No detail data available for this car.</p>
      )}
    </div>
  );
}
