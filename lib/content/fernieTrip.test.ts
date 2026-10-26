import { describe, expect, it } from "vitest";
import { getTrip } from "@/lib/trips";

describe("Fernie trip places", () => {
  const trip = getTrip("fernie-2027");

  it("has a map position and an area for every place", () => {
    expect(trip).not.toBeNull();
    const unmapped = trip!.places.filter((p) => p.lat == null || p.lng == null).map((p) => p.name);
    const unareaed = trip!.places.filter((p) => !p.cluster).map((p) => p.name);
    expect(unmapped).toEqual([]);
    expect(unareaed).toEqual([]);
  });
});
