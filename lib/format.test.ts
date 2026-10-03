import { describe, expect, it } from "vitest";
import { money, timeIn, dateLabel, countdown, weekdayOf, hours12, longDate } from "./format";

describe("money (design system Writing rules)", () => {
  const eur = (price: Parameters<typeof money>[0]) => money(price, "EUR", 1.16);
  it("shows local first, then USD, separated by a slash", () => {
    expect(eur({ amount: 16 })).toBe("€16 / $19");
    expect(eur({ amount: 9.5 })).toBe("€9.50 / $11");
  });
  it("marks approximate prices with one tilde and spells out units", () => {
    expect(eur({ amount: 40, approx: true, unit: "per person" })).toBe("~€40 / $46 per person");
    expect(eur({ amount: 70, approx: true, unit: "for two" })).toBe("~€70 / $81 for two");
  });
  it("writes ranges with an en dash on both sides", () => {
    expect(eur({ amount: 13.5, max: 15 })).toBe("€13.50–15 / $16–17");
  });
  it("says Free or Price unknown, and flags old prices", () => {
    expect(eur({ amount: 0 })).toBe("Free");
    expect(eur(null)).toBe("Price unknown");
    expect(eur({ amount: 3, year: 2023 })).toBe("€3 / $3 · 2023 price");
  });
});

describe("hours", () => {
  it("converts 24-hour venue hours to the 12-hour style", () => {
    expect(hours12("Daily 10:00–18:00 from Oct (last entry 17:00)")).toBe("Daily 10 am–6 pm from Oct (last entry 5 pm)");
    expect(hours12("Tue–Sun 10:00–18:00, closed Mon")).toBe("Tue–Sun 10 am–6 pm, closed Mon");
    expect(hours12("free if reserved before 22:00 or 9:30")).toBe("free if reserved before 10 pm or 9:30 am");
  });
});

describe("times", () => {
  it("formats an instant in a given time zone", () => {
    expect(timeIn("2026-10-09T05:30:00+01:00", "Europe/Lisbon")).toBe("5:30 am");
    expect(timeIn("2026-10-08T17:30:00-04:00", "America/New_York")).toBe("5:30 pm");
    expect(timeIn("2026-10-12T16:00:00+01:00", "Europe/Lisbon")).toBe("4 pm");
    expect(dateLabel("2026-10-09")).toBe("Fri Oct 9");
    expect(longDate("2026-10-10")).toBe("Saturday, October 10");
    expect(weekdayOf("2026-10-12")).toBe(1);
  });

  it("counts down to a moment in days and hours", () => {
    const now = new Date("2026-10-06T15:30:00-04:00");
    expect(countdown("2026-10-08T17:30:00-04:00", now)).toBe("2 days, 2 hours");
    expect(countdown("2026-10-06T18:30:00-04:00", now)).toBe("3 hours");
    expect(countdown("2026-10-01T18:30:00-04:00", now)).toBeNull();
  });
});
