import type { Category, DayRule, Place, SlotKind } from "../content/types";
import { weekdayOf, ymdIn } from "../format";
import type { Booking } from "./booking";

export interface Slot {
  id: string;
  date: string;
  dayLabel: string;
  /** For an added slot, the kind of the base slot it follows. */
  kind: SlotKind;
  label: string;
  /** True for slots people added on the Itinerary board (they can be removed). */
  extra: boolean;
  /** True when a base slot shows a name someone typed instead of its default. */
  renamed: boolean;
  optional: boolean;
  locked: string | null;
}

/** slotId → placeId (null/absent = empty). */
export type Assignments = Record<string, string | null>;

export const SLOT_LABEL: Record<SlotKind, string> = {
  early: "Early arrival",
  morning: "Morning",
  lunch: "Lunch",
  afternoon: "Afternoon",
  dinner: "Dinner",
  night: "Night",
};

export function slotId(date: string, kind: SlotKind): string {
  return `${date}:${kind}`;
}

/** A slot someone added on the Days board, e.g. a second afternoon. Stored, not in trip.json. */
export interface ExtraSlot {
  id: string; // `${date}:x-…`
  date: string;
  /** Id of the slot this one follows (base or added). */
  after: string;
  label: string;
}

/** What people changed about the slots: added ones, and new names for base ones (slotId → name). */
export interface SlotLayout {
  extras?: ExtraSlot[];
  labels?: Record<string, string>;
}

export function buildSlots(days: DayRule[], layout: SlotLayout = {}): Slot[] {
  const extras = layout.extras ?? [];
  const labels = layout.labels ?? {};
  return days.flatMap((d) => {
    const base: Slot[] = d.slots.map((kind) => ({
      id: slotId(d.date, kind),
      date: d.date,
      dayLabel: d.label,
      kind,
      label: labels[slotId(d.date, kind)] ?? SLOT_LABEL[kind],
      extra: false,
      renamed: slotId(d.date, kind) in labels,
      optional: d.optional?.includes(kind) ?? false,
      locked: d.locked?.find((l) => l.kind === kind)?.reason ?? null,
    }));
    const mine = extras.filter((x) => x.date === d.date);
    const used = new Set<string>();
    const out: Slot[] = [];
    const place = (s: Slot) => {
      out.push(s);
      for (const x of mine) {
        if (x.after !== s.id || used.has(x.id)) continue;
        used.add(x.id);
        place({ ...s, id: x.id, label: x.label, extra: true, renamed: false, optional: false, locked: null });
      }
    };
    base.forEach(place);
    const last = base[base.length - 1];
    for (const x of mine)
      if (!used.has(x.id) && last) out.push({ ...last, id: x.id, label: x.label, extra: true, renamed: false, optional: false, locked: null });
    return out;
  });
}

/** "Afternoon 2", or the next free number, for a slot added after `afterId`. */
export function suggestSlotLabel(slots: Slot[], afterId: string): string {
  const anchor = slots.find((s) => s.id === afterId);
  const name = anchor ? SLOT_LABEL[anchor.kind] : "Activity";
  const taken = new Set(slots.filter((s) => s.date === anchor?.date).map((s) => s.label));
  let n = 2;
  while (taken.has(`${name} ${n}`)) n++;
  return `${name} ${n}`;
}

/** Trim and collapse spaces; at most 40 characters. Null when nothing is left. */
export function cleanSlotLabel(raw: string): string | null {
  const s = raw.replace(/\s+/g, " ").trim().slice(0, 40).trim();
  return s || null;
}

/** Map legend: all categories, or only the one chosen. */
export function visibleCategories(all: Category[], only: Category | null): Category[] {
  return only ? all.filter((c) => c === only) : all;
}

const DAY_NAMES = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface PlanWarning {
  /** crit = the plan is broken (closed that day); warn = check this. */
  level: "crit" | "warn";
  text: string;
}

/** Warnings to show when a place is dropped on a given date. They inform; they never block. */
export function warningsFor(place: Place, date: string, booking?: Booking | null): PlanWarning[] {
  const out: PlanWarning[] = [];
  const wd = weekdayOf(date);
  if (place.openDays && !place.openDays.includes(wd as never)) {
    if (place.openDays.length >= 5) {
      const closed = [0, 1, 2, 3, 4, 5, 6].filter((d) => !place.openDays!.includes(d as never));
      out.push({ level: "crit", text: `Closed ${closed.map((d) => DAY_NAMES[d]).join(" & ")}` });
    } else {
      out.push({ level: "crit", text: `${place.openDays.map((d) => SHORT[d]).join(" & ")} only` });
    }
  }
  if (place.category === "art" && /galer/i.test(place.name) && (wd === 0 || wd === 1)) {
    out.push({ level: "warn", text: "Galleries often closed Sun–Mon" });
  }
  if (!place.hoursConfirmed) out.push({ level: "warn", text: "Hours unconfirmed" });
  if (place.needsBooking && !booking) out.push({ level: "warn", text: "Needs a booking" });
  return out;
}

export function placedIds(a: Assignments): Set<string> {
  return new Set(Object.values(a).filter((v): v is string => Boolean(v)));
}

export function unscheduled(places: Place[], a: Assignments): Place[] {
  const placed = placedIds(a);
  return places.filter((p) => !placed.has(p.id));
}

/**
 * Put a place in a slot. If the place was already in another slot and the target is taken,
 * the two swap. If it came from Unscheduled, whatever was in the target goes back to Unscheduled.
 */
export function movePlace(a: Assignments, placeId: string, to: string): Assignments {
  const from = Object.entries(a).find(([, v]) => v === placeId)?.[0];
  const occupant = a[to];
  const next: Assignments = {};
  for (const [k, v] of Object.entries(a)) if (v && v !== placeId && k !== to) next[k] = v;
  next[to] = placeId;
  if (from && from !== to && occupant && occupant !== placeId) next[from] = occupant;
  return next;
}

/** The nearest open (not locked) slot above (-1) or below (+1) on the same day, or null. */
export function neighborSlot(slots: Slot[], id: string, dir: -1 | 1): Slot | null {
  const i = slots.findIndex((s) => s.id === id);
  if (i < 0) return null;
  for (let j = i + dir; j >= 0 && j < slots.length; j += dir) {
    if (slots[j].date !== slots[i].date) return null;
    if (!slots[j].locked) return slots[j];
  }
  return null;
}

/** Day View: the requested trip day if there is one, else the same choice as todayFor. */
export function pickDay(
  days: DayRule[],
  timeZone: string,
  requested: string | undefined,
  now: Date = new Date(),
): { date: string; status: "today" | "upcoming" | "past" } {
  if (!requested || !days.some((d) => d.date === requested)) return todayFor(days, timeZone, now);
  const today = ymdIn(now, timeZone);
  return { date: requested, status: requested === today ? "today" : requested > today ? "upcoming" : "past" };
}

/** Which trip day "Today" should show: the current day, else the next one, else the last. */
export function todayFor(
  days: DayRule[],
  timeZone: string,
  now: Date = new Date(),
): { date: string; status: "today" | "upcoming" | "past" } {
  const today = ymdIn(now, timeZone);
  const hit = days.find((d) => d.date === today);
  if (hit) return { date: hit.date, status: "today" };
  const next = days.find((d) => d.date > today);
  if (next) return { date: next.date, status: "upcoming" };
  return { date: days[days.length - 1].date, status: "past" };
}
