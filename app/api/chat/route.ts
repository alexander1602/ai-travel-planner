// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatTrip } from "@/services/ai";
import type { Trip, ChatMessage } from "@/types/trip";

const bodySchema = z.object({
  trip: z.custom<Trip>((val) => typeof val === "object" && val !== null),
  history: z.array(z.custom<ChatMessage>((val) => typeof val === "object" && val !== null)),
  message: z.string().min(1),
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

    const result = await chatTrip(
      parsed.data.trip,
      parsed.data.history,
      parsed.data.message
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[chat] error", error);
    return NextResponse.json(
      { error: "Impossibile elaborare il messaggio. Riprova." },
      { status: 500 }
    );
  }
}
