import { describe, expect, it } from "vitest";
import { FakeGeocoder, parseFrankfurter, parseNominatim, usdRateFor, type RateSource } from "./lookup";

describe("parseNominatim", () => {
  it("reads the first result's name, point and country", () => {
    const json = [
      {
        lat: "38.7077507",
        lon: "-9.1365919",
        display_name: "Lisboa, Portugal",
        name: "Lisboa",
        address: { city: "Lisboa", country: "Portugal", country_code: "pt" },
      },
    ];
    expect(parseNominatim(json)).toEqual({ label: "Lisboa, Portugal", lat: 38.7077507, lng: -9.1365919, countryCode: "pt" });
  });

  it("returns null for no results or junk", () => {
    expect(parseNominatim([])).toBeNull();
    expect(parseNominatim({ error: "x" })).toBeNull();
    expect(parseNominatim([{ lat: "x", lon: "y" }])).toBeNull();
  });

  it("shortens a long address to city, country", () => {
    const json = [{ lat: "1", lon: "2", display_name: "Rua X, Paço de Arcos, Oeiras, Lisboa, 2780, Portugal", name: "Paço de Arcos", address: { town: "Paço de Arcos", country: "Portugal", country_code: "pt" } }];
    expect(parseNominatim(json)?.label).toBe("Paço de Arcos, Portugal");
  });
});

describe("rates", () => {
  it("reads the ECB rate for 1 local unit in USD", () => {
    expect(parseFrankfurter({ amount: 1, base: "EUR", date: "2026-10-07", rates: { USD: 1.1612 } })).toEqual({ usdRate: 1.16, usdRateDate: "2026-10-07" });
    expect(parseFrankfurter({ message: "not found" })).toBeNull();
  });

  it("USD is 1, a failed lookup falls back to 1 with no date", async () => {
    const down: RateSource = { latest: async () => null };
    expect(await usdRateFor("USD", down)).toEqual({ usdRate: 1, usdRateDate: "" });
    expect(await usdRateFor("EUR", down)).toEqual({ usdRate: 1, usdRateDate: "" });
    const up: RateSource = { latest: async () => ({ usdRate: 0.0067, usdRateDate: "2026-10-07" }) };
    expect(await usdRateFor("JPY", up)).toEqual({ usdRate: 0.0067, usdRateDate: "2026-10-07" });
  });
});

describe("FakeGeocoder", () => {
  it("finds what it was given, case-insensitively", async () => {
    const g = new FakeGeocoder({ lisbon: { label: "Lisbon, Portugal", lat: 1, lng: 2, countryCode: "pt" } });
    expect(await g.find("  LISBON ")).toMatchObject({ label: "Lisbon, Portugal" });
    expect(await g.find("Atlantis")).toBeNull();
  });
});
