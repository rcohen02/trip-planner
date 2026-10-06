import { norm } from "../trips/types";
import { newChangeId, type ChangeReason, type ProfileChangeRow, type ProfileRepo } from "./repo";
import type { Profile } from "./types";

interface Row extends ProfileChangeRow {
  email: string;
  before: Profile | null;
}

/** In-memory profiles, for tests and for running locally without a database. */
export class MemoryProfileRepo implements ProfileRepo {
  private profiles = new Map<string, Profile>();
  private changes: Row[] = [];

  async get(email: string) {
    const p = this.profiles.get(norm(email));
    return p ? structuredClone(p) : null;
  }

  async save(email: string, profile: Profile, change: { reason: ChangeReason; summary: string }) {
    const e = norm(email);
    const before = this.profiles.get(e) ?? null;
    this.profiles.set(e, structuredClone(profile));
    this.changes.push({ id: newChangeId(), email: e, before, reason: change.reason, summary: change.summary, at: new Date().toISOString(), undone: false });
  }

  async history(email: string): Promise<ProfileChangeRow[]> {
    const e = norm(email);
    return this.changes
      .filter((c) => c.email === e)
      .reverse()
      .map(({ id, reason, summary, at, undone }) => ({ id, reason, summary, at, undone }));
  }

  async undo(email: string, changeId: string) {
    const e = norm(email);
    const latest = this.changes.filter((c) => c.email === e && !c.undone).at(-1);
    if (!latest || latest.id !== changeId) throw new Error("Only the latest change can be undone");
    latest.undone = true;
    if (latest.before) this.profiles.set(e, structuredClone(latest.before));
    else this.profiles.delete(e);
  }
}
