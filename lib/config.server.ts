// lib/config.server.ts
// Server-only configuration — secrets and private API keys.
// This module MUST NEVER be imported from a "use client" component.

import "server-only";

export type AIProviderName = "openai" | "gemini" | "mock";
export type FlightProviderName = "skyscanner" | "direct" | "mock";

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

function resolveAIProvider(): AIProviderName {
  const configured = readEnv("AI_PROVIDER").toLowerCase();
  const openAIKey = readEnv("OPENAI_API_KEY");
  const geminiKey = readEnv("GEMINI_API_KEY");

  const hasOpenAIKey = Boolean(openAIKey) && openAIKey.length > 15;
  const hasGeminiKey = Boolean(geminiKey) && geminiKey.length > 15;

  if (configured === "mock") return "mock";
  if (configured === "openai" && hasOpenAIKey) return "openai";
  if (configured === "gemini" && hasGeminiKey) return "gemini";
  if (hasOpenAIKey) return "openai";
  if (hasGeminiKey) return "gemini";

  return "mock";
}

function resolveFlightProvider(): FlightProviderName {
  const configured = readEnv("FLIGHT_PROVIDER").toLowerCase();
  const skyscannerKey = readEnv("SKYSCANNER_API_KEY") || readEnv("RAPIDAPI_KEY");
  const isValidKey =
    Boolean(skyscannerKey) &&
    skyscannerKey.length > 15 &&
    !skyscannerKey.includes("la_tua_chiave") &&
    !skyscannerKey.includes("your_key");

  if (configured === "skyscanner" && isValidKey) return "skyscanner";
  return "direct";
}

/** Server-only app configuration — contains API keys and private config. */
export const serverConfig = {
  ai: {
    provider: resolveAIProvider(),
    openai: {
      apiKey: readEnv("OPENAI_API_KEY"),
      model: readEnv("OPENAI_MODEL") || "gpt-4o-mini",
    },
    gemini: {
      apiKey: readEnv("GEMINI_API_KEY"),
      model: readEnv("GEMINI_MODEL") || "gemini-3.5-flash-lite",
    },
  },
  flights: {
    provider: resolveFlightProvider(),
    apiKey: readEnv("SKYSCANNER_API_KEY") || readEnv("RAPIDAPI_KEY"),
    rapidApiHost: readEnv("SKYSCANNER_API_HOST") || "skyscanner44.p.rapidapi.com",
  },
  db: {
    url: readEnv("DATABASE_URL"),
  },
  app: {
    name: "AI Travel Planner",
    defaultCurrency: "EUR",
  },
} as const;

export function isAIConfigured(): boolean {
  return serverConfig.ai.provider !== "mock";
}

