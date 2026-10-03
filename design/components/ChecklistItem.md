# ChecklistItem

A checklist item is one to-do on Bookings & To-Do, grouped under Book now, Confirm hours, Check and Flights.

- The whole label is the tap target: 20px checkbox in `accent`, title in 15px semibold, one detail line in `ink-2`.
- Done items strike through in `ink-3` and stay in place until the page reloads.
- One secondary button on the right for the action ("Call", "Site", "Maps"). Show phone numbers as text in `data` too, because tel: links don't work everywhere.
- Progress at the top of the page: "2 of 8 done" with a bar in `accent`.
