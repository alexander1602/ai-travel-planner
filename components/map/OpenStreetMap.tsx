// components/map/OpenStreetMap.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { Trip } from "@/types/trip";
import { calculateCenterAndZoom, getCityCoordinates, geocodeCity } from "@/utils/geo-utils";

interface OpenStreetMapProps {
  trip: Trip;
  selectedDayNumber?: number | null;
  interactive?: boolean;
}

type LeafletMapInstance = {
  remove: () => void;
  fitBounds: (bounds: unknown, options?: unknown) => void;
  setView: (center: [number, number], zoom: number) => void;
};

type LeafletMarker = {
  bindPopup: (html: string) => LeafletMarker;
  openPopup: () => void;
};

type LeafletGlobal = {
  map: (element: HTMLElement, options: unknown) => LeafletMapInstance;
  tileLayer: (url: string, options: unknown) => { addTo: (map: LeafletMapInstance) => void };
  divIcon: (options: unknown) => unknown;
  marker: (latLng: [number, number], options: unknown) => {
    addTo: (map: LeafletMapInstance) => LeafletMarker;
  };
  polyline: (latLngs: [number, number][], options: unknown) => { addTo: (map: LeafletMapInstance) => void };
  latLngBounds: (latLngs: [number, number][]) => unknown;
};

declare global {
  interface Window {
    L: LeafletGlobal;
  }
}

interface DayMapPoint {
  rawLat: number;
  rawLng: number;
  lat: number;
  lng: number;
  dayNumber: number;
  title: string;
  cityName: string;
  activitiesCount: number;
  activities: import("@/types/trip").Activity[];
}

export function OpenStreetMap({ trip, selectedDayNumber, interactive = true }: OpenStreetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstanceRef = useRef<LeafletMapInstance | null>(null);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [dynamicCoordsMap, setDynamicCoordsMap] = useState<Record<string, { lat: number; lng: number }>>({});

  // Caricamento dinamico CDN Leaflet se non presente
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.L) {
      setIsLeafletLoaded(true);
      return;
    }

    // CSS
    const existingCss = document.getElementById("leaflet-css");
    if (!existingCss) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // JS
    const existingJs = document.getElementById("leaflet-js");
    if (!existingJs) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setIsLeafletLoaded(true);
      document.head.appendChild(script);
    } else {
      existingJs.addEventListener("load", () => setIsLeafletLoaded(true));
    }
  }, []);

  // Geocodifica dinamica in background delle città non in lista statica
  useEffect(() => {
    let isMounted = true;
    const cities = Array.from(new Set(trip.days.map((d) => d.city)));

    async function fetchDynamicCoords() {
      const results: Record<string, { lat: number; lng: number }> = {};
      for (const city of cities) {
        const coords = await geocodeCity(city, trip.destination);
        if (coords && isMounted) {
          results[city] = coords;
        }
      }
      if (isMounted && Object.keys(results).length > 0) {
        setDynamicCoordsMap((prev) => ({ ...prev, ...results }));
      }
    }

    fetchDynamicCoords();

    return () => {
      isMounted = false;
    };
  }, [trip]);

  // Inizializzazione della Mappa e Render dei Marker
  useEffect(() => {
    if (!isLeafletLoaded || !mapRef.current || typeof window === "undefined" || !window.L) return;

    const L = window.L;

    // Distruggi istanza precedente se esistente
    if (leafletInstanceRef.current) {
      leafletInstanceRef.current.remove();
      leafletInstanceRef.current = null;
    }

    // Prepara i punti per le città del viaggio con offset spaziale se più giorni sono nella stessa città
    const rawDayPoints = trip.days.map((day) => {
      const dynamic = dynamicCoordsMap[day.city];
      const coords = dynamic || getCityCoordinates(day.city, trip.destination);
      return {
        rawLat: coords.lat,
        rawLng: coords.lng,
        dayNumber: day.dayNumber,
        title: day.title,
        cityName: day.city,
        activitiesCount: day.activities.length,
        activities: day.activities,
      };
    });

    const coordCounts: Record<string, number> = {};
    const dayPoints: DayMapPoint[] = rawDayPoints.map((point) => {
      const key = `${point.rawLat.toFixed(3)},${point.rawLng.toFixed(3)}`;
      const count = coordCounts[key] || 0;
      coordCounts[key] = count + 1;

      if (count === 0) {
        return {
          ...point,
          lat: point.rawLat,
          lng: point.rawLng,
        };
      }

      // Offset a spirale per rendere visibile ed unico ogni singolo giorno (es. Giorno 1, 2, 3...)
      const angle = count * 1.5;
      const radius = 0.008 * (1 + count * 0.3);
      const lat = point.rawLat + radius * Math.cos(angle);
      const lng = point.rawLng + radius * Math.sin(angle);

      return {
        ...point,
        lat,
        lng,
      };
    });

    const { center, zoom } = calculateCenterAndZoom(dayPoints);

    // Inizializza mappa
    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
    });

    leafletInstanceRef.current = map;

    // Tile Layer OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const latLngs: [number, number][] = [];
    const selectedPoint = dayPoints.find((p) => p.dayNumber === selectedDayNumber);

    // Aggiungi Marker per ciascun giorno
    dayPoints.forEach((point) => {
      latLngs.push([point.lat, point.lng]);

      const isSelected = selectedDayNumber === point.dayNumber;

      // Icona HTML personalizzata per il Marker
      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div class="relative flex items-center justify-center">
            <div class="flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs shadow-lg transition-all ${
              isSelected
                ? "bg-emerald-500 text-white ring-4 ring-emerald-300 dark:ring-emerald-900 scale-125 z-50"
                : "bg-primary text-primary-foreground ring-2 ring-background hover:scale-110"
            }">
              ${point.dayNumber}
            </div>
            <div class="absolute -bottom-1 h-2 w-2 rotate-45 ${
              isSelected ? "bg-emerald-500" : "bg-primary"
            }"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const activitiesListHtml = point.activities
        .slice(0, 4)
        .map(
          (act) => `
          <li style="margin-top: 3px; font-size: 11px; color: #374151;">
            • <strong>${act.time}</strong> ${act.title}
          </li>`
        )
        .join("");

      const popupContent = `
        <div style="font-family: inherit; padding: 4px; min-width: 190px;">
          <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #2563eb;">
            Giorno ${point.dayNumber} · ${point.cityName}
          </span>
          <h4 style="margin: 2px 0 4px 0; font-size: 13px; font-weight: 600;">${point.title}</h4>
          <ul style="padding-left: 0; list-style: none; margin: 4px 0 0 0;">
            ${activitiesListHtml}
          </ul>
        </div>
      `;

      const marker = L.marker([point.lat, point.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(popupContent);

      if (isSelected) {
        marker.openPopup();
      }
    });

    // Traccia la linea di collegamento (Polyline) tra tutti i giorni
    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        color: "#2563eb",
        weight: 3,
        opacity: 0.8,
        dashArray: "6, 8",
      }).addTo(map);

      if (selectedPoint) {
        map.setView([selectedPoint.lat, selectedPoint.lng], 13);
      } else {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
      }
    }

    return () => {
      if (leafletInstanceRef.current) {
        leafletInstanceRef.current.remove();
        leafletInstanceRef.current = null;
      }
    };
  }, [isLeafletLoaded, trip, selectedDayNumber, interactive, dynamicCoordsMap]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border">
      {!isLeafletLoaded && (
        <div className="flex h-full w-full items-center justify-center bg-muted/40 text-xs text-muted-foreground">
          Caricamento mappa...
        </div>
      )}
      <div ref={mapRef} className="h-full w-full min-h-[220px]" />
    </div>
  );
}
