// app/api/update-trip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { modifyTrip } from "@/services/ai";
import type { Trip } from "@/types/trip";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeMessage, safeErrorMessage, MAX_MESSAGE_LENGTH } from "@/lib/sanitize";

const RATE_LIMIT = { maxRequests: 20, windowMs: 3_600_000 }; // 20 req/hour

const bodySchema = z.object({
  trip: z.custom<Trip>((val) => typeof val === "object" && val !== null),
  instruction: z.string().min(2).max(MAX_MESSAGE_LENGTH),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rl = checkRateLimit(`update:${ip}`, RATE_LIMIT);
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

    // Sanitize instruction
    const sanitized = sanitizeMessage(parsed.data.instruction);
    if (sanitized.blocked) {
      return NextResponse.json({ error: sanitized.reason }, { status: 400 });
    }

    const updatedTrip = await modifyTrip({
      trip: parsed.data.trip,
      instruction: sanitized.value,
    });

    return NextResponse.json({ trip: updatedTrip }, { status: 200 });
  } catch (error) {
    console.error("[update-trip] error:", safeErrorMessage(error));
    return NextResponse.json(
      { error: "Impossibile aggiornare l'itinerario. Riprova." },
      { status: 500 }
    );
  }
}
