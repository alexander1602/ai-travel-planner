// components/layout/Hero.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Loader2,
  MapPin,
  Plane,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { useGenerateTrip } from "@/hooks/useGenerateTrip";

const EXAMPLES = [
  {
    label: "Islanda 🇮🇸",
    destination: "Islanda",
    durationType: "DAYS" as const,
    daysCount: 7,
    budget: "2200",
    tags: ["🌿 Natura & Relax", "🚗 Road Trip"],
    extra: "Cascate, geysir, spiagge nere e circuito d'oro con boutique hotel.",
  },
  {
    label: "Giappone 🇯🇵",
    destination: "Giappone",
    durationType: "DAYS" as const,
    daysCount: 10,
    budget: "2800",
    tags: ["🏰 Cultura & Storia", "🍜 Cibo & Gastronomia"],
    extra: "Tappe tra Tokyo, Kyoto e Osaka, templi, cucina locale e Shinkansen.",
  },
  {
    label: "Lisbona 🇵🇹",
    destination: "Lisbona",
    durationType: "DAYS" as const,
    daysCount: 4,
    budget: "850",
    tags: ["💑 In coppia", "🍜 Cibo & Gastronomia"],
    extra: "Weekend tra quartieri storici, vista sul Tago, pastel de belém e fado.",
  },
  {
    label: "Sicilia 🇮🇹",
    destination: "Sicilia",
    durationType: "DAYS" as const,
    daysCount: 7,
    budget: "1600",
    tags: ["🚗 Road Trip", "🌿 Natura & Relax"],
    extra: "Road trip da Palermo a Siracusa, Noto, Ortigia e mare cristallino.",
  },
];

const QUICK_TAGS = [
  "💑 In coppia",
  "🌿 Natura & Relax",
  "🏰 Cultura & Storia",
  "🍜 Cibo & Gastronomia",
  "🏨 Hotel Boutique",
  "🚗 Road Trip",
  "🎒 Economico",
  "✨ Lusso & Comfort",
];

const DAY_PRESETS = [3, 5, 7, 10, 14];

const MONTH_OPTIONS = [
  { value: "", label: "Qualsiasi mese (Flessibile)" },
  { value: "2026-09", label: "Settembre 2026" },
  { value: "2026-10", label: "Ottobre 2026" },
  { value: "2026-11", label: "Novembre 2026" },
  { value: "2026-12", label: "Dicembre 2026" },
  { value: "2027-01", label: "Gennaio 2027" },
  { value: "2027-02", label: "Febbraio 2027" },
  { value: "2027-03", label: "Marzo 2027" },
  { value: "2027-04", label: "Aprile 2027" },
  { value: "2027-05", label: "Maggio 2027" },
];

export function Hero() {
  const [originCity, setOriginCity] = useState("");
  const [destination, setDestination] = useState("");
  const [durationType, setDurationType] = useState<"DAYS" | "DATES" | null>(null);
  const [daysCount, setDaysCount] = useState<number>(7);
  const [targetMonth, setTargetMonth] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const router = useRouter();
  const { generate, isLoading, error } = useGenerateTrip();

  const invalidDates = Boolean(
    durationType === "DATES" && startDate && endDate && startDate > endDate
  );

  const calculatedDaysFromDates =
    durationType === "DATES" && startDate && endDate && startDate <= endDate
      ? Math.max(
          1,
          Math.round(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        )
      : null;

  const activeDurationDays =
    durationType === "DATES"
      ? calculatedDaysFromDates || 7
      : daysCount;

  const canSubmit =
    destination.trim().length >= 2 && !invalidDates && !isLoading;

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function applyExample(example: (typeof EXAMPLES)[number]) {
    setOriginCity("");
    setDestination(example.destination);
    setDurationType(example.durationType);
    setDaysCount(example.daysCount);
    setTargetMonth("");
    setBudget(example.budget);
    setSelectedTags(example.tags);
    setExtraDetails(example.extra);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const effectiveType = durationType || "DAYS";

    const parts: string[] = [];
    parts.push(`Viaggio a ${destination.trim()}`);
    if (originCity.trim()) {
      parts.push(`Partenza da ${originCity.trim()}`);
    }

    if (effectiveType === "DATES" && startDate && endDate) {
      parts.push(`dal ${startDate} al ${endDate} (${activeDurationDays} giorni)`);
    } else {
      parts.push(`di ${activeDurationDays} giorni`);
      if (targetMonth) {
        const found = MONTH_OPTIONS.find((m) => m.value === targetMonth);
        if (found) {
          parts.push(`indicativamente nel mese di ${found.label}`);
        }
      }
    }

    if (budget.trim()) {
      parts.push(`con un budget indicativo di ${budget.trim()} €`);
    }

    if (selectedTags.length > 0) {
      parts.push(`Stile di viaggio: ${selectedTags.join(", ")}`);
    }

    if (extraDetails.trim()) {
      parts.push(`Dettagli e note: ${extraDetails.trim()}`);
    }

    const fullPrompt = parts.join(". ");

    const trip = await generate({
      prompt: fullPrompt,
      destination: destination.trim(),
      originCity: originCity.trim() || undefined,
      startDate: effectiveType === "DATES" ? startDate || undefined : undefined,
      endDate: effectiveType === "DATES" ? endDate || undefined : undefined,
      budget: budget ? Number(budget) : undefined,
      currency: "EUR",
    });

    if (trip) {
      sessionStorage.setItem("current-trip", JSON.stringify(trip));
      router.push("/dashboard");
    }
  }

  const displayDestination = destination.trim() || "Giappone";
  const displayDays = activeDurationDays;

  return (
    <section className="relative overflow-hidden min-h-[90vh] flex flex-col justify-center">
      {/* Sfondo sfumato e sfere d'ambiente animate */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] bg-gradient-to-b from-primary/10 via-background to-background"
      />

      <motion.div
        aria-hidden="true"
        animate={{
          x: [0, 25, 0],
          y: [0, -30, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute left-1/4 top-12 -z-10 h-72 w-72 rounded-full bg-gradient-to-tr from-primary/20 via-emerald-500/10 to-transparent blur-3xl opacity-70"
      />

      <motion.div
        aria-hidden="true"
        animate={{
          x: [0, -30, 0],
          y: [0, 25, 0],
          scale: [1, 1.12, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute right-1/4 top-36 -z-10 h-80 w-80 rounded-full bg-gradient-to-bl from-indigo-500/15 via-purple-500/10 to-transparent blur-3xl opacity-60"
      />

      <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-8 sm:pb-24 sm:pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-4xl font-bold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl text-foreground"
          >
            Viaggi pensati
            <span className="block bg-gradient-to-r from-primary via-emerald-600 to-indigo-600 bg-clip-text text-transparent">
              per essere vissuti.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base"
          >
            Inserisci la destinazione, scegli le date o la durata e personalizza il tuo budget. L&apos;AI genererà l&apos;itinerario ideale giorno per giorno.
          </motion.p>
        </div>

        {/* Modulo di creazione viaggio strutturato animato */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.22 }}
          onSubmit={handleSubmit}
          className="mx-auto mt-8 max-w-2xl text-left"
        >
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className="rounded-[1.5rem] border border-border/80 bg-card/90 p-4 sm:p-5 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.25)] backdrop-blur-md space-y-4"
          >
            {/* 1. LUOGHI (PARTENZA & DESTINAZIONE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="origin-input"
                  className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wider"
                >
                  <Plane className="h-3.5 w-3.5 text-primary" />
                  Città di Partenza <span className="text-muted-foreground font-normal">(opzionale)</span>
                </label>
                <div className="relative group">
                  <input
                    id="origin-input"
                    type="text"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                    placeholder="Da dove parti? (es. Roma FCO, Milano MXP)"
                    className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all group-hover:border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="destination-input"
                  className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wider"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  1. Destinazione
                </label>
                <div className="relative group">
                  <input
                    id="destination-input"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Dove vuoi andare? (es. Islanda, Giappone...)"
                    className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all group-hover:border-border"
                    required
                  />
                </div>
              </div>
            </div>

            {/* SEZIONI 2, 3, 4 E SUBMIT APPARISCONO FLUIDAMENTE APPENA VIENE INSERITA LA DESTINAZIONE */}
            <AnimatePresence>
              {destination.trim().length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="space-y-4 overflow-hidden pt-1"
                >
                  {/* 2. DATE OPPURE DURATA & MESE FLESSIBILE */}
                  <div className="space-y-2.5 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wider">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        2. Quando vuoi viaggiare?
                      </label>
                    </div>

                    {/* Tab Selector */}
                    <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/60 p-1 text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setDurationType("DAYS")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 transition-all ${
                          durationType !== "DATES"
                            ? "bg-background text-foreground shadow-xs font-bold ring-1 ring-primary/20"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>✨ Mese Flessibile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDurationType("DATES")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 transition-all ${
                          durationType === "DATES"
                            ? "bg-background text-foreground shadow-xs font-bold ring-1 ring-primary/20"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>📅 Date Specifiche</span>
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {durationType !== "DATES" ? (
                        /* 1. MESE FLESSIBILE & DURATA GIORNI */
                        <motion.div
                          key="days-picker"
                          initial={{ opacity: 0, scale: 0.98, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98, y: -4 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3 pt-1"
                        >
                          <div>
                            <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                              Durata del viaggio:
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {DAY_PRESETS.map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setDaysCount(num)}
                                  className={`rounded-xl px-3.5 py-1.5 text-xs font-medium border transition-all ${
                                    daysCount === num
                                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/30"
                                      : "border-border/80 bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                                  }`}
                                >
                                  {num} giorni
                                </button>
                              ))}

                              <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-2.5 py-1 text-xs">
                                <span className="text-muted-foreground text-[11px]">N° gg:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="60"
                                  value={daysCount}
                                  onChange={(e) => setDaysCount(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-10 bg-transparent text-center font-bold outline-none text-foreground text-xs"
                                />
                              </div>
                            </div>
                          </div>

                          {/* SELETTORE MESE DI PARTENZA FLESSIBILE */}
                          <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-xs">
                            <label htmlFor="target-month-select" className="text-muted-foreground font-semibold flex items-center gap-1 text-[11px]">
                              <span>✨ Mese indicativo di partenza:</span>
                            </label>
                            <select
                              id="target-month-select"
                              value={targetMonth}
                              onChange={(e) => setTargetMonth(e.target.value)}
                              className="rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground font-medium focus:border-primary focus:outline-none"
                            >
                              {MONTH_OPTIONS.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </motion.div>
                      ) : (
                        /* 2. DATE SPECIFICHE */
                        <motion.div
                          key="dates-picker"
                          initial={{ opacity: 0, scale: 0.98, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98, y: -4 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-2 pt-1"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="rounded-xl border border-border/80 bg-background p-2.5 transition-colors hover:border-primary/50">
                              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Partenza
                              </span>
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-transparent text-xs text-foreground outline-none cursor-pointer"
                              />
                            </label>

                            <label className="rounded-xl border border-border/80 bg-background p-2.5 transition-colors hover:border-primary/50">
                              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground flex justify-between">
                                Rientro
                                {calculatedDaysFromDates && (
                                  <span className="text-primary font-bold">({calculatedDaysFromDates} gg)</span>
                                )}
                              </span>
                              <input
                                type="date"
                                min={startDate || undefined}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-transparent text-xs text-foreground outline-none cursor-pointer"
                              />
                            </label>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 3. BUDGET TOTALE */}
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <label
                      htmlFor="budget-input"
                      className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wider"
                    >
                      <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
                      3. Budget totale
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[140px]">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                          €
                        </span>
                        <input
                          id="budget-input"
                          type="number"
                          min="1"
                          step="any"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          placeholder="Es. 2.500 (opzionale)"
                          className="w-full rounded-xl border border-border/80 bg-background/80 pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>

                      <div className="flex gap-1">
                        {["1000", "2000", "3000"].map((b) => (
                          <motion.button
                            key={b}
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setBudget(b)}
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium border transition-all ${
                              budget === b
                                ? "border-primary bg-primary/10 text-primary font-semibold"
                                : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {Number(b).toLocaleString("it-IT")}€
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. EXTRA E DETTAGLI (OPZIONALI) */}
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wider">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                      4. Extra & Dettagli opzionali
                    </label>

                    <div className="space-y-2.5">
                      {/* Quick Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {QUICK_TAGS.map((tag) => {
                          const isSelected = selectedTags.includes(tag);
                          return (
                            <motion.button
                              key={tag}
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => toggleTag(tag)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/15 text-primary shadow-xs ring-1 ring-primary/30"
                                  : "border-border/60 bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                              }`}
                            >
                              {tag} {isSelected && "✓"}
                            </motion.button>
                          );
                        })}
                      </div>

                      <textarea
                        value={extraDetails}
                        onChange={(e) => setExtraDetails(e.target.value)}
                        placeholder="Es. In coppia, boutique hotel nel centro, ritmi rilassati, buon cibo locale..."
                        rows={2}
                        className="w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="pt-2 border-t border-border">
                    <motion.button
                      type="submit"
                      disabled={!canSubmit}
                      whileHover={canSubmit ? { scale: 1.015, shadow: "0 10px 25px -5px rgba(37,99,235,0.4)" } : {}}
                      whileTap={canSubmit ? { scale: 0.985 } : {}}
                      className="w-full inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sto creando l&apos;itinerario...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 text-amber-300" />
                          Crea itinerario per {displayDestination} ({displayDays} giorni)
                          <ArrowUpRight className="h-4 w-4" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {error && (
            <p role="alert" className="mt-3 text-xs text-red-500 text-center">
              {error}
            </p>
          )}

          {invalidDates && (
            <p role="alert" className="mt-3 text-xs text-red-500 text-center">
              La data di rientro deve essere successiva alla partenza.
            </p>
          )}
        </motion.form>

        {/* Esempi di Itinerario */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.35 }}
          className="mx-auto mt-6 max-w-2xl text-center"
        >
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Prova un itinerario esempio
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((example) => (
              <motion.button
                key={example.label}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => applyExample(example)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-xs text-muted-foreground transition-all hover:border-foreground hover:text-foreground shadow-2xs"
              >
                {example.label}
                <ChevronRight className="h-3 w-3" />
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* 3 Pilastri Informativi */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.45 }}
          className="mt-14 grid border-y border-border sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border"
        >
          <motion.div whileHover={{ y: -2 }} className="py-4 sm:py-5 sm:px-6 text-left space-y-1">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">
              <Compass className="h-4 w-4 text-primary shrink-0" />
              1. Destinazione & Durata
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Scegli le date precise o fissa semplicemente il numero di giorni desiderati.
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} className="py-4 sm:py-5 sm:px-6 text-left space-y-1">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">
              <CircleDollarSign className="h-4 w-4 text-primary shrink-0" />
              2. Budget & Stile
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Imposta il tuo budget ed esprimi preferenze sul tipo di vacanza (*relax, cultura, cibo, lusso...*).
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} className="py-4 sm:py-5 sm:px-6 text-left space-y-1">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              3. Itinerario & Voli Diretti
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ricevi subito itinerario giorno per giorno, alternative per ogni attività e ricerca voli in tempo reale.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}


