# Writing and formats

The site talks like a well-organized friend who did the research: plain, specific, second person ("you"), no exclamation marks, no emoji. Sentence case everywhere except mono labels.

## Voice

- Lead with the fact, then the reason. "Closed Mondays. Move to Sunday?" not "Heads up! Looks like this might be closed."
- Name places exactly as written locally, accents included: Palácio do Grilo, Belém, Graça, Paço de Arcos. Never strip diacritics.
- Buttons say what happens: "Add to day", "Move", "Log it", "Call". Not "Submit" or "OK".
- Warnings say what to do: "Hours unconfirmed. Check before heading to Beato."
- Keep the NYT's voice in quotes and credit it with a `label`: NYT NOTE · 2026.

## Money

- Local currency first, USD second, separated by " / ": **€16 / $19**.
- Approximate: one tilde in front: **~€40 / $46**. Don't put "≈" on only one side.
- Units in words after the price: **~€40 / $46 per person**, **~€70 / $81 for two**. Not "pp".
- Ranges with an en dash: **€13.50–15 / $16–17**.
- Zero cost: **Free**. Unknown: **Price unknown**. Never "—" or a bracket placeholder.
- A price from an older source says its year: **€3 / $3.50 · 2023 price**.
- USD is computed from the stored local price at today's rate; the Budget page shows the rate used ("at 1.16").

## Time and dates

- 12-hour clock, lowercase, no leading zero: **5:30 pm**, **10 am–6 pm**. Convert venue hours posted as 10:00–18:00.
- Flight times are local to the airport and say so when the zone isn't obvious: **5:30 pm ET**.
- Short dates: **Sat Oct 10**. Long dates (Today heading): **Saturday, October 10**. Trip range: **Oct 9–12**.
- Trip position in mono: **SATURDAY · DAY 2 OF 4**.
- Countdown: "Flight home in 2 days", "Leaving in 6 days".

## Units

- Both systems, local first: **18°C / 64°F**, **1.2 km / 0.7 mi**, **10 kg / 22 lb**.
- Travel time from the house in minutes and mode: **15–20 min by train**.

## Status words

| Word | Meaning | Data model value |
|---|---|---|
| Suggested | Found by research, not yet accepted | `idea` |
| Want | On the list, not in a day | `shortlist` |
| Planned | In a day slot | `scheduled` |
| Done | Visited | `done` (new) |
| Skipped | Decided against | `skipped` |

## Fixed labels

- Sections: Day View, Itinerary, Places, Map, Bookings & To-Do, Logistics, Budget. (Renamed Oct 4, 2026 from Today and Days; URLs are unchanged: `/t/<slug>` and `/t/<slug>/days`.)
- Slots: Early arrival, Morning, Lunch, Afternoon, Dinner, Night.
- Categories: Art & Museums, Restaurants, Bars & Nightlife, Shopping, Tours, Nature, History, Festivals.
- Pace (family trips): Relaxed, Packed.
- Hours: "✓ Daily 10 am–6 pm" when confirmed on the venue's own site; "Hours unconfirmed" otherwise.
- Sources: "NYT · 2026", "Claude research", "Added by you".
