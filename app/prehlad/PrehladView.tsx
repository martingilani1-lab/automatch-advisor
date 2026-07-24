"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CarData } from "@/app/lib/carFields";
import CarRow from "./CarRow";

interface CategoryTile { slug: string; emoji: string; label: string; desc: string }

const CATEGORIES: CategoryTile[] = [
  { slug: "city_small", emoji: "\u{1F3D9}️", label: "Small city cars", desc: "Small, nimble, easy to park anywhere." },
  { slug: "hatchback", emoji: "\u{1F697}", label: "Hatchbacks", desc: "The everyday all-rounder shape." },
  { slug: "estate", emoji: "\u{1F9F3}", label: "Estates & wagons", desc: "Built for cargo — long roofs, big boots." },
  { slug: "sedan_liftback", emoji: "\u{1F698}", label: "Sedans & liftbacks", desc: "Classic three-box shape, sedans and liftbacks." },
  { slug: "suv_crossover", emoji: "\u{1F699}", label: "SUVs & crossovers", desc: "Raised ride height, room to spare." },
  { slug: "seven_seats", emoji: "\u{1F68C}", label: "Seven seats", desc: "Room for the whole crew, or more." },
  { slug: "pickup_work", emoji: "\u{1F6FB}", label: "Pickups & work vans", desc: "Beds, vans, and tools-in-the-back haulers." },
  { slug: "coupe_convertible", emoji: "\u{1F3CE}️", label: "Coupes & convertibles", desc: "Two doors, top down, all style." },
  { slug: "electric", emoji: "⚡", label: "Electric", desc: "Battery-powered, zero tailpipe emissions." },
];

const CATEGORY_SLUGS = new Set(CATEGORIES.map((c) => c.slug));

export default function PrehladView() {
  const searchParams = useSearchParams();
  const rawCat = searchParams.get("cat");
  const activeCat = rawCat && CATEGORY_SLUGS.has(rawCat) ? rawCat : null;

  // ONE fetch on mount — /api/cars with no category param returns all 334 cars,
  // each already tagged server-side with `categories: string[]` (every slug
  // whose CATEGORY_PREDICATES entry it satisfies). Tile counts and category
  // selection both just read that tag client-side; there is no per-category
  // fetch and no re-fetch when switching categories.
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
  const activeList = activeCat ? allCars.filter((c) => (c.categories || []).includes(activeCat)) : [];
  // Multi-powertrain models (208, 500, Kona...) in the electric category blend
  // petrol + electric engines into avgConsumption/maxPowerKw — meaningless on a
  // row. Force the electric-specific reading via consumptionByFuel/powerByFuel.
  const fuelContext = activeCat === "electric" ? "electric" : "";

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

      {activeCat && (<>
        <div className="results-hdr">
          <h3>{activeMeta?.emoji} {activeMeta?.label}</h3>
          <div className="tg">{loaded ? `${activeList.length} cars` : "Loading…"}</div>
        </div>

        {!loaded && <div className="load-msg">{"⟳"} Loading cars...</div>}

        {loaded && activeList.map((car) => (
          <CarRow key={car.id} car={car} fuelContext={fuelContext} />
        ))}

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
