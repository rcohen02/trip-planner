# NavBar

The trip header names the trip and switches sections.

- **Desktop / tablet** (`tp-header` + `tp-nav`): trip name in 18px bold, dates and travelers in mono `ink-3`, then the seven section tabs. The current tab has `aria-current="page"` and an `accent` fill.
- **Phone, below `bp-phone`** (`tp-tabbar`): fixed to the bottom with five tabs: Today, Days, Places, Map, More. More opens Bookings & To-Do, Logistics and Budget. Pad the bottom by the safe-area inset.

Provide: the trip name, date range, travelers and the current section. Section names are fixed (see Writing).
