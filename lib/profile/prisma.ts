import type { PrismaClient } from "@/lib/generated/prisma/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { norm } from "../trips/types";
import { newChangeId, type ChangeReason, type ProfileChangeRow, type ProfileRepo } from "./repo";
import { normalizeProfile } from "./normalize";
import type { Profile } from "./types";

type Json = Prisma.InputJsonValue;

/** Profiles in Postgres. */
export class PrismaProfileRepo implements ProfileRepo {
  constructor(private db: PrismaClient) {}

  async get(email: string) {
    const row = await this.db.profile.findUnique({ where: { email: norm(email) } });
    return row ? normalizeProfile(row.data) : null;
  }

  async save(email: string, profile: Profile, change: { reason: ChangeReason; summary: string }) {
    const e = norm(email);
    const before = await this.db.profile.findUnique({ where: { email: e } });
    const data = profile as unknown as Json;
    await this.db.$transaction([
      this.db.profile.upsert({ where: { email: e }, create: { email: e, data }, update: { data } }),
      this.db.profileChange.create({
        data: {
          id: newChangeId(),
          email: e,
          reason: change.reason,
          summary: change.summary,
          before: before ? (before.data as Json) : Prisma.JsonNull,
        },
      }),
    ]);
  }

  async history(email: string): Promise<ProfileChangeRow[]> {
    const rows = await this.db.profileChange.findMany({ where: { email: norm(email) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    return rows.map((r) => ({ id: r.id, reason: r.reason as ChangeReason, summary: r.summary, at: r.createdAt.toISOString(), undone: r.undone }));
  }

  async undo(email: string, changeId: string) {
    const e = norm(email);
    const latest = await this.db.profileChange.findFirst({ where: { email: e, undone: false }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    if (!latest || latest.id !== changeId) throw new Error("Only the latest change can be undone");
    const restore = latest.before === null ? null : (latest.before as Json);
    await this.db.$transaction([
      this.db.profileChange.update({ where: { id: latest.id }, data: { undone: true } }),
      restore
        ? this.db.profile.update({ where: { email: e }, data: { data: restore } })
        : this.db.profile.delete({ where: { email: e } }),
    ]);
  }
}
