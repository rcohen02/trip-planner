# T2T — Time 2 Travel · Technical Approach

*v2 · Oct 2, 2026 · Rob Cohen*

A private website for planning trips. It holds each trip's logistics (flights, house, dates), a mapped list of places, and a day-by-day planner board, screened against our standing travel preferences.

- **First trip:** Lisbon, Oct 8–12, 2026, following `lisbon-dashboard-sitemap.md`.
- **After that:** any destination.

The stack is the same as **Small Hall** (`rcohen02/small-hall`). The site is hosted on the free `vercel.app` address, with **no custom domain**.

---

## 0. Decisions (Oct 2)

| # | Topic | Decision |
|---|---|---|
| 1 | Name / look | **T2T — Time 2 Travel.** Trip Planner design system, built on the [coolors](https://coolors.co/170312-33032f-531253-a0acad-97d8b2) palette (§2.1) |
| 2 | Sharing | Owners sign in; **read-only share links** per trip for anyone else |
| 3 | Places data | **Free only:** OpenStreetMap/Nominatim + Maps links. No Google Places |
| 4 | Offline | Not needed. **Mobile-friendly** is required |
| 5 | Scope | Start with Lisbon; the data model works for any location |
| 6 | Deadline | **This weekend** (Oct 3–4), before the Oct 8 flight |
| 7 | Photos | Images already online (§4.3); no uploads of our own |
| 8 | Editing on site | **v2** (logged as a to-do). v1 loads content from the markdown files |
| 9 | Layout | **Both:** laptop planner board and phone screens |
| 10 | Budget page | **Skipped** |
| 11 | Weather | **Yes:** Open-Meteo (free, no key) |
| 12 | Login | **Google sign-in**, allowlist of Rob and Danielle |
| 13 | Costs | Free tiers first. Small Claude usage is fine |
| 14 | Repo | `rcohen02/trip-planner`, with progress pushed to GitHub |

---

## 1. Goals

1. **One dashboard per trip**, following the sitemap: Today, Days, Places, Map, Bookings & To-Do, Logistics.
2. **Planner board:** drag place cards into day slots (Morning, Lunch, Afternoon, Dinner, Night). Warnings appear on drop, e.g. "Closed Mondays", "Sat & Tue only", "Needs a booking".
3. **Prices in local currency and USD** throughout.
4. **Preference-aware research** for future trips, using `travel_context.md` with family and adults-only rule sets.
5. **Private by default**, with view-only links that can be shared.

**Non-goals for v1:** editing places on the site, a budget page, offline mode, booking or payments.

---

## 2. Stack

| Layer | Choice | Cost |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript (Small Hall versions) | Free |
| Styling | Tailwind v4 + Trip Planner design system (`design/`) | Free |
| Database | **Neon** Postgres via the Vercel Marketplace + Prisma | Free tier |
| Auth | **Auth.js** (NextAuth) with the Google provider | Free |
| Maps | Leaflet + OpenStreetMap tiles (CARTO now needs a key) | Free |
| Drag and drop | `@dnd-kit` (works with touch, mouse and keyboard) | Free |
| Weather | Open-Meteo forecast API (temperature, rain, sunrise and sunset) | Free, no key |
| Currency | Frankfurter (ECB rates) | Free, no key |
| Geocoding | Nominatim (OSM), cached, max 1 request per second | Free |
| Images | Wikimedia Commons API + the venue's own `og:image` (§4.3) | Free |
| AI | Anthropic SDK: research and reading confirmations (v2) | Pay per use, small |
| Email | Resend default sender, alerts to Rob only | Free tier |
| Hosting | **Vercel Hobby**, `*.vercel.app` | Free |
| Jobs and CI | GitHub Actions | Free tier |
| Tests | Vitest + Testing Library | Free |

### 2.1 Design system

The UI follows the **Trip Planner design system** (claude.ai artifact, Oct 3), copied into `design/`:

- `tokens.json` becomes `tokens.css` via `npm run tokens`, with light and dark themes on role tokens (`paper`, `surface`, `ink`, `accent`, `planned-*`, `warn-*`, `crit`, `cat-*`).
- `components.css` holds the `tp-*` component classes. Rules are in `README.md`, `WRITING.md` and `components/*.md`.
- **Type:** IBM Plex Sans and Mono.
- **Icons:** Lucide.
- **Money:** written "€16 / $19". **Times:** "5:30 pm".

---|---|---|
| `--ink` | `#170312` | Page background (dark), primary text (light) |
| `--plum-deep` | `#33032F` | Surfaces, nav bar, cards on dark |
| `--plum` | `#531253` | Primary buttons, active tab, selected slot |
| `--mist` | `#A0ACAD` | Secondary text, borders, disabled |
| `--mint` | `#97D8B2` | Accent: "planned" status, confirmed hours ✓, links, focus ring |

- **Category pins:** derive from the palette and check contrast; use the dataviz validator.
- **Warnings** (closed or needs a booking) need one added warm color (amber), since the palette has none.
- **Contrast check:** mint on ink passes for body text. Mist on ink needs a check at small sizes.

---

## 3. Data model (Prisma)

```
User        id, email, name, image                       -- Auth.js tables (Account, Session too)
Trip        id, slug, name, destination, startDate, endDate, timezone, localCurrency,
            travelers[], kidsIncluded, prefScope (family|adults), homebase (address, lat, lng)
TripShare   id, tripId, token (random), createdAt, revokedAt   -- read-only links
Flight      id, tripId, airline, flightNo, fromCode, fromTerminal, toCode, toTerminal,
            departUtc, arriveUtc, bookingRef, seats (json), checkInClosesUtc
Lodging     id, tripId, kind, address, lat, lng, checkIn, checkOut, contact
Place       id, tripId, name, category, cluster (west|center|east…), neighborhood,
            lat, lng, address, mapsUrl, url, phone, blurb, sourceNote, sourceDate,
            priceLocal, priceNote, hours (json), hoursConfirmed, openDays[],
            needsBooking, images (json: url, credit, license, sourcePage), status (want|planned|done)
Slot        id, tripId, date, kind (early|morning|lunch|afternoon|dinner|night),
            locked, placeId?                              -- one card per slot by default
Todo        id, tripId, text, kind (book|confirm|check|other), done, placeId?
Preference  id, scope (family|adults), key, value
FxRate      date, base, quote, rate
WeatherCache tripId, date, json, fetchedAt
```

- **Times:** store UTC; display in the trip's time zone (Lisbon is WEST; NYC is ET). This follows Small Hall's `format.ts` rule.
- **Prices:** store the local price; work out USD when displaying, using the day's `FxRate`.
- **Status:** a place shows as "planned" when it sits in a slot (the sitemap rule). Compute it from slots; don't store it twice.

---

## 4. Connections

### 4.1 Google sign-in (Auth.js)

1. **Google Cloud project:** create one and set up the OAuth consent screen as **External**. Scopes are `openid email profile` only, which are non-sensitive, so **no Google verification is needed**.
2. **OAuth client:** create a Web client. Redirect URIs:
   - `https://<project>.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
3. **Allowlist:** `ALLOWED_EMAILS=cohen.rl@gmail.com,dmindess@gmail.com`, checked in the `signIn` callback.
4. **Previews:** PR preview URLs change each time, and Google needs exact redirect URIs. Either sign in on production only and use share links on previews, or add a fixed preview alias. **v1: production only.**

### 4.2 Read-only share links

- `/s/[token]` shows the trip dashboard with **no login**. Drag-and-drop, to-dos and anything editable are hidden.
- The token is 32 random bytes in `TripShare`. It can be revoked, and there's one active link per trip at a time.
- The pages add `noindex` so search engines don't list them.

### 4.3 Images (free, already online)

Two sources, in order:

1. **Wikimedia Commons API:** search by place name plus city; take 3–6 images with license and credit. These are free to show with credit.
2. **Venue `og:image`:** fetch the venue site's preview image once, as a fallback thumbnail.

- **Caching:** store image URLs and credit in `Place.images` and refresh them in a GitHub Action. Don't copy the files.
- **Display:** show the credit on the carousel. The first image is the thumbnail on cards and slots.
- **No image:** a palette-colored placeholder with the category icon.
- **Not used:** Google, Instagram and press photos, because of licensing and cost.

### 4.4 Weather (Open-Meteo)

- **Endpoint:** `api.open-meteo.com/v1/forecast` with the homebase coordinates. Daily max/min temperature, rain chance, sunrise and sunset, in the trip's time zone.
- **Caching:** cached about 3 hours in `WeatherCache` (fetched in a server component with revalidate).
- **Range:** the forecast covers about 16 days, so it's live for Lisbon. Before that window, the Today page shows "forecast available from <date>".

### 4.5 Currency, geocoding

- **Currency:** Frankfurter, refreshed daily by a GitHub Action (falls back to the last known rate).
- **Geocoding:** Nominatim, during import only, with a proper User-Agent. Results are cached, so places are never geocoded twice.

### 4.6 Content import (v1 content source)

`scripts/import-md.ts` runs locally or in CI and is idempotent (matches on place name).

- **`lisbon-nyt-picks.md`:**
  - Sections become categories and bullets become `Place` rows.
  - It reads: price (€), hours, ✓ confirmed, Maps link and notes.
  - The Travel Itinerary section becomes `Flight` and `Lodging` rows.
- **`lisbon-dashboard-sitemap.md`:**
  - Day-specific slot rules: early-arrival slot on Fri, Mon afternoon locked.
  - Clusters.
  - The Bookings & To-Do list becomes `Todo` rows.
- **`travel_context.md`:** becomes `Preference` rows.

Source markdown lives in the repo under `content/trips/lisbon-2026/`. Until v2 adds editing on the site, the workflow is: edit the markdown, run the import.

### 4.7 Booking intake (v2)

- Upload a PDF or paste a confirmation on `/inbox`. Claude (Haiku) extracts JSON matching `Flight` or `Lodging`, checked with zod, then reviewed before saving.
- PDFs go to Vercel Blob (free tier).
- No email forwarding (needs a domain) and no Gmail API (restricted scope).

### 4.8 Research agent (v2)

- Claude with web search, using the trip's preference scope as hard rules.
- Runs as a GitHub Actions job (`workflow_dispatch`) to avoid Vercel time limits.
- Produces candidate places that need approval in the UI.
- Festivals must be searched fresh for the exact trip dates.

---

## 5. Screens (from the sitemap)

| Route | Laptop | Phone |
|---|---|---|
| `/` | Trip list | Same |
| `/t/[slug]` **Today** | Countdown, today's slots, weather and sunset, next booking, alerts | Primary screen on the trip |
| `/t/[slug]/days` **Days** | Sidebar "Unscheduled" (filters: category, cluster, open on day; search) + 4 day columns of slots, drag and drop | One day at a time (swipe tabs); tap a card, then "Add to…" slot picker instead of dragging |
| `/t/[slug]/places` | Filterable grid; detail view with carousel, € + $, hours ✓, Maps link, note, status | List + full-screen detail |
| `/t/[slug]/map` | Leaflet map: house pin, places colored by category, cluster outlines | Full screen, bottom sheet on tap |
| `/t/[slug]/todo` | Book / confirm / check list with checkboxes | Same |
| `/t/[slug]/logistics` | Flights, bags, house, getting around | Same |
| `/s/[token]/…` | Read-only versions of all the above | Same |

**Drop warnings:** computed on the server from `openDays`, `hoursConfirmed` and `needsBooking`, plus trip rules (e.g. galleries Sun–Mon). They show as amber chips on the slot. They warn; they never block.

---

## 6. Vercel deployment

### 6.1 One-time setup

1. **GitHub:** create an empty private repo, `rcohen02/trip-planner`, and push the scaffold.
2. **Vercel:** Add New, Project, import `trip-planner`. Framework is Next.js. Build command `prisma generate && next build`. The project name sets the URL, e.g. `t2t.vercel.app` if free, otherwise `trip-planner.vercel.app`.
3. **Database:** Vercel, Storage, add **Neon**. It injects `DATABASE_URL`.
4. **Google OAuth** (§4.1): add the production callback URL once the Vercel URL is known.
5. **Environment variables** (§6.2) for Production and Preview.
6. **Previews:** turn on Deployment Protection (Vercel Authentication) for preview URLs.
7. **Data:** run `prisma migrate deploy` and `npm run import` against production Neon (or let CI do it).

### 6.2 Environment variables

| Variable | Vercel | GitHub Actions | Purpose |
|---|---|---|---|
| `DATABASE_URL` | ✓ (Neon) | secret | Postgres |
| `AUTH_SECRET` | ✓ | | Auth.js session encryption (`npx auth secret`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | ✓ | | Google OAuth client |
| `ALLOWED_EMAILS` | ✓ | | Sign-in allowlist |
| `SITE_URL` | ✓ | var | Production `vercel.app` URL |
| `RESEND_API_KEY` | | secret | Job-failure alerts |
| `ALERT_EMAIL` | | var | cohen.rl@gmail.com (Resend account owner) |
| `ANTHROPIC_API_KEY` | v2 | v2 | Intake and research |
| `BLOB_READ_WRITE_TOKEN` | v2 (Blob) | | Uploaded PDFs |

`.env.example` is committed; real values never are.

### 6.3 Pipelines

| Job | Where | Trigger |
|---|---|---|
| Lint + test | GitHub Actions `test.yml` (Postgres service) | Every push and PR |
| Preview deploy | Vercel | Every PR |
| Production deploy | Vercel | Merge to `main` |
| Migrate + import | GitHub Actions `deploy-data.yml` | Push to `main` touching `prisma/` or `content/` |
| FX + image refresh | GitHub Actions `refresh.yml` | Daily |

Weather needs no job; it's cached on request.

### 6.4 Launch checklist

- [ ] CI green
- [ ] Production URL loads; Google sign-in works for both allowed emails and rejects others
- [ ] Lisbon imported: 30-ish places, flights TP202/TP209 at the correct local times, house pin
- [ ] Days board: drag works on laptop; "Add to…" works on phone; Mon afternoon locked; Fri early-arrival slot present
- [ ] Warnings show (Casa Pessoa on Mon, Feira da Ladra on Sun, Canalha needs booking)
- [ ] Weather and sunset on Today
- [ ] Share link opens read-only on a phone that isn't signed in; revoking it works
- [ ] Lighthouse mobile check; usable at 375 px width

---

## 7. Weekend plan

**Sat Oct 3**
- **Scaffold:** repo, Next.js, Tailwind tokens, Prisma schema, CI, Vercel + Neon.
- **Auth:** Google sign-in + allowlist.
- **Content:** import script; Lisbon content in.
- **Screens:** Logistics, Places (list + detail), Map.

**Sun Oct 4**
- **Days board:** drag and drop, slot rules, warnings; phone "Add to…".
- **Today:** weather, next booking, alerts. To-do page.
- **Share links.**
- **Images:** Wikimedia pass.
- **Finish:** mobile pass, launch checklist.

**Cut list if time runs short** (in order): images (use placeholders), share links, map clusters, weather.

Red-green TDD applies, as in Small Hall: one failing test, then minimum code, for each behavior. External services sit behind interfaces with fakes in tests.

---

## 8. v2 backlog

- [ ] **Edit on site:** add, edit and delete places, to-dos and logistics (replaces markdown import as the source of truth)
- [ ] **Intake:** upload or paste confirmations, parsed by Claude (§4.7)
- [ ] **Research agent** for new destinations (§4.8)
- [ ] **New trip wizard:** destination, dates, homebase, family or adults scope. **Superseded Oct 5, 2026** by the profiles + new trips + voice plan in `docs/PRD_PROFILES_TRIPS_VOICE.md`, built in five phases:
  - [ ] Phase 1 Foundation: users, invites, trips and places in the database; Lisbon migrated; pages unchanged (branch `profiles-and-new-trips`, no deploy before Oct 12)
  - [ ] Phase 2 Profile: Profile page, `travel_context.md` import, typed setup flow (built Oct 5 on the branch: `lib/profile/`, `/profile`, `/profile/setup`; travelers and groups live inside the profile document, not separate tables)
  - [ ] Phase 3 New trip + "Add new places": conversation engine, read-back, research into Suggested cards, draft-or-build days
  - [ ] Phase 4 Voice: browser listening and speaking on every flow (Qwen3-TTS later)
  - [ ] Phase 5 Learning: signals, end-of-trip review, approved profile changes
- [ ] **Done status + notes** during the trip
- [ ] **ICS calendar feed** for flights and planned slots
- [ ] **Add to calendar** from a booking (requested Oct 4, 2026): one tap on a booked place adds it to Google Calendar with the time, confirmation and note, plus a reminder; fallback is a downloadable `.ics` file. Bookings already store Lisbon date + time (`lib/plan/booking.ts`, `bookingInstant` gives the exact moment).
- [ ] **Maps feature: follow a walking route with more than 3 points** (tabled Oct 5, 2026). Google Maps directions links accept only 3 waypoints on phones (9 on desktop), so "Walking directions" for an uploaded route only roughly follows the drawn line (`directionsUrl` in `lib/routes/route.ts`). Options:
  1. **Legs:** split the route into ~1.5 km legs, each its own directions link with 3 waypoints (3 legs ≈ 11 points instead of 5). End legs at saved places on the route where possible. Keeps Google's spoken turn-by-turn.
  2. **"You are here" on the site map:** show the exact drawn line with a live location dot (browser Geolocation; Vercel is HTTPS). Follows the route 100%, no voice directions.
  3. **Download GPX** of the full line for apps that follow imported tracks with voice guidance (Komoot, AllTrails; some features paid).
  4. **No build:** the Google Maps app can show your My Maps (under Saved) with the full line, but without turn-by-turn.
  - Leaning: 1 + 2 together (Google voice that stays close, plus the exact line when Google wanders).

---

## 9. Status (Oct 3)

- **Built and tested locally:**
  - Pages: Today, Days (drag and drop plus "Add to day"), Places, place detail, Map, Bookings & To-Do, Logistics.
  - Google sign-in allowlist (`cohen.rl@gmail.com`, `dmindess@gmail.com`) and view-only share links.
  - Postgres storage.
- **Data:** Lisbon has 26 places, all mapped, with photos for 15.
- **Decided:**
  - v1 content comes from `picks.md` + `trip.json`. Only plan slots, to-do ticks and share links are stored in the database, so `Trip`/`Place` tables wait for v2 editing.
  - Migrations run in the Vercel build, so no separate data workflow is needed.
- **Waiting on:**
  - Rob creates the GitHub repo.
  - Vercel URL to be confirmed.
  - Google OAuth client.
