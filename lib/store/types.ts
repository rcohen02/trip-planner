import type { Assignments, ExtraSlot, SlotLayout } from "../plan/plan";
import type { Booking } from "../plan/booking";
import type { RouteDraft, RouteRecord } from "../routes/route";

export interface Share {
  token: string;
  createdAt: string;
}

/** Everything the site writes. Content (places, flights) is read-only in v1 and comes from content/generated. */
export interface PlanStore {
  assignments(trip: string): Promise<Assignments>;
  /** Put a place in a slot (see plan.movePlace: planned places swap; from Unscheduled replaces). */
  assign(trip: string, slotId: string, placeId: string): Promise<void>;
  unassign(trip: string, placeId: string): Promise<void>;
  /** Slots added on the Itinerary board (beyond the ones in trip.json). */
  extraSlots(trip: string): Promise<ExtraSlot[]>;
  /** Added slots plus new names for base slots. */
  layout(trip: string): Promise<Required<SlotLayout>>;
  /** New name for any slot; null puts a base slot back to its default name. */
  renameSlot(trip: string, slotId: string, label: string | null): Promise<void>;
  addSlot(trip: string, slot: Omit<ExtraSlot, "id">): Promise<ExtraSlot>;
  /** Removes the slot and sends any place in it back to Unscheduled. */
  removeSlot(trip: string, id: string): Promise<void>;
  /** placeId → booking (one per place). */
  bookings(trip: string): Promise<Record<string, Booking>>;
  setBooking(trip: string, booking: Booking): Promise<void>;
  clearBooking(trip: string, placeId: string): Promise<void>;
  /** Walking routes uploaded on the Itinerary (KMZ/KML from Google My Maps). */
  routes(trip: string): Promise<RouteRecord[]>;
  addRoute(trip: string, route: RouteDraft): Promise<RouteRecord>;
  removeRoute(trip: string, id: string): Promise<void>;
  /** Place ids on the trip's shortlist. */
  shortlist(trip: string): Promise<string[]>;
  setShortlisted(trip: string, placeId: string, on: boolean): Promise<void>;
  /** Places whose hours someone checked (the ✓ on "Hours unconfirmed"). */
  hoursChecked(trip: string): Promise<string[]>;
  setHoursChecked(trip: string, placeId: string, checked: boolean): Promise<void>;
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

export function newSlotId(date: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `${date}:x-${Buffer.from(bytes).toString("base64url")}`;
}

export function newRouteId(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(9))).toString("base64url");
}
