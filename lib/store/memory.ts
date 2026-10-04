import type { Assignments, ExtraSlot } from "../plan/plan";
import { newSlotId, newToken, type PlanStore, type Share } from "./types";

/** In-memory store for tests and for running locally without a database. */
export class MemoryStore implements PlanStore {
  private slots = new Map<string, Assignments>();
  private todoState = new Map<string, Record<string, boolean>>();
  private shares = new Map<string, Share & { revoked?: boolean }>();
  private extras = new Map<string, ExtraSlot[]>();

  async extraSlots(trip: string) {
    return [...(this.extras.get(trip) ?? [])];
  }
  async addSlot(trip: string, slot: Omit<ExtraSlot, "id">) {
    const x = { id: newSlotId(slot.date), ...slot };
    this.extras.set(trip, [...(this.extras.get(trip) ?? []), x]);
    return x;
  }
  async removeSlot(trip: string, id: string) {
    const list = this.extras.get(trip) ?? [];
    const gone = list.find((x) => x.id === id);
    // Slots that followed this one now follow what it followed.
    this.extras.set(trip, list.filter((x) => x.id !== id).map((x) => (gone && x.after === id ? { ...x, after: gone.after } : x)));
    const a = { ...(this.slots.get(trip) ?? {}) };
    delete a[id];
    this.slots.set(trip, a);
  }

  async assignments(trip: string) {
    return { ...(this.slots.get(trip) ?? {}) };
  }
  async assign(trip: string, slotId: string, placeId: string) {
    const a = { ...(this.slots.get(trip) ?? {}) };
    for (const [k, v] of Object.entries(a)) if (v === placeId) delete a[k];
    a[slotId] = placeId;
    this.slots.set(trip, a);
  }
  async unassign(trip: string, placeId: string) {
    const a = { ...(this.slots.get(trip) ?? {}) };
    for (const [k, v] of Object.entries(a)) if (v === placeId) delete a[k];
    this.slots.set(trip, a);
  }
  async todos(trip: string) {
    return { ...(this.todoState.get(trip) ?? {}) };
  }
  async setTodo(trip: string, todoId: string, done: boolean) {
    this.todoState.set(trip, { ...(this.todoState.get(trip) ?? {}), [todoId]: done });
  }
  async activeShare(trip: string) {
    const s = this.shares.get(trip);
    return s && !s.revoked ? { token: s.token, createdAt: s.createdAt } : null;
  }
  async share(trip: string) {
    const active = await this.activeShare(trip);
    if (active) return active;
    const s = { token: newToken(), createdAt: new Date().toISOString() };
    this.shares.set(trip, s);
    return s;
  }
  async resolveShare(token: string) {
    for (const [trip, s] of this.shares) if (s.token === token && !s.revoked) return trip;
    return null;
  }
  async revokeShare(trip: string) {
    const s = this.shares.get(trip);
    if (s) s.revoked = true;
  }
}
