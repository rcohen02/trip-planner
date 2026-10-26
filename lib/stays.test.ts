import { describe, expect, it } from "vitest";
import { stayFor, stayOn, type Stay } from "./stays";

const stays: Stay[] = [
  { id: "banff", label: "Banff", address: "Banff, AB", lat: 51.1784, lng: -115.5708, from: "2027-07-03", to: "2027-07-05" },
  { id: "fernie", label: "Fernie", address: "Fernie, BC", lat: 49.5043, lng: -115.0632, from: "2027-07-05", to: "2027-07-08" },
  { id: "glacier", label: "Glacier", address: "West Glacier, MT", lat: 48.4961, lng: -113.9947, from: "2027-07-08", to: "2027-07-10" },
];

describe("stayOn", () => {
  it("returns the stay for a night inside its range", () => {
    expect(stayOn(stays, "2027-07-03")?.id).toBe("banff");
    expect(stayOn(stays, "2027-07-06")?.id).toBe("fernie");
  });

  it("treats the checkout date as the next stay's first night", () => {
    expect(stayOn(stays, "2027-07-05")?.id).toBe("fernie");
    expect(stayOn(stays, "2027-07-08")?.id).toBe("glacier");
  });

  it("returns null for a date outside every stay, including the checkout day of the last stay", () => {
    expect(stayOn(stays, "2027-07-02")).toBeNull();
    expect(stayOn(stays, "2027-07-10")).toBeNull();
  });

  it("returns null when there are no stays", () => {
    expect(stayOn([], "2027-07-03")).toBeNull();
  });
});

describe("Fernie trip stays", () => {
  it("covers every night from July 3 to July 9 with exactly one stay", async () => {
    const { getTrip } = await import("./trips");
    const trip = getTrip("fernie-2027");
    expect(trip?.stays).toBeDefined();
    const nights = ["2027-07-03", "2027-07-04", "2027-07-05", "2027-07-06", "2027-07-07", "2027-07-08", "2027-07-09"];
    for (const night of nights) {
      const covering = (trip?.stays ?? []).filter((s) => s.from <= night && night < s.to);
      expect(covering, night).toHaveLength(1);
    }
  });
});

describe("stayFor", () => {
  const home = { id: "home", label: "Home", address: "Somewhere", lat: 1, lng: 2, from: "", to: "" };
  it("uses the stay covering the night", () => {
    expect(stayFor({ stays, homebase: home }, "2027-07-06")?.id).toBe("fernie");
  });
  it("falls back to the home base for a trip without stays", () => {
    expect(stayFor({ homebase: home }, "2027-07-06")).toEqual(home);
  });
  it("returns null for a night outside the trip's stays", () => {
    expect(stayFor({ stays, homebase: home }, "2027-07-12")).toBeNull();
  });
});
