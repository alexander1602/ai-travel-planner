// components/map/MapPanel.tsx
"use client";

import { useState } from "react";
import { Maximize2, MapPin } from "lucide-react";
import type { Trip } from "@/types/trip";
import { appConfig } from "@/lib/config";
import { OpenStreetMap } from "./OpenStreetMap";
import { MapModal } from "./MapModal";

interface MapPanelProps {
  trip: Trip;
}

export function MapPanel({ trip }: MapPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const cities = Array.from(new Set(trip.days.map((day) => day.city)));

  if (appConfig.maps.provider === "google") {
    return <GoogleMapsPlaceholder cities={cities} />;
  }

  if (appConfig.maps.provider === "mapbox") {
    return <MapboxPlaceholder cities={cities} />;
  }

  return (
    <>
      <div className="relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        {/* Header Bar */}
        <div className="z-10 flex items-center justify-between border-b border-border/60 bg-background/90 px-3.5 py-2 backdrop-blur-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-semibold truncate text-foreground">
              {cities.join(" → ")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
            title="Espandi Mappa"
          >
            <Maximize2 className="h-3 w-3" />
            Espandi
          </button>
        </div>

        {/* Map Container */}
        <div className="relative flex-1 min-h-[200px]">
          {!isModalOpen ? (
            <OpenStreetMap trip={trip} interactive={true} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/40 text-xs text-muted-foreground">
              Mappa espansa in primo piano
            </div>
          )}
        </div>
      </div>

      <MapModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        trip={trip}
      />
    </>
  );
}

function GoogleMapsPlaceholder({ cities }: { cities: string[] }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
      <MapPin className="h-6 w-6 text-primary mb-2" />
      <p className="font-semibold text-foreground">Google Maps Attivo</p>
      <p className="text-xs text-muted-foreground mt-1">Tappe: {cities.join(", ")}</p>
    </div>
  );
}

function MapboxPlaceholder({ cities }: { cities: string[] }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
      <MapPin className="h-6 w-6 text-primary mb-2" />
      <p className="font-semibold text-foreground">Mapbox Attivo</p>
      <p className="text-xs text-muted-foreground mt-1">Tappe: {cities.join(", ")}</p>
    </div>
  );
}
