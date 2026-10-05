import { describe, expect, it } from "vitest";
import type { Place } from "../content/types";
import { applyShortlist, onlyShortlisted } from "./shortlist";

const at = (id: string) => ({ id, name: id }) as Place;

describe("shortlist", () => {
  it("marks shortlisted places so every page can read place.shortlisted", () => {
    const [a, b] = applyShortlist([at("a"), at("b")], ["b"]);
    expect(a.shortlisted).toBe(false);
    expect(b.shortlisted).toBe(true);
  });

  it("filters to the shortlist only when asked", () => {
    const places = applyShortlist([at("a"), at("b"), at("c")], ["a", "c"]);
    expect(onlyShortlisted(places, false).map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(onlyShortlisted(places, true).map((p) => p.id)).toEqual(["a", "c"]);
  });
});
