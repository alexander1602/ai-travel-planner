// utils/pdf-generator.ts
// Generatore client-side di Travel Guide in PDF elegante, compatto, stampabile e ad alta risoluzione (A4).

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Activity, ActivityCategory, Trip } from "@/types/trip";

const CATEGORY_META: Record<ActivityCategory, { emoji: string; label: string; color: string; bg: string }> = {
  SIGHTSEEING: { emoji: "🏛️", label: "Monumenti & Visite", color: "#3730a3", bg: "#e0e7ff" },
  FOOD: { emoji: "🍽️", label: "Cibo & Ristoranti", color: "#9f1239", bg: "#ffe4e6" },
  TRANSPORT: { emoji: "🚗", label: "Trasporti", color: "#075985", bg: "#e0f2fe" },
  ACCOMMODATION: { emoji: "🏨", label: "Alloggio & Hotel", color: "#115e59", bg: "#ccfbf1" },
  ACTIVITY: { emoji: "🎟️", label: "Esperienza", color: "#92400e", bg: "#fef3c7" },
  SHOPPING: { emoji: "🛍️", label: "Shopping", color: "#9d174d", bg: "#fce7f3" },
  NIGHTLIFE: { emoji: "🎉", label: "Vita Notturna", color: "#5b21b6", bg: "#ede9fe" },
  WELLNESS: { emoji: "💆", label: "Relax & Wellness", color: "#065f46", bg: "#d1fae5" },
  CULTURE: { emoji: "🎨", label: "Arte & Cultura", color: "#9a3412", bg: "#ffedd5" },
  ENTERTAINMENT: { emoji: "🍿", label: "Intrattenimento", color: "#3730a3", bg: "#e0e7ff" },
  RELAX: { emoji: "☕", label: "Pausa Relax", color: "#3f6212", bg: "#ecfccb" },
  OTHER: { emoji: "📍", label: "Tappa", color: "#1e293b", bg: "#f1f5f9" },
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
const PAGE_HEIGHT_BUDGET = 960; // Pixel utili per pagina A4

function calculateActivityHeight(act: Activity): number {
  let h = 58; // altezza base card attività
  if (act.description) {
    const lines = Math.max(1, Math.ceil(act.description.length / 80));
    h += lines * 16;
  }
  if (act.hotelOptions && act.hotelOptions.length > 0) {
    h += 48; // card hotel
  }
  return h + 8; // margine
}

function calculateDayHeaderHeight(day: Trip["days"][0]): number {
  let h = 48; // card header giorno
  if (day.description) {
    h += 20; // citazione
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

    // Calcola altezza complessiva della giornata
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
 * Usa Arial, sans-serif e padding espliciti senza flexbox fittizio per garantire centratura assoluta su html2canvas.
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
    <div class="pdf-page" style="width: 794px; height: 1123px; max-height: 1123px; padding: 40px 44px; box-sizing: border-box; background: #ffffff; color: #0f172a; font-family: Arial, Helvetica, sans-serif; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
      
      <div>
        <!-- TOP BRAND HEADER -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #f1f5f9; padding-bottom: 14px; margin-bottom: 20px;">
          <tr>
            <td style="vertical-align: middle; text-align: left;">
              <table style="border-collapse: collapse;">
                <tr>
                  <td style="width: 34px; height: 34px; background: #4338ca; border-radius: 8px; text-align: center; vertical-align: middle; font-size: 16px; color: #ffffff;">
                    ✈️
                  </td>
                  <td style="padding-left: 10px; vertical-align: middle;">
                    <div style="font-size: 13px; font-weight: 800; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase; line-height: 1.2;">AI Travel Planner</div>
                    <div style="font-size: 10px; color: #64748b; font-weight: 500; line-height: 1.2; margin-top: 2px;">Guida Ufficiale di Viaggio</div>
                  </td>
                </tr>
              </table>
            </td>
            <td style="vertical-align: middle; text-align: right;">
              <div style="display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 5px 12px; font-size: 11px; font-weight: 600; color: #334155; line-height: 1.2;">
                <span style="color: #10b981; font-weight: 800;">●</span> Itinerario Confermato
              </div>
            </td>
          </tr>
        </table>

        <!-- HERO COVER CARD -->
        <div style="background: #1e1b4b; border-radius: 16px; padding: 24px 28px; color: #ffffff; margin-bottom: 20px; box-sizing: border-box;">
          
          <!-- DESTINATION BADGE -->
          <div style="display: inline-block; background: rgba(255, 255, 255, 0.22); border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 14px; padding: 5px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; line-height: 1.2; margin-bottom: 12px;">
            📍 ${escapeHtml(trip.destination)}
          </div>

          <h1 style="font-size: 24px; font-weight: 800; line-height: 1.25; margin: 0 0 8px 0; color: #ffffff;">
            ${escapeHtml(trip.title || `Viaggio a ${trip.destination}`)}
          </h1>
          ${dateRangeStr ? `<div style="font-size: 12px; color: #cbd5e1; font-weight: 500; margin-bottom: 16px; line-height: 1.2;">📅 ${escapeHtml(dateRangeStr)}</div>` : ""}
          
          <!-- STATS ROW (TABLE FOR PERFECT ALIGNMENT) -->
          <table style="width: 100%; border-collapse: collapse; border-top: 1px solid rgba(255, 255, 255, 0.2); margin-top: 14px; padding-top: 12px;">
            <tr>
              <td style="width: 33.33%; padding-top: 12px; vertical-align: top;">
                <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; line-height: 1.2;">Durata</div>
                <div style="font-size: 16px; font-weight: 700; color: #ffffff; line-height: 1.3; margin-top: 3px;">${trip.durationDays} Giorni</div>
              </td>
              <td style="width: 33.33%; padding-top: 12px; vertical-align: top;">
                <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; line-height: 1.2;">Budget Totale</div>
                <div style="font-size: 16px; font-weight: 700; color: #34d399; line-height: 1.3; margin-top: 3px;">${trip.totalBudget} ${escapeHtml(currency)}</div>
              </td>
              <td style="width: 33.33%; padding-top: 12px; vertical-align: top;">
                <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; line-height: 1.2;">Esperienze</div>
                <div style="font-size: 16px; font-weight: 700; color: #ffffff; line-height: 1.3; margin-top: 3px;">${totalActivitiesCount} Tappe</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- FLIGHT DETAILS SECTION (SE PRESENTE) -->
        ${flight ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; box-sizing: border-box;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
              <tr>
                <td style="vertical-align: middle; text-align: left;">
                  <span style="font-size: 14px; vertical-align: middle; margin-right: 4px;">✈️</span>
                  <span style="font-size: 12px; font-weight: 700; color: #0f172a; vertical-align: middle;">Dettagli Volo Selezionato</span>
                </td>
                <td style="vertical-align: middle; text-align: right;">
                  <div style="display: inline-block; background: #e0e7ff; color: #4338ca; border-radius: 12px; padding: 3px 10px; font-size: 11px; font-weight: 700; line-height: 1.2;">
                    ${escapeHtml(flight.airline)} ${flight.flightNumber ? `· ${escapeHtml(flight.flightNumber)}` : ""}
                  </div>
                </td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
              <tr>
                <td style="width: 35%; padding: 10px 14px; vertical-align: middle; text-align: left;">
                  <div style="font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.2;">${escapeHtml(flight.departureAirport)}</div>
                  <div style="font-size: 11px; font-weight: 600; color: #475569; line-height: 1.2; margin-top: 2px;">${escapeHtml(flight.departureTime)}</div>
                  ${flight.departureDate ? `<div style="font-size: 9.5px; color: #94a3b8; line-height: 1.2; margin-top: 1px;">${escapeHtml(flight.departureDate)}</div>` : ""}
                </td>

                <td style="width: 30%; padding: 10px; vertical-align: middle; text-align: center;">
                  <div style="font-size: 9.5px; font-weight: 600; color: #64748b; line-height: 1.2;">${escapeHtml(flight.duration || "Volo Diretto")}</div>
                  <div style="font-size: 11px; color: #94a3b8; margin: 2px 0;">─── ✈ ───</div>
                  <div style="font-size: 9px; color: #94a3b8; line-height: 1.2;">${flight.stops === 0 ? "Diretto" : `${flight.stops} Scalo`}</div>
                </td>

                <td style="width: 35%; padding: 10px 14px; vertical-align: middle; text-align: right;">
                  <div style="font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.2;">${escapeHtml(flight.arrivalAirport)}</div>
                  <div style="font-size: 11px; font-weight: 600; color: #475569; line-height: 1.2; margin-top: 2px;">${escapeHtml(flight.arrivalTime)}</div>
                  ${flight.returnDate ? `<div style="font-size: 9.5px; color: #94a3b8; line-height: 1.2; margin-top: 1px;">${escapeHtml(flight.returnDate)}</div>` : ""}
                </td>
              </tr>
            </table>
          </div>
        ` : ""}

        <!-- BUDGET BREAKDOWN SECTION -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; box-sizing: border-box;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
            <tr>
              <td style="vertical-align: middle; text-align: left;">
                <span style="font-size: 14px; vertical-align: middle; margin-right: 4px;">📊</span>
                <span style="font-size: 12px; font-weight: 700; color: #0f172a; vertical-align: middle;">Ripartizione Stimata del Budget</span>
              </td>
              <td style="vertical-align: middle; text-align: right;">
                <span style="font-size: 11px; color: #64748b; line-height: 1.2;">Totale: <strong style="color: #0f172a;">${trip.totalBudget} ${escapeHtml(currency)}</strong></span>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin: -8px;">
            <tr>
              <td style="width: 33.33%; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; vertical-align: middle;">
                <div style="font-size: 10.5px; color: #64748b; line-height: 1.2;">🏨 Alloggio</div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">~${breakdown.hotel || 0} ${escapeHtml(currency)}</div>
              </td>
              <td style="width: 33.33%; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; vertical-align: middle;">
                <div style="font-size: 10.5px; color: #64748b; line-height: 1.2;">🍽️ Ristorazione</div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">~${breakdown.food || 0} ${escapeHtml(currency)}</div>
              </td>
              <td style="width: 33.33%; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; vertical-align: middle;">
                <div style="font-size: 10.5px; color: #64748b; line-height: 1.2;">🚗 Trasporti</div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">~${breakdown.transport || 0} ${escapeHtml(currency)}</div>
              </td>
            </tr>
            <tr>
              <td style="width: 33.33%; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; vertical-align: middle;">
                <div style="font-size: 10.5px; color: #64748b; line-height: 1.2;">🎟️ Attività</div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">~${breakdown.activities || 0} ${escapeHtml(currency)}</div>
              </td>
              <td style="width: 33.33%; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; vertical-align: middle;">
                <div style="font-size: 10.5px; color: #64748b; line-height: 1.2;">🛍️ Extra & Svago</div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">~${breakdown.extra || 0} ${escapeHtml(currency)}</div>
              </td>
              <td style="width: 33.33%; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; vertical-align: middle;">
                ${breakdown.flight ? `
                  <div style="font-size: 10.5px; color: #64748b; line-height: 1.2;">✈️ Volo</div>
                  <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">~${breakdown.flight} ${escapeHtml(currency)}</div>
                ` : `
                  <div style="font-size: 10.5px; color: #64748b; line-height: 1.2;">🎯 Tappe Totali</div>
                  <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">${trip.days.length} Giornate</div>
                `}
              </td>
            </tr>
          </table>
        </div>

        <!-- TRAVEL CHECKLIST / QUICK TIPS BOX -->
        <div style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 10px; padding: 12px 16px; box-sizing: border-box;">
          <div style="font-size: 11.5px; font-weight: 700; color: #1e40af; margin-bottom: 3px; line-height: 1.2;">
            💡 Consigli Pratici per il Tuo Viaggio
          </div>
          <div style="font-size: 10.5px; color: #3b82f6; line-height: 1.45;">
            Salva questo documento PDF sul tuo smartphone per consultarlo offline. Ricordati di verificare orari di apertura dei monumenti e prenotazioni in loco.
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e2e8f0; padding-top: 10px;">
        <tr>
          <td style="vertical-align: middle; text-align: left; font-size: 9.5px; color: #94a3b8; padding-top: 8px;">
            AI Travel Planner · Guida ufficiale di viaggio generata automaticamente
          </td>
          <td style="vertical-align: middle; text-align: right; font-size: 9.5px; color: #94a3b8; font-weight: 700; padding-top: 8px;">
            Pagina ${pageNum} di ${totalPages}
          </td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Costruisce l'HTML per le pagine dell'itinerario giorno per giorno.
 * Usa tabelle e box inline con padding espliciti e font Arial per eliminare i bug di offset verticale di html2canvas.
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
        ? `<div style="display: inline-block; background: #e2e8f0; color: #475569; padding: 2px 7px; border-radius: 5px; font-size: 9.5px; font-weight: 600; margin-left: 6px; line-height: 1.2; vertical-align: middle;">Parte ${partIndex}/${totalParts}</div>`
        : "";

      const activitiesHtml = activities.length > 0
        ? activities
            .map((act) => {
              const meta = CATEGORY_META[act.category] || CATEGORY_META.OTHER;
              
              // Verifica se c'è un hotel selezionato
              const selectedHotel = act.hotelOptions?.find(
                (h) => h.id === act.selectedHotelId || h.isSelected
              );

              const priceBadge = act.estimatedCost > 0
                ? `<div style="display: inline-block; background: #d1fae5; color: #047857; border-radius: 12px; padding: 3px 9px; font-size: 11px; font-weight: 700; line-height: 1.2; text-align: center; white-space: nowrap;">~${act.estimatedCost} ${escapeHtml(currency)}</div>`
                : `<div style="display: inline-block; background: #f1f5f9; color: #475569; border-radius: 12px; padding: 3px 9px; font-size: 10px; font-weight: 600; line-height: 1.2; text-align: center; white-space: nowrap;">Gratuito</div>`;

              return `
                <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; box-sizing: border-box;">
                  <tr>
                    <!-- TIME & CATEGORY CELL -->
                    <td style="width: 120px; vertical-align: top; padding: 9px 8px 9px 10px;">
                      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 4px 6px; text-align: center; font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.2; margin-bottom: 4px;">
                        ⏱ ${escapeHtml(act.time || "Orario Libero")}
                      </div>
                      <div style="background: ${meta.bg}; color: ${meta.color}; border-radius: 5px; padding: 3px 5px; text-align: center; font-size: 9.5px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${meta.emoji} ${escapeHtml(meta.label)}
                      </div>
                    </td>

                    <!-- CONTENT CELL -->
                    <td style="vertical-align: top; padding: 9px 12px 9px 4px;">
                      <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
                        <tr>
                          <td style="vertical-align: middle; text-align: left;">
                            <div style="font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.25;">
                              ${escapeHtml(act.title)}
                            </div>
                          </td>
                          <td style="vertical-align: middle; text-align: right; width: 1%; white-space: nowrap; padding-left: 8px;">
                            ${priceBadge}
                          </td>
                        </tr>
                      </table>

                      ${act.description ? `
                        <div style="font-size: 11px; color: #475569; line-height: 1.4; margin-top: 2px;">
                          ${escapeHtml(act.description)}
                        </div>
                      ` : ""}

                      ${selectedHotel ? `
                        <div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 6px; padding: 5px 8px; margin-top: 6px; font-size: 10px; color: #0f766e;">
                          <div style="font-weight: 700; line-height: 1.2;">
                            🏨 ${escapeHtml(selectedHotel.name)} ${selectedHotel.rating ? `<span style="color: #d97706; font-size: 9.5px;">★ ${selectedHotel.rating}</span>` : ""}
                          </div>
                          ${selectedHotel.address ? `<div style="font-size: 9.5px; color: #115e59; margin-top: 2px; line-height: 1.2;">📍 ${escapeHtml(selectedHotel.address)}</div>` : ""}
                          ${selectedHotel.pricePerNight ? `<div style="font-size: 9.5px; font-weight: 600; margin-top: 2px; line-height: 1.2;">Prezzo: ~${selectedHotel.pricePerNight} ${escapeHtml(selectedHotel.currency || currency)}/notte</div>` : ""}
                        </div>
                      ` : ""}
                    </td>
                  </tr>
                </table>
              `;
            })
            .join("")
        : `
          <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; font-size: 11px; color: #64748b; margin-bottom: 8px;">
            Nessuna attività programmata. Giornata libera per esplorare in autonomia!
          </div>
        `;

      return `
        <div style="margin-bottom: 14px; box-sizing: border-box;">
          <!-- DAY CARD HEADER (TABLE FOR ABSOLUTE METRIC PRECISION) -->
          <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #4338ca; border-radius: 8px; padding: 8px 12px; margin-bottom: 6px;">
            <tr>
              <td style="vertical-align: middle; text-align: left; padding: 6px 8px 6px 12px;">
                <div style="display: inline-block; background: #e0e7ff; color: #4338ca; padding: 3px 7px; border-radius: 5px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; line-height: 1.2; vertical-align: middle;">
                  Giorno ${day.dayNumber}
                </div>
                ${continuationBadge}
                <span style="font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.2; vertical-align: middle; margin-left: 6px;">
                  ${escapeHtml(day.title || `Giorno ${day.dayNumber}`)}
                </span>
                <div style="font-size: 10px; color: #64748b; line-height: 1.2; margin-top: 3px;">
                  ${day.city ? `<span>📍 ${escapeHtml(day.city)}</span>` : ""}
                  ${formattedDate ? `<span style="margin-left: 8px;">📅 ${escapeHtml(formattedDate)}</span>` : ""}
                </div>
              </td>
              <td style="vertical-align: middle; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap;">
                <div style="font-size: 9px; color: #64748b; text-transform: uppercase; line-height: 1.2;">Spesa stimata</div>
                <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px; line-height: 1.2;">
                  ~${day.estimatedCost || 0} ${escapeHtml(currency)}
                </div>
              </td>
            </tr>
          </table>

          ${day.description && !isContinuation ? `
            <div style="font-size: 10.5px; color: #475569; font-style: italic; margin-bottom: 6px; padding: 0 4px; line-height: 1.35;">
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
    <div class="pdf-page" style="width: 794px; height: 1123px; max-height: 1123px; padding: 36px 44px; box-sizing: border-box; background: #ffffff; color: #0f172a; font-family: Arial, Helvetica, sans-serif; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
      
      <div>
        <!-- TOP RUNNING HEADER -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 14px;">
          <tr>
            <td style="vertical-align: middle; text-align: left; font-size: 10.5px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.5px;">
              ✈️ ${escapeHtml(trip.title || trip.destination)} · Itinerario Dettagliato
            </td>
            <td style="vertical-align: middle; text-align: right; font-size: 9.5px; color: #94a3b8;">
              AI Travel Planner
            </td>
          </tr>
        </table>

        <!-- DAYS CONTENT -->
        <div>
          ${daysHtml}
        </div>
      </div>

      <!-- FOOTER -->
      <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e2e8f0; padding-top: 8px;">
        <tr>
          <td style="vertical-align: middle; text-align: left; font-size: 9.5px; color: #94a3b8; padding-top: 6px;">
            Guida ufficiale stampabile · ${escapeHtml(trip.destination)}
          </td>
          <td style="vertical-align: middle; text-align: right; font-size: 9.5px; color: #94a3b8; font-weight: 700; padding-top: 6px;">
            Pagina ${pageNum} di ${totalPages}
          </td>
        </tr>
      </table>
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
