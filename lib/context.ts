import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/auth";
import { getStore } from "@/lib/store";
import { getTrip } from "@/lib/trips";
import type { Trip } from "@/lib/content/types";

export interface TripContext {
  trip: Trip;
  /** URL prefix for links: /t/<slug> (owners) or /s/<token> (read-only share). */
  base: string;
  editable: boolean;
}

export async function ownerContext(slug: string): Promise<TripContext> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/signin?next=/t/${slug}`);
  const trip = getTrip(slug);
  if (!trip) notFound();
  return { trip, base: `/t/${slug}`, editable: true };
}

export async function shareContext(token: string): Promise<TripContext> {
  const slug = await getStore().resolveShare(token);
  const trip = slug ? getTrip(slug) : null;
  if (!trip) notFound();
  return { trip, base: `/s/${token}`, editable: false };
}
