"use server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/auth";
import { getStore } from "@/lib/store";
import { getTrip } from "@/lib/trips";
import { buildSlots } from "@/lib/plan/plan";

async function guard(slug: string) {
  const viewer = await getViewer();
  const trip = getTrip(slug);
  if (!viewer || !trip) throw new Error("Not allowed");
  return trip;
}

export async function assignPlace(slug: string, slotId: string, placeId: string) {
  const trip = await guard(slug);
  const slot = buildSlots(trip.days).find((s) => s.id === slotId);
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
