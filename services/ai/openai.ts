// services/ai/openai.ts
import OpenAI from "openai";
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
import { appConfig } from "@/lib/config";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateTrip(input: GenerateTripInput): Promise<Trip> {
    try {
      const completion = await this.client.chat.completions.create({
        model: appConfig.ai.openai.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT_TRIP_PLANNER },
          {
            role: "user",
            content: buildGenerateTripPrompt(input.prompt, {
              startDate: input.startDate,
              endDate: input.endDate,
              budget: input.budget,
              currency: input.currency,
            }),
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      return parseTripJson(raw, input.prompt);
    } catch (error) {
      throw new AIProviderError("Failed to generate trip via OpenAI", this.name, error);
    }
  }

  async modifyTrip(input: ModifyTripInput): Promise<Trip> {
    try {
      const completion = await this.client.chat.completions.create({
        model: appConfig.ai.openai.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT_TRIP_PLANNER },
          {
            role: "user",
            content: buildModifyTripPrompt(input.trip, input.instruction),
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      return parseTripJson(raw, input.trip.prompt);
    } catch (error) {
      throw new AIProviderError("Failed to modify trip via OpenAI", this.name, error);
    }
  }

  async chatTrip(
    trip: Trip,
    history: ChatMessage[],
    message: string
  ): Promise<ChatTripResult> {
    try {
      const completion = await this.client.chat.completions.create({
        model: appConfig.ai.openai.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildCombinedChatSystemPrompt() },
          { role: "user", content: buildCombinedChatUserPrompt(trip, history, message) },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
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
        reply = raw.trim() || reply;
      }

      return { reply, updatedTrip };
    } catch (error) {
      throw new AIProviderError("Failed chat via OpenAI", this.name, error);
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

      const completion = await this.client.chat.completions.create({
        model: appConfig.ai.openai.model,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      });

      const raw = completion.choices[0]?.message?.content ?? "[]";
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
      throw new AIProviderError("Failed to get activity alternatives via OpenAI", this.name, error);
    }
  }
}
