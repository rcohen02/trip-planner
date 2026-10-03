Trip Planner is a private planning site for Rob and Danielle's trips: logistics, a researched list of places, and a day-by-day plan. The first trip is Lisbon, Oct 9–12, 2026. It is used at a desk before the trip and on a phone in the street during it, often in sunlight, sometimes at night, on patchy data. Every rule below serves that: read at a glance, tap with a thumb, never wonder whether a place is open.

## Principles

1. **The plan is the product.** Today and Days lead; Places, Map and Budget feed them. Put the next thing to do above everything else on a screen.
2. **Trust is visible.** Every fact shows how sure we are: confirmed hours get `ok-ink` and a check, unconfirmed ones get `warn-ink`, dated prices say their year. Never present a guess like a fact.
3. **Two currencies, always.** Every price shows local currency first, then USD (see Writing).
4. **Borders, not shadows.** Surfaces are separated by `line` borders and the `paper` / `surface` / `surface-sunken` steps. Only a card being dragged (`shadow-drag`) and the phone sheet (`shadow-sheet`) cast shadows.
5. **Quiet frame, loud state.** Neutrals carry the layout; color is spent on state (planned, warning, conflict) and on category. The brand plum appears on actions and the active tab, not on decoration.

## Color

The palette is five brand colors: `plum-black`, `plum-deep`, `plum`, `steel` and `mint`. Components never use them directly; they use the role tokens below, which map the brand colors per theme.

- **Ground and surfaces.** Page on `paper`, cards on `surface` with a 1px `line` border, day columns and grouped table rows on `surface-sunken`, sheets and menus on `surface-raised`.
- **Text.** `ink` for names and body, `ink-2` for detail lines, `ink-3` for metadata and mono labels. All three pass 4.5:1 on `paper`, `surface` and `surface-sunken` in both themes. `steel` is never text in light theme.
- **Action.** `accent` is plum in light and mint in dark: primary buttons (`on-accent` text), links, the active nav tab, the selected segment, checked checkboxes. Hover is `accent-hover`.
- **Mint means planned.** Use `planned-bg` / `planned-ink` for the Planned pill and `drop-bg` + a 2px dashed `drop-line` for the slot under a dragged card. Don't use mint for success messages; `ok-ink` handles those.
- **Status pills.** Want: `want-bg` / `want-ink`. Planned: `planned-bg` / `planned-ink`. Done: `done-bg` / `done-ink`. The pill always has its word, so color is never the only signal.
- **Alerts have three severities**, each with an icon and words (see Alert):
  - Warning (`warn-bg`, `warn-line`, `warn-ink`) means *check this*: hours unconfirmed, needs a booking, only chance this trip.
  - Critical (`crit`, `on-crit`) means *this plan is broken*: closed that day, overlaps the airport.
  - Info (`info-bg`, `info-line`, `info-ink`) means a time-based reminder: check-in closes 4 pm.
- **Categories** get one hue each: `cat-art`, `cat-food`, `cat-bar`, `cat-shop`, `cat-tour`, plus `cat-nature`, `cat-history`, `cat-festival` for family trips. Use them for map pins, the dot in a category tag, and budget bars. Never for text or backgrounds. Some pairs are close in hue (bar/art, festival/crit), so a category color always appears with its icon or name.
- **Focus.** Every focusable element gets a 2px solid `focus-ring` outline with a 2px offset. Never remove it.

## Type

IBM Plex Sans for everything people read, IBM Plex Mono for labels and codes. Both are on Google Fonts (`family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700`).

- `display` (36px) appears only once: the date on Today. Page h1s are `title` (28px).
- Card headings `heading`, card titles in grids `subheading`, place names in rows `ui-strong`, detail lines `ui`, helper text `caption`.
- Running text (NYT notes, descriptions) is `body`, max `measure` wide.
- `label` (mono, uppercase, 0.06em) is for eyebrows and slot names: MORNING, NEXT BOOKING, SATURDAY · DAY 2 OF 4. `label-sm` only inside 40px compact cards. Never set a sentence in mono.
- `data` (mono) for ticket numbers, booking refs and phone numbers, so digits are easy to read out at a counter.
- `figure` for big numbers. Turn on `font-variant-numeric: tabular-nums` anywhere digits line up: prices, times, budget columns.

## Layout and spacing

- Spacing steps are `space-1` (4) through `space-12` (48). Snap the wireframes' 6, 10 and 14px gaps to the nearest step.
- Desktop: header bar on `surface`, content max `page-max` (Days and Map: `board-max`), `space-6` gutters. Main column plus a 280–320px side column (Today's "At a glance", the Days "Unscheduled" rail, the Map legend).
- Below `bp-tablet` the side column stacks above (Days, Map) or below (Today) the main column.
- Below `bp-phone`: `space-4` side gutters, one column, and a bottom tab bar with Today, Days, Places, Map and More (Bookings, Logistics, Budget). Days shows one day at a time with day tabs (Fri · Sat · Sun · Mon), and adding a place happens in a bottom sheet instead of drag and drop.
- Every control is at least `target` (44px) tall on every screen.

## Shape

- `radius-md` for buttons, inputs, alerts and thumbnails. `radius-card` for cards, day columns and slots. `radius-lg` for the map frame and the photo carousel. `radius-pill` for filter chips, status pills and carousel dots.
- Borders are 1px `line` on cards and `control-border` on controls. Dashed borders mean "you can drop or add something here": 1.5px dashed `control-border` for an empty slot, 2px dashed `drop-line` while dragging.

## States and interaction

- **Place status** moves Suggested → Want → Planned → Done, with Skipped on the side (see Writing for the words). A card becomes Planned when it lands in a day slot and goes back to Want when it's dragged out.
- **Drag and drop has a tap alternative everywhere.** Every card has "Add to day", which opens Day + Slot selects (a bottom sheet on phone). Never make dragging the only way to do something.
- **Drop warnings** show under the slot as an Alert. A conflict outlines the card in 2px `crit` and asks "Closed Mondays. Keep it here?" with Keep / Move buttons, built into the page (no browser dialogs).
- **Locked time** (airport on departure day) is a `surface-sunken` block with diagonal stripes in `line`, a lock icon and the reason. It can't accept drops.
- **Empty states** name what's missing and offer the next step: "Nothing planned for dinner. Pick from Unscheduled."

## Imagery

- Each place has 3–6 photos. The first is the thumbnail everywhere (40px compact cards, 56px Today rows, 140px Places cards).
- Before a photo exists, show a `placeholder` frame. Never use a stock image of the city as filler.
- Crop photos to the frame (`object-fit: cover`); no filters or overlays. Carousel dots: active `ink`, others `steel`.

## Iconography

- Line icons on a 24px grid with a 2px stroke, drawn in `currentColor`, shown at `icon` (16px) inline or `icon-lg` (20px) in buttons. The wireframe glyphs match Lucide (lucide.dev), so use that set.
- Category icons: Art `image`, Restaurants `utensils`, Bars `wine`, Shopping `shopping-bag`, Tours `flag`, Nature `trees`, History `castle`, Festivals `music`.
- System icons: warning `triangle-alert`, critical `octagon-x`, info `clock`, confirmed `check`, locked `lock`, house `house`, drag handle `grip-vertical`.
- No emoji in the interface.

## Maps

- Base map styled with `map-land` and `map-water`, with roads in `line`. Pins are 14px discs in the category color with a 2px `surface` ring. The house pin is a 34px `ink` disc with a white house icon.
- Clusters (West, Center, East) are labeled areas with a travel time from the house: "West · 15–20 min by train".
- The legend doubles as the layer filter and always shows names and counts beside the colors.
