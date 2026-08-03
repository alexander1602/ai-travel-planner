// components/map/MapModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X, Calendar, Compass, Layers } from "lucide-react";
import type { Trip } from "@/types/trip";
import { OpenStreetMap } from "./OpenStreetMap";

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
}

export function MapModal({ isOpen, onClose, trip }: MapModalProps) {
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-md">
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
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative z-10 flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Mappa dell&apos;Itinerario</h2>
                <p className="text-xs text-muted-foreground">
                  {trip.title} · {trip.destination} ({trip.durationDays} giorni)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Chiudi mappa"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* Main Content Split Layout */}
          <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[340px_1fr]">
            {/* Days Sidebar List */}
            <aside className="flex flex-col border-b lg:border-b-0 lg:border-r border-border/60 bg-muted/20 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Tappe del Viaggio
                </span>
                {selectedDayNumber !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedDayNumber(null)}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Mostra tutti
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {trip.days.map((day) => {
                  const isSelected = selectedDayNumber === day.dayNumber;
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() =>
                        setSelectedDayNumber(isSelected ? null : day.dayNumber)
                      }
                      className={[
                        "w-full text-left rounded-xl p-3 border transition-all text-xs",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border/60 bg-background/80 hover:border-primary/50 hover:bg-background",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Giorno {day.dayNumber}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {day.city}
                        </span>
                      </div>
                      <h4 className="mt-1 font-semibold text-foreground line-clamp-1">{day.title}</h4>
                      <p className="mt-0.5 text-muted-foreground line-clamp-2">{day.description}</p>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Map Area */}
            <main className="relative flex-1 p-4 bg-muted/10 h-full min-h-[350px]">
              <OpenStreetMap
                trip={trip}
                selectedDayNumber={selectedDayNumber}
                interactive={true}
              />
            </main>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
