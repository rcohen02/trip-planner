import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { Trip } from "../content/types";
import { norm, type AppUser, type TripMemberRow, type TripRepo, type TripRole } from "./types";

type Json = Parameters<PrismaClient["trip"]["create"]>[0]["data"]["data"];

/** Trips and users in Postgres. */
export class PrismaTripRepo implements TripRepo {
  constructor(private db: PrismaClient) {}

  async getTrip(slug: string) {
    const row = await this.db.trip.findUnique({ where: { slug } });
    return row ? (row.data as unknown as Trip) : null;
  }

  async saveTrip(trip: Trip, byEmail: string) {
    const data = trip as unknown as Json;
    const startDate = trip.days[0]?.date ?? "";
    const exists = await this.db.trip.findUnique({ where: { slug: trip.slug }, select: { slug: true } });
    if (exists) {
      await this.db.trip.update({ where: { slug: trip.slug }, data: { data, startDate } });
      return;
    }
    await this.db.$transaction([
      this.db.trip.create({ data: { slug: trip.slug, data, startDate, createdBy: norm(byEmail) } }),
      this.db.tripMember.create({ data: { slug: trip.slug, email: norm(byEmail), role: "owner" } }),
    ]);
  }

  async slugs() {
    return (await this.db.trip.findMany({ select: { slug: true } })).map((r) => r.slug);
  }

  async tripsFor(email: string) {
    const slugs = (await this.db.tripMember.findMany({ where: { email: norm(email) }, select: { slug: true } })).map((r) => r.slug);
    const rows = await this.db.trip.findMany({ where: { slug: { in: slugs } }, orderBy: { startDate: "asc" } });
    return rows.map((r) => r.data as unknown as Trip);
  }

  async members(slug: string): Promise<TripMemberRow[]> {
    const rows = await this.db.tripMember.findMany({ where: { slug }, orderBy: { email: "asc" } });
    return rows.map((r) => ({ email: r.email, role: r.role as TripRole }));
  }

  async addMember(slug: string, email: string, role: TripRole) {
    const e = norm(email);
    await this.db.tripMember.upsert({ where: { slug_email: { slug, email: e } }, create: { slug, email: e, role }, update: { role } });
  }

  async canOpen(slug: string, email: string) {
    const e = norm(email);
    const [trip, member, user] = await Promise.all([
      this.db.trip.findUnique({ where: { slug }, select: { slug: true } }),
      this.db.tripMember.findUnique({ where: { slug_email: { slug, email: e } } }),
      this.db.user.findUnique({ where: { email: e } }),
    ]);
    return Boolean(trip && (member || user?.admin));
  }

  async user(email: string): Promise<AppUser | null> {
    const u = await this.db.user.findUnique({ where: { email: norm(email) } });
    return u ? { email: u.email, admin: u.admin, ...(u.name ? { name: u.name } : {}) } : null;
  }

  async userEmails() {
    return (await this.db.user.findMany({ select: { email: true }, orderBy: { email: "asc" } })).map((u) => u.email);
  }

  async addUser(user: AppUser) {
    const e = norm(user.email);
    await this.db.user.upsert({ where: { email: e }, create: { email: e, admin: user.admin, name: user.name ?? null }, update: {} });
  }

  async invite(email: string, byEmail: string) {
    const e = norm(email);
    await this.db.invite.upsert({ where: { email: e }, create: { email: e, invitedBy: norm(byEmail) }, update: { acceptedAt: null } });
  }

  async isInvited(email: string) {
    const i = await this.db.invite.findUnique({ where: { email: norm(email) } });
    return Boolean(i && !i.acceptedAt);
  }

  async acceptInvite(email: string, name?: string) {
    const e = norm(email);
    if (!(await this.isInvited(e))) return;
    await this.db.invite.update({ where: { email: e }, data: { acceptedAt: new Date() } });
    await this.addUser({ email: e, admin: false, name });
  }
}
