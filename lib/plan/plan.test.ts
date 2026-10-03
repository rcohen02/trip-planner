import { describe, expect, it } from "vitest";
import type { DayRule, Place } from "../content/types";
import { buildSlots, slotId, warningsFor, placedIds, unscheduled, todayFor } from "./plan";

const days: DayRule[] = [
  { date: "2026-10-09", label: "Fri", slots: ["early", "morning", "lunch"], optional: ["lunch"] },
  { date: "2026-10-12", label: "Mon", slots: ["morning", "afternoon"], locked: [{ kind: "afternoon", reason: "Airport" }] },
];

const place = (over: Partial<Place>): Place => ({
  id: "x",
  name: "X",
  category: "food",
  location: "",
  details: "",
  price: null,
  hours: null,
  url: null,
  mapsUrl: null,
  phone: null,
  note: "",
  noteYear: null,
  hoursConfirmed: true,
  openDays: null,
  needsBooking: false,
  ...over,
});

describe("buildSlots", () => {
  it("creates one slot per day rule entry with stable ids and lock info", () => {
    const slots = buildSlots(days);
    expect(slots.map((s) => s.id)).toEqual([
      "2026-10-09:early",
      "2026-10-09:morning",
      "2026-10-09:lunch",
      "2026-10-12:morning",
      "2026-10-12:afternoon",
    ]);
    expect(slots[2].optional).toBe(true);
    expect(slots[4].locked).toBe("Airport");
    expect(slotId("2026-10-12", "morning")).toBe("2026-10-12:morning");
  });
});

describe("warningsFor", () => {
  it("warns when a place is closed that weekday", () => {
    const pessoa = place({ name: "Casa Fernando Pessoa", openDays: [0, 2, 3, 4, 5, 6] });
    expect(warningsFor(pessoa, "2026-10-12")).toContainEqual({ level: "crit", text: "Closed Mondays" });
    expect(warningsFor(pessoa, "2026-10-11")).toEqual([]);
  });

  it("describes short open-day lists positively", () => {
    const feira = place({ openDays: [2, 6] });
    expect(warningsFor(feira, "2026-10-11")).toContainEqual({ level: "crit", text: "Tue & Sat only" });
  });

  it("flags unconfirmed hours, bookings and Sun–Mon galleries", () => {
    const texts = (p: Place, d: string) => warningsFor(p, d).map((w) => `${w.level}:${w.text}`);
    expect(texts(place({ hoursConfirmed: false }), "2026-10-10")).toContain("warn:Hours unconfirmed");
    expect(texts(place({ needsBooking: true }), "2026-10-10")).toContain("warn:Needs a booking");
    const gallery = place({ name: "Galeria Francisco Fino", category: "art" });
    expect(texts(gallery, "2026-10-11")).toContain("warn:Galleries often closed Sun–Mon");
    expect(texts(gallery, "2026-10-10")).not.toContain("warn:Galleries often closed Sun–Mon");
  });
});

describe("placement helpers", () => {
  const places = [place({ id: "a" }), place({ id: "b" }), place({ id: "c" })];
  const assignments = { "2026-10-09:early": "b", "2026-10-09:lunch": null };

  it("treats a place as planned when it sits in a slot", () => {
    expect(placedIds(assignments)).toEqual(new Set(["b"]));
    expect(unscheduled(places, assignments).map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("picks today's trip day in the trip time zone, else the next upcoming day", () => {
    // 2026-10-10 00:30 in Lisbon is still Oct 9 in New York
    expect(todayFor(days, "Europe/Lisbon", new Date("2026-10-09T23:30:00Z"))).toEqual({
      date: "2026-10-12",
      status: "upcoming",
    });
    expect(todayFor(days, "Europe/Lisbon", new Date("2026-10-09T09:00:00Z"))).toEqual({
      date: "2026-10-09",
      status: "today",
    });
    expect(todayFor(days, "Europe/Lisbon", new Date("2026-10-02T12:00:00Z"))).toEqual({
      date: "2026-10-09",
      status: "upcoming",
    });
    expect(todayFor(days, "Europe/Lisbon", new Date("2026-10-20T12:00:00Z"))).toEqual({
      date: "2026-10-12",
      status: "past",
    });
  });
});
