import type { PrismaClient, Prisma } from "@/lib/generated/prisma/client";
import { norm } from "../trips/types";
import { emptyDraft, type TripDraft } from "./steps";

/** One trip-in-progress per person, saved after each answer, cleared when the trip is created. */
export interface DraftRepo {
  get(email: string): Promise<TripDraft | null>;
  save(email: string, draft: TripDraft): Promise<void>;
  clear(email: string): Promise<void>;
}

/** Fills in fields a stored draft from an older version lacks. */
const read = (raw: unknown): TripDraft => ({ ...emptyDraft(), ...(raw as Partial<TripDraft>) });

export class MemoryDraftRepo implements DraftRepo {
  private drafts = new Map<string, TripDraft>();
  async get(email: string) {
    const d = this.drafts.get(norm(email));
    return d ? structuredClone(d) : null;
  }
  async save(email: string, draft: TripDraft) {
    this.drafts.set(norm(email), structuredClone(draft));
  }
  async clear(email: string) {
    this.drafts.delete(norm(email));
  }
}

export class PrismaDraftRepo implements DraftRepo {
  constructor(private db: PrismaClient) {}
  async get(email: string) {
    const row = await this.db.tripDraft.findUnique({ where: { email: norm(email) } });
    return row ? read(row.data) : null;
  }
  async save(email: string, draft: TripDraft) {
    const e = norm(email);
    const data = draft as unknown as Prisma.InputJsonValue;
    await this.db.tripDraft.upsert({ where: { email: e }, create: { email: e, data }, update: { data } });
  }
  async clear(email: string) {
    await this.db.tripDraft.deleteMany({ where: { email: norm(email) } });
  }
}
