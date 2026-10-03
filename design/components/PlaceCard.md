# PlaceCard

The place card is the browsing unit on the Places page: photo carousel on top, facts below.

- Photo 140px tall with carousel dots (active `ink`, others `steel`). The card links to the place detail.
- Below: name, neighborhood · cluster in `label-sm`, price, the hours line (`ok-ink` with ✓ when confirmed, `warn-ink` "Hours unconfirmed" otherwise), then status pill and action at the bottom edge.
- Action reads "Add to day" for Want and "Move" for Planned.
- Grid: `repeat(auto-fill, minmax(220px, 1fr))`, `space-4` gaps. Cards in a row share the same bottom edge.
