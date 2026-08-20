// utils/pdf-generator.ts
// Generatore client-side di Travel Guide in PDF elegante, compatto, stampabile e ad alta risoluzione (A4).

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Activity, ActivityCategory, Trip } from "@/types/trip";

const CATEGORY_META: Record<ActivityCategory, { emoji: string; label: string; color: string; bg: string }> = {
  SIGHTSEEING: { emoji: "🏛️", label: "Monumenti & Visite", color: "#4338ca", bg: "#e0e7ff" },
  FOOD: { emoji: "🍽️", label: "Cibo & Ristoranti", color: "#be123c", bg: "#ffe4e6" },
  TRANSPORT: { emoji: "🚗", label: "Trasporti", color: "#0369a1", bg: "#e0f2fe" },
  ACCOMMODATION: { emoji: "🏨", label: "Alloggio & Hotel", color: "#0f766e", bg: "#ccfbf1" },
  ACTIVITY: { emoji: "🎟️", label: "Esperienza", color: "#b45309", bg: "#fef3c7" },
  SHOPPING: { emoji: "🛍️", label: "Shopping", color: "#be185d", bg: "#fce7f3" },
  NIGHTLIFE: { emoji: "🎉", label: "Vita Notturna", color: "#6d28d9", bg: "#ede9fe" },
  WELLNESS: { emoji: "💆", label: "Relax & Wellness", color: "#047857", bg: "#d1fae5" },
  CULTURE: { emoji: "🎨", label: "Arte & Cultura", color: "#c2410c", bg: "#ffedd5" },
  ENTERTAINMENT: { emoji: "🍿", label: "Intrattenimento", color: "#4f46e5", bg: "#e0e7ff" },
  RELAX: { emoji: "☕", label: "Pausa Relax", color: "#4d7c0f", bg: "#ecfccb" },
  OTHER: { emoji: "📍", label: "Tappa", color: "#334155", bg: "#f1f5f9" },
};

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDateIT(dateStr?: string): string {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let date: Date;
  if (match && match[1] && match[2] && match[3]) {
    date = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
  } else {
    date = new Date(dateStr);
  }
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDateRange(startDate?: string, endDate?: string): string {
  if (!startDate) return "";
  const s = formatDateIT(startDate);
  if (!endDate) return s;
  const e = formatDateIT(endDate);
  return `${s} — ${e}`;
}

function escapeHtml(str?: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Calcolo dinamico dell'altezza stimata per ottimizzare la ripartizione dei fogli A4
 */
const PAGE_HEIGHT_BUDGET = 960; // Pixel utili disponibili per pagina A4

function calculateActivityHeight(act: Activity): number {
  let h = 60; // altezza base card attività (titolo + orario + pillola)
  if (act.description) {
    const lines = Math.max(1, Math.ceil(act.description.length / 80));
    h += lines * 16;
  }
  if (act.hotelOptions && act.hotelOptions.length > 0) {
    h += 48; // spazio per card hotel associata
  }
  return h + 8; // margine inferiore
}

function calculateDayHeaderHeight(day: Trip["days"][0]): number {
  let h = 50; // card header giorno
  if (day.description) {
    h += 22; // citazione descrizione
  }
  return h + 10;
}

interface PlannedDaySlice {
  day: Trip["days"][0];
  activities: Activity[];
  isContinuation?: boolean;
  partIndex?: number;
  totalParts?: number;
}

interface PagePlan {
  type: "cover" | "itinerary";
  days?: PlannedDaySlice[];
}

/**
 * Algoritmo di impaginazione dinamica che riempie interamente i fogli A4
 * ed evita sprechi di spazio bianco o fogli mezzi vuoti.
 */
function planPages(trip: Trip): PagePlan[] {
  const pages: PagePlan[] = [];

  // Pagina 1: Cover + Overview + Dettagli Volo + Ripartizione Budget
  pages.push({ type: "cover" });

  let currentPageDays: PlannedDaySlice[] = [];
  let currentPageHeight = 0;

  for (const day of trip.days) {
    const dayHeaderH = calculateDayHeaderHeight(day);
    const acts = day.activities || [];

    if (acts.length === 0) {
      if (currentPageHeight + dayHeaderH > PAGE_HEIGHT_BUDGET && currentPageDays.length > 0) {
        pages.push({ type: "itinerary", days: currentPageDays });
        currentPageDays = [];
        currentPageHeight = 0;
      }
      currentPageDays.push({ day, activities: [] });
      currentPageHeight += dayHeaderH + 20;
      continue;
    }

    // Calcola l'altezza complessiva della giornata
    const allActsH = acts.reduce((sum, act) => sum + calculateActivityHeight(act), 0);
    const totalDayH = dayHeaderH + allActsH;

    // Caso 1: L'intera giornata entra nello spazio rimanente del foglio corrente
    if (currentPageHeight + totalDayH <= PAGE_HEIGHT_BUDGET) {
      currentPageDays.push({ day, activities: acts });
      currentPageHeight += totalDayH + 16;
      continue;
    }

    // Caso 2: L'intera giornata non entra nella pagina corrente
    // Se la pagina ha già contenuto, chiudila e inizia su una nuova pagina
    if (currentPageDays.length > 0) {
      pages.push({ type: "itinerary", days: currentPageDays });
      currentPageDays = [];
      currentPageHeight = 0;
    }

    // Se l'intera giornata entra in una pagina fresca da sola, aggiungila
    if (totalDayH <= PAGE_HEIGHT_BUDGET) {
      currentPageDays.push({ day, activities: acts });
      currentPageHeight += totalDayH + 16;
      continue;
    }

    // Caso 3: La giornata è estremamente lunga (es. 8+ attività) e richiede più pagine
    let actIndex = 0;
    const slices: { acts: Activity[]; isCont: boolean }[] = [];

    while (actIndex < acts.length) {
      const sliceActs: Activity[] = [];
      let sliceH = calculateDayHeaderHeight(day);

      while (actIndex < acts.length) {
        const act = acts[actIndex];
        if (!act) break;
        const actH = calculateActivityHeight(act);
        if (sliceActs.length > 0 && sliceH + actH > PAGE_HEIGHT_BUDGET) {
          break;
        }
        sliceActs.push(act);
        sliceH += actH;
        actIndex++;
      }

      slices.push({ acts: sliceActs, isCont: slices.length > 0 });
    }

    const totalParts = slices.length;
    slices.forEach((s, idx) => {
      if (idx > 0 && currentPageDays.length > 0) {
        pages.push({ type: "itinerary", days: currentPageDays });
        currentPageDays = [];
        currentPageHeight = 0;
      }
      currentPageDays.push({
        day,
        activities: s.acts,
        isContinuation: s.isCont,
        partIndex: idx + 1,
        totalParts: totalParts > 1 ? totalParts : undefined,
      });
      currentPageHeight = s.acts.reduce((sum, a) => sum + calculateActivityHeight(a), calculateDayHeaderHeight(day));
    });
  }

  if (currentPageDays.length > 0) {
    pages.push({ type: "itinerary", days: currentPageDays });
  }

  return pages;
}

/**
 * Costruisce l'HTML per la copertina e il sommario del viaggio (Pagina 1).
 */
function renderCoverPage(trip: Trip, pageNum: number, totalPages: number): string {
  const currency = trip.currency || "€";
  const dateRangeStr = formatShortDateRange(trip.startDate, trip.endDate);
  const flight = trip.selectedFlight;
  const breakdown = trip.budgetBreakdown || {
    hotel: 0,
    transport: 0,
    food: 0,
    activities: 0,
    extra: 0,
    flight: 0,
  };

  const totalActivitiesCount = trip.days.reduce((acc, d) => acc + (d.activities?.length || 0), 0);

  return `
    <div class="pdf-page" style="width: 794px; height: 1123px; max-height: 1123px; padding: 40px 44px; box-sizing: border-box; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
      
      <div>
        <!-- TOP BRAND HEADER -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 14px; margin-bottom: 20px; box-sizing: border-box;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #4f46e5, #06b6d4); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 15px; line-height: 1;">
              ✈️
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 800; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase; line-height: 1.2;">AI Travel Planner</div>
              <div style="font-size: 10px; color: #64748b; font-weight: 500; line-height: 1.2;">Guida Ufficiale di Viaggio</div>
            </div>
          </div>

          <div style="display: inline-flex; align-items: center; gap: 6px; height: 26px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 13px; padding: 0 12px; box-sizing: border-box;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
            <span style="font-size: 11px; font-weight: 600; color: #334155; line-height: 1;">Itinerario Confermato</span>
          </div>
        </div>

        <!-- HERO COVER CARD -->
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); border-radius: 16px; padding: 24px 28px; color: #ffffff; box-shadow: 0 10px 25px -5px rgba(49, 46, 129, 0.2); margin-bottom: 20px; position: relative; box-sizing: border-box;">
          
          <!-- DESTINATION BADGE CONCENTRATO E ALLINEATO PERFETTAMENTE -->
          <div style="display: inline-flex; align-items: center; justify-content: center; height: 26px; background: rgba(255, 255, 255, 0.22); border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 13px; padding: 0 12px; margin-bottom: 12px; box-sizing: border-box;">
            <span style="font-size: 12px; line-height: 1; margin-right: 5px;">📍</span>
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #ffffff; line-height: 1;">${escapeHtml(trip.destination)}</span>
          </div>

          <h1 style="font-size: 24px; font-weight: 800; line-height: 1.25; margin: 0 0 8px 0; color: #ffffff;">
            ${escapeHtml(trip.title || `Viaggio a ${trip.destination}`)}
          </h1>
          ${dateRangeStr ? `<div style="font-size: 12px; color: #cbd5e1; font-weight: 500; margin-bottom: 16px; display: flex; align-items: center; gap: 6px; line-height: 1.2;">📅 ${escapeHtml(dateRangeStr)}</div>` : ""}
          
          <!-- STATS ROW -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; border-top: 1px solid rgba(255, 255, 255, 0.15); padding-top: 14px; box-sizing: border-box;">
            <div>
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; line-height: 1.2;">Durata</div>
              <div style="font-size: 15px; font-weight: 700; color: #ffffff; line-height: 1.3; margin-top: 2px;">${trip.durationDays} Giorni</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; line-height: 1.2;">Budget Totale</div>
              <div style="font-size: 15px; font-weight: 700; color: #34d399; line-height: 1.3; margin-top: 2px;">${trip.totalBudget} ${escapeHtml(currency)}</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; line-height: 1.2;">Esperienze</div>
              <div style="font-size: 15px; font-weight: 700; color: #ffffff; line-height: 1.3; margin-top: 2px;">${totalActivitiesCount} Tappe</div>
            </div>
          </div>
        </div>

        <!-- FLIGHT DETAILS SECTION (SE PRESENTE) -->
        ${flight ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-bottom: 18px; box-sizing: border-box;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 15px; line-height: 1;">✈️</span>
                <span style="font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1;">Dettagli Volo Selezionato</span>
              </div>
              <div style="display: inline-flex; align-items: center; justify-content: center; height: 22px; padding: 0 10px; border-radius: 11px; background: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 700; line-height: 1; box-sizing: border-box;">
                ${escapeHtml(flight.airline)} ${flight.flightNumber ? `· ${escapeHtml(flight.flightNumber)}` : ""}
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px; box-sizing: border-box;">
              <div style="text-align: left;">
                <div style="font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.2;">${escapeHtml(flight.departureAirport)}</div>
                <div style="font-size: 11px; font-weight: 600; color: #475569; line-height: 1.2; margin-top: 2px;">${escapeHtml(flight.departureTime)}</div>
                ${flight.departureDate ? `<div style="font-size: 9.5px; color: #94a3b8; line-height: 1.2;">${escapeHtml(flight.departureDate)}</div>` : ""}
              </div>

              <div style="display: flex; flex-direction: column; align-items: center; padding: 0 14px;">
                <div style="font-size: 9.5px; font-weight: 600; color: #64748b; line-height: 1;">${escapeHtml(flight.duration || "Volo Diretto")}</div>
                <div style="width: 90px; height: 2px; background: #cbd5e1; position: relative; margin: 4px 0;">
                  <div style="position: absolute; top: -5px; right: 40px; font-size: 9px;">✈</div>
                </div>
                <div style="font-size: 9px; color: #94a3b8; line-height: 1;">${flight.stops === 0 ? "Diretto" : `${flight.stops} Scalo`}</div>
              </div>

              <div style="text-align: right;">
                <div style="font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.2;">${escapeHtml(flight.arrivalAirport)}</div>
                <div style="font-size: 11px; font-weight: 600; color: #475569; line-height: 1.2; margin-top: 2px;">${escapeHtml(flight.arrivalTime)}</div>
                ${flight.returnDate ? `<div style="font-size: 9.5px; color: #94a3b8; line-height: 1.2;">${escapeHtml(flight.returnDate)}</div>` : ""}
              </div>
            </div>
          </div>
        ` : ""}

        <!-- BUDGET BREAKDOWN SECTION -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-bottom: 18px; box-sizing: border-box;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 15px; line-height: 1;">📊</span>
              <span style="font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1;">Ripartizione Stimata del Budget</span>
            </div>
            <span style="font-size: 11px; color: #64748b; line-height: 1;">Totale: <strong style="color: #0f172a;">${trip.totalBudget} ${escapeHtml(currency)}</strong></span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; box-sizing: border-box;">
              <div style="font-size: 10.5px; color: #64748b; display: flex; align-items: center; gap: 4px; line-height: 1.2;">🏨 Alloggio</div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">~${breakdown.hotel || 0} ${escapeHtml(currency)}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; box-sizing: border-box;">
              <div style="font-size: 10.5px; color: #64748b; display: flex; align-items: center; gap: 4px; line-height: 1.2;">🍽️ Cibo & Bevande</div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">~${breakdown.food || 0} ${escapeHtml(currency)}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; box-sizing: border-box;">
              <div style="font-size: 10.5px; color: #64748b; display: flex; align-items: center; gap: 4px; line-height: 1.2;">🚗 Trasporti</div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">~${breakdown.transport || 0} ${escapeHtml(currency)}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; box-sizing: border-box;">
              <div style="font-size: 10.5px; color: #64748b; display: flex; align-items: center; gap: 4px; line-height: 1.2;">🎟️ Attività</div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">~${breakdown.activities || 0} ${escapeHtml(currency)}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; box-sizing: border-box;">
              <div style="font-size: 10.5px; color: #64748b; display: flex; align-items: center; gap: 4px; line-height: 1.2;">🛍️ Extra & Svago</div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">~${breakdown.extra || 0} ${escapeHtml(currency)}</div>
            </div>
            ${breakdown.flight ? `
              <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; box-sizing: border-box;">
                <div style="font-size: 10.5px; color: #64748b; display: flex; align-items: center; gap: 4px; line-height: 1.2;">✈️ Volo</div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">~${breakdown.flight} ${escapeHtml(currency)}</div>
              </div>
            ` : `
              <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; box-sizing: border-box;">
                <div style="font-size: 10.5px; color: #64748b; display: flex; align-items: center; gap: 4px; line-height: 1.2;">🎯 Tappe Totali</div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">${trip.days.length} Giornate</div>
              </div>
            `}
          </div>
        </div>

        <!-- TRAVEL CHECKLIST / QUICK TIPS BOX -->
        <div style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 10px; padding: 12px 16px; box-sizing: border-box;">
          <div style="font-size: 11.5px; font-weight: 700; color: #1e40af; margin-bottom: 4px; display: flex; align-items: center; gap: 5px; line-height: 1.2;">
            💡 Consigli Pratici per il Tuo Viaggio
          </div>
          <div style="font-size: 10.5px; color: #3b82f6; line-height: 1.45;">
            Salva questo documento PDF sul tuo smartphone per consultarlo comodamente offline. Ricordati di verificare orari di apertura dei monumenti e prenotazioni in loco.
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 9.5px; color: #94a3b8; box-sizing: border-box;">
        <div>AI Travel Planner · Guida ufficiale di viaggio generata automaticamente</div>
        <div style="font-weight: 600;">Pagina ${pageNum} di ${totalPages}</div>
      </div>
    </div>
  `;
}

/**
 * Costruisce l'HTML per le pagine dell'itinerario giorno per giorno.
 */
function renderItineraryPage(
  plan: PagePlan,
  trip: Trip,
  pageNum: number,
  totalPages: number
): string {
  const currency = trip.currency || "€";

  const daysHtml = (plan.days || [])
    .map((item) => {
      const { day, activities, isContinuation, partIndex, totalParts } = item;
      const formattedDate = formatDateIT(day.date);

      const continuationBadge = isContinuation && totalParts && partIndex
        ? `<span style="display: inline-flex; align-items: center; justify-content: center; height: 18px; font-size: 9.5px; background: #e2e8f0; color: #475569; padding: 0 6px; border-radius: 9px; font-weight: 600; margin-left: 6px; line-height: 1; box-sizing: border-box;">Parte ${partIndex}/${totalParts}</span>`
        : "";

      const activitiesHtml = activities.length > 0
        ? activities
            .map((act) => {
              const meta = CATEGORY_META[act.category] || CATEGORY_META.OTHER;
              
              // Verifica se c'è un hotel selezionato
              const selectedHotel = act.hotelOptions?.find(
                (h) => h.id === act.selectedHotelId || h.isSelected
              );

              return `
                <div style="display: flex; gap: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; margin-bottom: 8px; box-sizing: border-box; align-items: flex-start;">
                  
                  <!-- TIME & CATEGORY COLUMN -->
                  <div style="width: 115px; flex-shrink: 0; display: flex; flex-direction: column; gap: 5px; box-sizing: border-box;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 4px; height: 23px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #0f172a; font-size: 11px; font-weight: 700; line-height: 1; box-sizing: border-box;">
                      <span style="font-size: 11px; line-height: 1;">⏱</span>
                      <span style="line-height: 1;">${escapeHtml(act.time || "Orario Libero")}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 4px; height: 21px; background: ${meta.bg}; color: ${meta.color}; border-radius: 5px; font-size: 9.5px; font-weight: 700; line-height: 1; padding: 0 4px; box-sizing: border-box; text-align: center;">
                      <span style="font-size: 10px; line-height: 1;">${meta.emoji}</span>
                      <span style="line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(meta.label)}</span>
                    </div>
                  </div>

                  <!-- CONTENT COLUMN -->
                  <div style="flex: 1; min-width: 0; box-sizing: border-box;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 3px;">
                      <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1.25;">
                        ${escapeHtml(act.title)}
                      </h4>
                      ${act.estimatedCost > 0 ? `
                        <div style="display: inline-flex; align-items: center; justify-content: center; height: 22px; padding: 0 8px; border-radius: 11px; background: #d1fae5; color: #047857; font-size: 11px; font-weight: 700; line-height: 1; white-space: nowrap; box-sizing: border-box; flex-shrink: 0;">
                          <span>~${act.estimatedCost} ${escapeHtml(currency)}</span>
                        </div>
                      ` : `
                        <div style="display: inline-flex; align-items: center; justify-content: center; height: 22px; padding: 0 8px; border-radius: 11px; background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 600; line-height: 1; white-space: nowrap; box-sizing: border-box; flex-shrink: 0;">
                          <span>Gratuito</span>
                        </div>
                      `}
                    </div>

                    ${act.description ? `
                      <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.4;">
                        ${escapeHtml(act.description)}
                      </p>
                    ` : ""}

                    ${selectedHotel ? `
                      <div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 6px; padding: 6px 8px; margin-top: 6px; font-size: 10.5px; color: #0f766e; box-sizing: border-box;">
                        <div style="font-weight: 700; display: flex; align-items: center; gap: 4px; line-height: 1.2;">
                          🏨 ${escapeHtml(selectedHotel.name)}
                          ${selectedHotel.rating ? `<span style="color: #d97706; font-size: 9.5px;">★ ${selectedHotel.rating}</span>` : ""}
                        </div>
                        ${selectedHotel.address ? `<div style="font-size: 9.5px; color: #115e59; margin-top: 1px; line-height: 1.2;">📍 ${escapeHtml(selectedHotel.address)}</div>` : ""}
                        ${selectedHotel.pricePerNight ? `<div style="font-size: 9.5px; font-weight: 600; margin-top: 1px; line-height: 1.2;">Prezzo: ~${selectedHotel.pricePerNight} ${escapeHtml(selectedHotel.currency || currency)}/notte</div>` : ""}
                      </div>
                    ` : ""}
                  </div>
                </div>
              `;
            })
            .join("")
        : `
          <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; font-size: 11px; color: #64748b; margin-bottom: 8px; box-sizing: border-box;">
            Nessuna attività programmata per questo orario. Giornata libera per esplorare in autonomia!
          </div>
        `;

      return `
        <div style="margin-bottom: 16px; box-sizing: border-box;">
          <!-- DAY CARD HEADER -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #4f46e5; border-radius: 10px; padding: 8px 14px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; height: 20px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #4338ca; background: #e0e7ff; padding: 0 7px; border-radius: 5px; line-height: 1; box-sizing: border-box;">
                  Giorno ${day.dayNumber}
                </div>
                ${continuationBadge}
                <span style="font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.2;">
                  ${escapeHtml(day.title || `Giorno ${day.dayNumber}`)}
                </span>
              </div>
              <div style="font-size: 10px; color: #64748b; display: flex; align-items: center; gap: 8px; line-height: 1.2;">
                ${day.city ? `<span>📍 ${escapeHtml(day.city)}</span>` : ""}
                ${formattedDate ? `<span>📅 ${escapeHtml(formattedDate)}</span>` : ""}
              </div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 9px; color: #64748b; text-transform: uppercase; line-height: 1;">Spesa stimata</div>
              <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1;">
                ~${day.estimatedCost || 0} ${escapeHtml(currency)}
              </div>
            </div>
          </div>

          ${day.description && !isContinuation ? `
            <div style="font-size: 10.5px; color: #475569; font-style: italic; margin-bottom: 8px; padding: 0 4px; line-height: 1.35;">
              "${escapeHtml(day.description)}"
            </div>
          ` : ""}

          <!-- ACTIVITIES LIST -->
          <div>
            ${activitiesHtml}
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="pdf-page" style="width: 794px; height: 1123px; max-height: 1123px; padding: 36px 44px; box-sizing: border-box; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
      
      <div>
        <!-- TOP RUNNING HEADER -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; box-sizing: border-box;">
          <div style="font-size: 10.5px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; line-height: 1;">
            <span>✈️</span>
            <span>${escapeHtml(trip.title || trip.destination)} · Itinerario Dettagliato</span>
          </div>
          <div style="font-size: 9.5px; color: #94a3b8; line-height: 1;">
            AI Travel Planner
          </div>
        </div>

        <!-- DAYS CONTENT -->
        <div>
          ${daysHtml}
        </div>
      </div>

      <!-- FOOTER -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 9.5px; color: #94a3b8; box-sizing: border-box;">
        <div>Guida ufficiale stampabile · ${escapeHtml(trip.destination)}</div>
        <div style="font-weight: 600;">Pagina ${pageNum} di ${totalPages}</div>
      </div>
    </div>
  `;
}

/**
 * Genera e scarica automaticamente la guida di viaggio in formato PDF A4.
 */
export async function downloadTripPDF(trip: Trip): Promise<void> {
  const plans = planPages(trip);
  const totalPages = plans.length;

  // Crea container DOM invisibile per il rendering
  const container = document.createElement("div");
  container.id = "ai-travel-planner-pdf-export-container";
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.zIndex = "-9999";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#0f172a";

  let pagesHtml = "";
  plans.forEach((plan, index) => {
    const pageNum = index + 1;
    if (plan.type === "cover") {
      pagesHtml += renderCoverPage(trip, pageNum, totalPages);
    } else {
      pagesHtml += renderItineraryPage(plan, trip, pageNum, totalPages);
    }
  });

  container.innerHTML = pagesHtml;
  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageElements = container.querySelectorAll<HTMLElement>(".pdf-page");

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];
      if (!pageEl) continue;

      const canvas = await html2canvas(pageEl, {
        scale: 2, // 2x High-DPI per massima nitidezza tipografica
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      if (i > 0) {
        pdf.addPage("a4", "portrait");
      }

      // A4 dimensions in mm: 210 x 297
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }

    const cleanDest = sanitizeFilename(trip.destination || trip.title || "viaggio");
    const filename = `guida-viaggio-${cleanDest || "itinerario"}.pdf`;

    pdf.save(filename);
  } finally {
    // Rimuovi sempre il container DOM temporaneo
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
