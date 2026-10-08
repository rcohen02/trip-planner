import { describe, expect, it } from "vitest";
import { TRIPS } from "@/content/generated/trips";
import type { Trip } from "../content/types";
import { flightZone, seatReminder, tripCountdown } from "./local";

const lisbon = TRIPS["lisbon-2026"];
const noFlights = { ...lisbon, slug: "rome-2026", flights: [], bags: [], sunsetSpot: undefined } as Trip;

describe("flightZone", () => {
  it("shows times at the destination airport in trip time, others in home time with a short label", () => {
    expect(flightZone(lisbon, "LIS")).toEqual({ zone: "Europe/Lisbon", suffix: "" });
    expect(flightZone(lisbon, "EWR")).toEqual({ zone: "America/New_York", suffix: " ET" });
    expect(flightZone({ ...lisbon, homeTimezone: "Europe/London" }, "EWR")).toEqual({ zone: "Europe/London", suffix: " London" });
  });
});

describe("tripCountdown", () => {
  it("counts down to the outbound flight before the trip and the return flight during it", () => {
    expect(tripCountdown(lisbon, new Date("2026-10-07T12:00:00Z"))).toMatchObject({ label: "Leaving in", target: lisbon.flights[0].depart });
    expect(tripCountdown(lisbon, new Date("2026-10-10T12:00:00Z"))).toMatchObject({ label: "Flight home in", target: lisbon.flights[1].depart });
  });

  it("without flights, counts down to the first day, then shows the day number", () => {
    expect(tripCountdown(noFlights, new Date("2026-10-01T12:00:00Z"))).toEqual({ label: "Trip starts in", target: "2026-10-09T00:00:00+01:00", detail: "Fri Oct 9" });
    expect(tripCountdown(noFlights, new Date("2026-10-10T12:00:00Z"))).toEqual({ label: "Trip day", target: null, detail: "Day 2 of 4" });
    expect(tripCountdown(noFlights, new Date("2026-10-20T12:00:00Z"))).toEqual({ label: "Trip", target: null, detail: "Over" });
  });
});

describe("seatReminder", () => {
  it("comes from the trip's own notes, never a fixed seat", () => {
    expect(seatReminder(lisbon)).toMatch(/22B/);
    expect(seatReminder(noFlights)).toBeNull();
  });
});
