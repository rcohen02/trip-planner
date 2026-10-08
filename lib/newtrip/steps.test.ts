import { describe, expect, it } from "vitest";
import { applyTripStep, emptyDraft, nextTripStep, TRIP_STEPS, tripFormValues, type TripDraft } from "./steps";

const place = { label: "Lisbon, Portugal", lat: 38.72, lng: -9.14, countryCode: "pt" };

const ready = (): TripDraft => ({
  ...emptyDraft(),
  destination: place,
  start: "2026-10-09",
  end: "2026-10-12",
  groupId: "g-adults",
  homebase: { label: "House in Paço de Arcos", address: "Rua X 1, Paço de Arcos", lat: 38.69, lng: -9.28, found: true },
  confirmed: ["different"],
  plan: "draft",
});

describe("trip steps", () => {
  it("asks where, when, who, stay, anything different, draft-or-build, then a read-back", () => {
    expect(TRIP_STEPS.map((s) => s.id)).toEqual(["where", "when", "who", "stay", "different", "plan", "review"]);
    expect(TRIP_STEPS.map((s) => s.question)).toEqual([
      "Where to?",
      "When?",
      "Who's coming?",
      "Where are you staying?",
      "Anything different this time?",
      "Draft the days, or build them yourself?",
      "Here's the plan. Right?",
    ]);
  });

  it("goes to the first unanswered question, and to the read-back when everything is known", () => {
    expect(nextTripStep(emptyDraft())).toBe("where");
    expect(nextTripStep({ ...emptyDraft(), destination: place })).toBe("when");
    expect(nextTripStep(ready())).toBe("review");
    expect(nextTripStep({ ...ready(), plan: null })).toBe("plan");
  });

  it("'anything different' counts as answered once seen, even if left blank", () => {
    expect(nextTripStep({ ...ready(), confirmed: [] })).toBe("different");
  });
});

describe("applyTripStep", () => {
  it("when: a start and end date, end on or after start, at most 30 days", () => {
    expect(applyTripStep(emptyDraft(), "when", { start: "2026-10-09", end: "2026-10-12" })).toMatchObject({ start: "2026-10-09", end: "2026-10-12" });
    expect(() => applyTripStep(emptyDraft(), "when", { start: "2026-10-12", end: "2026-10-09" })).toThrow(/after/);
    expect(() => applyTripStep(emptyDraft(), "when", { start: "2026-10-01", end: "2026-11-15" })).toThrow(/30 days/);
    expect(() => applyTripStep(emptyDraft(), "when", { start: "nope", end: "" })).toThrow(/date/);
  });

  it("who: one of the profile's groups", () => {
    expect(applyTripStep(emptyDraft(), "who", { groupId: "g-family" }, ["g-family", "g-adults"]).groupId).toBe("g-family");
    expect(() => applyTripStep(emptyDraft(), "who", { groupId: "g-x" }, ["g-family"])).toThrow(/Pick/);
  });

  it("different: free-text changes plus this trip's way of getting around (defaults to the profile)", () => {
    const d = applyTripStep(emptyDraft(), "different", { overrides: "  Focus on food ", transport: "transit\ncar\nboat" });
    expect(d.overrides).toBe("Focus on food");
    expect(d.transport).toEqual(["transit", "car"]);
    expect(d.confirmed).toContain("different");
  });

  it("plan: draft or build", () => {
    expect(applyTripStep(emptyDraft(), "plan", { plan: "build" }).plan).toBe("build");
    expect(applyTripStep(emptyDraft(), "plan", { plan: "x" }).plan).toBeNull();
  });

  it("pre-fills forms from the draft", () => {
    expect(tripFormValues(ready(), "when")).toEqual({ start: "2026-10-09", end: "2026-10-12" });
    expect(tripFormValues(ready(), "who")).toEqual({ groupId: "g-adults" });
    expect(tripFormValues(ready(), "where")).toEqual({ destination: "Lisbon, Portugal" });
    expect(tripFormValues(ready(), "stay")).toEqual({ label: "House in Paço de Arcos", address: "Rua X 1, Paço de Arcos" });
    expect(tripFormValues(ready(), "plan")).toEqual({ plan: "draft" });
  });
});
