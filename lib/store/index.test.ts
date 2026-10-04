import { afterEach, describe, expect, it } from "vitest";
import { getStore } from "./index";

const g = globalThis as unknown as { __t2tStore?: unknown };

describe("getStore", () => {
  afterEach(() => {
    delete g.__t2tStore;
  });

  it("replaces a store left over from older code (dev hot reload) instead of crashing", async () => {
    g.__t2tStore = { assignments: async () => ({}) }; // an old store without newer methods
    const s = getStore();
    expect(typeof s.layout).toBe("function");
    expect(await s.layout("lis")).toEqual({ extras: [], labels: {} });
  });

  it("keeps the same store between calls", () => {
    expect(getStore()).toBe(getStore());
  });
});
