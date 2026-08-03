// components/chat/ChatBox.tsx
"use client";

import { useRef, useEffect } from "react";
import { Bot, User, Loader2 } from "lucide-react";
import { ChatInput } from "./ChatInput";
import type { Trip, ChatMessage } from "@/types/trip";
import { useChatTrip } from "@/hooks/useChatTrip";

interface ChatBoxProps {
  trip: Trip;
  onTripUpdate: (trip: Trip) => void;
}

export function ChatBox({ trip, onTripUpdate }: ChatBoxProps) {
  const { messages, sendMessage, isLoading } = useChatTrip(trip, onTripUpdate);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="font-semibold">Trip Assistant</h2>
        <p className="text-xs text-muted-foreground">
          Prova: &quot;Add museums&quot;, &quot;Luxury hotel&quot;, &quot;Move Osaka to the last day&quot;
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Scrivi un messaggio per modificare il tuo itinerario in tempo reale.
          </p>
        )}
        {messages.map((message: ChatMessage) => (
          <div
            key={message.id}
            className={`flex items-start gap-2 ${
              message.role === "USER" ? "flex-row-reverse text-right" : ""
            }`}
          >
            <span className="mt-1 rounded-full bg-muted p-1.5">
              {message.role === "USER" ? (
                <User className="h-3.5 w-3.5" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
            </span>
            <p className="max-w-[80%] rounded-2xl bg-muted px-3 py-2 text-sm">
              {message.content}
            </p>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Sto aggiornando l&apos;itinerario...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
