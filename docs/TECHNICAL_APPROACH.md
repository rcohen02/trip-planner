# Trip Planner — Technical Approach

*Draft · Oct 2, 2026 · Rob Cohen*

A private website for planning family and couple trips. It holds each trip's logistics (flights, house, dates) and a researched, mapped list of places, screened against our standing travel preferences. First trip loaded: **Lisbon, Oct 8–12, 2026**.

It uses the same stack as **Small Hall** (`rcohen02/small-hall`), so patterns, CI and the deploy setup carry over.

---

## 1. Goals

1. **One page per trip:** flights, lodging, dates, travelers, and a day-by-day plan.
2. **Picks with a map:** restaurants, sites and activities, each with hours, price (local currency + USD), notes and source.
3. **Preference-aware research:** Claude researches a destination using the rules in `travel_context.md` (local over headline spots, seafood, land art, ruins, flat-water kayaking, hiking cap, drive radius, no hotels, Relaxed/Packed pace).
4. **Low-effort intake:** drop in a booking confirmation (PDF or pasted email) and it's read automatically. No retyping.
5. **Private:** only Rob and Danielle can see it.

**Non-goals for v1:** booking or payments, a public site, a native app, editing with multiple people at the same time.

---

## 2. Stack (same as Small Hall)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript | Same versions as Small Hall |
| Styling | Tailwind v4 + a `design/` folder of tokens and components | New palette; reuse the primitives pattern |
| Database | Postgres on **Neon** (Vercel Marketplace) | Pooled `DATABASE_URL` |
| ORM | Prisma | Migrations applied in CI before jobs run |
| Maps | Leaflet + OpenStreetMap tiles | Already used in Small Hall's `VenueMap` |
| AI | Anthropic SDK | Research, extraction, itinerary drafts |
| Email | Resend (default sender, no domain) | Outbound only: job alerts and trip briefs to Rob |
| Tests | Vitest + Testing Library | `test.yml` workflow with a Postgres service |
| Hosting | **Vercel** via GitHub, on the free `*.vercel.app` address | Previews per PR; production on `main`; no custom domain |
| Scheduled jobs | GitHub Actions | Same approach as Small Hall's scrape and digest jobs |

---

## 3. Data model (Prisma, first pass)

```
Trip        id, name, destination, startDate, endDate, travelers[], kidsIncluded,
            homebase (address, lat, lng), localCurrency, pace (relaxed|packed), notes
Flight      id, tripId, airline, flightNo, fromCode, fromTerminal, toCode, toTerminal,
            departLocal, arriveLocal, tz pair, bookingRef, seats (json), sourceEmailId
Lodging     id, tripId, kind (house), address, lat, lng, checkIn, checkOut, contact
Place       id, tripId, name, category (art|food|bar|shop|tour|nature|history|festival),
            lat, lng, address, hours, priceLocal, priceUsd, url, mapsUrl, blurb,
            source (nyt|claude|manual), sourceDate, verifiedAt, fitScore, status
            (idea|shortlist|scheduled|skipped)
DayPlan     id, tripId, date, variant (relaxed|packed), items[] -> Place + time slot
Preference  id, scope (family|adults), key, value     -- travel_context as data
Intake      id, uploadedAt, kind (pdf|text), blobUrl, rawText, parsedJson, status
```

`Preference` has two scopes. The **family** set comes straight from `travel_context.md`. The **adults** set (used for Lisbon) drops the kid filters and keeps the rest.

---

## 4. Connections

### 4.1 Booking intake — upload or paste (no domain needed)

- **How:** on `/inbox`, drag in the airline/Airbnb PDF or paste the confirmation email text. A server action sends it to Claude (Haiku), which returns JSON matching `Flight` or `Lodging`.
- **Check before save:** the JSON is validated with zod and shown on a review screen before it's saved, the same idea as Small Hall's `/review`.
- **File storage:** uploaded PDFs go to **Vercel Blob** (added from the Vercel dashboard, no domain needed), linked from the `Intake` row.
- **Ruled out:**
  - *Email forwarding:* needs a verified domain for an inbound address.
  - *Gmail API:* `gmail.readonly` is a restricted scope. An unverified app has refresh tokens that expire about every 7 days. Revisit only if uploading gets tedious.

### 4.2 Calendar — ICS feed (recommended) vs Google Calendar API

- **v1:** `/api/trips/[id]/calendar.ics` serves flights and scheduled day-plan items. Subscribe to the URL once in Google Calendar. No OAuth needed. The URL contains a secret token.
- Later: Google Calendar API, for pushing events onto Danielle's calendar directly. It has the same testing-mode token problem as Gmail.

### 4.3 Places data

- **Coordinates and addresses:** start with Nominatim (OpenStreetMap) geocoding, cached in the DB and rate-limited to 1 request per second.
- **Hours, photos and ratings (optional):** Google Places API (New). Needs an API key with billing turned on; check current free-tier limits before enabling. Call it only when a place is shortlisted, and cache the result in `Place.verifiedAt`.
- Keep a "Maps" link on every place, as the Lisbon doc already does.

### 4.4 Research agent (Anthropic API)

- **Input:** trip + preference set + category list.
- **Tooling:** Claude with the **web search tool**. The system prompt includes the preference rules as hard constraints (no hotels, hiking cap, drive radius from the homebase, local over headline).
- **Output:** candidate `Place` rows with a source URL, a `fitScore`, and a one-line reason. Nothing goes live without a click in the UI.
- **Festivals and events** (priority 4 in `travel_context.md`) must be searched fresh for the exact dates every time.
- **Where it runs:** research takes longer than a normal web request, so it runs as a **GitHub Actions job** started from the UI through `workflow_dispatch` (the GitHub API with a fine-scoped token), or by hand. This avoids Vercel function time limits.

### 4.5 Currency

- Show prices in local currency and USD, per Rob's standing preference.
- Get the rate from **Frankfurter** (ECB rates, free, no key). A daily GitHub Action caches it in an `FxRate` table. Store `priceLocal`; work out `priceUsd` when displaying.

### 4.6 Existing content import

- `scripts/import-md.ts` parses `lisbon-nyt-picks.md` (sections become categories, bullets become `Place` rows) and `travel_context.md` (becomes `Preference` rows).
- Run it once to load Lisbon, which lets the UI be tested against real data on day one.

### 4.7 Auth

- **v1:** one shared password set in the `SITE_PASSWORD` environment variable, checked in Next.js middleware with an HTTP-only cookie. This mirrors `REVIEW_PASSWORD` in Small Hall.
- **Later:** Auth.js with Google sign-in, limited to an allowlist of two email addresses.

---

## 5. Pages

| Route | Purpose |
|---|---|
| `/` | Upcoming and past trips |
| `/trips/[id]` | Overview: flights card, lodging, countdown, map of all picks |
| `/trips/[id]/picks` | Filterable list (category, status, fit) next to the map |
| `/trips/[id]/plan` | Day tabs, Relaxed/Packed toggle, drag places into time slots |
| `/trips/[id]/research` | Start research and review candidates (accept or skip) |
| `/inbox` | Upload a PDF or paste a confirmation, then review the parsed result before saving |
| `/api/trips/[id]/calendar.ics` | Calendar feed |

---

## 6. Vercel deployment plan

### 6.1 One-time setup

1. **Repo:** create `rcohen02/trip-planner` (private). Copy the scaffolding from Small Hall: `eslint`, `vitest`, the `design/` structure, the `prisma.config.ts` pattern, and `.github/workflows/test.yml`.
2. **Vercel project:** import from GitHub. Framework is Next.js. Build command `prisma generate && next build` (same as Small Hall).
3. **Database:** add **Neon** from the Vercel Marketplace. It injects `DATABASE_URL` into all environments.
   - Optional: turn on Neon's preview branching, so each PR gets its own database branch.
4. **Address:** no custom domain. The Vercel project name sets the URL (e.g. `trip-planner.vercel.app`, the same way Small Hall is `small-hall.vercel.app`). Pick a name that's free when creating the project. Every PR also gets its own preview URL.
5. **File storage:** add **Vercel Blob** (Storage tab). It injects `BLOB_READ_WRITE_TOKEN`.
6. **Privacy:** set `SITE_PASSWORD`. Also turn on Vercel's "Deployment Protection" for preview URLs.

### 6.2 Environment variables

| Variable | Vercel (prod/preview) | GitHub Actions secrets | Purpose |
|---|---|---|---|
| `DATABASE_URL` | ✓ (via Neon) | ✓ | Postgres |
| `SITE_PASSWORD` | ✓ | | Site access |
| `ANTHROPIC_API_KEY` | ✓ (confirmation extraction) | ✓ (research jobs) | Claude |
| `ANTHROPIC_MODEL` | ✓ | var | e.g. Haiku for extraction |
| `RESEND_API_KEY` | | ✓ | Alerts and trip briefs |
| `ALERT_EMAIL` | | var | cohen.rl@gmail.com (must be the Resend account owner) |
| `BLOB_READ_WRITE_TOKEN` | ✓ (via Vercel Blob) | | Uploaded confirmation PDFs |
| `SITE_URL` | ✓ | var | Defaults to the production `vercel.app` URL; used in email links |
| `GITHUB_DISPATCH_TOKEN` | ✓ | | Lets the UI start research workflows |
| `GOOGLE_PLACES_API_KEY` | optional | optional | Place details |
| `ICS_TOKEN_SECRET` | ✓ | | Signs calendar feed URLs |

Keep `.env.example` in the repo, as in Small Hall.

**Email without a domain:** Resend's default sender (`onboarding@resend.dev`) only delivers to the Resend account owner. Alerts and trip briefs therefore go to Rob only; Danielle uses the site link. The site itself never sends email, so Resend's key lives only in GitHub Actions.

### 6.3 Pipelines

| Job | Where | Trigger |
|---|---|---|
| Lint + test | GitHub Actions `test.yml` | Every push and PR |
| Preview deploy | Vercel | Every PR (protected URL) |
| Production deploy | Vercel | Merge to `main` |
| DB migrations | GitHub Actions (`prisma migrate deploy`) | On merge to `main`, before Vercel promotes; same as Small Hall's scrape job |
| Research | GitHub Actions `research.yml` | `workflow_dispatch` from the UI or by hand |
| FX rates | GitHub Actions `fx.yml` | Daily |
| Trip brief email (to Rob) | GitHub Actions `brief.yml` | 7 days and 1 day before departure |
| Place re-verify | GitHub Actions | Weekly while a trip is upcoming: re-check hours on shortlisted places |

Vercel's Hobby plan covers a personal, non-commercial site like this. GitHub Actions handles the scheduled work, so Vercel Cron limits don't matter.

### 6.4 Launch checklist

- [ ] `npm test` passes in CI with the Postgres service
- [ ] Migrations applied to the Neon production branch
- [ ] Lisbon imported; flights and lodging show correctly with time zones (EWR is ET, LIS is WEST)
- [ ] Password gate works on production and previews are protected
- [ ] ICS feed subscribed in Google Calendar and showing TP202/TP209
- [ ] Intake test: upload the TAP e-ticket PDF and confirm the parsed result matches the Lisbon itinerary
- [ ] Alert email arrives when a job fails

---

## 7. Phases

| Phase | Scope | Target |
|---|---|---|
| **0 — Scaffold** | Repo, Vercel, Neon, password gate, Prisma schema, CI | Day 1 |
| **1 — Lisbon read-only** | Import md files; trip overview, picks list + map, flights card | Before Oct 8 (useful on the trip) |
| **2 — Plan** | Day plans with Relaxed/Packed; ICS feed | Next trip |
| **3 — Intake** | Upload/paste, Vercel Blob, extraction, `/inbox` review | Next trip |
| **4 — Research** | Research workflow, candidate review, Places enrichment | Banff (July 2027) planning |
| **5 — Polish** | Google sign-in, trip brief email, mobile layout pass | Ongoing |

Phase 1 is deliberately small enough to ship before Lisbon. It's mostly a read-only page over data we already have.

---

## 8. Open questions

1. **Name and look:** a working name and palette, as with Small Hall.
2. **Sharing:** just Rob and Danielle, or should other family (e.g., relatives also traveling in October) get read-only trip links?
3. **Places API:** worth paying for hours and photos, or are OSM data plus Maps links enough?
4. **Offline use:** is a PWA or "save for offline" needed for days abroad without data?
