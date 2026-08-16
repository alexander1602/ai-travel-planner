// services/ai/gemini.ts
import type { AIProvider } from "./provider";
import { AIProviderError } from "./provider";
import type {
  Trip,
  ChatMessage,
  GenerateTripInput,
  ModifyTripInput,
  ChatTripResult,
} from "@/types/trip";
import {
  SYSTEM_PROMPT_TRIP_PLANNER,
  buildGenerateTripPrompt,
  buildModifyTripPrompt,
  buildCombinedChatSystemPrompt,
  buildCombinedChatUserPrompt,
  buildActivityAlternativesPrompt,
} from "./prompts";
import { parseTripJson } from "@/utils/trip-parser";
import { serverConfig } from "@/lib/config.server";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  responseMimeType?: "application/json"
): Promise<string> {
  const url = `${GEMINI_ENDPOINT}/${model}:generateContent`;
  const generationConfig = responseMimeType ? { responseMimeType } : undefined;
  let lastError: Error | null = null;

  // Esegui fino a 4 tentativi con backoff esponenziale per picchi temporanei (503 / 429)
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          ...(generationConfig ? { generationConfig } : {}),
        }),
      });

      if (response.status === 503 || response.status === 429) {
        const delay = 1500 * (attempt + 1);
        console.warn(`[gemini] ${model} ha restituito ${response.status}. Retry ${attempt + 1}/4 tra ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }

      if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}${
            details ? ` - ${details.slice(0, 500)}` : ""
          }`
        );
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3) {
        await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error(`Gemini API call failed for model ${model}`);
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.model = serverConfig.ai.gemini.model;
  }

  async generateTrip(input: GenerateTripInput): Promise<Trip> {
    try {
      const raw = await callGemini(
        this.apiKey,
        this.model,
        SYSTEM_PROMPT_TRIP_PLANNER,
        buildGenerateTripPrompt(input.prompt, {
          startDate: input.startDate,
          endDate: input.endDate,
          budget: input.budget,
          currency: input.currency,
        }),
        "application/json"
      );
      return parseTripJson(raw, input.prompt);
    } catch (error) {
      throw new AIProviderError("Failed to generate trip via Gemini", this.name, error);
    }
  }

  async modifyTrip(input: ModifyTripInput): Promise<Trip> {
    try {
      const raw = await callGemini(
        this.apiKey,
        this.model,
        SYSTEM_PROMPT_TRIP_PLANNER,
        buildModifyTripPrompt(input.trip, input.instruction),
        "application/json"
      );
      return parseTripJson(raw, input.trip.prompt);
    } catch (error) {
      throw new AIProviderError("Failed to modify trip via Gemini", this.name, error);
    }
  }

  async chatTrip(trip: Trip, history: ChatMessage[], message: string): Promise<ChatTripResult> {
    try {
      const raw = await callGemini(
        this.apiKey,
        this.model,
        buildCombinedChatSystemPrompt(),
        buildCombinedChatUserPrompt(trip, history, message),
        "application/json"
      );

      let reply = "Ho elaborato la tua richiesta per l'itinerario.";
      let updatedTrip: Trip | undefined = undefined;

      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.reply === "string" && parsed.reply.trim()) {
          reply = parsed.reply;
        }
        if (parsed.updatedTrip && typeof parsed.updatedTrip === "object") {
          updatedTrip = parseTripJson(JSON.stringify(parsed.updatedTrip), trip.prompt);
        }
      } catch {
        // Se l'AI restituisce solo testo o JSON parziale
        reply = raw.trim() || reply;
      }

      return { reply, updatedTrip };
    } catch (error) {
      throw new AIProviderError("Failed chat via Gemini", this.name, error);
    }
  }

  async getActivityAlternatives(
    trip: Trip,
    dayId: string,
    activityId: string
  ): Promise<import("@/types/trip").ActivityAlternative[]> {
    const day = trip.days.find((d) => d.id === dayId);
    const activity = day?.activities.find((a) => a.id === activityId);
    if (!day || !activity) return [];

    try {
      const prompt = buildActivityAlternativesPrompt(
        trip.destination,
        day.city,
        day.title,
        activity.title,
        activity.description,
        activity.category
      );

      const raw = await callGemini(
        this.apiKey,
        this.model,
        "Sei un assistente esperto in viaggi. Rispondi esclusivamente in formato JSON.",
        prompt,
        "application/json"
      );

      const parsed = JSON.parse(raw);
      const items: Array<{
        time?: string;
        title?: string;
        description?: string;
        category?: import("@/types/trip").ActivityCategory;
        estimatedCost?: number;
      }> = Array.isArray(parsed) ? parsed : parsed.alternatives ?? [];

      return items.map((item, index: number) => ({
        id: `alt-${Date.now()}-${index}`,
        time: item.time || activity.time,
        title: item.title || "Attività alternativa",
        description: item.description || "",
        category: item.category || activity.category,
        estimatedCost: typeof item.estimatedCost === "number" ? item.estimatedCost : activity.estimatedCost,
      }));
    } catch (error) {
      throw new AIProviderError("Failed to get activity alternatives via Gemini", this.name, error);
    }
  }

  async resolveIataCode(location: string): Promise<string> {
    try {
      const prompt = `Restituisci ESCLUSIVAMENTE il codice IATA a 3 lettere dell'aeroporto principale più vicino a "${location}". Rispondi SOLO ed ESCLUSIVAMENTE con il codice di 3 lettere maiuscole, senza altro testo o punteggiatura. Esempi: "Roma" -> "FCO", "Bergamo" -> "BGY", "Zanzibar" -> "ZNZ", "Corfù" -> "CFU", "Reykjavik" -> "KEF".`;
      const raw = await callGemini(
        this.apiKey,
        this.model,
        "Sei un assistente esperto di aviazione civile. Rispondi SOLO con 3 lettere maiuscole del codice IATA.",
        prompt
      );
      const match = raw.trim().match(/[A-Za-z]{3}/);
      return match ? match[0].toUpperCase() : "FCO";
    } catch (error) {
      throw new AIProviderError("Failed to resolve IATA code via Gemini", this.name, error);
    }
  }
}
