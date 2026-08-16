// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatTrip } from "@/services/ai";
import type { Trip, ChatMessage } from "@/types/trip";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeMessage, safeErrorMessage, MAX_MESSAGE_LENGTH } from "@/lib/sanitize";

const RATE_LIMIT = { maxRequests: 50, windowMs: 3_600_000 }; // 50 req/hour

const bodySchema = z.object({
  trip: z.custom<Trip>((val) => typeof val === "object" && val !== null),
  history: z.array(z.custom<ChatMessage>((val) => typeof val === "object" && val !== null)).max(20),
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rl = checkRateLimit(`chat:${ip}`, RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Troppe richieste. Riprova più tardi." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Richiesta non valida" },
        { status: 400 }
      );
    }

    // Sanitize message
    const sanitized = sanitizeMessage(parsed.data.message);
    if (sanitized.blocked) {
      return NextResponse.json({ error: sanitized.reason }, { status: 400 });
    }

    const result = await chatTrip(
      parsed.data.trip,
      parsed.data.history,
      sanitized.value
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[chat] error:", safeErrorMessage(error));
    return NextResponse.json(
      { error: "Impossibile elaborare il messaggio. Riprova." },
      { status: 500 }
    );
  }
}
