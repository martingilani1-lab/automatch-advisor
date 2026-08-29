"use client";

import { useMemo, useState } from "react";
import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carPriceMax, carRel, carStars, carAdult, isGsr2Era, REL_COLORS, REL_RANK, REL_SCALE_TITLE, originLine, bodyLabel, fuelLabel, getConsumptionForFuel, getPowerForFuel } from "@/app/lib/carFields";
import { matchesFuelOption, classifyTransmissionTypes, TRANSMISSION_TYPES } from "@/app/lib/carFilters";
import type { DetailData, DetailEngine, DetailTransmission, SafetyFeature } from "./types";

const fmtK = (v: number) => (v >= 1000 ? Math.round(v / 1000) + "k" : String(v));
const SEVERITY_COLORS: Record<string, string> = { Critical: "#f44336", High: "#ff9800", Medium: "#e8ff47", Low: "#4caf50" };

// Splits a maintenance_note prose string into per-sentence bullets, at RENDER
// time only — the stored text (and the DB) are never touched. Splits on a
// period followed by whitespace and a capital letter — deliberately does NOT
// also require "not preceded by a digit": a decimal like "~1.7 L" can never
// match this pattern in the first place, since a decimal point has no
// whitespace after it (it's followed directly by the next digit), while a
// real sentence boundary that happens to end with a number — "~EUR 100-160.
// The mechatronic..." — does have a space before the capital and must still
// split. Verified against all 65 authored maintenance_note strings (194
// sentences total, zero bad splits), including the DQ200 "~1.7 L" case and
// abbreviation-adjacent text (TSB, 8 years, etc.) explicitly.
function splitSentences(text: string): string[] {
  const parts = text.split(/\.\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
  return parts.map((s, i) => (i < parts.length - 1 ? s + "." : s));
}

function RelDots({ rel }: { rel: string }) {
  const filled = (REL_RANK[rel] ?? 0) + 1;
  return (
    <span className="rel-dots">
      {[1, 2, 3, 4].map((n) => <span key={n} className={`rel-dot${n <= filled ? " on" : ""}`} />)}
    </span>
  );
}

// count is optional — the Safety tab (always present, no /api/detail
// dependency) has no natural item count the way Engines/Transmissions/
// Equipment/Faults do.
interface TabDef { id: string; label: string; count?: number }

interface CarDetailProps {
  car: CarData;
  detail: DetailData | null;
  loading: boolean;
  fuelFilter: string[];
  transmissionFilter: string[];
  drivetrainFilter: string[];
  safetyFeatures: SafetyFeature[];
  onBack: () => void;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function EngineAccordion({ car, engine, isOpen, onToggle }: { car: CarData; engine: DetailEngine; isOpen: boolean; onToggle: () => void }) {
  const rc = REL_COLORS[engine.reliability] || "#888";
  const isEV = engine.fuel_type === "electric" || engine.battery_kwh != null;
  const cons = engine.consumption ?? getConsumptionForFuel(car, engine.fuel_type);

  return (
    <div className={`eng-card${isOpen ? " open" : ""}`} onClick={onToggle}>
      <div className="eng-hdr">
        <div className="eng-left">
          <span className="eng-name">{engine.engine}</span>
          <div className="eng-tags">
            <span className="eng-badge" style={{ background: rc + "22", color: rc, border: `1px solid ${rc}44` }}>{engine.reliability}</span>
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
          {engine.pros?.length > 0 && (<>
            <div className="sub-label">{"✅"} Pros</div>
            {engine.pros.map((p, pi) => <div key={pi} className="pro-item">{"·"} {p}</div>)}
          </>)}
          {engine.cons?.length > 0 && (<>
            <div className="sub-label">{"❌"} Cons</div>
            {engine.cons.map((cn, ci) => <div key={ci} className="con-item">{"·"} {cn}</div>)}
          </>)}
        </div>
      )}
    </div>
  );
}

function TransmissionAccordion({ trans, isOpen, onToggle }: { trans: DetailTransmission; isOpen: boolean; onToggle: () => void }) {
  const rc = REL_COLORS[trans.reliability] || "#888";
  // Type tag, e.g. "Manual" / "Torque converter" — same slug vocabulary and
  // labels as the sidebar's transmission-type filter (TRANSMISSION_TYPES),
  // so this tag and the filter option text can never drift apart. Display
  // only, reusing trans.subtype (already present in DetailTransmission, just
  // not rendered before) — no new data, no new logic.
  const typeLabel = TRANSMISSION_TYPES.find((tt) => tt.slug === trans.subtype)?.label;
  // Local to this one transmission's accordion instance (React keys each
  // TransmissionAccordion by index in the parent map, so this is naturally
  // per-transmission — no need to lift into CarDetail's openEngines/openTrans-
  // style state objects). Independent of the outer isOpen/onToggle, which
  // controls the whole card's expand/collapse.
  const [maintOpen, setMaintOpen] = useState(false);
  return (
    <div className={`tx-card${isOpen ? " open" : ""}`} onClick={onToggle}>
      <div className="eng-hdr">
        <div className="eng-left">
          <span className="eng-name">{trans.type}</span>
          <div className="eng-tags">
            <span className="eng-badge" style={{ background: rc + "22", color: rc, border: `1px solid ${rc}44` }}>{trans.reliability}</span>
            {typeLabel && <span className="cfuel-tag">{typeLabel}</span>}
          </div>
        </div>
        <span className="chevron">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="eng-body">
          <div className="cgrid">
            <div className="cgrid-item">
              <div className="cgrid-label">Speeds</div>
              <div className="cgrid-val">{trans.speeds ?? "—"}</div>
            </div>
            {/* Click-to-expand tile when there's an authored maintenance_note
                to show — stopPropagation is required since this tile sits
                inside the outer .tx-card, which toggles the WHOLE accordion
                on click; without it, tapping the tile would also
                collapse/re-trigger the outer card. Falls back to the old
                bare km-interval cell (unchanged) when there's no unit note
                to expand — every unit has one now, so that's defensive-only,
                same as the reliability fallback below. */}
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
          {/* Expands in place directly below the tile row, pushing notes/
              reliability/pros/cons down — collapsed by default (maintOpen
              starts false). Same splitSentences + .maint-card/.maint-item
              content as before, just moved behind this toggle instead of
              always-rendered. */}
          {maintOpen && trans.unit?.maintenance_note && (
            <div className="maint-card">
              {splitSentences(trans.unit.maintenance_note).map((s, si) => (
                <div key={si} className="maint-item">{s}</div>
              ))}
            </div>
          )}
          {trans.notes && <div style={{ fontSize: ".78rem", color: "#9999aa", marginBottom: 4 }}>{trans.notes}</div>}
          {/* Path B step 3 — the linked unit's authored reliability_note is the
              primary reliability content now (it's what the whole unit-discovery
              +authoring effort produced). Per-car common_faults that survived the
              earlier oil-change-miscategorisation cleanup are shown underneath as
              "This car" — car-specific notes layered on the unit's general
              profile, not a duplicate of it. Falls back to the old bare
              "Known faults" rendering verbatim if there's no linked unit or its
              note is empty (defensive — every row is linked as of this step, but
              must degrade gracefully rather than show nothing/crash). */}
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
          {trans.pros?.length > 0 && (<>
            <div className="sub-label">{"✅"} Pros</div>
            {trans.pros.map((p, pi) => <div key={pi} className="pro-item">{"·"} {p}</div>)}
          </>)}
          {trans.cons?.length > 0 && (<>
            <div className="sub-label">{"❌"} Cons</div>
            {trans.cons.map((cn, ci) => <div key={ci} className="con-item">{"·"} {cn}</div>)}
          </>)}
        </div>
      )}
    </div>
  );
}

// Mirrors EngineAccordion/TransmissionAccordion exactly — same classes, no
// new CSS. Reused for both mandated rows (fixed "GSR2-mandated" badge, every
// row carries the same guarantee) and beyond-baseline rows (badge reflects
// this specific car's Standard/Optional/Not available state, from
// vehicle_safety_features via detail.sf — badgeLabel/badgeColor are passed
// in per-row rather than hardcoded). Expanded body is identical either way:
// marketing names as a subtitle, then what/how/sensors/how-to-disable from
// the safety_features reference table.
function SafetyFeatureAccordion({ feature, badgeLabel, badgeColor, isOpen, onToggle }: { feature: SafetyFeature; badgeLabel: string; badgeColor: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`eng-card${isOpen ? " open" : ""}`} onClick={onToggle}>
      <div className="eng-hdr">
        <div className="eng-left">
          <span className="eng-name">{feature.universal_name}</span>
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

export default function CarDetail({ car, detail, loading, fuelFilter, transmissionFilter, drivetrainFilter, safetyFeatures, onBack }: CarDetailProps) {
  const [activeTabState, setActiveTabState] = useState<string | null>(null);
  const [openEngines, setOpenEngines] = useState<Record<number, boolean>>({});
  const [openTrans, setOpenTrans] = useState<Record<number, boolean>>({});
  const [openSafety, setOpenSafety] = useState<Record<string, boolean>>({});

  // GSR2-mandated features are never stored per-car (STRUCTURE DECISION, see
  // the safety_features migration) — eligibility is derived here from the
  // car's own production years. Never touches scoring/tags/filters.
  const gsr2Era = isGsr2Era(car);
  const mandatedFeatures = safetyFeatures.filter((f) => f.category === "gsr2_mandated");
  // The 8 beyond-baseline features. This car's actual availability per
  // feature comes from detail.sf (vehicle_safety_features, Step 2,
  // presence-only) — a slug with no entry in that map reads as "Not
  // available," identically whether that's because it's genuinely absent,
  // hasn't been hand-tagged yet, or the migration hasn't been run yet (all
  // three collapse to "no row," on purpose). Tagging is scoped to GSR2-era
  // cars only (see scripts/safety-tags-template.csv), so this section is
  // gated on gsr2Era below — a pre-2022 car would show all 8 as "Not
  // available" too, but that'd misleadingly imply it was actually evaluated.
  const beyondBaselineFeatures = safetyFeatures.filter((f) => f.category === "beyond_baseline");
  const availabilityBySlug = useMemo(() => {
    const m: Record<string, "standard" | "optional"> = {};
    (detail?.sf ?? []).forEach((r) => { m[r.slug] = r.availability; });
    return m;
  }, [detail]);

  const price = `€${fmtK(carPriceMin(car))}–${fmtK(carPriceMax(car))}`;
  const rel = carRel(car);
  const relColor = REL_COLORS[rel] || "#888";
  const stars = carStars(car);
  // Full NCAP breakdown for the Safety tab below — carStars/carAdult are the
  // shared accessors (carFields.ts); child/pedestrian/safetyAssist/ncapYear
  // have no accessor of their own, but CarDetail only ever sees the RAW
  // /api/cars shape (never /api/recommend's normalised one), so reading
  // car.safety directly here is safe and matches carRel/carStars/carAdult's
  // own RAW-branch logic.
  const adult = carAdult(car);
  const child = car.safety?.childOccupant;
  const ped = car.safety?.pedestrian;
  const assist = car.safety?.safetyAssist;
  const ncapYear = car.safety?.ncapYear;

  // A browse card represents a MODEL, not one variant — seats/boot/drivetrain/
  // transmission differ across a model's engines and body styles (verified:
  // ~24% of cars have >1 drivetrain, ~62% have >1 transmission, ~24% have
  // boot capacity that differs by body variant). Those only become safe to
  // assert once a filter has pinned that dimension; otherwise show a teaser.
  const carTxTypes = useMemo(() => classifyTransmissionTypes(car), [car]);
  const matchedFuels = (fuelFilter || []).filter((sel) => (car.fuel || []).some((f) => matchesFuelOption(f, sel)));
  const matchedDrive = (drivetrainFilter || []).filter((sel) => (car.drivetrains || []).includes(sel));
  const matchedTx = (transmissionFilter || []).filter((sel) => carTxTypes.includes(sel));
  const hasUnlockedSpecs = matchedFuels.length > 0 || matchedDrive.length > 0 || matchedTx.length > 0;

  // engineCount/transmissionCount come straight off /api/cars (see route.ts),
  // so the teaser is complete on first paint — it doesn't wait on the
  // per-vehicle /api/detail fetch the way filteredEngines/tabs below do.
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

  // Reliability range: reliabilityTiers/reliabilityWorst come straight off
  // /api/cars (see route.ts) — bestRel (car.reliability, rel below) is the
  // optimistic single value (best engine's tier), not a floor. When the
  // engines actually span tiers, show the honest range instead (worst-first,
  // coloured to the worst). No /api/detail dependency — available on first
  // paint, same as engineCount/transmissionCount above.
  // Scoring/quiz untouched — see CLAUDE.md "Known issues" for the bestRel gap.
  const relTiers = car.reliabilityTiers ?? [];
  const isRelSpread = relTiers.length > 1;
  const relLabel = isRelSpread ? `${relTiers[0]}–${relTiers[relTiers.length - 1]}` : rel;
  const relColorFinal = isRelSpread ? (REL_COLORS[car.reliabilityWorst || relTiers[0]] || "#888") : relColor;
  const relTitle = isRelSpread ? `${REL_SCALE_TITLE}\n${relTiers.join(" · ")}` : REL_SCALE_TITLE;

  const filteredEngines = useMemo(() => {
    const all = detail?.e ?? [];
    if (!fuelFilter || fuelFilter.length === 0) return all;
    return all.filter((e) => fuelFilter.some((sel) => matchesFuelOption(e.fuel_type, sel)));
  }, [detail, fuelFilter]);

  const tabs: TabDef[] = [];
  if (filteredEngines.length > 0) tabs.push({ id: "engines", label: "Engines", count: filteredEngines.length });
  if ((detail?.t.length ?? 0) > 0) tabs.push({ id: "transmissions", label: "Transmissions", count: detail!.t.length });
  if ((detail?.q.length ?? 0) > 0) tabs.push({ id: "equipment", label: "Equipment", count: detail!.q.length });
  if ((detail?.c.length ?? 0) > 0) tabs.push({ id: "faults", label: "Common faults", count: detail!.c.length });
  // Always present — stars/adult/child/ped/assist/ncapYear come straight off
  // /api/cars (car.safety), no /api/detail dependency, so Safety never has
  // to wait on the detail fetch the way the tabs above do.
  tabs.push({ id: "safety", label: "Safety" });

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
            {matchedTx.length > 0 && (
              <div className="cgrid-item">
                <div className="cgrid-label">Trans.</div>
                <div className="cgrid-val">{matchedTx.map((s) => TRANSMISSION_TYPES.find((t) => t.slug === s)?.label || s).join(" / ")}</div>
              </div>
            )}
          </div>
        </>) : (
          <button type="button" className="variety-teaser" onClick={() => setActiveTabState("engines")}>
            {teaserText} <span className="vt-cta">— tap to explore</span>
          </button>
        )}

        <div className="trust-row">
          <span className="rel-pill" title={relTitle} style={{ background: relColorFinal + "22", color: relColorFinal, border: `1px solid ${relColorFinal}44` }}>
            {relLabel}<RelDots rel={isRelSpread ? (car.reliabilityWorst || relTiers[0]) : rel} />
          </span>
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

        {/* Safety — Euro NCAP. Markup/thresholds duplicated verbatim from
            app/page.tsx's renderMorePanel (quiz detail panel) rather than
            extracted into a shared component, since extraction would require
            editing page.tsx to consume it and the quiz panel must stay
            untouched. Keep the two in sync by hand if this ever changes. */}
        {activeTab === "safety" && (
          <div className="mp-section">
            <div className="mp-title">{"\u{1F6E1}️"} Safety {"—"} Euro NCAP</div>
            {stars != null ? (
              <div className="ncap-detail">
                <div className="ncap-stars-row">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`ns-lg${n <= (stars || 0) ? " on" : ""}`}>{"★"}</span>)}<span className="ns-label">{stars}/5{ncapYear ? ` · ${ncapYear}` : ""}</span></div>
                {[{ l: "Adult", v: adult }, { l: "Child", v: child }, { l: "Pedestrian", v: ped }, { l: "Safety Assist", v: assist }].filter((b) => b.v != null).map((b) => (
                  <div key={b.l} className="ncap-bar"><span className="ncap-bl">{b.l}</span><div className="ncap-track"><div className="ncap-fill" style={{ width: b.v + "%", background: (b.v || 0) >= 90 ? "#4caf50" : (b.v || 0) >= 75 ? "#e8ff47" : (b.v || 0) >= 60 ? "#ff9800" : "#f44336" }} /></div><span className="ncap-pv">{b.v}%</span></div>
                ))}
                <div className="ncap-verdict" style={{ color: (stars || 0) >= 5 ? "#4caf50" : (stars || 0) >= 4 ? "#e8ff47" : "#ff9800" }}>{(stars || 0) >= 5 ? "Outstanding safety" : (stars || 0) >= 4 ? "Good — 4 stars" : (stars || 0) >= 3 ? "⚠️ Below average" : "⚠️ Poor rating"}</div>
              </div>
            ) : <div className="ncap-na">{"⚠️"} Not tested by Euro NCAP</div>}

            {/* GSR2-mandated safety assists — additive on top of the existing
                Euro NCAP block above (this Safety tab pre-dates this task and
                already covers crash-test ratings; extending it here keeps one
                coherent Safety tab rather than a second, confusingly-similar
                one). Eligibility is derived from car.years (isGsr2Era) — never
                stored per-car, never touches scoring/filters/tags. */}
            <div className="mp-title" style={{ marginTop: 18 }}>{"\u{1F6E1}️"} {gsr2Era ? "Safety assists this model can have" : "Guaranteed safety assists"}</div>
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
                <div className="mp-hint">Safety-feature reference data isn't loaded yet — run the safety_features migration to populate this list.</div>
              )
            ) : (
              <div className="mp-hint">This model's production ended before the EU's 2022 GSR2 safety mandate took effect, so the guaranteed-baseline list above doesn't apply here — check the individual listing for what safety equipment it actually has.</div>
            )}

            {gsr2Era && (
              <>
                <div className="mp-title" style={{ marginTop: 18 }}>{"✨"} Optional assists</div>
                {/* TEMP DEBUG — bug trace, remove after diagnosis */}
                {console.log("[safety debug] (a) car.id:", car.id, "| detail === null:", detail === null, "| detail?.sf:", detail?.sf)}
                {console.log("[safety debug] (b) beyondBaselineFeatures slugs:", beyondBaselineFeatures.map((f) => f.slug))}
                {console.log("[safety debug] (c) per-slug lookup:", beyondBaselineFeatures.map((f) => ({ slug: f.slug, availability: availabilityBySlug[f.slug] ?? "(no entry -> Not available)" })))}
                {beyondBaselineFeatures.length > 0 ? (
                  beyondBaselineFeatures.map((f) => {
                    const availability = availabilityBySlug[f.slug];
                    const badgeLabel = availability === "standard" ? "Standard" : availability === "optional" ? "Optional" : "Not available";
                    const badgeColor = availability === "standard" ? "#4caf50" : availability === "optional" ? "#e8ff47" : "#6b6b72";
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
                  <div className="mp-hint">Safety-feature reference data isn't loaded yet — run the safety_features migration to populate this list.</div>
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
