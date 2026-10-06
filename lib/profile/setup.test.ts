import { describe, expect, it } from "vitest";
import { applyStep, describeChanges, nextStep, SETUP_STEPS, stepAnswered } from "./setup";
import { emptyProfile, type Profile } from "./types";

const full = (): Profile => ({
  adults: 2,
  travelers: [{ id: "t1", label: "Boy", birthYear: 2016 }],
  groups: [
    { id: "g-family", name: "Whole family", travelerIds: ["t1"], hikingMilesPerDay: 5 },
    { id: "g-adults", name: "Just us two", travelerIds: [], hikingMilesPerDay: null },
  ],
  limits: { driveMinutes: 90, lodging: "house", neverHotels: true },
  interests: [{ name: "Land art", detail: "sculpture parks" }],
  food: { restrictions: [], favorites: ["Seafood"], localFirst: true },
  pace: "both",
  avoid: ["Hotels"],
  sources: [],
});

describe("setup steps", () => {
  it("asks six questions then a read-back", () => {
    expect(SETUP_STEPS.map((s) => s.id)).toEqual(["travelers", "limits", "interests", "food", "pace", "avoid", "review"]);
    expect(SETUP_STEPS[0].question).toBe("Who usually travels with you?");
  });

  it("starts at the first question for an empty profile", () => {
    expect(nextStep(emptyProfile())).toBe("travelers");
  });

  it("skips anything already known, so an imported profile goes straight to the read-back", () => {
    expect(nextStep(full())).toBe("review");
    const noFood = { ...full(), food: { restrictions: [], favorites: [], localFirst: false } };
    expect(nextStep(noFood)).toBe("food");
  });

  it("counts a step as answered once confirmed, even if it was left empty", () => {
    const p = { ...emptyProfile(), confirmed: ["travelers", "limits", "interests"] } as Profile;
    expect(stepAnswered(p, "interests")).toBe(true);
    expect(nextStep(p)).toBe("food");
  });
});

describe("applyStep", () => {
  it("travelers: adults, kids one per line, and groups with the family hiking cap", () => {
    const p = applyStep(emptyProfile(), "travelers", { adults: "2", kids: "Boy 2016\nGirl, born 2019\n\n", hikingCap: "5" });
    expect(p.adults).toBe(2);
    expect(p.travelers.map((t) => [t.label, t.birthYear])).toEqual([
      ["Boy", 2016],
      ["Girl", 2019],
    ]);
    expect(p.groups.map((g) => [g.name, g.travelerIds.length, g.hikingMilesPerDay])).toEqual([
      ["Whole family", 2, 5],
      ["Just us two", 0, null],
    ]);
    expect(p.confirmed).toContain("travelers");
  });

  it("travelers: no kids gives one group, named for the number of adults", () => {
    expect(applyStep(emptyProfile(), "travelers", { adults: "1", kids: "" }).groups.map((g) => g.name)).toEqual(["Just me"]);
    expect(applyStep(emptyProfile(), "travelers", { adults: "3", kids: "" }).groups.map((g) => g.name)).toEqual(["Adults only"]);
  });

  it("travelers: keeps existing group ids so trips that picked a group still match", () => {
    const p = applyStep(full(), "travelers", { adults: "2", kids: "Boy 2016", hikingCap: "4" });
    expect(p.groups[0]).toMatchObject({ id: "g-family", hikingMilesPerDay: 4 });
  });

  it("limits: drive minutes and the hotel rule", () => {
    const p = applyStep(emptyProfile(), "limits", { driveMinutes: "60", neverHotels: "on" });
    expect(p.limits).toEqual({ driveMinutes: 60, lodging: "house", neverHotels: true });
    expect(applyStep(emptyProfile(), "limits", { driveMinutes: "" }).limits).toEqual({ driveMinutes: null, lodging: "any", neverHotels: false });
  });

  it("interests: one per line, most important first, 'Name — detail' or just a name", () => {
    const p = applyStep(emptyProfile(), "interests", { interests: "1. Land art — sculpture parks\nRuins - climbable\nFestivals\n" });
    expect(p.interests).toEqual([
      { name: "Land art", detail: "sculpture parks" },
      { name: "Ruins", detail: "climbable" },
      { name: "Festivals", detail: "" },
    ]);
  });

  it("food: comma lists and the local-first switch", () => {
    const p = applyStep(emptyProfile(), "food", { restrictions: "vegetarian, no peanuts", favorites: "Seafood", localFirst: "on" });
    expect(p.food).toEqual({ restrictions: ["vegetarian", "no peanuts"], favorites: ["Seafood"], localFirst: true });
  });

  it("pace and avoid", () => {
    expect(applyStep(emptyProfile(), "pace", { pace: "relaxed" }).pace).toBe("relaxed");
    expect(applyStep(emptyProfile(), "pace", { pace: "silly" }).pace).toBeNull();
    expect(applyStep(emptyProfile(), "avoid", { avoid: "Theme parks\n\nChains" }).avoid).toEqual(["Theme parks", "Chains"]);
  });

  it("review just confirms", () => {
    expect(applyStep(full(), "review", {}).confirmed).toContain("review");
  });

  it("ignores nonsense numbers", () => {
    const p = applyStep(emptyProfile(), "travelers", { adults: "-3", kids: "Boy 1850\nGirl 2019" });
    expect(p.adults).toBe(1);
    expect(p.travelers.map((t) => t.birthYear)).toEqual([2019]);
  });
});

describe("describeChanges", () => {
  it("says what changed in plain words", () => {
    const before = full();
    const after = { ...full(), limits: { ...before.limits, driveMinutes: 60 }, interests: [...before.interests, { name: "Kayaking", detail: "" }] };
    expect(describeChanges(before, after)).toBe("Drive radius 90 → 60 min · Interests changed");
  });

  it("names a first save and no-op saves", () => {
    expect(describeChanges(null, full())).toBe("Profile created");
    expect(describeChanges(full(), full())).toBe("No changes");
  });
});

describe("formValues", () => {
  it("pre-fills each step from the profile, in the same shape applyStep reads", async () => {
    const { formValues } = await import("./setup");
    const p = full();
    expect(formValues(p, "travelers")).toEqual({ adults: "2", kids: "Boy 2016", hikingCap: "5" });
    expect(formValues(p, "limits")).toEqual({ driveMinutes: "90", neverHotels: "on" });
    expect(formValues(p, "interests")).toEqual({ interests: "Land art — sculpture parks" });
    expect(formValues(p, "food")).toEqual({ restrictions: "", favorites: "Seafood", localFirst: "on" });
    expect(formValues(p, "pace")).toEqual({ pace: "both" });
    expect(formValues(p, "avoid")).toEqual({ avoid: "Hotels" });
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
