"use server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/auth";
import { getStore } from "@/lib/store";
import { getTrip } from "@/lib/trips";
import { buildSlots, cleanSlotLabel, type ExtraSlot } from "@/lib/plan/plan";
import { cleanBooking, type Booking } from "@/lib/plan/booking";

async function guard(slug: string) {
  const viewer = await getViewer();
  const trip = getTrip(slug);
  if (!viewer || !trip) throw new Error("Not allowed");
  return trip;
}

export async function assignPlace(slug: string, slotId: string, placeId: string) {
  const trip = await guard(slug);
  const slot = buildSlots(trip.days, await getStore().layout(slug)).find((s) => s.id === slotId);
  if (!slot || slot.locked) throw new Error("That slot can't take a place");
  if (!trip.places.some((p) => p.id === placeId)) throw new Error("Unknown place");
  await getStore().assign(slug, slotId, placeId);
  revalidatePath(`/t/${slug}`, "layout");
}

export async function unassignPlace(slug: string, placeId: string) {
  await guard(slug);
  await getStore().unassign(slug, placeId);
  revalidatePath(`/t/${slug}`, "layout");
}

export async function setTodo(slug: string, todoId: string, done: boolean) {
  await guard(slug);
  await getStore().setTodo(slug, todoId, done);
  revalidatePath(`/t/${slug}`, "layout");
}

export async function createShare(slug: string) {
  await guard(slug);
  await getStore().share(slug);
  revalidatePath(`/t/${slug}`, "layout");
}

export async function revokeShare(slug: string) {
  await guard(slug);
  await getStore().revokeShare(slug);
  revalidatePath(`/t/${slug}`, "layout");
}

/** Add a labeled slot right after an existing one (e.g. a second afternoon). */
export async function addSlot(slug: string, after: string, rawLabel: string): Promise<ExtraSlot> {
  const trip = await guard(slug);
  const label = cleanSlotLabel(rawLabel);
  if (!label) throw new Error("Give the slot a name");
  const anchor = buildSlots(trip.days, await getStore().layout(slug)).find((s) => s.id === after);
  if (!anchor || anchor.locked) throw new Error("Can't add a slot there");
  const slot = await getStore().addSlot(slug, { date: anchor.date, after, label });
  revalidatePath(`/t/${slug}`, "layout");
  return slot;
}

export async function removeSlot(slug: string, id: string) {
  await guard(slug);
  if (!(await getStore().extraSlots(slug)).some((x) => x.id === id)) throw new Error("Only added slots can be removed");
  await getStore().removeSlot(slug, id);
  revalidatePath(`/t/${slug}`, "layout");
}

/** Rename any slot. An empty name puts a base slot back to its default (added slots keep theirs). */
export async function renameSlot(slug: string, slotId: string, rawLabel: string | null) {
  const trip = await guard(slug);
  const slot = buildSlots(trip.days, await getStore().layout(slug)).find((s) => s.id === slotId);
  if (!slot || slot.locked) throw new Error("That slot can't be renamed");
  const label = rawLabel === null ? null : cleanSlotLabel(rawLabel);
  if (!label && slot.extra) throw new Error("Give the slot a name");
  await getStore().renameSlot(slug, slotId, label);
  revalidatePath(`/t/${slug}`, "layout");
}

/** Save (or replace) the reservation for a place. Time is Lisbon wall-clock time. */
export async function saveBooking(slug: string, raw: Booking) {
  const trip = await guard(slug);
  if (!trip.places.some((p) => p.id === raw.placeId)) throw new Error("Unknown place");
  const b = cleanBooking(raw);
  if (!b || !trip.days.some((d) => d.date === b.date)) throw new Error("Pick a trip day and a time");
  await getStore().setBooking(slug, b);
  revalidatePath(`/t/${slug}`, "layout");
}

export async function clearBooking(slug: string, placeId: string) {
  await guard(slug);
  await getStore().clearBooking(slug, placeId);
  revalidatePath(`/t/${slug}`, "layout");
}
