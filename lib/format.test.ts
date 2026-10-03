import { describe, expect, it } from "vitest";
import { money, timeIn, dateLabel, countdown, weekdayOf } from "./format";

describe("money", () => {
  it("shows local currency with USD", () => {
    expect(money(40, "EUR", 1.16)).toBe("€40 (≈ $46)");
    expect(money(9.5, "EUR", 1.16)).toBe("€9.50 (≈ $11)");
    expect(money(0, "EUR", 1.16)).toBe("Free");
    expect(money(null, "EUR", 1.16)).toBe("");
  });
});

describe("times", () => {
  it("formats an instant in a given time zone", () => {
    expect(timeIn("2026-10-09T05:30:00+01:00", "Europe/Lisbon")).toBe("5:30 AM");
    expect(timeIn("2026-10-08T17:30:00-04:00", "America/New_York")).toBe("5:30 PM");
    expect(dateLabel("2026-10-09")).toBe("Fri, Oct 9");
    expect(weekdayOf("2026-10-12")).toBe(1);
  });

  it("counts down to a moment in days and hours", () => {
    const now = new Date("2026-10-06T15:30:00-04:00");
    expect(countdown("2026-10-08T17:30:00-04:00", now)).toBe("2 days, 2 hours");
    expect(countdown("2026-10-06T18:30:00-04:00", now)).toBe("3 hours");
    expect(countdown("2026-10-01T18:30:00-04:00", now)).toBeNull();
  });
});
