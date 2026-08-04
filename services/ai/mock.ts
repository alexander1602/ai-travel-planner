// services/ai/mock.ts
// Provider di fallback: usato quando manca una chiave API. L'app non deve mai andare in errore.

import type { AIProvider } from "./provider";
import type {
  Trip,
  ChatMessage,
  GenerateTripInput,
  ModifyTripInput,
  ChatTripResult,
} from "@/types/trip";
import { createMockTrip } from "@/lib/mock-data";

export class MockProvider implements AIProvider {
  readonly name = "mock";

  async generateTrip(input: GenerateTripInput): Promise<Trip> {
    return createMockTrip(input.prompt, {
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
      budget: input.budget,
      currency: input.currency,
    });
  }

  async modifyTrip(input: ModifyTripInput): Promise<Trip> {
    const { trip, instruction } = input;
    const lower = instruction.toLowerCase();

    if (lower.includes("remove") && lower.includes("day")) {
      return {
        ...trip,
        days: trip.days.slice(0, -1),
        durationDays: Math.max(1, trip.durationDays - 1),
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      ...trip,
      days: trip.days.map((day) => ({
        ...day,
        description: `${day.description} (Aggiornato: "${instruction}")`,
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  async chatTrip(
    trip: Trip,
    _history: ChatMessage[],
    message: string
  ): Promise<ChatTripResult> {
    const updatedTrip = await this.modifyTrip({ trip, instruction: message });
    return {
      reply: `Ho aggiornato il tuo itinerario in base a: "${message}". (Modalità demo: nessuna chiave API configurata)`,
      updatedTrip,
    };
  }

  async getActivityAlternatives(
    trip: Trip,
    dayId: string,
    activityId: string
  ): Promise<import("@/types/trip").ActivityAlternative[]> {
    const day = trip.days.find((d) => d.id === dayId);
    const activity = day?.activities.find((a) => a.id === activityId);
    const city = day?.city ?? trip.destination;
    const cat = activity?.category ?? "FOOD";
    const time = activity?.time ?? "20:00";

    if (cat === "FOOD") {
      return [
        {
          id: `alt-${Date.now()}-1`,
          time,
          title: `Cena tipica in Osteria Locale a ${city}`,
          description: `Degustazione dei piatti tradizionali del luogo in un'atmosfera intima e accogliente.`,
          category: "FOOD",
          estimatedCost: 35,
        },
        {
          id: `alt-${Date.now()}-2`,
          time,
          title: `Rooftop Restaurant & Cocktail Bar a ${city}`,
          description: `Cena panoramica con vista mozzafiato sui monumenti illuminate della città.`,
          category: "FOOD",
          estimatedCost: 55,
        },
        {
          id: `alt-${Date.now()}-3`,
          time,
          title: `Street Food Tour & Mercato Serale`,
          description: `Tour gastronomico informale tra i banchi e le specialità culinarie locali.`,
          category: "FOOD",
          estimatedCost: 20,
        },
      ];
    }

    if (cat === "SIGHTSEEING" || cat === "ACTIVITY") {
      return [
        {
          id: `alt-${Date.now()}-1`,
          time,
          title: `Visita guidata salta-fila ai Musei Principali di ${city}`,
          description: `Accesso prioritario con guida esperta locale per scoprirne la storia e i capolavori.`,
          category: "SIGHTSEEING",
          estimatedCost: 30,
        },
        {
          id: `alt-${Date.now()}-2`,
          time,
          title: `Passeggiata fotografica tra i vicoli storici e punti panoramici`,
          description: `Itinerario a piedi tra gli scorci più suggestivi e nascosti della città.`,
          category: "SIGHTSEEING",
          estimatedCost: 0,
        },
        {
          id: `alt-${Date.now()}-3`,
          time,
          title: `Tour in battello / bus panoramico di ${city}`,
          description: `Un punto di vista unico per ammirare le attrazioni principali in totale relax.`,
          category: "ACTIVITY",
          estimatedCost: 25,
        },
      ];
    }

    return [
      {
        id: `alt-${Date.now()}-1`,
        time,
        title: `Esperienza Culturale & Spettacolo a ${city}`,
        description: `Un'attività serale alternativa ricca di atmosfera e tradizione locale.`,
        category: "ACTIVITY",
        estimatedCost: 25,
      },
      {
        id: `alt-${Date.now()}-2`,
        time,
        title: `Relax & Shopping nel quartiere storico di ${city}`,
        description: `Tempo libero tra boutique artigianali, mercatini e botteghe storiche.`,
        category: "SHOPPING",
        estimatedCost: 15,
      },
      {
        id: `alt-${Date.now()}-3`,
        time,
        title: `Aperitivo & Lounge Bar nel centro di ${city}`,
        description: `Momento di relax con drink d'autore e tagliere di prodotti tipici.`,
        category: "FOOD",
        estimatedCost: 18,
      },
    ];
  }
}
