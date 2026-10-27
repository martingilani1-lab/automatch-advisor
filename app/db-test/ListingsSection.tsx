"use client";

// "Ads" tab: real used cars for sale on SK/CZ portals for ONE engine of this car, read live
// (POST /api/listings) and shown TheParking-style -- photo, price and key facts on a card that
// links to the original ad on its portal. Nothing is hosted here: the photo loads from the
// portal's own server and the card is only a pointer to the real ad.
//
// Opened from a configuration's "Search real vehicles" button (Configurations tab), which
// picks the engine; the engine picker on top switches without leaving the tab.

import { useEffect, useMemo, useState } from "react";

import type { CatalogConfig } from "@/app/catalog/lib/types";
import type { ListingsResponse } from "@/app/api/listings/route";
import type { ClassifiedListing } from "@/app/lib/listings/searchListings";
import { dbTestEngineLabel } from "./ConfigRows";

interface ListingsSectionProps {
  phaseId: string;
  configs: CatalogConfig[];
  engineId: string | null; // set by a configuration's "Search real vehicles" button
  onEngineChange: (engineId: string) => void;
}

const fmtNum = (n: number) => n.toLocaleString("en-US").replace(/,/g, " ");
const fmtPrice = (l: ClassifiedListing) => (l.price != null ? `${fmtNum(l.price)} ${l.currency === "EUR" ? "€" : "Kč"}` : "Price on request");

export function ListingCard({ l, portalName }: { l: ClassifiedListing; portalName: string }) {
  const facts = [
    l.year != null ? String(l.year) : null,
    l.mileageKm != null ? `${fmtNum(l.mileageKm)} km` : null,
    l.powerKw != null ? `${l.powerKw} kW` : null,
    l.fuel,
    l.transmission,
  ].filter(Boolean);
  return (
    <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="ad-card">
      <div className="ad-card-photo">
        {l.photoUrl ? (
          // Plain <img>, not next/image: next/image would proxy and cache the portal's photo on
          // our server, i.e. host it. Loading it straight from the portal keeps us read-only.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.photoUrl} alt={l.title} loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <span className="tg">No photo</span>
        )}
      </div>
      <div className="ad-card-body">
        <div className="ad-card-title">{l.title}</div>
        <div className="ad-card-price">{fmtPrice(l)}</div>
        <div className="tg">{facts.join(" · ")}</div>
        <div className="ad-card-foot">
          <span className="eng-badge" style={l.fit === "exact"
            ? { background: "#6bdb8a22", color: "#6bdb8a", border: "1px solid #6bdb8a44" }
            : { background: "#ff994422", color: "#ff9944", border: "1px solid #ff994444" }}>
            {l.fit === "exact" ? "This engine" : "Possibly this engine"}
          </span>
          <span className="tg">{[l.location, portalName].filter(Boolean).join(" · ")} ↗</span>
        </div>
      </div>
    </a>
  );
}

export default function ListingsSection({ phaseId, configs, engineId, onEngineChange }: ListingsSectionProps) {
  // One option per engine (body/gearbox don't change which ads match the engine).
  const engines = useMemo(() => {
    const byId = new Map<string, CatalogConfig>();
    for (const c of configs) if (!byId.has(c.engine.id)) byId.set(c.engine.id, c);
    return [...byId.values()].sort((a, b) => a.engine.fuelType.localeCompare(b.engine.fuelType) || (a.engine.displacementCc ?? 0) - (b.engine.displacementCc ?? 0) || a.engine.powerKw - b.engine.powerKw);
  }, [configs]);

  // Results keyed by engine so switching back is instant (the server also remembers 24 h).
  const [results, setResults] = useState<Record<string, ListingsResponse>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = engineId ? results[engineId] : undefined;

  useEffect(() => {
    if (!engineId || results[engineId]) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => { setLoading(engineId); setError(null); })
      .then(() => fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId, engineId }),
      }))
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<ListingsResponse>; })
      .then((data) => { if (!cancelled) setResults((p) => ({ ...p, [engineId]: data })); })
      .catch((e) => { if (!cancelled) setError(`Search failed (${e instanceof Error ? e.message : "error"}).`); })
      .finally(() => { if (!cancelled) setLoading(null); });
    return () => { cancelled = true; };
  }, [engineId, phaseId, results]);

  const portalName = (id: string) => current?.sources.find((s) => s.portal === id)?.name ?? id;
  const exact = current?.listings.filter((l) => l.fit === "exact") ?? [];
  const possible = current?.listings.filter((l) => l.fit === "possible") ?? [];

  return (
    <div>
      <label className="tco-field">
        <span className="cgrid-label">Engine</span>
        <select className="tco-cmp-select" value={engineId ?? ""} onChange={(e) => e.target.value && onEngineChange(e.target.value)}>
          <option value="">Pick an engine to search…</option>
          {engines.map((c) => <option key={c.engine.id} value={c.engine.id}>{dbTestEngineLabel(c)}</option>)}
        </select>
      </label>

      {!engineId && <p className="tg">Pick an engine, or press &ldquo;Search real vehicles&rdquo; on a configuration.</p>}
      {engineId && loading === engineId && <p className="tg">{"⟳"} Searching portals…</p>}
      {error && <p style={{ color: "#ff6b35" }}>{error}</p>}

      {current && (
        <>
          {current.sources.length === 0 ? (
            <div className="maint-card" style={{ padding: 12 }}>
              <div style={{ color: "#f0f0f0", fontWeight: 600 }}>No portals connected yet</div>
              <div className="tg" style={{ marginTop: 4 }}>The Autobazar.sk and TipCars readers are being added.</div>
            </div>
          ) : (
            <div className="tg" style={{ marginBottom: 10 }}>
              {current.sources.map((s) => (
                <span key={s.portal} style={{ marginRight: 12 }}>
                  <a href={s.searchUrl} target="_blank" rel="noopener noreferrer nofollow" className="cfg-link">{s.name}</a>
                  {s.status === "ok" ? ` · ${s.count} read` : " · unavailable"}
                </span>
              ))}
              {current.cached && " · from the last 24 h"}
            </div>
          )}

          {current.sources.length > 0 && exact.length === 0 && possible.length === 0 && (
            <p className="tg">No ads for this engine right now.</p>
          )}
          {exact.length > 0 && (
            <>
              <div className="sub-label">This engine · {exact.length}</div>
              <div className="ad-grid">{exact.map((l) => <ListingCard key={l.url} l={l} portalName={portalName(l.portal)} />)}</div>
            </>
          )}
          {possible.length > 0 && (
            <>
              <div className="sub-label" style={{ marginTop: 16 }}>Possibly this engine · {possible.length}</div>
              <p className="tg" style={{ marginBottom: 8 }}>The ad doesn&apos;t say enough (e.g. no power) to be sure -- check on the portal.</p>
              <div className="ad-grid">{possible.map((l) => <ListingCard key={l.url} l={l} portalName={portalName(l.portal)} />)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
