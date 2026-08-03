# AI Travel Planner

MVP professionale e scalabile per generare itinerari di viaggio con l'AI, con chat conversazionale, timeline drag & drop, budget tracking e mappa (placeholder pronto per Google Maps/Mapbox).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict
- Tailwind CSS + shadcn/ui
- Prisma ORM + SQLite (dev) → PostgreSQL (prod)
- React Hook Form + Zod
- Lucide React, Framer Motion

## Installazione

```bash
npm install
cp .env.local.example .env.local
npx prisma migrate dev --name init
npm run dev
```

App disponibile su `http://localhost:3000`. Funziona **senza chiavi API**: usa dati mock automaticamente e mostra un banner informativo.

## Variabili d'ambiente

```env
# .env.local
DATABASE_URL="file:./dev.db"

AI_PROVIDER=openai        # "openai" | "gemini" | "mock"
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

NEXT_PUBLIC_MAPS_PROVIDER=placeholder  # "placeholder" | "google" | "mapbox"
GOOGLE_MAPS_API_KEY=
MAPBOX_TOKEN=
```

## Cambiare provider AI

Basta modificare `AI_PROVIDER` in `.env.local`. Nessun'altra riga di codice va toccata: `services/ai/index.ts` seleziona l'implementazione a runtime tramite il Provider Pattern (`services/ai/provider.ts`).

```env
AI_PROVIDER=gemini
```

Se `AI_PROVIDER` non è impostato o la chiave manca, il sistema ricade automaticamente sul `MockProvider` (`services/ai/mock.ts`) e l'app resta pienamente funzionante.

## Struttura del progetto

```
app/                    Routing (App Router), Server Components di default
  api/
    generate-trip/route.ts
    update-trip/route.ts
    chat/route.ts
  dashboard/page.tsx
  page.tsx              Home
components/             Componenti UI puri e riutilizzabili (shadcn/ui based)
features/               Feature modules (trip, chat, budget) con logica dominio
services/               Logica applicativa (DB access, orchestrazione)
  ai/
    provider.ts         Interfaccia comune AIProvider
    openai.ts
    gemini.ts
    mock.ts
    prompts.ts          Tutti i prompt centralizzati
    index.ts            Factory + funzioni pubbliche generateTrip/chatTrip/modifyTrip
hooks/                  Custom React hooks (useTrip, useChat, useBudget)
lib/                    Config centralizzata, prisma client, utils condivisi
types/                  Tipi TypeScript condivisi (no "any")
utils/                  Funzioni pure (formatCurrency, dateUtils, ecc.)
prisma/
  schema.prisma
public/
styles/
```

## Modelli dati (Prisma)

`User`, `Trip`, `TripDay`, `Activity`, `ChatMessage`, `FavoriteTrip` — vedi `prisma/schema.prisma`.

## Script disponibili

```bash
npm run dev        # sviluppo
npm run build      # build produzione
npm run start      # avvio build
npm run lint       # lint
npx prisma studio  # esplora il DB
```

## Deploy in produzione

1. **Database**: sostituire `DATABASE_URL` con una connection string PostgreSQL (es. Neon, Supabase, RDS). Cambiare `provider = "sqlite"` in `provider = "postgresql"` in `schema.prisma`.
2. **Docker**: è previsto un `Dockerfile` multi-stage (build → runtime slim) e `docker-compose.yml` con servizio Postgres.
3. **Vercel**: collegare il repo, impostare le env vars nel dashboard, build command `next build`.
4. **Mappe**: impostare `NEXT_PUBLIC_MAPS_PROVIDER=google` o `mapbox` e la relativa chiave; `MapPanel` carica dinamicamente l'SDK corretto (`components/map/`).
5. **Pagamenti/Booking**: gli slot `services/booking/` e `services/payments/stripe.ts` sono predisposti come stub con la stessa interfaccia a provider, pronti per essere implementati senza toccare i chiamanti.
6. **Autenticazione**: struttura pronta per NextAuth.js (Auth.js) — modello `User` già presente in Prisma.

## Principi seguiti

SOLID, Clean Architecture, separazione UI/servizi/dominio, zero `any`, componenti piccoli e riutilizzabili, gestione centralizzata di configurazione ed errori, fallback sicuri, accessibilità (ARIA, focus visibile, navigazione da tastiera), dark mode nativa via `next-themes`.
