# Research — BMW i3 (I01), Facelift — VERIFICATION against the live catalog (2026-11-10)

> **Mode:** verification. Every value stored live for the Facelift phase was looked up again. Each row
> below is either **confirmed** (quote agrees), **corrected** (quote disagrees: the source value is
> given, and the live value is in section R), or **flagged** (no usable source found this run, so the
> live value is neither confirmed nor changed). Nothing in this document has been written to the DB.
> Converting the corrections into a migration is a separate step, after Martin's review.
>
> **Martin's decisions (2026-11-10):** 94 Ah Facelift range → 300 km; i3 120 Ah range stays
> 285 km; trims and market data corrected as below; the `i3s` trim is dropped and its kit becomes
> the Sportpaket option. Files: `20261110230000` (i3s trim → Sportpaket) and `20261110233000`
> (range, trims, market). Both are human-run.
>
> **Update 2026-11-15:** neither file was ever run, and by now 233000 would roll back (the range
> had been set to 290 by `20261112120500`; the market max to 27 000). Both are marked SUPERSEDED
> and replaced by **`20261115180000_bmw_i3_facelift_trims_range_market.sql`**, written against the
> live state. Martin re-confirmed 300 km and set the market data to min 15 000 / avg 20 545 /
> max 27 000 / 43,260 - 115,000 km (the 11-10 minimum of 17 900 left the 2018 94 Ah cars,
> 15 000 - 18 400 on 2026-11-15, below the range). Human-run.
>
> **How the evidence was read:** ADAC pages were read through a page-to-text fetch, so quotes are the
> fetch tool's verbatim extraction. The BMW technical-data PDF and the BMW Austria price list were
> extracted locally with `pdftotext`, so those quotes are the documents' own text. The BMW PDF's table
> layout shifts labels against values in the extracted text; values were matched by position and
> cross-checked against ADAC (see R).

## A. CAR
| field | value | evidence |
|---|---|---|
| brand | BMW | E5 |
| model | i3 | E5 |
| segment | NULL | — (live `B`: no source names a segment; judgement value, see R) |
| origin_country | NULL | — (live `german`: not looked up this run) |

## B. PHASE
| field | value | evidence |
|---|---|---|
| generation_code | I01 | E1 |
| phase_label | Facelift | E8 |
| year_from | 2017 | E1, E8 |
| year_to | 2022 | E1, E8 |
| platform_code | NULL | — (live `BMW LifeDrive`: no source opened this run names it; BMW calls the structure "CFK Passagierzelle, Aluminium Chassis", E5) |
| chassis_type | monocoque | E5 (CFRP passenger cell on an aluminium chassis. Closest allowed value; judgement, see R) |
| consumption_cycle | WLTP | E1, E2 (120 Ah rows); the 94 Ah rows are NEDC (E3, E4) |
| safety_rating | 4 | E8, E9 |
| ncap_year | 2013 | E8, E9 |
| ncap_adult_pct | 86 | E9 |
| ncap_child_pct | 81 | E9 |
| ncap_pedestrian_pct | 57 | E9 |
| ncap_safety_assist_pct | 55 | E9 |
| towing_capacity_kg | NULL | E1–E4 list no towing figure (live NULL, consistent) |

## B2. MARKET DATA (SK / CZ)
| field | value | evidence |
|---|---|---|
| price_range_min_eur | 17900 | E11 |
| avg_market_price_eur | 20545 | E11, E12 (median of 14) |
| price_range_max_eur | 26900 | E12 |
| typical_mileage_min_km | 43260 | E12 |
| typical_mileage_max_km | 115000 | E11 |
| resale_value_rating | NULL | — (live `depreciates_fast`: no age-adjusted segment comparison done this run) |
| market_sample | 2026-11-10, 18 facelift listings (model year 2018–2022, battery-only cars) → 14 after cutting the 2 cheapest and 2 dearest, autobazar.eu only | E11, E12 |

## C. BODIES
| body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | boot_sill_height_mm | seats_count | seats_optional_max | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters | isofix_count | isofix_front_passenger | roof_load_kg | nose_weight_kg | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hatchback 5-door | 4011 | 1775 | 1598 | 139 | 1320 | 260 | 1100 | NULL | 4 | NULL | NULL | NULL | N/A | 2 | NULL | NULL | NULL | E3, E5, E7 |

*(Base i3 figures; height is with the roof fin (E5 "Höhe (mit Dachfinne) … 1598"). The i3s is 4006 / 1791 / 1590 mm, ground clearance 131 mm (E2, E4, E6). Curb weight = lightest facelift version, i3 94 Ah 1320 kg EU (E3). Gross weight / payload: ADAC gives 1670 / 350 (94 Ah) and 1710 / 365 (120 Ah); BMW gives 1710 / 440 (120 Ah); conflict, see R. Boot sill 780 and front ISOFIX `false` are live values that weren't re-opened this run, see R.)*

## D. ENGINES — specification
| code | power_kw | fuel_type | hybrid_type | display_name | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | injection_type | engine_oil_capacity_liters | has_dpf | has_gpf | has_adblue | battery_capacity_net_kwh | max_ac_charging_kw | max_dc_charging_kw | battery_thermal_management | heat_pump | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| i3-94Ah | 125 | electric | NULL | i3 94 Ah, 125kW | N/A | 250 | N/A | N/A | N/A | N/A | N/A | false | false | false | 27.2 | 11 | 50 | NULL | optional | E3, E7 |
| i3s-94Ah | 135 | electric | NULL | i3s 94 Ah, 135kW | N/A | 270 | N/A | N/A | N/A | N/A | N/A | false | false | false | 27.2 | 11 | 50 | NULL | optional | E4, E7 |
| i3-120Ah | 125 | electric | NULL | i3 120 Ah, 125kW | N/A | 250 | N/A | N/A | N/A | N/A | N/A | false | false | false | 37.9 | 11 | 50 | NULL | optional | E1, E5, E7 |
| i3s-120Ah | 135 | electric | NULL | i3s 120 Ah, 135kW | N/A | 270 | N/A | N/A | N/A | N/A | N/A | false | false | false | 37.9 | 11 | 50 | NULL | optional | E2, E6, E7 |

*(battery_thermal_management: live `active_refrigerant`; no source this run states the cooling medium. E7 only says "Aluminiumkühler und Aufnahmen für Heizelemente". Flagged, see R. Codes are the catalog's battery-variant codes; no source names a motor code.)*

## D2. ENGINES — service, reliability, pros / cons
| engine (code@kW) | reliability_rating | rating_reason | oil_change_interval_km | oil_change_interval_months | oil_spec | oil_service_cost_eur_min | oil_service_cost_eur_max | air_filter_interval_km | fuel_filter_interval_km | spark_plug_interval_km | spark_plug_cost_eur_min | spark_plug_cost_eur_max | timing_replacement_km | timing_replacement_years | timing_service_cost_eur_min | timing_service_cost_eur_max | yearly_maintenance_eur_min | yearly_maintenance_eur_max | maintenance_note | pros | cons | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| i3-94Ah@125 | NULL | Not rated this run | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | NULL | NULL | NULL | NULL | NULL | — |
| i3s-94Ah@135 | NULL | Not rated this run | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | NULL | NULL | NULL | NULL | NULL | — |
| i3-120Ah@125 | NULL | Not rated this run | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | NULL | NULL | NULL | NULL | NULL | — |
| i3s-120Ah@135 | NULL | Not rated this run | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | NULL | NULL | NULL | NULL | NULL | — |

*(ADAC Pannenstatistik 2024 rates registration years 2019 / 2020 / 2021 at 0.4 / 1.1 / 0.4 breakdowns per 1 000 cars, "hohe Zuverlässigkeit" (E8). That's a model-level figure, not per engine row, so no rating is derived from it here. The live pros / cons were not re-verified line by line; see R for the one that depends on the 120 Ah range.)*

## E. GEARBOXES
| gearbox_code | maker | type | speeds | used_with (engine code@kW) | reliability_rating | rating_reason | service_interval_km | service_interval_years | service_cost_eur_min | service_cost_eur_max | maintenance_note | pros | cons | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NULL | NULL | single_speed | 1 | i3-94Ah@125, i3s-94Ah@135, i3-120Ah@125, i3s-120Ah@135 | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | E5, E6 |

*(E5 / E6: "Automatikgetriebe, einstufig mit fester Übersetzung 9,665:1". Consistent with live `generic:Single-speed EV`.)*

## F. DRIVETRAIN
| drivetrain | system_name | maker | reliability_rating | rating_reason | service_interval_km | maintenance_note | evidence |
|---|---|---|---|---|---|---|---|
| RWD | N/A | N/A | N/A | N/A | N/A | N/A | E5, E6 |

## G. CONFIGURATIONS
| engine (code@kW) | gearbox | drivetrain | bodies | years_available | evidence |
|---|---|---|---|---|---|
| i3-94Ah@125 | single-speed | RWD | Hatchback 5-door | 11/2017 – 09/2018 | E3 |
| i3s-94Ah@135 | single-speed | RWD | Hatchback 5-door | 11/2017 – 09/2018 | E4 |
| i3-120Ah@125 | single-speed | RWD | Hatchback 5-door | 11/2018 – 03/2022 | E1 |
| i3s-120Ah@135 | single-speed | RWD | Hatchback 5-door | 11/2018 – 03/2022 | E2 |

*(Same four configurations as live. The facelift 94 Ah REx (E8) stays out of scope, as in the intake doc.)*

## H. TRIMS
| trim | tier (1 = base) | evidence |
|---|---|---|
| Atelier | 1 | E7 |
| Loft | 2 | E7 |
| Lodge | 3 | E7 |
| Suite | 4 | E7 |

*(Interior design lines, priced on top of the car: Atelier no surcharge, Loft €1,260, Lodge €1,670, Suite €2,515 (E7, Austria 11/2018). **`i3s` is not a trim**: it's a separate model (own price line, model code 8P61, E7), and its sporty kit is the Sportpaket, "Im Modell BMW i3s enthalten" (E7). See R.)*

## H2. TRIM FEATURES
| trim | feature | availability | feature_group | safety_feature_slug | evidence |
|---|---|---|---|---|---|
| Atelier | Front, side and front/rear head airbags | standard | airbags | airbags | E7 |
| Atelier | DSC stability control | standard | NULL | esc | E7 |
| Atelier | Tyre pressure indicator | standard | NULL | tyre_pressure_monitoring | E7 |
| Atelier | ISOFIX on both rear seats | standard | seats | NULL | E7 |
| Atelier | LED headlights | standard | headlights | NULL | E7, E8 |
| Atelier | Radio Professional with 6.5-inch screen, Bluetooth | standard | infotainment | NULL | E7 |
| Atelier | Navigation Business (6.5-inch) | optional | infotainment | NULL | E7 |
| Atelier | Navigation Professional (10.25-inch) | optional | infotainment | NULL | E7 |
| Atelier | Apple CarPlay preparation (only with navigation); Android Auto not offered | optional | smartphone | NULL | E7 |
| Atelier | Air conditioning (manual) | standard | climate | NULL | E7 |
| Atelier | Automatic climate control (Komfort-Paket) | optional | climate | NULL | E7 |
| Atelier | Rear parking sensors | standard | parking | reversing_detection | E7 |
| Atelier | Leather steering wheel | standard | steering_wheel | NULL | E7 |
| Atelier | Heated front seats | optional | seat_comfort | NULL | E7 |
| Atelier | Heat pump | optional | climate | NULL | E7 |
| Atelier | Harman Kardon audio | optional | sound | NULL | E7 |
| Atelier | 19-inch alloy wheels (i3); 20-inch (i3s) | standard | wheels | NULL | E7 |
| Atelier | Cloth "Neutronic" Aragaz grey, dark dashboard | standard | interior_trim | NULL | E7 |
| Loft | Cloth / Sensatec "Electronic", Carum grey | standard | interior_trim | NULL | E7 |
| Loft | Light dashboard, "Electronic" brown interior surfaces | standard | interior_trim | NULL | E7 |
| Loft | LED ambient lighting and welcome light | standard | ambient_lighting | NULL | E7 |
| Lodge | Wool / natural-leather "Solaric" upholstery | standard | interior_trim | NULL | E7 |
| Lodge | Leather dashboard with open-pore eucalyptus (or dark oak) wood | standard | interior_trim | NULL | E7 |
| Lodge | LED ambient lighting and welcome light | standard | ambient_lighting | NULL | E7 |
| Suite | Vernasca natural leather, Dark Truffle | standard | interior_trim | NULL | E7 |
| Suite | Leather dashboard with dark oak (or eucalyptus) wood | standard | interior_trim | NULL | E7 |
| Suite | LED ambient lighting and welcome light | standard | ambient_lighting | NULL | E7 |
| Suite | Heated front seats (required with Suite) | optional | seat_comfort | NULL | E7 |

*(The car-wide items (safety, LED lights, radio, A/C, wheels, options) are listed once under Atelier; they apply to every line. Source is the Austrian price list of 11/2018, the 120 Ah launch. SK / CZ lists weren't found, see R.)*

## I. FAULTS
| component | target (engine code@kW / gearbox / drivetrain / body) | fault + symptom | affected_years | severity | category | evidence |
|---|---|---|---|---|---|---|
| — | — | No new facelift-scope fault found this run | — | — | — | — |

*(The live Facelift faults (A/C compressor on the phase; 12 V drain on all four engines; KLE and motor mount on i3-94Ah) were not re-confirmed with facelift-scope evidence. The BMW 12 V and KLE bulletins found (E13) cover 2014–2017 cars. E8 lists 2 recalls, both 2017 and pre-facelift or REx-only. See R.)*

## J. CONFIGURATION FACTS
| engine (code@kW) | gearbox | drivetrain | body | fuel_consumption_l100km | energy_consumption_kwh100km | consumption_cycle | ev_range_km | co2_emissions_g_km | curb_weight_kg | acceleration_0_100 | top_speed_kmh | towing_braked_kg | towing_unbraked_kg | secondary_fuel_type | secondary_consumption_l100km | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| i3-94Ah@125 | single-speed | RWD | Hatchback 5-door | N/A | 13.1 | NEDC | 300 | NULL | 1320 | 7.3 | 150 | NULL | NULL | N/A | N/A | E3 |
| i3s-94Ah@135 | single-speed | RWD | Hatchback 5-door | N/A | 14.3 | NEDC | 280 | NULL | 1340 | 6.9 | 160 | NULL | NULL | N/A | N/A | E4 |
| i3-120Ah@125 | single-speed | RWD | Hatchback 5-door | N/A | 15.3 | WLTP | NULL | 0 | 1345 | 7.3 | 150 | NULL | NULL | N/A | N/A | E1, E5 |
| i3s-120Ah@135 | single-speed | RWD | Hatchback 5-door | N/A | 16.3 | WLTP | 283 | 0 | 1365 | 6.9 | 160 | NULL | NULL | N/A | N/A | E2, E6 |

## K. CAR-LEVEL PROS / CONS
| type | text | evidence |
|---|---|---|
| pro | Light, rigid CFRP passenger cell on an aluminium chassis | E5, E8 |
| pro | Very small turning circle (9.86 m i3, 10.31 m i3s) | E5, E6, E8 |
| pro | No centre tunnel: an airy cabin with good front space | E8 |
| con | Impractical coach-door system, cramped rear, small boot (260 l) | E8 |
| con | Low payload | E8 |
| con | Very high tyre wear; weak air conditioning | E8 |

## O. JUDGEMENT TAGS (only these, only with a reason)
| tag | level | reason | evidence |
|---|---|---|---|

## P. ALLOWED VALUES
*(As in `scripts/new-car-template/GEMINI-RESEARCH-PACK.md`.)*

## Q. EVIDENCE
| ref | url | verbatim quote (contains the value) |
|---|---|---|
| E1 | https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/bmw/i3/i01-facelift/294684 | BMW i3 (120 Ah) 11/18–03/22: "Verbrauch … (WLTP)": "15,3 kWh/100 km"; Reichweite WLTP "307 km"; "Leergewicht (EU)": "1345 kg"; "7,3 s"; "150 km/h"; "Netto … 37,9"; "AC:2,3-11,0 DC:50"; Baureihe "11/17" – "03/22" |
| E2 | https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/bmw/i3/i01-facelift/294685 | BMW i3s (120 Ah): "Verbrauch kombiniert (WLTP)": "16,3 kWh/100 km"; "Reichweite WLTP (elektrisch)": "283 km"; "Leergewicht (EU)": "1365 kg"; "6,9 s"; "160 km/h"; "Länge": "4006 mm" |
| E3 | https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/bmw/i3/i01-facelift/283076/ | BMW i3 (94 Ah) 11/17–09/18: "Verbrauch Gesamt (NEFZ): 13,1 kWh/100 km"; "Reichweite NEFZ (elektrisch): 300 km"; "Leergewicht (EU): 1320 kg"; "Länge: 4011 mm"; "Höhe: 1598 mm"; "Bodenfreiheit maximal: 139 mm" |
| E4 | https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/bmw/i3/i01-facelift/283073/ | BMW i3s (94 Ah) 11/17–09/18: "Verbrauch Gesamt (NEFZ)": "14,3 kWh/100 km"; "Reichweite NEFZ (elektrisch)": "280 km"; "Leergewicht (EU)": "1340 kg"; "Netto … 27,2" |
| E5 | https://newsroom.bmwgroup.com/emea/de-at/technische-daten-bmw-i3-120-ah-und-bmw-i3s-120-ah-gueltig-ab-112018 (PDF attachment) | BMW i3 (120 Ah), 11/2018: "Länge mm 4011 … Höhe (mit Dachfinne) mm 1598 … Bodenfreiheit 139"; "Elektrische Reichweite … 285 - 310"; "Leergewicht nach DIN/EU … 1270 / 1345"; "Automatikgetriebe, einstufig mit fester Übersetzung 9,665:1"; "Wendekreis m 9,86" |
| E6 | same PDF, i3s pages | BMW i3s (120 Ah): "4006 … 1791 … 1590 … 131"; "elektrische Reichweite … 270 - 285"; "1290 / 1365"; "Wendekreis … 10,31" |
| E7 | https://www.autofrey.at/wp-content/uploads/2017/01/Preisliste-i3_11_2018.pdf (BMW Austria price list, November 2018) | "Radio Professional inkl. MP3-Decoder, Bluetooth und 6,5" … Farbbildschirm"; "Navigationssystem Business 6AM 840,00"; "Navigationssystem Professional … 10,25"-Vollfarbdisplay"; "Klimaanlage inkl. Mikrofilter und Umlufttaste" (standard); "Klimaautomatik" (Komfort-Paket); "Sitzheizung für Fahrer und Beifahrer" (option); "Apple CarPlay Vorbereitung … Nur in Verbindung mit Navigationssystem Business, Navigationssystem Professional"; "Wärmepumpe 4T9"; "HiFi Lautsprechersystem Harman Kardon 674 670,00"; "Wechselstrom-Laden … Maximale Leistung: 11 kW"; "Gleichstrom-Laden … 50 kW"; "Sportpaket … 10mm Tieferlegung … Im Modell BMW i3s enthalten" |
| E8 | https://assets.adac.de/Autodatenbank/GWInfo/gw0263-bmw-i3-2013-2022-bericht.pdf | "11/2017 leichte Modellpflege … LED-Scheinwerfer serienmäßig"; "Testergebnis 2013 … nur 4 Sterne"; "03/2022 Baureihe eingestellt"; "geringe Zuladung, kleiner Kofferraum … sehr hoher Reifenverschleiß" |
| E9 | https://www.carbuyer.co.uk/news/136508/bmw-i3-awarded-four-stars-by-euro-ncap | "86 per cent for adult occupant protection"; "81 per cent for child occupant protection"; "57 per cent score for pedestrian safety"; "55 per cent for its safety assist systems" |
| E10 | https://newsroom.bmwgroup.com/emea/the-all-electric-bmw-i3-120ah | "ranges take into account differences in wheel and tyre size selected as well as optional equipment" |
| E11 | https://www.autobazar.eu/vysledky/osobne-vozidla/bmw/i3/?yearfrom=2018&yearto=2022 (page 1, 2026-11-10) | e.g. "BMW i3 2019 53 154 km 17 900 €"; "BMW i3 Executive 120 Ah … 2021 115 000 km 19 980 €" |
| E12 | same search, page 2 | e.g. "BMW i3 120Ah 2020 43 260 km 26 900 €" |
| E13 | https://m.carcomplaints.com/BMW/i3/2016/tsbs/tsb-610115.shtml | BMW TSB 610115: KLE software, delayed charging start; model years 2014–2017 (wrong scope for the facelift) |

## R. GAPS & DOUBTS

### Verification against the live catalog (Facelift)
| item | live | source says | verdict |
|---|---|---|---|
| Phase years, NCAP 4★ 2013, 86 / 81 / 57 / 55 | as stored | E1, E8, E9 | **confirmed** (the facelift wasn't retested; the 2013 rating is inherited and has since expired) |
| Body: 4011 / 1775 / 1598 / 139, boot 260 / 1100, 4 seats, ISOFIX 2 | as stored | E3, E5, E7 | **confirmed** |
| Body: boot sill 780, ISOFIX front passenger false | as stored | not re-opened this run | **flagged**: kept, unconfirmed |
| i3-94Ah@125 facelift: 13.1 NEDC, 1320 kg, 7.3 s, 150 | as stored | E3 | **confirmed** |
| **i3-94Ah@125 facelift ev_range_km** | **NULL** | **300 km NEDC** (E3) | **correct → 300** |
| i3s-94Ah@135: 14.3 NEDC, 280 km, 1340, 6.9, 160 | as stored | E4 | **confirmed** |
| i3-120Ah@125: 15.3 WLTP, 1345, 7.3, 150 | as stored | E1, E5 | **confirmed** |
| **i3-120Ah@125 ev_range_km** | **285** (WLTP) | **BMW 285–310 (wheel / option dependent, E5, E10); ADAC 307** | **conflict → NULL suggested**: 285 is BMW's worst case, not the smallest standard wheel. The pack rule asks for the smallest standard wheel (19") and no source gives that figure on its own. Martin to decide: keep 285, take ADAC's 307, or set NULL. The engine pro "285 km WLTP" follows whatever is chosen. |
| i3s-120Ah@135: 16.3 WLTP, 283 km, 1365, 6.9, 160 | as stored | E2, E6 (283 lies inside BMW's 270–285) | **confirmed** |
| Engines: net battery, torque, AC 11 / DC 50, heat pump optional | as stored | E1–E4, E7 | **confirmed** |
| Engines: battery_thermal_management `active_refrigerant` | as stored | no source states the cooling medium | **flagged** |
| Gearbox single-speed, RWD | as stored | E5, E6 | **confirmed** |
| **Trim Atelier: "Professional or Business navigation"** | standard | standard is **Radio Professional, 6.5"**; both navigation systems are options (E7) | **correct** |
| **Trim Atelier: "automatic air conditioning"** | standard | standard is **manual A/C**; Klimaautomatik is in the Komfort-Paket (E7) | **correct** |
| **Trim Loft: "LED headlights"** | Loft only | LED headlights standard on every facelift (E7, E8) | **correct**: move to every line |
| **Trim Loft: "eucalyptus or carbon-look dashboard trim"** | standard | Loft = light dashboard, "Electronic" brown surfaces; wood is Lodge / Suite (E7) | **correct** |
| **Trim Lodge: "heated seats"** | standard | heated seats are an option on every line; Suite requires them (E7) | **correct** |
| **Trim Suite: "Harman Kardon audio"** | standard | Harman Kardon is option 674, €670, not part of Suite (E7) | **correct** |
| **Trim `i3s`** | trim row, tier 3 | a separate model (own price line); its kit is the Sportpaket (E7) | **correct**: drop the trim row (destructive, Martin's call). 135 kW is already on the i3s engine rows; the 20" wheels / -10 mm are Sportpaket |
| **Market data** | 14 000 / 18 000 / 25 000, "40,000 – 100,000 km" | 17 900 / 20 545 / 26 900, 43 260 – 115 000 km (E11, E12) | **live values have no source** (none in the repo either); the new sample is one site only, see below |
| resale_value_rating `depreciates_fast` | as stored | not assessed | **flagged** |
| Facelift faults (A/C compressor, 12 V drain, KLE, motor mount) | as stored | no facelift-scope evidence this run (E13 = 2014–2017) | **flagged**: kept, unconfirmed |
| segment B, origin german, platform "BMW LifeDrive", chassis monocoque | as stored | not sourced this run | **flagged** (judgement / naming values) |

### Other doubts
| item | what is missing / unclear | where you looked |
|---|---|---|
| Market sample | Only autobazar.eu. Its year filter also returned 2014–2017 cars, which were dropped by hand. REx cars and one "not for sale" parts listing (€1 000) were excluded. One Czech listing (€30 389) fell in the top cut. Some prices include VAT, others allow VAT deduction. sauto.cz, bazos, mobile.de not checked. | E11, E12 |
| Gross weight / payload | ADAC 1710 / 365 vs BMW 1710 / 440 for the 120 Ah: BMW's payload is from the DIN weight (1270), ADAC's from the EU weight (1345). Left NULL. | E1, E5 |
| BMW PDF layout | In the `pdftotext` output the labels are shifted against the values, e.g. "1270 / 1345" prints next to the gross-weight label. Matched by order and confirmed by ADAC's EU weight 1345 / 1365. | E5, E6 |
| NCAP primary source | euroncap.com result pages returned 404 or certificate errors, so the percentages are taken from carbuyer.co.uk (E9) and ADAC's mention of 4★ / 2013 (E8). | euroncap.com, cdn.euroncap.com |
| Trims market | Price list is Austria 11/2018 (120 Ah launch); no SK / CZ list found. The 94 Ah facelift year (11/17–09/18) might have differed in detail. | autofrey.at |
| 120 Ah NEDC figures | BMW gives NEDC 13.1 kWh / 359 km (i3) and 14.0–14.6 kWh / 330–345 km (i3s); not storable on a WLTP row. | E5, E6 |
| Live ev_range_wltp_km on NEDC rows | Not an error: it's a generated column mirroring ev_range_km (`20261109224000` bridge). | live schema |
