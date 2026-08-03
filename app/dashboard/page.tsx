// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { ChatBox } from "@/components/chat/ChatBox";
import { TripTimeline } from "@/components/trip/TripTimeline";
import { BudgetCard } from "@/components/budget/BudgetCard";
import { MapPanel } from "@/components/map/MapPanel";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { ActivityAlternativesModal } from "@/components/trip/ActivityAlternativesModal";
import type { Activity, ActivityAlternative, Trip } from "@/types/trip";

export default function DashboardPage() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedActivityForAlternatives, setSelectedActivityForAlternatives] = useState<{
    dayId: string;
    activity: Activity;
  } | null>(null);

  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem("current-trip");
    if (stored) {
      setTrip(JSON.parse(stored) as Trip);
    }
    setIsLoading(false);
  }, []);

  function handleTripUpdate(updatedTrip: Trip) {
    setTrip(updatedTrip);
    sessionStorage.setItem("current-trip", JSON.stringify(updatedTrip));
  }

  function handleOpenAlternatives(dayId: string, activity: Activity) {
    setSelectedActivityForAlternatives({ dayId, activity });
  }

  function handleCloseAlternatives() {
    setSelectedActivityForAlternatives(null);
  }

  function handleReplaceActivity(
    dayId: string,
    activityId: string,
    replacement: ActivityAlternative
  ) {
    if (!trip) return;

    const updatedDays = trip.days.map((day) => {
      if (day.id !== dayId) return day;

      const updatedActivities = day.activities.map((act) => {
        if (act.id !== activityId) return act;

        return {
          ...act,
          title: replacement.title,
          description: replacement.description,
          category: replacement.category,
          estimatedCost: replacement.estimatedCost,
          time: replacement.time,
        };
      });

      const dayEstimatedCost = updatedActivities.reduce((acc, a) => acc + a.estimatedCost, 0);

      return {
        ...day,
        activities: updatedActivities,
        estimatedCost: dayEstimatedCost,
      };
    });

    const foodCost = updatedDays.reduce(
      (acc, d) =>
        acc +
        d.activities
          .filter((a) => a.category === "FOOD")
          .reduce((sum, a) => sum + a.estimatedCost, 0),
      0
    );

    const activitiesCost = updatedDays.reduce(
      (acc, d) =>
        acc +
        d.activities
          .filter(
            (a) =>
              a.category === "SIGHTSEEING" ||
              a.category === "ACTIVITY" ||
              a.category === "SHOPPING"
          )
          .reduce((sum, a) => sum + a.estimatedCost, 0),
      0
    );

    const transportCost = updatedDays.reduce(
      (acc, d) =>
        acc +
        d.activities
          .filter((a) => a.category === "TRANSPORT")
          .reduce((sum, a) => sum + a.estimatedCost, 0),
      0
    );

    const updatedTrip: Trip = {
      ...trip,
      days: updatedDays,
      budgetBreakdown: {
        ...trip.budgetBreakdown,
        food: foodCost,
        activities: activitiesCost,
        transport: transportCost,
      },
      updatedAt: new Date().toISOString(),
    };

    handleTripUpdate(updatedTrip);
  }

  if (isLoading) {
    return <LoadingScreen label="Caricamento del tuo viaggio..." />;
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-medium">Nessun viaggio trovato.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Crea un nuovo viaggio
          </button>
        </main>
      </div>
    );
  }

  const formattedRange =
    trip.startDate && trip.endDate
      ? `${new Intl.DateTimeFormat("it-IT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(`${trip.startDate}T00:00:00`))} - ${new Intl.DateTimeFormat("it-IT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(`${trip.endDate}T00:00:00`))}`
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-6 p-6 lg:grid-cols-[340px_1fr_360px]">
        <section aria-label="Chat assistente" className="h-[calc(100vh-140px)] lg:sticky lg:top-24">
          <ChatBox trip={trip} onTripUpdate={handleTripUpdate} />
        </section>

        <section aria-label="Timeline del viaggio" className="min-w-0">
          <header className="mb-4">
            <h1 className="text-2xl font-semibold">{trip.title}</h1>
            <p className="text-sm text-muted-foreground">
              {trip.destination} · {trip.durationDays} giorni · {trip.totalBudget} {trip.currency}
            </p>
            {formattedRange && <p className="text-sm text-muted-foreground">{formattedRange}</p>}
          </header>
          <TripTimeline
            trip={trip}
            onReorder={handleTripUpdate}
            onOpenAlternatives={handleOpenAlternatives}
          />
        </section>

        <section aria-label="Budget e mappa" className="space-y-6 lg:sticky lg:top-24">
          <BudgetCard
            totalBudget={trip.totalBudget}
            currency={trip.currency}
            breakdown={trip.budgetBreakdown}
          />
          <div className="h-64">
            <MapPanel trip={trip} />
          </div>
        </section>
      </main>

      <ActivityAlternativesModal
        isOpen={Boolean(selectedActivityForAlternatives)}
        onClose={handleCloseAlternatives}
        trip={trip}
        dayId={selectedActivityForAlternatives?.dayId ?? ""}
        activity={selectedActivityForAlternatives?.activity ?? null}
        onReplaceActivity={handleReplaceActivity}
      />
    </div>
  );
}
