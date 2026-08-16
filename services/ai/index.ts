// services/ai/index.ts
// Unico punto d'ingresso pubblico verso l'AI. Il resto dell'app usa SOLO queste funzioni
// e non conosce quale provider è attivo (Provider Pattern + Factory).

import type { AIProvider } from "./provider";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import { MockProvider } from "./mock";
import { serverConfig } from "@/lib/config.server";
import type {
  Trip,
  ChatMessage,
  GenerateTripInput,
  ModifyTripInput,
  ChatTripResult,
} from "@/types/trip";

function createProvider(): AIProvider {
  switch (serverConfig.ai.provider) {
    case "openai":
      return new OpenAIProvider(serverConfig.ai.openai.apiKey);
    case "gemini":
      return new GeminiProvider(serverConfig.ai.gemini.apiKey);
    default:
      return new MockProvider();
  }
}

const provider: AIProvider = createProvider();
const mockProvider = new MockProvider();

export function getActiveProviderName(): string {
  return provider.name;
}

async function runAI<T>(
  operationName: string,
  operation: (activeProvider: AIProvider) => Promise<T>,
  mockOperation: (fallbackProvider: MockProvider) => Promise<T>
): Promise<T> {
  try {
    return await operation(provider);
  } catch (error) {
    console.error(`[ai:${provider.name}] ${operationName} failed, falling back to mock:`, error instanceof Error ? error.message.replace(/\?key=[^&\s]*/g, '?key=[REDACTED]') : 'Unknown error');
    return mockOperation(mockProvider);
  }
}

export async function generateTrip(input: GenerateTripInput): Promise<Trip> {
  return runAI(
    "generateTrip",
    (activeProvider) => activeProvider.generateTrip(input),
    (fallbackProvider) => fallbackProvider.generateTrip(input)
  );
}

export async function modifyTrip(input: ModifyTripInput): Promise<Trip> {
  return runAI(
    "modifyTrip",
    (activeProvider) => activeProvider.modifyTrip(input),
    (fallbackProvider) => fallbackProvider.modifyTrip(input)
  );
}

export async function chatTrip(
  trip: Trip,
  history: ChatMessage[],
  message: string
): Promise<ChatTripResult> {
  return runAI(
    "chatTrip",
    (activeProvider) => activeProvider.chatTrip(trip, history, message),
    (fallbackProvider) => fallbackProvider.chatTrip(trip, history, message)
  );
}

export async function getActivityAlternatives(
  trip: Trip,
  dayId: string,
  activityId: string
): Promise<import("@/types/trip").ActivityAlternative[]> {
  return runAI(
    "getActivityAlternatives",
    (activeProvider) => activeProvider.getActivityAlternatives(trip, dayId, activityId),
    (fallbackProvider) => fallbackProvider.getActivityAlternatives(trip, dayId, activityId)
  );
}

export async function resolveIataCode(location: string): Promise<string> {
  return runAI(
    "resolveIataCode",
    (activeProvider) => activeProvider.resolveIataCode(location),
    (fallbackProvider) => fallbackProvider.resolveIataCode(location)
  );
}
