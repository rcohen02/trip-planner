// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FlightCard } from "./FlightCard";
import type { Flight, Trip } from "@/lib/content/types";

const trip = {
  timezone: "America/Santo_Domingo",
  homeTimezone: "America/New_York",
} as Trip;

function flight(fromTerminal: string, toTerminal: string): Flight {
  return {
    airline: "United Airlines",
    flightNo: "UA1984",
    from: { code: "EWR", name: "Newark", terminal: fromTerminal },
    to: { code: "SDQ", name: "Santo Domingo", terminal: toTerminal },
    depart: "2027-02-13T08:45:00-05:00",
    arrive: "2027-02-13T13:41:00-04:00",
    checkInCloses: "2027-02-13T07:45:00-05:00",
    seats: { Rob: "29B" },
  };
}

afterEach(() => cleanup());

describe("FlightCard terminals", () => {
  it("omits terminal labels when the terminal is unknown", () => {
    const { container } = render(<FlightCard flight={flight("", "")} trip={trip} title="Outbound" />);
    const text = container.textContent ?? "";
    expect(text).not.toContain("Terminal");
    expect(text).not.toMatch(/· T(?![a-z])/);
  });

  it("still shows known terminals", () => {
    const { container } = render(<FlightCard flight={flight("B", "1")} trip={trip} title="Outbound" />);
    const text = container.textContent ?? "";
    expect(text).toContain("Terminal B");
    expect(text).toContain("· T1");
  });
});
