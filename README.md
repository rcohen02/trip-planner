# T2T — Time 2 Travel

Private trip planner for Rob and Danielle. First trip: Lisbon, Oct 9–12, 2026.

- Plan: [`docs/TECHNICAL_APPROACH.md`](docs/TECHNICAL_APPROACH.md) · Screens: [`docs/LISBON_SITEMAP.md`](docs/LISBON_SITEMAP.md)
- Design system: `design/` (tokens.json → tokens.css via `npm run tokens`; component rules in `design/README.md`, `design/WRITING.md`, `design/components/`)
- Trip content: `content/trips/<slug>/` — `picks.md` (places), `trip.json` (flights, days, clusters, to-dos), `enrichment.json` (map pins + Wikimedia photos)

## Run locally

```bash
npm install
npm run dev          # no DATABASE_URL / AUTH_GOOGLE_ID needed: in-memory store, sign-in skipped
npm test             # unit tests; set TEST_DATABASE_URL to also run the store tests against Postgres
```

After editing trip content: `npm run content` (and `npm run enrich -- lisbon-2026 --only=<place-id>` to refresh pins/photos for one place).

## Deploy (Vercel, free `*.vercel.app` address)

1. Vercel → Add New → Project → import `rcohen02/trip-planner`. Name the project `t2t` if available (gives `t2t.vercel.app`).
2. Storage → add **Neon** (sets `DATABASE_URL`). Migrations run during each build.
3. Google Cloud console → APIs & Services → OAuth consent screen (External; scopes: email, profile, openid) → Credentials → OAuth client ID (Web).
   Authorized redirect URI: `https://<your-project>.vercel.app/api/auth/callback/google`.
4. Vercel → Settings → Environment Variables: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_EMAILS`, `SITE_URL`.
5. Redeploy. Sign in, open Bookings & To-Do → "Create link" to share a view-only link.
