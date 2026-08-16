// types/trip.ts
// Tipi condivisi in tutta l'applicazione. Nessun "any" ammesso.

export type ActivityCategory =
  | "SIGHTSEEING"
  | "FOOD"
  | "TRANSPORT"
  | "ACCOMMODATION"
  | "ACTIVITY"
  | "SHOPPING"
  | "NIGHTLIFE"
  | "WELLNESS"
  | "CULTURE"
  | "ENTERTAINMENT"
  | "RELAX"
  | "OTHER";

export interface HotelOption {
  id: string;
  name: string;
  address?: string;
  neighborhood?: string;
  pricePerNight?: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  bookingUrl?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
  isSelected?: boolean;
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  description?: string;
  category: ActivityCategory;
  estimatedCost: number;
  order: number;
  hotelOptions?: HotelOption[];
  selectedHotelId?: string;
}

export interface TripDay {
  id: string;
  dayNumber: number;
  date?: string;
  city: string;
  title: string;
  description: string;
  order: number;
  estimatedCost: number;
  activities: Activity[];
}

export type DateSearchMode = "EXACT_DATES" | "FLEXIBLE_MONTH";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  searchMode: DateSearchMode;
  startDate?: string;
  endDate?: string;
  targetMonth?: string;
  tripDurationDays?: number;
}

export interface FlightOption {
  id: string;
  airline: string;
  airlineLogo?: string;
  flightNumber?: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate?: string;
  returnDate?: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  isCheapestInMonth?: boolean;
  bookingUrl: string;
}

export type TripStatus = "DRAFT" | "GENERATING" | "READY" | "ARCHIVED";

export interface BudgetBreakdown {
  hotel: number;
  transport: number;
  food: number;
  activities: number;
  extra: number;
  flight?: number;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  destinationIataCode?: string;
  originCity?: string;
  originIataCode?: string;
  durationDays: number;
  startDate?: string;
  endDate?: string;
  totalBudget: number;
  currency: string;
  prompt: string;
  status: TripStatus;
  days: TripDay[];
  budgetBreakdown: BudgetBreakdown;
  selectedFlight?: FlightOption;
  flightOptions?: FlightOption[];
  createdAt: string;
  updatedAt: string;
}

export type ChatRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface GenerateTripInput {
  prompt: string;
  destination?: string;
  originCity?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: string;
}

export interface ModifyTripInput {
  trip: Trip;
  instruction: string;
}

export interface ChatTripInput {
  trip: Trip;
  history: ChatMessage[];
  message: string;
}

export interface ChatTripResult {
  reply: string;
  updatedTrip?: Trip;
}

export interface ActivityAlternative {
  id: string;
  title: string;
  description?: string;
  category: ActivityCategory;
  estimatedCost: number;
  time: string;
  hotelOptions?: HotelOption[];
}

export interface GetAlternativesInput {
  trip: Trip;
  dayId: string;
  activityId: string;
}

export interface GetAlternativesResult {
  alternatives: ActivityAlternative[];
}

