// services/flights/skyscanner.ts
import type { FlightProvider } from "./provider";
import type { FlightOption, FlightSearchParams } from "@/types/trip";
import { serverConfig } from "@/lib/config.server";

interface SkyscannerItineraryItem {
  id?: string;
  deep_link?: string;
  price?: { raw?: number; amount?: number };
  legs?: Array<{
    departure?: string;
    arrival?: string;
    durationInMinutes?: number;
    stopCount?: number;
    flightNumber?: string;
    origin?: { displayCode?: string };
    destination?: { displayCode?: string };
    carriers?: { marketing?: Array<{ name?: string; code?: string; logoUrl?: string }> } | Array<{ name?: string; code?: string; logoUrl?: string }>;
  }>;
}

export class SkyscannerFlightProvider implements FlightProvider {
  name = "skyscanner";
  private apiKey: string;
  private apiHost: string;

  constructor(apiKey: string, apiHost?: string) {
    this.apiKey = apiKey;
    this.apiHost = apiHost || serverConfig.flights.rapidApiHost;
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOption[]> {
    if (!this.apiKey) {
      throw new Error("Skyscanner API Key non configurata");
    }

    const { origin, destination, searchMode, startDate, endDate, targetMonth } = params;

    // Una singola chiamata HTTP mirata verso l'endpoint esistente di Skyscanner
    const targetEndpoint = "/api/v1/flights/search";

    const url = new URL(`https://${this.apiHost}${targetEndpoint}`);
    url.searchParams.set("fromEntityId", origin || "FCO");
    url.searchParams.set("toEntityId", destination || "CDG");

    if (searchMode === "FLEXIBLE_MONTH" && targetMonth) {
      url.searchParams.set("departDate", targetMonth);
    } else {
      if (startDate) url.searchParams.set("departDate", startDate);
      if (endDate) url.searchParams.set("returnDate", endDate);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-key": this.apiKey,
        "x-rapidapi-host": this.apiHost,
      },
    });

    if (!response.ok) {
      throw new Error(`Skyscanner API Errore HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;

    const dataObj = data as Record<string, unknown>;
    const nestedData = dataObj?.data as Record<string, unknown> | undefined;
    const itineraries = (nestedData?.itineraries || dataObj?.itineraries || []) as SkyscannerItineraryItem[];
    if (!Array.isArray(itineraries) || itineraries.length === 0) {
      throw new Error("Nessun volo trovato via Skyscanner API");
    }

    const sliced = itineraries.slice(0, 5);
    const prices = sliced.map((it) => it.price?.raw ?? it.price?.amount ?? 9999);
    const minPrice = Math.min(...prices);

    return sliced.map((it: SkyscannerItineraryItem, index: number) => {
      const leg = it.legs?.[0];
      const returnLeg = it.legs?.[1];
      const carriers = leg?.carriers;
      const carrier = Array.isArray(carriers) ? carriers[0] : carriers?.marketing?.[0];
      const priceVal = it.price?.raw ?? it.price?.amount ?? 89;
      const bookingUrl =
        it.deep_link ||
        `https://www.skyscanner.it/trasporti/voli/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}/`;

      const airlineName = carrier?.name || "Compagnia Aerea";
      const carrierCode = carrier?.code || "FR";
      const airlineLogo = carrier?.logoUrl || `https://images.kiwi.com/airlines/64/${carrierCode}.png`;
      const flightNum = leg?.flightNumber || `${carrierCode} ${Math.floor(100 + Math.random() * 900)}`;

      const depDateStr = leg?.departure ? leg.departure.split("T")[0] : startDate;
      const retDateStr = returnLeg?.departure ? returnLeg.departure.split("T")[0] : endDate;

      return {
        id: it.id || `skyscanner-${index}`,
        airline: airlineName,
        airlineLogo,
        flightNumber: flightNum,
        departureAirport: leg?.origin?.displayCode || origin || "Partenza",
        arrivalAirport: leg?.destination?.displayCode || destination || "Destinazione",
        departureDate: depDateStr,
        returnDate: retDateStr,
        departureTime: leg?.departure || new Date().toISOString(),
        arrivalTime: leg?.arrival || new Date().toISOString(),
        duration: leg?.durationInMinutes ? `${Math.floor(leg.durationInMinutes / 60)}h ${leg.durationInMinutes % 60}m` : "2h 30m",
        stops: leg?.stopCount ?? 0,
        price: priceVal,
        currency: "EUR",
        isCheapestInMonth: searchMode === "FLEXIBLE_MONTH" && priceVal === minPrice,
        bookingUrl,
      };
    });
  }
}
