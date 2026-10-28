import { describe, expect, it } from "vitest";
import { clusterSize } from "./cluster";

describe("clusterSize", () => {
  it("grows the bubble with the number of pins it holds", () => {
    expect(clusterSize(2)).toBe(34);
    expect(clusterSize(12)).toBe(40);
    expect(clusterSize(30)).toBe(48);
  });
});
