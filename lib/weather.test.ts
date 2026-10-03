import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseForecast, describeCode, forecastFor } from "./weather";

const raw = JSON.parse(readFileSync(join(__dirname, "fixtures/open-meteo.json"), "utf8"));

describe("weather", () => {
  it("turns the Open-Meteo daily arrays into one record per date", () => {
    const days = parseForecast(raw);
    expect(days["2026-10-09"]).toMatchObject({
      date: "2026-10-09",
      sunset: expect.stringMatching(/^2026-10-09T\d\d:\d\d$/),
    });
    expect(typeof days["2026-10-09"].maxC).toBe("number");
  });

  it("describes WMO weather codes in words", () => {
    expect(describeCode(0)).toBe("Clear");
    expect(describeCode(3)).toBe("Overcast");
    expect(describeCode(63)).toBe("Rain");
    expect(describeCode(95)).toBe("Thunderstorm");
  });

  it("returns null for dates outside the forecast window", () => {
    expect(forecastFor(parseForecast(raw), "2026-12-25")).toBeNull();
  });
});
