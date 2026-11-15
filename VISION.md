# VISION.md — AutoMatch

> Where this project is going: its north star, roadmap, and boundaries.
> A living direction document — revisit it as the plan evolves.
> For *how to build* see `CLAUDE.md`. For *current state* see `DIAGNOSTIC.md`.

---

## North Star

**One platform for the whole journey of buying — and owning — a car.**
Launch in CZ/SK, then expand outward. A user arrives not knowing what to buy and
leaves with the right car: chosen, verified, financed, delivered, and maintained —
without having to go anywhere else.

---

## The core idea

Today a car buyer stitches the process together across a dozen disconnected places:
one site to browse, another to check history, a bank for financing, a friend to look
the car over, a workshop later. AutoMatch collapses that into **one guided path**:

> don't know what to buy → know the model → find real listings → verify them →
> inspect in person → finance, insure & deliver → maintain over time

The **Advisor** (the current quiz + scoring) is the **front door** — the lure that pulls
people in. Everything after it is where the platform earns its place and its revenue.

---

## Positioning — why AutoMatch, not the alternatives

- **Listing sites** (bazoš, mobile.de, theparking) *show* you cars. They don't help you
  decide *which* car fits *your* life, and they stop at the listing.
- **AutoMatch starts one step earlier** — the decision — **and continues long after the
  purchase**: inspection, money, delivery, aftercare.
- The moat is the **connected journey + a real human network on the ground**, not just data.

---

## Roadmap

| Phase | Name | What it delivers | Status |
|---|---|---|---|
| 1 | **Advisor** | Lifestyle quiz + scoring + comparison — decide the *right model* | **Building now** |
| 2 | **Listings & verification** | Aggregate market listings (theparking-style) **+ onboarded dealers presenting their own stock** (autobazar.com-style) + history checks (Cebia, CarVertical) | Next |
| 3 | **Inspection network** | Vetted local inspectors with fixed checklists — book a pro to view a specific car | Later |
| 4 | **Money & logistics** | Financing calculator, insurance, importer/delivery network | Later |
| 5 | **Service ecosystem** | Map + directory of workshops, STK, paint shops & specialists — rated, bookable | Last |
| 6 | **Owner profile** | Personal car profile with a service-history log | Maybe / final |

### Phase 1 — Advisor *(now)*
The decision engine. A quiz turns "what should I even buy?" into a ranked shortlist of
models suited to the user's real use case, backed by the scoring algorithm and the
gathered vehicle data. This is the entry point the rest of the platform hangs off.

### Phase 2 — Listings & verification
Once the user knows *what* to buy, connect them to *which one*, two ways:
- **Aggregated market** — pull real listings from across the market (theparking-style) so
  users can view and compare actual cars for sale, with verification tools one click away
  (direct links to Cebia, CarVertical and vehicle-history checks).
- **Onboarded dealers** — dealers get their own login and present their stock directly on
  the platform (autobazar.com-style). Each dealer *and* each car carries a rating, so users
  compare not just cars but sellers.

### Phase 3 — Inspection network
A network of vetted inspectors spread across the country — think **Bolt couriers, but for
car inspections**: each gets exact instructions and a checklist to fill in. Geographic
matching means a buyer in Košice doesn't drive to Bratislava — a local expert checks the
car for a small fee. Inspectors log in through a **separate role/access** on the platform.

### Phase 4 — Money & logistics
The "everything in one place" layer: financing calculation, insurance, and other
purchase-related tools, plus a network of importers who can source and deliver a car to
the buyer's door.

### Phase 5 — Service ecosystem
A map + directory of every workshop, STK station, paint shop and specialist a car owner
might need. Each has ratings from visitors, a description of services, and a booking
window — so ownership, not just purchase, lives on the platform.

### Phase 6 — Owner profile
A personal profile per car where the owner records and keeps its service history over time.

---

## Catalog coverage plan *(the data side of Phase 1)*

The Advisor is only as good as the catalog behind it. This section says which cars the
catalog has to cover, in what order, and what has priority. Snapshot: 2026-11-11. Live
counts and pipeline mechanics stay in `docs/STATUS.md`; import rules stay in `CLAUDE.md`.

### Goal

Cover the used cars that are actually bought and sold in SK/CZ, across every kind of buyer.

- **Target:** 172 models in 15 categories (list below).
- **Today:** 23 of the 172 are in the catalog.
- **What counts as covered:** only a model described in the `catalog_*` tables. A row in
  the legacy `vehicles` table alone does not count.

### Order of work

**Step 1 — tune one category at a time *(in progress)*.** For each category, use a few
pilot models to settle which information the product shows for that kind of car and
therefore what has to be researched. The output is that category's addition to the intake
document.

- **Now:** city cars and EVs. Pilots are BMW i3 and Renault Zoe — both in the catalog, not
  yet at the intended depth.
- **Proposed order after that** *(Martin may reorder)*: family → SUV → motorway cruisers →
  hybrids → vans and pickups → off-road → large MPVs. Later: LPG/CNG, sports, coupés and
  convertibles, luxury, classics.

**Step 2 — freeze the intake document.** Revise the intake so it covers every gap found so
far, and give each field an importance level:

- **required** — the seed does not go into the DB without it
- **conditional** — required only for a certain kind of car (battery data on an EV,
  approach/departure angles on an off-roader)
- **optional**

A required field is a reason to research further, never a reason to invent a value
(`CLAUDE.md`, rule 7).

**Step 3 — mass import by platform.** Only once it is clear which information each kind of
car needs. Platform-mates share engines and gearboxes, so each batch goes in layers:
shared engines / transmission units / drivetrain systems → models and phases →
configurations → dimensions, faults, trims, tags. Start each model with the one or two
generations that are actually traded; older ones follow later.

Proposed batch order:

| # | Group | Models from the target list |
|---|---|---|
| 1 | VW Group — remainder | Citigo, Up!, Rapid, Yeti, Sharan, Alhambra, Touareg, Q5, Q7, A5, A6, A7, A8, Transporter, Caravelle, Crafter, Amarok, ID.3, ID.4, Enyaq, Born, e-tron, Scirocco, Eos |
| 2 | Hyundai–Kia | Ceed, i30, Tucson, Sportage, Kona, Niro, i20, i10, Rio, Picanto, Santa Fe, Sorento, Ioniq, Ioniq 5, H-1 |
| 3 | Renault–Dacia | Clio, Sandero, Duster, Logan, Jogger, Lodgy, Kangoo, Trafic, Master, Espace |
| 4 | Ford | Focus, Kuga, Fiesta, Mondeo, S-Max, Galaxy, Transit, Transit Custom, Transit Connect, Tourneo Custom, Ranger, Mustang |
| 5 | BMW | 3, 5, 7, X1, X3, X5, X6, 2, 4, Z4, Mini Cooper |
| 6 | Stellantis | Berlingo, Partner, Traveller, Boxer, Jumper, Ducato, Doblo, Astra, Insignia, Vivaro, Zafira, C4 Grand Picasso, Panda |
| 7 | Everything else | Toyota, Mercedes, Volvo, Mazda, Nissan, Mitsubishi, Suzuki, Honda, Tesla and others |

### Not a priority right now

- **Back-filling.** Gaps in already-seeded models are not being fixed now. The intake gets
  fixed first, so new models arrive complete.
- **The legacy `vehicles` table.** It is not being extended.

### Known gaps *(input for Step 2)*

From a live audit on 2026-11-11 (37 models, 91 phases, 1,661 configurations, 150 engines,
77 transmission units, 25 drivetrain systems).

Never filled:

| Table | Fields |
|---|---|
| `catalog_vehicle_configurations` | `towing_braked_kg`, `towing_unbraked_kg`, urban / extra-urban consumption, `co2_emissions_g_km`; no `catalog_tire_sizes` rows |
| `catalog_vehicle_configurations` | `acceleration_0_100`, `top_speed_kmh`, `curb_weight_kg` (empty on almost every row) |
| `phase_body_dimensions` | `isofix_count`, `isofix_front_passenger`, `boot_sill_height_mm`, `nose_weight_kg`, `roof_load_kg` |
| `phase_body_dimensions` | `boot_capacity_7_seats_liters`, `seats_optional_max`, approach / departure / breakover angles, `wading_depth_mm` |
| `catalog_engines` | `injection_type` |

Only partly filled:

| Table | Fields | Missing |
|---|---|---|
| `transmission_units` | `reliability_rating`, `pros`/`cons`, `maker`, `speeds`, service interval and cost, faults | about 58 of 77 |
| `drivetrain_systems` | service interval and cost | 18–23 of 25 |
| `catalog_phase_tags` | phases with no tag | 41 of 91 |
| `catalog_configuration_tags` | configurations with no tag | 691 of 1,661 |
| `catalog_vehicle_configurations` | `consumption_cycle` | 500 of 1,661 |
| `catalog_engines` | `reliability_rating`, yearly maintenance cost | 7 of 150 |

Martin's own observation: newly added models tend to arrive without average purchase
price, typical mileage and reliability tags.

### Target model list

✓ = in the catalog as of 2026-11-11.

- **City (12), 2 done:** Škoda Fabia ✓, VW Polo ✓, Škoda Citigo, VW Up!, Hyundai i20, Hyundai i10, Kia Rio, Kia Picanto, Toyota Yaris, Ford Fiesta, Renault Clio, Dacia Sandero
- **EVs (12), 2 done:** BMW i3 ✓, Renault Zoe ✓, Tesla Model 3, Tesla Model Y, VW ID.3, VW ID.4, Škoda Enyaq, Audi e-tron, Nissan Leaf, Cupra Born, Hyundai Kona, Hyundai Ioniq 5
- **Family (13), 5 done:** Škoda Octavia ✓, Škoda Scala ✓, VW Golf ✓, VW Touran ✓, SEAT León ✓, Škoda Rapid, VW Sharan, Kia Ceed, Hyundai i30, Ford Focus, Ford S-Max, SEAT Alhambra, Opel Astra
- **SUV (23), 5 done:** Škoda Kodiaq ✓, Škoda Karoq ✓, Škoda Kamiq ✓, VW Tiguan ✓, VW T-Roc ✓, Škoda Yeti, VW Touareg, Hyundai Tucson, Hyundai Santa Fe, Kia Sportage, Kia Sorento, Dacia Duster, Nissan Qashqai, Toyota RAV4, Ford Kuga, Mazda CX-5, BMW X1, BMW X3, BMW X5, Audi Q5, Audi Q7, Mercedes GLE, Volvo XC90
- **Motorway cruisers (14), 4 done:** Škoda Superb ✓, VW Passat ✓, VW Arteon ✓, Audi A4 ✓, BMW 3, BMW 5, Audi A6, Mercedes C, Mercedes E, Ford Mondeo, Opel Insignia, Mazda 6, Volvo V60, Volvo V90
- **Hybrids and plug-in hybrids (10), 0 done:** Toyota Corolla, Toyota C-HR, Toyota Auris, Toyota Prius, Kia Niro, Hyundai Ioniq, Lexus NX, Lexus RX, Mitsubishi Outlander, Honda CR-V
- **Vans (19), 1 done:** VW Caddy ✓, Citroën Berlingo, Peugeot Partner, Renault Kangoo, Ford Transit Connect, Fiat Doblo, VW Transporter, Renault Trafic, Opel Vivaro, Ford Transit Custom, Mercedes Vito, Fiat Ducato, Peugeot Boxer, Citroën Jumper, Mercedes Sprinter, VW Crafter, Renault Master, Ford Transit, Iveco Daily
- **Pickups (6), 0 done:** Ford Ranger, Toyota Hilux, Mitsubishi L200, Nissan Navara, VW Amarok, Isuzu D-Max
- **Off-road (10), 0 done:** Suzuki Jimny, Suzuki Grand Vitara, Toyota Land Cruiser, Mitsubishi Pajero, Nissan Patrol, Land Rover Defender, Land Rover Discovery, Jeep Wrangler, Jeep Grand Cherokee, Lada Niva
- **Large MPVs and minibuses (10), 1 done:** VW Multivan ✓, VW Caravelle, Mercedes V, Ford Tourneo Custom, Toyota Proace Verso, Peugeot Traveller, Hyundai H-1, Ford Galaxy, Renault Espace, Citroën C4 Grand Picasso
- **LPG/CNG (5), 0 done:** Dacia Logan, Dacia Jogger, Dacia Lodgy, Opel Zafira, Fiat Panda
- **Sports and premium compacts (11), 3 done:** Cupra Formentor ✓, Audi A3 ✓, Audi TT ✓, Honda Civic, Mercedes A, BMW 2, VW Scirocco, Mini Cooper, Subaru WRX, Ford Mustang, Porsche 911
- **Coupés and convertibles (9), 0 done:** BMW 4, Audi A5, Audi A7, Mercedes CLA, Mercedes CLS, Mercedes SLK, BMW Z4, Mazda MX-5, VW Eos
- **Luxury (10), 0 done:** Mercedes S, BMW 7, Audi A8, Porsche Panamera, Porsche Cayenne, Range Rover, Range Rover Sport, BMW X6, Mercedes G, Tesla Model S
- **Classics and youngtimers (8), 0 done:** Škoda 100/110, Škoda 105/120, Škoda Favorit, Škoda Felicia, Lada 2101–2107, Trabant 601, Wartburg 353, Tatra 613

Not counted as separate models — handled as an engine variant or generation of a model
already on the list: Octavia RS, Golf GTI/R, León Cupra, Focus ST, i30 N; Superb iV,
Passat GTE, RAV4 Hybrid, Yaris Hybrid; Octavia G-Tec, Sandero LPG, Duster LPG; BMW E30/E36
(3 Series), Mercedes W123/W124 (E-Class).

In the catalog but outside the target list: Audi A1, Audi Q2, Audi Q3, Cupra León, Cupra
Terramar, SEAT Arona, SEAT Ateca, SEAT Ibiza, SEAT Tarraco, SEAT Toledo, VW Bora, VW New
Beetle, VW T-Cross, VW Taigo.

---

## Cross-cutting principles

- **Geography:** launch CZ/SK first, then expand — build every phase so a new country can
  be added, not hard-wired to one market.
- **Multi-role platform:** four kinds of account, not one — regular **users**, field
  **inspectors** (separate login/access), **dealers** (login to present their own stock),
  and **specialists/workshops** (profile + booking). Design with these roles in mind from
  early on.
- **The Advisor is the funnel:** every later phase should give a reason to come back, so the
  free decision tool converts into ongoing use.

---

## Where value is created *(inferred — confirm)*

Revenue touchpoints implied by the plan, to validate as the business model firms up:
dealer listing/subscription fees (Phase 2), inspection fees (Phase 3), likely commissions
on financing/insurance/import (Phase 4), and possibly paid placement or booking fees for
specialists (Phase 5).

---

## Guiding discipline — sequencing & gating

The order of phases is not just a preference — it is a rule that keeps the project coherent:

- **Phases don't overlap.** Finish and stabilise one before opening the next; running them
  in parallel breeds confusion.
- **Traction gates progress.** A phase may be *built*, but the project does not advance to
  the next milestone until the current phase has **real users**.
- **Partners come after traction.** The big bazaars, Cebia, and permission for direct links
  to specific vehicles will only come once there is a proven user base — so those
  integrations are gated behind demonstrated demand, not chased early.

## Non-goals *(to add on the go)*

Explicit "AutoMatch will deliberately never do X" rules aren't all defined yet — to be
filled in as they surface. One boundary is already clear: **AutoMatch does not sell cars
itself** — it hosts dealers' offers and links to the market, but is a platform, never the
seller.

Also decided (2026-11-11): **cars only for now.** Trucks, agricultural machinery and
construction equipment were considered as a target group and set aside.

---

## Open questions

- Explicit non-goals beyond "not the seller" (to add on the go).
- Business model / pricing per phase.
- Dealer onboarding is folded into Phase 2 here — confirm that's the right milestone.
- Catalog coverage: the category order and the platform batch order are proposals — confirm or reorder.
