# Fabia III (NJ) and Polo VI (AW) — already live: gap check, not a new import

Both models are already in the catalog (checked live 2026-11-05), so a fresh intake document would
duplicate phases and configurations. This lists what is there and what looks missing or wrong, for
Martin to confirm. Once confirmed, the additions become one additive seed and the corrections one guarded
UPDATE file (human-run).

## What is live

| car | phase | configs | engines | consumption filled | ISOFIX fields | trims | vehicle faults |
|---|---|---|---|---|---|---|---|
| Fabia NJ | Pre-facelift 2014–18 | 23 | CHYA@44, CHYB@55, CHZB@70, CHZC@81, CJZC@66, CJZD@81, CUSA@55, CUSB@66, CUTA@77 | all | empty | 4 | 3 |
| Fabia NJ | Facelift 2018–21 | 9 | CHYA@44, CHYB@55, CHZB@70, CHZC@81 | all | empty | 4 | 3 |
| Polo AW | Pre-facelift 2017–21 | 10 | CHYA@48, CHYB@55, CHZB@70, CHZD@85, CZPC@147, DADA@110, DGTD@59, DGTE@70 | all | empty | 4 | 3 |
| Polo AW | Facelift 2021– | 5 | CHYB@55, CHZB@70, CHZC@81, DNND@152 | all | empty | 4 | 2 |

## Possibly missing configurations — Martin to confirm each

| car / phase | configuration | why it looks missing |
|---|---|---|
| Polo AW Pre-facelift | 1.0 TGI 66 kW (CNG) + MQ200 | The TGI is part of the AW range; it would also be the first live use of `fuel_type = cng` + `secondary_fuel_type = petrol` (a good test of the bi-fuel columns). Engine code (DBYA?) needs confirming. |
| Polo AW Pre-facelift | CHZB@70 + DQ200 | 1.0 TSI 95 PS was offered with DSG. |
| Polo AW Facelift | 1.0 MPI **59 kW** (80 PS) | The live FL rows use `CHYB@55`; the 2021 facelift MPI is listed as 80 PS. `CHYB@59` already exists live (Fabia PJ), so this would be a correction (UPDATE engine_id), not a new engine. |
| Polo AW Facelift | CHZB@70 + DQ200 | 95 PS DSG continued after the facelift. |
| Fabia NJ Pre-facelift | CUTA@77 + DQ200 | 1.4 TDI 105 PS was offered with DSG. |
| Fabia NJ Pre-facelift | CHYA@44 Estate | The Combi base engine was the 55 kW MPI. Live has the 44 kW only as a hatch, which is consistent. Listed only to confirm nothing is missing here. |

## Fields to fill (dimensions)

- **`isofix_count` / `isofix_front_passenger`:** empty on all four phases. Both cars have ISOFIX on the
  rear outer seats (2). Škoda and VW both offered ISOFIX on the **front passenger seat** for these
  generations (Škoda markets it as a "Simply Clever" feature). **Verify per phase** whether it was
  standard or optional before writing `true`.

## Values to re-check

- **Fabia NJ Euro NCAP 2014:** live has child **81 %**. Euro NCAP's published 2014 Fabia result is,
  as far as I know, 81 / **86** / 69 / 69 (adult / child / pedestrian / safety assist). If Martin
  confirms 86, that's a one-value UPDATE on both phases (the facelift inherits the figure).
- **Polo AW Facelift NCAP:** live has year 2022 with 94 / 80 / 70 / 70. Euro NCAP did not re-test the
  facelift as far as I know, so the 2017 result normally carries over. **Verify** where 2022 came from.
