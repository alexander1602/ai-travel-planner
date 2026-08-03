// services/ai/index.ts
// Unico punto d'ingresso pubblico verso l'AI. Il resto dell'app usa SOLO queste funzioni
// e non conosce quale provider è attivo (Provider Pattern + Factory).

import type { AIProvider } from "./provider";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import { MockProvider } from "./mock";
import { appConfig } from "@/lib/config";
import type {
  Trip,
  ChatMessage,
  GenerateTripInput,
  ModifyTripInput,
  ChatTripResult,
} from "@/types/trip";

function createProvider(): AIProvider {
  switch (appConfig.ai.provider) {
    case "openai":
      return new OpenAIProvider(appConfig.ai.openai.apiKey);
    case "gemini":
      return new GeminiProvider(appConfig.ai.gemini.apiKey);
    default:
      return new MockProvider();
  }
}

const provider: AIProvider = createProvider();
const mockProvider = new MockProvider();

export function getActiveProviderName(): string {
  return provider.name;
}

function canUseMockFallback(): boolean {
  return provider.name === "mock";
}

async function runAI<T>(
  operationName: string,
  operation: (activeProvider: AIProvider) => Promise<T>,
  mockOperation: (fallbackProvider: MockProvider) => Promise<T>
): Promise<T> {
  try {
    return await operation(provider);
  } catch (error) {
    console.error(`[ai:${provider.name}] ${operationName} failed:`, error);

    if (canUseMockFallback()) {
      return mockOperation(mockProvider);
    }

    throw error;
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
