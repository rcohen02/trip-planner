import { createPrisma } from "@/lib/store/prisma";
import { MemoryProfileRepo } from "./memory";
import { PrismaProfileRepo } from "./prisma";
import type { ProfileRepo } from "./repo";

const g = globalThis as unknown as { __t2tProfiles?: ProfileRepo };

function methods(cls: { prototype: object }): string[] {
  return Object.getOwnPropertyNames(cls.prototype).filter((k) => k !== "constructor");
}

/** Profiles: Postgres when DATABASE_URL is set, otherwise in memory for local runs (reset on restart). */
export function getProfileRepo(): ProfileRepo {
  const url = process.env.DATABASE_URL;
  const Cls = url ? PrismaProfileRepo : MemoryProfileRepo;
  const cached = g.__t2tProfiles as unknown as Record<string, unknown> | undefined;
  if (!cached || methods(Cls).some((k) => typeof cached[k] !== "function")) {
    g.__t2tProfiles = url ? new PrismaProfileRepo(createPrisma(url)) : new MemoryProfileRepo();
  }
  return g.__t2tProfiles!;
}
