import { describe, expect, it } from "vitest";
import { getTrip, listTrips } from "@/lib/trips";
import { stayFor } from "@/lib/stays";

describe("Dominican Republic trip", () => {
  const trip = getTrip("dominican-republic-2027");

  it("exists and is listed between Lisbon and Fernie", () => {
    expect(trip).not.toBeNull();
    expect(listTrips().map((t) => t.slug)).toEqual([
      "lisbon-2026",
      "dominican-republic-2027",
      "fernie-2027",
    ]);
  });

  it("sleeps at the Casablanca Boutique Hotel every night, Feb 13–19", () => {
    const nights = ["2027-02-13", "2027-02-14", "2027-02-15", "2027-02-16", "2027-02-17", "2027-02-18", "2027-02-19"];
    for (const night of nights) {
      const stay = stayFor(trip!, night);
      expect(stay?.label, night).toMatch(/Casablanca Boutique Hotel/);
    }
    expect(stayFor(trip!, "2027-02-20")).toBeNull();
  });

  it("has the outbound and return United flights with the family's seats", () => {
    expect(trip!.flights.map((f) => f.flightNo)).toEqual(["UA1984", "UA2489"]);
    expect(trip!.flights[0].from.code).toBe("EWR");
    expect(trip!.flights[0].to.code).toBe("SDQ");
    expect(trip!.flights[1].from.code).toBe("SDQ");
    expect(trip!.flights[1].to.code).toBe("EWR");
    expect(trip!.flights[0].seats.Margot).toBe("29E");
    expect(trip!.flights[1].seats.Rob).toBe("30C");
  });

  it("covers each day from arrival to departure", () => {
    expect(trip!.days.map((d) => d.date)).toEqual([
      "2027-02-13",
      "2027-02-14",
      "2027-02-15",
      "2027-02-16",
      "2027-02-17",
      "2027-02-18",
      "2027-02-19",
      "2027-02-20",
    ]);
  });
});
