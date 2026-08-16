// services/flights/mock.ts
import type { FlightProvider } from "./provider";
import type { FlightOption, FlightSearchParams } from "@/types/trip";

function inferAirportCode(city: string, fallback: string): string {
  if (!city) return fallback;
  const clean = city.trim().toLowerCase();
  if (clean.includes("roma") || clean.includes("rome") || clean.includes("fco")) return "FCO";
  if (clean.includes("milano") || clean.includes("milan") || clean.includes("mxp")) return "MXP";
  if (clean.includes("venezia") || clean.includes("vce")) return "VCE";
  if (clean.includes("napoli") || clean.includes("nap")) return "NAP";
  if (clean.includes("bologna") || clean.includes("blq")) return "BLQ";
  if (clean.includes("tokyo") || clean.includes("nrt") || clean.includes("hnd")) return "NRT";
  if (clean.includes("parigi") || clean.includes("paris") || clean.includes("cdg")) return "CDG";
  if (clean.includes("londra") || clean.includes("london") || clean.includes("lhr")) return "LHR";
  if (clean.includes("lisbona") || clean.includes("lisbon") || clean.includes("lis")) return "LIS";
  if (clean.includes("reykjavik") || clean.includes("kef")) return "KEF";
  if (clean.includes("barcellona") || clean.includes("bcn")) return "BCN";
  if (clean.includes("madrid") || clean.includes("mad")) return "MAD";

  const code = clean.substring(0, 3).toUpperCase();
  return code.length === 3 ? code : fallback;
}

export class MockFlightProvider implements FlightProvider {
  name = "mock";

  async searchFlights(params: FlightSearchParams): Promise<FlightOption[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { origin, destination, searchMode, startDate, endDate, targetMonth, tripDurationDays } = params;
    const depCode = inferAirportCode(origin, "FCO");
    const arrCode = inferAirportCode(destination, "CDG");

    const baseBookingUrl = `https://www.skyscanner.it/trasporti/voli/${depCode.toLowerCase()}/${arrCode.toLowerCase()}/`;

    if (searchMode === "FLEXIBLE_MONTH") {
      const month = targetMonth || "2026-09";
      const duration = tripDurationDays || 7;

      const options: FlightOption[] = [
        {
          id: "fl-flex-1",
          airline: "Ryanair",
          airlineLogo: "https://images.kiwi.com/airlines/64/FR.png",
          flightNumber: `FR ${Math.floor(1000 + Math.random() * 9000)}`,
          departureAirport: `${depCode} (${origin || "Partenza"})`,
          arrivalAirport: `${arrCode} (${destination || "Destinazione"})`,
          departureDate: `${month}-03`,
          returnDate: `${month}-${String(3 + duration).padStart(2, "0")}`,
          departureTime: `${month}-03T06:30:00`,
          arrivalTime: `${month}-03T08:50:00`,
          duration: "2h 20m",
          stops: 0,
          price: 52,
          currency: "EUR",
          isCheapestInMonth: false,
          bookingUrl: `${baseBookingUrl}?q=${encodeURIComponent(`${depCode} to ${arrCode} month ${month}`)}`,
        },
        {
          id: "fl-flex-2",
          airline: "EasyJet",
          airlineLogo: "https://images.kiwi.com/airlines/64/U2.png",
          flightNumber: `EJU ${Math.floor(1000 + Math.random() * 9000)}`,
          departureAirport: `${depCode} (${origin || "Partenza"})`,
          arrivalAirport: `${arrCode} (${destination || "Destinazione"})`,
          departureDate: `${month}-10`,
          returnDate: `${month}-${String(10 + duration).padStart(2, "0")}`,
          departureTime: `${month}-10T10:15:00`,
          arrivalTime: `${month}-10T12:35:00`,
          duration: "2h 20m",
          stops: 0,
          price: 34,
          currency: "EUR",
          isCheapestInMonth: true,
          bookingUrl: `${baseBookingUrl}?q=${encodeURIComponent(`${depCode} to ${arrCode} month ${month}`)}`,
        },
        {
          id: "fl-flex-3",
          airline: "Wizz Air",
          airlineLogo: "https://images.kiwi.com/airlines/64/W6.png",
          flightNumber: `W6 ${Math.floor(1000 + Math.random() * 9000)}`,
          departureAirport: `${depCode} (${origin || "Partenza"})`,
          arrivalAirport: `${arrCode} (${destination || "Destinazione"})`,
          departureDate: `${month}-17`,
          returnDate: `${month}-${String(17 + duration).padStart(2, "0")}`,
          departureTime: `${month}-17T14:00:00`,
          arrivalTime: `${month}-17T16:20:00`,
          duration: "2h 20m",
          stops: 0,
          price: 45,
          currency: "EUR",
          isCheapestInMonth: false,
          bookingUrl: `${baseBookingUrl}?q=${encodeURIComponent(`${depCode} to ${arrCode} month ${month}`)}`,
        },
        {
          id: "fl-flex-4",
          airline: "ITA Airways",
          airlineLogo: "https://images.kiwi.com/airlines/64/AZ.png",
          flightNumber: `AZ ${Math.floor(100 + Math.random() * 900)}`,
          departureAirport: `${depCode} (${origin || "Partenza"})`,
          arrivalAirport: `${arrCode} (${destination || "Destinazione"})`,
          departureDate: `${month}-24`,
          returnDate: `${month}-${String(Math.min(30, 24 + duration)).padStart(2, "0")}`,
          departureTime: `${month}-24T18:40:00`,
          arrivalTime: `${month}-24T21:00:00`,
          duration: "2h 20m",
          stops: 0,
          price: 89,
          currency: "EUR",
          isCheapestInMonth: false,
          bookingUrl: `${baseBookingUrl}?q=${encodeURIComponent(`${depCode} to ${arrCode} month ${month}`)}`,
        },
      ];

      return options;
    }

    // Modalità EXACT_DATES
    const dateStr = startDate || new Date().toISOString().split("T")[0];
    const returnStr = endDate || "";

    const encodedSearch = encodeURIComponent(
      `${origin || depCode} to ${destination || arrCode}${returnStr ? ` back ${returnStr}` : ""}`
    );

    return [
      {
        id: "fl-mock-1",
        airline: "Ryanair",
        airlineLogo: "https://images.kiwi.com/airlines/64/FR.png",
        flightNumber: `FR ${Math.floor(1000 + Math.random() * 9000)}`,
        departureAirport: `${depCode} (${origin || "Partenza"})`,
        arrivalAirport: `${arrCode} (${destination || "Destinazione"})`,
        departureDate: dateStr,
        returnDate: returnStr,
        departureTime: `${dateStr}T06:45:00`,
        arrivalTime: `${dateStr}T09:10:00`,
        duration: "2h 25m",
        stops: 0,
        price: 49,
        currency: "EUR",
        bookingUrl: `${baseBookingUrl}?q=${encodedSearch}`,
      },
      {
        id: "fl-mock-2",
        airline: "EasyJet",
        airlineLogo: "https://images.kiwi.com/airlines/64/U2.png",
        flightNumber: `EJU ${Math.floor(1000 + Math.random() * 9000)}`,
        departureAirport: `${depCode} (${origin || "Partenza"})`,
        arrivalAirport: `${arrCode} (${destination || "Destinazione"})`,
        departureDate: dateStr,
        returnDate: returnStr,
        departureTime: `${dateStr}T11:20:00`,
        arrivalTime: `${dateStr}T13:40:00`,
        duration: "2h 20m",
        stops: 0,
        price: 78,
        currency: "EUR",
        bookingUrl: `${baseBookingUrl}?q=${encodedSearch}`,
      },
      {
        id: "fl-mock-3",
        airline: "ITA Airways / Lufthansa",
        airlineLogo: "https://images.kiwi.com/airlines/64/AZ.png",
        flightNumber: `AZ ${Math.floor(100 + Math.random() * 900)}`,
        departureAirport: `${depCode} (${origin || "Partenza"})`,
        arrivalAirport: `${arrCode} (${destination || "Destinazione"})`,
        departureDate: dateStr,
        returnDate: returnStr,
        departureTime: `${dateStr}T16:15:00`,
        arrivalTime: `${dateStr}T18:35:00`,
        duration: "2h 20m",
        stops: 0,
        price: 135,
        currency: "EUR",
        bookingUrl: `${baseBookingUrl}?q=${encodedSearch}`,
      },
    ];
  }
}
