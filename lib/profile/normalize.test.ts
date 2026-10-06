import { describe, expect, it } from "vitest";
import { normalizeProfile } from "./normalize";
import { emptyProfile } from "./types";

describe("normalizeProfile", () => {
  it("upgrades a profile saved before the Oct 6 redesign", () => {
    const old = {
      adults: 2,
      travelers: [],
      groups: [{ id: "g-adults", name: "Just us two", travelerIds: [], hikingMilesPerDay: null }],
      limits: { driveMinutes: 90, lodging: "house", neverHotels: true },
      interests: [{ name: "Land art", detail: "parks" }],
      food: { restrictions: ["no peanuts"], favorites: ["Seafood"], localFirst: true },
      pace: "both",
      avoid: ["Hotels"],
      sources: [],
      confirmed: ["review"],
    };
    expect(normalizeProfile(old)).toEqual({
      ...emptyProfile(),
      adults: 2,
      groups: old.groups,
      limits: { driveMinutes: 90, lodging: "house", neverHotels: true, transport: [], scope: null },
      interests: [{ name: "Land art", detail: "parks", tier: "must" }],
      food: { loves: ["Seafood"], hates: ["no peanuts"], localFirst: true },
      pace: "both",
      avoid: ["Hotels"],
      confirmed: ["review"],
    });
  });

  it("leaves a current profile alone", () => {
    const p = { ...emptyProfile(), party: "solo" as const, specialRequests: "x" };
    expect(normalizeProfile(p)).toEqual(p);
  });
});
