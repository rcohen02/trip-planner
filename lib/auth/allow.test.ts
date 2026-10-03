import { describe, expect, it } from "vitest";
import { isAllowed, devBypass } from "./allow";

describe("isAllowed", () => {
  const list = " cohen.rl@gmail.com, dmindess@gmail.com ";
  it("accepts allowlisted emails case-insensitively", () => {
    expect(isAllowed("Cohen.RL@gmail.com", list)).toBe(true);
    expect(isAllowed("dmindess@gmail.com", list)).toBe(true);
  });
  it("rejects anyone else, missing emails, and an empty list", () => {
    expect(isAllowed("someone@gmail.com", list)).toBe(false);
    expect(isAllowed(null, list)).toBe(false);
    expect(isAllowed("cohen.rl@gmail.com", "")).toBe(false);
    expect(isAllowed("cohen.rl@gmail.com", undefined)).toBe(false);
  });
});

describe("devBypass", () => {
  it("only skips sign-in locally when Google isn't configured", () => {
    expect(devBypass({ NODE_ENV: "development" })).toBe(true);
    expect(devBypass({ NODE_ENV: "development", AUTH_GOOGLE_ID: "x" })).toBe(false);
    expect(devBypass({ NODE_ENV: "production" })).toBe(false);
    expect(devBypass({ NODE_ENV: "production", VERCEL: "1" })).toBe(false);
  });
});
