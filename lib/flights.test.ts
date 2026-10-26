import { describe, expect, it } from "vitest";
import { nextFlight } from "./flights";
import type { Flight } from "@/lib/content/types";

const flight = (flightNo: string, depart: string): Flight => ({
  airline: "Test",
  flightNo,
  from: { code: "AAA", name: "A", terminal: "1" },
  to: { code: "BBB", name: "B", terminal: "1" },
  depart,
  arrive: depart,
  checkInCloses: depart,
  seats: {},
});

describe("nextFlight", () => {
  const out = flight("OUT1", "2027-07-03T10:00:00-04:00");
  const back = flight("BACK1", "2027-07-10T09:00:00-07:00");

  it("returns null when the trip has no flights", () => {
    expect(nextFlight([], new Date("2027-07-01T00:00:00Z"))).toBeNull();
  });

  it("points at the outbound flight before the trip starts", () => {
    expect(nextFlight([out, back], new Date("2027-07-01T00:00:00Z"))).toEqual({ flight: out, outbound: true });
  });

  it("points at the return flight once the outbound has left", () => {
    expect(nextFlight([out, back], new Date("2027-07-05T00:00:00Z"))).toEqual({ flight: back, outbound: false });
  });
});
