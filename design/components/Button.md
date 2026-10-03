# Button

Buttons start an action; links go somewhere. Use one primary button per card.

- **Primary** (`tp-btn--primary`): `accent` fill, `on-accent` text. The one main action: "Open in Maps", "Move", "Log it", "Add".
- **Secondary** (`tp-btn--secondary`): `surface` with a `control-border` border. Alternatives next to a primary: "All bookings", "Call", "Site".
- **Text** (`tp-btn--text`): `accent` text, no frame. Low-weight actions inside lists: "Show 6 more", "Edit in Days".
- **Danger** (`tp-btn--danger`): `crit` fill. Only for removing something from the plan after a conflict prompt.

Provide: a verb-first label (see Writing). Every button is at least `target` (44px) tall; icons are `icon-lg`. Don't use a button to navigate between sections; use a link.
