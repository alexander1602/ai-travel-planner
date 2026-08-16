// app/api/flights/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchFlights } from "@/services/flights";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/sanitize";

const RATE_LIMIT = { maxRequests: 20, windowMs: 3_600_000 }; // 20 req/hour

const searchSchema = z.object({
  origin: z.string().max(100).optional().default(""),
  destination: z.string().min(1, "La destinazione è obbligatoria").max(200),
  searchMode: z.enum(["EXACT_DATES", "FLEXIBLE_MONTH"]).optional().default("EXACT_DATES"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  departDate: z.string().optional(),
  returnDate: z.string().optional(),
  targetMonth: z.string().optional(),
  tripDurationDays: z.number().positive().max(90).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rl = checkRateLimit(`flights:${ip}`, RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Troppe richieste. Riprova più tardi." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const json = await request.json();
    const parsed = searchSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Parametri non validi" },
        { status: 400 }
      );
    }

    const { origin, destination, searchMode, startDate, endDate, departDate, returnDate, targetMonth, tripDurationDays } = parsed.data;

    const flights = await searchFlights({
      origin,
      destination,
      searchMode,
      startDate: startDate || departDate,
      endDate: endDate || returnDate,
      targetMonth,
      tripDurationDays,
    });

    return NextResponse.json({ flights }, { status: 200 });
  } catch (error) {
    console.error("[api/flights/search] error:", safeErrorMessage(error));
    return NextResponse.json(
      { error: "Impossibile recuperare i voli al momento. Riprova più tardi." },
      { status: 500 }
    );
  }
}
