// components/trip/PdfExportButton.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileDown, Loader2, Check } from "lucide-react";
import { downloadTripPDF } from "@/utils/pdf-generator";
import type { Trip } from "@/types/trip";

interface PdfExportButtonProps {
  trip: Trip;
  className?: string;
}

export function PdfExportButton({ trip, className = "" }: PdfExportButtonProps) {
  const [status, setStatus] = useState<"idle" | "generating" | "success">("idle");

  async function handleExport() {
    if (status === "generating") return;

    try {
      setStatus("generating");
      await downloadTripPDF(trip);
      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
      }, 2500);
    } catch (err) {
      console.error("Errore durante la generazione del PDF:", err);
      setStatus("idle");
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleExport}
      disabled={status === "generating"}
      whileHover={{ scale: status === "generating" ? 1 : 1.02 }}
      whileTap={{ scale: status === "generating" ? 1 : 0.98 }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/90 px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground shadow-xs backdrop-blur-xs transition-all hover:bg-muted/80 hover:border-primary/30 hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer disabled:cursor-not-allowed disabled:opacity-75 ${className}`}
      aria-label="Scarica Guida PDF"
      title="Scarica la guida di viaggio completa in formato PDF stampabile (A4)"
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === "generating" && (
          <motion.span
            key="generating"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 text-primary font-medium"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Creazione PDF...</span>
          </motion.span>
        )}

        {status === "success" && (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold"
          >
            <Check className="h-4 w-4" />
            <span>PDF Scaricato!</span>
          </motion.span>
        )}

        {status === "idle" && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <FileDown className="h-4 w-4 text-primary" />
            <span>Scarica Guida PDF</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
