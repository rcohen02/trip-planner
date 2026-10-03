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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
