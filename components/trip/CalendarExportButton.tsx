// components/trip/CalendarExportButton.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Check } from "lucide-react";
import { downloadTripICS } from "@/utils/ics-generator";
import type { Trip } from "@/types/trip";

interface CalendarExportButtonProps {
  trip: Trip;
  className?: string;
}

export function CalendarExportButton({ trip, className = "" }: CalendarExportButtonProps) {
  const [hasExported, setHasExported] = useState(false);

  function handleExport() {
    try {
      downloadTripICS(trip);
      setHasExported(true);
      setTimeout(() => {
        setHasExported(false);
      }, 2500);
    } catch (err) {
      console.error("Errore durante l'esportazione del calendario .ics:", err);
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleExport}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/90 px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground shadow-xs backdrop-blur-xs transition-all hover:bg-muted/80 hover:border-primary/30 hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer ${className}`}
      aria-label="Aggiungi al Calendario (.ics)"
      title="Scarica il file .ics compatibile con Google Calendar, Apple Calendar, Outlook"
    >
      <AnimatePresence mode="wait" initial={false}>
        {hasExported ? (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold"
          >
            <Check className="h-4 w-4" />
            <span>Calendario Scaricato!</span>
          </motion.span>
        ) : (
          <motion.span
            key="default"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4 text-primary" />
            <span>Aggiungi al Calendario (.ics)</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
