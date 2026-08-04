// app/api/generate-trip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateTrip } from "@/services/ai";
import { isAIConfigured } from "@/lib/config";

const bodySchema = z.object({
  prompt: z.string().min(3, "Descrivi il tuo viaggio con almeno qualche parola."),
  destination: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().positive().optional(),
  currency: z.string().min(1).optional(),
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

    const trip = await generateTrip({
      prompt: parsed.data.prompt,
      destination: parsed.data.destination,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      budget: parsed.data.budget,
      currency: parsed.data.currency,
    });

    return NextResponse.json({ trip, mock: !isAIConfigured() }, { status: 200 });
  } catch (error) {
    console.error("[generate-trip] error", error);
    return NextResponse.json(
      { error: "Impossibile generare l'itinerario. Riprova." },
      { status: 500 }
    );
  }
}
