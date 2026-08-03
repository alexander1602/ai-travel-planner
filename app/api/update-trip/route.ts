// app/api/update-trip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { modifyTrip } from "@/services/ai";
import type { Trip } from "@/types/trip";

const bodySchema = z.object({
  trip: z.custom<Trip>((val) => typeof val === "object" && val !== null),
  instruction: z.string().min(2),
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

    const updatedTrip = await modifyTrip({
      trip: parsed.data.trip,
      instruction: parsed.data.instruction,
    });

    return NextResponse.json({ trip: updatedTrip }, { status: 200 });
  } catch (error) {
    console.error("[update-trip] error", error);
    return NextResponse.json(
      { error: "Impossibile aggiornare l'itinerario. Riprova." },
      { status: 500 }
    );
  }
}
