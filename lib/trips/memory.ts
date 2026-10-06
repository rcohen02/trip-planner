import type { Trip } from "../content/types";
import { byStart, norm, type AppUser, type TripMemberRow, type TripRepo, type TripRole } from "./types";

const clone = <T>(v: T): T => structuredClone(v);

/** In-memory trips and users, for tests and for running locally without a database. */
export class MemoryTripRepo implements TripRepo {
  private trips = new Map<string, Trip>();
  private memberRows = new Map<string, Map<string, TripRole>>();
  private users = new Map<string, AppUser>();
  private invites = new Map<string, string>();

  async getTrip(slug: string) {
    const t = this.trips.get(slug);
    return t ? clone(t) : null;
  }
  async saveTrip(trip: Trip, byEmail: string) {
    const isNew = !this.trips.has(trip.slug);
    this.trips.set(trip.slug, clone(trip));
    if (isNew) await this.addMember(trip.slug, byEmail, "owner");
  }
  async slugs() {
    return [...this.trips.keys()];
  }
  async tripsFor(email: string) {
    const e = norm(email);
    return [...this.trips.values()].filter((t) => this.memberRows.get(t.slug)?.has(e)).sort(byStart).map(clone);
  }
  async members(slug: string): Promise<TripMemberRow[]> {
    return [...(this.memberRows.get(slug) ?? new Map<string, TripRole>())]
      .map(([email, role]) => ({ email, role }))
      .sort((a, b) => a.email.localeCompare(b.email));
  }
  async addMember(slug: string, email: string, role: TripRole) {
    const m = this.memberRows.get(slug) ?? new Map<string, TripRole>();
    m.set(norm(email), role);
    this.memberRows.set(slug, m);
  }
  async canOpen(slug: string, email: string) {
    if (!this.trips.has(slug)) return false;
    const e = norm(email);
    return Boolean(this.memberRows.get(slug)?.has(e) || this.users.get(e)?.admin);
  }

  async user(email: string) {
    const u = this.users.get(norm(email));
    return u ? { ...u } : null;
  }
  async userEmails() {
    return [...this.users.keys()].sort();
  }
  async addUser(user: AppUser) {
    const e = norm(user.email);
    if (this.users.has(e)) return;
    this.users.set(e, { email: e, admin: user.admin, ...(user.name ? { name: user.name } : {}) });
  }
  async invite(email: string, byEmail: string) {
    this.invites.set(norm(email), norm(byEmail));
  }
  async isInvited(email: string) {
    return this.invites.has(norm(email));
  }
  async acceptInvite(email: string, name?: string) {
    const e = norm(email);
    if (!this.invites.delete(e)) return;
    await this.addUser({ email: e, admin: false, name });
  }
}
