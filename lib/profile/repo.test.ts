import { beforeEach, describe, expect, it } from "vitest";
import { createPrisma } from "../store/prisma";
import { MemoryProfileRepo } from "./memory";
import { PrismaProfileRepo } from "./prisma";
import type { ProfileRepo } from "./repo";
import { emptyProfile, type Profile } from "./types";

const dbUrl = process.env.TEST_DATABASE_URL;
const prisma = dbUrl ? createPrisma(dbUrl) : null;

const makers: [string, () => ProfileRepo][] = [["memory", () => new MemoryProfileRepo()]];
if (prisma) makers.push(["postgres", () => new PrismaProfileRepo(prisma)]);

const withDrive = (m: number): Profile => ({ ...emptyProfile(), limits: { driveMinutes: m, lodging: "house", neverHotels: true } });

describe.each(makers)("ProfileRepo (%s)", (_name, make) => {
  beforeEach(async () => {
    if (prisma) {
      await prisma.profileChange.deleteMany();
      await prisma.profile.deleteMany();
    }
  });

  it("has no profile until one is saved; then reads it back", async () => {
    const r = make();
    expect(await r.get("rob@x.com")).toBeNull();
    await r.save("Rob@x.com", withDrive(90), { reason: "import", summary: "Imported from travel notes" });
    expect(await r.get("rob@x.com")).toEqual(withDrive(90));
  });

  it("keeps each person's profile separate", async () => {
    const r = make();
    await r.save("a@x.com", withDrive(30), { reason: "manual", summary: "a" });
    await r.save("b@x.com", withDrive(60), { reason: "manual", summary: "b" });
    expect((await r.get("a@x.com"))?.limits.driveMinutes).toBe(30);
    expect((await r.get("b@x.com"))?.limits.driveMinutes).toBe(60);
  });

  it("logs every change, newest first, with why it happened", async () => {
    const r = make();
    await r.save("rob@x.com", withDrive(90), { reason: "import", summary: "Imported from travel notes" });
    await r.save("rob@x.com", withDrive(60), { reason: "manual", summary: "Drive radius 90 → 60 min" });
    const h = await r.history("rob@x.com");
    expect(h.map((c) => [c.reason, c.summary, c.undone])).toEqual([
      ["manual", "Drive radius 90 → 60 min", false],
      ["import", "Imported from travel notes", false],
    ]);
    expect(typeof h[0].id).toBe("string");
    expect(h[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("undo puts the profile back to before that change and marks it undone", async () => {
    const r = make();
    await r.save("rob@x.com", withDrive(90), { reason: "import", summary: "first" });
    await r.save("rob@x.com", withDrive(60), { reason: "manual", summary: "second" });
    const [latest] = await r.history("rob@x.com");
    await r.undo("rob@x.com", latest.id);
    expect((await r.get("rob@x.com"))?.limits.driveMinutes).toBe(90);
    expect((await r.history("rob@x.com"))[0].undone).toBe(true);
  });

  it("undoing the very first change removes the profile", async () => {
    const r = make();
    await r.save("rob@x.com", withDrive(90), { reason: "import", summary: "first" });
    const [only] = await r.history("rob@x.com");
    await r.undo("rob@x.com", only.id);
    expect(await r.get("rob@x.com")).toBeNull();
  });

  it("only the latest change can be undone; someone else's change can't", async () => {
    const r = make();
    await r.save("rob@x.com", withDrive(90), { reason: "import", summary: "first" });
    await r.save("rob@x.com", withDrive(60), { reason: "manual", summary: "second" });
    const [, older] = await r.history("rob@x.com");
    await expect(r.undo("rob@x.com", older.id)).rejects.toThrow(/latest/);
    const [latest] = await r.history("rob@x.com");
    await expect(r.undo("other@x.com", latest.id)).rejects.toThrow();
  });
});
