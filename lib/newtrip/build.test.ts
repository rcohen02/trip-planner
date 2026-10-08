import { describe, expect, it } from "vitest";
import { countryInfo, slugFor, tripFromDraft } from "./build";
import { emptyDraft, type TripDraft } from "./steps";
import { emptyProfile, type Profile } from "../profile/types";

const draft: TripDraft = {
  ...emptyDraft(),
  destination: { label: "Lisbon, Portugal", lat: 38.72, lng: -9.14, countryCode: "pt" },
  start: "2026-10-09",
  end: "2026-10-12",
  groupId: "g-family",
  homebase: { label: "The house", address: "Rua X 1, Paço de Arcos", lat: 38.69, lng: -9.28, found: true },
  overrides: "Focus on food",
  transport: ["transit"],
  plan: "draft",
  confirmed: ["different"],
};

const profile: Profile = {
  ...emptyProfile(),
  adults: 2,
  travelers: [
    { id: "t1", label: "Boy", birthYear: 2016 },
    { id: "t2", label: "Girl", birthYear: 2019 },
  ],
  groups: [
    { id: "g-family", name: "Whole family", travelerIds: ["t1", "t2"], hikingMilesPerDay: 5 },
    { id: "g-adults", name: "Just us two", travelerIds: [], hikingMilesPerDay: null },
  ],
};

describe("countryInfo", () => {
  it("knows the time zone and currency for common countries, from the two-letter code", () => {
    expect(countryInfo("pt")).toEqual({ timezone: "Europe/Lisbon", currency: "EUR" });
    expect(countryInfo("GB")).toEqual({ timezone: "Europe/London", currency: "GBP" });
    expect(countryInfo("jp")).toEqual({ timezone: "Asia/Tokyo", currency: "JPY" });
    expect(countryInfo("zz")).toBeNull();
  });
});

describe("slugFor", () => {
  it("is the city and year, made unique against taken slugs", () => {
    expect(slugFor("Lisbon, Portugal", "2026-10-09", [])).toBe("lisbon-2026");
    expect(slugFor("Lisbon, Portugal", "2026-10-09", ["lisbon-2026"])).toBe("lisbon-2026-2");
    expect(slugFor("São Miguel, Azores", "2027-06-01", [])).toBe("sao-miguel-2027");
  });
});

describe("tripFromDraft", () => {
  const trip = tripFromDraft(draft, profile, { email: "rob@x.com", name: "Rob Cohen" }, { usdRate: 1.16, usdRateDate: "2026-10-08", taken: [] });

  it("names the trip for the city and fills logistics from the answers", () => {
    expect(trip).toMatchObject({
      slug: "lisbon-2026",
      name: "Lisbon",
      destination: "Lisbon, Portugal",
      timezone: "Europe/Lisbon",
      homeTimezone: "America/New_York",
      localCurrency: "EUR",
      usdRate: 1.16,
      usdRateDate: "2026-10-08",
      homebase: { label: "The house", address: "Rua X 1, Paço de Arcos", lat: 38.69, lng: -9.28 },
      flights: [],
      places: [],
    });
  });

  it("lists the owner and the group's kids as travelers", () => {
    expect(trip.travelers).toEqual([{ name: "Rob", email: "rob@x.com" }, { name: "Boy" }, { name: "Girl" }]);
  });

  it("makes one day per date with the usual slots, night optional", () => {
    expect(trip.days.map((d) => [d.date, d.label])).toEqual([
      ["2026-10-09", "Fri"],
      ["2026-10-10", "Sat"],
      ["2026-10-11", "Sun"],
      ["2026-10-12", "Mon"],
    ]);
    expect(trip.days[1]).toMatchObject({ slots: ["morning", "lunch", "afternoon", "dinner", "night"], optional: ["night"] });
    expect(trip.days[0].note).toBe("Arrival day");
    expect(trip.days[3].note).toBe("Departure day");
  });

  it("keeps the planning answers for research (3b)", () => {
    expect(trip.planning).toEqual({ groupId: "g-family", overrides: "Focus on food", transport: ["transit"], plan: "draft" });
  });

  it("uses the home time zone the owner asked for, else New York", () => {
    expect(tripFromDraft(draft, profile, { email: "a@x.com", name: "A" }, { usdRate: 1, usdRateDate: "", taken: [], homeTimezone: "Europe/London" }).homeTimezone).toBe(
      "Europe/London",
    );
  });

  it("refuses an unfinished draft", () => {
    expect(() => tripFromDraft({ ...draft, homebase: null }, profile, { email: "a@x.com", name: "A" }, { usdRate: 1, usdRateDate: "", taken: [] })).toThrow(/staying/);
  });
});
