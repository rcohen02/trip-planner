import type { SlotKind, Todo } from "../content/types";
import { dateLabel, hours12 } from "../format";
import type { PlanWarning, Slot } from "./plan";
import { hoursTodoPlace } from "./hours";

/** A reservation for a planned place: Lisbon wall-clock date + time, plus optional details. */
export interface Booking {
  placeId: string;
  date: string; // YYYY-MM-DD in the trip time zone
  time: string; // HH:MM, 24-hour, trip time zone
  confirmation: string | null;
  note: string | null;
}

const text = (v: string | null | undefined, max: number) => {
  const s = (v ?? "").replace(/\s+/g, " ").trim().slice(0, max).trim();
  return s || null;
};

/** Validate what people typed. Null when the date or time isn't usable. */
export function cleanBooking(raw: {
  placeId: string;
  date: string;
  time: string;
  confirmation?: string | null;
  note?: string | null;
}): Booking | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.time.trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return {
    placeId: raw.placeId,
    date: raw.date,
    time: `${m[1].padStart(2, "0")}:${m[2]}`,
    confirmation: text(raw.confirmation, 60),
    note: text(raw.note, 280),
  };
}

/** "7 pm", "7:30 pm". */
export function bookingTime(b: Booking): string {
  return hours12(b.time);
}

function offsetMs(utcMs: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(utcMs))
      .map((p) => [p.type, Number(p.value)]),
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - utcMs;
}

/** The exact moment of the booking, as a UTC ISO string (stored as wall time, converted for countdowns). */
export function bookingInstant(b: Booking, timeZone: string): string {
  const [y, mo, d] = b.date.split("-").map(Number);
  const [h, mi] = b.time.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let t = wall - offsetMs(wall, timeZone);
  t = wall - offsetMs(t, timeZone); // second pass settles daylight-saving edges
  return new Date(t).toISOString();
}

/** Rough windows (minutes after midnight) used only to warn, never to block. */
const WINDOW: Record<SlotKind, [number, number]> = {
  early: [0, 11 * 60],
  morning: [6 * 60, 12 * 60 + 30],
  lunch: [11 * 60 + 30, 15 * 60 + 30],
  afternoon: [12 * 60 + 30, 19 * 60],
  dinner: [17 * 60 + 30, 24 * 60],
  night: [19 * 60, 27 * 60],
};

/** Warnings for a booked place sitting in a slot: wrong day (crit) or a time outside the slot (warn). */
export function bookingWarnings(b: Booking, slot: Slot): PlanWarning[] {
  if (b.date !== slot.date) return [{ level: "crit", text: `Booked for ${dateLabel(b.date)} at ${bookingTime(b)}` }];
  const [h, m] = b.time.split(":").map(Number);
  const mins = h * 60 + m;
  const [from, to] = WINDOW[slot.kind];
  const inside = (mins >= from && mins <= to) || (to > 24 * 60 && mins + 24 * 60 <= to);
  return inside ? [] : [{ level: "warn", text: `${bookingTime(b)} is outside ${slot.label}` }];
}

/** To-do state with "Book …" items ticked for booked places and "Confirm … hours" items for checked places. */
export function todoDone(
  todos: Todo[],
  done: Record<string, boolean>,
  bookings: Record<string, Booking>,
  hoursChecked: string[] = [],
): Record<string, boolean> {
  const out = { ...done };
  const checked = new Set(hoursChecked);
  for (const t of todos) {
    if (t.kind === "book" && t.placeId && bookings[t.placeId]) out[t.id] = true;
    const hp = hoursTodoPlace(t);
    if (hp && checked.has(hp)) out[t.id] = true;
  }
  return out;
}

/** The soonest booking still ahead of `now`, or null. */
export function nextBooking(bookings: Record<string, Booking>, timeZone: string, now: Date = new Date()): Booking | null {
  let best: { b: Booking; t: number } | null = null;
  for (const b of Object.values(bookings)) {
    const t = new Date(bookingInstant(b, timeZone)).getTime();
    if (t > now.getTime() && (!best || t < best.t)) best = { b, t };
  }
  return best?.b ?? null;
}
