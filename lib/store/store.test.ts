import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "./memory";
import { createPrisma, PrismaStore } from "./prisma";
import type { PlanStore } from "./types";

const dbUrl = process.env.TEST_DATABASE_URL;
const prisma = dbUrl ? createPrisma(dbUrl) : null;

const makers: [string, () => PlanStore][] = [["memory", () => new MemoryStore()]];
if (prisma) makers.push(["postgres", () => new PrismaStore(prisma)]);

describe.each(makers)("PlanStore (%s)", (_name, make) => {
  beforeEach(async () => {
    if (prisma) {
      await prisma.slotAssignment.deleteMany();
      await prisma.todoState.deleteMany();
      await prisma.tripShare.deleteMany();
      await prisma.extraSlot.deleteMany();
      await prisma.slotLabel.deleteMany();
      await prisma.booking.deleteMany();
    }
  });

  it("assigns a place to a slot and moves it if placed again", async () => {
    const s = make();
    await s.assign("lis", "d1:morning", "maat");
    await s.assign("lis", "d1:lunch", "canalha");
    await s.assign("lis", "d2:morning", "maat"); // moved, not duplicated
    expect(await s.assignments("lis")).toEqual({ "d1:lunch": "canalha", "d2:morning": "maat" });
  });

  it("replacing a slot's card sends the old one back to unscheduled", async () => {
    const s = make();
    await s.assign("lis", "d1:morning", "maat");
    await s.assign("lis", "d1:morning", "macam");
    expect(await s.assignments("lis")).toEqual({ "d1:morning": "macam" });
  });

  it("unassigns a place wherever it is", async () => {
    const s = make();
    await s.assign("lis", "d1:morning", "maat");
    await s.unassign("lis", "maat");
    expect(await s.assignments("lis")).toEqual({});
  });

  it("keeps trips separate and tracks to-do state", async () => {
    const s = make();
    await s.assign("lis", "d1:morning", "maat");
    expect(await s.assignments("other")).toEqual({});
    await s.setTodo("lis", "book-canalha", true);
    expect(await s.todos("lis")).toEqual({ "book-canalha": true });
    await s.setTodo("lis", "book-canalha", false);
    expect(await s.todos("lis")).toEqual({ "book-canalha": false });
  });

  it("creates one active share link per trip, resolves and revokes it", async () => {
    const s = make();
    const a = await s.share("lis");
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(await s.share("lis")).toEqual(a); // same active link
    expect(await s.resolveShare(a.token)).toBe("lis");
    await s.revokeShare("lis");
    expect(await s.resolveShare(a.token)).toBeNull();
    expect(await s.activeShare("lis")).toBeNull();
    expect((await s.share("lis")).token).not.toBe(a.token);
  });

  it("adds labeled slots per trip and removing one sends its place back", async () => {
    const s = make();
    const a = await s.addSlot("lis", { date: "2026-10-10", after: "2026-10-10:afternoon", label: "Afternoon 2" });
    expect(a.id).toMatch(/^2026-10-10:x-/);
    expect(await s.extraSlots("lis")).toEqual([a]);
    expect(await s.extraSlots("other")).toEqual([]);
    await s.assign("lis", a.id, "maat");
    await s.removeSlot("lis", a.id);
    expect(await s.extraSlots("lis")).toEqual([]);
    expect(await s.assignments("lis")).toEqual({});
  });

  it("swaps two planned places when one moves onto the other's slot", async () => {
    const s = make();
    await s.assign("lis", "d1:morning", "maat");
    await s.assign("lis", "d1:afternoon", "macam");
    await s.assign("lis", "d1:morning", "macam");
    expect(await s.assignments("lis")).toEqual({ "d1:morning": "macam", "d1:afternoon": "maat" });
  });

  it("renames base slots and added slots, and resets a base name", async () => {
    const s = make();
    const x = await s.addSlot("lis", { date: "2026-10-10", after: "2026-10-10:afternoon", label: "Afternoon 2" });
    await s.renameSlot("lis", "2026-10-10:lunch", "Canalha lunch");
    await s.renameSlot("lis", x.id, "Gelato");
    expect(await s.layout("lis")).toEqual({ extras: [{ ...x, label: "Gelato" }], labels: { "2026-10-10:lunch": "Canalha lunch" } });
    await s.renameSlot("lis", "2026-10-10:lunch", null);
    expect((await s.layout("lis")).labels).toEqual({});
  });

  it("saves one booking per place and clears it", async () => {
    const s = make();
    const b = { placeId: "canalha", date: "2026-10-10", time: "19:00", confirmation: "RC4", note: null };
    await s.setBooking("lis", b);
    await s.setBooking("lis", { ...b, time: "19:30" });
    expect(await s.bookings("lis")).toEqual({ canalha: { ...b, time: "19:30" } });
    expect(await s.bookings("other")).toEqual({});
    await s.clearBooking("lis", "canalha");
    expect(await s.bookings("lis")).toEqual({});
  });
});
