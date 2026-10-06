# T2T PRD — Profiles, new trips and voice planning

*Oct 5, 2026 · Rob Cohen · Repo copy. The live, commented version is the Claude doc "T2T PRD — Profiles, new trips and voice planning"; screen designs are on the "T2T — Profiles, new trips and voice" canvas.*

## Summary

T2T moves from a site Claude fills by hand to an app that plans trips through a short voice conversation. It works in two stages: a **travel profile** each person sets once and keeps, then a **trip** that only asks what's new.

- **Profile:** who travels, limits, interests, food, pace, trusted sources. Rob's `travel_context.md` is imported as his starting profile.
- **Trip:** where, when, who, where you're staying, and anything different this time. Then research fills Places with Suggested cards and, if you choose, drafts the days.
- **Learning:** after each trip, the app proposes profile changes from what people actually did. Nothing changes without a yes.
- **Voice-first:** every step works by speaking, with typing as a fallback.

The biggest build item is moving trips from files in the repo into the database, so they can be created on the site.

## Goals and non-goals

**Goals**

1. Anyone invited can set up a profile and start a trip without Claude editing files.
2. A new trip takes about four spoken answers when a profile exists.
3. Research respects every traveler's rules (hiking cap, drive radius, never hotels) and lands as Suggested cards.
4. "Add new places" works mid-trip, by voice, from a phone.
5. Profiles get better after each trip, with every change approved.

**Non-goals for this release**

- Booking or payments.
- Open sign-up. The app stays invite-only.
- A custom voice model. Qwen voice is a later upgrade.
- Offline mode.
- Rebuilding the existing Days, Map or Bookings screens. They read from the database instead of files, and Days can show a draft itinerary. Otherwise they stay as they are.

## Users and access

Every person who signs in is a **user** with their own profile. Sign-in stays Google-only and invite-only.

| Role | Who | Can do |
| --- | --- | --- |
| App admin | Rob | Invite new users to the app; everything a trip owner can do |
| Trip owner | Whoever starts the trip | Edit the trip, invite or remove trip members, delete the trip |
| Trip member | Invited by the owner | Edit the plan, add places, accept or skip suggestions |
| Viewer | Anyone with a share link | Read only, no sign-in (today's share links) |

- **Kids are travelers, not users.** They live inside a parent's profile with a name, birth year and interests. Ages are worked out from the trip dates.
- **Profiles are private.** Only the trip owner sees the blended rules a trip uses. No one sees another person's full profile.
- Rob is the first user. Travel companions join a trip as members and never need a profile; if one has a profile, it joins the blend. Questions never ask about a companion by name.

## Stage 1: Travel profile

The profile holds everything that stays true from trip to trip. It's set up once by voice and edited anytime on the Profile page.

| Section | What it holds | Example (from travel_context.md) |
| --- | --- | --- |
| Travelers | Kids with name, birth year, interests | Boy born 2016, girl born 2019 |
| Groups | Named presets of who comes, each with its own rules | "Whole family", "Just us two" |
| Limits | Daily hiking cap, drive radius, lodging rule | Under 5 miles a day; 90-minute drive; always a house, never hotels |
| Interests | Ranked categories, each with a few words of detail | 1 Land art · 2 Ruins and gem mining · 3 Flat-water kayaking, easy bikes · 4 Festivals |
| Food | Restrictions, favorites, the local-first rule | None; seafood; neighborhood spots over tourist restaurants |
| Pace | Default pace, and whether to show both | Show Relaxed and Packed, labeled |
| Avoid | Things never to suggest | Headline attractions when a local alternative exists |
| Sources | Writers and outlets to start research from | NYT "36 Hours" |

**Setup flow (first time)**

1. "Who usually travels with you?" Fills Travelers and the first group.
2. "Any limits I should always respect?" Hiking, driving, lodging.
3. "What makes a trip great for you?" Open answer, mapped to ranked interests.
4. "How do you like to eat?"
5. "Anything I should never suggest?"
6. Read-back of the whole profile, then save.

It skips any question an earlier answer already covered.

**Import.** Rob's `travel_context.md` is parsed into his profile once, and he confirms it in a read-back. Rules that only apply to family trips (the hiking cap, kid-friendly priorities) are attached to the "Whole family" group, not to Rob alone.

**Editing.** Each section is editable on the Profile page by voice ("Add my parents as a group") or by tapping. Every change is kept in a history so it can be undone.

## Stage 2: New trip

"Start a new itinerary" on the home page opens the trip flow. With no profile yet, it runs Stage 1 first and continues straight into this.

1. **Where to?** City or region. Sets the time zone and local currency.
2. **When?** Dates, or "drop in your flight confirmation" to fill dates and flights.
3. **Who's coming?** Pick a group or name people. Invited users' profiles join the blend.
4. **Where are you staying?** An address. Sets the house pin and the drive radius.
5. **Anything different this time?** One-trip overrides: "we'll have a car," "focus on food." They stay on this trip unless you say "save that to my profile."
6. **Draft the days, or build them yourself?** "Want me to draft day-by-day itineraries you can edit, or just fill Places and you'll build the days?" A default can be saved in the profile, and it still shows in the read-back.
7. **Read-back.** "Lisbon, Oct 9–12, just you two, house in Paço de Arcos, drafts on. Right?" A yes starts research.

**After the read-back**

- The trip is created right away, so you land on its Today page while research runs.
- Research runs in the background and fills Places with **Suggested** cards, with a progress line ("12 found, still looking").
- Each card shows why it was picked ("Ruins, climbable · 40 min drive") and its source.
- Review by voice or tap: "keep" moves a card to the Shortlist, "skip" marks it Skipped.
- Research never suggests lodging, and drops anything outside the radius or over the hiking cap.

**Draft or build yourself**

- **Draft:** once research finishes, the Days board fills with a draft itinerary built from the kept and suggested places. It respects opening hours, closed days, drive times, bookings and the hiking cap. Family trips get a Relaxed and a Packed draft to pick from.
- Drafted cards are marked **Draft** until you accept the day. Drag, swap or remove them as usual, or say "redo Sunday" or "lighter Saturday."
- **Build yourself:** Days stays empty and suggestions wait in Places, as today.
- You can switch later: "Draft the rest" fills only the empty slots and never moves anything you placed.

## Add new places

A highlighted "Add new places" button at the top of Places runs a short version of the flow. The trip and profiles are already known, so it asks one or two questions.

1. **What are you looking for?** "Seafood near the house," "something for Sunday afternoon," "a rainy-day option."
2. **Where or when?** Optional. A day narrows results to places open then; a neighborhood narrows the area.
3. Results arrive as Suggested cards at the top of Places, with the same keep / skip review.

- **Gap-aware:** saying "fill Sunday dinner" checks the Days board and offers to place the kept card straight into that slot through the shared "Add to day" popup.
- **Named places:** "Add Canalha" skips research and adds that one place, enriched with hours, price and photos.
- **Duplicates:** places already on the trip are never suggested again; skipped ones only return if asked.

## Dynamic conversation engine

Every flow (profile setup, new trip, add places) is a **checklist of facts** rather than a fixed script. One engine runs all three.

- **Fact list per flow.** Each fact has a name, whether it's required, and the question to ask if it's missing. Example for a new trip: destination, dates, travelers, homebase (required); overrides (optional).
- **Ask only what's missing.** After each answer, Claude pulls out every fact it can and asks for the next missing required one.
- **Many facts from one answer.** "Lisbon with the kids, Oct 9 to 12" fills destination, travelers and dates, so the next question is the house.
- **Documents count as answers.** A flight confirmation fills dates and flights; a house booking fills the homebase.
- **Confirm, don't re-ask.** Facts it guessed ("I'm assuming the whole family") are shown in the read-back instead of asked.
- **Corrections anytime.** "Actually it's the 10th" changes that fact and keeps going.

**How it's built.** The fact lists and the merge logic live in `lib/` and are unit tested. Claude (Anthropic API, already in the stack) only turns speech into facts and writes the next question. Every fact Claude returns is checked against the list before it's saved, so a bad reply can't write junk.

## Blending profiles on shared trips

When several users are on one trip, research uses one blended rule set, shown only to the trip owner on Logistics.

| Part | Rule | Example |
| --- | --- | --- |
| Limits | The strictest wins | Caps of 5 mi and 8 mi → 5 mi |
| Hard rules | Anyone's rule applies to all | One person's "no shellfish" filters every suggestion |
| Interests | Combined, ranked by overlap | Art in both profiles ranks above bars in one |
| Pace | Trip setting; defaults to the owner's | Owner prefers Relaxed |
| Overrides | Trip-level, beat everything | "Focus on food" this trip |

- Kids in the trip add their own interests and the family group's limits.
- The blend is computed fresh from the profiles, so editing a profile updates future research on the trip.
- Each Suggested card can say whose interest it serves ("for the kids: climbable ruins").

## Learning from trips

Profiles improve from what people actually do, and only change when the profile's owner says yes.

**Signals the app records**

| Signal | Read as |
| --- | --- |
| Suggested, then skipped | Weak interest in that category or style |
| Suggested, then kept or shortlisted | Interest confirmed |
| Marked Done | Strong interest |
| Added by you (not suggested) | A gap research missed |
| Planned, then left undone | Possible over-planning or the wrong pace |

**Proposals.** After the trip's last day, each traveler gets a short review: up to five proposed changes, each with its evidence.

- "You skipped all 6 bars in Lisbon. Rank nightlife lower?"
- "You added 3 seafood spots yourself. Keep seafood as a top favorite?"

Answers: **yes**, **no**, or **only for this group** ("just for family trips"). A "no" stops that proposal from coming back for the same evidence.

- Signals are weighted: a skip or a keep counts 1 point; marking Done or adding a place yourself counts 2. A proposal needs 3 points from at least 2 different places, and lowering an interest needs 4, so one skip never changes a profile.
- Each accepted change is logged in the profile history with the trip it came from, and can be undone.
- Signals belong to the person who acted. A companion's skips never change your profile.

## Voice

v1 uses the browser's built-in speech: free, no server, works in Chrome and Safari on phone and laptop. A better voice comes later behind the same interface.

| Piece | v1 | Later |
| --- | --- | --- |
| Listening (speech to text) | Browser speech recognition | A hosted speech-to-text model if browser accuracy is poor |
| Speaking (text to speech) | Browser speech synthesis | [Qwen3-TTS 1.7B VoiceDesign](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign) on a paid GPU host |
| Understanding | Claude via the Anthropic API | Same |

**Behavior**

- While a flow is open, each question is spoken aloud and shown on screen.
- Tap the mic to answer. It stops listening after a pause, shows what it heard, then moves on.
- Say "type it" (or tap the keyboard icon) to switch to typing for that answer.
- Say "stop" or "mute" to silence it; the flow keeps going on screen.
- Places and accented names are shown as heard so a mistake ("Paso de Arcos") can be corrected before it's saved.

**Why Qwen waits.** It only speaks; it doesn't listen. It needs a GPU server, which the free Vercel plan doesn't have, so it's a monthly cost. The license (Apache 2.0) allows it, and it speaks Portuguese, so it's a good fit once voice proves useful.

## Data model and migration

Today a trip is `content/trips/<slug>/trip.json` plus `picks.md`, built by `npm run content`. The database (Neon Postgres via Prisma) only holds plan state: slot assignments, bookings, hours checks, routes, shortlist and share links. Sign-in is an email allowlist in `ALLOWED_EMAILS`.

**New tables**

| Table | Holds |
| --- | --- |
| User | Email, name, app-admin flag; replaces the allowlist |
| Invite | Email, who invited, accepted date |
| Profile | One per user; sections as JSON, version number |
| ProfileTraveler | Kids: name, birth year, interests |
| ProfileGroup | Named presets and their rules |
| ProfileChange | History: what changed, why (manual, import or trip proposal), undo |
| Trip | Everything in today's trip.json: name, destination, dates, time zone, currency, homebase, flights |
| TripMember | User, trip, role (owner or member) |
| Place | Everything in picks.md plus enrichment; status Suggested, Shortlist, Planned, Done, Skipped; source and "why picked" |
| Conversation | One flow run: kind, facts gathered so far, transcript |
| Signal | User, place, action, time; feeds proposals |
| Proposal | User, suggested change, evidence, answer |

Existing plan tables keep their shape (slot assignments gain a draft flag) and point at `Trip.id` instead of the slug.

**Migration steps**

1. Add the tables with Prisma migrations.
2. A one-time script loads Lisbon's `trip.json`, `picks.md` and `enrichment.json` into Trip and Place, keeping place ids so slot assignments and bookings still match.
3. Swap `lib/trips.ts` to read from the database behind the same interface, so pages don't change.
4. Seed today's allowlisted emails as users (Rob as admin), add them to Lisbon as members, then retire `ALLOWED_EMAILS`.
5. Keep `content/trips/` as a fixture for tests only.

Nothing personal goes in the repo: the repo is public, so profiles, confirmations and transcripts live only in the database.

## Screens and entry points

The two buttons ("Start a new itinerary" on Home, "Add new places" in Places) are the only new entry points; everything else reuses today's pages. Flow: Home → has a profile? (no → Travel profile setup) → New trip flow → Read-back → Research → Suggested cards → Keep or skip → End-of-trip review → back into the profile.

| Screen | Change |
| --- | --- |
| Home ("Your trips") | "Start a new itinerary" primary button above the list; a Profile link beside it |
| Profile (new) | One card per section, each with Edit; history at the bottom |
| Conversation (new) | Full-screen on phone, side panel on desktop: the question, a large mic button, what it heard, facts gathered so far as chips you can tap to fix |
| Places | Highlighted "Add new places" button at the top; Suggested cards first, with keep / skip |
| Logistics | Trip members, invite button; blended rules for the owner only |
| End-of-trip review (new) | Opens after the last day: each proposal with its evidence and yes / no / only for this group |

All new screens follow the existing design guidelines: one primary button per card, 44px targets, the phone bottom tab bar, and prices in local currency and USD.

## Phasing, risks and decisions

Build in five phases, each tested on Rob's Mac before it goes live. Nothing changes the live Lisbon trip during the Oct 8–12 trip.

1. **Foundation.** Users, invites, trips and places in the database; Lisbon migrated; pages unchanged.
2. **Profile.** Profile page, `travel_context.md` import, typed setup flow.
3. **New trip and Add new places.** The conversation engine, read-back, background research into Suggested cards, keep / skip review.
4. **Voice.** Browser listening and speaking on every flow.
5. **Learning.** Signals, end-of-trip review, proposals.

Phases 2–4 ship typed first, then voice is laid on top, so every flow also works without a mic.

**Risks**

| Risk | Mitigation |
| --- | --- |
| Moving trips to the database breaks Lisbon mid-trip | No deploy until after Oct 12; place ids are kept and checked by tests |
| Browser speech mishears place names | Show what it heard before saving; easy "fix that" |
| Research cost grows with more users | Cap research runs per trip; reuse results across trips to the same city |
| Suggestions break a hard rule (a hotel, a 7-mile hike) | Rule filter in tested `lib/` code runs after Claude, not just in the prompt |
| Too many proposals feel naggy | Five per trip at most, weighted signal threshold |

**Decisions (Oct 5)**

- Travel companions don't need a profile, and questions never ask about them by name.
- Research uses free sources only (OpenStreetMap and the open web), keeping decision 3.
- Only the trip owner sees a trip's blended rules.
- Each new trip asks whether to draft the days or fill Places only.
