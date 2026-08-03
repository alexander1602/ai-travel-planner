// components/trip/ActivityAlternativesModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Utensils,
  Landmark,
  Car,
  BedDouble,
  Ticket,
  ShoppingBag,
  Circle,
  Sparkles,
  X,
  Check,
  Loader2,
  Euro,
  PartyPopper,
  HeartPulse,
  Tv,
  Smile,
} from "lucide-react";
import type { Activity, ActivityAlternative, ActivityCategory, Trip } from "@/types/trip";

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

interface ActivityAlternativesModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  dayId: string;
  activity: Activity | null;
  onReplaceActivity: (dayId: string, activityId: string, replacement: ActivityAlternative) => void;
}

export function ActivityAlternativesModal({
  isOpen,
  onClose,
  trip,
  dayId,
  activity,
  onReplaceActivity,
}: ActivityAlternativesModalProps) {
  const [alternatives, setAlternatives] = useState<ActivityAlternative[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !activity) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setAlternatives([]);

    async function fetchAlternatives() {
      try {
        const res = await fetch("/api/activity-alternatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trip,
            dayId,
            activityId: activity!.id,
          }),
        });

        if (!res.ok) {
          throw new Error("Errore durante il recupero delle alternative");
        }

        const data = (await res.json()) as { alternatives: ActivityAlternative[] };
        if (isMounted) {
          setAlternatives(data.alternatives ?? []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Si è verificato un errore");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAlternatives();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activity, dayId, trip]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activity || !mounted) return null;

  const Icon = ICONS[activity.category] ?? Circle;

  function handleConfirmReplace(alt: ActivityAlternative) {
    setReplacingId(alt.id);
    setTimeout(() => {
      onReplaceActivity(dayId, activity!.id, alt);
      setReplacingId(null);
      onClose();
    }, 200);
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
        />

        {/* Modal content container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative z-10 w-full max-w-2xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Alternative Disponibili</h2>
                <p className="text-xs text-muted-foreground">
                  Seleziona un&apos;alternativa per sostituirla direttamente nell&apos;itinerario.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Current Activity Box summary */}
          <div className="my-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Attività Attuale
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-background p-1.5 shadow-xs">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold">{activity.title}</h4>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{activity.description}</p>
                  )}
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <span className="text-xs font-semibold text-foreground">{activity.time}</span>
                <p className="text-xs text-muted-foreground">~{activity.estimatedCost}€</p>
              </div>
            </div>
          </div>

          {/* Modal Body: Loading, Error or Alternatives List */}
          <div className="mt-4 space-y-3 min-h-[220px] flex flex-col justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm font-medium">Ricerca delle migliori alternative...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  L&apos;AI sta elaborando opzioni per la tua tappa a {trip.destination}.
                </p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center">
                <p className="text-sm font-medium text-destructive">{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="mt-3 rounded-lg bg-destructive px-4 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90"
                >
                  Riprova
                </button>
              </div>
            ) : alternatives.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nessuna alternativa trovata per questa attività.
              </div>
            ) : (
              <ul className="space-y-3">
                {alternatives.map((alt) => {
                  const AltIcon = ICONS[alt.category] ?? Circle;
                  const isReplacing = replacingId === alt.id;
                  const costDiff = alt.estimatedCost - activity.estimatedCost;

                  return (
                    <motion.li
                      key={alt.id}
                      whileHover={{ scale: 1.01 }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/60 p-4 hover:border-primary/50 hover:bg-background shadow-xs transition-all"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className="mt-0.5 rounded-lg bg-muted p-2 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <AltIcon className="h-4 w-4" />
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                              {alt.title}
                            </h4>
                            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {alt.time}
                            </span>
                          </div>
                          {alt.description && (
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                              {alt.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-border/40 pt-2 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                            <Euro className="h-3.5 w-3.5" />
                            {alt.estimatedCost}
                          </div>
                          {costDiff !== 0 && (
                            <p
                              className={`text-[11px] font-medium ${
                                costDiff < 0 ? "text-emerald-600" : "text-amber-600"
                              }`}
                            >
                              {costDiff < 0 ? `${costDiff}€` : `+${costDiff}€`}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isReplacing}
                          onClick={() => handleConfirmReplace(alt)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isReplacing ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Sostituzione...
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Sostituisci
                            </>
                          )}
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
