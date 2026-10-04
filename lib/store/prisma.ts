import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { movePlace, type Assignments, type ExtraSlot, type SlotLayout } from "../plan/plan";
import type { Booking } from "../plan/booking";
import type { RouteDraft, RouteRecord } from "../routes/route";
import { newRouteId, newSlotId, newToken, type PlanStore, type Share } from "./types";

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
    // Same rule as the board (plan.movePlace): planned places swap, Unscheduled ones replace.
    const before = await this.assignments(trip);
    const after = movePlace(before, placeId, slotId);
    const changed = Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k]);
    await this.db.$transaction([
      this.db.slotAssignment.deleteMany({ where: { trip, OR: [{ slotId: { in: changed } }, { placeId: { in: changed.map((k) => after[k]).filter((v): v is string => Boolean(v)) } }] } }),
      ...changed
        .filter((k) => after[k])
        .map((k) => this.db.slotAssignment.create({ data: { trip, slotId: k, placeId: after[k]!, updatedBy: by ?? null } })),
    ]);
  }

  async unassign(trip: string, placeId: string) {
    await this.db.slotAssignment.deleteMany({ where: { trip, placeId } });
  }

  async extraSlots(trip: string): Promise<ExtraSlot[]> {
    const rows = await this.db.extraSlot.findMany({ where: { trip }, orderBy: { createdAt: "asc" } });
    return rows.map(({ id, date, after, label }) => ({ id, date, after, label }));
  }

  async routes(trip: string): Promise<RouteRecord[]> {
    const rows = await this.db.route.findMany({ where: { trip }, orderBy: { createdAt: "asc" } });
    return rows.map((r) => ({ id: r.id, name: r.name, line: r.line as [number, number][], startLabel: r.startLabel, endLabel: r.endLabel }));
  }

  async addRoute(trip: string, route: RouteDraft): Promise<RouteRecord> {
    const r = { id: newRouteId(), ...route };
    await this.db.route.create({ data: { trip, ...r } });
    return r;
  }

  async removeRoute(trip: string, id: string) {
    await this.db.route.deleteMany({ where: { trip, id } });
  }

  async hoursChecked(trip: string): Promise<string[]> {
    const rows = await this.db.hoursCheck.findMany({ where: { trip }, orderBy: { createdAt: "asc" } });
    return rows.map((r) => r.placeId);
  }

  async setHoursChecked(trip: string, placeId: string, checked: boolean) {
    if (checked)
      await this.db.hoursCheck.upsert({ where: { trip_placeId: { trip, placeId } }, create: { trip, placeId }, update: {} });
    else await this.db.hoursCheck.deleteMany({ where: { trip, placeId } });
  }

  async bookings(trip: string): Promise<Record<string, Booking>> {
    const rows = await this.db.booking.findMany({ where: { trip } });
    return Object.fromEntries(rows.map(({ placeId, date, time, confirmation, note }) => [placeId, { placeId, date, time, confirmation, note }]));
  }

  async setBooking(trip: string, b: Booking) {
    const data = { date: b.date, time: b.time, confirmation: b.confirmation, note: b.note };
    await this.db.booking.upsert({ where: { trip_placeId: { trip, placeId: b.placeId } }, create: { trip, placeId: b.placeId, ...data }, update: data });
  }

  async clearBooking(trip: string, placeId: string) {
    await this.db.booking.deleteMany({ where: { trip, placeId } });
  }

  async layout(trip: string): Promise<Required<SlotLayout>> {
    const [extras, rows] = await Promise.all([this.extraSlots(trip), this.db.slotLabel.findMany({ where: { trip } })]);
    return { extras, labels: Object.fromEntries(rows.map((r) => [r.slotId, r.label])) };
  }

  async renameSlot(trip: string, slotId: string, label: string | null) {
    const extra = await this.db.extraSlot.findFirst({ where: { trip, id: slotId } });
    if (extra) {
      if (label) await this.db.extraSlot.update({ where: { id: slotId }, data: { label } });
      return;
    }
    if (label)
      await this.db.slotLabel.upsert({ where: { trip_slotId: { trip, slotId } }, create: { trip, slotId, label }, update: { label } });
    else await this.db.slotLabel.deleteMany({ where: { trip, slotId } });
  }

  async addSlot(trip: string, slot: Omit<ExtraSlot, "id">): Promise<ExtraSlot> {
    const x = { id: newSlotId(slot.date), ...slot };
    await this.db.extraSlot.create({ data: { trip, ...x } });
    return x;
  }

  async removeSlot(trip: string, id: string) {
    await this.db.$transaction([
      this.db.slotAssignment.deleteMany({ where: { trip, slotId: id } }),
      // Slots that followed this one now follow what it followed.
      this.db.$executeRaw`UPDATE "ExtraSlot" SET "after" = (SELECT "after" FROM "ExtraSlot" WHERE "trip" = ${trip} AND "id" = ${id}) WHERE "trip" = ${trip} AND "after" = ${id}`,
      this.db.extraSlot.deleteMany({ where: { trip, id } }),
    ]);
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
