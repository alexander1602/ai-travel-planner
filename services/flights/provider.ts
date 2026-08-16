// services/flights/provider.ts
import type { FlightOption, FlightSearchParams } from "@/types/trip";

export interface FlightProvider {
  name: string;
  searchFlights(params: FlightSearchParams): Promise<FlightOption[]>;
}
