import type { Assignments } from "../plan/plan";

export interface Share {
  token: string;
  createdAt: string;
}

/** Everything the site writes. Content (places, flights) is read-only in v1 and comes from content/generated. */
export interface PlanStore {
  assignments(trip: string): Promise<Assignments>;
  /** Put a place in a slot. A place lives in at most one slot; a slot holds one place. */
  assign(trip: string, slotId: string, placeId: string): Promise<void>;
  unassign(trip: string, placeId: string): Promise<void>;
  todos(trip: string): Promise<Record<string, boolean>>;
  setTodo(trip: string, todoId: string, done: boolean): Promise<void>;
  share(trip: string): Promise<Share>;
  activeShare(trip: string): Promise<Share | null>;
  resolveShare(token: string): Promise<string | null>;
  revokeShare(trip: string): Promise<void>;
}

export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}
