# Alert

Alerts flag something about the plan. Three severities, each with its own icon:

- **Warning** (`warn-*`, triangle): check this. Hours unconfirmed, needs a booking, only chance this trip.
- **Critical** (`crit` fill, `on-crit` text, octagon): the plan is broken. Closed that day, overlaps the airport, booking time passed. Offer the fix as a link or button.
- **Info** (`info-*`, clock): time-based reminders. Check-in deadlines, things to ask at the counter.

Write the fact first, then what to do. Use `tp-alert--sm` inside day columns. Don't stack more than three on one card; send the rest to Bookings & To-Do.
