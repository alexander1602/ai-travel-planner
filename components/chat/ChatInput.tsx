// components/chat/ChatInput.tsx
"use client";

import { useState } from "react";
import { SendHorizontal } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
      <input
        aria-label="Scrivi un messaggio all'assistente"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Add museums, luxury hotel, remove Kyoto..."
        disabled={disabled}
        className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Invia messaggio"
        className="rounded-xl bg-primary p-2 text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50"
      >
        <SendHorizontal className="h-4 w-4" />
      </button>
    </form>
  );
}
