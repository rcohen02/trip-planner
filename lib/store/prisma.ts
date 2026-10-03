import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import type { Assignments } from "../plan/plan";
import { newToken, type PlanStore, type Share } from "./types";

export function createPrisma(url: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export class PrismaStore implements PlanStore {
  constructor(private db: PrismaClient) {}

  async assignments(trip: string): Promise<Assignments> {
    const rows = await this.db.slotAssignment.findMany({ where: { trip } });
    return Object.fromEntries(rows.map((r) => [r.slotId, r.placeId]));
  }

  async assign(trip: string, slotId: string, placeId: string, by?: string) {
    await this.db.$transaction([
      this.db.slotAssignment.deleteMany({ where: { trip, OR: [{ placeId }, { slotId }] } }),
      this.db.slotAssignment.create({ data: { trip, slotId, placeId, updatedBy: by ?? null } }),
    ]);
  }

  async unassign(trip: string, placeId: string) {
    await this.db.slotAssignment.deleteMany({ where: { trip, placeId } });
  }

  async todos(trip: string) {
    const rows = await this.db.todoState.findMany({ where: { trip } });
    return Object.fromEntries(rows.map((r) => [r.todoId, r.done]));
  }

  async setTodo(trip: string, todoId: string, done: boolean) {
    await this.db.todoState.upsert({
      where: { trip_todoId: { trip, todoId } },
      create: { trip, todoId, done },
      update: { done },
    });
  }

  async activeShare(trip: string): Promise<Share | null> {
    const s = await this.db.tripShare.findFirst({ where: { trip, revokedAt: null }, orderBy: { createdAt: "desc" } });
    return s ? { token: s.token, createdAt: s.createdAt.toISOString() } : null;
  }

  async share(trip: string): Promise<Share> {
    const active = await this.activeShare(trip);
    if (active) return active;
    const s = await this.db.tripShare.create({ data: { trip, token: newToken() } });
    return { token: s.token, createdAt: s.createdAt.toISOString() };
  }

  async resolveShare(token: string) {
    const s = await this.db.tripShare.findUnique({ where: { token } });
    return s && !s.revokedAt ? s.trip : null;
  }

  async revokeShare(trip: string) {
    await this.db.tripShare.updateMany({ where: { trip, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
