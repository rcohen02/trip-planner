import { describe, expect, it } from "vitest";
import { applyStep, describeChanges, formValues, nextStep, SETUP_STEPS, stepAnswered } from "./setup";
import { FOOD_OPTIONS, INTEREST_OPTIONS } from "./options";
import { emptyProfile, type Profile } from "./types";

const full = (): Profile => ({
  ...emptyProfile(),
  party: "family",
  adults: 2,
  travelers: [{ id: "t1", label: "Boy", birthYear: 2016 }],
  groups: [
    { id: "g-family", name: "Whole family", travelerIds: ["t1"], hikingMilesPerDay: 5 },
    { id: "g-adults", name: "Just us two", travelerIds: [], hikingMilesPerDay: null },
  ],
  limits: { driveMinutes: 90, lodging: "house", neverHotels: true, transport: ["car"], scope: "both" },
  interests: [
    { name: "Land art", detail: "sculpture parks", tier: "must" },
    { name: "Markets", detail: "", tier: "pass" },
  ],
  food: { loves: ["Seafood"], hates: ["Shellfish"], localFirst: true },
  pace: "both",
  avoid: ["Hotels"],
  specialRequests: "Quiet mornings",
});

describe("setup steps", () => {
  it("asks six questions then a read-back, with the new wording", () => {
    expect(SETUP_STEPS.map((s) => s.id)).toEqual(["travelers", "limits", "interests", "food", "pace", "avoid", "review"]);
    expect(SETUP_STEPS.find((s) => s.id === "limits")!.question).toBe("How do you travel?");
  });

  it("starts at the first question for an empty profile and skips what's known", () => {
    expect(nextStep(emptyProfile())).toBe("travelers");
    expect(nextStep(full())).toBe("review");
    expect(nextStep({ ...full(), food: { loves: [], hates: [], localFirst: false } })).toBe("food");
  });

  it("counts a step as answered once confirmed, even if left empty", () => {
    const p = { ...emptyProfile(), confirmed: ["travelers", "limits", "interests"] };
    expect(stepAnswered(p, "interests")).toBe(true);
    expect(nextStep(p)).toBe("food");
  });
});

describe("option lists", () => {
  it("offers 20–30 interests and a good spread of foods, no duplicates", () => {
    expect(INTEREST_OPTIONS.length).toBeGreaterThanOrEqual(20);
    expect(INTEREST_OPTIONS.length).toBeLessThanOrEqual(30);
    expect(new Set(INTEREST_OPTIONS).size).toBe(INTEREST_OPTIONS.length);
    expect(FOOD_OPTIONS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(FOOD_OPTIONS).size).toBe(FOOD_OPTIONS.length);
  });
});

describe("applyStep: who travels", () => {
  it("family: adults, kids one per line, family + adults groups", () => {
    const p = applyStep(emptyProfile(), "travelers", { party: "family", adults: "2", kids: "Boy 2016\nGirl, born 2019\n\n" });
    expect(p.party).toBe("family");
    expect(p.travelers.map((t) => [t.label, t.birthYear])).toEqual([
      ["Boy", 2016],
      ["Girl", 2019],
    ]);
    expect(p.groups.map((g) => g.name)).toEqual(["Whole family", "Just us two"]);
    expect(p.confirmed).toContain("travelers");
  });

  it("couple, solo and friends each get one group named for it", () => {
    const name = (party: string, adults: string) => applyStep(emptyProfile(), "travelers", { party, adults, kids: "" }).groups.map((g) => g.name);
    expect(name("couple", "2")).toEqual(["Just us two"]);
    expect(name("solo", "1")).toEqual(["Just me"]);
    expect(name("friends", "4")).toEqual(["Friends"]);
  });

  it("no longer asks for a hiking cap, but keeps one that was imported", () => {
    const p = applyStep(full(), "travelers", { party: "family", adults: "2", kids: "Boy 2016" });
    expect(p.groups[0]).toMatchObject({ id: "g-family", hikingMilesPerDay: 5 });
    expect(formValues(full(), "travelers")).not.toHaveProperty("hikingCap");
  });

  it("ignores an unknown party and nonsense numbers", () => {
    const p = applyStep(emptyProfile(), "travelers", { party: "pirates", adults: "-3", kids: "Boy 1850\nGirl 2019" });
    expect(p.party).toBeNull();
    expect(p.adults).toBe(1);
    expect(p.travelers.map((t) => t.birthYear)).toEqual([2019]);
  });
});

describe("applyStep: how you travel", () => {
  it("transport (one or both), city scope, drive minutes and hotels", () => {
    const p = applyStep(emptyProfile(), "limits", { transport: "transit\ncar", scope: "leave", driveMinutes: "60", neverHotels: "on" });
    expect(p.limits).toEqual({ driveMinutes: 60, lodging: "house", neverHotels: true, transport: ["transit", "car"], scope: "leave" });
  });

  it("drops unknown values", () => {
    const p = applyStep(emptyProfile(), "limits", { transport: "boat", scope: "moon", driveMinutes: "" });
    expect(p.limits).toMatchObject({ transport: [], scope: null, driveMinutes: null });
  });
});

describe("applyStep: interests in three buckets", () => {
  it("reads Must do, If I can fit it in and If I pass by, in order, including write-ins", () => {
    const p = applyStep(emptyProfile(), "interests", { must: "Land art\nRuins & castles", fit: "Kayaking & canoeing", pass: "My own idea\n\n" });
    expect(p.interests).toEqual([
      { name: "Land art", detail: "", tier: "must" },
      { name: "Ruins & castles", detail: "", tier: "must" },
      { name: "Kayaking & canoeing", detail: "", tier: "fit" },
      { name: "My own idea", detail: "", tier: "pass" },
    ]);
  });

  it("keeps details from before (e.g. imported notes) and never lists one twice", () => {
    const p = applyStep(full(), "interests", { must: "Land art\nLand art", fit: "Land art" });
    expect(p.interests).toEqual([{ name: "Land art", detail: "sculpture parks", tier: "must" }]);
  });
});

describe("applyStep: food love and hate", () => {
  it("reads the two lists, write-ins included, a food in both counts as hate", () => {
    const p = applyStep(emptyProfile(), "food", { love: "Seafood\nPastries\nCilantro", hate: "Cilantro\nShellfish", localFirst: "on" });
    expect(p.food).toEqual({ loves: ["Seafood", "Pastries"], hates: ["Cilantro", "Shellfish"], localFirst: true });
  });
});

describe("applyStep: pace, never suggest, special requests", () => {
  it("works", () => {
    expect(applyStep(emptyProfile(), "pace", { pace: "relaxed" }).pace).toBe("relaxed");
    expect(applyStep(emptyProfile(), "pace", { pace: "silly" }).pace).toBeNull();
    const p = applyStep(emptyProfile(), "avoid", { avoid: "Theme parks\n\nChains", specialRequests: "  Stroller-friendly please  " });
    expect(p.avoid).toEqual(["Theme parks", "Chains"]);
    expect(p.specialRequests).toBe("Stroller-friendly please");
  });

  it("review just confirms", () => {
    expect(applyStep(full(), "review", {}).confirmed).toContain("review");
  });
});

describe("describeChanges", () => {
  it("says what changed in plain words", () => {
    const after = { ...full(), limits: { ...full().limits, driveMinutes: 60 }, specialRequests: "" };
    expect(describeChanges(full(), after)).toBe("Drive radius 90 → 60 min · Special requests changed");
    expect(describeChanges(full(), { ...full(), limits: { ...full().limits, transport: ["transit"] } })).toBe("How you travel changed");
  });

  it("names a first save and no-op saves", () => {
    expect(describeChanges(null, full())).toBe("Profile created");
    expect(describeChanges(full(), full())).toBe("No changes");
  });
});

describe("formValues", () => {
  it("pre-fills each step in the shape applyStep reads, and round-trips", () => {
    const p = full();
    expect(formValues(p, "travelers")).toEqual({ party: "family", adults: "2", kids: "Boy 2016" });
    expect(formValues(p, "limits")).toEqual({ transport: "car", scope: "both", driveMinutes: "90", neverHotels: "on" });
    expect(formValues(p, "interests")).toEqual({ must: "Land art", fit: "", pass: "Markets" });
    expect(formValues(p, "food")).toEqual({ love: "Seafood", hate: "Shellfish", localFirst: "on" });
    expect(formValues(p, "avoid")).toEqual({ avoid: "Hotels", specialRequests: "Quiet mornings" });
    for (const s of ["travelers", "limits", "interests", "food", "pace", "avoid"] as const) {
      const again = applyStep(p, s, formValues(p, s));
      expect({ ...again, confirmed: undefined, travelers: again.travelers.map((t) => t.label) }).toEqual({
        ...p,
        confirmed: undefined,
        travelers: p.travelers.map((t) => t.label),
      });
    }
  });
});
