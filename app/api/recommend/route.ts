import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Načítanie kľúčov z prostredia
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: Request) {
  try {
    // Ochrana 1: Skontrolujeme, či Next.js vôbec vidí kľúče k databáze
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Chýbajú konfiguračné kľúče k Supabase v .env.local!' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Zachytenie požiadavky z frontendu
    const body = await request.json();
    const { budget, minBootCapacity, seatsNeeded, preferredFuel } = body;

    // Pokus o dopyt na Supabase
    const { data: vehicles, error: supabaseError } = await supabase
      .from('vehicles')
      .select(`
        *,
        engines (*),
        transmissions (*)
      `);

    // Ochrana 2: Ak vrátila chybu samotná databáza (napr. zlý názov stĺpca)
    if (supabaseError) {
      return NextResponse.json({ error: `Supabase chyba: ${supabaseError.message} (Kód: ${supabaseError.code})` }, { status: 500 });
    }

    if (!vehicles) {
      return NextResponse.json({ error: 'Žiadne vozidlá sa v databáze nenašli' }, { status: 404 });
    }

    // BODOVACÍ ALGORITMUS
    const scoredVehicles = vehicles.map((car: any) => {
      let score = 100;

      // Kritérium: Rozpočet
      if (car.avg_market_price_eur > budget) {
        const overBudgetDifference = car.avg_market_price_eur - budget;
        score -= Math.min(50, Math.floor(overBudgetDifference / 1000) * 10);
      } else if (car.price_range_max_eur <= budget) {
        score += 5;
      }

      // Kritérium: Objem kufra
      if (car.boot_capacity_liters < minBootCapacity) {
        const bootDifference = minBootCapacity - car.boot_capacity_liters;
        score -= Math.min(40, Math.floor(bootDifference / 50) * 15);
      }

      // Kritérium: Počet sedadiel
      if (car.seats_count < seatsNeeded) {
        score -= 50;
      }

      // Kritérium: Palivo
      if (preferredFuel !== 'Any') {
        // Ochrana 3: Použijeme bezpečné overenie pre prípad, že by pole motorov bolo null alebo chýbalo
        const enginesList = car.engines || [];
        const hasPreferredEngine = enginesList.some(
          (engine: any) => engine.fuel_type?.toLowerCase() === preferredFuel.toLowerCase()
        );
        if (!hasPreferredEngine) {
          score -= 30;
        }
      }

      const finalMatchPercentage = Math.max(0, Math.min(100, score));

      return {
        ...car,
        matchPercentage: finalMatchPercentage
      };
    });

    // Zoradenie výsledkov
    const sortedRecommendations = scoredVehicles
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 10);

    return NextResponse.json(sortedRecommendations);

  } catch (err: any) {
    // Ochrana 4: Zachytenie akéhokoľvek neočakávaného pádu kódu a poslanie popisu na obrazovku
    return NextResponse.json({ error: `Kritická chyba na backendu: ${err.message || err}` }, { status: 500 });
  }
}

// Pomocný GET handler pre overenie cez prehliadač
export async function GET() {
  return NextResponse.json({ 
    status: "online", 
    message: "Riadiaca jednotka algoritmu reaguje správne!" 
  });
}