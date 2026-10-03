# DaySlot

A day column holds the day's slots: Early arrival (arrival day only), Morning, Lunch, Afternoon, Dinner, Night.

- Column on `surface-sunken`, `radius-card`, `space-3` padding. Header: short date in 17px bold, the day's theme or constraint in `caption`.
- Slot label in `label`. A slot is empty (1.5px dashed `control-border`, "Drop here or tap to add"), filled (a PlaceRow), or the drop target while dragging (2px dashed `drop-line` on `drop-bg`, "Release to add Pica-Pau").
- Warnings sit under the card as a small Alert; conflicts outline the card in `crit`.
- Locked time (`tp-locked`): striped block with a lock icon and the reason. Takes no drops.
- Optional slots say so in the label: NIGHT · OPTIONAL.
- Phone: one column at a time under day tabs; tapping an empty slot opens the Add sheet.
