// app/api/activity-alternatives/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActivityAlternatives } from "@/services/ai";
import type { Trip } from "@/types/trip";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/sanitize";

const RATE_LIMIT = { maxRequests: 30, windowMs: 3_600_000 }; // 30 req/hour

const bodySchema = z.object({
  trip: z.custom<Trip>((val) => typeof val === "object" && val !== null),
  dayId: z.string().max(100),
  activityId: z.string().max(100),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rl = checkRateLimit(`alts:${ip}`, RATE_LIMIT);
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

    const alternatives = await getActivityAlternatives(
      parsed.data.trip,
      parsed.data.dayId,
      parsed.data.activityId
    );

    return NextResponse.json({ alternatives }, { status: 200 });
  } catch (error) {
    console.error("[activity-alternatives] error:", safeErrorMessage(error));
    return NextResponse.json(
      { error: "Impossibile recuperare le alternative per l'attività. Riprova." },
      { status: 500 }
    );
  }
}
