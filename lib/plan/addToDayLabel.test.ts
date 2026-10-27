import { describe, expect, it } from "vitest";
import { addToDayLabel } from "./addToDayLabel";

describe("addToDayLabel", () => {
  it("says Add to day for a place not yet in the plan", () => {
    expect(addToDayLabel(false)).toBe("Add to day");
  });

  it("says Move for a place already in the plan", () => {
    expect(addToDayLabel(true)).toBe("Move");
  });
});
