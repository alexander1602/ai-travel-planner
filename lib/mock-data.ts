// lib/mock-data.ts
// Dati realistici usati quando nessuna chiave AI è configurata o in modalità fallback.

import type { HotelOption, Trip } from "@/types/trip";

function extractBudget(prompt: string): number {
  const match = prompt.match(/(\d{3,5})\s*(€|eur|euro)?/i);
  return match ? Number(match[1]) : 1500;
}

function extractDays(prompt: string): number {
  const match = prompt.match(/(\d{1,2})\s*(giorni|days|day)/i);
  if (match) return Number(match[1]);
  if (/weekend/i.test(prompt)) return 2;
  return 5;
}

export function extractDestination(prompt: string, explicitDestination?: string): string {
  if (explicitDestination && explicitDestination.trim().length > 0) {
    return explicitDestination.trim();
  }

  const knownMap: Record<string, string> = {
    avignone: "Avignone",
    avignon: "Avignone",
    japan: "Giappone",
    giappone: "Giappone",
    paris: "Parigi",
    parigi: "Parigi",
    rome: "Roma",
    roma: "Roma",
    bali: "Bali",
    "new york": "New York",
    tokyo: "Tokyo",
    kyoto: "Kyoto",
    osaka: "Osaka",
    londra: "Londra",
    london: "Londra",
    madrid: "Madrid",
    barcellona: "Barcellona",
    barcelona: "Barcellona",
    berlino: "Berlino",
    berlin: "Berlino",
    amsterdam: "Amsterdam",
    lisbona: "Lisbona",
    lisbon: "Lisbona",
    firenze: "Firenze",
    venezia: "Venezia",
    milano: "Milano",
    napoli: "Napoli",
  };

  const promptLower = prompt.toLowerCase();
  for (const [key, canonical] of Object.entries(knownMap)) {
    if (promptLower.includes(key)) {
      return canonical;
    }
  }

  // Regex pattern 1: "Viaggio a/ad/in/per <Destination>"
  const matchTravelTo = prompt.match(
    /(?:viaggio|itinerario|vacanza|tappa|tour|visita)\s+(?:a|ad|in|per)\s+([^.,;:\(\)\d]+)/i
  );
  if (matchTravelTo && matchTravelTo[1]) {
    const raw = matchTravelTo[1].trim();
    const cleaned = raw
      .replace(/\s+(?:di|dal|per|con|stile|dettagli|in|del|della|degli|budget).*/i, "")
      .trim();
    if (cleaned.length >= 2) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }

  // Regex pattern 2: "a <Destination>", "in <Destination>"
  const matchPrep = prompt.match(
    /\b(?:a|ad|in|per)\s+([A-ZÀ-ÖØ-öø-ÿa-z\s\-']+?)(?=\s+(?:di|dal|per|con|budget|giorni|days|weekend|[.,;:]|$))/i
  );
  if (matchPrep && matchPrep[1]) {
    const cleaned = matchPrep[1].trim();
    if (
      cleaned.length >= 2 &&
      !["un", "una", "uno", "questo", "questa"].includes(cleaned.toLowerCase())
    ) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }

  // Fallback: extract first valid non-stopword word
  const words = prompt
    .replace(/[.,;:]/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        !/^(viaggio|itinerario|vacanza|giorni|giorno|days|day|budget|euro|eur|€|per|di|dal|al|con|weekend|stile)$/i.test(
          w
        ) && !/^\d+$/.test(w)
    );

  if (words.length > 0 && words[0] && words[0].length >= 2) {
    const cand = words[0];
    return cand.charAt(0).toUpperCase() + cand.slice(1);
  }

  return "Destinazione";
}

function buildDateRange(startDate?: string, endDate?: string, durationDays?: number): string[] {
  if (!startDate) return [];

  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];

  const effectiveDays =
    durationDays ??
    (endDate
      ? Math.max(
          1,
          Math.floor(
            (new Date(`${endDate}T00:00:00`).getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1
        )
      : 0);

  return Array.from({ length: effectiveDays }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current.toISOString().slice(0, 10);
  });
}

function buildCityPlan(destination: string, durationDays: number): string[] {
  const lower = destination.toLowerCase();

  if (lower.includes("japan") || lower.includes("giappone")) {
    const plan = ["Tokyo", "Kyoto", "Osaka", "Nara", "Tokyo", "Kyoto", "Osaka"];
    const defaultCity = plan[plan.length - 1] ?? destination;
    return Array.from({ length: durationDays }, (_, index) => plan[index] ?? defaultCity);
  }

  if (lower.includes("paris") || lower.includes("parigi")) {
    return Array.from({ length: durationDays }, () => "Parigi");
  }

  if (lower.includes("rome") || lower.includes("roma")) {
    return Array.from({ length: durationDays }, () => "Roma");
  }

  if (lower.includes("bali")) {
    const plan = ["Ubud", "Canggu", "Uluwatu", "Seminyak", "Ubud"];
    const defaultCity = plan[plan.length - 1] ?? destination;
    return Array.from({ length: durationDays }, (_, index) => plan[index] ?? defaultCity);
  }

  if (lower.includes("new york")) {
    return Array.from({ length: durationDays }, () => "New York");
  }

  return Array.from({ length: durationDays }, () => destination);
}

function buildHotelOptions(
  city: string,
  totalBudget: number,
  currency: string,
  index: number
): HotelOption[] {
  const base = Math.max(90, Math.round(totalBudget / 8));

  return [
    {
      id: `${city.toLowerCase().replace(/\s+/g, "-")}-hotel-${index + 1}-1`,
      name: `${city} Grand Residence`,
      neighborhood: "Centro",
      address: `Via Centrale ${10 + index}, ${city}`,
      pricePerNight: base,
      currency,
      rating: 8.9,
      reviewCount: 1240,
      bookingUrl: `https://example.com/hotels/${encodeURIComponent(
        city.toLowerCase().replace(/\s+/g, "-")
      )}-grand-residence`,
      source: "Provider demo",
      isSelected: true,
    },
    {
      id: `${city.toLowerCase().replace(/\s+/g, "-")}-hotel-${index + 1}-2`,
      name: `${city} Urban Stay`,
      neighborhood: "Stazione",
      address: `Corso Europa ${25 + index}, ${city}`,
      pricePerNight: base + 35,
      currency,
      rating: 8.6,
      reviewCount: 860,
      bookingUrl: `https://example.com/hotels/${encodeURIComponent(
        city.toLowerCase().replace(/\s+/g, "-")
      )}-urban-stay`,
      source: "Provider demo",
    },
    {
      id: `${city.toLowerCase().replace(/\s+/g, "-")}-hotel-${index + 1}-3`,
      name: `${city} Boutique House`,
      neighborhood: "Quartiere storico",
      address: `Piazza del Mercato ${3 + index}, ${city}`,
      pricePerNight: base + 60,
      currency,
      rating: 9.1,
      reviewCount: 540,
      bookingUrl: `https://example.com/hotels/${encodeURIComponent(
        city.toLowerCase().replace(/\s+/g, "-")
      )}-boutique-house`,
      source: "Provider demo",
    },
  ];
}

function getCityActivityTitle(city: string, dayIndex: number): string {
  const lower = city.toLowerCase();

  if (lower.includes("avignon") || lower.includes("avignone")) {
    const titles = [
      "Palais des Papes & Centro Storico",
      "Pont d'Avignon & Rocher des Doms",
      "Marché Les Halles & Rue des Teinturiers",
      "Musée Petit Palais & Passeggiata sul Rodano",
      "Escursione al Pont du Gard e dintorni",
    ];
    return titles[dayIndex % titles.length] ?? `Scoperte nel centro di ${city}`;
  }

  if (lower.includes("tokyo")) {
    const titles = [
      "Shibuya & Tokyo Tower",
      "Senso-ji e quartiere Asakusa",
      "Harajuku e Meiji Jingu",
      "Akihabara e Ginza",
    ];
    return titles[dayIndex % titles.length] ?? `Esplorando ${city}`;
  }

  if (lower.includes("kyoto")) {
    const titles = [
      "Fushimi Inari e Gion",
      "Kinkaku-ji e Arashiyama",
      "Kiyomizu-dera e Pontocho",
    ];
    return titles[dayIndex % titles.length] ?? `Templi di ${city}`;
  }

  if (lower.includes("paris") || lower.includes("parigi")) {
    const titles = [
      "Torre Eiffel e Champ de Mars",
      "Museo del Louvre e Tuileries",
      "Montmartre e Sacré-Cœur",
      "Marais e Passeggiata sulla Senna",
    ];
    return titles[dayIndex % titles.length] ?? `Meraviglie di ${city}`;
  }

  if (lower.includes("rome") || lower.includes("roma")) {
    const titles = [
      "Colosseo e Fori Imperiali",
      "Piazza di Spagna e Fontana di Trevi",
      "Vaticano e Musei Vaticani",
      "Trastevere e Pantheon",
    ];
    return titles[dayIndex % titles.length] ?? `Monumenti di ${city}`;
  }

  const genericTitles = [
    `Centro storico e monumenti di ${city}`,
    `Quartieri storici e musei principali di ${city}`,
    `Mercati tipici e passeggiata panoramica a ${city}`,
    `Cultura e parchi cittadini di ${city}`,
    `Scoperte ed esperienze locali a ${city}`,
  ];
  return genericTitles[dayIndex % genericTitles.length] ?? `Attrazioni principali a ${city}`;
}

export function createMockTrip(
  prompt: string,
  options?: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    currency?: string;
  }
): Trip {
  const derivedDurationFromDates =
    options?.startDate && options?.endDate
      ? Math.max(
          1,
          Math.floor(
            (new Date(`${options.endDate}T00:00:00`).getTime() -
              new Date(`${options.startDate}T00:00:00`).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        )
      : undefined;

  const durationDays = derivedDurationFromDates ?? extractDays(prompt);
  const totalBudget = options?.budget ?? extractBudget(prompt);
  const destination = extractDestination(prompt, options?.destination);
  const currency = options?.currency ?? "EUR";
  const now = new Date().toISOString();
  const dayDates = buildDateRange(options?.startDate, options?.endDate, durationDays);
  const cities = buildCityPlan(destination, durationDays);

  const days = Array.from({ length: durationDays }, (_, i) => {
    const city = cities[i] ?? destination;
    const hotelOptions = buildHotelOptions(city, totalBudget, currency, i);
    const selectedHotel = hotelOptions.find((hotel) => hotel.isSelected) ?? hotelOptions[0] ?? {
      id: `hotel-${i}`,
      name: `Hotel ${city}`,
      address: `Centro di ${city}`,
      neighborhood: "Centro",
      pricePerNight: 100,
      currency,
      rating: 8.5,
      reviewCount: 120,
      isSelected: true,
    };

    return {
      id: `day-${i + 1}`,
      dayNumber: i + 1,
      date: dayDates[i],
      city,
      title: i === 0 ? `Arrivo a ${city}` : `Esplorando ${city}`,
      description:
        i === 0
          ? `Arrivo in città, sistemazione in hotel e primo giro orientativo di ${city}.`
          : `Giornata dedicata alle attrazioni principali di ${city}, tra cultura, quartieri iconici e cucina locale.`,
      order: i,
      estimatedCost: Math.round(totalBudget / durationDays),
      activities: [
        {
          id: `act-${i + 1}-1`,
          time: i === 0 ? "15:00" : "09:00",
          title: `Check-in · ${selectedHotel.name}`,
          description: [selectedHotel.neighborhood, selectedHotel.address]
            .filter(Boolean)
            .join(" · "),
          category: "ACCOMMODATION" as const,
          estimatedCost: selectedHotel.pricePerNight ?? 0,
          order: 0,
          selectedHotelId: selectedHotel.id,
          hotelOptions,
        },
        {
          id: `act-${i + 1}-2`,
          time: "11:00",
          title: getCityActivityTitle(city, i),
          description: `Tappe principali consigliate per scoprire il meglio di ${city}.`,
          category: "SIGHTSEEING" as const,
          estimatedCost: 30,
          order: 1,
        },
        {
          id: `act-${i + 1}-3`,
          time: "19:30",
          title: "Cena consigliata",
          description: `Ristorante tipico in zona ${selectedHotel.neighborhood ?? "centrale"}.`,
          category: "FOOD" as const,
          estimatedCost: Math.max(25, Math.round(totalBudget / durationDays / 6)),
          order: 2,
        },
      ],
    };
  });

  return {
    id: `trip-${Date.now()}`,
    title: `${durationDays} giorni a ${destination}`,
    destination,
    durationDays,
    startDate: options?.startDate,
    endDate: options?.endDate ?? dayDates[dayDates.length - 1],
    totalBudget,
    currency,
    prompt,
    status: "READY",
    days,
    budgetBreakdown: {
      hotel: Math.round(totalBudget * 0.35),
      transport: Math.round(totalBudget * 0.15),
      food: Math.round(totalBudget * 0.25),
      activities: Math.round(totalBudget * 0.15),
      extra: Math.round(totalBudget * 0.1),
    },
    createdAt: now,
    updatedAt: now,
  };
}
