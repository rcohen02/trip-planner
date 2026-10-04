import { describe, expect, it } from "vitest";
import type { DayRule, Place } from "../content/types";
import { buildSlots, slotId, warningsFor, placedIds, unscheduled, todayFor, suggestSlotLabel, cleanSlotLabel, visibleCategories, movePlace, neighborSlot, pickDay } from "./plan";

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

describe("added slots", () => {
  const sat: DayRule[] = [{ date: "2026-10-10", label: "Sat", slots: ["morning", "lunch", "afternoon", "dinner"] }];

  it("inserts an added slot right after the slot it follows, with its own label", () => {
    const slots = buildSlots(sat, { extras: [{ id: "2026-10-10:x-1", date: "2026-10-10", after: "2026-10-10:afternoon", label: "Second afternoon" }] });
    expect(slots.map((s) => s.label)).toEqual(["Morning", "Lunch", "Afternoon", "Second afternoon", "Dinner"]);
    expect(slots[3]).toMatchObject({ id: "2026-10-10:x-1", kind: "afternoon", extra: true, locked: null });
    expect(slots[2].extra).toBe(false);
  });

  it("chains added slots in order and puts orphans at the end of their day", () => {
    const slots = buildSlots(sat, {
      extras: [
        { id: "2026-10-10:x-1", date: "2026-10-10", after: "2026-10-10:morning", label: "Coffee" },
        { id: "2026-10-10:x-2", date: "2026-10-10", after: "2026-10-10:x-1", label: "Market" },
        { id: "2026-10-10:x-3", date: "2026-10-10", after: "2026-10-10:gone", label: "Late" },
      ],
    });
    expect(slots.map((s) => s.label)).toEqual(["Morning", "Coffee", "Market", "Lunch", "Afternoon", "Dinner", "Late"]);
  });

  it("suggests a numbered label and cleans what people type", () => {
    const slots = buildSlots(sat, { extras: [{ id: "2026-10-10:x-1", date: "2026-10-10", after: "2026-10-10:afternoon", label: "Afternoon 2" }] });
    expect(suggestSlotLabel(slots, "2026-10-10:afternoon")).toBe("Afternoon 3");
    expect(suggestSlotLabel(slots, "2026-10-10:lunch")).toBe("Lunch 2");
    expect(cleanSlotLabel("  Gelato   run ")).toBe("Gelato run");
    expect(cleanSlotLabel("   ")).toBeNull();
    expect(cleanSlotLabel("x".repeat(60))).toHaveLength(40);
  });
});

describe("map category filter", () => {
  it("shows every category until one is chosen, then only that one", () => {
    const all = ["art", "food", "bar"] as const;
    expect(visibleCategories([...all], null)).toEqual(["art", "food", "bar"]);
    expect(visibleCategories([...all], "food")).toEqual(["food"]);
  });
});

describe("renamed slots", () => {
  it("uses a saved name for a base slot and remembers it was renamed", () => {
    const sat: DayRule[] = [{ date: "2026-10-10", label: "Sat", slots: ["morning", "lunch"] }];
    const slots = buildSlots(sat, { labels: { "2026-10-10:lunch": "Canalha lunch" } });
    expect(slots.map((s) => [s.label, s.renamed])).toEqual([
      ["Morning", false],
      ["Canalha lunch", true],
    ]);
  });
});

describe("moving places", () => {
  it("swaps when a planned place moves onto a filled slot", () => {
    const a = { "d1:morning": "maat", "d1:afternoon": "macam" };
    expect(movePlace(a, "macam", "d1:morning")).toEqual({ "d1:morning": "macam", "d1:afternoon": "maat" });
  });

  it("sends the occupant back to Unscheduled when the place came from Unscheduled", () => {
    expect(movePlace({ "d1:morning": "maat" }, "canalha", "d1:morning")).toEqual({ "d1:morning": "canalha" });
  });

  it("moves into an empty slot and leaves the old one empty", () => {
    expect(movePlace({ "d1:morning": "maat", "d1:lunch": null }, "maat", "d1:lunch")).toEqual({ "d1:lunch": "maat" });
  });

  it("finds the open slot above or below on the same day, skipping locked time", () => {
    const mon: DayRule[] = [
      { date: "2026-10-11", label: "Sun", slots: ["night"] },
      { date: "2026-10-12", label: "Mon", slots: ["morning", "lunch", "afternoon"], locked: [{ kind: "lunch", reason: "Airport" }] },
    ];
    const slots = buildSlots(mon);
    expect(neighborSlot(slots, "2026-10-12:afternoon", -1)?.id).toBe("2026-10-12:morning");
    expect(neighborSlot(slots, "2026-10-12:morning", 1)?.id).toBe("2026-10-12:afternoon");
    expect(neighborSlot(slots, "2026-10-12:morning", -1)).toBeNull(); // never crosses into Sunday
    expect(neighborSlot(slots, "2026-10-12:afternoon", 1)).toBeNull();
  });
});

describe("pickDay", () => {
  it("shows the requested trip day, else falls back to today's logic", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    expect(pickDay(days, "Europe/Lisbon", "2026-10-12", now)).toEqual({ date: "2026-10-12", status: "upcoming" });
    expect(pickDay(days, "Europe/Lisbon", "2026-10-30", now)).toEqual({ date: "2026-10-09", status: "upcoming" });
    expect(pickDay(days, "Europe/Lisbon", undefined, new Date("2026-10-09T09:00:00Z"))).toEqual({ date: "2026-10-09", status: "today" });
    expect(pickDay(days, "Europe/Lisbon", "2026-10-09", new Date("2026-10-12T09:00:00Z"))).toEqual({ date: "2026-10-09", status: "past" });
  });
});
