// lib/config.ts
// Configurazione centralizzata dell'applicazione. Unico punto che legge process.env.

export type AIProviderName = "openai" | "gemini" | "mock";
export type MapsProviderName = "openstreetmap" | "google" | "mapbox" | "placeholder";

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

function resolveAIProvider(): AIProviderName {
  const configured = readEnv("AI_PROVIDER").toLowerCase();
  const hasOpenAIKey = Boolean(readEnv("OPENAI_API_KEY"));
  const hasGeminiKey = Boolean(readEnv("GEMINI_API_KEY"));

  if (configured === "mock") return "mock";
  if (configured === "openai" && hasOpenAIKey) return "openai";
  if (configured === "gemini" && hasGeminiKey) return "gemini";
  if (hasOpenAIKey) return "openai";
  if (hasGeminiKey) return "gemini";

  return "mock";
}

function resolveMapsProvider(): MapsProviderName {
  const envProvider = (process.env.NEXT_PUBLIC_MAPS_PROVIDER || "").toLowerCase();
  if (envProvider === "google") return "google";
  if (envProvider === "mapbox") return "mapbox";
  return "openstreetmap";
}

export const appConfig = {
  ai: {
    provider: resolveAIProvider(),
    openai: {
      apiKey: readEnv("OPENAI_API_KEY"),
      model: readEnv("OPENAI_MODEL") || "gpt-4o-mini",
    },
    gemini: {
      apiKey: readEnv("GEMINI_API_KEY"),
      model: readEnv("GEMINI_MODEL") || "gemini-1.5-flash",
    },
  },
  maps: {
    provider: resolveMapsProvider(),
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
    mapboxToken: process.env.MAPBOX_TOKEN ?? "",
  },
  app: {
    name: "AI Travel Planner",
    defaultCurrency: "EUR",
  },
} as const;

export function isAIConfigured(): boolean {
  return appConfig.ai.provider !== "mock";
}
