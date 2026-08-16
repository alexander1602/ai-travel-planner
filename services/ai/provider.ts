// services/ai/provider.ts
// Interfaccia comune: ogni provider AI (OpenAI, Gemini, futuri) implementa questo contratto.
// Nessun altro modulo dell'app deve conoscere l'implementazione concreta.

import type {
  Trip,
  ChatMessage,
  GenerateTripInput,
  ModifyTripInput,
  ChatTripResult,
  ActivityAlternative,
} from "@/types/trip";

export interface AIProvider {
  readonly name: string;

  generateTrip(input: GenerateTripInput): Promise<Trip>;

  modifyTrip(input: ModifyTripInput): Promise<Trip>;

  chatTrip(
    trip: Trip,
    history: ChatMessage[],
    message: string
  ): Promise<ChatTripResult>;

  getActivityAlternatives(
    trip: Trip,
    dayId: string,
    activityId: string
  ): Promise<ActivityAlternative[]>;

  resolveIataCode(location: string): Promise<string>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
