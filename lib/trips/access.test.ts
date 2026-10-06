import { describe, expect, it } from "vitest";
import { MemoryTripRepo } from "./memory";
import { ensureSeeded, maySignIn, onSignIn } from "./access";
import type { Trip } from "../content/types";

const lisbon = { slug: "lisbon-2026", name: "Lisbon", days: [{ date: "2026-10-09" }], places: [{ id: "maat" }] } as unknown as Trip;

describe("ensureSeeded", () => {
  it("loads bundled trips and allowlisted people into an empty store", async () => {
    const repo = new MemoryTripRepo();
    await ensureSeeded(repo, [lisbon], "rob@x.com,d@x.com");
    expect(await repo.getTrip("lisbon-2026")).toEqual(lisbon);
    expect(await repo.members("lisbon-2026")).toEqual([
      { email: "d@x.com", role: "member" },
      { email: "rob@x.com", role: "owner" },
    ]);
    expect(await repo.user("rob@x.com")).toEqual({ email: "rob@x.com", admin: true });
    expect((await repo.tripsFor("d@x.com")).map((t) => t.slug)).toEqual(["lisbon-2026"]);
  });

  it("never overwrites a trip already in the store", async () => {
    const repo = new MemoryTripRepo();
    const edited = { ...lisbon, name: "Lisbon (edited)" };
    await repo.saveTrip(edited, "rob@x.com");
    await ensureSeeded(repo, [lisbon], "rob@x.com");
    expect((await repo.getTrip("lisbon-2026"))?.name).toBe("Lisbon (edited)");
  });
});

describe("maySignIn", () => {
  it("lets in users, open invites and (during the move) the old allowlist; nobody else", async () => {
    const repo = new MemoryTripRepo();
    await repo.addUser({ email: "rob@x.com", admin: true });
    await repo.invite("new@x.com", "rob@x.com");
    expect(await maySignIn(repo, "Rob@x.com", undefined)).toBe(true);
    expect(await maySignIn(repo, "new@x.com", undefined)).toBe(true);
    expect(await maySignIn(repo, "d@x.com", "rob@x.com,d@x.com")).toBe(true);
    expect(await maySignIn(repo, "stranger@x.com", "rob@x.com")).toBe(false);
    expect(await maySignIn(repo, null, "rob@x.com")).toBe(false);
  });
});

describe("onSignIn", () => {
  it("turns an accepted invite into a user", async () => {
    const repo = new MemoryTripRepo();
    await repo.invite("new@x.com", "rob@x.com");
    await onSignIn(repo, "new@x.com", "New");
    expect(await repo.user("new@x.com")).toEqual({ email: "new@x.com", admin: false, name: "New" });
  });
});

describe("the real Lisbon trip", () => {
  it("survives the move into the store with every place id, day and flight unchanged", async () => {
    const { TRIPS } = await import("@/content/generated/trips");
    const real = TRIPS["lisbon-2026"];
    const repo = new MemoryTripRepo();
    await ensureSeeded(repo, [real], "rob@x.com");
    const back = await repo.getTrip("lisbon-2026");
    expect(back).toEqual(real);
    expect(back!.places.map((p) => p.id)).toEqual(real.places.map((p) => p.id));
    expect(back!.places.some((p) => /hotel/i.test(p.category))).toBe(false);
  });
});
