"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carRel, carStars, REL_RANK } from "@/app/lib/carFields";
import {
  FUEL_OPTIONS,
  DRIVETRAIN_OPTIONS,
  TRANSMISSION_TYPES,
  matchesFuelGroup,
  matchesTransmissionGroup,
  matchesDrivetrainGroup,
  matchesBrandGroup,
  applyFilters,
  facetCounts,
  type FilterState,
} from "@/app/lib/carFilters";
import CarRow from "./CarRow";
import FilterPanel from "./FilterPanel";
import CarDetail from "./CarDetail";
import type { DetailData } from "./types";

interface CategoryTile { slug: string; emoji: string; label: string; desc: string }

// A body-type PARTITION — every car lands in exactly one tile (see
// resolveCategory/BODY_TILE_MAP in app/api/cars/route.ts). Order here is the
// order tiles render in. No Electric/Seven-seats tiles anymore — fuel is
// still filterable inside any tile via FilterPanel, it's just not a tile.
const CATEGORIES: CategoryTile[] = [
  { slug: "city", emoji: "\u{1F3D9}️", label: "City cars", desc: "Small, nimble, easy to park anywhere." },
  { slug: "hatchback", emoji: "\u{1F697}", label: "Hatchbacks", desc: "The everyday all-rounder shape." },
  { slug: "liftback", emoji: "\u{1F698}", label: "Liftbacks", desc: "Sedan looks, hatchback practicality." },
  { slug: "sedan", emoji: "\u{1F696}", label: "Sedans", desc: "Classic three-box shape." },
  { slug: "combi", emoji: "\u{1F9F3}", label: "Estates / Combi", desc: "Built for cargo — long roofs, big boots." },
  { slug: "suv_crossover", emoji: "\u{1F699}", label: "SUVs / Crossovers", desc: "Raised ride height, room to spare." },
  { slug: "minivan", emoji: "\u{1F690}", label: "Minivans / MPVs", desc: "Room for the whole crew, or more." },
  { slug: "pickup", emoji: "\u{1F6FB}", label: "Pickups", desc: "Beds and tools-in-the-back haulers." },
  { slug: "van", emoji: "\u{1F69A}", label: "Vans", desc: "Cargo space for work or big loads." },
  { slug: "coupe_convertible", emoji: "\u{1F3CE}️", label: "Coupés / Convertibles", desc: "Two doors, top down, all style." },
];

const CATEGORY_SLUGS = new Set(CATEGORIES.map((c) => c.slug));
const SORT_OPTIONS = [
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "reliability", label: "Reliability" },
  { value: "safety", label: "Safety" },
  { value: "year", label: "Year" },
];

function parseList(v: string | null): string[] {
  return v ? v.split(",").filter(Boolean) : [];
}

export default function PrehladView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawCat = searchParams.get("cat");
  const activeCat = rawCat && CATEGORY_SLUGS.has(rawCat) ? rawCat : null;

  const filters: FilterState = useMemo(() => ({
    fuel: parseList(searchParams.get("fuel")),
    transmission: parseList(searchParams.get("transmission")),
    drivetrain: parseList(searchParams.get("drivetrain")),
    brand: parseList(searchParams.get("brand")),
    priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : null,
    priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : null,
  }), [searchParams]);

  const sort = searchParams.get("sort") || "price_asc";
  const [showFilters, setShowFilters] = useState(false);

  // ONE fetch on mount — /api/cars with no category param returns all 334 cars,
  // each already tagged server-side with `categories: string[]` (every slug
  // whose CATEGORY_PREDICATES entry it satisfies). Tile counts, category
  // selection, and every filter/sort below all read off this one array —
  // there is no per-category fetch and no re-fetch on filter/sort changes.
  const [allCars, setAllCars] = useState<CarData[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cars")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAllCars(data);
        setLoaded(true);
      })
      .catch((e) => console.error("Prehľad fetch failed:", e));
    return () => { cancelled = true; };
  }, []);

  const activeMeta = activeCat ? CATEGORIES.find((c) => c.slug === activeCat) : null;

  const categoryList = useMemo(
    () => (activeCat ? allCars.filter((c) => (c.categories || []).includes(activeCat)) : []),
    [allCars, activeCat]
  );

  const brandOptions = useMemo(
    () => [...new Set(categoryList.map((c) => c.make).filter(Boolean))].sort().map((make) => ({ slug: make, label: make })),
    [categoryList]
  );

  // Facet counts: the count for an option in group X is computed against the
  // current filter set with group X's own selections excluded — otherwise
  // checking an option would immediately zero out its own sibling counts.
  const fuelCounts = useMemo(
    () => facetCounts(applyFilters(categoryList, filters, "fuel"), FUEL_OPTIONS, (c, selected) => matchesFuelGroup(c, selected, filters.transmission)),
    [categoryList, filters]
  );
  const transmissionCounts = useMemo(
    () => facetCounts(applyFilters(categoryList, filters, "transmission"), TRANSMISSION_TYPES, (c, selected) => matchesTransmissionGroup(c, selected, filters.fuel)),
    [categoryList, filters]
  );
  const drivetrainCounts = useMemo(
    () => facetCounts(applyFilters(categoryList, filters, "drivetrain"), DRIVETRAIN_OPTIONS, matchesDrivetrainGroup),
    [categoryList, filters]
  );
  const brandCounts = useMemo(
    () => facetCounts(applyFilters(categoryList, filters, "brand"), brandOptions, matchesBrandGroup),
    [categoryList, filters, brandOptions]
  );

  const filteredList = useMemo(() => applyFilters(categoryList, filters), [categoryList, filters]);

  const sortedList = useMemo(() => {
    const list = [...filteredList];
    if (sort === "price_asc") list.sort((a, b) => carPriceMin(a) - carPriceMin(b));
    else if (sort === "price_desc") list.sort((a, b) => carPriceMin(b) - carPriceMin(a));
    else if (sort === "reliability") list.sort((a, b) => (REL_RANK[carRel(b)] ?? 0) - (REL_RANK[carRel(a)] ?? 0));
    else if (sort === "safety") list.sort((a, b) => (carStars(b) ?? 0) - (carStars(a) ?? 0));
    else if (sort === "year") list.sort((a, b) => (b.yearTo ?? 0) - (a.yearTo ?? 0));
    return list;
  }, [filteredList, sort]);

  // Detail view: which car (if any) is open, driven entirely by the `car` URL
  // param so browser back closes it and returns to this same filtered list.
  const carId = searchParams.get("car");
  const openCarData = useMemo(() => (carId ? allCars.find((c) => c.id === carId) ?? null : null), [carId, allCars]);

  // /api/detail is fetched once per vehicle and cached by id — re-opening a
  // car already viewed this session is instant, no re-fetch.
  const [detailCache, setDetailCache] = useState<Record<string, DetailData>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  const loadDetail = useCallback((id: string) => {
    if (detailCache[id] || detailLoading[id]) return;
    Promise.resolve()
      .then(() => setDetailLoading((p) => ({ ...p, [id]: true })))
      .then(() => fetch("/api/detail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: id }),
      }))
      .then((r) => r.json())
      .then((data) => setDetailCache((p) => ({ ...p, [id]: data })))
      .catch((e) => console.error("Prehľad detail fetch failed:", e))
      .finally(() => setDetailLoading((p) => ({ ...p, [id]: false })));
  }, [detailCache, detailLoading]);

  useEffect(() => {
    if (carId) loadDetail(carId);
  }, [carId, loadDetail]);

  const activeFilterCount =
    filters.fuel.length + filters.transmission.length + filters.drivetrain.length + filters.brand.length +
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
      <Link href="/" className="restart" style={{ display: "block", textDecoration: "none", textAlign: "center" }}>
        {"←"} Back
      </Link>

      {!activeCat && (<>
        <div className="results-hdr">
          <h3>Prehľad</h3>
        </div>

        <input
          type="text"
          className="opt-btn"
          style={{ cursor: "text" }}
          placeholder="Search a model, or a shape — 'Octavia', 'estate', 'awd'"
        />

        <div className="cat-grid">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/prehlad?cat=${cat.slug}`}
              className="opt-btn"
              style={{ display: "block", textDecoration: "none" }}
            >
              <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>{cat.emoji}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span>{cat.label}</span>
                <span className="tile-count">
                  {loaded ? `${allCars.filter((c) => (c.categories || []).includes(cat.slug)).length} cars` : "…"}
                </span>
              </div>
              <div className="opt-desc">{cat.desc}</div>
            </Link>
          ))}
        </div>
      </>)}

      {activeCat && openCarData && (
        <CarDetail
          key={openCarData.id}
          car={openCarData}
          detail={detailCache[openCarData.id] ?? null}
          loading={!!detailLoading[openCarData.id]}
          fuelFilter={filters.fuel}
          transmissionFilter={filters.transmission}
          drivetrainFilter={filters.drivetrain}
          onBack={closeCar}
        />
      )}

      {activeCat && !openCarData && (<>
        <div className="results-hdr">
          <h3>{activeMeta?.emoji} {activeMeta?.label}</h3>
          <div className="tg">{loaded ? `${sortedList.length} cars` : "Loading…"}</div>
        </div>

        {!loaded && <div className="load-msg">{"⟳"} Loading cars...</div>}

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
              fuelOptions={FUEL_OPTIONS} fuelCounts={fuelCounts} fuelSelected={filters.fuel}
              onToggleFuel={(s) => toggleListParam("fuel", s)}
              transmissionOptions={TRANSMISSION_TYPES} transmissionCounts={transmissionCounts} transmissionSelected={filters.transmission}
              onToggleTransmission={(s) => toggleListParam("transmission", s)}
              drivetrainOptions={DRIVETRAIN_OPTIONS} drivetrainCounts={drivetrainCounts} drivetrainSelected={filters.drivetrain}
              onToggleDrivetrain={(s) => toggleListParam("drivetrain", s)}
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
              <p>No cars match these filters. Try loosening them.</p>
            </div>
          )}

          {sortedList.map((car) => (
            <CarRow key={car.id} car={car} onOpen={() => openCar(car.id)} />
          ))}
        </>)}

        <Link
          href="/prehlad"
          className="btn-back"
          style={{ display: "block", textDecoration: "none", textAlign: "center", marginTop: 12 }}
        >
          {"←"} Other categories
        </Link>
      </>)}
    </main>
  );
}
