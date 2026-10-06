import { describe, expect, it } from "vitest";
import { seedPlan } from "./seed";

const trip = (slug: string) => ({ slug }) as { slug: string };

describe("seedPlan", () => {
  it("turns the allowlist into users, the first one as admin", () => {
    const plan = seedPlan({ trips: [], existingSlugs: [], existingEmails: [], allowlist: "Rob@x.com, d@x.com" });
    expect(plan.users).toEqual([
      { email: "rob@x.com", admin: true },
      { email: "d@x.com", admin: false },
    ]);
  });

  it("imports only bundled trips the database doesn't have yet, with every allowlisted user as a member", () => {
    const plan = seedPlan({
      trips: [trip("lisbon-2026"), trip("rome-2027")],
      existingSlugs: ["rome-2027"],
      existingEmails: [],
      allowlist: "rob@x.com,d@x.com",
    });
    expect(plan.trips.map((t) => t.slug)).toEqual(["lisbon-2026"]);
    expect(plan.members).toEqual([
      { slug: "lisbon-2026", email: "rob@x.com", role: "owner" },
      { slug: "lisbon-2026", email: "d@x.com", role: "member" },
    ]);
  });

  it("does nothing a second time", () => {
    const plan = seedPlan({
      trips: [trip("lisbon-2026")],
      existingSlugs: ["lisbon-2026"],
      existingEmails: ["rob@x.com", "d@x.com"],
      allowlist: "rob@x.com,d@x.com",
    });
    expect(plan).toEqual({ users: [], trips: [], members: [] });
  });

  it("never makes a later allowlisted user an admin once users exist", () => {
    const plan = seedPlan({ trips: [], existingSlugs: [], existingEmails: ["rob@x.com"], allowlist: "rob@x.com,new@x.com" });
    expect(plan.users).toEqual([{ email: "new@x.com", admin: false }]);
  });
});
