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
});
