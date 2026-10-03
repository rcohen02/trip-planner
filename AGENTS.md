# T2T — rules for anyone (human or agent) working in this repo

Plan: `docs/TECHNICAL_APPROACH.md`. Screens: `docs/LISBON_SITEMAP.md`. Trip content: `content/trips/<slug>/`.

This uses Next.js 16: Middleware is now `proxy.ts`, and `params`/`searchParams`/`cookies()` are async.
Read `node_modules/next/dist/docs/` before using an API you are unsure of.

## Red-green TDD (same rule as Small Hall)
1. Red: write one small failing test for the next behavior; run `npm test`; confirm it fails for the right reason.
2. Green: write the minimum code to pass; run the whole suite.
3. Refactor with the suite green.
- Pure logic lives in `lib/` and is unit tested. External services (database, weather, Wikimedia, geocoding) sit behind interfaces; tests use fakes.

## Conventions
- Store instants as ISO strings with offsets / UTC; display in the trip's time zone via `lib/format.ts`.
- Prices: store local currency; show local + USD (`lib/format.ts` `money`).
- v1 content comes from markdown + `trip.json`; run `npm run content` after editing. Editing on site is v2.
- Never suggest hotels (travel_context rule): the importer skips any "Hotels" section.
