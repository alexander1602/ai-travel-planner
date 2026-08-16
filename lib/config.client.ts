// lib/config.client.ts
// Client-safe configuration — ONLY public, non-secret values.
// Safe to import from "use client" components.

export const clientConfig = {
  app: {
    name: "AI Travel Planner",
    defaultCurrency: "EUR",
  },
} as const;
