// app/api/flights/iata/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveIataCode } from "@/services/ai";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/sanitize";

const RATE_LIMIT = { maxRequests: 30, windowMs: 3_600_000 }; // 30 req/hour

const requestSchema = z.object({
  location: z.string().min(1, "La location è obbligatoria").max(200),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rl = checkRateLimit(`iata:${ip}`, RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Troppe richieste. Riprova più tardi." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Parametro non valido" },
        { status: 400 }
      );
    }

    const iata = await resolveIataCode(parsed.data.location);
    return NextResponse.json({ iata }, { status: 200 });
  } catch (error) {
    console.error("[flights/iata] error:", safeErrorMessage(error));
    return NextResponse.json({ iata: "FCO" }, { status: 200 });
  }
}
