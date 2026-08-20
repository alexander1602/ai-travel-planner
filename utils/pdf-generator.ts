// utils/pdf-generator.ts
// Generatore client-side di Travel Guide PDF — layout interamente basato su tabelle
// per compatibilità perfetta con html2canvas (zero flexbox, zero emoji nei badge piccoli).

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Activity, ActivityCategory, Trip } from "@/types/trip";

const CATEGORY_META: Record<ActivityCategory, { label: string; color: string; bg: string }> = {
  SIGHTSEEING: { label: "Monumenti", color: "#3730a3", bg: "#e0e7ff" },
  FOOD: { label: "Ristorazione", color: "#9f1239", bg: "#ffe4e6" },
  TRANSPORT: { label: "Trasporti", color: "#075985", bg: "#e0f2fe" },
  ACCOMMODATION: { label: "Alloggio", color: "#115e59", bg: "#ccfbf1" },
  ACTIVITY: { label: "Esperienza", color: "#92400e", bg: "#fef3c7" },
  SHOPPING: { label: "Shopping", color: "#9d174d", bg: "#fce7f3" },
  NIGHTLIFE: { label: "Nightlife", color: "#5b21b6", bg: "#ede9fe" },
  WELLNESS: { label: "Wellness", color: "#065f46", bg: "#d1fae5" },
  CULTURE: { label: "Cultura", color: "#9a3412", bg: "#ffedd5" },
  ENTERTAINMENT: { label: "Svago", color: "#3730a3", bg: "#e0e7ff" },
  RELAX: { label: "Relax", color: "#3f6212", bg: "#ecfccb" },
  OTHER: { label: "Tappa", color: "#1e293b", bg: "#f1f5f9" },
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

// ── Impaginazione dinamica ──────────────────────────────────────────────

const PAGE_H = 960;

function actH(act: Activity): number {
  let h = 56;
  if (act.description) h += Math.max(1, Math.ceil(act.description.length / 85)) * 15;
  if (act.hotelOptions?.length) h += 44;
  return h + 8;
}

function dayHeaderH(day: Trip["days"][0]): number {
  return 48 + (day.description ? 20 : 0) + 8;
}

interface Slice { day: Trip["days"][0]; activities: Activity[]; isContinuation?: boolean; partIndex?: number; totalParts?: number; }
interface PagePlan { type: "cover" | "itinerary"; days?: Slice[]; }

function planPages(trip: Trip): PagePlan[] {
  const pages: PagePlan[] = [{ type: "cover" }];
  let cur: Slice[] = [];
  let curH = 0;

  const flush = () => { if (cur.length) { pages.push({ type: "itinerary", days: cur }); cur = []; curH = 0; } };

  for (const day of trip.days) {
    const dH = dayHeaderH(day);
    const acts = day.activities || [];
    const aH = acts.reduce((s, a) => s + actH(a), 0);
    const totalH = dH + aH;

    if (acts.length === 0) {
      if (curH + dH > PAGE_H) flush();
      cur.push({ day, activities: [] });
      curH += dH;
      continue;
    }

    if (curH + totalH <= PAGE_H) {
      cur.push({ day, activities: acts });
      curH += totalH + 14;
      continue;
    }

    flush();

    if (totalH <= PAGE_H) {
      cur.push({ day, activities: acts });
      curH = totalH + 14;
      continue;
    }

    // Split long day across pages
    let ai = 0;
    const slices: { a: Activity[]; cont: boolean }[] = [];
    while (ai < acts.length) {
      const sa: Activity[] = [];
      let sh = dH;
      while (ai < acts.length) {
        const act = acts[ai];
        if (!act) break;
        const ah = actH(act);
        if (sa.length > 0 && sh + ah > PAGE_H) break;
        sa.push(act);
        sh += ah;
        ai++;
      }
      slices.push({ a: sa, cont: slices.length > 0 });
    }
    const tp = slices.length;
    slices.forEach((s, i) => {
      if (i > 0) flush();
      cur.push({ day, activities: s.a, isContinuation: s.cont, partIndex: i + 1, totalParts: tp > 1 ? tp : undefined });
      curH = s.a.reduce((sum, a) => sum + actH(a), dH);
    });
  }
  flush();
  return pages;
}

// ── Stili globali applicati via CSS, non inline ─────────────────────────

const GLOBAL_STYLE = `
<style>
  .pg { width:794px; height:1123px; max-height:1123px; box-sizing:border-box; background:#fff; color:#0f172a; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.35; position:relative; overflow:hidden; padding:36px 42px; }
  .pg * { box-sizing:border-box; }
  table { border-collapse:collapse; }
  td { vertical-align:top; }
  .badge { display:inline-block; padding:3px 8px; border-radius:5px; font-weight:700; line-height:1.2; }
  .pill { display:inline-block; padding:3px 10px; border-radius:12px; font-weight:700; line-height:1.2; white-space:nowrap; }
</style>
`;

// ── Copertina ───────────────────────────────────────────────────────────

function renderCover(trip: Trip, pn: number, tp: number): string {
  const cur = trip.currency || "€";
  const dr = formatShortDateRange(trip.startDate, trip.endDate);
  const fl = trip.selectedFlight;
  const bb = trip.budgetBreakdown || { hotel:0, transport:0, food:0, activities:0, extra:0, flight:0 };
  const tc = trip.days.reduce((a, d) => a + (d.activities?.length || 0), 0);

  return `${GLOBAL_STYLE}
<div class="pg" style="padding:40px 42px; display:flex; flex-direction:column; justify-content:space-between;">
<div>

<!-- BRAND -->
<table style="width:100%; margin-bottom:18px; border-bottom:2px solid #f1f5f9; padding-bottom:12px;">
<tr>
  <td style="vertical-align:middle;">
    <table><tr>
      <td style="width:32px;height:32px;background:#4338ca;border-radius:8px;text-align:center;vertical-align:middle;color:#fff;font-size:15px;font-weight:800;">A</td>
      <td style="padding-left:10px;vertical-align:middle;">
        <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#0f172a;">AI Travel Planner</div>
        <div style="font-size:10px;color:#64748b;margin-top:1px;">Guida Ufficiale di Viaggio</div>
      </td>
    </tr></table>
  </td>
  <td style="vertical-align:middle;text-align:right;">
    <span class="badge" style="background:#f0fdf4;color:#166534;font-size:10px;border:1px solid #bbf7d0;">● Confermato</span>
  </td>
</tr>
</table>

<!-- HERO -->
<div style="background:#1e1b4b;border-radius:14px;padding:22px 26px;color:#fff;margin-bottom:18px;">
  <span class="badge" style="background:rgba(255,255,255,.18);color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;">${escapeHtml(trip.destination)}</span>
  <h1 style="font-size:23px;font-weight:800;line-height:1.25;margin:10px 0 6px;color:#fff;">${escapeHtml(trip.title || `Viaggio a ${trip.destination}`)}</h1>
  ${dr ? `<div style="font-size:11px;color:#cbd5e1;margin-bottom:14px;">${escapeHtml(dr)}</div>` : ""}
  <table style="width:100%;border-top:1px solid rgba(255,255,255,.18);padding-top:12px;margin-top:2px;">
  <tr>
    <td style="width:33%;padding-top:10px;"><div style="font-size:9px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Durata</div><div style="font-size:15px;font-weight:700;color:#fff;margin-top:2px;">${trip.durationDays} Giorni</div></td>
    <td style="width:33%;padding-top:10px;"><div style="font-size:9px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Budget Totale</div><div style="font-size:15px;font-weight:700;color:#34d399;margin-top:2px;">${trip.totalBudget} ${escapeHtml(cur)}</div></td>
    <td style="width:33%;padding-top:10px;"><div style="font-size:9px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Esperienze</div><div style="font-size:15px;font-weight:700;color:#fff;margin-top:2px;">${tc} Tappe</div></td>
  </tr>
  </table>
</div>

${fl ? `
<!-- VOLO -->
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
  <table style="width:100%;margin-bottom:8px;"><tr>
    <td style="vertical-align:middle;"><b style="font-size:12px;color:#0f172a;">Volo Selezionato</b></td>
    <td style="vertical-align:middle;text-align:right;"><span class="badge" style="background:#e0e7ff;color:#4338ca;font-size:10px;">${escapeHtml(fl.airline)}${fl.flightNumber ? ` · ${escapeHtml(fl.flightNumber)}` : ""}</span></td>
  </tr></table>
  <table style="width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
  <tr>
    <td style="width:35%;padding:10px 14px;vertical-align:middle;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;">${escapeHtml(fl.departureAirport)}</div>
      <div style="font-size:11px;color:#475569;margin-top:2px;">${escapeHtml(fl.departureTime)}</div>
      ${fl.departureDate ? `<div style="font-size:9px;color:#94a3b8;margin-top:1px;">${escapeHtml(fl.departureDate)}</div>` : ""}
    </td>
    <td style="width:30%;padding:10px;vertical-align:middle;text-align:center;">
      <div style="font-size:9px;font-weight:600;color:#64748b;">${escapeHtml(fl.duration || "Diretto")}</div>
      <div style="font-size:10px;color:#94a3b8;margin:3px 0;">------&gt;</div>
      <div style="font-size:9px;color:#94a3b8;">${fl.stops === 0 ? "Diretto" : `${fl.stops} scalo`}</div>
    </td>
    <td style="width:35%;padding:10px 14px;vertical-align:middle;text-align:right;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;">${escapeHtml(fl.arrivalAirport)}</div>
      <div style="font-size:11px;color:#475569;margin-top:2px;">${escapeHtml(fl.arrivalTime)}</div>
      ${fl.returnDate ? `<div style="font-size:9px;color:#94a3b8;margin-top:1px;">${escapeHtml(fl.returnDate)}</div>` : ""}
    </td>
  </tr>
  </table>
</div>
` : ""}

<!-- BUDGET -->
<div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
  <table style="width:100%;margin-bottom:8px;"><tr>
    <td style="vertical-align:middle;"><b style="font-size:12px;color:#0f172a;">Budget Stimato</b></td>
    <td style="vertical-align:middle;text-align:right;font-size:11px;color:#64748b;">Totale: <b style="color:#0f172a;">${trip.totalBudget} ${escapeHtml(cur)}</b></td>
  </tr></table>
  <table style="width:100%;border-spacing:6px;border-collapse:separate;margin:-6px;">
  <tr>
    <td style="width:33%;background:#f8fafc;border:1px solid #f1f5f9;border-radius:6px;padding:7px 9px;"><div style="font-size:10px;color:#64748b;">Alloggio</div><div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">~${bb.hotel || 0} ${escapeHtml(cur)}</div></td>
    <td style="width:33%;background:#f8fafc;border:1px solid #f1f5f9;border-radius:6px;padding:7px 9px;"><div style="font-size:10px;color:#64748b;">Ristorazione</div><div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">~${bb.food || 0} ${escapeHtml(cur)}</div></td>
    <td style="width:33%;background:#f8fafc;border:1px solid #f1f5f9;border-radius:6px;padding:7px 9px;"><div style="font-size:10px;color:#64748b;">Trasporti</div><div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">~${bb.transport || 0} ${escapeHtml(cur)}</div></td>
  </tr>
  <tr>
    <td style="width:33%;background:#f8fafc;border:1px solid #f1f5f9;border-radius:6px;padding:7px 9px;"><div style="font-size:10px;color:#64748b;">Attivita</div><div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">~${bb.activities || 0} ${escapeHtml(cur)}</div></td>
    <td style="width:33%;background:#f8fafc;border:1px solid #f1f5f9;border-radius:6px;padding:7px 9px;"><div style="font-size:10px;color:#64748b;">Extra</div><div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">~${bb.extra || 0} ${escapeHtml(cur)}</div></td>
    <td style="width:33%;background:#f8fafc;border:1px solid #f1f5f9;border-radius:6px;padding:7px 9px;">
      ${bb.flight
        ? `<div style="font-size:10px;color:#64748b;">Volo</div><div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">~${bb.flight} ${escapeHtml(cur)}</div>`
        : `<div style="font-size:10px;color:#64748b;">Giornate</div><div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">${trip.days.length}</div>`
      }
    </td>
  </tr>
  </table>
</div>

<!-- TIPS -->
<div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:8px;padding:10px 14px;">
  <div style="font-size:11px;font-weight:700;color:#1e40af;margin-bottom:3px;">Consigli pratici</div>
  <div style="font-size:10px;color:#3b82f6;line-height:1.45;">Salva questo PDF sul tuo smartphone per consultarlo offline. Verifica orari di apertura e prenotazioni in loco.</div>
</div>

</div>
<!-- FOOTER -->
<table style="width:100%;border-top:1px solid #e2e8f0;margin-top:8px;"><tr>
  <td style="padding-top:8px;font-size:9px;color:#94a3b8;">AI Travel Planner</td>
  <td style="padding-top:8px;font-size:9px;color:#94a3b8;text-align:right;font-weight:700;">Pagina ${pn} di ${tp}</td>
</tr></table>
</div>`;
}

// ── Pagine itinerario ───────────────────────────────────────────────────

function renderItinerary(plan: PagePlan, trip: Trip, pn: number, tp: number): string {
  const cur = trip.currency || "€";

  const html = (plan.days || []).map((item) => {
    const { day, activities, isContinuation, partIndex, totalParts } = item;
    const fd = formatDateIT(day.date);
    const contBadge = isContinuation && totalParts && partIndex
      ? ` <span class="badge" style="background:#e2e8f0;color:#475569;font-size:9px;">Parte ${partIndex}/${totalParts}</span>`
      : "";

    const actsHtml = activities.length > 0
      ? activities.map((act) => {
          const meta = CATEGORY_META[act.category] || CATEGORY_META.OTHER;
          const hotel = act.hotelOptions?.find((h) => h.id === act.selectedHotelId || h.isSelected);

          const price = act.estimatedCost > 0
            ? `<span class="pill" style="background:#d1fae5;color:#047857;font-size:11px;">~${act.estimatedCost} ${escapeHtml(cur)}</span>`
            : `<span class="pill" style="background:#f1f5f9;color:#475569;font-size:10px;font-weight:600;">Gratuito</span>`;

          return `
<table style="width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:7px;">
<tr>
  <td style="width:118px;padding:8px;vertical-align:top;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:4px 6px;text-align:center;font-size:11px;font-weight:700;color:#0f172a;line-height:1.2;margin-bottom:4px;">
      ${escapeHtml(act.time || "Orario libero")}
    </div>
    <div style="background:${meta.bg};color:${meta.color};border-radius:4px;padding:3px 5px;text-align:center;font-size:9px;font-weight:700;line-height:1.2;">
      ${escapeHtml(meta.label)}
    </div>
  </td>
  <td style="padding:8px 10px 8px 4px;vertical-align:top;">
    <table style="width:100%;margin-bottom:2px;"><tr>
      <td style="vertical-align:middle;"><div style="font-size:13px;font-weight:700;color:#0f172a;line-height:1.25;">${escapeHtml(act.title)}</div></td>
      <td style="vertical-align:middle;text-align:right;white-space:nowrap;padding-left:8px;">${price}</td>
    </tr></table>
    ${act.description ? `<div style="font-size:10.5px;color:#475569;line-height:1.4;margin-top:2px;">${escapeHtml(act.description)}</div>` : ""}
    ${hotel ? `
    <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:5px;padding:5px 7px;margin-top:5px;font-size:10px;color:#0f766e;">
      <b>${escapeHtml(hotel.name)}</b>${hotel.rating ? ` <span style="color:#d97706;font-size:9px;">★${hotel.rating}</span>` : ""}
      ${hotel.address ? `<div style="font-size:9px;color:#115e59;margin-top:1px;">${escapeHtml(hotel.address)}</div>` : ""}
      ${hotel.pricePerNight ? `<div style="font-size:9px;font-weight:600;margin-top:1px;">~${hotel.pricePerNight} ${escapeHtml(hotel.currency || cur)}/notte</div>` : ""}
    </div>` : ""}
  </td>
</tr>
</table>`;
        }).join("")
      : `<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;padding:10px;text-align:center;font-size:10px;color:#64748b;margin-bottom:7px;">Giornata libera</div>`;

    return `
<div style="margin-bottom:14px;">
  <!-- Day header -->
  <table style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #4338ca;border-radius:8px;margin-bottom:6px;">
  <tr>
    <td style="padding:7px 10px;vertical-align:middle;">
      <div>
        <span class="badge" style="background:#e0e7ff;color:#4338ca;font-size:10px;text-transform:uppercase;">Giorno ${day.dayNumber}</span>${contBadge}
        <span style="font-size:13px;font-weight:700;color:#0f172a;margin-left:6px;">${escapeHtml(day.title || `Giorno ${day.dayNumber}`)}</span>
      </div>
      <div style="font-size:10px;color:#64748b;margin-top:2px;">
        ${day.city ? `${escapeHtml(day.city)}` : ""}${day.city && fd ? " · " : ""}${fd ? escapeHtml(fd) : ""}
      </div>
    </td>
    <td style="padding:7px 12px;vertical-align:middle;text-align:right;white-space:nowrap;">
      <div style="font-size:9px;color:#64748b;text-transform:uppercase;">Spesa stimata</div>
      <div style="font-size:12px;font-weight:700;color:#0f172a;margin-top:1px;">~${day.estimatedCost || 0} ${escapeHtml(cur)}</div>
    </td>
  </tr>
  </table>
  ${day.description && !isContinuation ? `<div style="font-size:10px;color:#475569;font-style:italic;margin-bottom:5px;padding:0 3px;line-height:1.35;">"${escapeHtml(day.description)}"</div>` : ""}
  ${actsHtml}
</div>`;
  }).join("");

  return `${GLOBAL_STYLE}
<div class="pg">
<div>
  <!-- Running header -->
  <table style="width:100%;border-bottom:1px solid #e2e8f0;margin-bottom:14px;padding-bottom:6px;">
  <tr>
    <td style="vertical-align:middle;font-size:10px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;">${escapeHtml(trip.title || trip.destination)} · Itinerario</td>
    <td style="vertical-align:middle;text-align:right;font-size:9px;color:#94a3b8;">AI Travel Planner</td>
  </tr>
  </table>
  ${html}
</div>
<!-- Footer -->
<table style="width:100%;border-top:1px solid #e2e8f0;position:absolute;bottom:36px;left:42px;right:42px;"><tr>
  <td style="padding-top:8px;font-size:9px;color:#94a3b8;">${escapeHtml(trip.destination)}</td>
  <td style="padding-top:8px;font-size:9px;color:#94a3b8;text-align:right;font-weight:700;">Pagina ${pn} di ${tp}</td>
</tr></table>
</div>`;
}

// ── Download ────────────────────────────────────────────────────────────

export async function downloadTripPDF(trip: Trip): Promise<void> {
  const plans = planPages(trip);
  const total = plans.length;

  const container = document.createElement("div");
  container.id = "pdf-export-tmp";
  container.style.cssText = "position:fixed;left:-99999px;top:0;width:794px;z-index:-9999;background:#fff;color:#0f172a;";

  let html = "";
  plans.forEach((p, i) => {
    html += p.type === "cover" ? renderCover(trip, i + 1, total) : renderItinerary(p, trip, i + 1, total);
  });

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pages = container.querySelectorAll<HTMLElement>(".pg");

    for (let i = 0; i < pages.length; i++) {
      const el = pages[i];
      if (!el) continue;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff", windowWidth: 794 });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }

    pdf.save(`guida-viaggio-${sanitizeFilename(trip.destination || trip.title || "viaggio") || "itinerario"}.pdf`);
  } finally {
    if (document.body.contains(container)) document.body.removeChild(container);
  }
}
