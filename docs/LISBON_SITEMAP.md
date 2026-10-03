# Lisbon Dashboard — Sitemap (Oct 9–12, 2026 · Rob & Danielle)

Built from `claude/lisbon-nyt-picks.md`. Staying at the house in Paço de Arcos (R. da Giribita 1).

```
LISBON DASHBOARD
│
├── 1. Today  (home screen)
│   ├── Date + countdown to flight / days left
│   ├── Today's plan (reads from the Days slots)
│   ├── Weather, sunset time
│   ├── Next booking (time, address, phone, Maps link)
│   └── Alerts: "closed today" flags, check-in reminders
│
├── 2. Days  (planner board)
│   │
│   ├── Sidebar: "Unscheduled"  (left rail, always visible on Days)
│   │   ├── Every place not yet in a day, as compact cards
│   │   │     thumbnail · name · category icon · € / $
│   │   ├── Filters: category, neighborhood cluster, open on [day]
│   │   ├── Search
│   │   └── Drop zone: drag any card out of a day → it returns here
│   │
│   └── Day columns  (Fri · Sat · Sun · Mon)
│       Each day is a stack of slots:
│         Morning · Lunch · Afternoon · Dinner · Night
│       ├── Drag a card from the sidebar into a slot
│       ├── Drag between slots or between days
│       ├── One card per slot by default (option to stack 2)
│       ├── Day-specific slots:
│       │     Fri Oct 9 — Arrival day; adds "Early arrival" slot
│       │                 (5:30 am landing, house may not be ready);
│       │                 Night slot optional
│       │     Sat Oct 10 — Best gallery day + Feira da Ladra (Sat only)
│       │     Sun Oct 11 — Museums (commercial galleries likely closed)
│       │     Mon Oct 12 — Departure; Morning + Lunch only, afternoon
│       │                 locked for airport (check-in closes 4:00 pm)
│       └── Drop warnings:
│             "Closed Mondays" (Casa Pessoa), "Sat & Tue only" (Feira da Ladra),
│             "Galleries often closed Sun–Mon", "Hours unconfirmed",
│             "Needs a booking" (Canalha, Monkey Mash)
│
├── 3. Places  (full NYT list, filterable)
│   ├── Art & Museums (MAAT, MACAM, Tesouro Real/Ajuda, Pessoa, Amália, galleries)
│   ├── Restaurants (Canalha, Santa Joana, Pigmeu, Damas, Arkhe, Tricky's, Pica-Pau)
│   ├── Bars & Nightlife (BacoAlto, Side Bar, Monkey Mash, Palácio do Grilo…)
│   ├── Shopping (Feira da Ladra, Rua de São Bento, Feed)
│   ├── Tours (Queer Lisbon walk, Tram 12E)
│   └── Each card / detail view:
│         ├── Image carousel: 3–6 photos, swipe or arrows, dot indicators
│         ├── First photo reused as thumbnail in sidebar and day slots
│         └── Price € + $, hours (✓ confirmed / unconfirmed), open days,
│             neighborhood, Maps link, NYT note, "add to day",
│             status (want / planned / done)
│
├── 4. Map
│   ├── House pin (R. da Giribita 1)
│   ├── All places, colored by category
│   └── Clusters: West Lisbon (Belém/Junqueira/Ajuda — 15–20 min by train),
│       Center (Bairro Alto/Príncipe Real/São Bento),
│       East (Beato/Marvila/Graça)
│
├── 5. Bookings & To-Do
│   ├── Book now: Canalha (+351 962 152 742), Monkey Mash, Queer Lisbon tour
│   ├── Confirm hours: MAAT, MACAM, Amália
│   ├── Check: funiculars reopened?
│   └── Swap return seats (22B between you)
│
├── 6. Logistics
│   ├── Flights: TP202 out / TP209 back, ref ZYKGWV, seats, ticket nos.
│   ├── Bags: carry-on only (10 kg); checked-bag fees € / $
│   ├── House: address, check-in time, host contact
│   └── Getting around: Cascais train line, trams, taxi/ride apps
│
└── 7. Budget
    ├── Planned spend by day and category (€ + $)
    └── Actuals log
```

## How the pieces connect

- Sidebar and Places share one list: a card flips to "planned" when it lands in a slot and back to "want" when dragged out.
- Today reads straight from that day's slots.

## Open decision

- Carousel photos: venue/press images, placeholders to fill with your own photos, or both.
