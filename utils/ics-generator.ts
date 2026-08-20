// utils/ics-generator.ts
// Generatore di file iCalendar (.ics - RFC 5545) compatibile con Apple Calendar, Google Calendar, Outlook e smartphone.

import type { Activity, ActivityCategory, Trip } from "@/types/trip";

const CATEGORY_EMOJIS: Record<ActivityCategory, string> = {
  SIGHTSEEING: "🏛️",
  FOOD: "🍽️",
  TRANSPORT: "🚗",
  ACCOMMODATION: "🏨",
  ACTIVITY: "🎟️",
  SHOPPING: "🛍️",
  NIGHTLIFE: "🎉",
  WELLNESS: "💆",
  CULTURE: "🎨",
  ENTERTAINMENT: "🍿",
  RELAX: "☕",
  OTHER: "📍",
};

function pad(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Formatta una data locale in stringa iCalendar (YYYYMMDD o YYYYMMDDTHHMMSS).
 */
function formatDateToICS(date: Date, includeTime = true): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  if (!includeTime) {
    return `${y}${m}${d}`;
  }
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}${m}${d}T${h}${min}${s}`;
}

/**
 * Formatta una data in UTC con suffisso Z per il DTSTAMP richiesto da RFC 5545.
 */
function formatUTCDateToICS(date: Date): string {
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

/**
 * Esegue l'escape dei caratteri riservati secondo lo standard RFC 5545.
 */
function escapeICS(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Applica il line folding conforme a RFC 5545 (massimo 75 ottetti/caratteri per riga).
 */
function foldICSLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let remaining = line.slice(75);
  while (remaining.length > 74) {
    chunks.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  if (remaining.length > 0) {
    chunks.push(` ${remaining}`);
  }
  return chunks.join("\r\n");
}

/**
 * Effettua il parsing sicuro di una stringa data (YYYY-MM-DD o ISO) preservando la data locale.
 */
function parseLocalDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match && match[1] && match[2] && match[3]) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const date = new Date(year, month, day, 0, 0, 0, 0);
    if (!isNaN(date.getTime())) return date;
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Analizza la stringa di orario dell'attività (es. "09:30", "14:00 - 16:30")
 * e restituisce data e ora di inizio e fine (default 90 min di durata).
 */
function parseActivityTimes(timeStr: string | undefined, baseDate: Date): { start: Date; end: Date } {
  const start = new Date(baseDate);
  const end = new Date(baseDate);

  if (timeStr) {
    const timeRegex = /(\d{1,2})[:.](\d{2})/g;
    const matches = [...timeStr.matchAll(timeRegex)];

    if (matches.length > 0 && matches[0]) {
      const startH = parseInt(matches[0][1] ?? "9", 10);
      const startM = parseInt(matches[0][2] ?? "0", 10);
      start.setHours(startH, startM, 0, 0);

      if (matches.length > 1 && matches[1]) {
        const endH = parseInt(matches[1][1] ?? "11", 10);
        const endM = parseInt(matches[1][2] ?? "0", 10);
        end.setHours(endH, endM, 0, 0);
      } else {
        // Durata predefinita: 90 minuti (1h30m)
        end.setTime(start.getTime() + 90 * 60 * 1000);
      }
      return { start, end };
    }
  }

  // Orario predefinito se non specificato
  start.setHours(9, 30, 0, 0);
  end.setHours(11, 0, 0, 0);
  return { start, end };
}

function formatLocation(city?: string, destination?: string): string {
  const c = city?.trim();
  const d = destination?.trim();
  if (c && d) {
    if (d.toLowerCase().startsWith(c.toLowerCase()) || d.toLowerCase().includes(`, ${c.toLowerCase()}`)) {
      return escapeICS(d);
    }
    return escapeICS(`${c}, ${d}`);
  }
  return escapeICS(c || d || "");
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Genera la stringa formattata standard iCalendar (.ics - RFC 5545) per un intero viaggio.
 */
export function generateTripICS(trip: Trip): string {
  const now = new Date();
  const dtStamp = formatUTCDateToICS(now);
  const currency = trip.currency || "€";

  // Calcola la data base di partenza
  let tripStartDate = parseLocalDate(trip.startDate);
  if (!tripStartDate) {
    tripStartDate = new Date();
    tripStartDate.setDate(tripStartDate.getDate() + 1); // Domani
    tripStartDate.setHours(0, 0, 0, 0);
  }

  const rawLines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Travel Planner//aitravelplanner.it//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICS(trip.title || `Viaggio a ${trip.destination}`)}`,
    "X-WR-TIMEZONE:UTC",
  ];

  trip.days.forEach((day, dayIndex) => {
    let dayDate = parseLocalDate(day.date);
    if (!dayDate) {
      dayDate = new Date(tripStartDate);
      dayDate.setDate(tripStartDate.getDate() + dayIndex);
    }

    const locationStr = formatLocation(day.city, trip.destination);

    // 1. Evento riepilogativo per l'intera giornata (All-Day Event)
    const dayStartStr = formatDateToICS(dayDate, false);
    const nextDay = new Date(dayDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayEndStr = formatDateToICS(nextDay, false);

    const dayUid = `trip-${trip.id}-day-${day.id || dayIndex}@aitravelplanner.it`;

    const dayDescLines: string[] = [];
    if (day.description) {
      dayDescLines.push(day.description);
    }
    dayDescLines.push(`Costo stimato giornata: ~${day.estimatedCost}${currency}`);
    dayDescLines.push("Pianificato con AI Travel Planner");

    rawLines.push(
      "BEGIN:VEVENT",
      `UID:${dayUid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${dayStartStr}`,
      `DTEND;VALUE=DATE:${dayEndStr}`,
      `SUMMARY:✈️ Giorno ${day.dayNumber}: ${escapeICS(day.title)}${day.city ? ` (${escapeICS(day.city)})` : ""}`,
      `DESCRIPTION:${escapeICS(dayDescLines.join("\n\n"))}`,
      `LOCATION:${locationStr}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );

    // 2. Eventi specifici per ciascuna attività della giornata
    day.activities.forEach((activity: Activity, actIndex: number) => {
      const { start, end } = parseActivityTimes(activity.time, dayDate);
      const emoji = CATEGORY_EMOJIS[activity.category] || "📍";
      const actUid = `trip-${trip.id}-day-${day.id || dayIndex}-act-${activity.id || actIndex}@aitravelplanner.it`;

      const descParts: string[] = [];
      if (activity.description) {
        descParts.push(activity.description);
      }
      descParts.push(`Costo stimato: ~${activity.estimatedCost}${currency}`);
      descParts.push("Pianificato con AI Travel Planner");

      rawLines.push(
        "BEGIN:VEVENT",
        `UID:${actUid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${formatDateToICS(start)}`,
        `DTEND:${formatDateToICS(end)}`,
        `SUMMARY:${emoji} ${escapeICS(activity.title)}`,
        `DESCRIPTION:${escapeICS(descParts.join("\n\n"))}`,
        `LOCATION:${locationStr}`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    });
  });

  rawLines.push("END:VCALENDAR");

  // Applica line folding per RFC 5545 e unisce con CRLF
  return rawLines.map(foldICSLine).join("\r\n");
}

/**
 * Avvia il download del file .ics nel browser dell'utente (compatibile con iOS, Android, macOS e Windows).
 */
export function downloadTripICS(trip: Trip): void {
  const icsContent = generateTripICS(trip);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const cleanName = sanitizeFilename(trip.destination || trip.title || "itinerario-viaggio");
  const filename = `itinerario-${cleanName || "viaggio"}.ics`;

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
