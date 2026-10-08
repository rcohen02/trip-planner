import { beforeEach, describe, expect, it } from "vitest";
import { createPrisma } from "../store/prisma";
import { MemoryDraftRepo, PrismaDraftRepo, type DraftRepo } from "./drafts";
import { emptyDraft } from "./steps";

const dbUrl = process.env.TEST_DATABASE_URL;
const prisma = dbUrl ? createPrisma(dbUrl) : null;
const makers: [string, () => DraftRepo][] = [["memory", () => new MemoryDraftRepo()]];
if (prisma) makers.push(["postgres", () => new PrismaDraftRepo(prisma)]);

describe.each(makers)("DraftRepo (%s)", (_n, make) => {
  beforeEach(async () => {
    if (prisma) await prisma.tripDraft.deleteMany();
  });

  it("keeps one trip-in-progress per person, saved after each answer", async () => {
    const r = make();
    expect(await r.get("rob@x.com")).toBeNull();
    await r.save("Rob@x.com", { ...emptyDraft(), start: "2026-10-09", end: "2026-10-12" });
    await r.save("rob@x.com", { ...emptyDraft(), start: "2026-11-01", end: "2026-11-03" });
    expect((await r.get("rob@x.com"))?.start).toBe("2026-11-01");
    expect(await r.get("other@x.com")).toBeNull();
  });

  it("clears it once the trip is created or abandoned", async () => {
    const r = make();
    await r.save("rob@x.com", emptyDraft());
    await r.clear("rob@x.com");
    expect(await r.get("rob@x.com")).toBeNull();
    await r.clear("rob@x.com");
  });
});
