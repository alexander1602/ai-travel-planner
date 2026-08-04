// utils/geo-utils.ts
// Utility per geocodifica di base delle città, geocodifica dinamica Nominatim e calcolo di bounds/centri per la mappa.

export interface LocationPoint {
  lat: number;
  lng: number;
  label?: string;
  cityName?: string;
}

const KNOWN_CITIES: Record<string, { lat: number; lng: number }> = {
  // Islanda / Iceland
  islanda: { lat: 64.9631, lng: -19.0208 },
  iceland: { lat: 64.9631, lng: -19.0208 },
  reykjavik: { lat: 64.1466, lng: -21.9426 },
  reykjavík: { lat: 64.1466, lng: -21.9426 },
  keflavik: { lat: 64.0024, lng: -22.5627 },
  keflavík: { lat: 64.0024, lng: -22.5627 },
  vik: { lat: 63.4194, lng: -19.006 },
  vík: { lat: 63.4194, lng: -19.006 },
  akureyri: { lat: 65.6835, lng: -18.0878 },
  hofn: { lat: 64.2539, lng: -15.2082 },
  höfn: { lat: 64.2539, lng: -15.2082 },
  geysir: { lat: 64.3104, lng: -20.3024 },
  gullfoss: { lat: 64.3271, lng: -20.1199 },
  selfoss: { lat: 63.9331, lng: -20.9971 },
  husavik: { lat: 66.0449, lng: -17.3389 },
  húsavík: { lat: 66.0449, lng: -17.3389 },
  egilsstadir: { lat: 65.2669, lng: -14.3948 },
  egilsstaðir: { lat: 65.2669, lng: -14.3948 },
  skaftafell: { lat: 64.0159, lng: -16.9753 },
  "golden circle": { lat: 64.318, lng: -20.302 },
  "circuito d'oro": { lat: 64.318, lng: -20.302 },
  jokulsarlon: { lat: 64.0784, lng: -16.2306 },
  jökulsárlón: { lat: 64.0784, lng: -16.2306 },
  thingvellir: { lat: 64.2559, lng: -21.1299 },
  þingvellir: { lat: 64.2559, lng: -21.1299 },
  myvatn: { lat: 65.6039, lng: -16.9961 },
  mývatn: { lat: 65.6039, lng: -16.9961 },
  "blue lagoon": { lat: 63.8804, lng: -22.4495 },
  "blaa lonið": { lat: 63.8804, lng: -22.4495 },
  snaefellsnes: { lat: 64.8464, lng: -23.473 },
  snæfellsnes: { lat: 64.8464, lng: -23.473 },
  grundarfjordur: { lat: 64.9248, lng: -23.2568 },
  grundarfjörður: { lat: 64.9248, lng: -23.2568 },
  stykkisholmur: { lat: 65.0754, lng: -22.7278 },
  stykkishólmur: { lat: 65.0754, lng: -22.7278 },

  // Giappone
  giappone: { lat: 36.2048, lng: 138.2529 },
  japan: { lat: 36.2048, lng: 138.2529 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  osaka: { lat: 34.6937, lng: 135.5023 },
  nara: { lat: 34.6851, lng: 135.8048 },
  hiroshima: { lat: 34.3853, lng: 132.4553 },
  miyajima: { lat: 34.296, lng: 132.3197 },
  sapporo: { lat: 43.0618, lng: 141.3545 },
  fukuoka: { lat: 33.5904, lng: 130.4017 },
  yokohama: { lat: 35.4437, lng: 139.638 },
  kobe: { lat: 34.6901, lng: 135.1955 },
  kanazawa: { lat: 36.5613, lng: 136.6562 },
  takayama: { lat: 36.146, lng: 137.2522 },
  hakone: { lat: 35.2333, lng: 139.1057 },
  nikko: { lat: 36.75, lng: 139.6 },
  kamakura: { lat: 35.3191, lng: 139.5467 },
  nagoya: { lat: 35.1815, lng: 136.9066 },

  // Italia
  italia: { lat: 41.8719, lng: 12.5674 },
  italy: { lat: 41.8719, lng: 12.5674 },
  roma: { lat: 41.9028, lng: 12.4964 },
  rome: { lat: 41.9028, lng: 12.4964 },
  milano: { lat: 45.4642, lng: 9.19 },
  milan: { lat: 45.4642, lng: 9.19 },
  firenze: { lat: 43.7696, lng: 11.2558 },
  florence: { lat: 43.7696, lng: 11.2558 },
  venezia: { lat: 45.4408, lng: 12.3155 },
  venice: { lat: 45.4408, lng: 12.3155 },
  napoli: { lat: 40.8518, lng: 14.2681 },
  naples: { lat: 40.8518, lng: 14.2681 },
  torino: { lat: 45.0703, lng: 7.6869 },
  turin: { lat: 45.0703, lng: 7.6869 },
  bologna: { lat: 44.4949, lng: 11.3426 },
  verona: { lat: 45.4384, lng: 10.9916 },
  palermo: { lat: 38.1157, lng: 13.3615 },
  catania: { lat: 37.5079, lng: 15.083 },

  // Nord Europa
  oslo: { lat: 59.9139, lng: 10.7522 },
  bergen: { lat: 60.3913, lng: 5.3221 },
  norvegia: { lat: 60.472, lng: 8.4689 },
  norway: { lat: 60.472, lng: 8.4689 },
  stockholm: { lat: 59.3293, lng: 18.0686 },
  stoccolma: { lat: 59.3293, lng: 18.0686 },
  svezia: { lat: 60.1282, lng: 18.6435 },
  sweden: { lat: 60.1282, lng: 18.6435 },
  copenhagen: { lat: 55.6761, lng: 12.5683 },
  copenaghen: { lat: 55.6761, lng: 12.5683 },
  danimarca: { lat: 56.2639, lng: 9.5018 },
  denmark: { lat: 56.2639, lng: 9.5018 },
  helsinki: { lat: 60.1699, lng: 24.9384 },
  finlandia: { lat: 61.9241, lng: 25.7482 },
  finland: { lat: 61.9241, lng: 25.7482 },
  dublin: { lat: 53.3498, lng: -6.2603 },
  dublino: { lat: 53.3498, lng: -6.2603 },
  irlanda: { lat: 53.4129, lng: -8.2439 },
  ireland: { lat: 53.4129, lng: -8.2439 },

  // Europa Centrale e Meridionale
  avignone: { lat: 43.9493, lng: 4.8055 },
  avignon: { lat: 43.9493, lng: 4.8055 },
  paris: { lat: 48.8566, lng: 2.3522 },
  parigi: { lat: 48.8566, lng: 2.3522 },
  nice: { lat: 43.7102, lng: 7.262 },
  nizza: { lat: 43.7102, lng: 7.262 },
  lyon: { lat: 45.764, lng: 4.8357 },
  lione: { lat: 45.764, lng: 4.8357 },
  marseille: { lat: 43.2965, lng: 5.3698 },
  francia: { lat: 46.2276, lng: 2.2137 },
  france: { lat: 46.2276, lng: 2.2137 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  barcelona: { lat: 41.3851, lng: 2.1734 },
  barcellona: { lat: 41.3851, lng: 2.1734 },
  sevilla: { lat: 37.3891, lng: -5.9845 },
  siviglia: { lat: 37.3891, lng: -5.9845 },
  valencia: { lat: 39.4699, lng: -0.3763 },
  spagna: { lat: 40.4637, lng: -3.7492 },
  spain: { lat: 40.4637, lng: -3.7492 },
  lisbon: { lat: 38.7223, lng: -9.1393 },
  lisbona: { lat: 38.7223, lng: -9.1393 },
  porto: { lat: 41.1579, lng: -8.6291 },
  portogallo: { lat: 39.3999, lng: -8.2245 },
  portugal: { lat: 39.3999, lng: -8.2245 },
  zurich: { lat: 47.3769, lng: 8.5417 },
  zurigo: { lat: 47.3769, lng: 8.5417 },
  geneva: { lat: 46.2044, lng: 6.1432 },
  ginevra: { lat: 46.2044, lng: 6.1432 },
  svizzera: { lat: 46.8182, lng: 8.2275 },
  switzerland: { lat: 46.8182, lng: 8.2275 },
  vienna: { lat: 48.2082, lng: 16.3738 },
  austria: { lat: 47.5162, lng: 14.5501 },
  prague: { lat: 50.0755, lng: 14.4378 },
  praga: { lat: 50.0755, lng: 14.4378 },
  budapest: { lat: 47.4979, lng: 19.0402 },
  athens: { lat: 37.9838, lng: 23.7275 },
  atene: { lat: 37.9838, lng: 23.7275 },
  grecia: { lat: 39.0742, lng: 21.8243 },
  greece: { lat: 39.0742, lng: 21.8243 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  olanda: { lat: 52.1326, lng: 5.2913 },
  netherlands: { lat: 52.1326, lng: 5.2913 },
  berlin: { lat: 52.52, lng: 13.405 },
  berlino: { lat: 52.52, lng: 13.405 },
  germania: { lat: 51.1657, lng: 10.4515 },
  germany: { lat: 51.1657, lng: 10.4515 },

  // UK & USA
  london: { lat: 51.5074, lng: -0.1278 },
  londra: { lat: 51.5074, lng: -0.1278 },
  edinburgh: { lat: 55.9533, lng: -3.1883 },
  edimburgo: { lat: 55.9533, lng: -3.1883 },
  "new york": { lat: 40.7128, lng: -74.006 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  chicago: { lat: 41.8781, lng: -87.6298 },

  // Asia & Oceania & Americas
  bali: { lat: -8.4095, lng: 115.1889 },
  ubud: { lat: -8.5069, lng: 115.2625 },
  canggu: { lat: -8.6478, lng: 115.1385 },
  uluwatu: { lat: -8.8149, lng: 115.0884 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  seoul: { lat: 37.5665, lng: 126.978 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  melbourne: { lat: -37.8136, lng: 144.9631 },
  australia: { lat: -25.2744, lng: 133.7751 },
  auckland: { lat: -36.8485, lng: 174.7633 },
};

function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function isKnownCity(cityName: string): boolean {
  if (!cityName) return false;
  const cleanName = cityName.trim().toLowerCase();
  if (KNOWN_CITIES[cleanName]) return true;

  const tokens = cleanName
    .split(/[\/,—\-]|(?:\s+e\s+)/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    if (KNOWN_CITIES[token]) return true;
  }

  for (const token of tokens) {
    for (const key of Object.keys(KNOWN_CITIES)) {
      if (token === key || (token.length >= 3 && token.includes(key)) || (key.length >= 3 && key.includes(token))) {
        return true;
      }
    }
  }

  return false;
}

export function getCityCoordinates(cityName: string, destinationName?: string): LocationPoint {
  const cleanName = cityName.trim().toLowerCase();

  // Dividi in segmenti (es. "Nara / Kyoto" -> ["nara", "kyoto"])
  const tokens = cleanName
    .split(/[\/,—\-]|(?:\s+e\s+)/)
    .map((t) => t.trim())
    .filter(Boolean);

  // 1. Ricerca match esatto per ciascun token
  for (const token of tokens) {
    if (KNOWN_CITIES[token]) {
      return { ...KNOWN_CITIES[token], label: cityName, cityName };
    }
  }

  // 2. Ricerca parziale per ciascun token
  for (const token of tokens) {
    for (const [key, coords] of Object.entries(KNOWN_CITIES)) {
      if (token === key || (token.length >= 3 && token.includes(key)) || (key.length >= 3 && key.includes(token))) {
        return { ...coords, label: cityName, cityName };
      }
    }
  }

  // 3. Se la destinazione del viaggio è nota in KNOWN_CITIES, usala come anchor anziché il fallback generico
  let baseLat = 41.9; // Default geografico neutrale
  let baseLng = 12.5;

  if (destinationName) {
    const cleanDest = destinationName.trim().toLowerCase();
    const destTokens = cleanDest
      .split(/[\/,—\-]|(?:\s+e\s+)/)
      .map((t) => t.trim())
      .filter(Boolean);

    let destMatch: { lat: number; lng: number } | null = null;
    for (const dt of destTokens) {
      if (KNOWN_CITIES[dt]) {
        destMatch = KNOWN_CITIES[dt];
        break;
      }
    }
    if (!destMatch) {
      for (const dt of destTokens) {
        for (const [key, coords] of Object.entries(KNOWN_CITIES)) {
          if (dt === key || (dt.length >= 3 && dt.includes(key)) || (key.length >= 3 && key.includes(dt))) {
            destMatch = coords;
            break;
          }
        }
        if (destMatch) break;
      }
    }

    if (destMatch) {
      baseLat = destMatch.lat;
      baseLng = destMatch.lng;
    }
  }

  // Fallback deterministico centrato sull'anchor di destinazione
  const hash = stringHash(cleanName);
  const offsetLat = ((hash % 100) - 50) / 400;
  const offsetLng = ((((hash >> 3) % 100) - 50) / 400);

  return {
    lat: baseLat + offsetLat,
    lng: baseLng + offsetLng,
    label: cityName,
    cityName,
  };
}

const GEO_CACHE_KEY = "ai_travel_planner_geo_cache_v1";

function getGeoCache(): Record<string, { lat: number; lng: number }> {
  if (typeof window === "undefined") return {};
  try {
    const cached = localStorage.getItem(GEO_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setGeoCache(key: string, coords: { lat: number; lng: number }) {
  if (typeof window === "undefined") return;
  try {
    const cache = getGeoCache();
    cache[key.toLowerCase()] = coords;
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignora errori di spazio o privacy in localStorage
  }
}

/**
 * Geocodifica dinamica asincrona via OpenStreetMap Nominatim API con caching.
 */
export async function geocodeCity(cityName: string, destinationName?: string): Promise<{ lat: number; lng: number } | null> {
  const cleanCity = cityName.trim();
  const cleanDest = destinationName?.trim();

  const queriesToTry: string[] = [];

  if (cleanDest && cleanCity) {
    if (cleanDest.toLowerCase().includes(cleanCity.toLowerCase())) {
      queriesToTry.push(cleanDest);
    } else if (cleanCity.toLowerCase().includes(cleanDest.toLowerCase())) {
      queriesToTry.push(cleanCity);
    } else {
      queriesToTry.push(`${cleanCity}, ${cleanDest}`);
    }
  }

  if (cleanCity) queriesToTry.push(cleanCity);
  if (cleanDest) queriesToTry.push(cleanDest);

  const uniqueQueries = Array.from(new Set(queriesToTry.filter(Boolean)));

  for (const query of uniqueQueries) {
    const cacheKey = query.toLowerCase();
    const cache = getGeoCache();
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const res = await fetch(url, {
        headers: {
          "Accept-Language": "it,en;q=0.8",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            const result = { lat, lng };
            setGeoCache(cacheKey, result);
            return result;
          }
        }
      }
    } catch {
      // Ignora errori temporanei di rete o CORS
    }
  }

  return null;
}

export function calculateCenterAndZoom(points: LocationPoint[]): {
  center: [number, number];
  zoom: number;
} {
  const firstPoint = points[0];
  if (!firstPoint) {
    return { center: [64.9631, -19.0208], zoom: 6 };
  }

  if (points.length === 1) {
    return { center: [firstPoint.lat, firstPoint.lng], zoom: 11 };
  }

  let minLat = firstPoint.lat;
  let maxLat = firstPoint.lat;
  let minLng = firstPoint.lng;
  let maxLng = firstPoint.lng;

  points.forEach((p) => {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  });

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);

  let zoom = 10;
  if (maxDiff > 50) zoom = 3;
  else if (maxDiff > 20) zoom = 4;
  else if (maxDiff > 10) zoom = 5;
  else if (maxDiff > 5) zoom = 6;
  else if (maxDiff > 2) zoom = 7;
  else if (maxDiff > 1) zoom = 9;

  return { center: [centerLat, centerLng], zoom };
}

