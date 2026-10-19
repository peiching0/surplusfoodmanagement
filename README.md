# Surplus Food Connect: web frontend

Vite + React + React Router. Runs fully in the browser with a mock API (localStorage), so the whole flow works before the backend exists.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Open the app, pick a demo organization (donor or recipient). "Reset demo data" on the login page restores the seed.

## What's built

| Screen | Route | Role |
|---|---|---|
| Login (demo org picker) | /login | all |
| Browse food + search organizations | /browse | recipient |
| Organization page | /orgs/:id | all |
| Listing detail, claim, pickup code | /listings/:id | all |
| New listing with AI scan | /new | donor |
| My listings, confirm handover | /my-listings | donor |
| Past claims / past donations | /claims | all |
| Impact dashboard | /impact | all |

Key behaviours: server-style shelf-life timer per category, live countdown with green / amber (under 30 min) / red (under 10 min) states, atomic quantity claiming, partial claims, claim deadlines, no-show and expiry sweep, 3 active claims per recipient, animal-feed vs people suitability check, self pickup only.

## Structure

```
src/
  config/rules.js     categories, shelf-life times, impact factors, expiry maths
  api/client.js       MOCK API: replace this file with real fetch calls
  data/seed.js        demo organizations, listings, claim history
  context/            session (who is logged in), refetch version
  hooks/              useNow (shared 1s ticker), useQuery
  components/         Shell, Countdown, ListingCard, StatusPill, Feedback
  pages/              one file per screen
  styles.css          design tokens and all styles
```

## Connecting the real backend

Every function in `src/api/client.js` has a comment with the endpoint it maps to. Keep the function names and return shapes, replace the bodies with `fetch('/api/...')`, and nothing else changes. Uncomment the proxy in `vite.config.js` for local development.

| Function | Endpoint |
|---|---|
| listOrgs / getOrg | GET /orgs, GET /orgs/:id |
| listListings / getListing | GET /listings, GET /listings/:id |
| createListing | POST /listings |
| scanFood | POST /listings/scan (backend calls the vision model) |
| claimListing / cancelClaim | POST /listings/:id/claims, POST /claims/:id/cancel |
| collectClaim | POST /claims/collect |
| listClaims | GET /claims |
| getImpact | GET /impact/summary, GET /impact/timeseries |

## Things to know

- The AI scan is mocked. It returns a sample draft by file size, and one sample is low-confidence to demonstrate the manual fallback. The AI only suggests: it never sets the timer and never confirms allergens.
- Expiry maths in `config/rules.js` is for previews. The server must compute `expires_at` and be the source of truth.
- Shelf-life times are placeholders. Validate with a food-safety expert before launch.
- Raw meat and seafood is disabled (`enabled: false`) pending a product decision.
- Pickup uses a 6-character code. QR scanning is a good next step.
- Auth is a demo org picker. Replace with real sign-up, login and admin verification.
