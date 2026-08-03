// hooks/useChatTrip.ts
"use client";

import { useState, useCallback } from "react";
import type { Trip, ChatMessage } from "@/types/trip";

interface UseChatTripResult {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
}

export function useChatTrip(
  trip: Trip,
  onTripUpdate: (trip: Trip) => void
): UseChatTripResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "USER",
        content,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trip, history: messages, message: content }),
        });

        const data: { reply?: string; updatedTrip?: Trip; error?: string } =
          await response.json();

        if (!response.ok) throw new Error(data.error ?? "Errore nella chat.");

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: "ASSISTANT",
          content: data.reply ?? "",
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        if (data.updatedTrip) onTripUpdate(data.updatedTrip);
      } catch (err) {
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now() + 2}`,
          role: "ASSISTANT",
          content: err instanceof Error ? err.message : "Errore inatteso.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [trip, messages, onTripUpdate]
  );

  return { messages, sendMessage, isLoading };
}
