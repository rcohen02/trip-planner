import { describe, expect, it } from "vitest";
import type { DayRule, Place, Todo } from "../content/types";
import { buildSlots, warningsFor } from "./plan";
import { bookingInstant, bookingWarnings, cleanBooking, nextBooking, todoDone, type Booking } from "./booking";

const days: DayRule[] = [
  { date: "2026-10-10", label: "Sat", slots: ["morning", "lunch", "afternoon", "dinner"] },
  { date: "2026-10-11", label: "Sun", slots: ["lunch", "dinner"] },
];
const slots = buildSlots(days);
const slot = (id: string) => slots.find((s) => s.id === id)!;
const canalha: Booking = { placeId: "canalha", date: "2026-10-10", time: "19:00", confirmation: "RC4", note: null };

describe("cleanBooking", () => {
  it("keeps a valid 24-hour time and trims the optional fields", () => {
    expect(cleanBooking({ placeId: "canalha", date: "2026-10-10", time: "19:00", confirmation: "  RC4 ", note: "   " })).toEqual(canalha);
  });

  it("rejects a missing or impossible time and a bad date", () => {
    expect(cleanBooking({ ...canalha, time: "" })).toBeNull();
    expect(cleanBooking({ ...canalha, time: "25:00" })).toBeNull();
    expect(cleanBooking({ ...canalha, date: "Oct 10" })).toBeNull();
  });

  it("caps long text", () => {
    expect(cleanBooking({ ...canalha, note: "x".repeat(400) })!.note).toHaveLength(280);
    expect(cleanBooking({ ...canalha, confirmation: "x".repeat(100) })!.confirmation).toHaveLength(60);
  });
});

describe("bookingInstant", () => {
  it("reads the time as Lisbon wall-clock time", () => {
    expect(bookingInstant(canalha, "Europe/Lisbon")).toBe("2026-10-10T18:00:00.000Z"); // Lisbon is UTC+1 in October
    expect(bookingInstant({ ...canalha, date: "2026-10-30", time: "09:30" }, "Europe/Lisbon")).toBe("2026-10-30T09:30:00.000Z"); // after the clocks change
  });
});

describe("bookingWarnings", () => {
  it("says nothing when the booking fits the slot it sits in", () => {
    expect(bookingWarnings(canalha, slot("2026-10-10:dinner"))).toEqual([]);
  });

  it("flags a booked card that moved to another day", () => {
    expect(bookingWarnings(canalha, slot("2026-10-11:dinner"))).toEqual([{ level: "crit", text: "Booked for Sat Oct 10 at 7 pm" }]);
  });

  it("flags a time that doesn't fit the slot, using the slot's own name", () => {
    expect(bookingWarnings(canalha, slot("2026-10-10:lunch"))).toEqual([{ level: "warn", text: "7 pm is outside Lunch" }]);
    expect(bookingWarnings({ ...canalha, time: "12:30" }, slot("2026-10-10:lunch"))).toEqual([]);
  });
});

describe("booking side effects", () => {
  const place: Place = {
    id: "canalha", name: "Canalha", category: "food", location: "", details: "", price: null, hours: null, url: null, mapsUrl: null,
    phone: null, note: "", noteYear: null, hoursConfirmed: true, openDays: null, needsBooking: true,
  };

  it("drops the 'Needs a booking' warning once it's booked", () => {
    expect(warningsFor(place, "2026-10-10").map((w) => w.text)).toContain("Needs a booking");
    expect(warningsFor(place, "2026-10-10", canalha).map((w) => w.text)).not.toContain("Needs a booking");
  });

  it("ticks the matching 'Book' to-do when there's a booking", () => {
    const todos: Todo[] = [
      { id: "book-canalha", kind: "book", text: "Book Canalha", placeId: "canalha" },
      { id: "confirm-canalha", kind: "confirm", text: "Confirm hours", placeId: "canalha" },
      { id: "book-other", kind: "book", text: "Book other", placeId: "other" },
    ];
    expect(todoDone(todos, { "book-other": true }, { canalha })).toEqual({ "book-other": true, "book-canalha": true });
  });

  it("finds the next upcoming booking", () => {
    const later = { ...canalha, placeId: "maat", date: "2026-10-11", time: "13:00" };
    const all = { canalha, maat: later };
    expect(nextBooking(all, "Europe/Lisbon", new Date("2026-10-10T12:00:00Z"))?.placeId).toBe("canalha");
    expect(nextBooking(all, "Europe/Lisbon", new Date("2026-10-10T20:00:00Z"))?.placeId).toBe("maat");
    expect(nextBooking(all, "Europe/Lisbon", new Date("2026-10-12T00:00:00Z"))).toBeNull();
  });
});
