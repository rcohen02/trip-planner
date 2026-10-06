import type { Profile } from "./types";

/** Why a profile changed: typed by the owner, imported from notes, or accepted from an end-of-trip proposal. */
export type ChangeReason = "manual" | "import" | "setup" | "proposal";

export interface ProfileChangeRow {
  id: string;
  reason: ChangeReason;
  /** Plain words shown in the history, e.g. "Drive radius 90 → 60 min". */
  summary: string;
  /** ISO instant. */
  at: string;
  undone: boolean;
}

/** One travel profile per user, with a history of every change. Emails are stored lower-case. */
export interface ProfileRepo {
  get(email: string): Promise<Profile | null>;
  save(email: string, profile: Profile, change: { reason: ChangeReason; summary: string }): Promise<void>;
  /** Newest first. */
  history(email: string): Promise<ProfileChangeRow[]>;
  /** Puts the profile back to how it was before this change. Only the latest change that isn't undone. */
  undo(email: string, changeId: string): Promise<void>;
}

export function newChangeId(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(9))).toString("base64url");
}
