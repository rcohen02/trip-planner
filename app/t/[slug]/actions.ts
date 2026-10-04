"use server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/auth";
import { getStore } from "@/lib/store";
import { getTrip } from "@/lib/trips";
import { buildSlots, cleanSlotLabel, type ExtraSlot } from "@/lib/plan/plan";
import { cleanBooking, type Booking } from "@/lib/plan/booking";
import { hoursTodoPlace } from "@/lib/plan/hours";
import { readRouteFile, routesFromKml } from "@/lib/routes/route";

/** A place from the trip content, or an uploaded route ("route-<id>"). */
async function knownPlace(slug: string, trip: { places: { id: string }[] }, placeId: string) {
  if (trip.places.some((p) => p.id === placeId)) return true;
  if (!placeId.startsWith("route-")) return false;
  return (await getStore().routes(slug)).some((r) => `route-${r.id}` === placeId);
}

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
  if (!(await knownPlace(slug, trip, placeId))) throw new Error("Unknown place");
  await getStore().assign(slug, slotId, placeId);
  revalidatePath(`/t/${slug}`, "layout");
}

export async function unassignPlace(slug: string, placeId: string) {
  await guard(slug);
  await getStore().unassign(slug, placeId);
  revalidatePath(`/t/${slug}`, "layout");
}

export async function setTodo(slug: string, todoId: string, done: boolean) {
  const trip = await guard(slug);
  await getStore().setTodo(slug, todoId, done);
  // A "Confirm … hours" to-do and the ✓ on "Hours unconfirmed" are the same fact.
  const todo = trip.todos.find((t) => t.id === todoId);
  const placeId = todo ? hoursTodoPlace(todo) : null;
  if (placeId) await getStore().setHoursChecked(slug, placeId, done);
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
  if (!(await knownPlace(slug, trip, raw.placeId))) throw new Error("Unknown place");
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

/** The ✓ on "Hours unconfirmed": mark (or unmark) a place's hours as checked. Keeps the matching to-do in step. */
export async function setHoursChecked(slug: string, placeId: string, checked: boolean) {
  const trip = await guard(slug);
  if (!(await knownPlace(slug, trip, placeId))) throw new Error("Unknown place");
  await getStore().setHoursChecked(slug, placeId, checked);
  for (const t of trip.todos) if (hoursTodoPlace(t) === placeId) await getStore().setTodo(slug, t.id, checked);
  revalidatePath(`/t/${slug}`, "layout");
}

const MAX_ROUTE_FILE = 900 * 1024; // under the 1 MB Server Action limit, with room for the form overhead

/**
 * Add walking routes from a Google My Maps export (.kmz or .kml). One route per line in the file.
 * Returns a result instead of throwing so the message reaches the page in production.
 */
export async function uploadRoute(slug: string, form: FormData): Promise<{ added: string[] } | { error: string }> {
  await guard(slug);
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a .kmz or .kml file." };
  if (file.size > MAX_ROUTE_FILE) return { error: "That file is over 900 KB. Export just the layer with your route." };
  let drafts;
  try {
    drafts = routesFromKml(readRouteFile(file.name, new Uint8Array(await file.arrayBuffer())));
  } catch (e) {
    return { error: e instanceof Error && /kmz|map data/i.test(e.message) ? `${e.message}.` : "That file couldn't be read." };
  }
  if (!drafts.length) return { error: "No walking route in that file. In My Maps, export the layer that has your route line." };
  if (drafts.length > 20) return { error: "That file has more than 20 lines. Export just the layer with your route." };
  for (const d of drafts) await getStore().addRoute(slug, d);
  revalidatePath(`/t/${slug}`, "layout");
  return { added: drafts.map((d) => d.name) };
}

/** Delete an uploaded route; it leaves the plan and loses its booking. */
export async function removeRoute(slug: string, routeId: string) {
  await guard(slug);
  const placeId = `route-${routeId}`;
  await getStore().unassign(slug, placeId);
  await getStore().clearBooking(slug, placeId);
  await getStore().removeRoute(slug, routeId);
  revalidatePath(`/t/${slug}`, "layout");
}
