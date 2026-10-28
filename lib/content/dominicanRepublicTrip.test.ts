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

  it("pins the hotel at its Google Maps location", () => {
    const pin = { lat: 19.6297313, lng: -69.9081141 };
    const stay = stayFor(trip!, "2027-02-14");
    expect(stay!.lat).toBeCloseTo(pin.lat, 4);
    expect(stay!.lng).toBeCloseTo(pin.lng, 4);
    expect(trip!.homebase.lat).toBeCloseTo(pin.lat, 4);
    expect(trip!.homebase.lng).toBeCloseTo(pin.lng, 4);
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

  it("lists the approved places, each with a pin and a cluster", () => {
    expect(trip!.places.map((p) => p.name)).toEqual([
      "Playa Grande",
      "Playa Caleton",
      "Playa Cabarete (Kite Beach)",
      "Playa Sosúa",
      "Playa Encuentro",
      "Blue Lagoon",
      "Balneario El Saltadero",
      "Cuevas de Cabarete",
      "Parque Nacional El Choco",
      "Laguna Gri-Gri",
      "Monkey Jungle & Zip Line Adventures",
      "2-Person Dune Buggy Tour",
      "Four-Wheeler Tour",
      "Yasica River Kayak Tour",
      "Private Kayak or Paddleboard Tour, La Boca",
      "Ke Lo Ke Kafe",
      "El Babunuco",
      "Casa Grande, Playa Grande",
      "Taco Star",
      "Upstairs",
      "El Huerto",
      "The Beer Garden at ONDA",
      "NLB Nelson's Lounge & Bistro",
      "Waterfront Playa Alicia",
      "Natura Restaurant",
      "Restaurant Tuvá",
      "Bliss",
      "Woke Foods",
    ]);
    const unmapped = trip!.places.filter((p) => p.lat == null || p.lng == null).map((p) => p.name);
    const unclustered = trip!.places.filter((p) => !p.cluster).map((p) => p.name);
    expect(unmapped).toEqual([]);
    expect(unclustered).toEqual([]);
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
