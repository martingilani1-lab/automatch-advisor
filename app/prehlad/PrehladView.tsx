"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CarData } from "@/app/lib/carFields";
import { carPriceMin, carRel, carStars, REL_RANK } from "@/app/lib/carFields";
import {
  BODY_OPTIONS,
  FUEL_OPTIONS,
  DRIVETRAIN_OPTIONS,
  TRANSMISSION_TYPES,
  matchesBodyGroup,
  matchesTagGroup,
  matchesFuelGroup,
  matchesTransmissionGroup,
  matchesDrivetrainGroup,
  matchesBrandGroup,
  applyFilters,
  facetCounts,
  type FilterState,
} from "@/app/lib/carFilters";
import { LIFESTYLE_TAGS } from "@/app/lib/tags";
import CarRow from "./CarRow";
import FilterPanel from "./FilterPanel";
import CarDetail from "./CarDetail";
import TagBar from "./TagBar";
import type { DetailData, SafetyFeature } from "./types";

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

  // Body type is now the first sidebar filter, not a landing gate — reuses
  // the `?cat` param so old tile links (?cat=hatchback) degrade gracefully
  // into "Body Type: Hatchbacks" pre-selected instead of a dead tile screen.
  // SINGLE-select (toggleSingleParam below), same as Drivetrain/Transmission
  // — `parseList` still yields a string[] here (shared with the OR matchers
  // below) but the toggle guarantees it never holds more than one value.
  const selectedBody = useMemo(() => parseList(searchParams.get("cat")), [searchParams]);

  const filters: FilterState = useMemo(() => ({
    // fuel and brand (further below) stay MULTI-select OR — everything else
    // in this object (transmission, drivetrain) is SINGLE-select now, same
    // toggleSingleParam pattern as body type above.
    fuel: parseList(searchParams.get("fuel")),
    transmission: parseList(searchParams.get("transmission")),
    drivetrain: parseList(searchParams.get("drivetrain")),
    brand: parseList(searchParams.get("brand")),
    priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : null,
    priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : null,
  }), [searchParams]);

  const sort = searchParams.get("sort") || "price_asc";
  const [showFilters, setShowFilters] = useState(false);

  // Simple client-side make+model search — the primary "I know my model"
  // entry point above the tag bar. Not URL state (unlike the filters below):
  // a lightweight placeholder ahead of real search, not asked to persist yet.
  const [searchQuery, setSearchQuery] = useState("");

  // Lifestyle tags — HARD filter, AND semantics (matchesTagGroup): a car must
  // carry every selected tag, not just one. Kept OUT of `filters`/FilterState
  // above for the same reason body type is — applied as its own pre-filter
  // step below, so applyFilters' fuel/transmission/drivetrain/brand/budget
  // logic stays untouched. Lives in the URL the same way every other filter
  // does, so back/share/deep-link work.
  const selectedTags = useMemo(() => parseList(searchParams.get("tags")), [searchParams]);

  // ONE fetch on mount — /api/cars with no params returns all 334 cars, each
  // already tagged server-side with `categories: string[]` (the body-type
  // partition) and `tags: string[]` (lifestyle tags). Every filter, the
  // search box, tag ranking, and sort below all read off this one array —
  // there is no per-filter re-fetch, including body type now that it's a
  // sidebar filter instead of a per-category landing fetch.
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

  // Safety-feature reference vocabulary — same 17 rows for every car, so this
  // is fetched once here (like allCars above), not per-vehicle inside
  // CarDetail. Empty until the safety_features migration has actually been
  // run — CarDetail's Safety tab handles that gracefully (see its own
  // comments), it doesn't assume this is populated.
  const [safetyFeatures, setSafetyFeatures] = useState<SafetyFeature[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/safety-features")
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setSafetyFeatures(data); })
      .catch((e) => console.error("Safety-features fetch failed:", e));
    return () => { cancelled = true; };
  }, []);

  // Body type and tags are both applied as their own pre-filter steps over
  // the full set, kept separate from applyFilters/FilterState (same reason
  // as before: applyFilters' fuel/transmission/drivetrain/brand/budget logic
  // stays untouched). Six independent hard-filter dimensions total now, all
  // AND-ed together: body, tags, fuel, transmission, drivetrain, brand
  // (+budget). Intersection order doesn't affect the result, only which
  // intermediate a given facet count's "exclude my own group" base reads.
  const bodyFilteredList = useMemo(
    () => (selectedBody.length ? allCars.filter((c) => matchesBodyGroup(c, selectedBody)) : allCars),
    [allCars, selectedBody]
  );
  // body ∩ tags — the base every one of fuel/transmission/drivetrain/brand's
  // own facet counts is computed from (via applyFilters' `exclude` below),
  // and also the direct input to the final applyFilters call further down.
  const tagFilteredList = useMemo(
    () => (selectedTags.length ? bodyFilteredList.filter((c) => matchesTagGroup(c, selectedTags)) : bodyFilteredList),
    [bodyFilteredList, selectedTags]
  );

  const brandOptions = useMemo(
    () => [...new Set(tagFilteredList.map((c) => c.make).filter(Boolean))].sort().map((make) => ({ slug: make, label: make })),
    [tagFilteredList]
  );

  // Facet counts: the count for an option in group X is computed against the
  // current filter set with group X's own selections excluded — otherwise
  // checking an option would immediately zero out its own sibling counts.
  // This is now fully bidirectional across all six dimensions: a tag can gray
  // out a body/fuel/transmission/drivetrain/brand option and vice versa,
  // because every base below folds in every OTHER group before counting.
  const bodyCounts = useMemo(
    () => facetCounts(applyFilters(allCars.filter((c) => matchesTagGroup(c, selectedTags)), filters), BODY_OPTIONS, matchesBodyGroup),
    [allCars, selectedTags, filters]
  );
  // Tags are AND within their own group (unlike every other group's OR), so
  // this needs facetCounts' `currentSelected` — an unselected tag's count
  // must reflect "on top of the tags I've already picked," not tested alone.
  const tagCounts = useMemo(
    () => facetCounts(applyFilters(bodyFilteredList, filters), LIFESTYLE_TAGS, matchesTagGroup, selectedTags),
    [bodyFilteredList, filters, selectedTags]
  );
  const fuelCounts = useMemo(
    () => facetCounts(applyFilters(tagFilteredList, filters, "fuel"), FUEL_OPTIONS, (c, selected) => matchesFuelGroup(c, selected, filters.transmission)),
    [tagFilteredList, filters]
  );
  const transmissionCounts = useMemo(
    () => facetCounts(applyFilters(tagFilteredList, filters, "transmission"), TRANSMISSION_TYPES, (c, selected) => matchesTransmissionGroup(c, selected, filters.fuel)),
    [tagFilteredList, filters]
  );
  const drivetrainCounts = useMemo(
    () => facetCounts(applyFilters(tagFilteredList, filters, "drivetrain"), DRIVETRAIN_OPTIONS, matchesDrivetrainGroup),
    [tagFilteredList, filters]
  );
  const brandCounts = useMemo(
    () => facetCounts(applyFilters(tagFilteredList, filters, "brand"), brandOptions, matchesBrandGroup),
    [tagFilteredList, filters, brandOptions]
  );

  // The actual hard-filtered set: body ∩ tags ∩ fuel ∩ transmission ∩
  // drivetrain ∩ brand ∩ budget. Ordering below (sort dropdown) is now the
  // ONLY thing that orders this — no soft-rank layer on top anymore.
  const filteredList = useMemo(() => applyFilters(tagFilteredList, filters), [tagFilteredList, filters]);

  const searchedList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredList;
    return filteredList.filter((c) => `${c.make} ${c.model}`.toLowerCase().includes(q));
  }, [filteredList, searchQuery]);

  const sortedList = useMemo(() => {
    const list = [...searchedList];
    if (sort === "price_asc") list.sort((a, b) => carPriceMin(a) - carPriceMin(b));
    else if (sort === "price_desc") list.sort((a, b) => carPriceMin(b) - carPriceMin(a));
    else if (sort === "reliability") list.sort((a, b) => (REL_RANK[carRel(b)] ?? 0) - (REL_RANK[carRel(a)] ?? 0));
    else if (sort === "safety") list.sort((a, b) => (carStars(b) ?? 0) - (carStars(a) ?? 0));
    else if (sort === "year") list.sort((a, b) => (b.yearTo ?? 0) - (a.yearTo ?? 0));
    return list;
  }, [searchedList, sort]);

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
    selectedBody.length + filters.fuel.length + filters.transmission.length + filters.drivetrain.length + filters.brand.length +
    (filters.priceMin != null ? 1 : 0) + (filters.priceMax != null ? 1 : 0);

  function updateParams(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`${pathname}?${params.toString()}`);
  }

  // Multi-select OR (Brand, Fuel, Tags — tags additionally ANDs at the
  // matcher level, matchesTagGroup, but still accumulates the same way here).
  function toggleListParam(key: string, value: string) {
    updateParams((params) => {
      const current = new Set(parseList(params.get(key)));
      if (current.has(value)) current.delete(value); else current.add(value);
      if (current.size > 0) params.set(key, [...current].join(",")); else params.delete(key);
    });
  }

  // Single-select (Body Type, Drivetrain, Transmission) — one shared handler
  // so all three behave identically, no drift. A new value REPLACES the
  // current one; clicking the active value again clears the param entirely
  // (back to "all" for that group). Always a bare single value in the URL,
  // never a comma-list. Downstream (matchesBodyGroup/matchesDrivetrainGroup/
  // matchesTransmissionGroup, applyFilters, facetCounts) is untouched — those
  // still read a string[] via parseList and OR across it; that array just
  // never holds more than one element for these three groups now.
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
      {/* Only on the catalog view — CarDetail's own "Back to results" is the
          sole exit from the detail view (clears ?car=, preserves every other
          filter param). Browser back is untouched, still works natively. */}
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
          transmissionFilter={filters.transmission}
          drivetrainFilter={filters.drivetrain}
          safetyFeatures={safetyFeatures}
          onBack={closeCar}
        />
      ) : (<>
        <div className="results-hdr">
          <h3>Browse & Compare</h3>
          <div className="tg">{loaded ? `${sortedList.length} cars` : "Loading…"}</div>
        </div>

        <input
          type="text"
          className="opt-btn"
          style={{ cursor: "text" }}
          placeholder="Search a model — 'Octavia', 'Golf', 'Tucson'"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

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
              bodyOptions={BODY_OPTIONS} bodyCounts={bodyCounts} bodySelected={selectedBody}
              onToggleBody={(s) => toggleSingleParam("cat", s)}
              fuelOptions={FUEL_OPTIONS} fuelCounts={fuelCounts} fuelSelected={filters.fuel}
              onToggleFuel={(s) => toggleListParam("fuel", s)}
              transmissionOptions={TRANSMISSION_TYPES} transmissionCounts={transmissionCounts} transmissionSelected={filters.transmission}
              onToggleTransmission={(s) => toggleSingleParam("transmission", s)}
              drivetrainOptions={DRIVETRAIN_OPTIONS} drivetrainCounts={drivetrainCounts} drivetrainSelected={filters.drivetrain}
              onToggleDrivetrain={(s) => toggleSingleParam("drivetrain", s)}
              brandOptions={brandOptions} brandCounts={brandCounts} brandSelected={filters.brand}
              onToggleBrand={(s) => toggleListParam("brand", s)}
              priceMin={filters.priceMin} priceMax={filters.priceMax}
              onChangePriceMin={(v) => setNumberParam("priceMin", v)}
              onChangePriceMax={(v) => setNumberParam("priceMax", v)}
            />
          )}

          <TagBar selected={selectedTags} counts={tagCounts} onToggle={(s) => toggleListParam("tags", s)} />

          {sortedList.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#6b6b72" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>{"\u{1F50D}"}</div>
              <p>No cars match these filters. Try loosening them.</p>
            </div>
          )}

          {sortedList.map((car) => (
            <CarRow key={car.id} car={car} onOpen={() => openCar(car.id)} selectedTags={selectedTags} selectedFuel={filters.fuel} />
          ))}
        </>)}
      </>)}
    </main>
  );
}
