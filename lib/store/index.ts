import { MemoryStore } from "./memory";
import { createPrisma, PrismaStore } from "./prisma";
import type { PlanStore } from "./types";

const g = globalThis as unknown as { __t2tStore?: PlanStore };

/** Method names the current store class has. */
function methods(cls: { prototype: object }): string[] {
  return Object.getOwnPropertyNames(cls.prototype).filter((k) => k !== "constructor");
}

/**
 * Postgres when DATABASE_URL is set; otherwise an in-memory store for local runs.
 * The store is cached on globalThis so `next dev` hot reloads keep it. If the code changed
 * and the cached store is missing newer methods, replace it (local test data is reset).
 */
export function getStore(): PlanStore {
  const url = process.env.DATABASE_URL;
  const Cls = url ? PrismaStore : MemoryStore;
  const cached = g.__t2tStore as unknown as Record<string, unknown> | undefined;
  if (!cached || methods(Cls).some((k) => typeof cached[k] !== "function")) {
    g.__t2tStore = url ? new PrismaStore(createPrisma(url)) : new MemoryStore();
  }
  return g.__t2tStore!;
}
export type { PlanStore } from "./types";
