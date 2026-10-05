import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/auth";
import { getStore } from "@/lib/store";
import { getTrip } from "@/lib/trips";
import type { Trip } from "@/lib/content/types";
import { applyHoursChecks, checkedPlaces } from "@/lib/plan/hours";
import { routePlace } from "@/lib/routes/route";
import { applyShortlist } from "@/lib/plan/shortlist";

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
  return { trip: await withChecks(trip), base: `/t/${slug}`, editable: true };
}

export async function shareContext(token: string): Promise<TripContext> {
  const slug = await getStore().resolveShare(token);
  const trip = slug ? getTrip(slug) : null;
  if (!trip) notFound();
  return { trip: await withChecks(trip), base: `/s/${token}`, editable: false };
}

/**
 * Trip content plus what people added or checked on the site: hours checked count as confirmed
 * everywhere, and uploaded walking routes join the places as "walk" cards.
 */
async function withChecks(trip: Trip): Promise<Trip> {
  const [checks, done, routes, shortlist] = await Promise.all([
    getStore().hoursChecked(trip.slug),
    getStore().todos(trip.slug),
    getStore().routes(trip.slug),
    getStore().shortlist(trip.slug),
  ]);
  const places = applyHoursChecks(trip.places, checkedPlaces(checks, trip.todos, done));
  return { ...trip, places: applyShortlist([...places, ...routes.map((r) => routePlace(r, places))], shortlist) };
}
