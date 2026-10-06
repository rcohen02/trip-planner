import { describe, expect, it } from "vitest";
import { addWriteIn, initialBuckets, moveChip } from "./buckets";

const keys = ["must", "fit", "pass"] as const;

describe("buckets", () => {
  it("starts with picked items in their buckets and the rest of the options in the pool", () => {
    const b = initialBuckets(keys, ["A", "B", "C", "D"], { must: ["B"], fit: [], pass: ["Mine"] });
    expect(b).toEqual({ pool: ["A", "C", "D"], must: ["B"], fit: [], pass: ["Mine"] });
  });

  it("moves an item to a bucket (to the end), and back to the pool in its original spot", () => {
    let b = initialBuckets(keys, ["A", "B", "C"], { must: [], fit: [], pass: [] });
    b = moveChip(b, "B", "must");
    b = moveChip(b, "A", "must");
    expect(b.must).toEqual(["B", "A"]);
    b = moveChip(b, "B", "fit");
    expect(b).toEqual({ pool: ["C"], must: ["A"], fit: ["B"], pass: [] });
    b = moveChip(b, "A", "pool", ["A", "B", "C"]);
    expect(b.pool).toEqual(["A", "C"]);
  });

  it("moving to the bucket it's already in does nothing", () => {
    const b = initialBuckets(keys, ["A"], { must: ["A"], fit: [], pass: [] });
    expect(moveChip(b, "A", "must")).toEqual(b);
  });

  it("adds a write-in straight into a bucket, trimmed; typing an existing one again (any case) moves it there", () => {
    let b = initialBuckets(keys, ["Seafood"], { must: [], fit: [], pass: [] });
    b = addWriteIn(b, "  Night markets ", "fit");
    b = addWriteIn(b, "night markets", "must");
    b = addWriteIn(b, "seafood", "pass");
    b = addWriteIn(b, "   ", "must");
    expect(b).toEqual({ pool: [], must: ["Night markets"], fit: [], pass: ["Seafood"] });
  });
});
