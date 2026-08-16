// components/trip/FlightWidget.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plane, ExternalLink, Sparkles, Loader2, AlertCircle } from "lucide-react";
import type { Trip } from "@/types/trip";

interface FlightWidgetProps {
  trip: Trip;
}

/**
 * Chiama l'API /api/flights/iata (Gemini) per risolvere il codice IATA
 * dell'aeroporto principale più vicino alla location fornita.
 */
async function resolveIataViaApi(location: string): Promise<string | null> {
  try {
    const res = await fetch("/api/flights/iata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.iata && /^[A-Z]{3}$/.test(data.iata.toUpperCase())) {
      return data.iata.toUpperCase();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Controlla se un codice è un IATA valido (esattamente 3 lettere).
 * NON si fida di abbreviazioni estratte dal testo del trip.
 */
function isValidIata(code?: string | null): code is string {
  return !!code && /^[A-Z]{3}$/.test(code.trim().toUpperCase());
}

export function FlightWidget({ trip }: FlightWidgetProps) {
  const [originInput, setOriginInput] = useState(trip.originCity || "Roma");
  const destination = trip.destination;

  const [originIata, setOriginIata] = useState<string | null>(null);
  const [destIata, setDestIata] = useState<string | null>(null);

  const [isResolvingOrigin, setIsResolvingOrigin] = useState(true);
  const [isResolvingDest, setIsResolvingDest] = useState(true);
  const [originError, setOriginError] = useState(false);
  const [destError, setDestError] = useState(false);

  // Debounce timer per l'input dell'origine
  const originTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Risolve il codice IATA di destinazione — una volta sola al mount
  useEffect(() => {
    let isMounted = true;
    setIsResolvingDest(true);
    setDestError(false);

    async function resolve() {
      // Prima controlla se il trip ha già un codice IATA destinazione valido
      if (isValidIata(trip.destinationIataCode)) {
        if (isMounted) {
          setDestIata(trip.destinationIataCode!.toUpperCase());
          setIsResolvingDest(false);
        }
        return;
      }

      // Altrimenti chiama l'API Gemini per risolvere il codice
      const resolved = await resolveIataViaApi(destination);
      if (isMounted) {
        if (resolved) {
          setDestIata(resolved);
        } else {
          setDestError(true);
        }
        setIsResolvingDest(false);
      }
    }

    resolve();
    return () => { isMounted = false; };
  }, [destination, trip.destinationIataCode]);

  // Risolve il codice IATA dell'origine — con debounce sull'input
  const resolveOrigin = useCallback((locationText: string) => {
    if (originTimerRef.current) clearTimeout(originTimerRef.current);

    setIsResolvingOrigin(true);
    setOriginError(false);

    originTimerRef.current = setTimeout(async () => {
      // Controlla se il trip ha già un codice IATA origine valido E
      // l'utente non ha cambiato l'input dall'originCity
      if (
        isValidIata(trip.originIataCode) &&
        locationText.trim().toLowerCase() === (trip.originCity || "").trim().toLowerCase()
      ) {
        setOriginIata(trip.originIataCode!.toUpperCase());
        setIsResolvingOrigin(false);
        return;
      }

      // Chiama SEMPRE l'API Gemini per risolvere il codice
      const resolved = await resolveIataViaApi(locationText);
      if (resolved) {
        setOriginIata(resolved);
      } else {
        setOriginError(true);
      }
      setIsResolvingOrigin(false);
    }, 500);
  }, [trip.originIataCode, trip.originCity]);

  // Effetto iniziale per risolvere l'origine al mount
  useEffect(() => {
    resolveOrigin(originInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando l'utente cambia l'input, risolvi di nuovo
  const handleOriginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOriginInput(value);
    if (value.trim().length >= 2) {
      resolveOrigin(value);
    }
  };

  const isResolving = isResolvingOrigin || isResolvingDest;
  const hasValidCodes = originIata && destIata;

  const googleFlightsUrl = `https://www.google.com/travel/flights?q=${encodeURIComponent(
    `Voli da ${originInput.trim() || "Roma"} a ${destination}`
  )}`;

  const skyscannerUrl = hasValidCodes
    ? `https://www.skyscanner.it/trasporti/voli/${originIata.toLowerCase()}/${destIata.toLowerCase()}/`
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card/90 p-5 shadow-soft backdrop-blur-md space-y-4">
      {/* Header Widget Voli */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Plane className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base flex items-center gap-2">
              Ricerca Voli Diretta
            </h3>
            <p className="text-xs text-muted-foreground">
              Destinazione: <span className="font-medium text-foreground">{destination}</span>
              {isResolvingDest ? (
                <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> risolvo...
                </span>
              ) : destIata ? (
                <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                  ({destIata})
                </span>
              ) : destError ? (
                <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-[10px] text-red-600 dark:text-red-400">
                  <AlertCircle className="h-2.5 w-2.5" /> errore
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {/* Input della città di partenza per aggiornare i link al volo */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
          <span>Città o Aeroporto di Partenza:</span>
          {isResolvingOrigin && (
            <span className="text-[10px] text-primary flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Ricerca aeroporto AI...
            </span>
          )}
          {!isResolvingOrigin && originIata && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono font-bold">
              ✓ {originIata}
            </span>
          )}
          {!isResolvingOrigin && originError && (
            <span className="text-[10px] text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Non trovato
            </span>
          )}
        </label>
        <input
          type="text"
          value={originInput}
          onChange={handleOriginChange}
          placeholder="Es. Roma, Bergamo, Milano MXP..."
          className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* Banner di ricerca diretta su Google Flights e Skyscanner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Confronto Voli in Tempo Reale
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Apri i risultati ed i prezzi reali per{" "}
          <strong className="text-foreground">
            {originInput.trim() || "Roma"} {originIata ? `(${originIata})` : ""} → {destination}{" "}
            {destIata ? `(${destIata})` : ""}
          </strong>
          :
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <a
            href={googleFlightsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2.5 text-xs font-bold shadow-xs transition-all hover:scale-[1.02]"
          >
            <span>🛫 Cerca su Google Flights</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {skyscannerUrl ? (
            <a
              href={skyscannerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 text-xs font-bold shadow-xs transition-all hover:scale-[1.02]"
            >
              <span>🌐 Skyscanner ({originIata}→{destIata})</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600/50 text-white/70 px-3.5 py-2.5 text-xs font-bold shadow-xs cursor-not-allowed"
            >
              {isResolving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Caricamento codici IATA...</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Link Skyscanner non disponibile</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
