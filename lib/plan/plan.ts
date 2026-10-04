import type { Category, DayRule, Place, SlotKind } from "../content/types";
import { weekdayOf, ymdIn } from "../format";

export interface Slot {
  id: string;
  date: string;
  dayLabel: string;
  /** For an added slot, the kind of the base slot it follows. */
  kind: SlotKind;
  label: string;
  /** True for slots people added on the Days board (they can be removed). */
  extra: boolean;
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

export function buildSlots(days: DayRule[], extras: ExtraSlot[] = []): Slot[] {
  return days.flatMap((d) => {
    const base: Slot[] = d.slots.map((kind) => ({
      id: slotId(d.date, kind),
      date: d.date,
      dayLabel: d.label,
      kind,
      label: SLOT_LABEL[kind],
      extra: false,
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
        place({ ...s, id: x.id, label: x.label, extra: true, optional: false, locked: null });
      }
    };
    base.forEach(place);
    const last = base[base.length - 1];
    for (const x of mine)
      if (!used.has(x.id) && last) out.push({ ...last, id: x.id, label: x.label, extra: true, optional: false, locked: null });
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
export function warningsFor(place: Place, date: string): PlanWarning[] {
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
  if (place.needsBooking) out.push({ level: "warn", text: "Needs a booking" });
  return out;
}

export function placedIds(a: Assignments): Set<string> {
  return new Set(Object.values(a).filter((v): v is string => Boolean(v)));
}

export function unscheduled(places: Place[], a: Assignments): Place[] {
  const placed = placedIds(a);
  return places.filter((p) => !placed.has(p.id));
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
