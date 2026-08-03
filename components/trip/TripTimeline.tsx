// components/trip/TripTimeline.tsx
"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type { Activity, Trip } from "@/types/trip";
import { DayCard } from "./DayCard";

interface TripTimelineProps {
  trip: Trip;
  onReorder: (trip: Trip) => void;
  onOpenAlternatives?: (dayId: string, activity: Activity) => void;
}

export function TripTimeline({ trip, onReorder, onOpenAlternatives }: TripTimelineProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = trip.days.findIndex((day) => day.id === active.id);
    const newIndex = trip.days.findIndex((day) => day.id === over.id);
    const reordered = arrayMove(trip.days, oldIndex, newIndex).map((day, index) => ({
      ...day,
      order: index,
    }));

    onReorder({ ...trip, days: reordered, updatedAt: new Date().toISOString() });
  }

  if (trip.days.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
        Nessuna tappa ancora. Chiedi all&apos;assistente di aggiungerne una.
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={trip.days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {trip.days.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              onOpenAlternatives={onOpenAlternatives}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
