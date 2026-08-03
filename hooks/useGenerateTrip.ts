// hooks/useGenerateTrip.ts
"use client";

import { useState, useCallback } from "react";
import type { Trip } from "@/types/trip";

interface UseGenerateTripResult {
  generate: (input: {
    prompt: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    currency?: string;
  }) => Promise<Trip | null>;
  isLoading: boolean;
  error: string | null;
}

export function useGenerateTrip(): UseGenerateTripResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (input: {
      prompt: string;
      startDate?: string;
      endDate?: string;
      budget?: number;
      currency?: string;
    }): Promise<Trip | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data: { trip?: Trip; error?: string } = await response.json();

      if (!response.ok || !data.trip) {
        throw new Error(data.error ?? "Errore durante la generazione del viaggio.");
      }

      return data.trip;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore inatteso.");
      return null;
    } finally {
      setIsLoading(false);
    }
    },
    []
  );

  return { generate, isLoading, error };
}
