"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carStars } from "@/app/lib/carFields";
import {
  BODY_OPTIONS,
  FUEL_OPTIONS,
  DRIVETRAIN_OPTIONS,
  GEARBOX_TYPES,
  matchesBodyGroup,
  matchesFuelGroup,
  matchesGearboxGroup,
  matchesDrivetrainGroup,
  matchesBrandGroup,
  applyFilters,
  facetCounts,
  type FilterState,
} from "@/app/db-test/lib/filters";
import CarRow from "./CarRow";
import FilterPanel from "./FilterPanel";
import CarDetail from "./CarDetail";
import type { DetailData } from "./types";

// No "Reliability" sort here -- unlike the legacy schema, catalog_engines/transmission_units
// carry no reliability-tier column at all, so there is nothing honest to sort by (see
// CarData.reliability below, always "—").
const SORT_OPTIONS = [
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "safety", label: "Safety" },
  { value: "year", label: "Year" },
];

function parseList(v: string | null): string[] {
  return v ? v.split(",").filter(Boolean) : [];
}

export default function DbTestView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedBody = useMemo(() => parseList(searchParams.get("cat")), [searchParams]);

  const filters: FilterState = useMemo(() => ({
    fuel: parseList(searchParams.get("fuel")),
    gearbox: parseList(searchParams.get("gearbox")),
    drivetrain: parseList(searchParams.get("drivetrain")),
    brand: parseList(searchParams.get("brand")),
    priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : null,
    priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : null,
  }), [searchParams]);

  const sort = searchParams.get("sort") || "price_asc";
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ONE fetch on mount — /api/db-test (GET) returns one card per catalog_phases row, each
  // already tagged server-side with `categories: string[]` (same body-tile partition idea
  // as /api/cars, just resolved off catalog_body_types names instead of the legacy body_type
  // enum — see resolveBodyTile in app/db-test/lib/filters.ts).
  const [allCars, setAllCars] = useState<CarData[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/db-test")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAllCars(data);
        setLoaded(true);
      })
      .catch((e) => console.error("DB test fetch failed:", e));
    return () => { cancelled = true; };
  }, []);

  const bodyFilteredList = useMemo(
    () => (selectedBody.length ? allCars.filter((c) => matchesBodyGroup(c, selectedBody)) : allCars),
    [allCars, selectedBody]
  );

  const brandOptions = useMemo(
    () => [...new Set(bodyFilteredList.map((c) => c.make).filter(Boolean))].sort().map((make) => ({ slug: make, label: make })),
    [bodyFilteredList]
  );

  const bodyCounts = useMemo(
    () => facetCounts(applyFilters(allCars, filters), BODY_OPTIONS, matchesBodyGroup),
    [allCars, filters]
  );
  const fuelCounts = useMemo(
    () => facetCounts(applyFilters(bodyFilteredList, filters, "fuel"), FUEL_OPTIONS, matchesFuelGroup),
    [bodyFilteredList, filters]
  );
  const gearboxCounts = useMemo(
    () => facetCounts(applyFilters(bodyFilteredList, filters, "gearbox"), GEARBOX_TYPES, matchesGearboxGroup),
    [bodyFilteredList, filters]
  );
  const drivetrainCounts = useMemo(
    () => facetCounts(applyFilters(bodyFilteredList, filters, "drivetrain"), DRIVETRAIN_OPTIONS, matchesDrivetrainGroup),
    [bodyFilteredList, filters]
  );
  const brandCounts = useMemo(
    () => facetCounts(applyFilters(bodyFilteredList, filters, "brand"), brandOptions, matchesBrandGroup),
    [bodyFilteredList, filters, brandOptions]
  );

  const filteredList = useMemo(() => applyFilters(bodyFilteredList, filters), [bodyFilteredList, filters]);

  const searchedList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredList;
    return filteredList.filter((c) => `${c.make} ${c.model}`.toLowerCase().includes(q));
  }, [filteredList, searchQuery]);

  const sortedList = useMemo(() => {
    const list = [...searchedList];
    if (sort === "price_asc") list.sort((a, b) => carPriceMin(a) - carPriceMin(b));
    else if (sort === "price_desc") list.sort((a, b) => carPriceMin(b) - carPriceMin(a));
    else if (sort === "safety") list.sort((a, b) => (carStars(b) ?? 0) - (carStars(a) ?? 0));
    else if (sort === "year") list.sort((a, b) => (b.yearTo ?? 0) - (a.yearTo ?? 0));
    return list;
  }, [searchedList, sort]);

  const carId = searchParams.get("car");
  const openCarData = useMemo(() => (carId ? allCars.find((c) => c.id === carId) ?? null : null), [carId, allCars]);

  const [detailCache, setDetailCache] = useState<Record<string, DetailData>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  const loadDetail = useCallback((id: string) => {
    if (detailCache[id] || detailLoading[id]) return;
    Promise.resolve()
      .then(() => setDetailLoading((p) => ({ ...p, [id]: true })))
      .then(() => fetch("/api/db-test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: id }),
      }))
      .then((r) => r.json())
      .then((data) => setDetailCache((p) => ({ ...p, [id]: data })))
      .catch((e) => console.error("DB test detail fetch failed:", e))
      .finally(() => setDetailLoading((p) => ({ ...p, [id]: false })));
  }, [detailCache, detailLoading]);

  useEffect(() => {
    if (carId) loadDetail(carId);
  }, [carId, loadDetail]);

  const activeFilterCount =
    selectedBody.length + filters.fuel.length + filters.gearbox.length + filters.drivetrain.length + filters.brand.length +
    (filters.priceMin != null ? 1 : 0) + (filters.priceMax != null ? 1 : 0);

  function updateParams(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleListParam(key: string, value: string) {
    updateParams((params) => {
      const current = new Set(parseList(params.get(key)));
      if (current.has(value)) current.delete(value); else current.add(value);
      if (current.size > 0) params.set(key, [...current].join(",")); else params.delete(key);
    });
  }

  function toggleSingleParam(key: string, value: string) {
    updateParams((params) => {
      if (params.get(key) === value) params.delete(key); else params.set(key, value);
    });
  }

  function setNumberParam(key: string, value: string) {
    updateParams((params) => {
      if (value) params.set(key, value); else params.delete(key);
    });
  }

  function setSort(value: string) {
    updateParams((params) => { params.set("sort", value); });
  }

  function openCar(id: string) {
    updateParams((params) => { params.set("car", id); });
  }

  function closeCar() {
    updateParams((params) => { params.delete("car"); });
  }

  return (
    <main className="w">
      {!openCarData && (
        <Link href="/" className="restart" style={{ display: "block", textDecoration: "none", textAlign: "center" }}>
          {"←"} Back
        </Link>
      )}

      {openCarData ? (
        <CarDetail
          key={openCarData.id}
          car={openCarData}
          detail={detailCache[openCarData.id] ?? null}
          loading={!!detailLoading[openCarData.id]}
          fuelFilter={filters.fuel}
          gearboxFilter={filters.gearbox}
          drivetrainFilter={filters.drivetrain}
          onBack={closeCar}
        />
      ) : (<>
        <div className="results-hdr">
          <h3>DB test</h3>
          <div className="tg">{loaded ? `${sortedList.length} phases` : "Loading…"}</div>
        </div>

        <input
          type="text"
          className="opt-btn"
          style={{ cursor: "text" }}
          placeholder="Search a model — 'Octavia', 'Golf', 'A4'"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {!loaded && <div className="load-msg">{"⟳"} Loading catalog_ data...</div>}

        {loaded && (<>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              className="opt-btn"
              style={{ width: "auto", flex: "1 1 auto", marginBottom: 0, textAlign: "center" }}
              onClick={() => setShowFilters((s) => !s)}
            >
              {showFilters ? "▴" : "▾"} Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
            <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {showFilters && (
            <FilterPanel
              bodyOptions={BODY_OPTIONS} bodyCounts={bodyCounts} bodySelected={selectedBody}
              onToggleBody={(s) => toggleSingleParam("cat", s)}
              fuelOptions={FUEL_OPTIONS} fuelCounts={fuelCounts} fuelSelected={filters.fuel}
              onToggleFuel={(s) => toggleListParam("fuel", s)}
              gearboxOptions={GEARBOX_TYPES} gearboxCounts={gearboxCounts} gearboxSelected={filters.gearbox}
              onToggleGearbox={(s) => toggleSingleParam("gearbox", s)}
              drivetrainOptions={DRIVETRAIN_OPTIONS} drivetrainCounts={drivetrainCounts} drivetrainSelected={filters.drivetrain}
              onToggleDrivetrain={(s) => toggleSingleParam("drivetrain", s)}
              brandOptions={brandOptions} brandCounts={brandCounts} brandSelected={filters.brand}
              onToggleBrand={(s) => toggleListParam("brand", s)}
              priceMin={filters.priceMin} priceMax={filters.priceMax}
              onChangePriceMin={(v) => setNumberParam("priceMin", v)}
              onChangePriceMax={(v) => setNumberParam("priceMax", v)}
            />
          )}

          {sortedList.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#6b6b72" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>{"\u{1F50D}"}</div>
              <p>No phases match these filters. Try loosening them.</p>
            </div>
          )}

          {sortedList.map((car) => (
            <CarRow key={car.id} car={car} onOpen={() => openCar(car.id)} selectedFuel={filters.fuel} />
          ))}
        </>)}
      </>)}
    </main>
  );
}
