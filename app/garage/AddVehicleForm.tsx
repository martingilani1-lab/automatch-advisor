"use client";

// Add a car to My Garage: pick it from the catalog (brand -> model/generation -> engine +
// gearbox), which brings the catalog's service intervals with it, or type it in freely when the
// car isn't in the catalog (then only deadlines and the user's own records drive reminders).

import { useEffect, useMemo, useState } from "react";

import type { CarData } from "@/app/lib/carFields";
import type { GarageCatalogOption } from "@/app/api/garage/catalog/route";
import { modelName } from "@/app/db-test/lib/costCompareSuggest";
import { garageAction } from "./lib/api";

interface AddVehicleFormProps {
  onDone: () => void;
  onCancel: () => void;
}

const phaseLabel = (c: CarData) => {
  const gen = c.model.match(/\(([^)]+)\)/)?.[1];
  return [gen, c.phaseLabel].filter(Boolean).join(" · ") + (c.years ? ` (${c.years})` : "");
};

export default function AddVehicleForm({ onDone, onCancel }: AddVehicleFormProps) {
  const [mode, setMode] = useState<"catalog" | "free">("catalog");
  const [cars, setCars] = useState<CarData[] | null>(null);
  const [brand, setBrand] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [options, setOptions] = useState<GarageCatalogOption[] | null>(null);
  const [optionKey, setOptionKey] = useState("");
  const [free, setFree] = useState({ brand: "", model: "", engineText: "" });
  const [f, setF] = useState({ yearMade: "", mileageKm: "", yearlyKm: "", nickname: "", licensePlate: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/db-test").then((r) => r.json()).then((d: CarData[]) => { if (!cancelled) setCars(d); }).catch(() => { if (!cancelled) setCars([]); });
    return () => { cancelled = true; };
  }, []);

  // Phase's engine options, fetched when a phase is picked.
  useEffect(() => {
    if (!phaseId) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => { setOptions(null); setOptionKey(""); })
      .then(() => fetch(`/api/garage/catalog?phaseId=${phaseId}`))
      .then((r) => r.json())
      .then((d: GarageCatalogOption[]) => { if (!cancelled) setOptions(d); })
      .catch(() => { if (!cancelled) setOptions([]); });
    return () => { cancelled = true; };
  }, [phaseId]);

  const brands = useMemo(() => [...new Set((cars ?? []).map((c) => c.make))].sort((a, b) => a.localeCompare(b)), [cars]);
  const phases = useMemo(
    () => (cars ?? []).filter((c) => c.make === brand).sort((a, b) => modelName(a).localeCompare(modelName(b)) || a.years.localeCompare(b.years)),
    [cars, brand]
  );
  const phase = phases.find((c) => c.id === phaseId) ?? null;
  const option = options?.find((o) => o.key === optionKey) ?? null;
  const setField = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const ready = mode === "catalog" ? !!(phase && option) : !!(free.brand.trim() && free.model.trim());

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const common = {
        yearMade: f.yearMade || null, mileageKm: f.mileageKm || null, yearlyKm: f.yearlyKm || null,
        nickname: f.nickname || null, licensePlate: f.licensePlate || null,
      };
      if (mode === "catalog" && phase && option) {
        await garageAction("addVehicle", {
          ...common, brand: phase.make, model: modelName(phase),
          phaseId: phase.id, engineId: option.engineId, unitId: option.unitId, drivetrainId: option.drivetrainId,
        });
      } else {
        await garageAction("addVehicle", { ...common, brand: free.brand, model: free.model, engineText: free.engineText || null });
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
      setBusy(false);
    }
  }

  return (
    <div className="garage-card">
      <div className="garage-title">Add a car</div>
      <div className="garage-tabs">
        <button type="button" className={mode === "catalog" ? "active" : ""} onClick={() => setMode("catalog")}>From our catalog</button>
        <button type="button" className={mode === "free" ? "active" : ""} onClick={() => setMode("free")}>Not in the list</button>
      </div>

      {mode === "catalog" ? (
        <>
          <p className="tg">Service intervals (oil, timing belt, gearbox…) are filled in automatically.</p>
          <select className="tco-cmp-select" value={brand} onChange={(e) => { setBrand(e.target.value); setPhaseId(""); setOptions(null); }}>
            <option value="">{cars ? "Brand…" : "Loading…"}</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="tco-cmp-select" value={phaseId} disabled={!brand} onChange={(e) => setPhaseId(e.target.value)}>
            <option value="">Model and generation…</option>
            {phases.map((c) => <option key={c.id} value={c.id}>{modelName(c)} {phaseLabel(c)}</option>)}
          </select>
          <select className="tco-cmp-select" value={optionKey} disabled={!phaseId || !options} onChange={(e) => setOptionKey(e.target.value)}>
            <option value="">{phaseId && !options ? "Loading…" : "Engine and gearbox…"}</option>
            {(options ?? []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </>
      ) : (
        <>
          <p className="tg">No automatic service intervals for these -- reminders come from the dates you enter.</p>
          <input className="garage-input" placeholder="Brand (e.g. Ford)" value={free.brand} onChange={(e) => setFree((p) => ({ ...p, brand: e.target.value }))} />
          <input className="garage-input" placeholder="Model (e.g. Focus)" value={free.model} onChange={(e) => setFree((p) => ({ ...p, model: e.target.value }))} />
          <input className="garage-input" placeholder="Engine (optional, e.g. 1.6 TDCi 85 kW)" value={free.engineText} onChange={(e) => setFree((p) => ({ ...p, engineText: e.target.value }))} />
        </>
      )}

      <div className="garage-grid2">
        <input className="garage-input" inputMode="numeric" placeholder="Year made" value={f.yearMade} onChange={setField("yearMade")} />
        <input className="garage-input" inputMode="numeric" placeholder="Mileage now (km)" value={f.mileageKm} onChange={setField("mileageKm")} />
        <input className="garage-input" inputMode="numeric" placeholder="km per year (default 15 000)" value={f.yearlyKm} onChange={setField("yearlyKm")} />
        <input className="garage-input" placeholder="Licence plate (optional)" value={f.licensePlate} onChange={setField("licensePlate")} />
      </div>
      <input className="garage-input" placeholder="Nickname (optional, e.g. Dad's Octavia)" value={f.nickname} onChange={setField("nickname")} />

      {error && <p style={{ color: "#ff6b35" }}>{error}</p>}
      <div className="garage-row">
        <button type="button" className="cfg-link" style={{ fontSize: ".78rem", color: "#9999aa" }} onClick={onCancel}>Cancel</button>
        <button type="button" className="garage-btn" style={{ width: "auto" }} disabled={!ready || busy} onClick={save}>{busy ? "Saving…" : "Add car"}</button>
      </div>
    </div>
  );
}
