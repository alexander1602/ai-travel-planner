// utils/trip-parser.ts
// Funzioni pure per validare/normalizzare la risposta JSON dei provider AI con Zod.

import { z } from "zod";
import type { Trip } from "@/types/trip";

const VALID_CATEGORIES = [
  "SIGHTSEEING",
  "FOOD",
  "TRANSPORT",
  "ACCOMMODATION",
  "ACTIVITY",
  "SHOPPING",
  "NIGHTLIFE",
  "WELLNESS",
  "CULTURE",
  "ENTERTAINMENT",
  "RELAX",
  "OTHER",
] as const;

function normalizeCategory(val: unknown): typeof VALID_CATEGORIES[number] {
  if (typeof val !== "string") return "OTHER";
  const upper = val.toUpperCase().trim();
  if ((VALID_CATEGORIES as readonly string[]).includes(upper)) {
    return upper as typeof VALID_CATEGORIES[number];
  }
  if (upper.includes("NIGHT") || upper.includes("PARTY") || upper.includes("CLUB") || upper.includes("BAR")) {
    return "NIGHTLIFE";
  }
  if (upper.includes("WELLNESS") || upper.includes("SPA") || upper.includes("HEALTH") || upper.includes("MASSAGE")) {
    return "WELLNESS";
  }
  if (upper.includes("EAT") || upper.includes("DIN") || upper.includes("LUNCH") || upper.includes("FOOD") || upper.includes("RESTAURANT") || upper.includes("BREAKFAST")) {
    return "FOOD";
  }
  if (upper.includes("HOTEL") || upper.includes("STAY") || upper.includes("RESORT") || upper.includes("ROOM") || upper.includes("ACCOMMODATION")) {
    return "ACCOMMODATION";
  }
  if (upper.includes("FLIGHT") || upper.includes("BUS") || upper.includes("TRAIN") || upper.includes("TAXI") || upper.includes("DRIVE") || upper.includes("TRANSPORT")) {
    return "TRANSPORT";
  }
  if (upper.includes("SHOP") || upper.includes("MARKET") || upper.includes("STORE") || upper.includes("MALL")) {
    return "SHOPPING";
  }
  if (upper.includes("MUSEUM") || upper.includes("ART") || upper.includes("TEMPLE") || upper.includes("TOUR") || upper.includes("SIGHT") || upper.includes("MONUMENT")) {
    return "SIGHTSEEING";
  }
  return "ACTIVITY";
}

const safeNumber = (defaultVal = 0) =>
  z.preprocess((val) => {
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string") {
      const parsed = parseFloat(val.replace(/[^0-9.-]/g, ""));
      return isNaN(parsed) ? defaultVal : parsed;
    }
    return defaultVal;
  }, z.number().catch(defaultVal));

const hotelOptionSchema = z.object({
  id: z.string().optional(),
  name: z.string().default("Struttura consigliata"),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  pricePerNight: safeNumber(0).optional(),
  currency: z.string().optional(),
  rating: safeNumber(8.5).optional(),
  reviewCount: safeNumber(100).optional(),
  imageUrl: z.string().optional(),
  bookingUrl: z.string().optional(),
  latitude: safeNumber(0).optional(),
  longitude: safeNumber(0).optional(),
  source: z.string().optional(),
  isSelected: z.boolean().optional(),
});

const activitySchema = z.object({
  time: z.string().default("09:00"),
  title: z.string().default("Tappa del giorno"),
  description: z.string().optional(),
  category: z.preprocess(normalizeCategory, z.enum(VALID_CATEGORIES)),
  estimatedCost: safeNumber(0),
  selectedHotelId: z.string().optional(),
  hotelOptions: z.array(hotelOptionSchema).optional(),
});

const daySchema = z.object({
  dayNumber: safeNumber(1).transform((v) => Math.max(1, Math.round(v))),
  date: z.string().nullable().optional(),
  city: z.string().default("Destinazione"),
  title: z.string().default("Giornata di esplorazione"),
  description: z.string().default(""),
  estimatedCost: safeNumber(0),
  activities: z.array(activitySchema).default([]),
});

const tripSchema = z.object({
  title: z.string().default("Viaggio personalizzato"),
  destination: z.string().default("Destinazione"),
  durationDays: safeNumber(1).transform((v) => Math.max(1, Math.round(v))),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  totalBudget: safeNumber(0),
  currency: z.string().default("EUR"),
  budgetBreakdown: z.object({
    hotel: safeNumber(0),
    transport: safeNumber(0),
    food: safeNumber(0),
    activities: safeNumber(0),
    extra: safeNumber(0),
  }).default({ hotel: 0, transport: 0, food: 0, activities: 0, extra: 0 }),
  days: z.array(daySchema).default([]),
});

function extractJsonObject(raw: string): string {
  const withoutFence = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return withoutFence;
  }

  return withoutFence.slice(firstBrace, lastBrace + 1);
}

export function parseTripJson(raw: string, originalPrompt: string): Trip {
  const cleaned = extractJsonObject(raw);
  const parsedJson: unknown = JSON.parse(cleaned);
  const result = tripSchema.safeParse(parsedJson);

  if (!result.success) {
    throw new Error(`Invalid trip JSON from AI provider: ${result.error.message}`);
  }

  const data = result.data;
  const now = new Date().toISOString();

  return {
    id: `trip-${Date.now()}`,
    title: data.title,
    destination: data.destination,
    durationDays: data.durationDays,
    startDate: data.startDate ?? undefined,
    endDate: data.endDate ?? undefined,
    totalBudget: data.totalBudget,
    currency: data.currency,
    prompt: originalPrompt,
    status: "READY",
    budgetBreakdown: data.budgetBreakdown,
    days: data.days.map((day, dIndex) => ({
      id: `day-${dIndex + 1}`,
      dayNumber: day.dayNumber,
      date: day.date ?? undefined,
      city: day.city,
      title: day.title,
      description: day.description,
      order: dIndex,
      estimatedCost: day.estimatedCost,
      activities: day.activities.map((activity, aIndex) => ({
        id: `day-${dIndex + 1}-act-${aIndex + 1}`,
        time: activity.time,
        title: activity.title,
        description: activity.description,
        category: activity.category,
        estimatedCost: activity.estimatedCost,
        order: aIndex,
        selectedHotelId: activity.selectedHotelId,
        hotelOptions: activity.hotelOptions?.map((hotel, hIndex) => ({
          id: hotel.id ?? `day-${dIndex + 1}-act-${aIndex + 1}-hotel-${hIndex + 1}`,
          name: hotel.name,
          address: hotel.address,
          neighborhood: hotel.neighborhood,
          pricePerNight: hotel.pricePerNight,
          currency: hotel.currency ?? data.currency,
          rating: hotel.rating,
          reviewCount: hotel.reviewCount,
          imageUrl: hotel.imageUrl,
          bookingUrl: hotel.bookingUrl,
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          source: hotel.source,
          isSelected:
            hotel.isSelected ?? (activity.selectedHotelId ? hotel.id === activity.selectedHotelId : hIndex === 0),
        })),
      })),
    })),
    createdAt: now,
    updatedAt: now,
  };
}
