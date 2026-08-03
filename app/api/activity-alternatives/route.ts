// app/api/activity-alternatives/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActivityAlternatives } from "@/services/ai";
import type { Trip } from "@/types/trip";

const bodySchema = z.object({
  trip: z.custom<Trip>((val) => typeof val === "object" && val !== null),
  dayId: z.string(),
  activityId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
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
    console.error("[activity-alternatives] error", error);
    return NextResponse.json(
      { error: "Impossibile recuperare le alternative per l'attività. Riprova." },
      { status: 500 }
    );
  }
}
