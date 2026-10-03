# Changes to the wireframes

The eight Lisbon wireframes already follow most of the design rules: one font family, 44px targets everywhere, consistent cards, amber warnings, a shared header. To bring them in line with this system:

## Color

- Replace the grayscale with the role tokens. Primary buttons and the active nav tab move from near-black (#1E1E1C) to `accent` (plum). Links move from blue (#1F5FBF) to `accent`.
- The Planned pill and the drop target were blue (#DCE7F7, #EAF1FB). They become mint: `planned-bg` and `drop-bg` with `drop-line`.
- Art pins were the same blue as links and the Planned pill, so blue meant three things. Art keeps blue (`cat-art`) now that nothing else uses it.
- Tour pins were light gray (#B8B8B2, 1.7:1 on the map) and read as disabled. They become `cat-tour` teal.
- Input and select borders (#C4C4BE, 1.75:1) are too faint to see as controls. Use `control-border` (3.6:1).
- Two ambers were in use for warning text (#5C3400 and #6B3D00). Use `warn-ink` only.
- Five text grays (#3A3A36, #4A4A45, #5E5E58, #6A6A64, #8A8A84) collapse to `ink-2` and `ink-3`.
- Add the dark theme. It matters on the trip: the plan gets checked in bars and at night.

## Type and shape

- Mono labels were both 11px and 12px. Use `label` (12px) everywhere except inside 40px compact cards (`label-sm`).
- Page titles were 28, 34 and 36px. Use `title` (28px) for every page and `display` (36px) only for Today's date.
- Airport codes at 30px become `figure` (28px).
- Radii were 4, 5, 6, 8, 10, 12 and 22px. Use `radius-md`, `radius-card`, `radius-lg` and `radius-pill`.

## Content

- "~€40 / $46 pp" becomes "~€40 / $46 per person".
- Logistics shows "≈ €113 / $131": the tilde form is "~€113 / $131".
- Placeholders like "[price]" and "—" become "Price unknown".
- Venue hours "10:00–18:00" become "10 am–6 pm".
- Status words were Want / Planned / Done in the UI but idea / shortlist / scheduled / skipped in the data model. Use the status table in `WRITING.md` and add `done` to the `Place.status` enum.

## Behavior

- The Days board is desktop-only as drawn (min-width 920px). On phones show one day at a time with day tabs and use the "Add to day" sheet.
- "Closed Mondays — drop anyway?" needs real Keep / Move buttons on the page, not a browser confirm.
- The Days board's Unscheduled cards don't show hours confidence. Add the "Hours unconfirmed" line there, as Today and Places already do.
- The seven-tab header wraps on phones. Use the bottom tab bar (Today, Days, Places, Map, More).
