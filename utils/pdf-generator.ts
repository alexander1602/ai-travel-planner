// utils/pdf-generator.ts
// Generatore client-side di Travel Guide in PDF elegante, stampabile e ad alta risoluzione (A4).

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Activity, ActivityCategory, Trip } from "@/types/trip";

const CATEGORY_META: Record<ActivityCategory, { emoji: string; label: string; color: string; bg: string }> = {
  SIGHTSEEING: { emoji: "🏛️", label: "Visita & Monumenti", color: "#4338ca", bg: "#e0e7ff" },
  FOOD: { emoji: "🍽️", label: "Cibo & Ristorazione", color: "#be123c", bg: "#ffe4e6" },
  TRANSPORT: { emoji: "🚗", label: "Trasporti & Spostamenti", color: "#0369a1", bg: "#e0f2fe" },
  ACCOMMODATION: { emoji: "🏨", label: "Alloggio & Hotel", color: "#0f766e", bg: "#ccfbf1" },
  ACTIVITY: { emoji: "🎟️", label: "Esperienza & Attività", color: "#b45309", bg: "#fef3c7" },
  SHOPPING: { emoji: "🛍️", label: "Shopping", color: "#be185d", bg: "#fce7f3" },
  NIGHTLIFE: { emoji: "🎉", label: "Vita Notturna", color: "#6d28d9", bg: "#ede9fe" },
  WELLNESS: { emoji: "💆", label: "Benessere & Relax", color: "#047857", bg: "#d1fae5" },
  CULTURE: { emoji: "🎨", label: "Arte & Cultura", color: "#c2410c", bg: "#ffedd5" },
  ENTERTAINMENT: { emoji: "🍿", label: "Intrattenimento", color: "#4f46e5", bg: "#e0e7ff" },
  RELAX: { emoji: "☕", label: "Pausa Relax", color: "#4d7c0f", bg: "#ecfccb" },
  OTHER: { emoji: "📍", label: "Altro", color: "#334155", bg: "#f1f5f9" },
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
 * Organizza i giorni del viaggio in blocchi di pagine A4 per evitare overflow grafici.
 */
interface PagePlan {
  type: "cover" | "itinerary";
  days?: {
    day: Trip["days"][0];
    activities: Activity[];
    isContinuation?: boolean;
    partIndex?: number;
    totalParts?: number;
  }[];
}

function planPages(trip: Trip): PagePlan[] {
  const pages: PagePlan[] = [];

  // Pagina 1: Cover + Overview + Volo + Budget Breakdown
  pages.push({ type: "cover" });

  // Pagine successive: Itinerario giornaliero
  // Ogni pagina A4 può contenere comodamente circa 3 attività dettagliate con descrizioni.
  const MAX_ACTIVITIES_PER_PAGE = 3;

  let currentDaysInPage: PagePlan["days"] = [];
  let currentActivitiesCount = 0;

  for (const day of trip.days) {
    const activities = day.activities || [];

    if (activities.length === 0) {
      if (currentActivitiesCount + 1 > MAX_ACTIVITIES_PER_PAGE && currentDaysInPage && currentDaysInPage.length > 0) {
        pages.push({ type: "itinerary", days: currentDaysInPage });
        currentDaysInPage = [];
        currentActivitiesCount = 0;
      }
      currentDaysInPage.push({ day, activities: [] });
      currentActivitiesCount += 1;
      continue;
    }

    if (activities.length <= MAX_ACTIVITIES_PER_PAGE) {
      if (currentActivitiesCount + activities.length > MAX_ACTIVITIES_PER_PAGE && currentDaysInPage && currentDaysInPage.length > 0) {
        pages.push({ type: "itinerary", days: currentDaysInPage });
        currentDaysInPage = [];
        currentActivitiesCount = 0;
      }
      currentDaysInPage.push({ day, activities });
      currentActivitiesCount += activities.length;
    } else {
      if (currentDaysInPage && currentDaysInPage.length > 0) {
        pages.push({ type: "itinerary", days: currentDaysInPage });
        currentDaysInPage = [];
        currentActivitiesCount = 0;
      }

      const totalParts = Math.ceil(activities.length / MAX_ACTIVITIES_PER_PAGE);
      for (let p = 0; p < totalParts; p++) {
        const chunk = activities.slice(p * MAX_ACTIVITIES_PER_PAGE, (p + 1) * MAX_ACTIVITIES_PER_PAGE);
        pages.push({
          type: "itinerary",
          days: [
            {
              day,
              activities: chunk,
              isContinuation: p > 0,
              partIndex: p + 1,
              totalParts,
            },
          ],
        });
      }
    }
  }

  if (currentDaysInPage && currentDaysInPage.length > 0) {
    pages.push({ type: "itinerary", days: currentDaysInPage });
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
    <div class="pdf-page" style="width: 794px; height: 1123px; max-height: 1123px; padding: 44px 48px; box-sizing: border-box; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
      
      <div>
        <!-- TOP BRAND HEADER -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #4f46e5, #06b6d4); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 16px;">
              ✈️
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 800; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase;">AI Travel Planner</div>
              <div style="font-size: 10px; color: #64748b; font-weight: 500;">Guida Ufficiale di Viaggio</div>
            </div>
          </div>

          <div style="display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 4px 12px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
            <span style="font-size: 11px; font-weight: 600; color: #334155;">Itinerario Confermato</span>
          </div>
        </div>

        <!-- HERO COVER CARD -->
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); border-radius: 18px; padding: 28px 32px; color: #ffffff; box-shadow: 0 10px 25px -5px rgba(49, 46, 129, 0.2); margin-bottom: 24px; position: relative;">
          <div style="display: inline-block; background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); border-radius: 30px; padding: 4px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
            📍 ${escapeHtml(trip.destination)}
          </div>
          <h1 style="font-size: 26px; font-weight: 800; line-height: 1.25; margin: 0 0 10px 0; color: #ffffff;">
            ${escapeHtml(trip.title || `Viaggio a ${trip.destination}`)}
          </h1>
          ${dateRangeStr ? `<div style="font-size: 13px; color: #cbd5e1; font-weight: 500; margin-bottom: 18px; display: flex; align-items: center; gap: 6px;">📅 ${escapeHtml(dateRangeStr)}</div>` : ""}
          
          <!-- STATS ROW -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; border-top: 1px solid rgba(255, 255, 255, 0.15); padding-top: 16px;">
            <div>
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Durata</div>
              <div style="font-size: 16px; font-weight: 700; color: #ffffff;">${trip.durationDays} Giorni</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Budget Totale</div>
              <div style="font-size: 16px; font-weight: 700; color: #34d399;">${trip.totalBudget} ${escapeHtml(currency)}</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Esperienze</div>
              <div style="font-size: 16px; font-weight: 700; color: #ffffff;">${totalActivitiesCount} Tappe</div>
            </div>
          </div>
        </div>

        <!-- FLIGHT DETAILS SECTION (SE PRESENTE) -->
        ${flight ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">✈️</span>
                <span style="font-size: 13px; font-weight: 700; color: #0f172a;">Dettagli Volo Selezionato</span>
              </div>
              <span style="font-size: 12px; font-weight: 700; color: #4338ca; background: #e0e7ff; padding: 2px 10px; border-radius: 20px;">
                ${escapeHtml(flight.airline)} ${flight.flightNumber ? `· ${escapeHtml(flight.flightNumber)}` : ""}
              </span>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px;">
              <div style="text-align: left;">
                <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${escapeHtml(flight.departureAirport)}</div>
                <div style="font-size: 12px; font-weight: 600; color: #475569;">${escapeHtml(flight.departureTime)}</div>
                ${flight.departureDate ? `<div style="font-size: 10px; color: #94a3b8;">${escapeHtml(flight.departureDate)}</div>` : ""}
              </div>

              <div style="display: flex; flex-direction: column; align-items: center; padding: 0 16px;">
                <div style="font-size: 10px; font-weight: 600; color: #64748b;">${escapeHtml(flight.duration || "Volo Diretto")}</div>
                <div style="width: 100px; height: 2px; background: #cbd5e1; position: relative; margin: 4px 0;">
                  <div style="position: absolute; top: -5px; right: 45px; font-size: 10px;">✈</div>
                </div>
                <div style="font-size: 9px; color: #94a3b8;">${flight.stops === 0 ? "Diretto" : `${flight.stops} Scalo`}</div>
              </div>

              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${escapeHtml(flight.arrivalAirport)}</div>
                <div style="font-size: 12px; font-weight: 600; color: #475569;">${escapeHtml(flight.arrivalTime)}</div>
                ${flight.returnDate ? `<div style="font-size: 10px; color: #94a3b8;">${escapeHtml(flight.returnDate)}</div>` : ""}
              </div>
            </div>
          </div>
        ` : ""}

        <!-- BUDGET BREAKDOWN SECTION -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">📊</span>
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">Ripartizione Stimata del Budget</span>
            </div>
            <span style="font-size: 11px; color: #64748b;">Totale: <strong>${trip.totalBudget} ${escapeHtml(currency)}</strong></span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px 12px;">
              <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px;">🏨 Alloggio</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">~${breakdown.hotel || 0} ${escapeHtml(currency)}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px 12px;">
              <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px;">🍽️ Cibo & Bevande</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">~${breakdown.food || 0} ${escapeHtml(currency)}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px 12px;">
              <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px;">🚗 Trasporti</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">~${breakdown.transport || 0} ${escapeHtml(currency)}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px 12px;">
              <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px;">🎟️ Attività</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">~${breakdown.activities || 0} ${escapeHtml(currency)}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px 12px;">
              <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px;">🛍️ Extra & Svago</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">~${breakdown.extra || 0} ${escapeHtml(currency)}</div>
            </div>
            ${breakdown.flight ? `
              <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px 12px;">
                <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px;">✈️ Volo</div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">~${breakdown.flight} ${escapeHtml(currency)}</div>
              </div>
            ` : `
              <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px 12px;">
                <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px;">🎯 Tappe Totali</div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${trip.days.length} Giornate</div>
              </div>
            `}
          </div>
        </div>

        <!-- TRAVEL CHECKLIST / QUICK TIPS BOX -->
        <div style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 14px 18px;">
          <div style="font-size: 12px; font-weight: 700; color: #1e40af; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            💡 Consigli Pratici per il Tuo Viaggio
          </div>
          <div style="font-size: 11px; color: #3b82f6; line-height: 1.5;">
            Salva questo documento PDF sul tuo smartphone per consultarlo offline. Ricordati di verificare documenti d'identità, orari di apertura dei monumenti e prenotazioni in loco.
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8;">
        <div>AI Travel Planner · Guida generata automaticamente</div>
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
        ? `<span style="font-size: 10px; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 10px; font-weight: 600; margin-left: 6px;">Parte ${partIndex}/${totalParts}</span>`
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
                <div style="display: flex; gap: 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; position: relative;">
                  <!-- TIME & CATEGORY PILL -->
                  <div style="width: 110px; shrink: 0; display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: #0f172a; background: #f8fafc; border: 1px solid #e2e8f0; padding: 3px 8px; border-radius: 6px;">
                      ⏰ ${escapeHtml(act.time || "Orario Libero")}
                    </div>
                    <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; color: ${meta.color}; background: ${meta.bg}; padding: 2px 6px; border-radius: 4px;">
                      <span>${meta.emoji}</span>
                      <span>${escapeHtml(meta.label)}</span>
                    </div>
                  </div>

                  <!-- CONTENT -->
                  <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                      <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; line-height: 1.3;">
                        ${escapeHtml(act.title)}
                      </h4>
                      ${act.estimatedCost > 0 ? `
                        <span style="font-size: 11px; font-weight: 700; color: #059669; background: #d1fae5; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">
                          ~${act.estimatedCost} ${escapeHtml(currency)}
                        </span>
                      ` : `
                        <span style="font-size: 10px; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">
                          Gratuito
                        </span>
                      `}
                    </div>

                    ${act.description ? `
                      <p style="font-size: 11.5px; color: #475569; margin: 0 0 6px 0; line-height: 1.45;">
                        ${escapeHtml(act.description)}
                      </p>
                    ` : ""}

                    ${selectedHotel ? `
                      <div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 8px 10px; margin-top: 6px; font-size: 11px; color: #0f766e;">
                        <div style="font-weight: 700; display: flex; align-items: center; gap: 4px;">
                          🏨 ${escapeHtml(selectedHotel.name)}
                          ${selectedHotel.rating ? `<span style="color: #d97706; font-size: 10px;">★ ${selectedHotel.rating}</span>` : ""}
                        </div>
                        ${selectedHotel.address ? `<div style="font-size: 10px; color: #115e59; margin-top: 2px;">📍 ${escapeHtml(selectedHotel.address)}</div>` : ""}
                        ${selectedHotel.pricePerNight ? `<div style="font-size: 10px; font-weight: 600; margin-top: 2px;">Prezzo per notte: ~${selectedHotel.pricePerNight} ${escapeHtml(selectedHotel.currency || currency)}</div>` : ""}
                      </div>
                    ` : ""}
                  </div>
                </div>
              `;
            })
            .join("")
        : `
          <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px; text-align: center; font-size: 12px; color: #64748b; margin-bottom: 12px;">
            Nessuna attività programmata per questo orario. Giornata libera per esplorare in autonomia!
          </div>
        `;

      return `
        <div style="margin-bottom: 20px;">
          <!-- DAY CARD HEADER -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #4f46e5; border-radius: 12px; padding: 12px 16px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #4338ca; background: #e0e7ff; padding: 2px 8px; border-radius: 6px;">
                  Giorno ${day.dayNumber}
                </span>
                ${continuationBadge}
                <span style="font-size: 14px; font-weight: 700; color: #0f172a;">
                  ${escapeHtml(day.title || `Giorno ${day.dayNumber}`)}
                </span>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 3px; display: flex; align-items: center; gap: 8px;">
                ${day.city ? `<span>📍 ${escapeHtml(day.city)}</span>` : ""}
                ${formattedDate ? `<span>📅 ${escapeHtml(formattedDate)}</span>` : ""}
              </div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Spesa stimata</div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">
                ~${day.estimatedCost || 0} ${escapeHtml(currency)}
              </div>
            </div>
          </div>

          ${day.description && !isContinuation ? `
            <div style="font-size: 11.5px; color: #475569; font-style: italic; margin-bottom: 10px; padding: 0 4px;">
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
    <div class="pdf-page" style="width: 794px; height: 1123px; max-height: 1123px; padding: 40px 48px; box-sizing: border-box; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
      
      <div>
        <!-- TOP RUNNING HEADER -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
            <span>✈️</span>
            <span>${escapeHtml(trip.title || trip.destination)} · Itinerario Dettagliato</span>
          </div>
          <div style="font-size: 10px; color: #94a3b8;">
            AI Travel Planner
          </div>
        </div>

        <!-- DAYS CONTENT -->
        <div>
          ${daysHtml}
        </div>
      </div>

      <!-- FOOTER -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8;">
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
