// lib/sanitize.ts
// Input sanitization and prompt-injection guardrails for AI endpoints.

import "server-only";

/** Maximum allowed length for user prompts. */
export const MAX_PROMPT_LENGTH = 1500;

/** Maximum allowed length for chat messages. */
export const MAX_MESSAGE_LENGTH = 1000;

/**
 * Strip control characters (U+0000–U+001F except \n and \t, plus U+007F–U+009F).
 */
function stripControlChars(input: string): string {
  // Keep \n (0x0A) and \t (0x09), remove everything else in C0/C1 range
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
}

/**
 * Detect common prompt-injection patterns.
 * Returns true if the input looks like an injection attempt.
 */
function hasInjectionPattern(input: string): boolean {
  const lower = input.toLowerCase();
  const patterns = [
    "ignore all previous",
    "ignore the above",
    "ignore prior instructions",
    "disregard all previous",
    "disregard the above",
    "forget your instructions",
    "forget all previous",
    "override your instructions",
    "new instructions:",
    "system prompt:",
    "reveal your prompt",
    "show your system",
    "print your instructions",
    "output your system",
    "repeat your system",
    "what are your instructions",
    "what is your system prompt",
    "act as a different",
    "you are now a",
    "pretend you are",
    "jailbreak",
    "dan mode",
    "developer mode enabled",
  ];
  return patterns.some((p) => lower.includes(p));
}

export interface SanitizeResult {
  value: string;
  blocked: boolean;
  reason?: string;
}

/**
 * Sanitize a user prompt for AI generation endpoints.
 * Strips control chars, enforces length, detects injection.
 */
export function sanitizePrompt(raw: string): SanitizeResult {
  const cleaned = stripControlChars(raw).trim();

  if (cleaned.length === 0) {
    return { value: "", blocked: true, reason: "Il messaggio non può essere vuoto." };
  }

  if (cleaned.length > MAX_PROMPT_LENGTH) {
    return {
      value: "",
      blocked: true,
      reason: `Il messaggio è troppo lungo (max ${MAX_PROMPT_LENGTH} caratteri).`,
    };
  }

  if (hasInjectionPattern(cleaned)) {
    return {
      value: "",
      blocked: true,
      reason: "La richiesta contiene istruzioni non consentite.",
    };
  }

  return { value: cleaned, blocked: false };
}

/**
 * Sanitize a chat message.
 */
export function sanitizeMessage(raw: string): SanitizeResult {
  const cleaned = stripControlChars(raw).trim();

  if (cleaned.length === 0) {
    return { value: "", blocked: true, reason: "Il messaggio non può essere vuoto." };
  }

  if (cleaned.length > MAX_MESSAGE_LENGTH) {
    return {
      value: "",
      blocked: true,
      reason: `Il messaggio è troppo lungo (max ${MAX_MESSAGE_LENGTH} caratteri).`,
    };
  }

  if (hasInjectionPattern(cleaned)) {
    return {
      value: "",
      blocked: true,
      reason: "La richiesta contiene istruzioni non consentite.",
    };
  }

  return { value: cleaned, blocked: false };
}

/**
 * Safe error message extraction — never leaks stack traces or URLs with API keys.
 */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Strip any URL query parameters that might contain API keys
    return error.message.replace(/\?key=[^&\s]*/g, "?key=[REDACTED]");
  }
  return "Errore sconosciuto";
}
