import { describe, expect, it } from "vitest";
import { isAllowed, devBypass } from "./allow";

describe("isAllowed", () => {
  const list = " owner@example.com ";
  it("accepts the allowlisted email case-insensitively", () => {
    expect(isAllowed("Owner@Example.com", list)).toBe(true);
  });
  it("rejects anyone else, missing emails, and an empty list", () => {
    expect(isAllowed("someone@example.com", list)).toBe(false);
    expect(isAllowed(null, list)).toBe(false);
    expect(isAllowed("owner@example.com", "")).toBe(false);
    expect(isAllowed("owner@example.com", undefined)).toBe(false);
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
