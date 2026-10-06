import type { Trip } from "../content/types";

export type TripRole = "owner" | "member";

export interface AppUser {
  email: string;
  admin: boolean;
  name?: string;
}

export interface TripMemberRow {
  email: string;
  role: TripRole;
}

/**
 * Trips, the people on them, and who may sign in. Replaces the bundled content files and the
 * ALLOWED_EMAILS list as the source of truth. Emails are stored lower-case.
 */
export interface TripRepo {
  getTrip(slug: string): Promise<Trip | null>;
  /** Creates or replaces a trip. A new trip's saver becomes its owner; an existing trip keeps its members. */
  saveTrip(trip: Trip, byEmail: string): Promise<void>;
  slugs(): Promise<string[]>;
  /** Trips the user is a member of, earliest start first. */
  tripsFor(email: string): Promise<Trip[]>;
  /** Members sorted by email. */
  members(slug: string): Promise<TripMemberRow[]>;
  addMember(slug: string, email: string, role: TripRole): Promise<void>;
  /** A member of the trip, or an app admin (for a trip that exists). */
  canOpen(slug: string, email: string): Promise<boolean>;

  user(email: string): Promise<AppUser | null>;
  userEmails(): Promise<string[]>;
  /** Adds a user if the email is new; never changes an existing one. */
  addUser(user: AppUser): Promise<void>;
  invite(email: string, byEmail: string): Promise<void>;
  /** An invite that hasn't been accepted yet. */
  isInvited(email: string): Promise<boolean>;
  acceptInvite(email: string, name?: string): Promise<void>;
}

export const norm = (email: string) => email.trim().toLowerCase();

export function byStart(a: Trip, b: Trip): number {
  return (a.days[0]?.date ?? "").localeCompare(b.days[0]?.date ?? "");
}
