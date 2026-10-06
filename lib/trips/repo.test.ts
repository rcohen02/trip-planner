import { beforeEach, describe, expect, it } from "vitest";
import { createPrisma } from "../store/prisma";
import { MemoryTripRepo } from "./memory";
import { PrismaTripRepo } from "./prisma";
import type { TripRepo } from "./types";
import type { Trip } from "../content/types";

const dbUrl = process.env.TEST_DATABASE_URL;
const prisma = dbUrl ? createPrisma(dbUrl) : null;

const makers: [string, () => TripRepo][] = [["memory", () => new MemoryTripRepo()]];
if (prisma) makers.push(["postgres", () => new PrismaTripRepo(prisma)]);

function trip(slug: string, start: string, placeIds: string[] = ["maat"]): Trip {
  return {
    slug,
    name: slug,
    days: [{ date: start }],
    places: placeIds.map((id) => ({ id, name: id })),
  } as unknown as Trip;
}

describe.each(makers)("TripRepo (%s)", (_name, make) => {
  beforeEach(async () => {
    if (prisma) {
      await prisma.tripMember.deleteMany();
      await prisma.trip.deleteMany();
      await prisma.invite.deleteMany();
      await prisma.user.deleteMany();
    }
  });

  it("saves a trip and reads it back whole, place ids unchanged", async () => {
    const r = make();
    const t = trip("lisbon-2026", "2026-10-09", ["maat", "canalha"]);
    await r.saveTrip(t, "rob@x.com");
    expect(await r.getTrip("lisbon-2026")).toEqual(t);
    expect(await r.getTrip("nope")).toBeNull();
  });

  it("makes whoever saves a new trip its owner", async () => {
    const r = make();
    await r.saveTrip(trip("lisbon-2026", "2026-10-09"), "Rob@x.com");
    expect(await r.members("lisbon-2026")).toEqual([{ email: "rob@x.com", role: "owner" }]);
  });

  it("lists only the trips a user is on, earliest first", async () => {
    const r = make();
    await r.saveTrip(trip("rome", "2027-04-01"), "rob@x.com");
    await r.saveTrip(trip("lisbon", "2026-10-09"), "rob@x.com");
    await r.saveTrip(trip("paris", "2026-12-01"), "other@x.com");
    await r.addMember("paris", "d@x.com", "member");
    expect((await r.tripsFor("rob@x.com")).map((t) => t.slug)).toEqual(["lisbon", "rome"]);
    expect((await r.tripsFor("D@x.com")).map((t) => t.slug)).toEqual(["paris"]);
  });

  it("knows whether someone can open a trip; admins can open any", async () => {
    const r = make();
    await r.addUser({ email: "admin@x.com", admin: true });
    await r.addUser({ email: "d@x.com", admin: false });
    await r.saveTrip(trip("lisbon", "2026-10-09"), "rob@x.com");
    expect(await r.canOpen("lisbon", "rob@x.com")).toBe(true);
    expect(await r.canOpen("lisbon", "admin@x.com")).toBe(true);
    expect(await r.canOpen("lisbon", "d@x.com")).toBe(false);
    expect(await r.canOpen("nope", "admin@x.com")).toBe(false);
  });

  it("updating a trip keeps its owner and members", async () => {
    const r = make();
    await r.saveTrip(trip("lisbon", "2026-10-09"), "rob@x.com");
    await r.addMember("lisbon", "d@x.com", "member");
    await r.saveTrip(trip("lisbon", "2026-10-10", ["maat", "new"]), "d@x.com");
    expect((await r.getTrip("lisbon"))?.places.map((p) => p.id)).toEqual(["maat", "new"]);
    expect(await r.members("lisbon")).toEqual([
      { email: "d@x.com", role: "member" },
      { email: "rob@x.com", role: "owner" },
    ]);
  });

  it("adds users once, case-insensitively, and finds them", async () => {
    const r = make();
    await r.addUser({ email: "Rob@x.com", admin: true, name: "Rob" });
    await r.addUser({ email: "rob@x.com", admin: false });
    expect(await r.user("ROB@x.com")).toEqual({ email: "rob@x.com", admin: true, name: "Rob" });
    expect(await r.user("nobody@x.com")).toBeNull();
    expect(await r.userEmails()).toEqual(["rob@x.com"]);
  });

  it("an invite lets a new person sign in, and accepting it makes them a user", async () => {
    const r = make();
    await r.invite("new@x.com", "rob@x.com");
    expect(await r.isInvited("NEW@x.com")).toBe(true);
    expect(await r.user("new@x.com")).toBeNull();
    await r.acceptInvite("new@x.com", "New Person");
    expect(await r.user("new@x.com")).toEqual({ email: "new@x.com", admin: false, name: "New Person" });
    expect(await r.isInvited("new@x.com")).toBe(false);
  });

  it("lists trip slugs it holds", async () => {
    const r = make();
    await r.saveTrip(trip("b", "2026-01-02"), "rob@x.com");
    await r.saveTrip(trip("a", "2026-01-01"), "rob@x.com");
    expect((await r.slugs()).sort()).toEqual(["a", "b"]);
  });
});
