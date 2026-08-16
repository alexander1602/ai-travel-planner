// app/api/generate-trip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateTrip } from "@/services/ai";
import { isAIConfigured } from "@/lib/config.server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizePrompt, safeErrorMessage, MAX_PROMPT_LENGTH } from "@/lib/sanitize";

const RATE_LIMIT = { maxRequests: 10, windowMs: 3_600_000 }; // 10 req/hour

const bodySchema = z.object({
  prompt: z.string().min(3, "Descrivi il tuo viaggio con almeno qualche parola.").max(MAX_PROMPT_LENGTH),
  destination: z.string().max(200).optional(),
  originCity: z.string().max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().positive().max(1_000_000).optional(),
  currency: z.string().min(1).max(5).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rl = checkRateLimit(`gen:${ip}`, RATE_LIMIT);
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

    // Sanitize prompt
    const sanitized = sanitizePrompt(parsed.data.prompt);
    if (sanitized.blocked) {
      return NextResponse.json({ error: sanitized.reason }, { status: 400 });
    }

    const trip = await generateTrip({
      prompt: sanitized.value,
      destination: parsed.data.destination,
      originCity: parsed.data.originCity,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      budget: parsed.data.budget,
      currency: parsed.data.currency,
    });

    if (parsed.data.originCity && !trip.originCity) {
      trip.originCity = parsed.data.originCity;
    }

    return NextResponse.json({ trip, mock: !isAIConfigured() }, { status: 200 });
  } catch (error) {
    console.error("[generate-trip] error:", safeErrorMessage(error));
    return NextResponse.json(
      { error: "Impossibile generare l'itinerario. Riprova." },
      { status: 500 }
    );
  }
}
