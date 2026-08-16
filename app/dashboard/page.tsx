// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, X, Plane } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { ChatBox } from "@/components/chat/ChatBox";
import { TripTimeline } from "@/components/trip/TripTimeline";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { ActivityAlternativesModal } from "@/components/trip/ActivityAlternativesModal";
import { FlightWidget } from "@/components/trip/FlightWidget";
import type { Activity, ActivityAlternative, Trip } from "@/types/trip";

export default function DashboardPage() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"flights" | "chat">("flights");
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
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

    const updatedTrip: Trip = {
      ...trip,
      days: updatedDays,
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
    <div className="flex min-h-screen flex-col relative">
      <Navbar />
      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-12">
        {/* Timeline principale */}
        <section aria-label="Timeline del viaggio" className="min-w-0 lg:col-span-8">
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

        {/* Sidebar — 2a Colonna: Voli & Trip Assistant */}
        <section aria-label="Supporto viaggio" className="space-y-4 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
          {/* Tab Selector Desktop */}
          <div className="flex rounded-xl bg-muted/60 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveSidebarTab("flights")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all cursor-pointer ${
                activeSidebarTab === "flights"
                  ? "bg-background text-foreground shadow-xs ring-1 ring-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plane className="h-3.5 w-3.5 text-primary" />
              <span>Ricerca Voli</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSidebarTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all cursor-pointer ${
                activeSidebarTab === "chat"
                  ? "bg-background text-foreground shadow-xs ring-1 ring-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot className="h-3.5 w-3.5 text-primary" />
              <span>Trip Assistant</span>
            </button>
          </div>

          {activeSidebarTab === "flights" ? (
            <FlightWidget trip={trip} />
          ) : (
            <div className="h-[620px]">
              <ChatBox trip={trip} onTripUpdate={handleTripUpdate} />
            </div>
          )}
        </section>
      </main>

      {/* PULSANTE FLOATING TRIP ASSISTANT (UNIVERSALE PC & MOBILE) */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <motion.button
          type="button"
          onClick={() => setIsMobileChatOpen((prev) => !prev)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-5px_rgba(0,0,0,0.35)] ring-4 ring-primary/20 backdrop-blur-md transition-all cursor-pointer"
          aria-label="Apri Trip Assistant"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white ring-2 ring-background animate-pulse">
            ✨
          </span>
        </motion.button>
      </div>

      {/* CASSELLA TRIP ASSISTANT A SCOMPARSA (DRAWER UNIVERSALE PC & MOBILE) */}
      <AnimatePresence>
        {isMobileChatOpen && (
          <div className="fixed inset-0 z-[99999] flex flex-col justify-end sm:justify-end sm:items-end p-0 sm:p-6 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileChatOpen(false)}
              className="fixed inset-0"
            />

            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 flex h-[85vh] sm:h-[620px] w-full sm:w-[420px] flex-col rounded-t-[2rem] sm:rounded-2xl border border-border bg-card p-4 shadow-2xl"
            >
              {/* Header Assistente */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-2 px-1">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-1.5">
                      Trip Assistant
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                    </h3>
                    <p className="text-[11px] text-muted-foreground">Assistenza AI in tempo reale</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileChatOpen(false)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Chiudi Assistente"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Componente ChatBox completo */}
              <div className="flex-1 overflow-hidden">
                <ChatBox trip={trip} onTripUpdate={handleTripUpdate} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
