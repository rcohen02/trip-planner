import { describe, expect, it } from "vitest";
import { buildTrip } from "./buildTrip";

const md = `## Restaurants

- **Canalha** — Rua da Junqueira 207. ~€40. Call +351 962 152 742.
  *2026:* Book now.

## Hotels (reference)

- **Some Hotel** — Center. From €200.
`;

const meta = {
  slug: "t",
  name: "T",
  clusterOf: { canalha: "west" },
  days: [],
  todos: [],
};

describe("buildTrip", () => {
  it("merges picks with trip meta, clusters and enrichment", () => {
    const trip = buildTrip(md, meta as never, {
      canalha: { lat: 38.7, lng: -9.19, images: [{ url: "u", thumb: "t", credit: "c", license: "CC BY", sourcePage: "s" }] },
    });
    expect(trip.places).toHaveLength(1);
    const c = trip.places[0];
    expect(c.cluster).toBe("west");
    expect(c.lat).toBe(38.7);
    expect(c.images?.[0].license).toBe("CC BY");
    expect((trip as unknown as Record<string, unknown>).clusterOf).toBeUndefined();
  });

  it("leaves places without enrichment unmapped rather than guessing", () => {
    const trip = buildTrip(md, meta as never, {});
    expect(trip.places[0].lat).toBeNull();
    expect(trip.places[0].images).toEqual([]);
  });
});
