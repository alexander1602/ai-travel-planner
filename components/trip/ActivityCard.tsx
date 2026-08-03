import {
  Utensils,
  Landmark,
  Car,
  BedDouble,
  Ticket,
  ShoppingBag,
  Circle,
  MapPin,
  Star,
  ExternalLink,
  Sparkles,
  PartyPopper,
  HeartPulse,
  Tv,
  Smile,
} from "lucide-react";
import type { Activity, ActivityCategory, HotelOption } from "@/types/trip";

const ICONS: Record<ActivityCategory, typeof Circle> = {
  SIGHTSEEING: Landmark,
  FOOD: Utensils,
  TRANSPORT: Car,
  ACCOMMODATION: BedDouble,
  ACTIVITY: Ticket,
  SHOPPING: ShoppingBag,
  NIGHTLIFE: PartyPopper,
  WELLNESS: HeartPulse,
  CULTURE: Landmark,
  ENTERTAINMENT: Tv,
  RELAX: Smile,
  OTHER: Circle,
};

function HotelOptionCard({ hotel, isSelected }: { hotel: HotelOption; isSelected: boolean }) {
  return (
    <div
      className={[
        "mt-3 rounded-xl border p-3",
        isSelected
          ? "border-emerald-500/50 bg-emerald-500/5"
          : "border-border/70 bg-background/70",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{hotel.name}</p>
            {isSelected && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                Selezionato
              </span>
            )}
          </div>
          {(hotel.neighborhood || hotel.address) && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {[hotel.neighborhood, hotel.address].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        {typeof hotel.pricePerNight === "number" && (
          <div className="text-right">
            <p className="text-sm font-semibold">
              {hotel.pricePerNight}
              {(hotel.currency ?? "EUR") === "EUR" ? "€" : ` ${hotel.currency}`}
            </p>
            <p className="text-[11px] text-muted-foreground">a notte</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {typeof hotel.rating === "number" && (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-current text-amber-500" />
            {hotel.rating}/10
            {typeof hotel.reviewCount === "number" ? ` · ${hotel.reviewCount} recensioni` : ""}
          </span>
        )}
        {hotel.source && <span>Fonte: {hotel.source}</span>}
      </div>

      {hotel.bookingUrl && (
        <a
          href={hotel.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Vedi offerta <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

interface ActivityCardProps {
  activity: Activity;
  onOpenAlternatives?: (activity: Activity) => void;
}

export function ActivityCard({ activity, onOpenAlternatives }: ActivityCardProps) {
  const Icon = ICONS[activity.category];
  const selectedHotelId =
    activity.selectedHotelId ?? activity.hotelOptions?.find((hotel) => hotel.isSelected)?.id;

  const isClickable = typeof onOpenAlternatives === "function";

  return (
    <li
      onClick={() => isClickable && onOpenAlternatives(activity)}
      className={[
        "group relative flex items-start gap-3 rounded-xl border border-border/70 bg-background p-3 transition-all",
        isClickable ? "cursor-pointer hover:border-primary/50 hover:bg-muted/30 hover:shadow-xs" : "",
      ].join(" ")}
    >
      <span className="mt-0.5 rounded-lg bg-muted p-1.5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
            {activity.title}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
        </div>
        {activity.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{activity.description}</p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            ~{activity.estimatedCost}€
          </p>

          {isClickable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAlternatives(activity);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary opacity-90 group-hover:opacity-100 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
            >
              <Sparkles className="h-3 w-3" />
              Alternative
            </button>
          )}
        </div>

        {activity.category === "ACCOMMODATION" && activity.hotelOptions?.length ? (
          <div className="mt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Hotel suggeriti
            </p>
            {activity.hotelOptions.map((hotel) => (
              <HotelOptionCard
                key={hotel.id}
                hotel={hotel}
                isSelected={hotel.id === selectedHotelId}
              />
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

