// services/flights/index.ts
// Entrypoint pubblico per la ricerca voli (Provider Pattern + Factory).

import type { FlightProvider } from "./provider";
import { DirectFlightProvider } from "./direct";
import { SkyscannerFlightProvider } from "./skyscanner";
import { serverConfig } from "@/lib/config.server";
import type { FlightOption, FlightSearchParams } from "@/types/trip";

function createFlightProvider(): FlightProvider {
  if (serverConfig.flights.provider === "skyscanner" && serverConfig.flights.apiKey) {
    return new SkyscannerFlightProvider(serverConfig.flights.apiKey, serverConfig.flights.rapidApiHost);
  }
  return new DirectFlightProvider();
}

const activeProvider: FlightProvider = createFlightProvider();
const fallbackProvider = new DirectFlightProvider();

export async function searchFlights(params: FlightSearchParams): Promise<FlightOption[]> {
  try {
    return await activeProvider.searchFlights(params);
  } catch (error) {
    console.error(`[flights:${activeProvider.name}] Errore durante la ricerca voli:`, error instanceof Error ? error.message : "Unknown error");
    return fallbackProvider.searchFlights(params);
  }
}
