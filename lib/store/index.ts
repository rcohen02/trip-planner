import { MemoryStore } from "./memory";
import { createPrisma, PrismaStore } from "./prisma";
import type { PlanStore } from "./types";

const g = globalThis as unknown as { __t2tStore?: PlanStore };

/** Postgres when DATABASE_URL is set; otherwise an in-memory store for local runs. */
export function getStore(): PlanStore {
  if (!g.__t2tStore) {
    const url = process.env.DATABASE_URL;
    g.__t2tStore = url ? new PrismaStore(createPrisma(url)) : new MemoryStore();
  }
  return g.__t2tStore;
}
export type { PlanStore } from "./types";
