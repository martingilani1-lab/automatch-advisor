"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { carStars, carAdult, getConsumptionForFuel, getPowerForFuel } from "@/app/lib/carFields";


// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════

interface CarData {
  id: string; make: string; model: string; gen: string; years: string;
  yearTo?: number; body: string; segment?: string; fuel: string[]; seats?: number; boot?: number;
  bootMax?: number; origin?: string; originFlag?: string;
  towingCapacity?: number | null; groundClearance?: number | null;
  length?: number | null; width?: number | null; height?: number | null; weight?: number | null;
  hasAWD?: boolean; drivetrains?: string[]; avgConsumption?: number | null; fuelTankLiters?: number | null;
  resaleValue?: string | null; bodyVariants?: any[] | null;
  note?: string; buyingTip?: string; usageTags?: string[];
  transmissions?: any[]; maxPowerKw?: number | null; minPowerKw?: number | null;
  vehicleFaults?: { issue: string; severity: string }[];
  pricing?: { skPriceMin?: number; skPriceMax?: number; euPriceMin?: number; euPriceMax?: number; mileageAtMidBudget?: string };
  reliability?: any; safety?: any; equipment?: any[];
  _n?: boolean; budgetMin?: number; budgetMax?: number; mileageRange?: string;
  ncapStars?: number | null; ncapAdult?: number | null; ncapChild?: number | null;
  ncapPed?: number | null; ncapAssist?: number | null; ncapYear?: number | null;
  luxury?: number; longTrip?: boolean; repair?: string; tx?: string[];
  faults?: { summary?: string; buyingTip?: string };
  _dims?: { practical: number; financial: number; preference: number; safety: number };
  pros?: string[]; cons?: string[]; consumptionByFuel?: Record<string, number> | null;
  powerByFuel?: Record<string, number> | null;
}
interface ScoredCar { car: CarData; score: number; isBest: boolean }
type Answers = Record<string, string | string[]>;
interface DetailData {
  e: { engine: string; fuel_type: string; power_kw: number; reliability: string; faults: string[]; pros: string[]; cons: string[] }[];
  t: { type: string; trans_type: string; reliability: string; detail: string; tip: string }[];
  c: { area: string; severity: string; detail: string }[];
  pros: string[]; cons: string[]; q: { trim: string; features: string }[]; b: string;
}
type Phase = "hero" | "quiz" | "loading" | "results";

interface QuizOption { value: string; label: string; desc: string }
interface QuizQuestion { id: string; title: string; subtitle: string; type: "single" | "multi"; maxSelect?: number; options: QuizOption[] }

// ═════════════════════════════════════════════════════
// QUIZ QUESTIONS — 16 questions
// ════════════════════════════════════════════════════════════

const QUESTIONS: QuizQuestion[] = [
  { id: "budget", title: "What's your budget?", subtitle: "Be honest — the best recommendation starts with the real number.", type: "single", options: [
    { value: "under_5k", label: "Up to €5,000",        desc: "Smart money, no nonsense. Plenty of solid cars live here if you know where to look." },
    { value: "5k_10k", label: "€5,000 – €10,000",    desc: "The sweet spot for used cars. Old enough to be affordable, new enough to be reliable." },
    { value: "10k_15k", label: "€10,000 – €15,000",   desc: "Serious options open up. Nearly-new economy or older premium — your call." },
    { value: "15k_25k", label: "€15,000 – €25,000",   desc: "New base models or nicely equipped used cars. This is where the real choices start."  },
    { value: "25k_40k", label: "€25,000 – €40,000",   desc: "New mid-range loaded, or a used premium that still turns heads. You're shopping comfortably." },
    { value: "40k_60k", label: "€40,000 – €60,000",   desc: "New premium territory. BMW 3, Audi A4, Mercedes C-Class — or a fully loaded SUV. Serious cars." },
    { value: "60k_100k", label: "€60,000 – €100,000",  desc: "Luxury, performance, or both. This is where you stop compromising and start choosing exactly what you want." },
    { value: "over_100k", label: "€100,000+",            desc: "No limits. Top-spec luxury, supercars, the best of the best. You're not buying a car — you're making a statement." },
  ]},
  { id: "mission", title: "🎯 What role will this car play in your life?", subtitle: "Don't overthink it — pick the one that feels most like your Monday morning.", type: "single", options: [
    { value: "commuter", label: "🚗 Daily commuter", desc: "Getting to work, picking up groceries, navigating parking lots. The car that starts every morning without drama."  },
    { value: "family", label: "🏠 Family car", desc: "School runs, weekend trips to grandma's, fitting a stroller in the back without a fight. Everyone rides safe and comfortable." },
    { value: "road_trip", label: "🗺️ Road tripper", desc: "Long highway stretches, weekend getaways, crossing borders. You want to arrive relaxed, not exhausted." },
    { value: "drivers_car", label: "🏎️Driver's car", desc: "You actually enjoy driving. Corners, engine sound, that feeling when you downshift — the car is the destination." },
    { value: "work_horse", label: "🛠️ Work horse", desc: "Tools in the back, muddy boots, maybe a trailer. This car earns money with you." },
    { value: "head_turner", label: "✨ Head turner", desc: "You want people to notice. The look, the badge, the presence when you pull up. Image is part of the deal." },
    { value: "show_with_soul", label: "🔥 Show car with soul", desc: "You want the head-turning looks AND the performance to back it up. Not just pretty — fast, fun, and worth every look it gets." },
    { value: "weekend_adventure", label: "🏕️ Weekend adventurer", desc: "Bikes on Friday, skis in January, camping in summer. The car sits during the week but comes alive when you escape the city." },
    { value: "professional_driver", label: "💼 Professional driver", desc: "Taxi, ride-share, delivery — the car IS your office. It needs to survive extreme daily use and keep passengers comfortable." },
    { value: "first_car", label: "🔐 First car", desc: "Just got your license or building confidence on the road. Something forgiving, easy to park, cheap if you scratch it." },
    { value: "all_rounder", label: "🔄 All-rounder", desc: "A bit of everything — commute Monday, IKEA Saturday, road trip in summer. No extremes, just solid all around." },
  ]},
  { id: "passengers", title: "👥 How many people need to fit?", subtitle: "Count everyone who regularly rides with you — including yourself.", type: "single", options: [
    { value: "1_2", label: "🧍 Just me or one more", desc: "Solo commute, maybe a friend or a partner. Two seats that work, the rest are decoration." },
    { value: "3_4", label: "👫 Up to 4 people", desc: "Standard car, everyone has a seat. Covers most of life — couple with a kid or two, or mates on a road trip." },
    { value: "5", label: "👨‍👩‍👧‍👦 5 people comfortably", desc: "Full house — every seat in a normal car is occupied on a regular basis. No one rides squeezed, no one stays home." },
    { value: "6_plus", label: "🚌 6 or more people", desc: "Big family, group transport, or you're always the one driving everyone. Third row or a van — no way around it." },
  ]},
  { id: "body_type", title: "🚗 What kind of car do you see yourself in?", subtitle: "Think about how you want to feel when you walk up to it and sit down.", type: "single", options: [
    { value: "small_nimble", label: "🏎️ Small and nimble", desc: "Squeeze into any parking spot, zip through narrow streets. Light, easy to handle, and you never worry about tight spaces." },
    { value: "normal", label: "🚙 Normal car", desc: "Standard hatchback, sedan, or estate. Nothing extreme — just a regular car that does car things." },
    { value: "raised", label: "🛻 Higher up / crossover / SUV", desc: "You want to sit higher — easier to get in, better view over traffic, loading kids or groceries without bending down. The modern default." },
    { value: "big_commanding", label: "🚚 Big and commanding", desc: "Full-size SUV, pickup, or van. You like the presence, the space, and seeing the road from above everyone else." },
  ]},
  { id: "space", title: "🧳 How much cargo space do you need?", subtitle: "Forget the passengers — think about what else goes in the car.", type: "single", options: [
    { value: "minimal", label: "🎒 Minimal", desc: "A backpack, a laptop bag, maybe some groceries. You travel light and that's all you need." },
    { value: "moderate", label: "🛒 Moderate", desc: "A couple of suitcases, weekly shopping, a stroller. Normal trunk space that handles everyday life."},
    { value: "large", label: "⛷️ Large", desc: "Kids' gear, camping stuff, big dog, sports equipment. The back of the car is always full of something." },
    { value: "maximum", label: "📦 Maximum", desc: "Building materials, furniture, serious work gear. You need a flat bed or van-level cargo area." },
  ]},
  { id: "towing", title: "🔗 Do you need to tow anything?", subtitle: "From bike racks to excavators — this changes what engine and drivetrain you need.", type: "single", options: [
    { value: "none", label: "❌ No towing needed", desc: "The heaviest thing in your car is the weekly shopping. Maybe a suitcase. That's it." },
    { value: "light", label: "🚲 Light stuff occasionally", desc: "A bike rack, a small garden trailer, IKEA furniture runs. Under 750 kg, nothing serious." },
    { value: "medium", label: "🛶 Caravan, boat, or loaded trailer", desc: "You hitch a travel trailer for holidays, tow a boat to the lake, or haul a loaded work trailer. 750 to 2,000 kg — the car needs to handle real weight." },
    { value: "heavy", label: "🚜 Heavy towing regularly", desc: "Construction equipment, horse box, large caravan. 2,000 kg or more — you need serious pulling power and the car better not break a sweat." },
  ]},
  { id: "environment", title: "🛣️ Where do you mostly drive?", subtitle: "Close your eyes. Picture your usual route. What does it look like?", type: "single", options: [
    { value: "city", label: "🏙️ City streets", desc: "Traffic lights, roundabouts, hunting for parking spots. Your car lives between 0 and 50 km/h most of its life." },
    { value: "highway", label: "🛣️ Highway cruiser", desc: "Open road, cruise control on, eating kilometers. Comfort and efficiency at 130 km/h is what matters." },
    { value: "mixed", label: "🔄 Mix of both", desc: "City during the week, highway on weekends. Your car needs to handle both worlds without complaining." },
    { value: "rural", label: "🏔️ Country roads & rough stuff", desc: "Potholes, gravel, maybe no asphalt at all. Ground clearance isn't optional, it's survival." },
  ]},
  { id: "winter_grip", title: "🏔️ Do you need to handle tough winter or off-road conditions?", subtitle: "Snow, ice, mountain passes, unpaved forest roads — not everyone needs all-wheel drive, but some really do.",type: "single", options: [
    { value: "yes", label: "❄️ Yes, regularly", desc: "Mountain commutes, snowy villages, forest roads, ski trips in January. You need grip you can trust when the road disappears under snow or mud."},
    { value: "sometimes", label: "🌧️ Sometimes", desc: "Winters get rough occasionally, or you hit the mountains a few times a year. Think about it — do you actually need 4WD, or are good winter tires and maybe snow chains enough?" },
    { value: "no", label: "☀️ Not really", desc: "You stick to cleared roads, live in a milder area, or winter tires are enough. AWD would be wasted money." },
  ]},
  { id: "yearly_km", title: "📏 How much do you drive per year?", subtitle: "Rough guess is fine. Check your odometer if you want to be precise.", type: "single", options: [
    { value: "under_10k", label: "Under 10,000 km", desc: "That's less than 200 km a week. Weekend warrior — the car sits more than it drives, and that's perfectly fine." },
    { value: "10k_20k", label: "10,000 – 20,000 km", desc: "Roughly 200 to 400 km a week. Average driver — daily commute plus some trips, nothing extreme." },
    { value: "20k_30k", label: "20,000 – 30,000 km", desc: "Around 400 to 600 km every week. You're on the road a lot — the car needs to handle serious mileage without falling apart." },
    { value: "over_30k", label: "Over 30,000 km", desc: "More than 600 km a week. Basically living in your car. Fuel costs and long-term durability aren't details — they're everything." },
  ]},
  { id: "trip_pattern", title: "✈️ What do your typical trips look like?", subtitle: "This one matters more than you think — especially for engine health.", type: "single", options: [
    {
      value: "short", label: "🏙️ Mostly short hops",     desc: "Under 15 km one way. To work, to the shop, pick up the kids. The engine barely warms up." },
    { value: "mixed", label: "🔄 Mix of short and long",  desc: "Short trips during the week, but you regularly hit 50+ km stretches too."},
    { value: "long", label: "🗺️ Mostly longer drives",   desc: "When you drive, you drive. 50, 100, 200 km at a time is normal for you." },
  ]},
 { id: "year", title: "📅 How old of a car are you comfortable with?", subtitle: "Age is just a number — unless the timing chain says otherwise.", type: "single", options: [
    { value: "new", label: "✨ Brand new or nearly new (2022+)", desc: "Latest tech, full warranty, that new car smell. You want something nobody else has worn in." },
    { value: "few_years", label: "A few years old (2018–2022)",     desc: "Still modern, still fresh, but someone else took the depreciation hit. Smart move." },
    { value: "older_fine", label: "Older is fine (2013–2018)",       desc: "You know the best value hides here. Proven models, known issues, half the price of new." },
    { value: "old_ok", label: "I don't mind old (pre-2013)",     desc: "Character over chrome. Some of the best cars ever made are from this era — and they're cheap." },
    { value: "any_year", label: "Year doesn't matter",            desc: "Good car is a good car. 2008 or 2024, you don't care as long as it fits." },
  ]},
  { id: "equipment", title: "🎛️ Do you care about equipment and features?", subtitle: "Some people love the full package. Others couldn't care less. Where are you?", type: "single", options: [
    { value: "full", label: "💎 I like the full package",         desc: "You enjoy paying a bit extra for all the nice things — heated steering wheel, big touchscreen, keyless entry. The car should feel premium when you sit in it." },
    { value: "tech", label: "📱 Tech and entertainment matter",   desc: "Good screen, Apple CarPlay, solid speakers, maybe a digital dash. You want the driving tech, not necessarily the luxury extras."  },
    { value: "basic", label: "👍I don't really care about extras", desc: "It drives, it's comfortable enough, done. You're not the person who reads the options list — you just want the car itself." },
    { value: "value", label: "💲I'd rather save on features",     desc: "Every euro on heated mirrors is a euro not spent on a better engine or newer model. You'd rather have more car with less equipment." },
  ]},
  { id: "priorities", title: "⭐ What matters most to you?", subtitle: "Pick exactly two. This is the tiebreaker when two cars are close.", type: "multi", maxSelect: 2, options: [
    { value: "low_cost", label: "💰 Low running costs",     desc: "Every euro counts. Cheap fuel, cheap insurance, cheap parts. The car that doesn't drain your wallet." },
    { value: "safety", label: "🛡️ Safety",                desc: "You or your family are in this car. Airbags, stability control, crash ratings — not negotiable." },
    { value: "driving_pleasure", label: "🏎️ Driving pleasure",      desc: "Life is short. You want a car that puts a smile on your face every time you turn the key." },
    { value: "comfort", label: "🛋️ Comfort",               desc: "Smooth ride, quiet cabin, supportive seats. You want to arrive feeling better than when you left." },
    { value: "tech", label: "📲 Modern tech",           desc: "Apple CarPlay, digital dash, adaptive cruise. You want your car to feel like 2025, not 2010." },
    { value: "looks", label: "✨ Looks & prestige",      desc: "Admit it — you want something that looks good in the parking lot. Nothing wrong with that." },
    { value: "durability", label: "🏆 Durability",            desc: "Built to last. You want a car that can take a beating — rough roads, heavy use, bad weather — and keep running for years." },
    { value: "easy_entry", label: "🚪 Easy entry & visibility",desc: "You want to slide in, not climb down. Good view of the road, comfortable seating height, no gymnastics to get in or out." },
  ]},
  { id: "charging", title: "⚡ Could you charge an electric car?", subtitle: "This isn't about whether you want electric — it's about whether it would actually work for your life.", type: "single", options: [
    { value: "solar", label: "Yes — I have solar panels at home",   desc: "You've got your own electricity on the roof. Charging an EV would basically mean driving for free. Hard to beat that math." },
    { value: "public_nearby", label: "Yes — there's a public charger nearby",desc: "You don't produce your own electricity, but there's a charging station close enough that plugging in regularly is realistic."},
    { value: "no", label: "No — and I don't really care",        desc: "No charger at home, none nearby, or you just don't want to think about charging. Petrol station on every corner works fine for you." },
  ]},
  { id: "fuel", title: "⛽ Any fuel preference?", subtitle: "Based on everything you told us, we have a recommendation — but you decide.", type: "single", options: [
    { value: "petrol", label: "⛽ Petrol",                desc: "Simple, proven, usually cheaper to buy. Loves being revved, happy in city traffic." },
    { value: "diesel", label: "🛢️ Diesel",                desc: "Torque monster, highway sipper. Makes sense if you pile on the kilometers." },
    { value: "hybrid", label: "🔋 Hybrid",                desc: "Best of both worlds — electric in the city, petrol on the highway. Modern and efficient." },
    { value: "electric", label: "⚡ Electric",              desc: "Silent, instant torque, zero emissions. Ready for the future if the charging fits your life." },
    { value: "open", label: "I'm open to anything",  desc: "Let the algorithm figure it out. You care about the right car, not what's under the hood." },
  ]},
  { id: "transmission", title: "⚙️ Transmission preference?", subtitle: "Last question. We've got a suggestion based on your profile — but it's your call.", type: "single", options: [
    { value: "only_manual", label: "🕹️ Only manual",         desc: "Three pedals or nothing. You like being in control of every gear change." },
    { value: "only_auto", label: "🤖 Only automatic",      desc: "Life's too short for clutch pedals. Especially in traffic. You need or simply prefer auto." },
    { value: "prefer_manual", label: "🕹️ I prefer manual",    desc: "Manual is your default, but you wouldn't reject the right car just because it's automatic." },
    { value: "prefer_auto", label: "🤖 I prefer automatic", desc: "Automatic is nicer, but if the perfect car only comes in manual, you can deal with it." },
    { value: "no_pref", label: "🤷 No preference",       desc: "Gears are gears. You'll drive whatever makes sense." },
  ]},
];


// ════════════════════════════════════════════════════════════
// FUEL & TRANSMISSION RECOMMENDATION ENGINE
// ════════════════════════════════════════════════════════════

function isHighBudget(b: string): boolean {
  return ["25k_40k", "40k_60k", "60k_100k", "over_100k"].includes(b);
}

function getRecommendedFuel(ans: Answers): string {
  const km = ans.yearly_km as string, trip = ans.trip_pattern as string, env = ans.environment as string;
  const towing = ans.towing as string, budget = ans.budget as string, mission = ans.mission as string;
  const charging = ans.charging as string;
  const priorities = (Array.isArray(ans.priorities) ? ans.priorities : []) as string[];
  const noElectric = ["under_5k", "5k_10k", "10k_15k"].includes(budget);
  const noHybrid = ["under_5k", "5k_10k"].includes(budget);
  const canCharge = ["solar", "public_nearby"].includes(charging);
  const hasSolar = charging === "solar";
  const electricViable = !noElectric && canCharge;

  if (towing === "heavy" || towing === "medium") return "diesel";
  if (towing === "light" && (km === "20k_30k" || km === "over_30k")) return "diesel";
  if (mission === "drivers_car" || mission === "show_with_soul") return "petrol";
  if (hasSolar && trip === "short" && !noElectric) return "electric";
  if (hasSolar && km === "under_10k" && !noElectric) return "electric";
  if (hasSolar && env === "city" && !noElectric) return "electric";
  if (mission === "professional_driver" && env === "city" && !noHybrid) return "hybrid";
  if (mission === "professional_driver" && env === "city") return "petrol";
  if (mission === "professional_driver" && km === "over_30k") return "diesel";
  if (trip === "short" && env === "city" && km === "under_10k" && electricViable) return "electric";
  if (trip === "short" && env === "city" && !noHybrid) return "hybrid";
  if (trip === "short" && km === "under_10k" && electricViable) return "electric";
  if (trip === "short" && !noHybrid) return "hybrid";
  if (trip === "short") return "petrol";
  if (canCharge && km === "under_10k" && !noElectric) return "electric";
  if (km === "over_30k" && (trip === "long" || trip === "mixed")) return "diesel";
  if (km === "20k_30k" && trip === "long") return "diesel";
  if (priorities.includes("low_cost") && km === "20k_30k" && trip === "mixed") return "diesel";
  if (priorities.includes("low_cost") && hasSolar && !noElectric) return "electric";
  if (priorities.includes("low_cost") && (env === "city" || env === "mixed") && !noHybrid) return "hybrid";
  if (env === "city" && trip === "mixed" && !noHybrid) return "hybrid";
  if (km === "10k_20k") return "petrol";
  if (km === "20k_30k" && trip === "mixed") return "petrol";
  return "petrol";
}

function getRecommendedTransmission(ans: Answers): string {
  console.log("TRANS FIX CHECK — fuel:", ans.fuel);
  const env = ans.environment as string, mission = ans.mission as string, budget = ans.budget as string;
  const towing = ans.towing as string;
  const priorities = (Array.isArray(ans.priorities) ? ans.priorities : []) as string[];
 const high = isHighBudget(budget);
  // Hybrid and electric don't have manual — always auto
  const fuel = ans.fuel as string;
  if (fuel === "electric") return "only_auto";
  if (fuel === "hybrid") return "prefer_auto";
  if ((towing === "heavy" || towing === "medium") && (high || budget === "15k_25k")) return "prefer_auto";
  if (towing === "heavy" || towing === "medium") return "prefer_manual";
  if (mission === "professional_driver") return "prefer_auto";
  if (priorities.includes("easy_entry")) return "prefer_auto";
  if (budget === "under_5k") return "prefer_manual";
  if (budget === "5k_10k" && mission !== "family" && env !== "city") return "prefer_manual";
  if (priorities.includes("low_cost") && !high && env !== "city"
    && !priorities.includes("comfort")
    && mission !== "road_trip"
    && mission !== "family"
    && !(env === "highway" && (ans.yearly_km === "over_30k" || ans.yearly_km === "20k_30k")))
    return "prefer_manual";
  if (mission === "drivers_car" || mission === "show_with_soul") return "prefer_manual";
  if (priorities.includes("driving_pleasure") && !priorities.includes("comfort")
    && mission !== "road_trip"
    && ans.body_type !== "raised" && ans.body_type !== "big_commanding"
    && !(env === "highway" && (ans.yearly_km === "over_30k" || ans.yearly_km === "20k_30k")))
    return "prefer_manual";
  if (mission === "first_car") return "prefer_manual";
  if (env === "rural" && !high) return "prefer_manual";
  if (mission === "all_rounder" && (budget === "5k_10k" || budget === "10k_15k")) return "prefer_manual";
  if (mission === "work_horse" && !high) return "prefer_manual";
  if (priorities.includes("comfort") && budget !== "under_5k") return "prefer_auto";
  if (env === "highway" && (ans.yearly_km === "20k_30k" || ans.yearly_km === "over_30k") && budget !== "under_5k") return "prefer_auto";
  if (env === "city" && budget !== "under_5k" && !(budget === "5k_10k" && priorities.includes("low_cost"))) return "prefer_auto";
  if (mission === "family" && budget !== "under_5k") return "prefer_auto";
  if (mission === "road_trip" && budget !== "under_5k") return "prefer_auto";
  if (high) return "prefer_auto";
  if (budget === "15k_25k" && (env === "highway" || env === "mixed")) return "prefer_auto";
  return "prefer_manual";
}

function getFuelReason(value: string, ans: Answers): string {
  const trip = ans.trip_pattern as string;
  const km = ans.yearly_km as string;
  const env = ans.environment as string;
  const towing = ans.towing as string;
  const mission = ans.mission as string;
  const budget = ans.budget as string;
  const charging = ans.charging as string;
  const hasSolar = charging === "solar";
  const priorities = (Array.isArray(ans.priorities) ? ans.priorities : []) as string[];

  if (value === "diesel" && towing === "heavy") return "Heavy towing needs diesel torque \u2014 nothing else handles 2+ tons reliably";
  if (value === "diesel" && towing === "medium") return "Towing a caravan or trailer needs pulling power \u2014 diesel delivers that and sips fuel under load";
  if (value === "diesel" && towing === "light" && km !== "under_10k") return "Towing plus your mileage makes diesel the efficient choice";
  if (value === "petrol" && (mission === "drivers_car" || mission === "show_with_soul")) return "Petrol is the enthusiast's choice — revs, sound, and simplicity. This is what driver's cars run on";
  if (value === "electric" && hasSolar) return "You have solar panels \u2014 charging from your own roof means driving for essentially free. Best deal in motoring";
  if (value === "electric" && charging === "public_nearby" && trip === "short") return "Short trips + a charger nearby \u2014 electric makes sense, just plug in when you can";
  if (value === "electric" && charging === "public_nearby") return "With a public charger nearby, electric is practical for your driving pattern";
  if (value === "electric" && hasSolar && priorities.includes("low_cost")) return "Solar panels + EV = almost zero running costs. Nothing else comes close";
  if (value === "electric" && trip === "short") return "Short daily trips are what EVs do best \u2014 no engine warm-up issues, just go";
  if (value === "electric" && km === "under_10k") return "Low mileage + short trips \u2014 electric is made for exactly this";
  if (value === "hybrid" && mission === "professional_driver") return "Constant city crawling is where hybrid saves the most \u2014 regen braking turns every red light into free fuel";
  if (value === "petrol" && mission === "professional_driver") return "Best option in your budget for city driving \u2014 reliable and cheap to fix";
  if (value === "diesel" && mission === "professional_driver") return "With your extreme mileage, diesel fuel savings add up fast";
  if (value === "petrol" && trip === "short") return "At your budget, petrol is the smartest choice for short trips \u2014 simple, reliable, cheap to maintain";
  if (value === "hybrid" && trip === "short" && env === "city") return "Short city trips are tough on pure petrol/diesel \u2014 hybrid handles them perfectly";
  if (value === "hybrid" && trip === "short") return "Your short-trip pattern is ideal for hybrid \u2014 electric motor covers the cold starts";
  if (value === "hybrid" && priorities.includes("low_cost")) return "Hybrid saves you fuel money, especially with your city/mixed driving";
  if (value === "hybrid" && env === "city") return "City driving with regen braking \u2014 hybrid thrives here";
  if (value === "hybrid") return "Good match for your driving mix";
  if (value === "diesel" && priorities.includes("low_cost")) return "With your mileage and focus on running costs, diesel pays for itself";
  if (value === "diesel") return "Your high mileage + long trips make diesel actually worth it";
  if (value === "petrol") return "Solid all-rounder for your mileage and trip style";
  return "";
}

function getTransReason(value: string, ans: Answers): string {
  const towing = ans.towing as string;
  const mission = ans.mission as string;
  const env = ans.environment as string;
  const budget = ans.budget as string;
  const priorities = (Array.isArray(ans.priorities) ? ans.priorities : []) as string[];

  if (value === "prefer_auto" && (towing === "heavy" || towing === "medium")) return "Automatic with torque converter handles trailer weight smoother \u2014 easier hill starts, less clutch wear";
  if (value === "prefer_manual" && (towing === "heavy" || towing === "medium")) return "At this budget, manual handles towing fine \u2014 just expect more clutch wear with heavy loads";
  if (value === "prefer_auto" && mission === "professional_driver") return "10 hours in traffic without a clutch pedal \u2014 your left leg will thank you";
  if (value === "prefer_manual" && priorities.includes("low_cost")) return "Manual saves real money \u2014 clutch replacement is \u20AC400\u2013600, automatic gearbox repair can be \u20AC1,500+";
  if (value === "prefer_manual" && (mission === "drivers_car" || mission === "show_with_soul")) return "Full control over every gear \u2014 looks AND feels like a proper performance car";
  if (value === "prefer_manual" && priorities.includes("driving_pleasure")) return "Manual adds driving engagement \u2014 every gear change is yours";
  if (value === "prefer_auto" && priorities.includes("comfort")) return "You picked comfort as a priority \u2014 automatic is simply more relaxed, especially on long drives";
  if (value === "prefer_manual" && budget === "under_5k") return "At this budget, manual saves you a lot \u2014 cheaper to buy and maintain";
  if (value === "prefer_manual" && budget === "5k_10k") return "Manual cars are cheaper to maintain at this price range";
  if (value === "prefer_auto" && env === "highway") return "With your mileage on highways, automatic removes fatigue \u2014 your right leg does less work over thousands of kilometers";
  if (value === "prefer_manual" && mission === "first_car") return "Learning manual first means you can drive anything later \u2014 and it\u2019s cheaper to maintain";
  if (value === "prefer_manual" && env === "rural") return "More direct control on rough roads and hills \u2014 simpler to maintain out of town";
  if (value === "prefer_manual" && mission === "work_horse") return "Tougher, simpler, cheaper to fix \u2014 manual gearboxes handle hard work well";
  if (value === "prefer_manual" && mission === "all_rounder") return "Practical default \u2014 cheaper maintenance and more models available in your range";
  if (value === "prefer_manual") return "Simpler, cheaper to maintain, and gives you more control";
  if (value === "prefer_auto" && env === "city") return "Easier in city traffic \u2014 but avoid dual-clutch (DSG/DCT) in heavy stop-and-go, CVT or torque converter are better";
  if (value === "prefer_auto" && mission === "road_trip") return "Long-distance driving is where automatic really shines \u2014 less fatigue, more focus on the road";
  if (value === "prefer_auto" && mission === "family") return "More relaxed for family driving, especially with kids in the car";
  if (value === "prefer_auto" && mission === "weekend_adventure") return "Comfortable for long weekend drives \u2014 focus on the scenery, not the gear stick";
  if (value === "prefer_auto" && mission === "head_turner") return "Most premium cars come automatic \u2014 matches the segment";
  if (value === "prefer_auto" && isHighBudget(budget)) return "At this budget, automatic transmissions are refined and widely available \u2014 more comfortable all around";
  if (value === "prefer_auto" && env === "mixed") return "For your mix of driving, automatic adds comfort without downsides at this budget";
  if (value === "prefer_auto") return "More comfortable for your use case";
  if (value === "prefer_manual") return "Simpler, cheaper to maintain, and the practical default in your price range";
  return "";
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

const RC: Record<string, string> = { Excellent: "#6bdb8a", Good: "#e8ff47", Average: "#ff9944", Poor: "#ff6b35" };
const OF: Record<string, string> = { Japanese: "\u{1F1EF}\u{1F1F5}", Korean: "\u{1F1F0}\u{1F1F7}", "Czech/German": "\u{1F1E8}\u{1F1FF}", German: "\u{1F1E9}\u{1F1EA}", French: "\u{1F1EB}\u{1F1F7}", Swedish: "\u{1F1F8}\u{1F1EA}", "Swedish/Chinese": "\u{1F1F8}\u{1F1EA}", American: "\u{1F1FA}\u{1F1F8}", "American/European": "\u{1F1FA}\u{1F1F8}", "Romanian/French": "\u{1F1F7}\u{1F1F4}", British: "\u{1F1EC}\u{1F1E7}", Chinese: "\u{1F1E8}\u{1F1F3}", "Chinese (SAIC)": "\u{1F1E8}\u{1F1F3}", "Spanish/German": "\u{1F1EA}\u{1F1F8}" };

const fmtK = (v: number) => (v >= 1000 ? Math.round(v / 1000) + "k" : String(v));
const flLabel = (f: string) => ({ petrol: "\u26FD Petrol", diesel: "\u{1F6E2}\uFE0F Diesel", electric: "\u26A1 Electric", hybrid: "\u26A1 Hybrid", phev: "\u26A1 PHEV", lpg: "\u{1F4A7} LPG" }[f] || f);
const blLabel = (b: string) => ({ hatchback: "Hatchback", estate: "Estate", suv: "SUV", mpv: "MPV", pickup: "Pickup", convertible: "Convertible", coupe: "Coupe", sedan: "Sedan", crossover: "Crossover", city_car: "City Car", van: "Van", minivan: "MPV" }[b] || b);
function getLinks(c: CarData) { const mk = c.make.toLowerCase().replace(/[^a-z0-9]/g, "-"), md = c.model.toLowerCase().replace(/[^a-z0-9]/g, "-"); return { as: `https://www.autoscout24.com/lst/${mk}/${md}`, ab: `https://www.autobazar.eu/inzeraty/${mk}-${md}/`, mo: `https://suchen.mobile.de/fahrzeuge/search.html?q=${encodeURIComponent(c.make + " " + c.model)}` }; }

// ════════════════════════════════════════════════════════════
// SHARED DISPLAY HELPERS — duplicated in app/api/recommend/route.ts
// (also needed there for scoring; kept here for card rendering)
// ════════════════════════════════════════════════════════════

// How much does resale value matter to THIS buyer? Returns 0.0–1.0
function getResaleRelevance(a: Answers): number {
  const mission = a.mission as string;
  const year = a.year as string;
  const km = a.yearly_km as string;
  const priorities = (Array.isArray(a.priorities) ? a.priorities : []) as string[];

  // Depreciation curve — new cars bleed value, pre-2013 already hit the floor
  let w = year === "new" ? 1.0
        : year === "few_years" ? 0.8
        : year === "older_fine" ? 0.45
        : 0.15; // old_ok / any_year

  // Rational buyer signals — these people WILL resell and feel every euro
  if (priorities.includes("low_cost")) w += 0.25;
  if (mission === "professional_driver") w += 0.3;  // burns through cars, resells every 2-3 years
  if (mission === "commuter" || mission === "all_rounder") w += 0.1;
  if (km === "over_30k") w += 0.2;
  else if (km === "20k_30k") w += 0.1;
  if (a.equipment === "value") w += 0.1;

  // Emotional buyer signals — depreciation is the price of the experience
  if (mission === "head_turner" || mission === "show_with_soul" || mission === "drivers_car") w -= 0.5;
  if (priorities.includes("looks") || priorities.includes("driving_pleasure")) w -= 0.15;

  return Math.max(0, Math.min(1, w));
}

const LIFTBACK_STYLES = ["liftback", "sportback", "fastback"];
let _advancing = false;


  // Fault mentions an engine family irrelevant to the user's fuel choice?
function faultRelevant(issue: string, userFuel: string): boolean {
  if (!userFuel || userFuel === "open") return true;
  const t = (issue || "").toLowerCase();
  const petrolHints = /puretech|tsi|tfsi|mpi|fsi|vti|tce|1\.0|1\.2 |petrol/;
  const dieselHints = /tdi|tdci|dci|cdti|hdi|crdi|dpf|injector|diesel|adblue|egr/;
  if ((userFuel === "hybrid" || userFuel === "electric") && (petrolHints.test(t) || dieselHints.test(t))) return false;
  if (userFuel === "petrol" && dieselHints.test(t)) return false;
  if (userFuel === "diesel" && petrolHints.test(t)) return false;
  return true;
}

function getScoreReason(c: CarData, a: Answers): string {
  const r: string[] = [];
  const mission = a.mission as string;
  const missionLabels: Record<string, string> = { commuter: "\u{1F697} Daily commuter", family: "\u{1F3E0} Family car", road_trip: "\u{1F5FA}\uFE0F Road tripper", drivers_car: "\u{1F3CE}\uFE0F Driver\u2019s car", work_horse: "\u{1F6E0}\uFE0F Work horse", head_turner: "\u2728 Head turner", show_with_soul: "\u{1F525} Show + soul", weekend_adventure: "\u26F0\uFE0F Adventurer", professional_driver: "\u{1F4BC} Professional", first_car: "\u{1F510} First car", all_rounder: "\u{1F504} All-rounder" };
  if (missionLabels[mission]) r.push(missionLabels[mission]);
  const d = c._dims;
  if (d) {
    const dims = [{ n: "Practical fit", s: d.practical, e: "\u{1F3E0}" }, { n: "Financial fit", s: d.financial, e: "\u{1F4B0}" }, { n: "Preference match", s: d.preference, e: "\u2B50" }, { n: "Safety rating", s: d.safety, e: "\u{1F6E1}\uFE0F" }];
    dims.sort((a, b) => b.s - a.s);
    if (dims[0].s >= 25) r.push(dims[0].e + " " + dims[0].n + " " + dims[0].s + "/35");
    if (dims[1].s >= 22) r.push(dims[1].e + " " + dims[1].n + " " + dims[1].s + "/35");
  }
  if (c.reliability === "Excellent" && r.length < 3) r.push("\u{1F3C6} Top reliability");
  if ((c.ncapStars || 0) >= 5 && r.length < 3) r.push("\u{1F6E1}\uFE0F 5-star NCAP");
  if ((c.boot || 0) >= 500 && r.length < 3) r.push("\u{1F4E6} " + c.boot + "L boot");
  if (c.resaleValue === "holds_well" && getResaleRelevance(a) >= 0.6 && r.length < 3) r.push("\u{1F48E} Holds value");
  return r.slice(0, 3).join(" \u00B7 ") || "Good overall match";
}
// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("hero");
  const [DB, setDB] = useState<CarData[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [qStep, setQStep] = useState(0);
  const [ans, setAns] = useState<Answers>({});
  const [results, setResults] = useState<ScoredCar[]>([]);
  const [openMore, setOpenMore] = useState<Record<string, boolean>>({});
  const [faultDB, setFaultDB] = useState<Record<string, DetailData>>({});
  const [loadFault, setLoadFault] = useState<Record<string, boolean>>({});
  const [openEng, setOpenEng] = useState<Record<string, boolean>>({});
  const [pinned, setPinned] = useState<string[]>([]);
  const [loadStep, setLoadStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [showScroll, setShowScroll] = useState(false);
  const scrollTimerRef = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/cars");
        if (!r.ok) throw new Error("Failed to load cars");
        const all = await r.json();
        setDB(all); setDbLoaded(true);
      } catch (e) { console.error("DB:", e); setDbError(true); }
    })();
  }, []);

  const startLoading = useCallback(() => {
    setPhase("loading"); setLoadStep(0);
    [500, 900, 1400, 2000].forEach((ms, i) => setTimeout(() => setLoadStep(i + 1), ms));
    const minDelay = new Promise((resolve) => setTimeout(resolve, 2500));
    const fetchResults = fetch("/api/recommend", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ans),
    }).then((r) => r.json());
    Promise.all([fetchResults, minDelay])
      .then(([scored]) => setResults(scored))
      .catch((e) => { console.error("Algorithm error:", e); setResults([]); })
      .finally(() => setPhase("results"));
  }, [ans]);

  const loadDetail = useCallback(async (car: CarData) => {
    const id = car.id; if (faultDB[id] || loadFault[id]) return;
    setLoadFault((p) => ({ ...p, [id]: true }));
    try {
      const c = car;
      const r = await fetch("/api/detail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: c.id }),
      });
      const data = await r.json();
      setFaultDB((p) => ({ ...p, [id]: data }));
    } catch (e) {
      console.error(e);
      setFaultDB((p) => ({ ...p, [id]: { e: [], t: [], c: [], pros: [], cons: [], q: [], b: "Could not load data." } }));
    }
    setLoadFault((p) => ({ ...p, [id]: false }));
  }, [faultDB, loadFault]);

  const Q = QUESTIONS;
  const q = Q[qStep];
  const isMulti = q?.type === "multi";
  const canNext = isMulti ? (Array.isArray(ans[q?.id]) && (ans[q?.id] as string[]).length === (q?.maxSelect || 2)) : !!ans[q?.id];
  const togglePin = (id: string) => setPinned((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  // Expanded "More info" panel — shared by results cards and browse cards.
  // `userFuel` drives the engine/fuel-tag filtering; it's `ans.fuel` in results.
  function renderMorePanel(c: CarData, userFuel: string) {
    const fd = faultDB[c.id];
    const isLoadingFault = loadFault[c.id];
    const stars = carStars(c);
    const adult = carAdult(c);
    const child = c._n ? c.ncapChild : c.safety?.childOccupant;
    const ped = c._n ? c.ncapPed : c.safety?.pedestrian;
    const assist = c._n ? c.ncapAssist : c.safety?.safetyAssist;
    const ncapYear = c._n ? c.ncapYear : c.safety?.ncapYear;
    return (
      <div className="more-panel">
        {isLoadingFault && <div className="loading-spin"><div className="spin" /><span>Analysing {c.make} {c.model}...</span></div>}
        {!isLoadingFault && fd && (<>
          {/* Engines — filtered by fuel, highlighted by mission */}
          {fd.e?.length > 0 && (
            <div className="mp-section">
              <div className="mp-title">{"\u{1F529}"} Engine Options</div>
              <div className="mp-hint">Tap to expand. {"⭐"} = recommended for your profile.</div>
              {fd.e.filter((e: any) => {
                if (!userFuel || userFuel === "open") return true;
                const ft = ((e.fuel_type || "") + " " + (e.engine || "")).toLowerCase();
                if (userFuel === "petrol") return ft.includes("petrol") || ft.includes("tsi") || ft.includes("mpi") || ft.includes("fsi") || ft.includes("htp");
                if (userFuel === "diesel") return ft.includes("diesel") || ft.includes("tdi") || ft.includes("sdi");
                if (userFuel === "electric") return ft.includes("electric") || ft.includes("ev");
                if (userFuel === "hybrid") return ft.includes("hybrid") || ft.includes("phev") || ft.includes("etec");
                return true;
              }).map((e: any, ei: number) => {
                const k = `${c.id}-e${ei}`; const isE = openEng[k]; const rc = RC[e.reliability] || "#888";
                const pw = e.power_kw || 0;
                const maxPw = Math.max(...(fd.e.map((x: any) => x.power_kw || 0)));
                const minPw = Math.min(...(fd.e.filter((x: any) => (x.power_kw || 0) > 0).map((x: any) => x.power_kw || 0)));
                const isPerf = ans.mission === "drivers_car" || ans.mission === "show_with_soul" || (Array.isArray(ans.priorities) && ans.priorities.includes("driving_pleasure"));
                const isHeavy = ans.space === "large" || ans.space === "maximum" || ans.mission === "weekend_adventure" || ans.towing === "medium" || ans.towing === "heavy";
                const isEco = ans.mission === "commuter" || (Array.isArray(ans.priorities) && ans.priorities.includes("low_cost"));
                const isRec = (isPerf && pw === maxPw) || (isHeavy && pw === maxPw) || (isEco && pw === minPw && minPw > 0);
                return (
                  <div key={k} className={`eng-card${isE ? " open" : ""}${isRec ? " eng-rec" : ""}`} onClick={() => setOpenEng((p) => ({ ...p, [k]: !p[k] }))}>
                    <div className="eng-hdr"><div className="eng-left"><span className="eng-name">{e.engine}</span><div className="eng-tags"><span className="eng-badge" style={{ background: rc + "22", color: rc, border: `1px solid ${rc}44` }}>{e.reliability}</span>{isRec && <span className="eng-badge" style={{ background: "rgba(232,255,71,.15)", color: "#e8ff47", border: "1px solid rgba(232,255,71,.3)" }}>{"⭐"} Recommended</span>}</div></div><span className="chevron">{isE ? "▲" : "▼"}</span></div>
                    {isE && (<div className="eng-body">
                      {e.faults?.length > 0 && <><div className="sub-label">{"⚠️"} Known faults</div>{e.faults.map((f: string, fi: number) => <div key={fi} className="fault-item">{"·"} {f}</div>)}</>}
                      {e.pros?.length > 0 && <><div className="sub-label">{"✅"} Pros</div>{e.pros.map((p: string, pi: number) => <div key={pi} className="pro-item">{"·"} {p}</div>)}</>}
                      {e.cons?.length > 0 && <><div className="sub-label">{"❌"} Cons</div>{e.cons.map((cn: string, ci: number) => <div key={ci} className="con-item">{"·"} {cn}</div>)}</>}
                    </div>)}
                  </div>
                );
              })}
            </div>
          )}

          {/* Transmissions — filtered + highlighted */}
          {fd.t?.length > 0 && (
            <div className="mp-section">
              <div className="mp-title">{"⚙️"} Transmissions</div>
              {fd.t.filter((t: any) => {
                const tp = ans.transmission as string;
                if (!tp || tp === "no_pref" || tp === "prefer_manual" || tp === "prefer_auto") return true;
                const tt = (t.trans_type || t.type || "").toLowerCase();
                if (tp === "only_manual") return tt.includes("manual");
                if (tp === "only_auto") return !tt.includes("manual");
                return true;
              }).map((t: any, ti: number) => {
                const k = `${c.id}-t${ti}`; const isT = openEng[k]; const rc = RC[t.reliability] || "#888";
                const name = (t.type || "").toLowerCase();
                const userTx = ans.transmission as string;
                const prefersAuto = userTx === "prefer_auto" || userTx === "only_auto";
                const prefersManual = userTx === "prefer_manual" || userTx === "only_manual";
                const isAuto = /auto|dsg|cvt|dct|ecvt|e-cvt|amt/.test(name);
                const isManual = name.includes("manual");
                const txRec = (prefersAuto && isAuto) || (prefersManual && isManual) || (!prefersAuto && !prefersManual && isAuto);
                return (
                  <div key={k} className={`tx-card${isT ? " open" : ""}${txRec ? " tx-rec" : ""}`} onClick={() => setOpenEng((p) => ({ ...p, [k]: !p[k] }))}>
                    <div className="eng-hdr"><div className="eng-left"><span className="eng-name">{t.type}</span><span className="eng-badge" style={{ background: rc + "22", color: rc, border: `1px solid ${rc}44` }}>{t.reliability}</span>{txRec && <span className="eng-badge" style={{ background: "rgba(232,255,71,.15)", color: "#e8ff47", border: "1px solid rgba(232,255,71,.3)" }}>{"⭐"} Rec</span>}</div><span className="chevron">{isT ? "▲" : "▼"}</span></div>
                    {isT && <div className="eng-body">{t.detail && <div style={{ fontSize: ".78rem", color: "#9999aa", marginBottom: 4 }}>{t.detail}</div>}{t.tip && <div style={{ fontSize: ".78rem", color: "#e8ff47", marginTop: 4 }}>{"\u{1F4A1}"} {t.tip}</div>}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Vehicle Common Issues */}
          {fd.c?.length > 0 && (
            <div className="mp-section">
              <div className="mp-title">{"⚠️"} Vehicle Common Issues</div>
              {fd.c.map((f: any, fi: number) => {
                const sc: Record<string, string> = { Critical: "#f44336", High: "#ff9800", Medium: "#e8ff47", Low: "#4caf50" };
                const color = sc[f.severity] || "#888";
                return (<div key={fi} className="fault-block"><div className="fault-hdr"><span className="fault-area">{f.area}</span><span className="fault-sev" style={{ background: color + "22", color, border: `1px solid ${color}44` }}>{f.severity}</span></div><div className="fault-detail">{f.detail}</div></div>);
              })}
            </div>
          )}

          {/* Pros & Cons */}
          {(fd.pros?.length > 0 || fd.cons?.length > 0) && (
            <div className="mp-section">
              <div className="mp-title">{"\u{1F44D}\u{1F44E}"} Pros &amp; Cons</div>
              <div className="pros-grid">
                {fd.pros?.length > 0 && <div><div className="pc-label g">Pros</div>{fd.pros.map((p: string, i: number) => <div key={i} className="pc-item g">{"✓"} {p}</div>)}</div>}
                {fd.cons?.length > 0 && <div><div className="pc-label r">Cons</div>{fd.cons.map((cn: string, i: number) => <div key={i} className="pc-item r">{"✗"} {cn}</div>)}</div>}
              </div>
            </div>
          )}

          {/* Safety */}
          <div className="mp-section">
            <div className="mp-title">{"\u{1F6E1}️"} Safety {"—"} Euro NCAP</div>
            {stars != null ? (
              <div className="ncap-detail">
                <div className="ncap-stars-row">{[1,2,3,4,5].map((n) => <span key={n} className={`ns-lg${n <= (stars || 0) ? " on" : ""}`}>{"★"}</span>)}<span className="ns-label">{stars}/5{ncapYear ? ` · ${ncapYear}` : ""}</span></div>
                {[{ l: "Adult", v: adult }, { l: "Child", v: child }, { l: "Pedestrian", v: ped }, { l: "Safety Assist", v: assist }].filter((b) => b.v != null).map((b) => (
                  <div key={b.l} className="ncap-bar"><span className="ncap-bl">{b.l}</span><div className="ncap-track"><div className="ncap-fill" style={{ width: b.v + "%", background: (b.v || 0) >= 90 ? "#4caf50" : (b.v || 0) >= 75 ? "#e8ff47" : (b.v || 0) >= 60 ? "#ff9800" : "#f44336" }} /></div><span className="ncap-pv">{b.v}%</span></div>
                ))}
                <div className="ncap-verdict" style={{ color: (stars || 0) >= 5 ? "#4caf50" : (stars || 0) >= 4 ? "#e8ff47" : "#ff9800" }}>{(stars || 0) >= 5 ? "Outstanding safety" : (stars || 0) >= 4 ? "Good — 4 stars" : (stars || 0) >= 3 ? "⚠️ Below average" : "⚠️ Poor rating"}</div>
              </div>
            ) : <div className="ncap-na">{"⚠️"} Not tested by Euro NCAP</div>}
          </div>

          {/* Equipment — highlighted */}
          {((c.equipment && c.equipment.length > 0) || (fd.q?.length > 0)) && (
            <div className="mp-section">
              <div className="mp-title">{"\u{1F39B}️"} Equipment Levels</div>
              {(c.equipment || fd.q || []).map((eq: any, eqi: number) => {
                const total = (c.equipment || fd.q || []).length;
                const eqPref = ans.equipment as string;
                const isHighlighted = total <= 1 ||
                  (eqPref === "full" && eqi >= Math.ceil(total / 2)) ||
                  (eqPref === "tech" && eqi > 0 && eqi < total - 1) ||
                  (eqPref === "basic" && eqi === 0) ||
                  (eqPref === "value" && eqi === 0);
                return (
                  <div key={eqi} className={"eq-item" + (isHighlighted ? " eq-highlight" : "")}>
                    <div className="eq-trim">{eq.trim}</div>
                    <div className="eq-feats">{Array.isArray(eq.features) ? eq.features.join(" · ") : eq.features}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="buy-tip"><div className="bt-label">{"\u{1F4A1}"} Buying Tip</div><div className="bt-text">{fd.b || c.buyingTip || c.faults?.buyingTip || "Check service history."}</div></div>
        </>)}
      </div>
    );
  }

 function selectOption(qId: string, val: string, isMultiQ: boolean, maxSel: number) {
    if (isMultiQ) {
      setAns((prev) => {
        const arr = (Array.isArray(prev[qId]) ? prev[qId] : []) as string[];
        if (arr.includes(val)) return { ...prev, [qId]: arr.filter((x) => x !== val) };
        if (arr.length >= maxSel) return prev;
        return { ...prev, [qId]: [...arr, val] };
      });
    } else {
      setAns((prev) => ({ ...prev, [qId]: val }));
      setTimeout(() => goStep(1), 300);
    }
  }
  useEffect(() => {
    const q = QUESTIONS[qStep];
    if (q?.type === "multi" && Array.isArray(ans[q.id])) {
      const arr = ans[q.id] as string[];
      if (arr.length === (q.maxSelect || 2)) {
        const t = setTimeout(() => goStep(1), 400);
        return () => clearTimeout(t);
      }
    }
  }, [ans, qStep]);

  const goStep = (dir: number) => {
    setAnimKey((k) => k + 1);
    setShowScroll(true);
    const nextQ = QUESTIONS[dir > 0 ? qStep + 1 : qStep - 1];
    const delay = nextQ?.type === "multi" ? 5000 : 2500;
    setTimeout(() => setShowScroll(false), delay);
    if (dir > 0) { if (qStep < Q.length - 1) setQStep((s) => s + 1); else startLoading(); }
    else setQStep((s) => s - 1);
  };
  // Hide scroll arrow on any scroll
  useEffect(() => {
    const hide = () => setShowScroll(false);
    window.addEventListener("scroll", hide, { passive: true });
    return () => window.removeEventListener("scroll", hide);
  }, []);

  // Show scroll arrow on first quiz load
  useEffect(() => {
    if (phase === "quiz") {
      setShowScroll(true);
      const q = QUESTIONS[qStep];
      const delay = q?.type === "multi" ? 8000 : 2500;
      setTimeout(() => setShowScroll(false), delay);
    }
  }, [phase, qStep]);

  const reset = () => {
    setPhase("hero"); setQStep(0); setAns({});
    setResults([]); setOpenMore({}); setFaultDB({}); setLoadFault({}); setOpenEng({}); setPinned([]); setLoadStep(0);
  };

  // Recommendation for fuel/transmission
  const fuelRec = q?.id === "fuel" && Object.keys(ans).length >= 13 ? getRecommendedFuel(ans) : null;
  const transRec = q?.id === "transmission" ? getRecommendedTransmission(ans) : null;
  const recValue = q?.id === "fuel" ? fuelRec : q?.id === "transmission" ? transRec : null;
  const recReason = recValue ? (q?.id === "fuel" ? getFuelReason(recValue, ans) : getTransReason(recValue, ans)) : null;

  return (
    <div className="w">
      <header className="hdr">
        <div className="logo">Auto<span>Match</span></div>
        <div className="tg">EU Car Advisor{dbLoaded ? ` \u00B7 ${DB.length} Models` : ""}</div>
      </header>

      {/* HERO */}
      {phase === "hero" && (
        <div className="hero">
          <h2>Find Your Perfect Car</h2>
          <p>Answer 16 questions about your lifestyle, needs, and budget. Our algorithm cross-references real data to deliver your top matches with reliability reports, engine faults, and safety ratings.</p>
          {dbError && <div className="err-msg">{"\u26A0\uFE0F"} Could not load database.</div>}
          {!dbLoaded && !dbError && <div className="load-msg">{"\u27F3"} Loading car database...</div>}
          {dbLoaded && <div className="db-ok">{"\u2713"} {DB.length} cars loaded</div>}
          <button className="btn-go" disabled={!dbLoaded} onClick={() => setPhase("quiz")}>Find My Car {"\u2192"}</button>
          <p style={{ marginTop: 26, marginBottom: 8, fontSize: ".8rem", color: "#6b6b72" }}>Already know roughly what you want?</p>
          <Link href="/prehlad" className="btn-back" style={{ display: "block", textDecoration: "none", textAlign: "center" }}>{"\u{1F50E}"} Preh\u013ead {"\u2014"} browse &amp; compare</Link>
        </div>
      )}

      {/* QUIZ */}
      {phase === "quiz" && (
        <div className="qshell">
          <div className="ptrack"><div className="pfill" style={{ width: ((qStep + 1) / Q.length * 100) + "%" }} /></div>
          <div key={animKey} className="q-anim">
            <div className="step-info">
              <span className="step-num">{qStep + 1} / {Q.length}</span>
            </div>
            <div className="q-text">{q.title}</div>
            <div style={{ fontSize: ".8rem", color: "#6b6b72", marginBottom: 16 }}>
              {q.subtitle}
              {isMulti && <span style={{ display: "block", marginTop: 6, fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.3rem", color: "#e8ff47", letterSpacing: "1px" }}>PICK EXACTLY {q.maxSelect} OPTIONS</span>}
            </div>

            {/* Recommendation badge for fuel/transmission */}
            {recValue && recReason && (
              <div style={{ background: "rgba(232,255,71,.06)", border: "1px solid rgba(232,255,71,.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: ".7rem", color: "#e8ff47", fontWeight: 700, marginBottom: 4 }}>{"\u2B50"} OUR RECOMMENDATION</div>
                <div style={{ fontSize: ".82rem", color: "#ccc" }}>{recReason}</div>
              </div>
            )}

            {q.options.map((c) => {
              const isSelected = isMulti
                ? (Array.isArray(ans[q.id]) && (ans[q.id] as string[]).includes(c.value))
                : ans[q.id] === c.value;
              const isRec = recValue === c.value;
              return (
                <button key={c.label} className={`opt-btn${isSelected ? " sel" : ""}`}
                  style={isRec && !isSelected ? { borderColor: "rgba(232,255,71,.3)", background: "rgba(232,255,71,.03)" } : {}}
                  onClick={() => selectOption(q.id, c.value, isMulti, q.maxSelect || 2)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{c.label}</span>
                    {isRec && <span style={{ fontSize: ".65rem", color: "#e8ff47", fontWeight: 600 }}>{"\u2B50"} REC</span>}
                  </div>
                  <div className="opt-desc">{c.desc}</div>
                </button>
              );
            })}
          </div>
          <div className="nav-row">
            {qStep > 0 && <button className="btn-back" onClick={() => goStep(-1)}>{"\u2190"} Back</button>}
            {qStep === Q.length - 1 && (
              <button className="btn-next" disabled={!canNext} onClick={() => goStep(1)}>
                {"\u{1F50D} Show Results"}
              </button>
            )}
          </div>
          {/* Scroll indicator */}
          {showScroll && phase === "quiz" && (
            <div className="scroll-hint" onClick={() => setShowScroll(false)}>
              {isMulti && <div className="scroll-hint-text">Choose {q.maxSelect} options</div>}
              <div className="scroll-chevrons">
                <span className="scroll-chev c1"></span>
                <span className="scroll-chev c2"></span>
                <span className="scroll-chev c3"></span>
              </div>
            </div>
          )}
         </div>
         )}

      {/* LOADING */}
      {phase === "loading" && (
        <div className="load-phase">
          <div className="spin-big" />
          <h3 style={{ fontFamily: "'Bebas Neue'", color: "#e8ff47", fontSize: "1.3rem", marginBottom: 16 }}>Analysing {DB.length} Cars...</h3>
          <ul className="load-steps">
            <li className={loadStep >= 1 ? "done" : loadStep === 0 ? "active" : ""}>{"\u{1F50D}"} Scanning {DB.length} models...</li>
            <li className={loadStep >= 2 ? "done" : loadStep === 1 ? "active" : ""}>{"\u2699\uFE0F"} Matching your profile...</li>
            <li className={loadStep >= 3 ? "done" : loadStep === 2 ? "active" : ""}>{"\u{1F4CA}"} Ranking by compatibility...</li>
            <li className={loadStep >= 4 ? "done" : loadStep === 3 ? "active" : ""}>{"\u2705"} Preparing your results...</li>
          </ul>
        </div>
      )}

      {/* RESULTS */}
      {phase === "results" && (<>
        <div className="results-hdr"><h3>Your Top Matches</h3><div className="tg">{results.length} cars ranked for you</div></div>

        {ans.mission && (
          <div className="id-reveal">
            <div className="id-reveal-label">{"\u{1F3AF}"} Mission: {QUESTIONS.find(q => q.id === "mission")?.options.find(o => o.value === ans.mission)?.label}</div>
          </div>
        )}

        {/* Compare */}
        {pinned.length >= 2 && (
          <div className="compare-wrap">
            <h4>{"\u{1F4CA}"} Compare ({pinned.length} cars)</h4>
            <table className="compare-table">
              <thead><tr><th>Spec</th>{results.filter((r) => pinned.includes(r.car.id)).map(({ car: c }) => <th key={c.id}>{c.make} {c.model}</th>)}</tr></thead>
              <tbody>
                {[
                  { l: "Match", f: (r: ScoredCar) => r.score + "%" },
                  { l: "Price", f: (r: ScoredCar) => "\u20AC" + fmtK(r.car.budgetMin || 0) + "\u2013\u20AC" + fmtK(r.car.budgetMax || 0) },
                  { l: "Type", f: (r: ScoredCar) => blLabel(r.car.body) },
                  { l: "Reliability", f: (r: ScoredCar) => String(r.car.reliability || "\u2014") },
                  { l: "Seats", f: (r: ScoredCar) => String(r.car.seats || "\u2014") },
                  { l: "Boot", f: (r: ScoredCar) => (r.car.boot || "\u2014") + "L" },
                  { l: "Safety", f: (r: ScoredCar) => r.car.ncapStars != null ? r.car.ncapStars + "\u2605" : "N/A" },
                  { l: "Fuel", f: (r: ScoredCar) => r.car.fuel.join(", ") },
                ].map((row) => (
                  <tr key={row.l}><td>{row.l}</td>{results.filter((r) => pinned.includes(r.car.id)).map((r) => <td key={r.car.id}>{row.f(r)}</td>)}</tr>
                ))}
              </tbody>
            </table>
            <button className="compare-clear" onClick={() => setPinned([])}>Clear comparison</button>
          </div>
        )}

        {/* Cards */}
        {results.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#6b6b72" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>{"\u{1F50D}"}</div>
            <p>No vehicles matched your filters. Try adjusting your budget or preferences.</p>
            <button className="restart" onClick={reset} style={{ marginTop: 16 }}>{"\u21BB"} Start Over</button>
          </div>
        )}

        {results.map(({ car, score, isBest }, i) => {
          const c = car; const isOpen = openMore[c.id];
          const isPinned = pinned.includes(c.id); const lnk = getLinks(c);
          const reason = getScoreReason(c, ans);
          const relColor = RC[String(c.reliability)] || "#888";
          const userFuel = ans.fuel as string;
const dispCons = getConsumptionForFuel(c, userFuel);
const dispPower = getPowerForFuel(c, userFuel);
          const isUnpluggedPhev =
            (c.fuel || []).some((f) => f.toLowerCase() === "phev") &&
            (userFuel === "hybrid" || userFuel === "open") &&
            ans.charging === "no";
          return (
            <div key={c.id} className={`card${isBest ? " best" : ""}`} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="card-top">
                <div className="card-badges">
                  <span className="num-badge">{isBest ? "\u2605 #1" : `#${i + 1}`}</span>
                  <span className="rel-pill" style={{ background: relColor + "22", color: relColor, border: `1px solid ${relColor}44` }}>{String(c.reliability)}</span>
                  <span className="origin-tag">{car.originFlag || "\u{1F30D}"} {(car.origin || "").charAt(0).toUpperCase() + (car.origin || "").slice(1)}</span>
                </div>
                <div className="match-pct">{score}%</div>
              </div>
              <div className="cmake">{c.make}</div>
              <div className="cmodel">{c.model}</div>
              <div className="cgen">{c.gen} {"\u00B7"} {c.years}</div>
              <div className="mbar"><div className="mfill" style={{ width: score + "%" }} /></div>
              <div className="score-reason">{"\u{1F4A1}"} {reason}</div>
              <div className="cgrid">
                <div className="cgrid-item"><div className="cgrid-label">Type</div><div className="cgrid-val">{blLabel(c.body)}</div></div>
                <div className="cgrid-item"><div className="cgrid-label">Seats</div><div className="cgrid-val">{c.seats || "\u2014"}</div></div>
                <div className="cgrid-item"><div className="cgrid-label">Boot</div><div className="cgrid-val">{c.boot ? c.boot + "L" : "\u2014"}</div></div>
                <div className="cgrid-item"><div className="cgrid-label">Drive</div><div className="cgrid-val">{c.hasAWD ? "AWD" : (c.drivetrains || [])[0] || "FWD"}</div></div>
                
              </div>
              { (c.towingCapacity || dispCons) && (
              <div className="cgrid" style={{ marginTop: 0 }}>
                {dispCons && <div className="cgrid-item"><div className="cgrid-label">Consumption</div><div className="cgrid-val">{dispCons} {(c.fuel || []).some((f) => f.toLowerCase() === "electric") && userFuel === "electric" ? "kWh/100" : "l/100"}{isUnpluggedPhev && <span style={{ fontSize: "0.6rem", color: "#ff9944", marginLeft: 4 }}>{"⚠️"} if charged</span>}</div></div>}
                {c.towingCapacity && <div className="cgrid-item"><div className="cgrid-label">Towing</div><div className="cgrid-val">{c.towingCapacity} kg</div></div>}
                {c.groundClearance && <div className="cgrid-item"><div className="cgrid-label">Clearance</div><div className="cgrid-val">{c.groundClearance} mm</div></div>}
                {dispPower && <div className="cgrid-item"><div className="cgrid-label">Power</div><div className="cgrid-val">{dispPower} kW</div></div>}
                {c.resaleValue && <div className="cgrid-item"><div className="cgrid-label">Resale</div><div className="cgrid-val">{({holds_well: "💎 Holds value", average: "Average", depreciates_fast: "📉 Drops fast"} as Record<string,string>)[c.resaleValue] || c.resaleValue}</div></div>}
              </div>
              )}
              <div className="cprice">{"\u20AC"}{fmtK(c.budgetMin || 0)} {"\u2013"} {"\u20AC"}{fmtK(c.budgetMax || 0)}</div>
              <div className="cmileage">{c.mileageRange}</div>
              <div className="cfuels">{c.fuel.filter((f) => {
                if (!userFuel || userFuel === "open") return true;
                const ft = f.toLowerCase();
                if (userFuel === "petrol") return ft.includes("petrol") || ft.includes("gasoline");
                if (userFuel === "diesel") return ft.includes("diesel");
                if (userFuel === "electric") return ft.includes("electric");
                if (userFuel === "hybrid") return ft.includes("hybrid") || ft.includes("phev");
                return true;
              }).map((f) => <span key={f} className="cfuel-tag">{flLabel(f)}</span>)}</div>
              <div className="safety-row">
                <span className="safety-label">Safety</span>
                {c.ncapStars != null
                  ? [1,2,3,4,5].map((n) => <span key={n} className={`nstar${n <= (c.ncapStars || 0) ? " on" : ""}`}>{"\u2605"}</span>)
                  : <span style={{ fontSize: ".75rem", color: "#6b6b72" }}>Not tested</span>}
                {c.ncapAdult != null && <span className="ncap-pct">{c.ncapAdult}%</span>}
              </div>
              {/* Critical warnings */}
              {(c.vehicleFaults || []).filter((f: any) => (f.severity === "critical" || f.severity === "high") && faultRelevant(f.issue, userFuel)).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {(c.vehicleFaults || []).filter((f: any) => (f.severity === "critical" || f.severity === "high") && faultRelevant(f.issue, userFuel)).slice(0, 2).map((f: any, fi: number) => (
                    <div key={fi} style={{ fontSize: ".72rem", color: f.severity === "critical" ? "#f44336" : "#ff9800", marginBottom: 3, lineHeight: 1.4 }}>
                      {f.severity === "critical" ? "\u{1F6A8}" : "\u26A0\uFE0F"} {f.issue}
                    </div>
                  ))}
                </div>
              )}
              <div className="links">
                <a className="link-btn link-as" href={lnk.as} target="_blank" rel="noopener noreferrer">{"\u{1F50D}"} AutoScout24</a>
                <a className="link-btn link-ab" href={lnk.ab} target="_blank" rel="noopener noreferrer">{"\u{1F1F8}\u{1F1F0}"} AutoBazar</a>
                <a className="link-btn link-mo" href={lnk.mo} target="_blank" rel="noopener noreferrer">{"\u{1F50D}"} Mobile.de</a>
              </div>
              <div className="card-actions">
                <button className={`btn-pin${isPinned ? " on" : ""}`} onClick={() => togglePin(c.id)}>{isPinned ? "\u{1F4CC} Pinned" : "\u{1F4CC} Compare"}</button>
                <button className="btn-more" onClick={() => { setOpenMore((p) => ({ ...p, [c.id]: !p[c.id] })); if (!openMore[c.id]) loadDetail(car); }}>{isOpen ? "\u25B2 Less info" : "\u25BC More info"}</button>
              </div>

              {/* MORE INFO PANEL */}
              {isOpen && renderMorePanel(c, userFuel)}
            </div>
          );
        })}
        <button className="restart" onClick={reset}>{"\u21BB"} Start Over</button>
      </>)}

    </div>
  );
}