// services/flights/direct.ts
import type { FlightProvider } from "./provider";
import type { FlightOption, FlightSearchParams } from "@/types/trip";

function generateGoogleFlightsUrl(origin: string, destination: string, departDate?: string, returnDate?: string): string {
  const query = `Voli da ${origin} a ${destination}` + (departDate && returnDate ? ` dal ${departDate} al ${returnDate}` : "");
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

export function generateSkyscannerWebUrl(origin: string, destination: string): string {
  const cleanOrigin = origin.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanDest = destination.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `https://www.skyscanner.it/trasporti/voli/${encodeURIComponent(cleanOrigin)}/${encodeURIComponent(cleanDest)}/`;
}

// Selezione realistica di compagnie aeree in base alla destinazione
function getAirlinesForDestination(dest: string): Array<{ name: string; logo: string; code: string }> {
  const d = dest.toLowerCase();
  if (d.includes("islanda") || d.includes("iceland") || d.includes("reykjavik")) {
    return [
      { name: "Icelandair", logo: "https://images.kiwi.com/airlines/64/FI.png", code: "FI" },
      { name: "PLAY Airlines", logo: "https://images.kiwi.com/airlines/64/OG.png", code: "OG" },
      { name: "Wizz Air", logo: "https://images.kiwi.com/airlines/64/W6.png", code: "W6" },
      { name: "Lufthansa", logo: "https://images.kiwi.com/airlines/64/LH.png", code: "LH" },
      { name: "EasyJet", logo: "https://images.kiwi.com/airlines/64/U2.png", code: "U2" },
    ];
  }

  if (d.includes("giappone") || d.includes("japan") || d.includes("tokyo") || d.includes("kyoto")) {
    return [
      { name: "ANA (All Nippon Airways)", logo: "https://images.kiwi.com/airlines/64/NH.png", code: "NH" },
      { name: "Japan Airlines", logo: "https://images.kiwi.com/airlines/64/JL.png", code: "JL" },
      { name: "Emirates", logo: "https://images.kiwi.com/airlines/64/EK.png", code: "EK" },
      { name: "Qatar Airways", logo: "https://images.kiwi.com/airlines/64/QR.png", code: "QR" },
      { name: "ITA Airways", logo: "https://images.kiwi.com/airlines/64/AZ.png", code: "AZ" },
    ];
  }

  if (d.includes("francia") || d.includes("paris") || d.includes("parigi") || d.includes("avignone")) {
    return [
      { name: "Air France", logo: "https://images.kiwi.com/airlines/64/AF.png", code: "AF" },
      { name: "ITA Airways", logo: "https://images.kiwi.com/airlines/64/AZ.png", code: "AZ" },
      { name: "Transavia", logo: "https://images.kiwi.com/airlines/64/TO.png", code: "TO" },
      { name: "EasyJet", logo: "https://images.kiwi.com/airlines/64/U2.png", code: "U2" },
      { name: "Ryanair", logo: "https://images.kiwi.com/airlines/64/FR.png", code: "FR" },
    ];
  }

  return [
    { name: "ITA Airways", logo: "https://images.kiwi.com/airlines/64/AZ.png", code: "AZ" },
    { name: "Lufthansa", logo: "https://images.kiwi.com/airlines/64/LH.png", code: "LH" },
    { name: "Ryanair", logo: "https://images.kiwi.com/airlines/64/FR.png", code: "FR" },
    { name: "EasyJet", logo: "https://images.kiwi.com/airlines/64/U2.png", code: "U2" },
    { name: "Vueling", logo: "https://images.kiwi.com/airlines/64/VY.png", code: "VY" },
  ];
}

export class DirectFlightProvider implements FlightProvider {
  name = "direct";

  async searchFlights(params: FlightSearchParams): Promise<FlightOption[]> {
    const { origin, destination, searchMode, startDate, endDate, targetMonth, tripDurationDays } = params;
    const duration = tripDurationDays || 7;

    const airlines = getAirlinesForDestination(destination);

    if (searchMode === "FLEXIBLE_MONTH" && targetMonth) {
      const [year, month] = targetMonth.split("-").map(Number);
      const weeks = [
        { startDay: 4, label: "1ª Settimana" },
        { startDay: 11, label: "2ª Settimana" },
        { startDay: 18, label: "3ª Settimana" },
        { startDay: 25, label: "4ª Settimana" },
      ];

      const basePrices = [129, 95, 145, 179];
      const minPrice = Math.min(...basePrices);

      return weeks.map((w, idx) => {
        const depDate = new Date(Date.UTC(year || 2026, (month || 9) - 1, w.startDay));
        const retDate = new Date(depDate);
        retDate.setUTCDate(retDate.getUTCDate() + duration);

        const depStr = depDate.toISOString().split("T")[0] || "2026-09-10";
        const retStr = retDate.toISOString().split("T")[0] || "2026-09-17";
        const airline = airlines[idx % airlines.length] || { name: "Compagnia Aerea", logo: "https://images.kiwi.com/airlines/64/AZ.png", code: "AZ" };
        const price = basePrices[idx] ?? 149;

        return {
          id: `direct-flex-${idx}`,
          airline: airline.name,
          airlineLogo: airline.logo,
          flightNumber: `${airline.code} ${Math.floor(100 + idx * 115)}`,
          departureAirport: origin || "Roma (FCO)",
          arrivalAirport: destination,
          departureDate: depStr,
          returnDate: retStr,
          departureTime: `${depStr}T09:30:00`,
          arrivalTime: `${depStr}T12:45:00`,
          duration: "3h 15m",
          stops: idx % 2 === 0 ? 0 : 1,
          price,
          currency: "EUR",
          isCheapestInMonth: price === minPrice,
          bookingUrl: generateGoogleFlightsUrl(origin, destination, depStr, retStr),
        };
      });
    }

    // Modalità Date Specifiche
    const depStr = startDate || "2026-09-10";
    const retStr = endDate || "2026-09-17";

    const optionsData = [
      { price: 115, timeDep: "08:15", timeArr: "11:30", stops: 0, isDirect: true },
      { price: 142, timeDep: "12:40", timeArr: "15:55", stops: 0, isDirect: true },
      { price: 189, timeDep: "16:20", timeArr: "21:10", stops: 1, isDirect: false },
      { price: 235, timeDep: "20:00", timeArr: "23:15", stops: 0, isDirect: true },
    ];

    const prices = optionsData.map((o) => o.price);
    const minPrice = Math.min(...prices);

    return optionsData.map((opt, idx) => {
      const airline = airlines[idx % airlines.length] || { name: "Compagnia Aerea", logo: "https://images.kiwi.com/airlines/64/AZ.png", code: "AZ" };
      return {
        id: `direct-dates-${idx}`,
        airline: airline.name,
        airlineLogo: airline.logo,
        flightNumber: `${airline.code} ${Math.floor(200 + idx * 132)}`,
        departureAirport: origin || "Roma (FCO)",
        arrivalAirport: destination,
        departureDate: depStr,
        returnDate: retStr,
        departureTime: `${depStr}T${opt.timeDep}:00`,
        arrivalTime: `${depStr}T${opt.timeArr}:00`,
        duration: opt.stops === 0 ? "3h 15m" : "4h 50m",
        stops: opt.stops,
        price: opt.price,
        currency: "EUR",
        isCheapestInMonth: opt.price === minPrice,
        bookingUrl: generateGoogleFlightsUrl(origin, destination, depStr, retStr),
      };
    });
  }
}
