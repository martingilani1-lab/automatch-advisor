"use client";

// One car in My Garage: what's due next (deadlines + catalog-interval services, most urgent
// first), plus forms to log a service, set STK/insurance dates and update the mileage, and the
// service history. Reminders are computed in the browser with the same engine the daily email
// job uses (lib/reminders.ts), so the page and the emails always agree.

import { useMemo, useState } from "react";

import type { GarageVehicle } from "./lib/server";
import type { Reminder, ReminderStatus } from "./lib/reminders";
import { buildReminders, estimatedMileage, fmtDate } from "./lib/reminders";
import type { DeadlineKind, ServiceKind } from "./lib/vocab";
import { DEADLINE_KINDS, DEADLINE_LABELS, SERVICE_KINDS, SERVICE_LABELS } from "./lib/vocab";
import { garageAction, localToday } from "./lib/api";

const STATUS_STYLE: Record<ReminderStatus, { color: string; text: string }> = {
  overdue: { color: "#ff6b35", text: "Overdue" },
  soon: { color: "#ff9944", text: "Due soon" },
  ok: { color: "#6bdb8a", text: "OK" },
  unknown: { color: "#6b6b72", text: "No record" },
};

const fmtKm = (n: number) => `${n.toLocaleString("en-US").replace(/,/g, " ")} km`;
const eur = (a: number | null, b: number | null) => (a == null ? null : a === b || b == null ? `€${a}` : `€${a}–${b}`);

// "in 12 days" for the near future; months/years further out (nobody plans in "2641 days").
function inTime(days: number): string {
  if (days <= 60) return `in ${days} days`;
  if (days < 730) return `in ~${Math.round(days / 30.4)} months`;
  return `in ~${Math.round(days / 365)} years`;
}

function dueText(r: Reminder): string {
  if (r.status === "unknown") return r.basis;
  const parts: string[] = [];
  if (r.daysLeft != null && r.dueOn) {
    parts.push(r.daysLeft < 0 ? `${-r.daysLeft} days overdue (${fmtDate(r.dueOn)})` : r.daysLeft === 0 ? "due today" : `${inTime(r.daysLeft)} (${r.source === "service" ? "~" : ""}${fmtDate(r.dueOn)})`);
  }
  if (r.kmLeft != null) parts.push(r.kmLeft < 0 ? `${fmtKm(-r.kmLeft)} over` : `in ~${fmtKm(r.kmLeft)}`);
  return parts.join(" · ");
}

interface VehicleCardProps {
  v: GarageVehicle;
  onChanged: () => void;
  defaultOpen?: boolean; // a single car opens straight away
}

export default function VehicleCard({ v, onChanged, defaultOpen = false }: VehicleCardProps) {
  const today = localToday();
  const reminders = useMemo(() => buildReminders(v, v.intervals, v.records, v.deadlines, today), [v, today]);
  const [open, setOpen] = useState(defaultOpen);
  const [panel, setPanel] = useState<"none" | "record" | "deadline" | "mileage">("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rec, setRec] = useState({ kind: "oil_change" as ServiceKind, doneOn: today, mileageKm: "", costEur: "", note: "" });
  const [dl, setDl] = useState({ kind: "stk" as DeadlineKind, dueOn: "", label: "" });
  const [km, setKm] = useState({ mileageKm: v.mileageKm != null ? String(v.mileageKm) : "", yearlyKm: v.yearlyKm != null ? String(v.yearlyKm) : "" });

  const overdue = reminders.filter((r) => r.status === "overdue").length;
  const soon = reminders.filter((r) => r.status === "soon").length;
  const nowKm = estimatedMileage(v, today);

  async function run(action: string, payload: Record<string, unknown>, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await garageAction(action, payload);
      after?.();
      setPanel("none");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  const logFor = (kind: ServiceKind) => { setRec((p) => ({ ...p, kind, doneOn: today })); setPanel("record"); setOpen(true); };

  return (
    <div className="garage-card">
      <button type="button" className="garage-car-head" onClick={() => setOpen((o) => !o)}>
        <div style={{ minWidth: 0 }}>
          <div className="garage-title">{v.nickname ?? `${v.brand} ${v.model}`}</div>
          <div className="tg">{v.nickname ? `${v.brand} ${v.model} · ` : ""}{v.catalogLabel ?? v.engineText ?? "engine not set"}</div>
          <div className="tg">
            {[v.yearMade, nowKm != null ? `~${fmtKm(nowKm)}` : null, v.licensePlate].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div className="garage-chips">
          {overdue > 0 && <span className="eng-badge" style={{ background: "#ff6b3522", color: "#ff6b35", border: "1px solid #ff6b3544" }}>{overdue} overdue</span>}
          {soon > 0 && <span className="eng-badge" style={{ background: "#ff994422", color: "#ff9944", border: "1px solid #ff994444" }}>{soon} soon</span>}
          {overdue === 0 && soon === 0 && <span className="eng-badge" style={{ background: "#6bdb8a22", color: "#6bdb8a", border: "1px solid #6bdb8a44" }}>All good</span>}
          <span className="chevron">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          <div className="sub-label">What&apos;s due</div>
          {reminders.length === 0 && <p className="tg">Nothing to track yet -- set your STK and insurance dates below{v.catalogLabel ? "" : ", or log services you've done"}.</p>}
          {reminders.map((r) => {
            const s = STATUS_STYLE[r.status];
            const cost = eur(r.costEurMin, r.costEurMax);
            return (
              <div key={r.key} className="garage-due">
                <span className="garage-dot" style={{ background: s.color }} title={s.text} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="garage-due-head">
                    <span style={{ color: "#f0f0f0", fontWeight: 600 }}>{r.label}</span>
                    <span style={{ color: s.color, fontSize: ".74rem", whiteSpace: "nowrap" }}>{s.text}</span>
                  </div>
                  <div className="tg">{dueText(r)}{cost ? ` · ${cost}` : ""}</div>
                  {r.status !== "unknown" && r.source === "service" && <div className="tg" style={{ fontSize: ".7rem" }}>{r.basis}</div>}
                  {r.source === "service" && (r.status === "unknown" || r.status === "overdue" || r.status === "soon") && (
                    <button type="button" className="cfg-link" style={{ fontSize: ".74rem", marginTop: 2 }} onClick={() => logFor(r.kind as ServiceKind)}>
                      {r.status === "unknown" ? "Log the last one →" : "Mark as done →"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="garage-actions">
            <button type="button" className={panel === "record" ? "active" : ""} onClick={() => setPanel(panel === "record" ? "none" : "record")}>+ Log service</button>
            <button type="button" className={panel === "deadline" ? "active" : ""} onClick={() => setPanel(panel === "deadline" ? "none" : "deadline")}>STK / insurance date</button>
            <button type="button" className={panel === "mileage" ? "active" : ""} onClick={() => setPanel(panel === "mileage" ? "none" : "mileage")}>Update km</button>
          </div>

          {panel === "record" && (
            <div className="maint-card" style={{ padding: 10 }}>
              <select className="tco-cmp-select" value={rec.kind} onChange={(e) => setRec((p) => ({ ...p, kind: e.target.value as ServiceKind }))}>
                {SERVICE_KINDS.map((k) => <option key={k} value={k}>{SERVICE_LABELS[k]}</option>)}
              </select>
              <div className="garage-grid2">
                <input className="garage-input" type="date" max={today} value={rec.doneOn} onChange={(e) => setRec((p) => ({ ...p, doneOn: e.target.value }))} />
                <input className="garage-input" inputMode="numeric" placeholder="Mileage (km)" value={rec.mileageKm} onChange={(e) => setRec((p) => ({ ...p, mileageKm: e.target.value }))} />
                <input className="garage-input" inputMode="decimal" placeholder="Cost € (optional)" value={rec.costEur} onChange={(e) => setRec((p) => ({ ...p, costEur: e.target.value }))} />
                <input className="garage-input" placeholder="Note (optional)" value={rec.note} onChange={(e) => setRec((p) => ({ ...p, note: e.target.value }))} />
              </div>
              <p className="tg" style={{ fontSize: ".7rem" }}>Add the mileage -- km-based reminders (oil, timing belt) need it.</p>
              <button type="button" className="garage-btn" disabled={busy || !rec.doneOn} onClick={() =>
                run("addRecord", { vehicleId: v.id, kind: rec.kind, doneOn: rec.doneOn, mileageKm: rec.mileageKm || null, costEur: rec.costEur.replace(",", ".") || null, note: rec.note || null },
                  () => setRec({ kind: "oil_change", doneOn: today, mileageKm: "", costEur: "", note: "" }))}>
                {busy ? "Saving…" : "Save service"}
              </button>
            </div>
          )}

          {panel === "deadline" && (
            <div className="maint-card" style={{ padding: 10 }}>
              <select className="tco-cmp-select" value={dl.kind} onChange={(e) => setDl((p) => ({ ...p, kind: e.target.value as DeadlineKind }))}>
                {DEADLINE_KINDS.map((k) => <option key={k} value={k}>{DEADLINE_LABELS[k]}</option>)}
              </select>
              <input className="garage-input" type="date" value={dl.dueOn} onChange={(e) => setDl((p) => ({ ...p, dueOn: e.target.value }))} />
              {dl.kind === "other" && <input className="garage-input" placeholder="What is it? (e.g. Leasing payment)" value={dl.label} onChange={(e) => setDl((p) => ({ ...p, label: e.target.value }))} />}
              <p className="tg" style={{ fontSize: ".7rem" }}>Use the date on your STK sticker / insurance letter. Setting it again replaces the old date.</p>
              <button type="button" className="garage-btn" disabled={busy || !dl.dueOn} onClick={() =>
                run("setDeadline", { vehicleId: v.id, kind: dl.kind, dueOn: dl.dueOn, label: dl.label || null }, () => setDl({ kind: "stk", dueOn: "", label: "" }))}>
                {busy ? "Saving…" : "Save date"}
              </button>
              {v.deadlines.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {v.deadlines.map((d) => (
                    <div key={d.id} className="garage-row tg">
                      <span>{d.kind === "other" && d.label ? d.label : DEADLINE_LABELS[d.kind]}: {fmtDate(d.dueOn)}</span>
                      <button type="button" className="cfg-link" style={{ fontSize: ".74rem", color: "#6b6b72" }} onClick={() => run("deleteDeadline", { id: d.id })}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {panel === "mileage" && (
            <div className="maint-card" style={{ padding: 10 }}>
              <div className="garage-grid2">
                <input className="garage-input" inputMode="numeric" placeholder="Mileage now (km)" value={km.mileageKm} onChange={(e) => setKm((p) => ({ ...p, mileageKm: e.target.value }))} />
                <input className="garage-input" inputMode="numeric" placeholder="km per year" value={km.yearlyKm} onChange={(e) => setKm((p) => ({ ...p, yearlyKm: e.target.value }))} />
              </div>
              <button type="button" className="garage-btn" disabled={busy} onClick={() =>
                run("updateVehicle", { id: v.id, nickname: v.nickname, licensePlate: v.licensePlate, engineText: v.engineText, yearMade: v.yearMade, mileageKm: km.mileageKm || null, yearlyKm: km.yearlyKm || null })}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          )}

          {error && <p style={{ color: "#ff6b35" }}>{error}</p>}

          <div className="sub-label" style={{ marginTop: 14 }}>Service history</div>
          {v.records.length === 0 ? (
            <p className="tg">No services logged yet.</p>
          ) : (
            v.records.map((r) => (
              <div key={r.id} className="garage-hist">
                <div>
                  <span style={{ color: "#f0f0f0" }}>{SERVICE_LABELS[r.kind]}</span>
                  <span className="tg"> · {fmtDate(r.doneOn)}{r.mileageKm != null ? ` · ${fmtKm(r.mileageKm)}` : ""}{r.costEur != null ? ` · €${r.costEur}` : ""}</span>
                  {r.note && <div className="tg" style={{ fontSize: ".72rem" }}>{r.note}</div>}
                </div>
                <button type="button" className="cfg-link" style={{ fontSize: ".74rem", color: "#6b6b72" }} onClick={() => run("deleteRecord", { id: r.id })}>Delete</button>
              </div>
            ))
          )}

          <button
            type="button"
            className="cfg-link"
            style={{ marginTop: 14, color: "#ff6b35", fontSize: ".78rem" }}
            onClick={() => { if (window.confirm(`Remove ${v.nickname ?? `${v.brand} ${v.model}`} and its whole history?`)) run("deleteVehicle", { id: v.id }); }}
          >
            Remove this car
          </button>
        </div>
      )}
    </div>
  );
}
