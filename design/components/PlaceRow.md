# PlaceRow

A place row is the compact card used in the Unscheduled sidebar, in day slots and in Today's plan.

- 40px thumbnail (first photo), name in `ui-strong` truncated to one line, category and price in `label-sm`, drag handle on the right when draggable.
- Today uses the larger variant: 56px thumbnail (`thumb-md`), name, a `ui` detail line with neighborhood, price and hours, and a Maps link.
- While dragging (`tp-row--drag`): `surface-raised` with `shadow-drag`.
- Conflict (`tp-row--conflict`): 2px `crit` border plus a critical Alert under it.

Provide: name, category, price string (see Writing), thumbnail URL or none.
