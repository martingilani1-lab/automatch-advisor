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

---

## Open questions

- Explicit non-goals beyond "not the seller" (to add on the go).
- Business model / pricing per phase.
- Dealer onboarding is folded into Phase 2 here — confirm that's the right milestone.
