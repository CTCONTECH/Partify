# Partify

Partify helps mechanics and everyday drivers find the right car part at the best practical cost.

It solves two pain points together:
- Which nearby stores actually have the part in stock.
- Which option is truly best once distance and fuel cost are considered.

This first version is focused on Cape Town and demonstrates the intended journey:
1. Enter vehicle details.
2. Search and select a part (part number or name).
3. Compare ranked suppliers by distance, stock, and total cost.

## UX Intent

This is intentionally not a generic template UI. The interface is designed for fast workshop decision-making:
- Guided step-by-step flow with low cognitive load.
- Strong visual hierarchy for urgent details (best price, nearest, total cost).
- Mobile-friendly cards and touch-sized controls.
- Ranking logic that combines item price, travel distance, and stock reliability.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Current Data Model

The project currently uses mock data for:
- Parts catalogue with part numbers and compatibility hints.
- Supplier inventory with stock and price.
- Supplier distance and fuel-cost assumptions.

Core ranking logic is in `src/lib/recommendation.ts`.

## Roadmap

### Backend and Live Integrations
- Replace mock data with live supplier feeds.
- Add supplier onboarding and inventory sync APIs.
- Add user geolocation and map routes.

### Price Intelligence
- Add configurable fuel price per liter and consumption profile per vehicle.
- Improve ranking with weighted preferences (cheapest vs fastest pickup).

### iOS and Android Distribution
To reach iStore and Play Store, use this path:
- Keep this Next.js UI as the core product surface.
- Add authentication, backend APIs, and offline-ready caching.
- Wrap the web app with Capacitor for iOS and Android builds.
- Add native capabilities as needed (push notifications, deep links, location permissions).
- Submit signed binaries through Apple App Store Connect and Google Play Console.

## Notes

- This version is an MVP front-end prototype for user flow validation.
- Cape Town geography and supplier records are currently sample values.
