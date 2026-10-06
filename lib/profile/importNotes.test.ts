import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { importNotes } from "./importNotes";

const fixture = readFileSync(join(__dirname, "../fixtures/travel-notes.md"), "utf8");

describe("importNotes", () => {
  const p = importNotes(fixture);

  it("reads the adults and each child with a birth year", () => {
    expect(p.adults).toBe(2);
    expect(p.travelers.map((t) => [t.label, t.birthYear])).toEqual([
      ["Girl", 2014],
      ["Boy", 2018],
      ["Boy", 2021],
    ]);
  });

  it("makes a Whole family group (with the hiking cap) and an adults-only group", () => {
    expect(p.groups.map((g) => g.name)).toEqual(["Whole family", "Just us two"]);
    expect(p.groups[0].travelerIds).toEqual(p.travelers.map((t) => t.id));
    expect(p.groups[0].hikingMilesPerDay).toBe(3);
    expect(p.groups[1].travelerIds).toEqual([]);
    expect(p.groups[1].hikingMilesPerDay).toBeNull();
  });

  it("reads the drive radius and the never-hotels rule", () => {
    expect(p.limits).toEqual({ driveMinutes: 60, lodging: "house", neverHotels: true });
  });

  it("reads pace, food and the local-first rule", () => {
    expect(p.pace).toBe("both");
    expect(p.food).toEqual({ restrictions: ["Vegetarian", "no peanuts"], favorites: ["Dumplings and noodle shops"], localFirst: true });
  });

  it("reads ranked interests with their details", () => {
    expect(p.interests).toEqual([
      { name: "Science & Museums", detail: "hands-on science centers and planetariums" },
      { name: "Water", detail: "beaches with calm water and tide pools" },
    ]);
  });

  it("reads what never to suggest", () => {
    expect(p.avoid).toEqual(["Hotels or lodging of any kind", "Theme parks"]);
  });

  it("reads 'No dietary restrictions' as none", () => {
    expect(importNotes("## Food Philosophy\n\n- No dietary restrictions.\n").food.restrictions).toEqual([]);
  });

  it("reads notes pasted into a form (browsers send \\r\\n line endings)", () => {
    expect(importNotes(fixture.replace(/\n/g, "\r\n"))).toEqual(p);
  });

  it("leaves anything missing empty so setup can ask for it", () => {
    const empty = importNotes("# Nothing here");
    expect(empty.travelers).toEqual([]);
    expect(empty.interests).toEqual([]);
    expect(empty.limits.driveMinutes).toBeNull();
    expect(empty.groups).toEqual([]);
  });
});
