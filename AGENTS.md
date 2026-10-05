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
- One "Add to day" popup for the whole site: `app/_ui/AddToDay.tsx` (`AddToDaySheet` + `usePlanAssignments`), used by Places, Map and Days. Change it there so every page gets the change; never copy it into a page.
- Bookings (`lib/plan/booking.ts`): one per place, stored as Lisbon wall-clock `date` + `time` (HH:MM). Convert with `bookingInstant` for countdowns; show with `bookingTime`. A booking clears "Needs a booking" and ticks the matching "Book" to-do.
- Hours checks (`lib/plan/hours.ts`): the ✓ on "Hours unconfirmed" stores a `HoursCheck`; `lib/context.ts` applies checks to `trip.places`, so views just read `hoursConfirmed`. A "Confirm … hours" to-do and the ✓ stay in sync both ways.
- Walking routes (`lib/routes/route.ts`): uploaded on the Itinerary as Google My Maps KMZ/KML, stored as `Route` rows (never in the repo, which is public). `lib/context.ts` turns each into a `walk` place (`route-<id>`, `place.route` holds the line, distance and nearby places), so planning, bookings and the Map treat it like any place. Directions links use 3 waypoints, the phone limit.
- Shortlist (`lib/plan/shortlist.ts`, `app/_ui/Shortlist.tsx`): replaced "Want". `ShortlistItem` rows; `lib/context.ts` sets `place.shortlisted`. Use `ShortlistToggle` on cards and `ShortlistFilter` ("Shortlist only") on any list you pick places from.
- Slots: base slots come from `trip.json`; slots people add on the Days board are `ExtraSlot`s in the store. Always build slots with `buildSlots(days, extras)` and show `slot.label`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
