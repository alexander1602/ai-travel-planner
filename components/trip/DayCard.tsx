// components/trip/DayCard.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import type { Activity, TripDay } from "@/types/trip";
import { ActivityCard } from "./ActivityCard";

interface DayCardProps {
  day: TripDay;
  onOpenAlternatives?: (dayId: string, activity: Activity) => void;
}

export function DayCard({ day, onOpenAlternatives }: DayCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: day.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const formattedDate = day.date
    ? new Intl.DateTimeFormat("it-IT", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(`${day.date}T00:00:00`))
    : null;

  return (
    <motion.article
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-soft"
    >
      <header className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Giorno {day.dayNumber}
          </p>
          {formattedDate && <p className="text-xs text-muted-foreground">{formattedDate}</p>}
          <h3 className="text-lg font-semibold">{day.title}</h3>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {day.city}
          </p>
        </div>
        <button
          {...attributes}
          {...listeners}
          aria-label={`Riordina giorno ${day.dayNumber}`}
          className="cursor-grab rounded-lg p-1.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </header>

      <p className="mb-3 text-sm text-muted-foreground">{day.description}</p>

      <ul className="space-y-2">
        {day.activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onOpenAlternatives={
              onOpenAlternatives
                ? (act) => onOpenAlternatives(day.id, act)
                : undefined
            }
          />
        ))}
      </ul>

      <footer className="mt-3 text-right text-sm font-medium">
        Costo stimato: {day.estimatedCost}€
      </footer>
    </motion.article>
  );
}
